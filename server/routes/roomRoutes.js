
import express from "express";

import {
  createRoom,
  getMyRooms,
  updateRoom,
  deleteRoom,
  addBed,
  updateBedStatus,
} from "../controllers/roomController.js";

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ======================================================
// ROOMS
// ======================================================

// Create room
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createRoom
);

// Get owner's rooms
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyRooms
);

// Update room
router.patch(
  "/:roomId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateRoom
);

// Delete room
router.delete(
  "/:roomId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteRoom
);

// ======================================================
// BEDS
// ======================================================

// Add bed
router.post(
  "/:roomId/beds",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  addBed
);

// Update bed status
router.patch(
  "/beds/:bedId/status",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateBedStatus
);

export default router;
