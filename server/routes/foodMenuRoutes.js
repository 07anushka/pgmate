
import express from "express";

import {
  getMyFoodMenu,
  getFoodMenuSummary,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from "../controllers/foodMenuController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get food menu
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyFoodMenu
);

// Get food menu summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getFoodMenuSummary
);

// Add food item
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createFoodItem
);

// Update food item
router.patch(
  "/:foodId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateFoodItem
);

// Delete food item
router.delete(
  "/:foodId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteFoodItem
);

export default router;
