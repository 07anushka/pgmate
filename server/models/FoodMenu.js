import mongoose from "mongoose";

const foodMenuSchema = new mongoose.Schema(
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

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mealType: {
      type: String,
      enum: [
        "breakfast",
        "lunch",
        "dinner",
        "snacks",
      ],
      required: true,
    },

    foodType: {
      type: String,
      enum: ["veg", "non_veg"],
      default: "veg",
    },

    timingFrom: {
      type: String,
      required: true,
      trim: true,
    },

    timingTo: {
      type: String,
      required: true,
      trim: true,
    },

    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

foodMenuSchema.index({
  ownerId: 1,
  pgId: 1,
  mealType: 1,
});

const FoodMenu = mongoose.model(
  "FoodMenu",
  foodMenuSchema
);

export default FoodMenu;