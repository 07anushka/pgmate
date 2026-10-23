
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import PG from "../models/PG.js";
import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import RentRecord from "../models/RentRecord.js";

/* =====================================================
   RENT HELPERS
===================================================== */

const createRentRecordForMonth = async ({
  tenant,
  month,
  year,
}) => {
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
    if (
      existingRecord.status !== "paid" &&
      today > existingRecord.dueDate
    ) {
      existingRecord.status = "overdue";
      await existingRecord.save();
    }

    return existingRecord;
  }

  let status = "pending";

  if (today > dueDate) {
    status = "overdue";
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
    status,

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
    if (tenant.status !== "active") {
      continue;
    }

    const joiningDate = new Date(tenant.joiningDate);

    const joiningMonth = joiningDate.getMonth() + 1;
    const joiningYear = joiningDate.getFullYear();

    if (
      currentYear < joiningYear ||
      (currentYear === joiningYear &&
        currentMonth < joiningMonth)
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
  if (tenant.status !== "active") {
    return null;
  }

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

  if (record.status === "paid") {
    return record;
  }

  record.amount = Number(tenant.monthlyRent || 0);
  record.dueDate = dueDate;

  if (new Date() > dueDate) {
    record.status = "overdue";
  } else {
    record.status = "pending";
  }

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
   OWNER ONLY
===================================================== */

export const getMyTenants = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const tenants = await Tenant.find({ ownerId })
      .populate("userId", "name mobile role")
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
   - pgId only: return available beds with room details
   - pgId + roomId: return beds for the selected room
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

    // Confirm the PG belongs to the logged-in owner.
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

    // Only validate a room when the caller selected one.
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

    // Initially fetch all available beds in this PG.
    // After a room is selected, limit the results to that room.
    const bedQuery = {
      pgId,
      status: "available",
    };

    if (roomId) {
      bedQuery.roomId = roomId;
    }

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

      // Document-scanning fields
      dateOfBirth,
      gender,
      documentType,
      tenantPhoto,
      aadhaarNumber,
      panNumber,
      address,
    } = req.body;

    if (
      !name ||
      !mobile ||
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
          "Name, mobile, password, PG, room, bed, joining date and monthly rent are required.",
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

    const existingUser = await User.findOne({
      mobile: normalizedMobile,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this mobile number already exists.",
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

    const hashedPassword = await bcrypt.hash(
      String(password),
      12
    );

    createdUser = await User.create({
      name: name.trim(),
      mobile: normalizedMobile,
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

      emergencyContactName:
        emergencyContactName?.trim() || "",

      emergencyContactNumber:
        emergencyContactNumber?.trim() || "",

      notes: notes?.trim() || "",

      // Extracted identity details
      dateOfBirth: dateOfBirth || null,
      gender: gender || "",
      documentType: documentType || "",
      tenantPhoto: tenantPhoto || "",

      aadhaarNumber: normalizeAadhaarNumber(aadhaarNumber),
      panNumber: normalizePanNumber(panNumber),
      address: normalizeAddress(address),

      status: "active",
    });

    const tenantJoiningDate = new Date(
      createdTenant.joiningDate
    );

    const joiningMonth = tenantJoiningDate.getMonth() + 1;
    const joiningYear = tenantJoiningDate.getFullYear();

    createdRentRecord = await createRentRecordForMonth({
      tenant: createdTenant,
      month: joiningMonth,
      year: joiningYear,
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
      {
        new: true,
      }
    );

    if (!claimedBed) {
      if (createdRentRecord) {
        await RentRecord.deleteOne({
          _id: createdRentRecord._id,
        });
      }

      await Tenant.deleteOne({
        _id: createdTenant._id,
      });

      await User.deleteOne({
        _id: createdUser._id,
      });

      return res.status(409).json({
        success: false,
        message:
          "The selected bed was just assigned to another tenant. Please select another bed.",
      });
    }

    const tenant = await Tenant.findById(createdTenant._id)
      .populate("userId", "name mobile role")
      .populate("pgId", "name address city state contactNumber")
      .populate("roomId", "roomNumber roomType monthlyRent floor")
      .populate("bedId", "bedNumber status");

    return res.status(201).json({
      success: true,
      message: "Tenant created and bed assigned successfully.",
      tenant,
    });
  } catch (error) {
    console.error("Create tenant error:", error);

    try {
      if (createdRentRecord) {
        await RentRecord.deleteOne({
          _id: createdRentRecord._id,
        });
      }

      if (createdTenant) {
        await Tenant.deleteOne({
          _id: createdTenant._id,
        });
      }

      if (createdUser) {
        await User.deleteOne({
          _id: createdUser._id,
        });
      }
    } catch (rollbackError) {
      console.error("Tenant creation rollback error:", rollbackError);
    }


    if (error?.code === 11000) {
      console.error("Duplicate key error:", {
        collection: error?.message,
        keyPattern: error?.keyPattern,
        keyValue: error?.keyValue,
        indexName: error?.message?.match(/index:\s+([^\s]+)/)?.[1],
      });

      const field = Object.keys(error?.keyPattern || {})[0];
      const value = field
        ? error?.keyValue?.[field]
        : undefined;

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

    // Ensure the current month's rent record exists before
    // calculating the tenant's outstanding rent.
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
          (total, record) =>
            total + Number(record.amount || 0),
          0
        )
        .toFixed(2)
    );

    // Persist debt and vacating status together on the tenant.
    tenant.status = "vacated";
    tenant.vacatedAt = vacatedAt;
    tenant.outstandingBalance = outstandingBalance;
    tenant.debtSettledAt =
      outstandingBalance === 0 ? vacatedAt : null;

    await tenant.save();

    // Release the bed without deleting tenant or rent history.
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

    return res.status(200).json({
      success: true,
      message: "Tenant vacated successfully.",
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

      // Document-scanning fields
      dateOfBirth,
      gender,
      documentType,
      tenantPhoto,
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
        message: "Tenant not found",
      });
    }

    if (!pgId || !roomId || !bedId) {
      return res.status(400).json({
        success: false,
        message: "PG, room and bed are required",
      });
    }

    const dueDay = Number(rentDueDay || 5);

    if (dueDay < 1 || dueDay > 28) {
      return res.status(400).json({
        success: false,
        message: "Rent due day must be between 1 and 28",
      });
    }

    if (
      !Number.isFinite(Number(monthlyRent || 0)) ||
      Number(monthlyRent || 0) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly rent cannot be negative",
      });
    }

    if (
      !Number.isFinite(Number(securityDeposit || 0)) ||
      Number(securityDeposit || 0) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Security deposit cannot be negative",
      });
    }

    const pg = await PG.findOne({
      _id: pgId,
      ownerId: req.user.userId,
    });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG",
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
        message: "Selected room does not belong to the selected PG",
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
        message: "Selected bed does not belong to the selected room",
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
        message: "This bed is already occupied",
      });
    }

    const user = await User.findById(tenant.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tenant user account not found",
      });
    }

    if (name?.trim()) {
      user.name = name.trim();
    }

    if (mobile?.trim()) {
      const mobileOwner = await User.findOne({
        mobile: mobile.trim(),
        _id: { $ne: user._id },
      });

      if (mobileOwner) {
        return res.status(409).json({
          success: false,
          message: "Another user already uses this mobile number.",
        });
      }

      user.mobile = mobile.trim();
    }

    if (password?.trim()) {
      user.password = await bcrypt.hash(
        password.trim(),
        12
      );
    }

    await user.save();

    const oldBedId = tenant.bedId;

    tenant.pgId = pgId;
    tenant.roomId = roomId;
    tenant.bedId = bedId;

    if (joiningDate) {
      tenant.joiningDate = new Date(joiningDate);
    }

    tenant.rentDueDay = dueDay;
    tenant.monthlyRent = Number(monthlyRent || 0);
    tenant.securityDeposit = Number(securityDeposit || 0);

    tenant.emergencyContactName =
      emergencyContactName?.trim() || "";

    tenant.emergencyContactNumber =
      emergencyContactNumber?.trim() || "";

    tenant.notes = notes?.trim() || "";

    // Update document fields only when supplied.
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

    if (aadhaarNumber !== undefined) {
      tenant.aadhaarNumber =
        normalizeAadhaarNumber(aadhaarNumber);
    }

    if (panNumber !== undefined) {
      tenant.panNumber =
        normalizePanNumber(panNumber);
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

    await Bed.findByIdAndUpdate(
      bed._id,
      {
        $set: {
          status: "occupied",
          tenantId: tenant.userId,
        },
      }
    );

    await syncCurrentRentRecord(tenant);

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate("userId", "name mobile")
      .populate("ownerId", "name mobile")
      .populate("pgId")
      .populate("roomId")
      .populate("bedId");

    return res.status(200).json({
      success: true,
      message: "Tenant updated successfully",
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
      message: "Failed to update tenant",
    });
  }
};

/* =====================================================
   DELETE TENANT
   OWNER ONLY
===================================================== */

export const deleteTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findOne({
      _id: tenantId,
      ownerId: req.user.userId,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

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

    // Preserve rent records as financial history.
    await Tenant.deleteOne({
      _id: tenant._id,
    });

    await User.deleteOne({
      _id: tenant.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Tenant deleted successfully.",
    });
  } catch (error) {
    console.error("Delete tenant error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete tenant.",
    });
  }
};

/* =====================================================
   GET MY ROOMMATES
   TENANT ONLY
===================================================== */

export const getMyRoommates = async (req, res) => {
  try {
    const userId = req.user.userId;

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

    const roommates = await Tenant.find({
      roomId: tenant.roomId,
      status: "active",
      _id: { $ne: tenant._id },
    })
      .populate("userId", "name")
      .populate("roomId", "roomNumber roomType floor")
      .select("userId roomId tenantPhoto");

    return res.status(200).json({
      success: true,
      count: roommates.length,
      roommates,
    });
  } catch (error) {
    console.error("Get roommates error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch roommates.",
    });
  }
};
