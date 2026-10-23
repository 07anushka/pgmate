import mongoose from "mongoose";

import Complaint from "../models/Complaint.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";

const CATEGORIES = [
  "maintenance",
  "electricity",
  "water",
  "cleaning",
  "food",
  "internet",
  "room",
  "noise",
  "security",
  "other",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const STATUSES = ["open", "in_progress", "resolved", "closed"];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) => req.user?.userId;

const getSelectedPG = async (pgId, ownerId) => {
  if (!pgId || !isValidId(pgId)) {
    return {
      error: "A valid PG ID is required.",
      status: 400,
    };
  }

  const pg = await PG.findOne({
    _id: pgId,
    ownerId,
  }).select("_id ownerId name");

  if (!pg) {
    return {
      error: "You do not have access to this PG.",
      status: 403,
    };
  }

  return { pg };
};

const validateFilters = (res, { status, category, priority }) => {
  if (status && status !== "all" && !STATUSES.includes(status)) {
    res.status(400).json({
      success: false,
      message: "Invalid complaint status.",
    });
    return false;
  }

  if (
    category &&
    category !== "all" &&
    !CATEGORIES.includes(category)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid complaint category.",
    });
    return false;
  }

  if (
    priority &&
    priority !== "all" &&
    !PRIORITIES.includes(priority)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid complaint priority.",
    });
    return false;
  }

  return true;
};

const ownerComplaintPopulate = (query) =>
  query
    .populate({
      path: "tenantId",
      populate: [
        {
          path: "userId",
          select: "name mobile",
        },
        {
          path: "roomId",
          select: "roomNumber roomType",
        },
        {
          path: "bedId",
          select: "bedNumber",
        },
      ],
    })
    .populate("userId", "name mobile")
    .populate("pgId", "name city");


// =====================================================
// TENANT: GET MY COMPLAINTS
// =====================================================

export const getMyComplaints = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pgId, status, category, priority } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!validateFilters(res, { status, category, priority })) {
      return;
    }

    const tenantFilter = {
      userId,
      status: "active",
    };

    if (pgId) {
      if (!isValidId(pgId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID.",
        });
      }

      tenantFilter.pgId = pgId;
    }

    const tenant = await Tenant.findOne(tenantFilter);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenant record found for this account and PG.",
      });
    }

    const filter = {
      tenantId: tenant._id,
      userId,
      pgId: tenant.pgId,
    };

    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (priority && priority !== "all") filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate("pgId", "name city")
      .populate("tenantId", "roomId bedId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your complaints.",
    });
  }
};


// =====================================================
// OWNER: GET COMPLAINTS
// =====================================================

export const getOwnerComplaints = async (req, res) => {
  try {
    const ownerId = getUserId(req);
    const { pgId, status, category, priority } = req.query;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!validateFilters(res, { status, category, priority })) {
      return;
    }

    const filter = { ownerId };

    // When pgId is provided, verify ownership before querying.
    if (pgId) {
      const result = await getSelectedPG(pgId, ownerId);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      filter.pgId = result.pg._id;
    }

    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (priority && priority !== "all") filter.priority = priority;

    const complaints = await ownerComplaintPopulate(
      Complaint.find(filter)
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Get owner complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner complaints.",
    });
  }
};


// =====================================================
// OWNER: COMPLAINT SUMMARY
// =====================================================
export const getComplaintSummary = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { pgId } = req.query;

    const filter = { ownerId };

    if (pgId) {
      const result = await getSelectedPG(pgId, ownerId);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      filter.pgId = result.pg._id;
    }

    const complaints = await Complaint.find(filter)
      .select("status priority")
      .lean();

    const summary = {
      total: complaints.length,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
    };

    for (const complaint of complaints) {
      if (complaint.status === "open") summary.open++;
      if (complaint.status === "in_progress") summary.inProgress++;
      if (complaint.status === "resolved") summary.resolved++;
      if (complaint.status === "closed") summary.closed++;

      const isActive = !["resolved", "closed"].includes(complaint.status);

      if (isActive && complaint.priority === "urgent") summary.urgent++;
      if (isActive && complaint.priority === "high") summary.high++;
    }

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Complaint summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint summary.",
    });
  }
};


// =====================================================
// OWNER: GET ACTIVE TENANTS
// =====================================================

export const getComplaintTenants = async (req, res) => {
  try {
    const ownerId = getUserId(req);
    const { pgId } = req.query;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!pgId) {
      return res.status(400).json({
        success: false,
        message: "Select a PG to load tenants.",
      });
    }

    const result = await getSelectedPG(pgId, ownerId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const tenants = await Tenant.find({
      ownerId,
      pgId: result.pg._id,
      status: "active",
    })
      .populate("userId", "name mobile")
      .populate("pgId", "name city")
      .populate("roomId", "roomNumber roomType")
      .populate("bedId", "bedNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error("Get complaint tenants error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch active tenants.",
    });
  }
};


// =====================================================
// CREATE COMPLAINT
// Owner may create for a selected tenant.
// Tenant may create for their own active tenancy.
// =====================================================

export const createComplaint = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      tenantId,
      pgId,
      title,
      category = "other",
      description,
      priority = "medium",
      notes = "",
    } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required.",
      });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint category.",
      });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint priority.",
      });
    }

    let tenant;
    let ownerId;

    if (tenantId) {
      // Owner-created complaint: the requested tenant must belong
      // to the logged-in owner and the selected PG.
      if (!isValidId(tenantId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tenant ID.",
        });
      }

      if (!pgId) {
        return res.status(400).json({
          success: false,
          message: "PG ID is required.",
        });
      }

      const result = await getSelectedPG(pgId, userId);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      tenant = await Tenant.findOne({
        _id: tenantId,
        ownerId: userId,
        pgId: result.pg._id,
        status: "active",
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Active tenant not found in the selected PG.",
        });
      }

      ownerId = userId;
    } else {
      // Tenant-created complaint: only the tenant's own active
      // tenancy is accepted; ownerId and pgId come from the DB.
      const tenantFilter = {
        userId,
        status: "active",
      };

      if (pgId) {
        if (!isValidId(pgId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid PG ID.",
          });
        }

        tenantFilter.pgId = pgId;
      }

      tenant = await Tenant.findOne(tenantFilter);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "No active tenant record found for this account.",
        });
      }

      ownerId = tenant.ownerId;
    }

    const complaint = await Complaint.create({
      ownerId,
      pgId: tenant.pgId,
      tenantId: tenant._id,
      userId: tenant.userId,
      title: title.trim(),
      category,
      description: description.trim(),
      priority,
      status: "open",
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    const populatedComplaint = await ownerComplaintPopulate(
      Complaint.findById(complaint._id)
    );

    return res.status(201).json({
      success: true,
      message: "Complaint submitted successfully.",
      complaint: populatedComplaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create complaint.",
    });
  }
};


// =====================================================
// OWNER: UPDATE COMPLAINT
// =====================================================

export const updateComplaint = async (req, res) => {
  try {
    const ownerId = getUserId(req);
    const { complaintId } = req.params;

    if (!isValidId(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      ownerId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const { title, category, description, priority, status, notes } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty.",
        });
      }

      complaint.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty.",
        });
      }

      complaint.description = description.trim();
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint category.",
        });
      }

      complaint.category = category;
    }

    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint priority.",
        });
      }

      complaint.priority = priority;
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint status.",
        });
      }

      complaint.status = status;
      complaint.resolvedAt =
        status === "resolved" || status === "closed"
          ? complaint.resolvedAt || new Date()
          : null;
    }

    if (notes !== undefined) {
      if (typeof notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Notes must be text.",
        });
      }

      complaint.notes = notes.trim();
    }

    await complaint.save();

    const updatedComplaint = await ownerComplaintPopulate(
      Complaint.findById(complaint._id)
    );

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully.",
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint.",
    });
  }
};


// =====================================================
// OWNER: DELETE COMPLAINT
// =====================================================

export const deleteComplaint = async (req, res) => {
  try {
    const ownerId = getUserId(req);
    const { complaintId } = req.params;

    if (!isValidId(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    const complaint = await Complaint.findOneAndDelete({
      _id: complaintId,
      ownerId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully.",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete complaint.",
    });
  }
};


// =====================================================
// TENANT: UPDATE OWN OPEN COMPLAINT
// =====================================================

export const updateMyComplaint = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { complaintId } = req.params;
    const { title, category, priority, description } = req.body;

    if (!isValidId(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      userId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (complaint.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Only open complaints can be edited.",
      });
    }

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required.",
      });
    }

    if (category !== undefined && !CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint category.",
      });
    }

    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint priority.",
      });
    }

    complaint.title = title.trim();
    complaint.description = description.trim();

    if (category !== undefined) complaint.category = category;
    if (priority !== undefined) complaint.priority = priority;

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully.",
      complaint,
    });
  } catch (error) {
    console.error("Update tenant complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint.",
    });
  }
};


// =====================================================
// TENANT: DELETE OWN OPEN COMPLAINT
// =====================================================

export const deleteMyComplaint = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { complaintId } = req.params;

    if (!isValidId(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      userId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (complaint.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Only open complaints can be deleted.",
      });
    }

    await Complaint.deleteOne({
      _id: complaint._id,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully.",
    });
  } catch (error) {
    console.error("Delete tenant complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete complaint.",
    });
  }
};