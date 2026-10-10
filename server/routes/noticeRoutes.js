import express from "express";

import {
  getMyNotices,
  getTenantNotices,
  getNoticeSummary,
  createNotice,
  updateNotice,
  deleteNotice,
  dismissMyNotice,
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

router.get(
  "/tenant/my",
  protect,
  authorizeRoles("tenant"),
  getTenantNotices
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

router.delete(
  "/my/:noticeId/dismiss",
  protect,
  authorizeRoles("tenant"),
  dismissMyNotice
);

export default router;