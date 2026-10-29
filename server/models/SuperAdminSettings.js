
import mongoose from "mongoose";

const superAdminSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    notifications: {
      expiry: { type: Boolean, default: true },
      newOwner: { type: Boolean, default: true },
      platform: { type: Boolean, default: false },
    },

    platform: {
      defaultSubscriptionPlan: {
        type: String,
        enum: ["monthly", "quarterly", "half-yearly", "yearly"],
        default: "monthly",
      },
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "SuperAdminSettings",
  superAdminSettingsSchema
);
