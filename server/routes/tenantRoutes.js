
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

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { deleteTenantAadhaarImage } from "../controllers/tenantController.js";
const router = express.Router();

/* =========================================
   TENANT ROUTES
========================================= */

// Get roommates in the logged-in tenant's room.
// Block tenants if their PG owner's subscription has ended.
router.get(
  "/my-roommates",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
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
  checkSubscription,
  getMyTenants
);

// Get available beds
router.get(
  "/available-beds",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getAvailableBeds
);

// Create a tenant
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createTenant
);

// Update tenant details
router.patch(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateTenant
);

// Vacate a tenant
router.patch(
  "/:tenantId/vacate",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  vacateTenant
);

// Delete a tenant
router.delete(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteTenant
);

router.delete(
  "/:tenantId/aadhaar-image",
  protect,
  authorizeRoles("owner"),
  deleteTenantAadhaarImage
);

export default router;
