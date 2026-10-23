import mongoose from "mongoose";

const debtCollectionSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "other"],
      default: "cash",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

debtCollectionSchema.index({
  ownerId: 1,
  pgId: 1,
  tenantId: 1,
  paymentDate: -1,
});

const DebtCollection = mongoose.model(
  "DebtCollection",
  debtCollectionSchema
);

export default DebtCollection;