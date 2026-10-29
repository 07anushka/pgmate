
import mongoose from "mongoose";

const subscriptionEmailLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionEndDate: {
      type: Date,
      required: true,
    },
    emailType: {
      type: String,
      enum: ["welcome", "expiry-5", "expiry-3", "expiry-1"],
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent the same reminder from being recorded twice for one subscription.
subscriptionEmailLogSchema.index(
  { ownerId: 1, subscriptionEndDate: 1, emailType: 1 },
  { unique: true }
);

export default mongoose.model(
  "SubscriptionEmailLog",
  subscriptionEmailLogSchema
);
