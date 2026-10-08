import Tenant from "../models/Tenant.js";
import Payment from "../models/Payment.js";
import FoodMenu from "../models/FoodMenu.js";
import Notice from "../models/Notice.js";
import Complaint from "../models/Complaint.js";


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

export const getMyTenantNotices =
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

            const today = new Date();

            const notices =
                await Notice.find({
                    ownerId: tenant.ownerId,
                    pgId: tenant.pgId,
                    isPublished: true,
                    publishDate: {
                        $lte: today,
                    },
                    $or: [
                        {
                            expiryDate: null,
                        },
                        {
                            expiryDate: {
                                $gte: today,
                            },
                        },
                    ],
                }).sort({
                    publishDate: -1,
                });

            return res.status(200).json({
                success: true,
                notices,
            });
        } catch (error) {
            console.error(
                "Get tenant notices error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch notices",
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