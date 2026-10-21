
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

import {
  protect,
  checkSubscription,
} from "../middleware/authMiddleware.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Owner: Get notices
router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyNotices
);

// Owner: Get notice summary
router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getNoticeSummary
);

// Tenant: Get notices
router.get(
  "/tenant/my",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getTenantNotices
);

// Owner: Create notice
router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createNotice
);

// Owner: Update notice
router.patch(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateNotice
);

// Owner: Delete notice
router.delete(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteNotice
);

// Tenant: Dismiss own notice
router.delete(
  "/my/:noticeId/dismiss",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  dismissMyNotice
);

export default router;
