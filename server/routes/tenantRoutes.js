import express from "express";

import {
  createTenant,
  getMyTenants,
  getAvailableBeds,
  vacateTenant,
  updateTenant,
  deleteTenant,
} from "../controllers/tenantController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyTenants
);

router.get(
  "/available-beds",
  protect,
  authorizeRoles("owner"),
  getAvailableBeds
);

router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createTenant
);

router.patch(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  updateTenant
);

router.patch(
  "/:tenantId/vacate",
  protect,
  authorizeRoles("owner"),
  vacateTenant
);

router.delete(
  "/:tenantId",
  protect,
  authorizeRoles("owner"),
  deleteTenant
);

export default router;