
import express from "express";

import {
  getMyPGs,
  createPG,
  updatePG,
  deletePG,
} from "../controllers/pgController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get owner's PGs
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyPGs
);

// Create PG
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createPG
);

// Update PG
router.patch(
  "/:pgId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updatePG
);

// Delete PG
router.delete(
  "/:pgId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deletePG
);

export default router;
