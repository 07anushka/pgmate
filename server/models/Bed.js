import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
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

    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "available",
        "occupied",
        "maintenance",
      ],
      default: "available",
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bedSchema.index(
  {
    roomId: 1,
    bedNumber: 1,
  },
  {
    unique: true,
  }
);

const Bed = mongoose.model("Bed", bedSchema);

export default Bed;