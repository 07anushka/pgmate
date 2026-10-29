
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

import {
  sendOwnerWelcomeEmail,
} from "../utils/email.js";

import SubscriptionEmailLog from "../models/SubscriptionEmailLog.js";

const PLAN_DURATIONS = {
  monthly: 1,
  quarterly: 3,
  "half-yearly": 6,
  yearly: 12,
};

const VALID_PLANS = Object.keys(PLAN_DURATIONS);

const addMonths = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDay));
  return result;
};

const getSubscriptionStatus = (owner) => {
  const now = new Date();
  const startDate = owner.subscriptionStartDate
    ? new Date(owner.subscriptionStartDate)
    : null;
  const endDate = owner.subscriptionEndDate
    ? new Date(owner.subscriptionEndDate)
    : null;

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "expired";
  }

  if (startDate > now) return "pending";
  if (endDate <= now) return "expired";

  const daysRemaining = Math.ceil((endDate - now) / 86400000);
  return daysRemaining <= 5 ? "expiring-soon" : "active";
};

const ownerResponse = (owner) => ({
  _id: owner._id,
  id: owner._id,
  name: owner.name,
  mobile: owner.mobile,
  email: owner.email || "",
  isEmailVerified: Boolean(owner.isEmailVerified),
  role: owner.role,
  createdBy: owner.createdBy,
  createdAt: owner.createdAt,
  subscriptionPlan: owner.subscriptionPlan,
  subscriptionStartDate: owner.subscriptionStartDate,
  subscriptionEndDate: owner.subscriptionEndDate,
  subscriptionStatus: getSubscriptionStatus(owner),
  subscriptionReactivatedAt: owner.subscriptionReactivatedAt,
});

const parsePlanDates = (planName, startDateValue) => {
  if (!VALID_PLANS.includes(planName)) {
    throw new Error("Please select a valid subscription plan.");
  }

  const startDate = startDateValue
    ? new Date(`${startDateValue}T00:00:00`)
    : new Date();

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Please provide a valid subscription start date.");
  }

  return {
    startDate,
    endDate: addMonths(startDate, PLAN_DURATIONS[planName]),
  };
};

// CREATE OWNER
export const createOwner = async (req, res) => {
  try {
    const { name, mobile, email, password, planName = "monthly", startDate } =
      req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name?.trim() || !mobile?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile number, email address and password are required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedMobile = mobile.trim();

    const existingUser = await User.findOne({ mobile: normalizedMobile });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered.",
      });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered.",
      });
    }

    let dates;

    try {
      dates = parsePlanDates(planName, startDate);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const owner = await User.create({
      name: name.trim(),
      mobile: normalizedMobile,
      email: normalizedEmail,
      isEmailVerified: false,
      password: hashedPassword,
      role: "owner",
      createdBy: req.user._id,
      subscriptionPlan: planName,
      subscriptionStartDate: dates.startDate,
      subscriptionEndDate: dates.endDate,
      subscriptionReactivatedAt: null,
    });

    // Owner is already saved. Email failure must not undo owner creation.
    let welcomeEmailSent = false;

    try {
      // Check whether a welcome email has already been logged.
      const existingWelcomeLog = await SubscriptionEmailLog.findOne({
        ownerId: owner._id,
        subscriptionEndDate: owner.subscriptionEndDate,
        emailType: "welcome",
        status: "sent",
      });

      if (!existingWelcomeLog) {
        await sendOwnerWelcomeEmail(owner);

        await SubscriptionEmailLog.create({
          ownerId: owner._id,
          subscriptionEndDate: owner.subscriptionEndDate,
          emailType: "welcome",
          status: "sent",
          sentAt: new Date(),
        });

        welcomeEmailSent = true;
      }
    } catch (emailError) {
      console.error("Owner welcome email error:", emailError);

      // Record failure for troubleshooting.
      try {
        await SubscriptionEmailLog.updateOne(
          {
            ownerId: owner._id,
            subscriptionEndDate: owner.subscriptionEndDate,
            emailType: "welcome",
          },
          {
            $set: {
              status: "failed",
              error: String(emailError.message || emailError).slice(0, 1000),
              sentAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (logError) {
        console.error("Welcome email log error:", logError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Owner created successfully.",
      welcomeEmailSent,
      owner: ownerResponse(owner),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: error.keyPattern?.email
          ? "This email address is already registered."
          : "This mobile number is already registered.",
      });
    }

    console.error("Create owner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create owner.",
    });
  }
};

// GET ALL OWNERS
export const getOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: "owner" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const formattedOwners = owners.map(ownerResponse);

    const summary = {
      totalOwners: formattedOwners.length,
      active: formattedOwners.filter(
        (owner) => owner.subscriptionStatus === "active"
      ).length,
      expiringSoon: formattedOwners.filter(
        (owner) => owner.subscriptionStatus === "expiring-soon"
      ).length,
      expired: formattedOwners.filter(
        (owner) => owner.subscriptionStatus === "expired"
      ).length,
      pending: formattedOwners.filter(
        (owner) => owner.subscriptionStatus === "pending"
      ).length,
    };

    return res.status(200).json({
      success: true,
      count: formattedOwners.length,
      summary,
      owners: formattedOwners,
    });
  } catch (error) {
    console.error("Get owners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owners.",
    });
  }
};

// REACTIVATE SUBSCRIPTION
export const reactivateOwnerSubscription = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { planName = "monthly", startDate } = req.body;

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner ID.",
      });
    }

    if (!VALID_PLANS.includes(planName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    const owner = await User.findOne({
      _id: ownerId,
      role: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found.",
      });
    }

    let resolvedStartDate;

    if (startDate) {
      resolvedStartDate = new Date(`${startDate}T00:00:00`);
    } else if (
      owner.subscriptionEndDate &&
      new Date(owner.subscriptionEndDate) > new Date()
    ) {
      resolvedStartDate = new Date(owner.subscriptionEndDate);
    } else {
      resolvedStartDate = new Date();
    }

    if (Number.isNaN(resolvedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription start date.",
      });
    }

    const dates = parsePlanDates(
      planName,
      resolvedStartDate.toISOString().slice(0, 10)
    );

    owner.subscriptionPlan = planName;
    owner.subscriptionStartDate = dates.startDate;
    owner.subscriptionEndDate = dates.endDate;
    owner.subscriptionReactivatedAt = new Date();

    await owner.save();

    return res.status(200).json({
      success: true,
      message: "Subscription reactivated successfully.",
      owner: ownerResponse(owner),
    });
  } catch (error) {
    console.error("Reactivate subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reactivate subscription.",
    });
  }
};

// UPDATE OWNER
export const updateOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { name, mobile, email, password, planName, startDate } = req.body;

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner ID.",
      });
    }

    const owner = await User.findOne({
      _id: ownerId,
      role: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found.",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }
      owner.name = name.trim();
    }

    if (mobile !== undefined) {
      if (typeof mobile !== "string" || !mobile.trim()) {
        return res.status(400).json({
          success: false,
          message: "Mobile number cannot be empty.",
        });
      }

      const normalizedMobile = mobile.trim();
      const duplicate = await User.findOne({
        mobile: normalizedMobile,
        _id: { $ne: owner._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This mobile number is already registered.",
        });
      }

      owner.mobile = normalizedMobile;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email || "").trim().toLowerCase();

      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      const duplicateEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: owner._id },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: "This email address is already registered.",
        });
      }

      if (owner.email !== normalizedEmail) {
        owner.email = normalizedEmail;
        owner.isEmailVerified = false;
      }
    }

    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must contain at least 8 characters.",
        });
      }

      owner.password = await bcrypt.hash(password, 12);
    }

    if (planName !== undefined || startDate !== undefined) {
      const resolvedPlan = planName || owner.subscriptionPlan || "monthly";
      const resolvedStartDate =
        startDate ||
        (owner.subscriptionStartDate
          ? new Date(owner.subscriptionStartDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10));

      let dates;

      try {
        dates = parsePlanDates(resolvedPlan, resolvedStartDate);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      owner.subscriptionPlan = resolvedPlan;
      owner.subscriptionStartDate = dates.startDate;
      owner.subscriptionEndDate = dates.endDate;
    }

    await owner.save();

    return res.status(200).json({
      success: true,
      message: "Owner updated successfully.",
      owner: ownerResponse(owner),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: error.keyPattern?.email
          ? "This email address is already registered."
          : "This mobile number is already registered.",
      });
    }

    console.error("Update owner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update owner.",
    });
  }
};

// DELETE OWNER
export const deleteOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner ID.",
      });
    }

    const owner = await User.findOne({
      _id: ownerId,
      role: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found.",
      });
    }

    // Safe default: do not delete an owner until related data is handled.
    // This avoids orphaning PGs, tenants, rooms, or payment records.
    const relatedModels = mongoose.modelNames().filter((modelName) =>
      ["PG", "Tenant", "Room", "Payment"].includes(modelName)
    );

    const relationships = [
      { names: ["PG"], fields: ["ownerId", "userId"] },
      { names: ["Tenant"], fields: ["ownerId"] },
      { names: ["Room"], fields: ["ownerId"] },
      { names: ["Payment"], fields: ["ownerId"] },
    ];

    const relatedRecords = [];

    for (const relationship of relationships) {
      for (const modelName of relationship.names) {
        if (!relatedModels.includes(modelName)) continue;

        const Model = mongoose.model(modelName);

        for (const field of relationship.fields) {
          if (!Model.schema.path(field)) continue;

          const count = await Model.countDocuments({
            [field]: owner._id,
          });

          if (count > 0) {
            relatedRecords.push({
              model: modelName,
              count,
            });
          }
        }
      }
    }

    if (relatedRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This owner has related records. Deletion is blocked to protect PG, tenant, room, and payment data. Handle the related records first.",
        relatedRecords,
      });
    }

    await User.deleteOne({ _id: owner._id, role: "owner" });

    return res.status(200).json({
      success: true,
      message: "Owner deleted successfully.",
      ownerId: owner._id,
    });
  } catch (error) {
    console.error("Delete owner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete owner.",
    });
  }
};
