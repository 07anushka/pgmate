import express from "express";

import {
  getMyFoodMenu,
  getFoodMenuSummary,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from "../controllers/foodMenuController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router = express.Router();


// Get food menu
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyFoodMenu
);


// Get summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  getFoodMenuSummary
);


// Add food item
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createFoodItem
);


// Update food item
router.patch(
  "/:foodId",
  protect,
  authorizeRoles("owner"),
  updateFoodItem
);


// Delete food item
router.delete(
  "/:foodId",
  protect,
  authorizeRoles("owner"),
  deleteFoodItem
);


export default router;