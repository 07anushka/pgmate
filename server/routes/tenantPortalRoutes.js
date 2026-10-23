
import express from "express";

import {
  getMyTenantProfile,
  updateMyTenantProfile,
  changeMyTenantPassword,
  getMyTenantPayments,
  getMyTenantFoodMenu,
  getMyTenantNotices,
  getMyTenantComplaints,
  createTenantComplaint,
} from "../controllers/tenantPortalController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get tenant profile
router.get(
  "/me",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyTenantProfile
);

// Get tenant payments
router.get(
  "/payments",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyTenantPayments
);

// Get food menu
router.get(
  "/food-menu",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyTenantFoodMenu
);

// Get tenant notices
router.get(
  "/notices",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyTenantNotices
);

// Get tenant complaints
router.get(
  "/complaints",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyTenantComplaints
);

// Create tenant complaint
router.post(
  "/complaints",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  createTenantComplaint
);

router.patch(
  "/me",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  updateMyTenantProfile
);

router.patch(
  "/me/password",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  changeMyTenantPassword
);

export default router;
