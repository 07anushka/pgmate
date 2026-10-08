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

/*
  Creates a rent record for one tenant/month/year.

  Example:

  tenant: Anushka
  month: 10
  year: 2026

  → October 2026 rent record
*/
const createRentRecordForMonth = async ({
  tenant,
  month,
  year,
}) => {
  const rentDueDay = Math.min(
    28,
    Math.max(
      1,
      Number(tenant.rentDueDay || 5)
    )
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

  const existingRecord =
    await RentRecord.findOne({
      tenantId: tenant._id,
      month,
      year,
    });

  /*
    If the record already exists, update
    pending → overdue when the deadline passes.

    Never change a paid record back to overdue.
  */

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

    amount: Number(
      tenant.monthlyRent || 0
    ),

    dueDate,

    status,

    paidDate: null,
    paymentMethod: null,
    daysLate: 0,
    paymentId: null,
    notes: "",
  });
};

/*
  Makes sure the current month's rent record
  exists for every active tenant.

  This is called when the owner loads tenants.
*/
const ensureCurrentRentRecords =
  async (tenants) => {
    const now = new Date();

    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    for (const tenant of tenants) {
      if (
        tenant.status !== "active"
      ) {
        continue;
      }

      const joiningDate =
        new Date(
          tenant.joiningDate
        );

      const joiningMonth =
        joiningDate.getMonth() + 1;

      const joiningYear =
        joiningDate.getFullYear();

      /*
        Do not create rent records before
        the tenant actually joined.
      */

      if (
        currentYear < joiningYear ||
        (
          currentYear === joiningYear &&
          currentMonth < joiningMonth
        )
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

/*
  Update the current month's rent record
  after tenant details change.

  Important:
  - If the current month's record is unpaid,
    amount and due date can be updated.
  - If it is already paid, we preserve the
    historical payment information.
*/
const syncCurrentRentRecord =
  async (tenant) => {
    if (
      tenant.status !== "active"
    ) {
      return null;
    }

    const now = new Date();

    const month =
      now.getMonth() + 1;

    const year =
      now.getFullYear();

    const joiningDate =
      new Date(
        tenant.joiningDate
      );

    const joiningMonth =
      joiningDate.getMonth() + 1;

    const joiningYear =
      joiningDate.getFullYear();

    /*
      Don't create a record before
      tenant's joining month.
    */

    if (
      year < joiningYear ||
      (
        year === joiningYear &&
        month < joiningMonth
      )
    ) {
      return null;
    }

    const rentDueDay = Math.min(
      28,
      Math.max(
        1,
        Number(tenant.rentDueDay || 5)
      )
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

    let record =
      await RentRecord.findOne({
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

    /*
      Do not overwrite a paid historical
      payment record.
    */

    if (
      record.status === "paid"
    ) {
      return record;
    }

    record.amount = Number(
      tenant.monthlyRent || 0
    );

    record.dueDate = dueDate;

    if (
      new Date() > dueDate
    ) {
      record.status = "overdue";
    } else {
      record.status = "pending";
    }

    await record.save();

    return record;
  };

/* =====================================================
   GET MY TENANTS
   OWNER ONLY
===================================================== */

export const getMyTenants = async (
  req,
  res
) => {
  try {
    const ownerId =
      req.user.userId;

    const {
      pgId,
      status,
    } = req.query;

    const filter = {
      ownerId,
    };

    if (pgId) {
      filter.pgId = pgId;
    }

    if (
      status &&
      ["active", "vacated"].includes(
        status
      )
    ) {
      filter.status = status;
    }

    const tenants =
      await Tenant.find(filter)
        .populate(
          "userId",
          "name mobile role"
        )
        .populate(
          "pgId",
          "name address city state contactNumber"
        )
        .populate(
          "roomId",
          "roomNumber roomType monthlyRent floor"
        )
        .populate(
          "bedId",
          "bedNumber status"
        )
        .sort({
          createdAt: -1,
        });

    /*
      Create/update current month's rent
      records for active tenants.

      We use the populated tenant objects
      only for display. The helper needs the
      actual tenant IDs and fields, so fetch
      the owner-scoped tenant documents too.
    */

    const tenantIds =
      tenants.map(
        (tenant) => tenant._id
      );

    if (tenantIds.length > 0) {
      const rawTenants =
        await Tenant.find({
          _id: {
            $in: tenantIds,
          },
          ownerId,
          status: "active",
        });

      await ensureCurrentRentRecords(
        rawTenants
      );
    }

    return res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error(
      "Get owner tenants error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch tenants.",
    });
  }
};

/* =====================================================
   GET AVAILABLE BEDS
   OWNER ONLY
===================================================== */

export const getAvailableBeds = async (
  req,
  res
) => {
  try {
    const ownerId =
      req.user.userId;

    const { pgId } = req.query;

    if (!pgId) {
      return res.status(400).json({
        success: false,
        message:
          "PG ID is required.",
      });
    }

    /*
      Verify that this PG belongs
      to the logged-in owner.
    */

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId,
      });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message:
          "PG not found or you do not have access to it.",
      });
    }

    const beds =
      await Bed.find({
        pgId,
        status: "available",
      })
        .populate(
          "roomId",
          "roomNumber roomType monthlyRent floor"
        )
        .sort({
          roomId: 1,
          bedNumber: 1,
        });

    return res.status(200).json({
      success: true,
      count: beds.length,
      beds,
    });
  } catch (error) {
    console.error(
      "Get available beds error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch available beds.",
    });
  }
};

/* =====================================================
   CREATE TENANT
   OWNER ONLY
===================================================== */

export const createTenant = async (
  req,
  res
) => {
  let createdUser = null;
  let createdTenant = null;
  let createdRentRecord = null;

  try {
    const ownerId =
      req.user.userId;

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
    } = req.body;

    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

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

    const dueDay = Number(
      rentDueDay || 5
    );

    if (
      dueDay < 1 ||
      dueDay > 28
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rent due day must be between 1 and 28.",
      });
    }

    if (
      Number(monthlyRent) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly rent cannot be negative.",
      });
    }

    if (
      Number(securityDeposit || 0) <
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Security deposit cannot be negative.",
      });
    }

    /* -----------------------------------------
       NORMALIZE MOBILE
    ----------------------------------------- */

    const normalizedMobile =
      String(mobile).trim();

    /* -----------------------------------------
       CHECK MOBILE
    ----------------------------------------- */

    const existingUser =
      await User.findOne({
        mobile: normalizedMobile,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this mobile number already exists.",
      });
    }

    /* -----------------------------------------
       VERIFY PG OWNERSHIP
    ----------------------------------------- */

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId,
      });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message:
          "PG not found or you do not have access to it.",
      });
    }

    /* -----------------------------------------
       VERIFY ROOM
    ----------------------------------------- */

    const room =
      await Room.findOne({
        _id: roomId,
        pgId,
        isActive: true,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found or does not belong to this PG.",
      });
    }

    /* -----------------------------------------
       VERIFY BED
    ----------------------------------------- */

    const bed =
      await Bed.findOne({
        _id: bedId,
        pgId,
        roomId,
        status: "available",
      });

    if (!bed) {
      return res.status(409).json({
        success: false,
        message:
          "Selected bed is not available.",
      });
    }

    /* -----------------------------------------
       HASH PASSWORD
    ----------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        12
      );

    /* -----------------------------------------
       CREATE USER
    ----------------------------------------- */

    createdUser =
      await User.create({
        name: name.trim(),
        mobile: normalizedMobile,
        password: hashedPassword,
        role: "tenant",
        createdBy: ownerId,
      });

    /* -----------------------------------------
       CREATE TENANT PROFILE
    ----------------------------------------- */

    createdTenant =
      await Tenant.create({
        userId: createdUser._id,
        ownerId,
        pgId,
        roomId,
        bedId,

        joiningDate:
          new Date(joiningDate),

        rentDueDay: dueDay,

        monthlyRent:
          Number(monthlyRent),

        securityDeposit:
          Number(
            securityDeposit || 0
          ),

        emergencyContactName:
          emergencyContactName?.trim() ||
          "",

        emergencyContactNumber:
          emergencyContactNumber?.trim() ||
          "",

        notes:
          notes?.trim() || "",

        status: "active",
      });

    /* -----------------------------------------
       CREATE FIRST RENT RECORD
    ----------------------------------------- */

    const tenantJoiningDate =
      new Date(
        createdTenant.joiningDate
      );

    const joiningMonth =
      tenantJoiningDate.getMonth() +
      1;

    const joiningYear =
      tenantJoiningDate.getFullYear();

    createdRentRecord =
      await createRentRecordForMonth({
        tenant: createdTenant,
        month: joiningMonth,
        year: joiningYear,
      });

    /* -----------------------------------------
       CLAIM BED
    ----------------------------------------- */

    const claimedBed =
      await Bed.findOneAndUpdate(
        {
          _id: bedId,
          pgId,
          roomId,
          status: "available",
        },
        {
          $set: {
            status: "occupied",
            tenantId:
              createdUser._id,
          },
        },
        {
          new: true,
        }
      );

    /*
      Another request may have claimed
      the bed between our availability
      check and update.
    */

    if (!claimedBed) {
      if (createdRentRecord) {
        await RentRecord.deleteOne({
          _id:
            createdRentRecord._id,
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

    /* -----------------------------------------
       RESPONSE
    ----------------------------------------- */

    const tenant =
      await Tenant.findById(
        createdTenant._id
      )
        .populate(
          "userId",
          "name mobile role"
        )
        .populate(
          "pgId",
          "name address city state contactNumber"
        )
        .populate(
          "roomId",
          "roomNumber roomType monthlyRent floor"
        )
        .populate(
          "bedId",
          "bedNumber status"
        );

    return res.status(201).json({
      success: true,
      message:
        "Tenant created and bed assigned successfully.",
      tenant,
    });
  } catch (error) {
    console.error(
      "Create tenant error:",
      error
    );

    /* -----------------------------------------
       ROLLBACK
    ----------------------------------------- */

    try {
      if (createdRentRecord) {
        await RentRecord.deleteOne({
          _id:
            createdRentRecord._id,
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
      console.error(
        "Tenant creation rollback error:",
        rollbackError
      );
    }

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A tenant or user with the provided details already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create tenant.",
    });
  }
};

/* =====================================================
   VACATE TENANT
   OWNER ONLY
===================================================== */

export const vacateTenant = async (
  req,
  res
) => {
  try {
    const ownerId =
      req.user.userId;

    const {
      tenantId,
    } = req.params;

    /* -----------------------------------------
       FIND TENANT
    ----------------------------------------- */

    const tenant =
      await Tenant.findOne({
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

    /* -----------------------------------------
       UPDATE TENANT
    ----------------------------------------- */

    tenant.status =
      "vacated";

    tenant.vacatedAt =
      new Date();

    await tenant.save();

    /* -----------------------------------------
       RELEASE BED
    ----------------------------------------- */

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

    /*
      IMPORTANT:

      We DO NOT delete rent records when a
      tenant is vacated.

      Old rent history must remain available
      for month/year reports.
    */

    return res.status(200).json({
      success: true,
      message:
        "Tenant vacated and bed released successfully.",
    });
  } catch (error) {
    console.error(
      "Vacate tenant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to vacate tenant.",
    });
  }
};

/* =====================================================
   UPDATE TENANT
   OWNER ONLY
===================================================== */

export const updateTenant = async (
  req,
  res
) => {
  try {
    const { tenantId } =
      req.params;

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
    } = req.body;

    const tenant =
      await Tenant.findOne({
        _id: tenantId,
        ownerId: req.user.userId,
      });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message:
          "Tenant not found",
      });
    }

    if (
      !pgId ||
      !roomId ||
      !bedId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PG, room and bed are required",
      });
    }

    const dueDay = Number(
      rentDueDay || 5
    );

    if (
      dueDay < 1 ||
      dueDay > 28
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rent due day must be between 1 and 28",
      });
    }

    if (
      Number(monthlyRent || 0) <
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly rent cannot be negative",
      });
    }

    if (
      Number(securityDeposit || 0) <
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Security deposit cannot be negative",
      });
    }

    /* -----------------------------------------
       VERIFY PG
    ----------------------------------------- */

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId: req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this PG",
      });
    }

    /* -----------------------------------------
       VERIFY ROOM
    ----------------------------------------- */

    const room =
      await Room.findOne({
        _id: roomId,
        pgId,
        isActive: true,
      });

    if (!room) {
      return res.status(400).json({
        success: false,
        message:
          "Selected room does not belong to the selected PG",
      });
    }

    /* -----------------------------------------
       VERIFY BED
    ----------------------------------------- */

    const bed =
      await Bed.findOne({
        _id: bedId,
        roomId,
        pgId,
      });

    if (!bed) {
      return res.status(400).json({
        success: false,
        message:
          "Selected bed does not belong to the selected room",
      });
    }

    /* -----------------------------------------
       PREVENT BED DOUBLE ASSIGNMENT
    ----------------------------------------- */

    const existingTenant =
      await Tenant.findOne({
        _id: {
          $ne: tenant._id,
        },

        bedId,

        status: "active",
      });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message:
          "This bed is already occupied",
      });
    }

    /* -----------------------------------------
       UPDATE USER
    ----------------------------------------- */

    const user =
      await User.findById(
        tenant.userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Tenant user account not found",
      });
    }

    if (name?.trim()) {
      user.name =
        name.trim();
    }

    if (mobile?.trim()) {
      /*
        Don't allow another account
        to use the same mobile.
      */

      const mobileOwner =
        await User.findOne({
          mobile:
            mobile.trim(),
          _id: {
            $ne: user._id,
          },
        });

      if (mobileOwner) {
        return res.status(409).json({
          success: false,
          message:
            "Another user already uses this mobile number.",
        });
      }

      user.mobile =
        mobile.trim();
    }

    if (password?.trim()) {
      user.password =
        await bcrypt.hash(
          password.trim(),
          12
        );
    }

    await user.save();

    /* -----------------------------------------
       REMEMBER OLD BED
    ----------------------------------------- */

    const oldBedId =
      tenant.bedId;

    /* -----------------------------------------
       UPDATE TENANT
    ----------------------------------------- */

    tenant.pgId = pgId;
    tenant.roomId = roomId;
    tenant.bedId = bedId;

    if (joiningDate) {
      tenant.joiningDate =
        new Date(joiningDate);
    }

    tenant.rentDueDay =
      dueDay;

    tenant.monthlyRent =
      Number(
        monthlyRent || 0
      );

    tenant.securityDeposit =
      Number(
        securityDeposit || 0
      );

    tenant.emergencyContactName =
      emergencyContactName?.trim() ||
      "";

    tenant.emergencyContactNumber =
      emergencyContactNumber?.trim() ||
      "";

    tenant.notes =
      notes?.trim() || "";

    await tenant.save();

    /* -----------------------------------------
       RELEASE OLD BED
    ----------------------------------------- */

    if (
      String(oldBedId) !==
      String(bed._id)
    ) {
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

    /* -----------------------------------------
       OCCUPY NEW BED
    ----------------------------------------- */

    await Bed.findByIdAndUpdate(
      bed._id,
      {
        $set: {
          status: "occupied",
          tenantId: tenant.userId,
        },
      }
    );

    /*
      IMPORTANT:

      Sync current month's rent record.

      Old paid months are NOT changed.
      Current unpaid month can reflect the
      new rent amount / due date.
    */

    await syncCurrentRentRecord(
      tenant
    );

    /* -----------------------------------------
       RESPONSE
    ----------------------------------------- */

    const populatedTenant =
      await Tenant.findById(
        tenant._id
      )
        .populate(
          "userId",
          "name mobile"
        )
        .populate(
          "ownerId",
          "name mobile"
        )
        .populate("pgId")
        .populate("roomId")
        .populate("bedId");

    return res.status(200).json({
      success: true,
      message:
        "Tenant updated successfully",
      tenant:
        populatedTenant,
    });
  } catch (error) {
    console.error(
      "Update tenant error:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A user or tenant with these details already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update tenant",
    });
  }
};

/* =====================================================
   DELETE TENANT
   OWNER ONLY
===================================================== */

export const deleteTenant = async (
  req,
  res
) => {
  try {
    const { tenantId } =
      req.params;

    const tenant =
      await Tenant.findOne({
        _id: tenantId,
        ownerId: req.user.userId,
      });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message:
          "Tenant not found",
      });
    }

    /* -----------------------------------------
       RELEASE CURRENT BED
    ----------------------------------------- */

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

    /*
      IMPORTANT:

      Rent records are NOT deleted.

      This preserves:

      January 2026
      February 2026
      March 2026
      etc.

      even if the tenant account is deleted.
    */

    /* -----------------------------------------
       DELETE TENANT PROFILE
    ----------------------------------------- */

    await Tenant.deleteOne({
      _id: tenant._id,
    });

    /* -----------------------------------------
       DELETE LOGIN ACCOUNT
    ----------------------------------------- */

    await User.deleteOne({
      _id: tenant.userId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Tenant deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete tenant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete tenant",
    });
  }
};