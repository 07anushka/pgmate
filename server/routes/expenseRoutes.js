import express from "express";

import {
  getMyExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

import { protect } from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();


// Get expenses
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyExpenses
);


// Get expense summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  getExpenseSummary
);


// Create expense
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createExpense
);


// Update expense
router.patch(
  "/:expenseId",
  protect,
  authorizeRoles("owner"),
  updateExpense
);


// Delete expense
router.delete(
  "/:expenseId",
  protect,
  authorizeRoles("owner"),
  deleteExpense
);


export default router;