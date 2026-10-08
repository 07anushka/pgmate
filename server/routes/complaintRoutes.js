import express from "express";

import {
  getMyComplaints,
  getComplaintSummary,
  getComplaintTenants,
  createComplaint,
  updateComplaint,
  deleteComplaint,
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
  authorizeRoles("owner"),
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


// Create complaint
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
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


export default router;