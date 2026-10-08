import express from "express";

import {
  getMyTenantProfile,
  getMyTenantPayments,
  getMyTenantFoodMenu,
  getMyTenantNotices,
  getMyTenantComplaints,
  createTenantComplaint,
} from "../controllers/tenantPortalController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
  "/me",
  protect,
  authorizeRoles("tenant"),
  getMyTenantProfile
);

router.get(
  "/payments",
  protect,
  authorizeRoles("tenant"),
  getMyTenantPayments
);

router.get(
  "/food-menu",
  protect,
  authorizeRoles("tenant"),
  getMyTenantFoodMenu
);

router.get(
  "/notices",
  protect,
  authorizeRoles("tenant"),
  getMyTenantNotices
);

router.get(
  "/complaints",
  protect,
  authorizeRoles("tenant"),
  getMyTenantComplaints
);

router.post(
  "/complaints",
  protect,
  authorizeRoles("tenant"),
  createTenantComplaint
);

export default router;