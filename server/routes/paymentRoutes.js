
import express from "express";

import {
  getMyPayments,
  getPaymentSummary,
  getRentRecords,
  createPayment,
  updatePaymentStatus,
  deletePayment,
} from "../controllers/paymentController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get payments
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyPayments
);

// Get payment summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getPaymentSummary
);

// Record payment
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createPayment
);

// Update payment status
router.patch(
  "/:paymentId/status",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updatePaymentStatus
);

// Get rent records
router.get(
  "/rent-records",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getRentRecords
);

// Delete payment
router.delete(
  "/:paymentId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deletePayment
);

export default router;
