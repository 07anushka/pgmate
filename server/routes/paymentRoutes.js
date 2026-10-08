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
} from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router = express.Router();


// Get payments
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyPayments
);


// Get summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  getPaymentSummary
);


// Record payment
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createPayment
);


// Update status
router.patch(
  "/:paymentId/status",
  protect,
  authorizeRoles("owner"),
  updatePaymentStatus
);

router.get(
  "/rent-records",
  protect,
  authorizeRoles("owner"),
  getRentRecords
);


// Delete payment
router.delete(
  "/:paymentId",
  protect,
  authorizeRoles("owner"),
  deletePayment
);

export default router;