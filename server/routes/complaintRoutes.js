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

import { protect } from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router = express.Router();


// Get complaints
router.get(
  "/my",
  protect,
  authorizeRoles("tenant"),
  getMyComplaints
);


// Get complaint summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  getComplaintSummary
);


// Get active tenants
router.get(
  "/tenants",
  protect,
  authorizeRoles("owner"),
  getComplaintTenants
);

router.get(
  "/owner",
  protect,
  authorizeRoles("owner"),
  getOwnerComplaints
);

// Create complaint
router.post(
  "/",
  protect,
  authorizeRoles("tenant"),
  createComplaint
);


// Update complaint
router.patch(
  "/:complaintId",
  protect,
  authorizeRoles("owner"),
  updateComplaint
);


// Delete complaint
router.delete(
  "/:complaintId",
  protect,
  authorizeRoles("owner"),
  deleteComplaint
);

router.patch(
  "/my/:complaintId",
  protect,
  authorizeRoles("tenant"),
  updateMyComplaint
);

router.delete(
  "/my/:complaintId",
  protect,
  authorizeRoles("tenant"),
  deleteMyComplaint
);

export default router;