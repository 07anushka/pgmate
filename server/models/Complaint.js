import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "maintenance",
        "electricity",
        "water",
        "cleaning",
        "food",
        "internet",
        "room",
        "noise",
        "security",
        "other",
      ],
      default: "other",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "open",
    },

    resolvedAt: {
      type: Date,
      default: null,
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

complaintSchema.index({
  ownerId: 1,
  pgId: 1,
  status: 1,
});

complaintSchema.index({
  tenantId: 1,
  createdAt: -1,
});

const Complaint = mongoose.model(
  "Complaint",
  complaintSchema
);

export default Complaint;