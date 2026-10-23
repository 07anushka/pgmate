import mongoose from "mongoose";

import Notice from "../models/Notice.js";
import PG from "../models/PG.js";
import NoticeDismissal from "../models/NoticeDismissal.js";
import Tenant from "../models/Tenant.js";

const NOTICE_TYPES = [
  "general",
  "maintenance",
  "payment",
  "food",
  "event",
  "emergency",
  "rules",
  "other",
];

const PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
];

const AUDIENCES = [
  "all",
  "tenants",
];

const getOwnerId = (req) =>
  req.user?.userId || req.user?._id;

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
};

const validateNoticeFields = (body, existing = {}) => {
  const data = {};

  if (body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return {
        error: "Notice title is required.",
      };
    }

    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (
      typeof body.description !== "string" ||
      !body.description.trim()
    ) {
      return {
        error: "Notice description is required.",
      };
    }

    data.description = body.description.trim();
  }

  if (body.noticeType !== undefined) {
    if (!NOTICE_TYPES.includes(body.noticeType)) {
      return {
        error: "Invalid notice type.",
      };
    }

    data.noticeType = body.noticeType;
  }

  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) {
      return {
        error: "Invalid notice priority.",
      };
    }

    data.priority = body.priority;
  }

  if (body.audience !== undefined) {
    if (!AUDIENCES.includes(body.audience)) {
      return {
        error: "Invalid notice audience.",
      };
    }

    data.audience = body.audience;
  }

  if (body.isPublished !== undefined) {
    const value = parseBoolean(body.isPublished);

    if (value === null) {
      return {
        error: "Invalid publish status.",
      };
    }

    data.isPublished = value;
  }

  if (body.publishDate !== undefined) {
    const date = parseDate(body.publishDate);

    if (date === undefined || date === null) {
      return {
        error: "A valid publish date is required.",
      };
    }

    data.publishDate = date;
  }

  if (body.expiryDate !== undefined) {
    const date = parseDate(body.expiryDate);

    if (date === undefined) {
      return {
        error: "Invalid expiry date.",
      };
    }

    data.expiryDate = date;
  }

  const publishDate =
    data.publishDate ??
    existing.publishDate ??
    new Date();

  const expiryDate =
    data.expiryDate !== undefined
      ? data.expiryDate
      : existing.expiryDate;

  if (
    expiryDate &&
    publishDate &&
    expiryDate < publishDate
  ) {
    return {
      error: "Expiry date cannot be before publish date.",
    };
  }

  return { data };
};

const getOwnedPG = async (pgId, ownerId) => {
  if (!pgId || !isValidId(pgId)) {
    return null;
  }

  return PG.findOne({
    _id: pgId,
    ownerId,
  });
};

const getNoticeState = (notice, now = new Date()) => {
  if (!notice.isPublished) {
    return "draft";
  }

  if (
    notice.publishDate &&
    new Date(notice.publishDate) > now
  ) {
    return "scheduled";
  }

  if (
    notice.expiryDate &&
    new Date(notice.expiryDate) < now
  ) {
    return "expired";
  }

  return "active";
};

// --------------------------------------------------
// GET MY NOTICES
// GET /api/notices/my?pgId=...
// --------------------------------------------------

export const getMyNotices = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      pgId,
      noticeType,
      priority,
      audience,
      status,
    } = req.query;

    // A selected PG is required to prevent cross-PG data.
    if (!pgId || !isValidId(pgId)) {
      return res.status(400).json({
        success: false,
        message: "A valid PG ID is required.",
      });
    }

    const pg = await getOwnedPG(pgId, ownerId);

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const filter = {
      ownerId,
      pgId,
    };

    if (noticeType && noticeType !== "all") {
      if (!NOTICE_TYPES.includes(noticeType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notice type.",
        });
      }

      filter.noticeType = noticeType;
    }

    if (priority && priority !== "all") {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notice priority.",
        });
      }

      filter.priority = priority;
    }

    if (audience && audience !== "all") {
      if (!AUDIENCES.includes(audience)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notice audience.",
        });
      }

      filter.audience = audience;
    }

    const now = new Date();

    if (status === "active") {
      filter.isPublished = true;
      filter.publishDate = { $lte: now };
      filter.$and = [
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: now } },
          ],
        },
      ];
    } else if (status === "expired") {
      filter.isPublished = true;
      filter.expiryDate = { $lt: now };
    } else if (status === "draft") {
      filter.isPublished = false;
    } else if (status && status !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid notice status.",
      });
    }

    const notices = await Notice.find(filter)
      .populate("pgId", "name city")
      .sort({
        publishDate: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    console.error("Get notices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notices.",
    });
  }
};

// --------------------------------------------------
// GET NOTICE SUMMARY
// GET /api/notices/summary?pgId=...
// --------------------------------------------------

export const getNoticeSummary = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { pgId } = req.query;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!pgId || !isValidId(pgId)) {
      return res.status(400).json({
        success: false,
        message: "A valid PG ID is required.",
      });
    }

    const pg = await getOwnedPG(pgId, ownerId);

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const notices = await Notice.find({
      ownerId,
      pgId,
    })
      .select(
        "isPublished publishDate expiryDate priority"
      )
      .lean();

    const now = new Date();

    const summary = {
      total: notices.length,
      published: 0,
      active: 0,
      expired: 0,
      urgent: 0,
      high: 0,
    };

    for (const notice of notices) {
      const state = getNoticeState(notice, now);

      if (notice.isPublished) {
        summary.published += 1;
      }

      if (state === "active") {
        summary.active += 1;

        if (notice.priority === "urgent") {
          summary.urgent += 1;
        }

        if (notice.priority === "high") {
          summary.high += 1;
        }
      }

      if (state === "expired") {
        summary.expired += 1;
      }
    }

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Notice summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notice summary.",
    });
  }
};

// --------------------------------------------------
// CREATE NOTICE
// POST /api/notices
// --------------------------------------------------

export const createNotice = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { pgId } = req.body;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!pgId || !isValidId(pgId)) {
      return res.status(400).json({
        success: false,
        message: "A valid PG ID is required.",
      });
    }

    const pg = await getOwnedPG(pgId, ownerId);

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const validation = validateNoticeFields(
      {
        ...req.body,
        isPublished:
          req.body.isPublished === undefined
            ? true
            : req.body.isPublished,
      }
    );

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const notice = await Notice.create({
      ...validation.data,
      ownerId,
      pgId,
    });

    return res.status(201).json({
      success: true,
      message: "Notice created successfully.",
      notice,
    });
  } catch (error) {
    console.error("Create notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create notice.",
    });
  }
};

// --------------------------------------------------
// UPDATE NOTICE
// PATCH /api/notices/:noticeId
// --------------------------------------------------

export const updateNotice = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { noticeId } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidId(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const notice = await Notice.findOne({
      _id: noticeId,
      ownerId,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    // Do not allow a notice to be moved to another PG.
    if (
      req.body.pgId &&
      String(req.body.pgId) !== String(notice.pgId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A notice cannot be moved to another PG.",
      });
    }

    const pg = await getOwnedPG(notice.pgId, ownerId);

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const validation = validateNoticeFields(
      req.body,
      notice.toObject()
    );

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    Object.assign(notice, validation.data);

    await notice.save();

    return res.status(200).json({
      success: true,
      message: "Notice updated successfully.",
      notice,
    });
  } catch (error) {
    console.error("Update notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notice.",
    });
  }
};

// --------------------------------------------------
// DELETE NOTICE
// DELETE /api/notices/:noticeId
// --------------------------------------------------

export const deleteNotice = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { noticeId } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidId(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const notice = await Notice.findOneAndDelete({
      _id: noticeId,
      ownerId,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    // Remove dismissal records for this notice as well.
    await NoticeDismissal.deleteMany({
      noticeId: notice._id,
    });

    return res.status(200).json({
      success: true,
      message: "Notice deleted successfully.",
    });
  } catch (error) {
    console.error("Delete notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notice.",
    });
  }
};

// --------------------------------------------------
// GET TENANT NOTICES
// --------------------------------------------------

export const getTenantNotices = async (req, res) => {
  try {
    const userId = getOwnerId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    }).lean();

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenancy found.",
      });
    }

    const now = new Date();

    const dismissals = await NoticeDismissal.find({
      tenantId: tenant._id,
    })
      .select("noticeId")
      .lean();

    const dismissedIds = dismissals.map(
      (item) => item.noticeId
    );

    const notices = await Notice.find({
      pgId: tenant.pgId,
      isPublished: true,
      publishDate: { $lte: now },
      $and: [
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: now } },
          ],
        },
        {
          $or: [
            { audience: "all" },
            { audience: "tenants" },
          ],
        },
      ],
      _id: { $nin: dismissedIds },
    })
      .sort({
        priority: -1,
        publishDate: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    console.error("Get tenant notices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tenant notices.",
    });
  }
};

// --------------------------------------------------
// DISMISS TENANT NOTICE
// --------------------------------------------------

export const dismissMyNotice = async (req, res) => {
  try {
    const userId = getOwnerId(req);
    const { noticeId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidId(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenancy found.",
      });
    }

    const now = new Date();

    const notice = await Notice.findOne({
      _id: noticeId,
      pgId: tenant.pgId,
      isPublished: true,
      publishDate: { $lte: now },
      $and: [
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: now } },
          ],
        },
        {
          $or: [
            { audience: "all" },
            { audience: "tenants" },
          ],
        },
      ],
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found or unavailable.",
      });
    }

    await NoticeDismissal.updateOne(
      {
        noticeId: notice._id,
        tenantId: tenant._id,
      },
      {
        $setOnInsert: {
          noticeId: notice._id,
          tenantId: tenant._id,
          userId,
        },
      },
      {
        upsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Notice dismissed successfully.",
    });
  } catch (error) {
    console.error("Dismiss notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to dismiss notice.",
    });
  }
};