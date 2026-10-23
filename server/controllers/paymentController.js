import Payment from "../models/Payment.js";
import RentRecord from "../models/RentRecord.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";
import DebtCollection from "../models/DebtCollection.js";

/* =====================================================
   HELPERS
===================================================== */

const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
};

const calculateDaysLate = (dueDate, paidDate) => {
  if (!dueDate || !paidDate) return 0;

  const due = new Date(dueDate);
  const paid = new Date(paidDate);

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

  if (difference <= 0) return 0;

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

/*
  Populate tenant, room, bed, and user details.
  This is used by payment and rent-record queries.
*/

const populateTenantDetails = (query) => {
  return query
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
          select: "name mobile",
        },
      ],
    })
    .populate("userId", "name mobile")
    .populate("pgId", "name address city state");
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
  const today = new Date();

  const records = await RentRecord.find({
    ownerId,
    ...(pgId ? { pgId } : {}),
    month,
    year,
    status: { $ne: "paid" },
    dueDate: {
      $gte: start,
      $lte: end,
    },
  });

  for (const record of records) {
    if (today > new Date(record.dueDate)) {
      record.status = "overdue";
      await record.save();
    }
  }
};

/* =====================================================
   ENSURE RENT RECORDS FOR PERIOD
===================================================== */

const ensureRentRecordsForPeriod = async ({
  ownerId,
  pgId,
  month,
  year,
}) => {
  const tenantFilter = {
    ownerId,
    status: "active",
  };

  if (pgId) {
    tenantFilter.pgId = pgId;
  }

  const tenants = await Tenant.find(tenantFilter);

  for (const tenant of tenants) {
    const joiningDate = new Date(tenant.joiningDate);

    const monthEnd = new Date(
      year,
      month,
      0,
      23,
      59,
      59,
      999
    );

    // Do not create rent records before the tenant joined.
    if (joiningDate > monthEnd) {
      continue;
    }

    let rentRecord = await RentRecord.findOne({
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

      const status = new Date() > dueDate
        ? "overdue"
        : "pending";

      rentRecord = await RentRecord.create({
        ownerId: tenant.ownerId,
        pgId: tenant.pgId,
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
    } else if (rentRecord.status !== "paid") {
      if (new Date() > new Date(rentRecord.dueDate)) {
        rentRecord.status = "overdue";
        await rentRecord.save();
      }
    }
  }
};

/* =====================================================
   VERIFY PG OWNERSHIP
===================================================== */

const verifyPGOwnership = async (pgId, ownerId) => {
  if (!pgId) return null;

  return PG.findOne({
    _id: pgId,
    ownerId,
  });
};

/* =====================================================
   GET MY PAYMENTS
===================================================== */

export const getMyPayments = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { pgId, month, year } = req.query;

    if (month && year) {
      const monthNumber = Number(month);
      const yearNumber = Number(year);

      if (
        monthNumber < 1 ||
        monthNumber > 12 ||
        !yearNumber
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid month or year.",
        });
      }

      if (pgId) {
        const pg = await verifyPGOwnership(pgId, ownerId);

        if (!pg) {
          return res.status(403).json({
            success: false,
            message: "You do not have access to this PG.",
          });
        }
      }

      await ensureRentRecordsForPeriod({
        ownerId,
        pgId,
        month: monthNumber,
        year: yearNumber,
      });

      await updateOverdueRentRecords({
        ownerId,
        pgId,
        month: monthNumber,
        year: yearNumber,
      });
    }

    const filter = { ownerId };

    if (pgId) {
      filter.pgId = pgId;
    }

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
    ).sort({
      paymentDate: -1,
    });

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
   GET RENT SUMMARY
   Includes rent payments and collected vacated-tenant debt
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

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12.",
      });
    }

    if (
      !Number.isInteger(year) ||
      year < 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year.",
      });
    }

    // Verify that this PG belongs to the logged-in owner.
    if (pgId) {
      const pg = await verifyPGOwnership(pgId, ownerId);

      if (!pg) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this PG.",
        });
      }
    }

    // Ensure rent records exist for the selected month.
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

    const rentFilter = {
      ownerId,
      month,
      year,
    };

    if (pgId) {
      rentFilter.pgId = pgId;
    }

    const rentRecords = await RentRecord.find(rentFilter);

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    let paidOnTimeCount = 0;
    let paidLateCount = 0;
    let totalLateDays = 0;

    // Calculate monthly rent statistics.
    for (const record of rentRecords) {
      const amount = Number(record.amount || 0);

      if (record.status === "paid") {
        paidCount++;
        paidAmount += amount;

        if (Number(record.daysLate || 0) === 0) {
          paidOnTimeCount++;
        } else {
          paidLateCount++;
          totalLateDays += Number(record.daysLate || 0);
        }
      }

      if (record.status === "pending") {
        pendingCount++;
        pendingAmount += amount;
      }

      if (record.status === "overdue") {
        overdueCount++;
        overdueAmount += amount;
      }
    }

    // Calculate debt collected during the selected month.
    // This is separate from monthly rent so it does not
    // change the Paid, Pending, or Overdue rent counts.
    const { start, end } = getMonthRange(month, year);

    const debtFilter = {
      ownerId,
      paymentDate: {
        $gte: start,
        $lte: end,
      },
    };

    if (pgId) {
      debtFilter.pgId = pgId;
    }

    const debtCollections = await DebtCollection.aggregate([
      {
        $match: debtFilter,
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const debtCollected = Number(
      debtCollections[0]?.total || 0
    );

    // Total Collected = monthly rent collected
    // + vacated-tenant debt collected in that month.
    const totalCollected = paidAmount + debtCollected;

    return res.status(200).json({
      success: true,

      period: {
        month,
        year,
      },

      summary: {
        totalTenants: rentRecords.length,

        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,

        paidAmount,
        pendingAmount,
        overdueAmount,

        // Additional collection totals.
        debtCollected,
        totalCollected,

        paidOnTime: paidOnTimeCount,
        paidLate: paidLateCount,
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
   Includes tenant, room, bed, and PG details.
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

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month.",
      });
    }

    if (pgId) {
      const pg = await verifyPGOwnership(pgId, ownerId);

      if (!pg) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this PG.",
        });
      }
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

    const filter = {
      ownerId,
      month,
      year,
    };

    if (pgId) {
      filter.pgId = pgId;
    }

    if (
      status &&
      ["pending", "paid", "overdue"].includes(status)
    ) {
      filter.status = status;
    }

    const rentRecords = await populateTenantDetails(
      RentRecord.find(filter)
    ).sort({
      dueDate: 1,
    });

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
      userId,
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

    const pg = await verifyPGOwnership(pgId, ownerId);

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found.",
      });
    }

    const paidAt = paymentDate
      ? new Date(paymentDate)
      : new Date();

    const paymentMonth = Number(
      month || paidAt.getMonth() + 1
    );

    const paymentYear = Number(
      year || paidAt.getFullYear()
    );

    await ensureRentRecordsForPeriod({
      ownerId,
      pgId,
      month: paymentMonth,
      year: paymentYear,
    });

    const rentRecord = await RentRecord.findOne({
      ownerId,
      tenantId,
      pgId,
      month: paymentMonth,
      year: paymentYear,
    });

    if (!rentRecord) {
      return res.status(404).json({
        success: false,
        message: "Rent record for this month could not be found.",
      });
    }

    const daysLate = calculateDaysLate(
      rentRecord.dueDate,
      paidAt
    );

    const payment = await Payment.create({
      ownerId,
      pgId,
      tenantId,
      userId: userId || tenant.userId,
      amount: Number(amount),
      paymentDate: paidAt,
      paymentMethod: paymentMethod || "cash",
      status: "paid",
      notes: notes || "",
    });

    rentRecord.status = "paid";
    rentRecord.paidDate = paidAt;
    rentRecord.paymentMethod = paymentMethod || "cash";
    rentRecord.daysLate = daysLate;
    rentRecord.paymentId = payment._id;

    await rentRecord.save();

    return res.status(201).json({
      success: true,
      message: daysLate > 0
        ? `Rent marked as paid. Payment was ${daysLate} ${
            daysLate === 1 ? "day" : "days"
          } late.`
        : "Rent marked as paid on time.",
      payment,
      rentRecord,
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

    if (status === "paid") {
      const paidDate = new Date();

      payment.status = "paid";
      payment.paymentDate = paidDate;

      if (paymentMethod) {
        payment.paymentMethod = paymentMethod;
      }

      await payment.save();

      const paymentMonth = paidDate.getMonth() + 1;
      const paymentYear = paidDate.getFullYear();

      const rentRecord = await RentRecord.findOne({
        ownerId,
        tenantId: payment.tenantId,
        pgId: payment.pgId,
        month: paymentMonth,
        year: paymentYear,
      });

      if (rentRecord) {
        const daysLate = calculateDaysLate(
          rentRecord.dueDate,
          paidDate
        );

        rentRecord.status = "paid";
        rentRecord.paidDate = paidDate;
        rentRecord.daysLate = daysLate;
        rentRecord.paymentMethod = payment.paymentMethod;
        rentRecord.paymentId = payment._id;

        await rentRecord.save();

        return res.status(200).json({
          success: true,
          message: daysLate > 0
            ? `Payment marked as paid ${daysLate} ${
                daysLate === 1 ? "day" : "days"
              } late.`
            : "Payment marked as paid on time.",
          payment,
          rentRecord,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment marked as paid.",
        payment,
      });
    }

    payment.status = status;
    await payment.save();

    const paymentDate = new Date(payment.paymentDate);

    const rentRecord = await RentRecord.findOne({
      ownerId,
      tenantId: payment.tenantId,
      pgId: payment.pgId,
      month: paymentDate.getMonth() + 1,
      year: paymentDate.getFullYear(),
    });

    if (rentRecord) {
      rentRecord.status = status;
      rentRecord.paidDate = null;
      rentRecord.daysLate = 0;
      rentRecord.paymentId = null;

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
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      ownerId: req.user.userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found.",
      });
    }

    const rentRecord = await RentRecord.findOne({
      paymentId: payment._id,
      ownerId: req.user.userId,
    });

    if (rentRecord) {
      const today = new Date();
      const dueDate = new Date(rentRecord.dueDate);

      rentRecord.status = today > dueDate
        ? "overdue"
        : "pending";

      rentRecord.paidDate = null;
      rentRecord.paymentMethod = null;
      rentRecord.daysLate = 0;
      rentRecord.paymentId = null;

      await rentRecord.save();
    }

    await Payment.deleteOne({
      _id: payment._id,
      ownerId: req.user.userId,
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
      error: error.message,
    });
  }
};


// =====================================================
// COLLECT VACATED TENANT DEBT
// =====================================================

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

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid amount with up to two decimal places.",
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

    // Only allow collection for a vacated tenant belonging
    // to the currently authenticated owner.
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

    // 1. Save a separate collection transaction.
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

    // 2. Atomically subtract the collection amount.
    // The condition prevents the balance from going below zero
    // if another collection happens at the same time.
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

    // 3. Mark the debt settled only when the full balance is paid.
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
        // The collection and balance update have already succeeded.
        // Log this separately so the client isn't told the collection
        // failed when the money was recorded.
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

    // If the collection was saved but the balance wasn't updated,
    // remove the orphan collection record.
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