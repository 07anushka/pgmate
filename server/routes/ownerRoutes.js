import express from "express";

import {
  createOwner,
  getOwners,
  reactivateOwnerSubscription,
  updateOwner,
  deleteOwner,
} from "../controllers/ownerController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("super_admin"),
  createOwner
);

router.get(
  "/",
  protect,
  authorizeRoles("super_admin"),
  getOwners
);

router.patch(
  "/:ownerId/reactivate",
  protect,
  authorizeRoles("super_admin"),
  reactivateOwnerSubscription
);

router.patch(
  "/:ownerId",
  protect,
  authorizeRoles("super_admin"),
  updateOwner
);

router.delete(
  "/:ownerId",
  protect,
  authorizeRoles("super_admin"),
  deleteOwner
);

export default router;