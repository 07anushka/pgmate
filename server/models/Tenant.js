
import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

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

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    // Identity and document details
    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      default: "",
      trim: true,
    },

    aadhaarNumber: {
      type: String,
      default: "",
      trim: true,
    },

    panNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    documentType: {
      type: String,
      enum: ["", "aadhaar", "pan", "drivingLicence"],
      default: "",
    },

    tenantPhoto: {
      type: String,
      default: "",
    },

    // Rent configuration
    rentDueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
      default: 5,
    },

    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },

    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Emergency contact
    emergencyContactName: {
      type: String,
      default: "",
      trim: true,
    },

    emergencyContactNumber: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "vacated"],
      default: "active",
    },

        vacatedAt: {
      type: Date,
      default: null,
    },

    // Outstanding rent debt retained after vacating
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    debtSettledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Efficient owner and PG tenant queries
tenantSchema.index({
  ownerId: 1,
  pgId: 1,
  status: 1,
});

// Only one active tenant per bed.
// Vacated tenant history is preserved.
tenantSchema.index(
  { bedId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  }
);

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
