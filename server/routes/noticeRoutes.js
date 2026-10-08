import express from "express";

import {
  getMyNotices,
  getNoticeSummary,
  createNotice,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router = express.Router();


// Get notices
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  getMyNotices
);


// Get summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  getNoticeSummary
);


// Create notice
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  createNotice
);


// Update notice
router.patch(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  updateNotice
);


// Delete notice
router.delete(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  deleteNotice
);


export default router;