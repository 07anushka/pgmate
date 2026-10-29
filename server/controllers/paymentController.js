
import Payment from "../models/Payment.js";
import RentRecord from "../models/RentRecord.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";
import DebtCollection from "../models/DebtCollection.js";
import User from "../models/User.js";
import { sendTenantPaymentReceipt } from "../utils/email.js";
import TenantEmailLog from "../models/TenantEmailLog.js";

/* =====================================================
   HELPERS
===================================================== */

const getMonthRange = (month, year) => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0),
  end: new Date(year, month, 0, 23, 59, 59, 999),
});

const isValidMonthYear = (month, year) =>
  Number.isInteger(Number(month)) &&
  Number(month) >= 1 &&
  Number(month) <= 12 &&
  Number.isInteger(Number(year)) &&
  Number(year) >= 2000 &&
  Number(year) <= 9999;

const isValidObjectId = (value) =>
  typeof value === "string" &&
  /^[a-f\d]{24}$/i.test(value);

const validateAmount = (value) => {
  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    Math.round(amount * 100) === amount * 100
  );
};

const calculateDaysLate = (dueDate, paidDate) => {
  if (!dueDate || !paidDate) return 0;

  const due = new Date(dueDate);
  const paid = new Date(paidDate);

  if (
    Number.isNaN(due.getTime()) ||
    Number.isNaN(paid.getTime())
  ) {
    return 0;
  }

  const dueDay = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  const paidDay = new Date(
    paid.getFullYear(),
    paid.getMonth(),
    paid.getDate()
  );

  const difference = paidDay.getTime() - dueDay.getTime();

  return difference <= 0
    ? 0
    : Math.ceil(difference / (1000 * 60 * 60 * 24));
};

const populateTenantDetails = (query) =>
  query
    .populate({
      path: "tenantId",
      populate: [
        {
          path: "roomId",
          select: "roomNumber roomName name",
        },
        {
          path: "bedId",
          select: "bedNumber bedName roomId",
          populate: {
            path: "roomId",
            select: "roomNumber roomName name",
          },
        },
        {
          path: "userId",
          select: "name mobile email",
        },
      ],
    })
    .populate("userId", "name mobile email")
    .populate("pgId", "name address city state");

const verifyPGOwnership = async (pgId, ownerId) => {
  if (!pgId || !isValidObjectId(String(pgId))) {
    return null;
  }

  return PG.findOne({
    _id: pgId,
    ownerId,
  });
};

const requireSelectedPG = async (pgId, ownerId, res) => {
  if (!pgId || pgId === "all") {
    res.status(400).json({
      success: false,
      message: "Select a PG to view payment details.",
    });

    return null;
  }

  const pg = await verifyPGOwnership(pgId, ownerId);

  if (!pg) {
    res.status(403).json({
      success: false,
      message: "You do not have access to this PG.",
    });

    return null;
  }

  return pg;
};

/* =====================================================
   UPDATE OVERDUE RENT RECORDS
===================================================== */

const updateOverdueRentRecords = async ({
  ownerId,
  pgId,
  month,
  year,
}) => {
  const { start, end } = getMonthRange(month, year);

  const records = await RentRecord.find({
    ownerId,
    pgId,
    month,
    year,
    status: { $ne: "paid" },
    dueDate: {
      $gte: start,
      $lte: end,
    },
  });

  const now = new Date();

  for (const record of records) {
    if (now > new Date(record.dueDate)) {
      record.status = "overdue";
      await record.save();
    }
  }
};

/* =====================================================
   ENSURE RENT RECORDS FOR A SELECTED PG AND PERIOD
===================================================== */

const ensureRentRecordsForPeriod = async ({
  ownerId,
  pgId,
  month,
  year,
}) => {
  const tenants = await Tenant.find({
    ownerId,
    pgId,
    status: "active",
  });

  const monthEnd = new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999
  );

  for (const tenant of tenants) {
    if (tenant.joiningDate) {
      const joiningDate = new Date(tenant.joiningDate);

      if (
        !Number.isNaN(joiningDate.getTime()) &&
        joiningDate > monthEnd
      ) {
        continue;
      }
    }

    let rentRecord = await RentRecord.findOne({
      ownerId,
      pgId,
      tenantId: tenant._id,
      month,
      year,
    });

    if (!rentRecord) {
      const rentDueDay = Math.min(
        28,
        Math.max(1, Number(tenant.rentDueDay || 5))
      );

      const dueDate = new Date(
        year,
        month - 1,
        rentDueDay,
        23,
        59,
        59,
        999
      );

      const status =
        new Date() > dueDate ? "overdue" : "pending";

      await RentRecord.create({
        ownerId,
        pgId,
        tenantId: tenant._id,
        userId: tenant.userId,
        month,
        year,
        amount: Number(tenant.monthlyRent || 0),
        dueDate,
        status,
        paidDate: null,
        paymentMethod: null,
        daysLate: 0,
        paymentId: null,
        notes: "",
      });
    } else if (
      rentRecord.status !== "paid" &&
      new Date() > new Date(rentRecord.dueDate)
    ) {
      rentRecord.status = "overdue";
      await rentRecord.save();
    }
  }
};

/* =====================================================
   GET MY PAYMENTS
   GET /api/payments?pgId=...&month=...&year=...
===================================================== */

export const getMyPayments = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { pgId, month, year } = req.query;

    const pg = await requireSelectedPG(pgId, ownerId, res);
    if (!pg) return;

    if ((month && !year) || (!month && year)) {
      return res.status(400).json({
        success: false,
        message: "Month and year must be provided together.",
      });
    }

    if (month && year) {
      if (!isValidMonthYear(Number(month), Number(year))) {
        return res.status(400).json({
          success: false,
          message: "Invalid month or year.",
        });
      }

      await ensureRentRecordsForPeriod({
        ownerId,
        pgId,
        month: Number(month),
        year: Number(year),
      });

      await updateOverdueRentRecords({
        ownerId,
        pgId,
        month: Number(month),
        year: Number(year),
      });
    }

    const filter = { ownerId, pgId };

    if (month && year) {
      const { start, end } = getMonthRange(
        Number(month),
        Number(year)
      );

      filter.paymentDate = {
        $gte: start,
        $lte: end,
      };
    }

    const payments = await populateTenantDetails(
      Payment.find(filter)
    ).sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get owner payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments.",
    });
  }
};

/* =====================================================
   GET PAYMENT / RENT SUMMARY
===================================================== */

export const getPaymentSummary = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const now = new Date();

    const month = Number(
      req.query.month || now.getMonth() + 1
    );

    const year = Number(
      req.query.year || now.getFullYear()
    );

    const { pgId } = req.query;

    const pg = await requireSelectedPG(pgId, ownerId, res);
    if (!pg) return;

    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year.",
      });
    }

    await ensureRentRecordsForPeriod({
      ownerId,
      pgId,
      month,
      year,
    });

    await updateOverdueRentRecords({
      ownerId,
      pgId,
      month,
      year,
    });

    const rentRecords = await RentRecord.find({
      ownerId,
      pgId,
      month,
      year,
    });

    let paid = 0;
    let pending = 0;
    let overdue = 0;

    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    let paidOnTime = 0;
    let paidLate = 0;
    let totalLateDays = 0;

    for (const record of rentRecords) {
      const amount = Number(record.amount || 0);

      if (record.status === "paid") {
        paid += 1;
        paidAmount += amount;

        const daysLate = Number(record.daysLate || 0);

        if (daysLate > 0) {
          paidLate += 1;
          totalLateDays += daysLate;
        } else {
          paidOnTime += 1;
        }
      } else if (record.status === "pending") {
        pending += 1;
        pendingAmount += amount;
      } else if (record.status === "overdue") {
        overdue += 1;
        overdueAmount += amount;
      }
    }

    const { start, end } = getMonthRange(month, year);

    const debtCollections = await DebtCollection.aggregate([
      {
        $match: {
          ownerId,
          pgId: pg._id,
          paymentDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const debtCollected = Number(
      debtCollections[0]?.total || 0
    );

    const totalCollected = paidAmount + debtCollected;

    return res.status(200).json({
      success: true,
      period: { month, year },
      summary: {
        totalTenants: rentRecords.length,
        paid,
        pending,
        overdue,
        paidAmount,
        pendingAmount,
        overdueAmount,
        debtCollected,
        totalCollected,
        paidOnTime,
        paidLate,
        totalLateDays,
      },
    });
  } catch (error) {
    console.error("Get payment summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment summary.",
    });
  }
};

/* =====================================================
   GET RENT RECORDS
===================================================== */

export const getRentRecords = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const now = new Date();

    const month = Number(
      req.query.month || now.getMonth() + 1
    );

    const year = Number(
      req.query.year || now.getFullYear()
    );

    const { pgId, status } = req.query;

    const pg = await requireSelectedPG(pgId, ownerId, res);
    if (!pg) return;

    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year.",
      });
    }

    await ensureRentRecordsForPeriod({
      ownerId,
      pgId,
      month,
      year,
    });

    await updateOverdueRentRecords({
      ownerId,
      pgId,
      month,
      year,
    });

    const filter = { ownerId, pgId, month, year };

    if (
      status &&
      ["pending", "paid", "overdue"].includes(status)
    ) {
      filter.status = status;
    }

    const rentRecords = await populateTenantDetails(
      RentRecord.find(filter)
    ).sort({ dueDate: 1 });

    const recordsWithRoomDetails = rentRecords.map((record) => {
      const item = record.toObject();
      const tenant = item.tenantId;

      const roomFromTenant = tenant?.roomId || null;
      const bedFromTenant = tenant?.bedId || null;
      const roomFromBed = bedFromTenant?.roomId || null;

      return {
        ...item,
        tenantStatus: tenant?.status || "",
        tenantVacatedAt: tenant?.vacatedAt || null,
        outstandingBalance: Number(
          tenant?.outstandingBalance || 0
        ),
        roomId: roomFromTenant || roomFromBed,
        bedId: bedFromTenant,
        roomNumber:
          roomFromTenant?.roomNumber ||
          roomFromBed?.roomNumber ||
          "",
        bedNumber:
          bedFromTenant?.bedNumber ||
          bedFromTenant?.bedName ||
          "",
      };
    });

    return res.status(200).json({
      success: true,
      period: { month, year },
      count: recordsWithRoomDetails.length,
      rentRecords: recordsWithRoomDetails,
    });
  } catch (error) {
    console.error("Get rent records error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rent records.",
    });
  }
};

/* =====================================================
   CREATE PAYMENT
===================================================== */

export const createPayment = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const {
      tenantId,
      pgId,
      amount,
      paymentDate,
      paymentMethod,
      notes,
      month,
      year,
    } = req.body;

    if (!tenantId || !pgId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Tenant, PG and amount are required.",
      });
    }

    if (!isValidObjectId(String(tenantId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid tenant ID.",
      });
    }

    const pg = await requireSelectedPG(pgId, ownerId, res);
    if (!pg) return;

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId,
      pgId,
      status: "active",
    }).populate("userId", "name email mobile");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message:
          "Active tenant was not found in the selected PG.",
      });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid amount with up to two decimal places.",
      });
    }

    const numericAmount = Number(amount);

    const paidAt = paymentDate
      ? new Date(paymentDate)
      : new Date();

    if (Number.isNaN(paidAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date.",
      });
    }

    const paymentMonth = Number(
      month || paidAt.getMonth() + 1
    );

    const paymentYear = Number(
      year || paidAt.getFullYear()
    );

    if (!isValidMonthYear(paymentMonth, paymentYear)) {
      return res.status(400).json({
        success: false,
        message: "Invalid rent month or year.",
      });
    }

    await ensureRentRecordsForPeriod({
      ownerId,
      pgId,
      month: paymentMonth,
      year: paymentYear,
    });

    const rentRecord = await RentRecord.findOne({
      ownerId,
      pgId,
      tenantId,
      month: paymentMonth,
      year: paymentYear,
    });

    if (!rentRecord) {
      return res.status(404).json({
        success: false,
        message:
          "Rent record for this month could not be found.",
      });
    }

    if (rentRecord.status === "paid") {
      return res.status(409).json({
        success: false,
        message:
          "Rent is already marked as paid for this month.",
      });
    }

    const daysLate = calculateDaysLate(
      rentRecord.dueDate,
      paidAt
    );

    const method = paymentMethod || "cash";

    const allowedMethods = [
      "cash",
      "upi",
      "bank",
      "card",
      "other",
    ];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    if (String(notes || "").length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 1000 characters.",
      });
    }

    const payment = await Payment.create({
      ownerId,
      pgId,
      tenantId,
      userId: tenant.userId?._id || tenant.userId,
      amount: numericAmount,
      paymentDate: paidAt,
      paymentMethod: method,
      status: "paid",
      notes: String(notes || "").trim(),
    });

    try {
      rentRecord.status = "paid";
      rentRecord.paidDate = paidAt;
      rentRecord.paymentMethod = method;
      rentRecord.daysLate = daysLate;
      rentRecord.paymentId = payment._id;

      await rentRecord.save();
    } catch (rentError) {
      // Roll back the payment if its rent record cannot be updated.
      await Payment.deleteOne({
        _id: payment._id,
        ownerId,
      });

      throw rentError;
    }

    // Send the receipt only after the payment is saved.
    // Email failure must not turn a successful payment into a failed API response.
    let receiptEmailSent = false;

    const tenantUser = tenant.userId;

    const tenantEmail = tenantUser?.email;

    const notificationKey = `payment-receipt:${payment._id}`;

    if (tenantEmail) {
      try {
        const existingLog = await TenantEmailLog.findOne({
          tenantId: tenant._id,
          notificationKey,
          status: "sent",
        });

        if (!existingLog) {
          await sendTenantPaymentReceipt({
            tenant,
            user: tenantUser,
            pg,
            payment,
            rentRecord,
          });

          receiptEmailSent = true;

          await TenantEmailLog.findOneAndUpdate(
            {
              tenantId: tenant._id,
              notificationKey,
            },
            {
              $set: {
                ownerId,
                pgId,
                tenantId: tenant._id,
                userId: tenantUser._id,
                notificationKey,
                status: "sent",
                sentAt: new Date(),
                error: "",
              },
            },
            { upsert: true, new: true }
          );
        } else {
          receiptEmailSent = true;
        }
      } catch (emailError) {
        console.error(
          "Tenant payment receipt email failed:",
          emailError
        );

        try {
          await TenantEmailLog.findOneAndUpdate(
            {
              tenantId: tenant._id,
              notificationKey,
            },
            {
              $set: {
                ownerId,
                pgId,
                tenantId: tenant._id,
                userId: tenantUser?._id || tenantUser,
                notificationKey,
                status: "failed",
                sentAt: null,
                error: String(emailError.message || emailError).slice(
                  0,
                  1000
                ),
              },
            },
            { upsert: true, new: true }
          );
        } catch (logError) {
          console.error(
            "Receipt email log failed:",
            logError
          );
        }
      }
    } else {
      console.warn(
        `No email address for tenant ${tenant._id}; receipt not sent.`
      );
    }

    return res.status(201).json({
      success: true,
      message:
        daysLate > 0
          ? `Rent marked as paid ${daysLate} ${daysLate === 1 ? "day" : "days"
          } late.`
          : "Rent marked as paid on time.",
      payment,
      rentRecord,
      receiptEmailSent,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment.",
    });
  }
};

/* =====================================================
   UPDATE PAYMENT STATUS
===================================================== */

export const updatePaymentStatus = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { paymentId } = req.params;
    const { status, paymentMethod } = req.body;

    if (!isValidObjectId(String(paymentId || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (!["paid", "pending", "overdue"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      ownerId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const allowedMethods = [
      "cash",
      "upi",
      "bank",
      "card",
      "other",
    ];

    if (
      paymentMethod &&
      !allowedMethods.includes(paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const rentRecord = await RentRecord.findOne({
      ownerId,
      pgId: payment.pgId,
      tenantId: payment.tenantId,
      paymentId: payment._id,
    });

    if (status === "paid") {
      const paidDate = new Date();

      payment.status = "paid";
      payment.paymentDate = paidDate;

      if (paymentMethod) {
        payment.paymentMethod = paymentMethod;
      }

      await payment.save();

      if (rentRecord) {
        rentRecord.status = "paid";
        rentRecord.paidDate = paidDate;
        rentRecord.daysLate = calculateDaysLate(
          rentRecord.dueDate,
          paidDate
        );
        rentRecord.paymentMethod = payment.paymentMethod;
        rentRecord.paymentId = payment._id;

        await rentRecord.save();
      }

      return res.status(200).json({
        success: true,
        message: "Payment marked as paid.",
        payment,
        rentRecord,
      });
    }

    payment.status = status;
    await payment.save();

    if (rentRecord) {
      rentRecord.status = status;
      rentRecord.paidDate = null;
      rentRecord.daysLate = 0;
      rentRecord.paymentId = null;
      rentRecord.paymentMethod = null;

      await rentRecord.save();
    }

    return res.status(200).json({
      success: true,
      message: `Payment marked as ${status}.`,
      payment,
      rentRecord,
    });
  } catch (error) {
    console.error("Update payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment status.",
    });
  }
};

/* =====================================================
   DELETE PAYMENT
===================================================== */

export const deletePayment = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { paymentId } = req.params;

    if (!isValidObjectId(String(paymentId || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      ownerId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found.",
      });
    }

    const rentRecord = await RentRecord.findOne({
      ownerId,
      pgId: payment.pgId,
      tenantId: payment.tenantId,
      paymentId: payment._id,
    });

    if (rentRecord) {
      const now = new Date();
      const dueDate = new Date(rentRecord.dueDate);

      rentRecord.status =
        now > dueDate ? "overdue" : "pending";

      rentRecord.paidDate = null;
      rentRecord.paymentMethod = null;
      rentRecord.daysLate = 0;
      rentRecord.paymentId = null;

      await rentRecord.save();
    }

    await Payment.deleteOne({
      _id: payment._id,
      ownerId,
    });

    return res.status(200).json({
      success: true,
      message: "Payment transaction deleted successfully.",
    });
  } catch (error) {
    console.error("Delete payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete payment.",
    });
  }
};

/* =====================================================
   COLLECT VACATED TENANT DEBT
===================================================== */

export const collectVacatedDebt = async (req, res) => {
  const ownerId = req.user.userId;

  let collection = null;
  let balanceUpdated = false;

  try {
    const { tenantId } = req.params;
    const amount = Number(req.body.amount);
    const paymentMethod = req.body.paymentMethod || "cash";
    const notes = String(req.body.notes || "").trim();

    const allowedMethods = [
      "cash",
      "upi",
      "bank",
      "card",
      "other",
    ];

    if (!isValidObjectId(String(tenantId || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid tenant ID.",
      });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid amount with up to two decimal places.",
      });
    }

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    if (notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 1000 characters.",
      });
    }

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId,
      status: "vacated",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Vacated tenant was not found.",
      });
    }

    const currentBalance = Number(
      tenant.outstandingBalance || 0
    );

    if (currentBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: "This tenant has no outstanding balance.",
      });
    }

    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Outstanding balance is ₹${currentBalance}.`,
      });
    }

    collection = await DebtCollection.create({
      ownerId,
      pgId: tenant.pgId,
      tenantId: tenant._id,
      amount,
      paymentDate: new Date(),
      paymentMethod,
      notes,
      collectedBy: ownerId,
    });

    const updatedTenant = await Tenant.findOneAndUpdate(
      {
        _id: tenant._id,
        ownerId,
        status: "vacated",
        outstandingBalance: { $gte: amount },
      },
      {
        $inc: {
          outstandingBalance: -amount,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTenant) {
      await DebtCollection.deleteOne({
        _id: collection._id,
        ownerId,
      });

      collection = null;

      return res.status(409).json({
        success: false,
        message: "The balance changed. Refresh and try again.",
      });
    }

    balanceUpdated = true;

    const remainingBalance = Math.max(
      0,
      Number(updatedTenant.outstandingBalance || 0)
    );

    if (remainingBalance === 0) {
      try {
        await Tenant.updateOne(
          {
            _id: updatedTenant._id,
            ownerId,
            outstandingBalance: 0,
          },
          {
            $set: {
              debtSettledAt: new Date(),
            },
          }
        );
      } catch (settlementError) {
        console.error(
          "Debt settlement timestamp update failed:",
          settlementError
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Collection recorded successfully.",
      collection,
      tenant: {
        _id: updatedTenant._id,
        outstandingBalance: remainingBalance,
        debtSettledAt:
          remainingBalance === 0
            ? new Date()
            : updatedTenant.debtSettledAt,
      },
    });
  } catch (error) {
    console.error("Collect vacated debt error:", error);

    if (collection && !balanceUpdated) {
      try {
        await DebtCollection.deleteOne({
          _id: collection._id,
          ownerId,
        });
      } catch (rollbackError) {
        console.error(
          "Collection rollback failed:",
          rollbackError
        );
      }
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid tenant ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to record collection.",
    });
  }
};
