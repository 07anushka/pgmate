
import express from "express";
import { loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";

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

export default router;
