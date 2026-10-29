import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },

    // Optional for legacy accounts; required by owner/tenant creation controllers.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address.",
      ],
    },
    isEmailVerified: { type: Boolean, default: false },

    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "owner", "tenant"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subscriptionPlan: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly"],
      default: "monthly",
    },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null, index: true },
    subscriptionReactivatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Partial unique index avoids treating missing legacy emails as duplicates.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  }
);

const User = mongoose.model("User", userSchema);
export default User;
