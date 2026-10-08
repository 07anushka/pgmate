import mongoose from "mongoose";

import FoodMenu from "../models/FoodMenu.js";
import PG from "../models/PG.js";


// =========================================================
// GET MY FOOD MENU
// =========================================================

export const getMyFoodMenu = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const {
      pgId,
      day,
      mealType,
      foodType,
    } = req.query;

    const filter = {
      ownerId,
    };

    // -----------------------------------------------------
    // PG FILTER
    // -----------------------------------------------------

    if (pgId) {
      if (
        !mongoose.Types.ObjectId.isValid(pgId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this PG",
        });
      }

      filter.pgId = pgId;
    }

    // -----------------------------------------------------
    // DAY FILTER
    // -----------------------------------------------------

    if (day && day !== "all") {
      filter.day = day;
    }

    // -----------------------------------------------------
    // MEAL TYPE FILTER
    // -----------------------------------------------------

    if (
      mealType &&
      mealType !== "all"
    ) {
      filter.mealType = mealType;
    }

    // -----------------------------------------------------
    // FOOD TYPE FILTER
    // -----------------------------------------------------

    if (
      foodType &&
      foodType !== "all"
    ) {
      filter.foodType = foodType;
    }

    // -----------------------------------------------------
    // FETCH
    // -----------------------------------------------------

    const foodItems =
      await FoodMenu.find(filter)
        .populate(
          "pgId",
          "name city"
        )
        .sort({
          day: 1,
          mealType: 1,
          timingFrom: 1,
          name: 1,
        });

    return res.status(200).json({
      success: true,
      count: foodItems.length,
      foodItems,
    });
  } catch (error) {
    console.error(
      "Get food menu error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch food menu",
    });
  }
};


// =========================================================
// GET FOOD MENU SUMMARY
// =========================================================

export const getFoodMenuSummary = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;
    const { pgId } = req.query;

    const filter = {
      ownerId,
    };

    // -----------------------------------------------------
    // PG FILTER
    // -----------------------------------------------------

    if (pgId) {
      if (
        !mongoose.Types.ObjectId.isValid(pgId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this PG",
        });
      }

      filter.pgId = pgId;
    }

    const foodItems =
      await FoodMenu.find(filter);

    const total =
      foodItems.length;

    const veg =
      foodItems.filter(
        (item) =>
          item.foodType === "veg"
      ).length;

    const nonVeg =
      foodItems.filter(
        (item) =>
          item.foodType === "non_veg"
      ).length;

    const breakfast =
      foodItems.filter(
        (item) =>
          item.mealType ===
          "breakfast"
      ).length;

    const lunch =
      foodItems.filter(
        (item) =>
          item.mealType ===
          "lunch"
      ).length;

    const snacks =
      foodItems.filter(
        (item) =>
          item.mealType ===
          "snacks"
      ).length;

    const dinner =
      foodItems.filter(
        (item) =>
          item.mealType ===
          "dinner"
      ).length;

    const days = new Set(
      foodItems.map(
        (item) => item.day
      )
    );

    return res.status(200).json({
      success: true,
      summary: {
        total,
        veg,
        nonVeg,
        breakfast,
        lunch,
        snacks,
        dinner,
        daysCovered: days.size,
      },
    });
  } catch (error) {
    console.error(
      "Food menu summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch food menu summary",
    });
  }
};


// =========================================================
// CREATE FOOD ITEM
// =========================================================

export const createFoodItem = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const {
      pgId,
      day,
      name,
      mealType,
      foodType,
      timingFrom,
      timingTo,
    } = req.body;

    // -----------------------------------------------------
    // REQUIRED FIELDS
    // -----------------------------------------------------

    if (
      !pgId ||
      !day ||
      !name ||
      !mealType ||
      !foodType ||
      !timingFrom ||
      !timingTo
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PG, day, food name, meal type, food type and timing are required",
      });
    }

    // -----------------------------------------------------
    // VALIDATE PG ID
    // -----------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        pgId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid PG ID",
      });
    }

    // -----------------------------------------------------
    // VERIFY PG OWNERSHIP
    // -----------------------------------------------------

    const pg = await PG.findOne({
      _id: pgId,
      ownerId,
    });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this PG",
      });
    }

    // -----------------------------------------------------
    // VALIDATE TIME
    // -----------------------------------------------------

    if (
      timingFrom >= timingTo
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ending time must be after starting time",
      });
    }

    // -----------------------------------------------------
    // CREATE
    // -----------------------------------------------------

    const foodItem =
      await FoodMenu.create({
        ownerId,
        pgId,
        day,
        name: name.trim(),
        mealType,
        foodType,
        timingFrom,
        timingTo,
      });

    const populatedItem =
      await FoodMenu.findById(
        foodItem._id
      ).populate(
        "pgId",
        "name city"
      );

    return res.status(201).json({
      success: true,
      message:
        "Food item added successfully",
      foodItem:
        populatedItem,
    });
  } catch (error) {
    console.error(
      "Create food item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create food item",
    });
  }
};


// =========================================================
// UPDATE FOOD ITEM
// =========================================================

export const updateFoodItem = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { foodId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        foodId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid food item ID",
      });
    }

    const foodItem =
      await FoodMenu.findOne({
        _id: foodId,
        ownerId,
      });

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message:
          "Food item not found",
      });
    }

    const {
      day,
      name,
      mealType,
      foodType,
      timingFrom,
      timingTo,
    } = req.body;

    // -----------------------------------------------------
    // UPDATE FIELDS
    // -----------------------------------------------------

    if (day !== undefined) {
      foodItem.day = day;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Food name cannot be empty",
        });
      }

      foodItem.name =
        name.trim();
    }

    if (
      mealType !== undefined
    ) {
      foodItem.mealType =
        mealType;
    }

    if (
      foodType !== undefined
    ) {
      foodItem.foodType =
        foodType;
    }

    if (
      timingFrom !== undefined
    ) {
      foodItem.timingFrom =
        timingFrom;
    }

    if (
      timingTo !== undefined
    ) {
      foodItem.timingTo =
        timingTo;
    }

    // -----------------------------------------------------
    // VALIDATE TIME
    // -----------------------------------------------------

    if (
      foodItem.timingFrom >=
      foodItem.timingTo
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ending time must be after starting time",
      });
    }

    await foodItem.save();

    const updatedItem =
      await FoodMenu.findById(
        foodItem._id
      ).populate(
        "pgId",
        "name city"
      );

    return res.status(200).json({
      success: true,
      message:
        "Food item updated successfully",
      foodItem:
        updatedItem,
    });
  } catch (error) {
    console.error(
      "Update food item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update food item",
    });
  }
};


// =========================================================
// DELETE FOOD ITEM
// =========================================================

export const deleteFoodItem = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { foodId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        foodId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid food item ID",
      });
    }

    const foodItem =
      await FoodMenu.findOneAndDelete({
        _id: foodId,
        ownerId,
      });

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message:
          "Food item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Food item deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete food item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete food item",
    });
  }
};