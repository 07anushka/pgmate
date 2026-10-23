
import express from "express";
import { loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Existing login route — unchanged
router.post("/login", loginUser);

// Check subscription status without blocking expired users
router.get("/subscription-status", protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const role = req.user.role;

    // Super Admin must always retain access
    if (role === "super_admin") {
      return res.status(200).json({
        success: true,
        subscriptionActive: true,
        message: "Super Admin access is active.",
      });
    }

    let owner;

    if (role === "owner") {
      owner = await User.findOne({
        _id: userId,
        role: "owner",
      }).select("subscriptionStartDate subscriptionEndDate");
    } else if (role === "tenant") {
      const tenant = await Tenant.findOne({
        userId,
      }).select("ownerId");

      if (!tenant) {
        return res.status(404).json({
          success: false,
          code: "TENANT_PROFILE_NOT_FOUND",
          message: "Tenant profile not found.",
        });
      }

      owner = await User.findOne({
        _id: tenant.ownerId,
        role: "owner",
      }).select("subscriptionStartDate subscriptionEndDate");
    } else {
      return res.status(403).json({
        success: false,
        message: "This account cannot access the subscription status endpoint.",
      });
    }

    if (!owner || !owner.subscriptionStartDate || !owner.subscriptionEndDate) {
      return res.status(200).json({
        success: true,
        subscriptionActive: false,
        code: "SUBSCRIPTION_EXPIRED",
        message: "Subscription is inactive or has not been configured.",
      });
    }

    const now = new Date();
    const startDate = new Date(owner.subscriptionStartDate);
    const endDate = new Date(owner.subscriptionEndDate);

    const validDates =
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime());

    const subscriptionActive =
      validDates && startDate <= now && endDate > now;

    return res.status(200).json({
      success: true,
      subscriptionActive,
      code: subscriptionActive ? "SUBSCRIPTION_ACTIVE" : "SUBSCRIPTION_EXPIRED",
      subscriptionEndDate: owner.subscriptionEndDate,
      message: subscriptionActive
        ? "Subscription is active."
        : "Subscription has expired or is not yet active.",
    });
  } catch (error) {
    console.error("Subscription status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check subscription status.",
    });
  }
});


router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, mobile } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!/^\d{10}$/.test(String(mobile || ""))) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must contain exactly 10 digits.",
      });
    }

    const duplicate = await User.findOne({
      mobile,
      _id: { $ne: req.user._id },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered.",
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          name: name.trim(),
          mobile,
        },
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updated._id,
        name: updated.name,
        mobile: updated.mobile,
        role: updated.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered.",
      });
    }

    console.error("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
});

router.post("/verify-current-password", protect, async (req, res) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Enter your current password.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    return res.json({
      success: true,
      message: "Current password verified.",
    });
  } catch (error) {
    console.error("Password verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify password.",
    });
  }
});

router.post("/change-password", protect, async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Choose a password different from your current password.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect. Verify it again.",
      });
    }

    // Hash explicitly and update without invoking password save hooks twice.
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
});


export default router;
