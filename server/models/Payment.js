import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: true,
    },

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

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "other"],
      default: "cash",
    },

    status: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "paid",
    },

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

paymentSchema.index({
  ownerId: 1,
  pgId: 1,
  paymentDate: -1,
});

paymentSchema.index({
  tenantId: 1,
  paymentDate: -1,
});

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);

export default Payment;