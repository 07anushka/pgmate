import Payment from "../models/Payment.js";
import RentRecord from "../models/RentRecord.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";

/* =====================================================
   HELPERS
===================================================== */

/*
  Convert month/year into the start and end
  dates of that month.

  Example:
  month = 10
  year = 2026

  → October 1, 2026
  → October 31, 2026
*/

const getMonthRange = (
  month,
  year
) => {
  const start = new Date(
    year,
    month - 1,
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999
  );

  return {
    start,
    end,
  };
};

/*
  Calculate number of days between
  due date and paid date.

  Same day / before due date
  → 0

  Paid 3 days after
  → 3
*/

const calculateDaysLate = (
  dueDate,
  paidDate
) => {
  if (!dueDate || !paidDate) {
    return 0;
  }

  const due = new Date(
    dueDate
  );

  const paid = new Date(
    paidDate
  );

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

  const difference =
    paidDay.getTime() -
    dueDay.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
    (1000 * 60 * 60 * 24)
  );
};

/*
  Update unpaid rent records whose
  deadline has passed.

  pending
      ↓
  overdue
*/

const updateOverdueRentRecords =
  async ({
    ownerId,
    pgId,
    month,
    year,
  }) => {
    const { start, end } =
      getMonthRange(
        month,
        year
      );

    const today = new Date();

    /*
      Only records inside the requested
      month/year.
    */

    const records =
      await RentRecord.find({
        ownerId,
        ...(pgId
          ? { pgId }
          : {}),
        month,
        year,
        status: {
          $ne: "paid",
        },
        dueDate: {
          $gte: start,
          $lte: end,
        },
      });

    for (const record of records) {
      if (
        today >
        new Date(record.dueDate)
      ) {
        record.status =
          "overdue";

        await record.save();
      }
    }
  };

/*
  Make sure every active tenant has
  a rent record for the requested
  month/year.

  This is what gives us proper
  month-by-month history.
*/

const ensureRentRecordsForPeriod =
  async ({
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
      tenantFilter.pgId =
        pgId;
    }

    const tenants =
      await Tenant.find(
        tenantFilter
      );

    for (const tenant of tenants) {
      const joiningDate =
        new Date(
          tenant.joiningDate
        );

      const periodStart =
        new Date(
          year,
          month - 1,
          1
        );

      /*
        Tenant did not exist yet
        during this month.
      */

      if (
        joiningDate >
        new Date(
          year,
          month,
          0,
          23,
          59,
          59,
          999
        )
      ) {
        continue;
      }

      let rentRecord =
        await RentRecord.findOne({
          tenantId: tenant._id,
          month,
          year,
        });

      if (!rentRecord) {
        const rentDueDay =
          Math.min(
            28,
            Math.max(
              1,
              Number(
                tenant.rentDueDay ||
                5
              )
            )
          );

        const dueDate =
          new Date(
            year,
            month - 1,
            rentDueDay,
            23,
            59,
            59,
            999
          );

        let status =
          "pending";

        if (
          new Date() >
          dueDate
        ) {
          status =
            "overdue";
        }

        /*
          If the tenant joined during
          this month, use the joining
          date as the earliest valid
          date for this rent cycle.
        */

        rentRecord =
          await RentRecord.create({
            ownerId:
              tenant.ownerId,

            pgId:
              tenant.pgId,

            tenantId:
              tenant._id,

            userId:
              tenant.userId,

            month,
            year,

            amount:
              Number(
                tenant.monthlyRent ||
                0
              ),

            dueDate,

            status,

            paidDate: null,

            paymentMethod:
              null,

            daysLate: 0,

            paymentId: null,

            notes: "",
          });
      } else if (
        rentRecord.status !==
        "paid"
      ) {
        const today =
          new Date();

        if (
          today >
          new Date(
            rentRecord.dueDate
          )
        ) {
          rentRecord.status =
            "overdue";

          await rentRecord.save();
        }
      }
    }
  };

/*
  Get one owner's PG and make sure
  it belongs to the logged-in owner.
*/

const verifyPGOwnership =
  async (
    pgId,
    ownerId
  ) => {
    if (!pgId) {
      return null;
    }

    return await PG.findOne({
      _id: pgId,
      ownerId,
    });
  };

/* =====================================================
   GET MY PAYMENTS
===================================================== */

export const getMyPayments =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const {
        pgId,
        month,
        year,
      } = req.query;

      /*
        If month/year are provided,
        make sure rent records exist
        for that period.
      */

      if (
        month &&
        year
      ) {
        const monthNumber =
          Number(month);

        const yearNumber =
          Number(year);

        if (
          monthNumber < 1 ||
          monthNumber > 12 ||
          !yearNumber
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid month or year.",
            });
        }

        if (pgId) {
          const pg =
            await verifyPGOwnership(
              pgId,
              ownerId
            );

          if (!pg) {
            return res
              .status(403)
              .json({
                success: false,
                message:
                  "You do not have access to this PG.",
              });
          }
        }

        await ensureRentRecordsForPeriod({
          ownerId,
          pgId,
          month:
            monthNumber,
          year:
            yearNumber,
        });

        await updateOverdueRentRecords({
          ownerId,
          pgId,
          month:
            monthNumber,
          year:
            yearNumber,
        });
      }

      const filter = {
        ownerId,
      };

      if (pgId) {
        filter.pgId = pgId;
      }

      if (
        month &&
        year
      ) {
        const {
          start,
          end,
        } = getMonthRange(
          Number(month),
          Number(year)
        );

        filter.paymentDate = {
          $gte: start,
          $lte: end,
        };
      }

      const payments =
        await Payment.find(
          filter
        )
          .populate(
            "tenantId"
          )
          .populate(
            "userId",
            "name mobile"
          )
          .populate(
            "pgId",
            "name address city state"
          )
          .sort({
            paymentDate: -1,
          });

      return res.status(200).json({
        success: true,
        count: payments.length,
        payments,
      });
    } catch (error) {
      console.error(
        "Get owner payments error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payments.",
      });
    }
  };

/* =====================================================
   GET RENT SUMMARY

   THIS IS THE IMPORTANT PART.

   Returns:

   paid
   pending
   overdue

   for the selected month/year.
===================================================== */

export const getPaymentSummary =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const now =
        new Date();

      const month = Number(
        req.query.month ||
        now.getMonth() + 1
      );

      const year = Number(
        req.query.year ||
        now.getFullYear()
      );

      const {
        pgId,
      } = req.query;

      if (
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Month must be between 1 and 12.",
        });
      }

      if (!year) {
        return res.status(400).json({
          success: false,
          message:
            "Year is required.",
        });
      }

      /*
        Verify PG ownership.
      */

      if (pgId) {
        const pg =
          await verifyPGOwnership(
            pgId,
            ownerId
          );

        if (!pg) {
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to this PG.",
          });
        }
      }

      /*
        Create missing rent records
        for this month/year.
      */

      await ensureRentRecordsForPeriod({
        ownerId,
        pgId,
        month,
        year,
      });

      /*
        Automatically turn pending
        records into overdue after
        the deadline.
      */

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
        rentFilter.pgId =
          pgId;
      }

      const rentRecords =
        await RentRecord.find(
          rentFilter
        );

      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;

      let paidOnTimeCount = 0;
      let paidLateCount = 0;

      let totalLateDays = 0;

      for (
        const record of rentRecords
      ) {
        const amount =
          Number(
            record.amount || 0
          );

        if (
          record.status ===
          "paid"
        ) {
          paidCount++;

          paidAmount +=
            amount;

          if (
            Number(
              record.daysLate || 0
            ) === 0
          ) {
            paidOnTimeCount++;
          } else {
            paidLateCount++;

            totalLateDays +=
              Number(
                record.daysLate ||
                0
              );
          }
        }

        if (
          record.status ===
          "pending"
        ) {
          pendingCount++;

          pendingAmount +=
            amount;
        }

        if (
          record.status ===
          "overdue"
        ) {
          overdueCount++;

          overdueAmount +=
            amount;
        }
      }

      return res.status(200).json({
        success: true,

        period: {
          month,
          year,
        },

        summary: {
          totalTenants:
            rentRecords.length,

          paid:
            paidCount,

          pending:
            pendingCount,

          overdue:
            overdueCount,

          paidAmount,

          pendingAmount,

          overdueAmount,

          paidOnTime:
            paidOnTimeCount,

          paidLate:
            paidLateCount,

          totalLateDays,
        },
      });
    } catch (error) {
      console.error(
        "Get payment summary error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payment summary.",
      });
    }
  };

/* =====================================================
   GET RENT RECORDS

   This returns the actual monthly rent
   history, including:

   Paid
   Pending
   Overdue
   Days Late
===================================================== */

export const getRentRecords =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const now =
        new Date();

      const month = Number(
        req.query.month ||
        now.getMonth() + 1
      );

      const year = Number(
        req.query.year ||
        now.getFullYear()
      );

      const {
        pgId,
        status,
      } = req.query;

      if (
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid month.",
        });
      }

      if (
        pgId
      ) {
        const pg =
          await verifyPGOwnership(
            pgId,
            ownerId
          );

        if (!pg) {
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to this PG.",
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
        filter.pgId =
          pgId;
      }

      if (
        status &&
        [
          "pending",
          "paid",
          "overdue",
        ].includes(status)
      ) {
        filter.status =
          status;
      }

      const rentRecords =
        await RentRecord.find(
          filter
        )
          .populate(
            "tenantId"
          )
          .populate(
            "userId",
            "name mobile"
          )
          .populate(
            "pgId",
            "name address city state"
          )
          .sort({
            dueDate: 1,
          });

      return res.status(200).json({
        success: true,

        period: {
          month,
          year,
        },

        count:
          rentRecords.length,

        rentRecords,
      });
    } catch (error) {
      console.error(
        "Get rent records error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch rent records.",
      });
    }
  };

/* =====================================================
   CREATE PAYMENT

   Used when owner marks a tenant's rent
   as paid for a particular month.
===================================================== */

export const createPayment =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

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

      if (
        !tenantId ||
        !pgId ||
        amount === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tenant, PG and amount are required.",
        });
      }

      const pg =
        await verifyPGOwnership(
          pgId,
          ownerId
        );

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this PG.",
        });
      }

      const tenant =
        await Tenant.findOne({
          _id: tenantId,
          ownerId,
        });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message:
            "Tenant not found.",
        });
      }

      const paidAt =
        paymentDate
          ? new Date(
            paymentDate
          )
          : new Date();

      /*
        Determine month/year from the
        provided period.

        If frontend doesn't send them,
        use the payment date.
      */

      const paymentMonth =
        Number(
          month ||
          paidAt.getMonth() + 1
        );

      const paymentYear =
        Number(
          year ||
          paidAt.getFullYear()
        );

      await ensureRentRecordsForPeriod({
        ownerId,
        pgId,
        month:
          paymentMonth,
        year:
          paymentYear,
      });

      const rentRecord =
        await RentRecord.findOne({
          ownerId,
          tenantId,
          pgId,
          month:
            paymentMonth,
          year:
            paymentYear,
        });

      if (!rentRecord) {
        return res.status(404).json({
          success: false,
          message:
            "Rent record for this month could not be found.",
        });
      }

      /*
        Calculate whether the payment
        was late.
      */

      const daysLate =
        calculateDaysLate(
          rentRecord.dueDate,
          paidAt
        );

      /*
        Create actual payment transaction.
      */

      const payment =
        await Payment.create({
          ownerId,

          pgId,

          tenantId,

          userId:
            userId ||
            tenant.userId,

          amount:
            Number(amount),

          paymentDate:
            paidAt,

          paymentMethod:
            paymentMethod ||
            "cash",

          status: "paid",

          notes:
            notes || "",
        });

      /*
        Update monthly rent record.
      */

      rentRecord.status =
        "paid";

      rentRecord.paidDate =
        paidAt;

      rentRecord.paymentMethod =
        paymentMethod ||
        "cash";

      rentRecord.daysLate =
        daysLate;

      rentRecord.paymentId =
        payment._id;

      await rentRecord.save();

      return res.status(201).json({
        success: true,

        message:
          daysLate > 0
            ? `Rent marked as paid. Payment was ${daysLate} ${daysLate === 1
              ? "day"
              : "days"
            } late.`
            : "Rent marked as paid on time.",

        payment,

        rentRecord,
      });
    } catch (error) {
      console.error(
        "Create payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create payment.",
      });
    }
  };

/* =====================================================
   UPDATE PAYMENT STATUS

   Used by the Tenants page:

   Paid
   Not Paid
===================================================== */

export const updatePaymentStatus =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const {
        paymentId,
      } = req.params;

      const {
        status,
        paymentMethod,
      } = req.body;

      if (
        ![
          "paid",
          "pending",
          "overdue",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      const payment =
        await Payment.findOne({
          _id: paymentId,
          ownerId,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      /*
        If marking as paid, use the
        payment date as the paid date.
      */

      if (
        status === "paid"
      ) {
        const paidDate =
          new Date();

        payment.status =
          "paid";

        payment.paymentDate =
          paidDate;

        if (
          paymentMethod
        ) {
          payment.paymentMethod =
            paymentMethod;
        }

        await payment.save();

        const paymentMonth =
          paidDate.getMonth() + 1;

        const paymentYear =
          paidDate.getFullYear();

        const rentRecord =
          await RentRecord.findOne({
            ownerId,
            tenantId:
              payment.tenantId,
            pgId:
              payment.pgId,
            month:
              paymentMonth,
            year:
              paymentYear,
          });

        if (rentRecord) {
          const daysLate =
            calculateDaysLate(
              rentRecord.dueDate,
              paidDate
            );

          rentRecord.status =
            "paid";

          rentRecord.paidDate =
            paidDate;

          rentRecord.daysLate =
            daysLate;

          rentRecord.paymentMethod =
            payment.paymentMethod;

          rentRecord.paymentId =
            payment._id;

          await rentRecord.save();

          return res.status(200).json({
            success: true,

            message:
              daysLate > 0
                ? `Payment marked as paid ${daysLate} ${daysLate === 1
                  ? "day"
                  : "days"
                } late.`
                : "Payment marked as paid on time.",

            payment,

            rentRecord,
          });
        }

        return res.status(200).json({
          success: true,
          message:
            "Payment marked as paid.",
          payment,
        });
      }

      /*
        If marked pending/overdue,
        update the payment transaction.
      */

      payment.status =
        status;

      await payment.save();

      /*
        Update matching rent record.
      */

      const paymentDate =
        new Date(
          payment.paymentDate
        );

      const rentRecord =
        await RentRecord.findOne({
          ownerId,
          tenantId:
            payment.tenantId,
          pgId:
            payment.pgId,
          month:
            paymentDate.getMonth() + 1,
          year:
            paymentDate.getFullYear(),
        });

      if (rentRecord) {
        rentRecord.status =
          status;

        rentRecord.paidDate =
          null;

        rentRecord.daysLate =
          0;

        rentRecord.paymentId =
          null;

        await rentRecord.save();
      }

      return res.status(200).json({
        success: true,
        message:
          `Payment marked as ${status}.`,
        payment,
        rentRecord,
      });
    } catch (error) {
      console.error(
        "Update payment status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update payment status.",
      });
    }
  };

/* =====================================================
   DELETE PAYMENT
===================================================== */
export const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log("=================================");
    console.log("DELETE PAYMENT REQUEST");
    console.log("Payment ID:", paymentId);
    console.log("User:", req.user);
    console.log("=================================");

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find payment belonging to logged-in owner
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

    /*
      Find the monthly rent record connected
      to this payment.
    */
    const rentRecord = await RentRecord.findOne({
      paymentId: payment._id,
    });

    /*
      Reset the rent record before deleting
      the actual payment transaction.
    */
    if (rentRecord) {
      const today = new Date();
      const dueDate = new Date(rentRecord.dueDate);

      if (today > dueDate) {
        rentRecord.status = "overdue";
      } else {
        rentRecord.status = "pending";
      }

      rentRecord.paidDate = null;
      rentRecord.paymentMethod = null;
      rentRecord.daysLate = 0;
      rentRecord.paymentId = null;

      await rentRecord.save();

      console.log(
        "Rent record reset:",
        rentRecord._id.toString()
      );
    }

    /*
      Delete the actual payment transaction.
    */
    await Payment.deleteOne({
      _id: payment._id,
    });

    console.log(
      "Payment deleted:",
      payment._id.toString()
    );

    return res.status(200).json({
      success: true,
      message: "Payment transaction deleted successfully.",
    });

  } catch (error) {
    console.error(
      "Delete payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete payment.",
      error: error.message,
    });
  }
};