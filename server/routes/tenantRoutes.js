import express from "express";

import {
  createTenant,
  getMyTenants,
  getAvailableBeds,
  vacateTenant,
  updateTenant,
  deleteTenant,
  getMyRoommates,
} from "../controllers/tenantController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =========================================
   TENANT ROUTES
========================================= */

// Get roommates in the logged-in tenant's room
router.get(
  "/my-roommates",
  protect,
  authorizeRoles("tenant"),
  getMyRoommates
);

/* =========================================
   OWNER ROUTES
========================================= */

// Get all tenants managed by the logged-in owner
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyTenants
);

// Get available beds
router.get(
  "/available-beds",
  protect,
  authorizeRoles("owner"),
  getAvailableBeds
);

// Create a tenant
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createTenant
);

// Update tenant details
router.patch(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  updateTenant
);

// Vacate a tenant
router.patch(
  "/:tenantId/vacate",
  protect,
  authorizeRoles("owner"),
  vacateTenant
);

// Delete a tenant
router.delete(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  deleteTenant
);

export default router;
