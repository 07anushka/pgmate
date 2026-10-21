
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";

// Verify login token and attach the current user.
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // Keep both IDs available for existing controllers.
    req.user = {
      ...user.toObject(),
      userId: user._id,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

// Block owners and their tenants when the owner's subscription has ended.
// Apply this middleware only to protected business routes, not login routes.
export const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Super Admin must always retain access.
    if (req.user.role === "super_admin") {
      return next();
    }

    let owner;

    if (req.user.role === "owner") {
      owner = await User.findOne({
        _id: req.user._id,
        role: "owner",
      }).select("subscriptionStartDate subscriptionEndDate");
    } else if (req.user.role === "tenant") {
      // Find the tenant profile belonging to this logged-in user.
      const tenant = await Tenant.findOne({
        userId: req.user._id,
      }).select("ownerId");

      if (!tenant) {
        return res.status(403).json({
          success: false,
          code: "TENANT_PROFILE_NOT_FOUND",
          message: "Your tenant profile could not be found.",
        });
      }

      owner = await User.findOne({
        _id: tenant.ownerId,
        role: "owner",
      }).select("subscriptionStartDate subscriptionEndDate");
    } else {
      // Do not accidentally block unrelated roles through this middleware.
      return next();
    }

    const now = new Date();
    const startDate = owner?.subscriptionStartDate
      ? new Date(owner.subscriptionStartDate)
      : null;
    const endDate = owner?.subscriptionEndDate
      ? new Date(owner.subscriptionEndDate)
      : null;

    const validDates =
      startDate &&
      endDate &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime());

    if (!owner || !validDates || startDate > now || endDate <= now) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        message: "Subscription ended. Please contact the PG owner or administrator.",
        subscriptionEnded: true,
      });
    }

    return next();
  } catch (error) {
    console.error("Subscription check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify subscription status.",
    });
  }
};
