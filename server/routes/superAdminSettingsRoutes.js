
import express from "express";
import User from "../models/User.js";
import SuperAdminSettings from "../models/SuperAdminSettings.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect, authorizeRoles("super_admin"));

// Get saved settings
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email role"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    let settings = await SuperAdminSettings.findOne({
      userId: user._id,
    });

    if (!settings) {
      settings = await SuperAdminSettings.create({
        userId: user._id,
      });
    }

    return res.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email || "",
      },
      notifications: settings.notifications,
      platform: settings.platform,
    });
  } catch (error) {
    console.error("Get super admin settings:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load administrator settings.",
    });
  }
});

// Save profile, notification preferences and platform preferences
router.patch("/", async (req, res) => {
  try {
    const {
      name,
      email,
      notifications,
      platform,
    } = req.body || {};

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    // Update profile only when profile fields were supplied.
    if (name !== undefined || email !== undefined) {
      const cleanName =
        typeof name === "string" ? name.trim() : user.name;

      const cleanEmail =
        typeof email === "string"
          ? email.trim().toLowerCase()
          : user.email || "";

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Display name is required.",
        });
      }

      if (
        !cleanEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid email address.",
        });
      }

      const duplicate = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered.",
        });
      }

      user.name = cleanName;
      user.email = cleanEmail;
      await user.save();
    }

    const update = {};

    if (notifications !== undefined) {
      if (
        !notifications ||
        typeof notifications !== "object" ||
        Array.isArray(notifications) ||
        ["expiry", "newOwner", "platform"].some(
          (key) => typeof notifications[key] !== "boolean"
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification preferences.",
        });
      }

      update.notifications = {
        expiry: notifications.expiry,
        newOwner: notifications.newOwner,
        platform: notifications.platform,
      };
    }

    if (platform !== undefined) {
      const validPlans = [
        "monthly",
        "quarterly",
        "half-yearly",
        "yearly",
      ];

      if (
        !platform ||
        typeof platform !== "object" ||
        Array.isArray(platform) ||
        (platform.defaultSubscriptionPlan !== undefined &&
          !validPlans.includes(platform.defaultSubscriptionPlan)) ||
        (platform.maintenanceMode !== undefined &&
          typeof platform.maintenanceMode !== "boolean")
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid platform preferences.",
        });
      }

      if (platform.defaultSubscriptionPlan !== undefined) {
        update["platform.defaultSubscriptionPlan"] =
          platform.defaultSubscriptionPlan;
      }

      if (platform.maintenanceMode !== undefined) {
        update["platform.maintenanceMode"] =
          platform.maintenanceMode;
      }
    }

    const settings = await SuperAdminSettings.findOneAndUpdate(
      { userId: user._id },
      {
        $set: update,
        $setOnInsert: { userId: user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      message: "Administrator settings saved successfully.",
      profile: {
        name: user.name,
        email: user.email || "",
      },
      notifications: settings.notifications,
      platform: settings.platform,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email or settings record already exists.",
      });
    }

    console.error("Save super admin settings:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save administrator settings.",
    });
  }
});

export default router;
