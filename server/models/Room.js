import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: true,
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    roomType: {
      type: String,
      enum: [
        "single",
        "double",
        "triple",
        "four_sharing",
        "other",
      ],
      default: "double",
    },

    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },

    floor: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index(
  {
    pgId: 1,
    roomNumber: 1,
  },
  {
    unique: true,
  }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;