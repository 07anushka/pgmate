import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
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

    description: {
      type: String,
      required: true,
      trim: true,
    },

    noticeType: {
      type: String,
      enum: [
        "general",
        "maintenance",
        "payment",
        "food",
        "event",
        "emergency",
        "rules",
        "other",
      ],
      default: "general",
    },

    priority: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "urgent",
      ],
      default: "medium",
    },

    audience: {
      type: String,
      enum: [
        "all",
        "tenants",
      ],
      default: "all",
    },

    publishDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

noticeSchema.index({
  ownerId: 1,
  pgId: 1,
  publishDate: -1,
});

noticeSchema.index({
  pgId: 1,
  expiryDate: 1,
});

const Notice = mongoose.model(
  "Notice",
  noticeSchema
);

export default Notice;