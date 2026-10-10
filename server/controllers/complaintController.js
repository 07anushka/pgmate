import mongoose from "mongoose";

import Complaint from "../models/Complaint.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";


// --------------------------------------------------
// GET MY COMPLAINTS
// --------------------------------------------------

export const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.userId;

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenant record found for this account.",
      });
    }

    const complaints = await Complaint.find({
      tenantId: tenant._id,
      userId,
    })
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


// --------------------------------------------------
// GET COMPLAINT SUMMARY
// --------------------------------------------------

export const getComplaintSummary = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { pgId } = req.query;

    const filter = {
      ownerId,
    };

    // ----------------------------------------------
    // PG FILTER
    // ----------------------------------------------

    if (pgId) {
      if (!mongoose.Types.ObjectId.isValid(pgId)) {
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

    const complaints = await Complaint.find(
      filter
    );

    const total = complaints.length;

    const open = complaints.filter(
      (item) => item.status === "open"
    ).length;

    const inProgress = complaints.filter(
      (item) =>
        item.status === "in_progress"
    ).length;

    const resolved = complaints.filter(
      (item) =>
        item.status === "resolved"
    ).length;

    const closed = complaints.filter(
      (item) =>
        item.status === "closed"
    ).length;

    const urgent = complaints.filter(
      (item) =>
        item.priority === "urgent" &&
        item.status !== "closed" &&
        item.status !== "resolved"
    ).length;

    const high = complaints.filter(
      (item) =>
        item.priority === "high" &&
        item.status !== "closed" &&
        item.status !== "resolved"
    ).length;

    return res.status(200).json({
      success: true,
      summary: {
        total,
        open,
        inProgress,
        resolved,
        closed,
        urgent,
        high,
      },
    });
  } catch (error) {
    console.error(
      "Complaint summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch complaint summary",
    });
  }
};


// --------------------------------------------------
// GET ACTIVE TENANTS
// --------------------------------------------------

export const getComplaintTenants = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { pgId } = req.query;

    const filter = {
      ownerId,
      status: "active",
    };

    // ----------------------------------------------
    // PG FILTER
    // ----------------------------------------------

    if (pgId) {
      if (!mongoose.Types.ObjectId.isValid(pgId)) {
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

    const tenants = await Tenant.find(filter)
      .populate(
        "userId",
        "name mobile"
      )
      .populate(
        "pgId",
        "name city"
      )
      .populate(
        "roomId",
        "roomNumber roomType"
      )
      .populate(
        "bedId",
        "bedNumber"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error(
      "Get complaint tenants error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch active tenants",
    });
  }
};


// --------------------------------------------------
// CREATE COMPLAINT
// --------------------------------------------------

export const createComplaint = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      title,
      category,
      description,
      priority,
    } = req.body;

    if (
      !title?.trim() ||
      !description?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required.",
      });
    }

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenant record found for this account.",
      });
    }

    const complaint = await Complaint.create({
      ownerId: tenant.ownerId,
      pgId: tenant.pgId,
      tenantId: tenant._id,
      userId,
      title: title.trim(),
      category: category || "other",
      description: description.trim(),
      priority: priority || "medium",
      status: "open",
    });

    const populatedComplaint = await Complaint.findById(
      complaint._id
    )
      .populate("pgId", "name city")
      .populate("tenantId", "roomId bedId");

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


// --------------------------------------------------
// UPDATE COMPLAINT
// --------------------------------------------------

export const updateComplaint = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { complaintId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        complaintId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid complaint ID",
      });
    }

    const complaint =
      await Complaint.findOne({
        _id: complaintId,
        ownerId,
      });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          "Complaint not found",
      });
    }

    const {
      title,
      category,
      description,
      priority,
      status,
      notes,
    } = req.body;

    // ----------------------------------------------
    // UPDATE FIELDS
    // ----------------------------------------------

    if (title !== undefined) {
      complaint.title =
        title.trim();
    }

    if (category !== undefined) {
      complaint.category =
        category;
    }

    if (
      description !== undefined
    ) {
      complaint.description =
        description.trim();
    }

    if (priority !== undefined) {
      complaint.priority =
        priority;
    }

    if (status !== undefined) {
      complaint.status =
        status;

      if (
        status === "resolved" ||
        status === "closed"
      ) {
        complaint.resolvedAt =
          new Date();
      } else {
        complaint.resolvedAt =
          null;
      }
    }

    if (notes !== undefined) {
      complaint.notes =
        notes;
    }

    await complaint.save();

    const updatedComplaint =
      await Complaint.findById(
        complaint._id
      )
        .populate({
          path: "tenantId",
          populate: {
            path: "userId",
            select: "name mobile",
          },
        })
        .populate(
          "userId",
          "name mobile"
        )
        .populate(
          "pgId",
          "name city"
        );

    return res.status(200).json({
      success: true,
      message:
        "Complaint updated successfully",
      complaint:
        updatedComplaint,
    });
  } catch (error) {
    console.error(
      "Update complaint error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update complaint",
    });
  }
};


// --------------------------------------------------
// DELETE COMPLAINT
// --------------------------------------------------

export const deleteComplaint = async (
  req,
  res
) => {
  try {
    const ownerId = req.user.userId;

    const { complaintId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        complaintId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid complaint ID",
      });
    }

    const complaint =
      await Complaint.findOneAndDelete({
        _id: complaintId,
        ownerId,
      });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          "Complaint not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Complaint deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete complaint error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete complaint",
    });
  }
};

// TENANT: UPDATE OWN COMPLAINT
export const updateMyComplaint = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { complaintId } = req.params;
    const { title, category, priority, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      userId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
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

    const categories = [
      "maintenance", "electricity", "water", "cleaning",
      "food", "internet", "room", "noise", "security", "other",
    ];

    const priorities = ["low", "medium", "high", "urgent"];

    if (category && !categories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    if (priority && !priorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority",
      });
    }

    complaint.title = title.trim();
    complaint.description = description.trim();
    complaint.category = category || complaint.category;
    complaint.priority = priority || complaint.priority;

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


// TENANT: DELETE OWN COMPLAINT
export const deleteMyComplaint = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { complaintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
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