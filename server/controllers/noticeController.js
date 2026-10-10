import mongoose from "mongoose";

import Notice from "../models/Notice.js";
import PG from "../models/PG.js";
import NoticeDismissal from "../models/NoticeDismissal.js";
import Tenant from "../models/Tenant.js";

// --------------------------------------------------
// GET MY NOTICES
// --------------------------------------------------

export const getMyNotices = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const {
      pgId,
      noticeType,
      priority,
      audience,
      status,
    } = req.query;

    const filter = {
      ownerId,
    };

    // ----------------------------------------------
    // PG FILTER
    // ----------------------------------------------

    if (pgId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          pgId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this PG",
        });
      }

      filter.pgId = pgId;
    }

    // ----------------------------------------------
    // NOTICE TYPE
    // ----------------------------------------------

    if (
      noticeType &&
      noticeType !== "all"
    ) {
      filter.noticeType =
        noticeType;
    }

    // ----------------------------------------------
    // PRIORITY
    // ----------------------------------------------

    if (
      priority &&
      priority !== "all"
    ) {
      filter.priority =
        priority;
    }

    // ----------------------------------------------
    // AUDIENCE
    // ----------------------------------------------

    if (
      audience &&
      audience !== "all"
    ) {
      filter.audience =
        audience;
    }

    // ----------------------------------------------
    // STATUS
    // ----------------------------------------------

    const now = new Date();

    if (status === "active") {
      filter.isPublished = true;

      filter.$or = [
        {
          expiryDate: null,
        },
        {
          expiryDate: {
            $gte: now,
          },
        },
      ];
    }

    if (status === "expired") {
      filter.expiryDate = {
        $lt: now,
      };
    }

    if (status === "draft") {
      filter.isPublished = false;
    }

    const notices =
      await Notice.find(filter)
        .populate(
          "pgId",
          "name city"
        )
        .sort({
          publishDate: -1,
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    console.error(
      "Get notices error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notices",
    });
  }
};


// --------------------------------------------------
// GET NOTICE SUMMARY
// --------------------------------------------------

export const getNoticeSummary =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const { pgId } = req.query;

      const filter = {
        ownerId,
      };

      if (pgId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            pgId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid PG ID",
          });
        }

        const pg = await PG.findOne({
          _id: pgId,
          ownerId,
        });

        if (!pg) {
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to this PG",
          });
        }

        filter.pgId = pgId;
      }

      const notices =
        await Notice.find(filter);

      const now = new Date();

      const total =
        notices.length;

      const published =
        notices.filter(
          (notice) =>
            notice.isPublished
        ).length;

      const active =
        notices.filter(
          (notice) =>
            notice.isPublished &&
            (
              !notice.expiryDate ||
              new Date(
                notice.expiryDate
              ) >= now
            )
        ).length;

      const expired =
        notices.filter(
          (notice) =>
            notice.expiryDate &&
            new Date(
              notice.expiryDate
            ) < now
        ).length;

      const urgent =
        notices.filter(
          (notice) =>
            notice.priority ===
              "urgent" &&
            notice.isPublished
        ).length;

      const high =
        notices.filter(
          (notice) =>
            notice.priority ===
              "high" &&
            notice.isPublished
        ).length;

      return res.status(200).json({
        success: true,
        summary: {
          total,
          published,
          active,
          expired,
          urgent,
          high,
        },
      });
    } catch (error) {
      console.error(
        "Notice summary error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch notice summary",
      });
    }
  };


// --------------------------------------------------
// CREATE NOTICE
// --------------------------------------------------

export const createNotice =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const {
        pgId,
        title,
        description,
        noticeType,
        priority,
        audience,
        publishDate,
        expiryDate,
        isPublished,
      } = req.body;

      if (
        !pgId ||
        !title ||
        !description ||
        !publishDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "PG, title, description and publish date are required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          pgId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this PG",
        });
      }

      let parsedExpiryDate =
        null;

      if (expiryDate) {
        parsedExpiryDate =
          new Date(expiryDate);

        if (
          Number.isNaN(
            parsedExpiryDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid expiry date",
          });
        }

        const parsedPublishDate =
          new Date(
            publishDate
          );

        if (
          parsedExpiryDate <
          parsedPublishDate
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Expiry date cannot be before publish date",
          });
        }
      }

      const notice =
        await Notice.create({
          ownerId,
          pgId,
          title: title.trim(),
          description:
            description.trim(),
          noticeType:
            noticeType ||
            "general",
          priority:
            priority || "medium",
          audience:
            audience || "all",
          publishDate,
          expiryDate:
            parsedExpiryDate,
          isPublished:
            isPublished !==
            undefined
              ? Boolean(
                  isPublished
                )
              : true,
        });

      const populatedNotice =
        await Notice.findById(
          notice._id
        ).populate(
          "pgId",
          "name city"
        );

      return res.status(201).json({
        success: true,
        message:
          "Notice created successfully",
        notice:
          populatedNotice,
      });
    } catch (error) {
      console.error(
        "Create notice error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create notice",
      });
    }
  };


// --------------------------------------------------
// UPDATE NOTICE
// --------------------------------------------------

export const updateNotice =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const { noticeId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          noticeId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notice ID",
        });
      }

      const notice =
        await Notice.findOne({
          _id: noticeId,
          ownerId,
        });

      if (!notice) {
        return res.status(404).json({
          success: false,
          message:
            "Notice not found",
        });
      }

      const {
        title,
        description,
        noticeType,
        priority,
        audience,
        publishDate,
        expiryDate,
        isPublished,
      } = req.body;

      if (title !== undefined) {
        notice.title =
          title.trim();
      }

      if (
        description !==
        undefined
      ) {
        notice.description =
          description.trim();
      }

      if (
        noticeType !==
        undefined
      ) {
        notice.noticeType =
          noticeType;
      }

      if (
        priority !== undefined
      ) {
        notice.priority =
          priority;
      }

      if (
        audience !== undefined
      ) {
        notice.audience =
          audience;
      }

      if (
        publishDate !==
        undefined
      ) {
        notice.publishDate =
          publishDate;
      }

      if (
        expiryDate !==
        undefined
      ) {
        if (!expiryDate) {
          notice.expiryDate =
            null;
        } else {
          const newExpiryDate =
            new Date(
              expiryDate
            );

          if (
            Number.isNaN(
              newExpiryDate.getTime()
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid expiry date",
            });
          }

          const currentPublishDate =
            new Date(
              publishDate ||
                notice.publishDate
            );

          if (
            newExpiryDate <
            currentPublishDate
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Expiry date cannot be before publish date",
            });
          }

          notice.expiryDate =
            newExpiryDate;
        }
      }

      if (
        isPublished !==
        undefined
      ) {
        notice.isPublished =
          Boolean(
            isPublished
          );
      }

      await notice.save();

      const updatedNotice =
        await Notice.findById(
          notice._id
        ).populate(
          "pgId",
          "name city"
        );

      return res.status(200).json({
        success: true,
        message:
          "Notice updated successfully",
        notice:
          updatedNotice,
      });
    } catch (error) {
      console.error(
        "Update notice error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notice",
      });
    }
  };


// --------------------------------------------------
// DELETE NOTICE
// --------------------------------------------------

export const deleteNotice =
  async (req, res) => {
    try {
      const ownerId =
        req.user.userId;

      const { noticeId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          noticeId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notice ID",
        });
      }

      const notice =
        await Notice.findOneAndDelete({
          _id: noticeId,
          ownerId,
        });

      if (!notice) {
        return res.status(404).json({
          success: false,
          message:
            "Notice not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notice deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete notice error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete notice",
      });
    }
  };

// TENANT: DISMISS ONE NOTICE
export const dismissMyNotice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { noticeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await Notice.findById(noticeId);

    if (!notice || !notice.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    await NoticeDismissal.updateOne(
      { noticeId, userId },
      { $setOnInsert: { noticeId, userId } },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Notice dismissed successfully",
    });
  } catch (error) {
    console.error("Dismiss notice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dismiss notice",
    });
  }
};

// GET NOTICES FOR THE LOGGED-IN TENANT,
// EXCLUDING NOTICES THEY HAVE DISMISSED
export const getTenantNotices = async (req, res) => {
  try {
    const userId = req.user.userId;

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Active tenant record not found.",
      });
    }

    const dismissed = await NoticeDismissal.find({
      userId,
    }).select("noticeId");

    const dismissedIds = dismissed.map(
      (item) => item.noticeId
    );

    const now = new Date();

    const notices = await Notice.find({
      ownerId: tenant.ownerId,
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
          _id: { $nin: dismissedIds },
        },
        {
          $or: [
            { audience: "all" },
            { audience: "tenant" },
          ],
        },
      ],
    })
      .populate("pgId", "name city")
      .sort({ publishDate: -1, createdAt: -1 });

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
