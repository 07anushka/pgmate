import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "rent",
        "electricity",
        "water",
        "maintenance",
        "food",
        "salary",
        "internet",
        "cleaning",
        "supplies",
        "other",
      ],
      default: "other",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    expenseDate: {
      type: Date,
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
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({
  ownerId: 1,
  pgId: 1,
  expenseDate: -1,
});

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;