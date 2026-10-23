import Tenant from "../models/Tenant.js";
import Payment from "../models/Payment.js";
import FoodMenu from "../models/FoodMenu.js";
import Notice from "../models/Notice.js";
import Complaint from "../models/Complaint.js";
import NoticeDismissal from "../models/NoticeDismissal.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

/* =========================================================
   HELPER
   GET ACTIVE TENANT
========================================================= */

const getTenantForUser = async (
    userId
) => {
    return await Tenant.findOne({
        userId,
        status: "active",
    })
        .populate(
            "userId",
            "name mobile role"
        )
        .populate(
            "ownerId",
            "name mobile"
        )
        .populate("pgId")
        .populate("roomId")
        .populate("bedId");
};


/* =========================================================
   PROFILE
========================================================= */

export const getMyTenantProfile =
    async (req, res) => {
        try {
            const tenant =
                await getTenantForUser(
                    req.user.userId
                );

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active tenant profile not found",
                });
            }

            return res.status(200).json({
                success: true,
                tenant,
            });
        } catch (error) {
            console.error(
                "Get tenant profile error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch tenant profile",
            });
        }
    };


/* =========================================================
   UPDATE TENANT PROFILE
   Tenant can update name and emergency contact only.
   Mobile number cannot be changed here.
========================================================= */

export const updateMyTenantProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const allowedFields = [
      "name",
      "emergencyContactName",
      "emergencyContactNumber",
    ];

    const suppliedFields = Object.keys(req.body || {});

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only name and emergency contact details can be updated.",
      });
    }

    const tenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Active tenant profile not found.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "tenant",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tenant account not found.",
      });
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();

      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 1 and 100 characters.",
        });
      }

      user.name = name;
      await user.save();
    }

    if (req.body.emergencyContactName !== undefined) {
      const name = String(req.body.emergencyContactName).trim();

      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Emergency contact name is too long.",
        });
      }

      tenant.emergencyContactName = name;
    }

    if (req.body.emergencyContactNumber !== undefined) {
      const number = String(
        req.body.emergencyContactNumber
      ).trim();

      if (number && !/^[0-9+\-\s()]{7,20}$/.test(number)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid emergency contact number.",
        });
      }

      tenant.emergencyContactNumber = number;
    }

    await tenant.save();

    const updatedTenant = await Tenant.findById(tenant._id)
      .populate("userId", "name mobile role")
      .populate("pgId")
      .populate("roomId")
      .populate("bedId");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Update tenant profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};


/* =========================================================
   CHANGE TENANT PASSWORD
   Requires the current password.
========================================================= */

export const changeMyTenantPassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "New password must be between 8 and 128 characters.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "Your new password must be different.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "tenant",
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tenant account not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change tenant password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password.",
    });
  }
};


/* =========================================================
   PAYMENTS
========================================================= */

export const getMyTenantPayments =
    async (req, res) => {
        try {
            const tenant =
                await Tenant.findOne({
                    userId: req.user.userId,
                    status: "active",
                });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active tenant profile not found",
                });
            }

            const payments =
                await Payment.find({
                    tenantId: tenant._id,
                    userId: req.user.userId,
                })
                    .populate(
                        "pgId",
                        "name address city state"
                    )
                    .sort({
                        paymentDate: -1,
                    });

            return res.status(200).json({
                success: true,
                payments,
            });
        } catch (error) {
            console.error(
                "Get tenant payments error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch payments",
            });
        }
    };


/* =========================================================
   FOOD MENU
========================================================= */

export const getMyTenantFoodMenu =
    async (req, res) => {
        try {
            const tenant =
                await Tenant.findOne({
                    userId: req.user.userId,
                    status: "active",
                });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active tenant profile not found",
                });
            }

            const foodMenu = await FoodMenu.find({
                ownerId: tenant.ownerId,
                pgId: tenant.pgId,
            }).sort({
                day: 1,
                mealType: 1,
                timingFrom: 1,
                name: 1,
            });

            return res.status(200).json({
                success: true,
                foodMenu,
            });
        } catch (error) {
            console.error(
                "Get tenant food menu error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch food menu",
            });
        }
    };


/* =========================================================
   NOTICES
========================================================= */


export const getMyTenantNotices = async (req, res) => {
    try {
      const userId = req.user.userId;
  
      const tenant = await Tenant.findOne({
        userId,
        status: "active",
      });
  
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Active tenant profile not found",
        });
      }
  
      // Find notices this tenant has dismissed.
      const dismissed = await NoticeDismissal.find({
        userId,
      }).select("noticeId");
  
      const dismissedIds = dismissed.map(
        (item) => item.noticeId
      );
  
      const today = new Date();
  
      // Return only active notices not dismissed by this tenant.
      const notices = await Notice.find({
        ownerId: tenant.ownerId,
        pgId: tenant.pgId,
        isPublished: true,
        publishDate: { $lte: today },
        _id: { $nin: dismissedIds },
        $and: [
          {
            $or: [
              { expiryDate: null },
              { expiryDate: { $gte: today } },
            ],
          },
          {
            $or: [
              { audience: "all" },
              { audience: "tenants" },
            ],
          },
        ],
      }).sort({
        publishDate: -1,
        createdAt: -1,
      });
  
      return res.status(200).json({
        success: true,
        notices,
      });
    } catch (error) {
      console.error("Get tenant notices error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notices",
      });
    }
  };
  


/* =========================================================
   COMPLAINTS
========================================================= */

export const getMyTenantComplaints =
    async (req, res) => {
        try {
            const tenant =
                await Tenant.findOne({
                    userId: req.user.userId,
                    status: "active",
                });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active tenant profile not found",
                });
            }

            const complaints =
                await Complaint.find({
                    tenantId: tenant._id,
                    userId: req.user.userId,
                }).sort({
                    createdAt: -1,
                });

            return res.status(200).json({
                success: true,
                complaints,
            });
        } catch (error) {
            console.error(
                "Get tenant complaints error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch complaints",
            });
        }
    };


/* =========================================================
   CREATE COMPLAINT
========================================================= */

export const createTenantComplaint =
    async (req, res) => {
        try {
            const {
                title,
                description,
                category,
                priority,
            } = req.body;

            if (
                !title?.trim() ||
                !description?.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Title and description are required",
                });
            }

            const tenant =
                await Tenant.findOne({
                    userId: req.user.userId,
                    status: "active",
                });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active tenant profile not found",
                });
            }

            const complaint =
                await Complaint.create({
                    ownerId:
                        tenant.ownerId,

                    pgId:
                        tenant.pgId,

                    tenantId:
                        tenant._id,

                    userId:
                        req.user.userId,

                    title:
                        title.trim(),

                    description:
                        description.trim(),

                    category:
                        category || "other",

                    priority:
                        priority || "medium",

                    status: "open",
                });

            return res.status(201).json({
                success: true,
                message:
                    "Complaint submitted successfully",
                complaint,
            });
        } catch (error) {
            console.error(
                "Create tenant complaint error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to submit complaint",
            });
        }
    };