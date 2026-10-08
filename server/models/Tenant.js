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

    /*
      Rent is due on this day every month.

      Example:
      5 = 5th of every month
      10 = 10th of every month
      28 = 28th of every month
    */
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
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({
  ownerId: 1,
  pgId: 1,
  status: 1,
});

/*
  Only one ACTIVE tenant can occupy a bed.

  Vacated tenants can keep the same bedId
  in their historical record.
*/
tenantSchema.index(
  { bedId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  }
);

const Tenant = mongoose.model(
  "Tenant",
  tenantSchema
);

export default Tenant;