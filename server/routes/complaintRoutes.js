
import express from "express";

import {
  getMyComplaints,
  getOwnerComplaints,
  getComplaintSummary,
  getComplaintTenants,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  updateMyComplaint,
  deleteMyComplaint,
} from "../controllers/complaintController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Tenant: Get complaints
router.get(
  "/my",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getMyComplaints
);

// Owner: Get complaint summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getComplaintSummary
);

// Owner: Get active tenants
router.get(
  "/tenants",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getComplaintTenants
);

// Owner: Get all complaints
router.get(
  "/owner",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getOwnerComplaints
);

// Tenant: Create complaint
router.post(
  "/",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  createComplaint
);

// Owner: Update complaint
router.patch(
  "/:complaintId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateComplaint
);

// Owner: Delete complaint
router.delete(
  "/:complaintId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteComplaint
);

// Tenant: Update own complaint
router.patch(
  "/my/:complaintId",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  updateMyComplaint
);

// Tenant: Delete own complaint
router.delete(
  "/my/:complaintId",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  deleteMyComplaint
);

export default router;
