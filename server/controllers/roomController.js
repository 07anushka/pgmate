import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import PG from "../models/PG.js";


// ======================================================
// CREATE ROOM
// ======================================================

export const createRoom = async (
  req,
  res
) => {
  try {
    const {
      pgId,
      roomNumber,
      roomType,
      monthlyRent,
      floor,
      description,
    } = req.body;

    if (
      !pgId ||
      !roomNumber ||
      monthlyRent ===
        undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PG, room number and monthly rent are required",
      });
    }

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId:
          req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this PG",
      });
    }

    const cleanRoomNumber =
      roomNumber.trim();

    const existingRoom =
      await Room.findOne({
        pgId,
        roomNumber:
          cleanRoomNumber,
      });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message:
          "A room with this number already exists in this PG",
      });
    }

    const room =
      await Room.create({
        pgId,
        roomNumber:
          cleanRoomNumber,
        roomType:
          roomType ||
          "double",
        monthlyRent:
          Number(monthlyRent),
        floor:
          floor?.trim().toLowerCase() ||
          "ground floor",
        description:
          description?.trim() ||
          "",
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Room created successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Create room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create room",
    });
  }
};


// ======================================================
// GET MY ROOMS
// ======================================================

export const getMyRooms = async (
  req,
  res
) => {
  try {
    const {
      pgId,
    } = req.query;

    if (!pgId) {
      return res.status(400).json({
        success: false,
        message:
          "PG ID is required",
      });
    }

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId:
          req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this PG",
      });
    }

    const roomList =
      await Room.find({
        pgId,
        isActive: true,
      })
        .sort({
          roomNumber: 1,
        })
        .lean();

    const roomIds =
      roomList.map(
        (room) =>
          room._id
      );

    let beds = [];

    if (roomIds.length) {
      beds =
        await Bed.find({
          pgId,
          roomId: {
            $in: roomIds,
          },
        })
          .populate(
            "tenantId",
            "name mobile"
          )
          .sort({
            bedNumber: 1,
          })
          .lean();
    }

    const rooms =
      roomList.map(
        (room) => ({
          ...room,

          beds:
            beds.filter(
              (bed) =>
                String(
                  bed.roomId
                ) ===
                String(
                  room._id
                )
            ),
        })
      );

    return res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error(
      "Get rooms error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch rooms",
    });
  }
};


// ======================================================
// UPDATE ROOM
// ======================================================

export const updateRoom = async (
  req,
  res
) => {
  try {
    const {
      roomId,
    } = req.params;

    const {
      roomNumber,
      roomType,
      monthlyRent,
      floor,
      description,
    } = req.body;

    if (
      !roomNumber ||
      monthlyRent ===
        undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Room number and monthly rent are required",
      });
    }

    const room =
      await Room.findById(
        roomId
      );

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const pg =
      await PG.findOne({
        _id: room.pgId,
        ownerId:
          req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this room",
      });
    }

    const cleanRoomNumber =
      roomNumber.trim();

    const duplicate =
      await Room.findOne({
        _id: {
          $ne: roomId,
        },
        pgId:
          room.pgId,
        roomNumber:
          cleanRoomNumber,
      });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message:
          "Another room with this number already exists",
      });
    }

    room.roomNumber =
      cleanRoomNumber;

    room.roomType =
      roomType ||
      "double";

    room.monthlyRent =
      Number(
        monthlyRent
      );

    room.floor =
      floor?.trim().toLowerCase() ||
      "ground floor";

    room.description =
      description?.trim() ||
      "";

    await room.save();

    return res.status(200).json({
      success: true,
      message:
        "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Update room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update room",
    });
  }
};


// ======================================================
// DELETE ROOM
// ======================================================

export const deleteRoom = async (
  req,
  res
) => {
  try {
    const {
      roomId,
    } = req.params;

    const room =
      await Room.findById(
        roomId
      );

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const pg =
      await PG.findOne({
        _id: room.pgId,
        ownerId:
          req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this room",
      });
    }

    const occupiedBeds =
      await Bed.countDocuments({
        roomId,
        status:
          "occupied",
      });

    if (occupiedBeds > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a room with occupied beds",
      });
    }

    await Bed.deleteMany({
      roomId,
    });

    await Room.findByIdAndDelete(
      roomId
    );

    return res.status(200).json({
      success: true,
      message:
        "Room deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete room",
    });
  }
};


// ======================================================
// ADD BED
// ======================================================

export const addBed = async (
  req,
  res
) => {
  try {
    const {
      roomId,
    } = req.params;

    const {
      pgId,
      bedNumber,
    } = req.body;

    if (
      !pgId ||
      !bedNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PG ID and bed number are required",
      });
    }

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
          "Room not found",
      });
    }

    const pg =
      await PG.findOne({
        _id: pgId,
        ownerId:
          req.user.userId,
      });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this PG",
      });
    }

    const cleanBedNumber =
      bedNumber.trim();

    const existingBed =
      await Bed.findOne({
        roomId,
        bedNumber:
          cleanBedNumber,
      });

    if (existingBed) {
      return res.status(400).json({
        success: false,
        message:
          "This bed number already exists in this room",
      });
    }

    const bed =
      await Bed.create({
        pgId,
        roomId,
        bedNumber:
          cleanBedNumber,
        status:
          "available",
        tenantId: null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Bed added successfully",
      bed,
    });
  } catch (error) {
    console.error(
      "Add bed error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add bed",
    });
  }
};


// ======================================================
// UPDATE BED STATUS
// ======================================================

export const updateBedStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        bedId,
      } = req.params;

      const {
        status,
      } = req.body;

      if (
        ![
          "available",
          "occupied",
          "maintenance",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid bed status",
        });
      }

      const bed =
        await Bed.findById(
          bedId
        );

      if (!bed) {
        return res.status(404).json({
          success: false,
          message:
            "Bed not found",
        });
      }

      const pg =
        await PG.findOne({
          _id: bed.pgId,
          ownerId:
            req.user.userId,
        });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this bed",
        });
      }

      if (
        bed.status ===
          "occupied" &&
        status !==
          "occupied"
      ) {
        bed.tenantId =
          null;
      }

      bed.status =
        status;

      await bed.save();

      return res.status(200).json({
        success: true,
        message:
          "Bed status updated successfully",
        bed,
      });
    } catch (error) {
      console.error(
        "Update bed status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update bed status",
      });
    }
  };