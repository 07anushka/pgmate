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
} from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router =
  express.Router();


// ======================================================
// ROOMS
// ======================================================

router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createRoom
);

router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyRooms
);

router.patch(
  "/:roomId",
  protect,
  authorizeRoles("owner"),
  updateRoom
);

router.delete(
  "/:roomId",
  protect,
  authorizeRoles("owner"),
  deleteRoom
);


// ======================================================
// BEDS
// ======================================================

router.post(
  "/:roomId/beds",
  protect,
  authorizeRoles("owner"),
  addBed
);

router.patch(
  "/beds/:bedId/status",
  protect,
  authorizeRoles("owner"),
  updateBedStatus
);


export default router;