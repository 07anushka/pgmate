
import express from "express";

import {
  getMyExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get expenses
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyExpenses
);

// Get expense summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getExpenseSummary
);

// Create expense
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createExpense
);

// Update expense
router.patch(
  "/:expenseId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateExpense
);

// Delete expense
router.delete(
  "/:expenseId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteExpense
);

export default router;
