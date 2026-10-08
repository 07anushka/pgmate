import mongoose from "mongoose";

const rentRecordSchema = new mongoose.Schema(
  {
    /* =================================================
       OWNER
    ================================================= */

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =================================================
       PG
    ================================================= */

    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: true,
    },

    /* =================================================
       TENANT
    ================================================= */

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =================================================
       RENT PERIOD
       
       Every tenant gets a separate rent record
       for every month and year.

       Example:
       month: 10
       year: 2026

       = October 2026
    ================================================= */

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
      min: 2020,
    },

    /* =================================================
       RENT AMOUNT
       
       Store the amount here so old months are not
       affected if the tenant's rent changes later.
    ================================================= */

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /* =================================================
       DUE DATE
       
       This is the actual deadline for this month's
       rent.

       Example:
       October 5, 2026
    ================================================= */

    dueDate: {
      type: Date,
      required: true,
    },

    /* =================================================
       PAYMENT STATUS

       pending
       → deadline has not passed and rent is unpaid

       overdue
       → deadline has passed and rent is unpaid

       paid
       → rent has been paid
    ================================================= */

    status: {
      type: String,
      enum: [
        "pending",
        "overdue",
        "paid",
      ],
      default: "pending",
      required: true,
    },

    /* =================================================
       PAYMENT DETAILS
    ================================================= */

    paidDate: {
      type: Date,
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "upi",
        "bank",
        "card",
        "other",
        null,
      ],
      default: null,
    },

    /* =================================================
       DAYS LATE
       
       Example:

       Due: 5 Oct
       Paid: 8 Oct

       daysLate = 3
    ================================================= */

    daysLate: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =================================================
       PAYMENT REFERENCE
       
       Links this rent record to the actual Payment
       transaction.
    ================================================= */

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    /* =================================================
       NOTES
    ================================================= */

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   IMPORTANT INDEX

   One tenant can have only ONE rent record for
   a particular month and year.

   Example:

   Anushka
   October 2026
   → only one RentRecord

   November 2026
   → another RentRecord
===================================================== */

rentRecordSchema.index(
  {
    tenantId: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

/* =====================================================
   OWNER + PG + PERIOD INDEX

   Helps quickly fetch rent records for:

   Owner
   PG
   Month
   Year
===================================================== */

rentRecordSchema.index({
  ownerId: 1,
  pgId: 1,
  year: 1,
  month: 1,
});

/* =====================================================
   TENANT HISTORY INDEX

   Helps fetch one tenant's rent history quickly.
===================================================== */

rentRecordSchema.index({
  tenantId: 1,
  year: -1,
  month: -1,
});

/* =====================================================
   STATUS INDEX

   Helps calculate:

   Paid
   Pending
   Overdue
===================================================== */

rentRecordSchema.index({
  ownerId: 1,
  pgId: 1,
  year: 1,
  month: 1,
  status: 1,
});

const RentRecord = mongoose.model(
  "RentRecord",
  rentRecordSchema
);

export default RentRecord;