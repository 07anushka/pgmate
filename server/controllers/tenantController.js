
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";
import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import RentRecord from "../models/RentRecord.js";

import {
  sendTenantWelcomeEmail,
  sendTenantVacatedEmail,
} from "../utils/email.js";

import TenantEmailLog from "../models/TenantEmailLog.js";

/* =====================================================
   RENT HELPERS
===================================================== */

const createRentRecordForMonth = async ({ tenant, month, year }) => {
  const rentDueDay = Math.min(
    28,
    Math.max(1, Number(tenant.rentDueDay || 5))
  );

  const dueDate = new Date(
    year,
    month - 1,
    rentDueDay,
    23,
    59,
    59,
    999
  );

  const today = new Date();

  const existingRecord = await RentRecord.findOne({
    tenantId: tenant._id,
    month,
    year,
  });

  if (existingRecord) {
    if (existingRecord.status !== "paid" && today > existingRecord.dueDate) {
      existingRecord.status = "overdue";
      await existingRecord.save();
    }

    return existingRecord;
  }

  return await RentRecord.create({
    ownerId: tenant.ownerId,
    pgId: tenant.pgId,
    tenantId: tenant._id,
    userId: tenant.userId,
    month,
    year,
    amount: Number(tenant.monthlyRent || 0),
    dueDate,
    status: today > dueDate ? "overdue" : "pending",
    paidDate: null,
    paymentMethod: null,
    daysLate: 0,
    paymentId: null,
    notes: "",
  });
};

const ensureCurrentRentRecords = async (tenants) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  for (const tenant of tenants) {
    if (tenant.status !== "active") continue;

    const joiningDate = new Date(tenant.joiningDate);
    const joiningMonth = joiningDate.getMonth() + 1;
    const joiningYear = joiningDate.getFullYear();

    if (
      currentYear < joiningYear ||
      (currentYear === joiningYear && currentMonth < joiningMonth)
    ) {
      continue;
    }

    await createRentRecordForMonth({
      tenant,
      month: currentMonth,
      year: currentYear,
    });
  }
};

const syncCurrentRentRecord = async (tenant) => {
  if (tenant.status !== "active") return null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const joiningDate = new Date(tenant.joiningDate);
  const joiningMonth = joiningDate.getMonth() + 1;
  const joiningYear = joiningDate.getFullYear();

  if (
    year < joiningYear ||
    (year === joiningYear && month < joiningMonth)
  ) {
    return null;
  }

  const rentDueDay = Math.min(
    28,
    Math.max(1, Number(tenant.rentDueDay || 5))
  );

  const dueDate = new Date(
    year,
    month - 1,
    rentDueDay,
    23,
    59,
    59,
    999
  );

  let record = await RentRecord.findOne({
    tenantId: tenant._id,
    month,
    year,
  });

  if (!record) {
    return await createRentRecordForMonth({
      tenant,
      month,
      year,
    });
  }

  if (record.status === "paid") return record;

  record.amount = Number(tenant.monthlyRent || 0);
  record.dueDate = dueDate;
  record.status = new Date() > dueDate ? "overdue" : "pending";

  await record.save();

  return record;
};

/* =====================================================
   DOCUMENT FIELD HELPERS
===================================================== */

const normalizeAadhaarNumber = (value) =>
  String(value || "").replace(/\s/g, "");

const normalizePanNumber = (value) =>
  String(value || "").replace(/\s/g, "").toUpperCase();

const normalizeAddress = (value) =>
  String(value || "").trim().slice(0, 300);

/* =====================================================
   GET MY TENANTS
   OWNER ONLY — FILTER BY SELECTED PG
===================================================== */

export const getMyTenants = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { pgId } = req.query;

    if (!pgId) {
      return res.status(400).json({
        success: false,
        message: "Please select a PG.",
      });
    }

    const pg = await PG.findOne({
      _id: pgId,
      ownerId,
    });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found or access denied.",
      });
    }

    const tenants = await Tenant.find({
      ownerId,
      pgId,
    })
      .populate("userId", "name mobile email role")
      .populate("pgId", "name address city state contactNumber")
      .populate("roomId", "roomNumber roomType monthlyRent floor")
      .populate("bedId", "bedNumber status")
      .sort({ createdAt: -1 });

    await ensureCurrentRentRecords(tenants);

    return res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error("Get tenants error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tenants.",
    });
  }
};

/* =====================================================
   GET AVAILABLE BEDS
   OWNER ONLY
===================================================== */

export const getAvailableBeds = async (req, res) => {
  try {
    const { pgId, roomId } = req.query;
    const ownerId = req.user.userId;

    if (!pgId) {
      return res.status(400).json({
        success: false,
        message: "PG ID is required.",
      });
    }

    const pg = await PG.findOne({
      _id: pgId,
      ownerId,
    });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found or access denied.",
      });
    }

    if (roomId) {
      const room = await Room.findOne({
        _id: roomId,
        pgId,
        isActive: true,
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Room not found in the selected PG.",
        });
      }
    }

    const bedQuery = {
      pgId,
      status: "available",
    };

    if (roomId) bedQuery.roomId = roomId;

    const beds = await Bed.find(bedQuery)
      .populate(
        "roomId",
        "roomNumber roomType monthlyRent rent floor isActive"
      )
      .sort({ bedNumber: 1 });

    return res.status(200).json({
      success: true,
      count: beds.length,
      beds,
    });
  } catch (error) {
    console.error("Get available beds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch available beds.",
    });
  }
};

/* =====================================================
   CREATE TENANT
   OWNER ONLY
===================================================== */

export const createTenant = async (req, res) => {
  let createdUser = null;
  let createdTenant = null;
  let createdRentRecord = null;

  try {
    const ownerId = req.user.userId;

    const {
      name,
      mobile,
      email,
      password,
      pgId,
      roomId,
      bedId,
      joiningDate,
      rentDueDay,
      monthlyRent,
      securityDeposit,
      emergencyContactName,
      emergencyContactNumber,
      notes,
      dateOfBirth,
      gender,
      documentType,
      tenantPhoto,
      aadhaarFrontImage,
      aadhaarBackImage,
      aadhaarNumber,
      panNumber,
      address,
    } = req.body;

    if (
      !name ||
      !mobile ||
      !email ||
      !password ||
      !pgId ||
      !roomId ||
      !bedId ||
      !joiningDate ||
      monthlyRent === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, mobile, email, password, PG, room, bed, joining date and monthly rent are required.",
      });
    }

    const dueDay = Number(rentDueDay || 5);

    if (dueDay < 1 || dueDay > 28) {
      return res.status(400).json({
        success: false,
        message: "Rent due day must be between 1 and 28.",
      });
    }

    if (
      !Number.isFinite(Number(monthlyRent)) ||
      Number(monthlyRent) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly rent must be a valid non-negative amount.",
      });
    }

    if (
      !Number.isFinite(Number(securityDeposit || 0)) ||
      Number(securityDeposit || 0) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Security deposit cannot be negative.",
      });
    }

    const normalizedMobile = String(mobile).trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const existingUser = await User.findOne({
      mobile: normalizedMobile,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this mobile number already exists.",
      });
    }

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered.",
      });
    }

    const pg = await PG.findOne({
      _id: pgId,
      ownerId,
    });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found or you do not have access to it.",
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      pgId,
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found or does not belong to this PG.",
      });
    }

    const bed = await Bed.findOne({
      _id: bedId,
      pgId,
      roomId,
      status: "available",
    });

    if (!bed) {
      return res.status(409).json({
        success: false,
        message: "Selected bed is not available.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    createdUser = await User.create({
      name: name.trim(),
      mobile: normalizedMobile,
      email: normalizedEmail,
      isEmailVerified: false,
      password: hashedPassword,
      role: "tenant",
      createdBy: ownerId,
    });

    createdTenant = await Tenant.create({
      userId: createdUser._id,
      ownerId,
      pgId,
      roomId,
      bedId,
      joiningDate: new Date(joiningDate),
      rentDueDay: dueDay,
      monthlyRent: Number(monthlyRent),
      securityDeposit: Number(securityDeposit || 0),
      emergencyContactName: emergencyContactName?.trim() || "",
      emergencyContactNumber: emergencyContactNumber?.trim() || "",
      notes: notes?.trim() || "",
      dateOfBirth: dateOfBirth || null,
      gender: gender || "",
      documentType: documentType || "",
      tenantPhoto: tenantPhoto || aadhaarFrontImage || "",
      aadhaarFrontImage: aadhaarFrontImage || tenantPhoto || "",
      aadhaarBackImage: aadhaarBackImage || "",
      aadhaarNumber: normalizeAadhaarNumber(aadhaarNumber),
      panNumber: normalizePanNumber(panNumber),
      address: normalizeAddress(address),
      status: "active",
    });

    const tenantJoiningDate = new Date(createdTenant.joiningDate);

    createdRentRecord = await createRentRecordForMonth({
      tenant: createdTenant,
      month: tenantJoiningDate.getMonth() + 1,
      year: tenantJoiningDate.getFullYear(),
    });

    const claimedBed = await Bed.findOneAndUpdate(
      {
        _id: bedId,
        pgId,
        roomId,
        status: "available",
      },
      {
        $set: {
          status: "occupied",
          tenantId: createdUser._id,
        },
      },
      { new: true }
    );

    if (!claimedBed) {
      if (createdRentRecord) {
        await RentRecord.deleteOne({ _id: createdRentRecord._id });
      }

      await Tenant.deleteOne({ _id: createdTenant._id });
      await User.deleteOne({ _id: createdUser._id });

      return res.status(409).json({
        success: false,
        message:
          "The selected bed was just assigned to another tenant. Please select another bed.",
      });
    }

    const tenant = await Tenant.findById(createdTenant._id)
      .populate("userId", "name mobile email role")
      .populate("pgId", "name address city state contactNumber")
      .populate("roomId", "roomNumber roomType monthlyRent floor")
      .populate("bedId", "bedNumber status");

    let welcomeEmailSent = false;

    try {
      const notificationKey = `welcome:${tenant._id}`;

      const existingLog = await TenantEmailLog.findOne({
        notificationKey,
        status: "sent",
      });

      if (!existingLog && tenant.userId?.email) {
        await sendTenantWelcomeEmail({
          tenant,
          user: tenant.userId,
          pg: tenant.pgId,
          room: tenant.roomId,
          bed: tenant.bedId,
        });

        await TenantEmailLog.updateOne(
          { notificationKey },
          {
            $set: {
              tenantId: tenant._id,
              notificationKey,
              emailType: "welcome",
              status: "sent",
              recipient: tenant.userId.email,
              sentAt: new Date(),
              error: "",
            },
          },
          { upsert: true }
        );

        welcomeEmailSent = true;
      }
    } catch (emailError) {
      console.error("Tenant welcome email failed:", emailError);

      try {
        const notificationKey = `welcome:${tenant._id}`;

        await TenantEmailLog.updateOne(
          { notificationKey },
          {
            $set: {
              tenantId: tenant._id,
              notificationKey,
              emailType: "welcome",
              status: "failed",
              recipient: tenant.userId?.email || "",
              sentAt: new Date(),
              error: String(
                emailError.message || emailError
              ).slice(0, 1000),
            },
          },
          { upsert: true }
        );
      } catch (logError) {
        console.error("Tenant welcome email log failed:", logError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Tenant created and bed assigned successfully.",
      welcomeEmailSent,
      tenant,
    });
  } catch (error) {
    console.error("Create tenant error:", error);

    try {
      if (createdRentRecord) {
        await RentRecord.deleteOne({ _id: createdRentRecord._id });
      }

      if (createdTenant) {
        await Tenant.deleteOne({ _id: createdTenant._id });
      }

      if (createdUser) {
        await User.deleteOne({ _id: createdUser._id });
      }
    } catch (rollbackError) {
      console.error("Tenant creation rollback error:", rollbackError);
    }

    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || {})[0];
      const value = field ? error?.keyValue?.[field] : undefined;

      return res.status(409).json({
        success: false,
        message: field
          ? `Duplicate value for ${field}${value !== undefined ? `: ${value}` : ""}.`
          : "A database unique-index conflict occurred. Check backend logs.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create tenant.",
    });
  }
};

/* =====================================================
   DELETE TENANT DOCUMENT IMAGES
   OWNER ONLY
===================================================== */

export const deleteTenantAadhaarImage = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      _id: req.params.tenantId,
      ownerId: req.user.userId,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found.",
      });
    }

    if (
      !tenant.tenantPhoto &&
      !tenant.aadhaarFrontImage &&
      !tenant.aadhaarBackImage
    ) {
      return res.status(404).json({
        success: false,
        message: "No saved document image exists.",
      });
    }

    tenant.tenantPhoto = "";
    tenant.aadhaarFrontImage = "";
    tenant.aadhaarBackImage = "";

    await tenant.save();

    return res.status(200).json({
      success: true,
      message: "Tenant Aadhaar images deleted successfully.",
    });
  } catch (error) {
    console.error("Delete tenant image error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete tenant document images.",
    });
  }
};

/* =====================================================
   VACATE TENANT
   OWNER ONLY
===================================================== */

export const vacateTenant = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { tenantId } = req.params;

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId,
      status: "active",
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message:
          "Active tenant not found or you do not have access to this tenant.",
      });
    }

    const vacatedAt = new Date();

    await syncCurrentRentRecord(tenant);

    const currentMonth = vacatedAt.getMonth() + 1;
    const currentYear = vacatedAt.getFullYear();

    const unpaidRecords = await RentRecord.find({
      tenantId: tenant._id,
      status: { $ne: "paid" },
      $or: [
        { year: { $lt: currentYear } },
        {
          year: currentYear,
          month: { $lte: currentMonth },
        },
      ],
    }).select("amount");

    const outstandingBalance = Number(
      unpaidRecords
        .reduce(
          (total, record) => total + Number(record.amount || 0),
          0
        )
        .toFixed(2)
    );

    tenant.status = "vacated";
    tenant.vacatedAt = vacatedAt;
    tenant.outstandingBalance = outstandingBalance;
    tenant.debtSettledAt =
      outstandingBalance === 0 ? vacatedAt : null;

    await tenant.save();

    await Bed.findOneAndUpdate(
      {
        _id: tenant.bedId,
        pgId: tenant.pgId,
      },
      {
        $set: {
          status: "available",
          tenantId: null,
        },
      }
    );

    // Send move-out email after vacating has been saved.
    let vacatedEmailSent = false;

    try {
      const user = await User.findById(tenant.userId)
        .select("name email");

      const pg = await PG.findById(tenant.pgId)
        .select("name");

      const notificationKey =
        `vacated:${tenant._id}:${vacatedAt.getTime()}`;

      if (user?.email) {
        const existingLog = await TenantEmailLog.findOne({
          notificationKey,
          status: "sent",
        });

        if (!existingLog) {
          await sendTenantVacatedEmail({
            user,
            pg,
            tenant,
          });

          await TenantEmailLog.updateOne(
            { notificationKey },
            {
              $set: {
                tenantId: tenant._id,
                notificationKey,
                emailType: "vacated",
                status: "sent",
                recipient: user.email,
                sentAt: new Date(),
                error: "",
              },
            },
            { upsert: true }
          );

          vacatedEmailSent = true;
        }
      }
    } catch (emailError) {
      console.error("Tenant move-out email failed:", emailError);

      try {
        const user = await User.findById(tenant.userId)
          .select("email");

        const notificationKey =
          `vacated:${tenant._id}:${vacatedAt.getTime()}`;

        await TenantEmailLog.updateOne(
          { notificationKey },
          {
            $set: {
              tenantId: tenant._id,
              notificationKey,
              emailType: "vacated",
              status: "failed",
              recipient: user?.email || "",
              sentAt: new Date(),
              error: String(
                emailError.message || emailError
              ).slice(0, 1000),
            },
          },
          { upsert: true }
        );
      } catch (logError) {
        console.error("Move-out email log failed:", logError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Tenant vacated successfully.",
      vacatedEmailSent,
      tenant,
      outstandingBalance,
    });
  } catch (error) {
    console.error("Vacate tenant error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to vacate tenant.",
    });
  }
};

/* =====================================================
   UPDATE TENANT
   OWNER ONLY
===================================================== */

export const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const {
      name,
      mobile,
      email,
      password,
      pgId,
      roomId,
      bedId,
      joiningDate,
      rentDueDay,
      monthlyRent,
      securityDeposit,
      emergencyContactName,
      emergencyContactNumber,
      notes,
      dateOfBirth,
      gender,
      documentType,
      tenantPhoto,
      aadhaarFrontImage,
      aadhaarBackImage,
      aadhaarNumber,
      panNumber,
      address,
    } = req.body;

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId: req.user.userId,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found.",
      });
    }

    if (!pgId || !roomId || !bedId) {
      return res.status(400).json({
        success: false,
        message: "PG, room and bed are required.",
      });
    }

    const dueDay = Number(rentDueDay || 5);

    if (
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 28
    ) {
      return res.status(400).json({
        success: false,
        message: "Rent due day must be between 1 and 28.",
      });
    }

    if (
      !Number.isFinite(Number(monthlyRent)) ||
      Number(monthlyRent) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly rent cannot be negative.",
      });
    }

    if (
      !Number.isFinite(Number(securityDeposit || 0)) ||
      Number(securityDeposit || 0) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Security deposit cannot be negative.",
      });
    }

    const pg = await PG.findOne({
      _id: pgId,
      ownerId: req.user.userId,
    });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG.",
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      pgId,
      isActive: true,
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: "Selected room does not belong to the selected PG.",
      });
    }

    const bed = await Bed.findOne({
      _id: bedId,
      roomId,
      pgId,
    });

    if (!bed) {
      return res.status(400).json({
        success: false,
        message: "Selected bed does not belong to the selected room.",
      });
    }

    const existingTenant = await Tenant.findOne({
      _id: { $ne: tenant._id },
      bedId,
      status: "active",
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: "This bed is already occupied.",
      });
    }

    const user = await User.findById(tenant.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tenant user account not found.",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      user.name = name.trim();
    }

    if (mobile !== undefined) {
      if (typeof mobile !== "string" || !mobile.trim()) {
        return res.status(400).json({
          success: false,
          message: "Mobile number cannot be empty.",
        });
      }

      const normalizedMobile = mobile.trim();

      const mobileOwner = await User.findOne({
        mobile: normalizedMobile,
        _id: { $ne: user._id },
      });

      if (mobileOwner) {
        return res.status(409).json({
          success: false,
          message: "Another user already uses this mobile number.",
        });
      }

      user.mobile = normalizedMobile;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

      if (
        normalizedEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      if (normalizedEmail) {
        const duplicateEmail = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (duplicateEmail) {
          return res.status(409).json({
            success: false,
            message: "This email address is already registered.",
          });
        }
      }

      if ((user.email || "") !== normalizedEmail) {
        user.email = normalizedEmail || undefined;
        user.isEmailVerified = false;
      }
    }

    if (password !== undefined && password !== "") {
      if (
        typeof password !== "string" ||
        password.length < 8
      ) {
        return res.status(400).json({
          success: false,
          message: "New password must contain at least 8 characters.",
        });
      }

      user.password = await bcrypt.hash(password, 12);
    }

    const joining = joiningDate
      ? new Date(joiningDate)
      : new Date(tenant.joiningDate);

    if (Number.isNaN(joining.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid joining date.",
      });
    }

    const oldBedId = tenant.bedId;

    user.name = user.name.trim();

    await user.save();

    tenant.pgId = pgId;
    tenant.roomId = roomId;
    tenant.bedId = bedId;
    tenant.joiningDate = joining;
    tenant.rentDueDay = dueDay;
    tenant.monthlyRent = Number(monthlyRent);
    tenant.securityDeposit = Number(securityDeposit || 0);

    tenant.emergencyContactName =
      emergencyContactName?.trim() || "";

    tenant.emergencyContactNumber =
      emergencyContactNumber?.trim() || "";

    tenant.notes = notes?.trim() || "";

    if (dateOfBirth !== undefined) {
      tenant.dateOfBirth = dateOfBirth || null;
    }

    if (gender !== undefined) {
      tenant.gender = gender;
    }

    if (documentType !== undefined) {
      tenant.documentType = documentType;
    }

    if (tenantPhoto !== undefined) {
      tenant.tenantPhoto = tenantPhoto;
    }

    if (aadhaarFrontImage !== undefined) {
      tenant.aadhaarFrontImage = aadhaarFrontImage;

      if (aadhaarFrontImage) {
        tenant.tenantPhoto = aadhaarFrontImage;
      }
    }

    if (aadhaarBackImage !== undefined) {
      tenant.aadhaarBackImage = aadhaarBackImage;
    }

    if (aadhaarNumber !== undefined) {
      tenant.aadhaarNumber =
        normalizeAadhaarNumber(aadhaarNumber);
    }

    if (panNumber !== undefined) {
      tenant.panNumber = normalizePanNumber(panNumber);
    }

    if (address !== undefined) {
      tenant.address = normalizeAddress(address);
    }

    await tenant.save();

    if (String(oldBedId) !== String(bed._id)) {
      await Bed.findOneAndUpdate(
        {
          _id: oldBedId,
          pgId: tenant.pgId,
        },
        {
          $set: {
            status: "available",
            tenantId: null,
          },
        }
      );
    }

    await Bed.findByIdAndUpdate(bed._id, {
      $set: {
        status: "occupied",
        tenantId: tenant.userId,
      },
    });

    await syncCurrentRentRecord(tenant);

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate("userId", "name mobile email")
      .populate("ownerId", "name mobile")
      .populate("pgId")
      .populate("roomId")
      .populate("bedId");

    return res.status(200).json({
      success: true,
      message: "Tenant updated successfully.",
      tenant: populatedTenant,
    });
  } catch (error) {
    console.error("Update tenant error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user or tenant with these details already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update tenant.",
    });
  }
};
// ============================================
// DELETE TENANT
// ============================================
export const deleteTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;

    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Ensure the tenant belongs to the logged-in owner
    if (tenant.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this tenant",
      });
    }

    // Release the bed if the tenant is still active
    if (tenant.status === "active" && tenant.bedId) {
      await Bed.findByIdAndUpdate(tenant.bedId, {
        $set: { isOccupied: false },
      });
    }

    // Remove tenant rent records
    await RentRecord.deleteMany({
      tenantId: tenant._id,
      ownerId: tenant.ownerId,
    });

    // Remove tenant record
    await Tenant.findByIdAndDelete(tenant._id);

    // Remove the associated user only if they have no other tenant records
    const otherTenantRecords = await Tenant.countDocuments({
      userId: tenant.userId,
    });

    if (otherTenantRecords === 0) {
      await User.findByIdAndDelete(tenant.userId);
    }

    return res.status(200).json({
      success: true,
      message: "Tenant deleted successfully",
    });
  } catch (error) {
    console.error("Delete tenant error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete tenant",
      error: error.message,
    });
  }
};

// ============================================
// GET MY ROOMMATES
// ============================================
export const getMyRoommates = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the tenant record associated with the logged-in user
    const myTenant = await Tenant.findOne({
      userId,
      status: "active",
    });

    if (!myTenant) {
      return res.status(404).json({
        success: false,
        message: "No active tenant record found",
      });
    }

    // Find other active tenants in the same PG and room
    const roommates = await Tenant.find({
      pgId: myTenant.pgId,
      roomId: myTenant.roomId,
      status: "active",
      _id: { $ne: myTenant._id },
    })
      .populate("userId", "name email phone")
      .populate("bedId", "bedNumber")
      .select("-aadhaarImage");

    return res.status(200).json({
      success: true,
      count: roommates.length,
      roommates,
    });
  } catch (error) {
    console.error("Get roommates error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch roommates",
      error: error.message,
    });
  }
};