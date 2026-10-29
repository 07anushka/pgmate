
import mongoose from "mongoose";

const tenantEmailLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    notificationKey: {
      type: String,
      required: true,
      unique: true,
    },
    emailType: {
      type: String,
      enum: [
        "welcome",
        "rent-reminder",
        "rent-overdue",
        "payment-receipt",
        "vacated",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    recipient: {
      type: String,
      default: "",
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

export default mongoose.model("TenantEmailLog", tenantEmailLogSchema);
