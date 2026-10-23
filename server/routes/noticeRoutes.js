
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

// ============================================
// OWNER: GET NOTICES
// GET /api/notices/my?pgId=PG_ID
// ============================================

router.get(
  "/my",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getMyNotices
);

// ============================================
// OWNER: GET NOTICE SUMMARY
// GET /api/notices/summary?pgId=PG_ID
// ============================================

router.get(
  "/summary",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  getNoticeSummary
);

// ============================================
// TENANT: GET NOTICES FOR THEIR PG
// GET /api/notices/tenant/my
// ============================================

router.get(
  "/tenant/my",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  getTenantNotices
);

// ============================================
// OWNER: CREATE NOTICE
// POST /api/notices
// ============================================

router.post(
  "/",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  createNotice
);

// ============================================
// OWNER: UPDATE NOTICE
// PATCH /api/notices/:noticeId
// ============================================

router.patch(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  updateNotice
);

// ============================================
// OWNER: DELETE NOTICE
// DELETE /api/notices/:noticeId
// ============================================

router.delete(
  "/:noticeId",
  protect,
  authorizeRoles("owner"),
  checkSubscription,
  deleteNotice
);

// ============================================
// TENANT: DISMISS A NOTICE
// DELETE /api/notices/my/:noticeId/dismiss
// ============================================

router.delete(
  "/my/:noticeId/dismiss",
  protect,
  authorizeRoles("tenant"),
  checkSubscription,
  dismissMyNotice
);

export default router;
