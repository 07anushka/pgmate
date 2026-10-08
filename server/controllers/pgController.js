import PG from "../models/PG.js";


// =====================================================
// GET MY PGs
// =====================================================

export const getMyPGs = async (req, res) => {
  try {
    const pgs = await PG.find({
      ownerId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      pgs,
    });
  } catch (error) {
    console.error("Get PGs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch PGs",
    });
  }
};


// =====================================================
// CREATE PG
// =====================================================

export const createPG = async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      contactNumber,
      description,
    } = req.body;

    if (
      !name ||
      !address ||
      !city ||
      !state ||
      !contactNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, address, city, state and contact number are required",
      });
    }

    const pg = await PG.create({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      contactNumber: contactNumber.trim(),
      description: description?.trim() || "",
      ownerId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "PG created successfully",
      pg,
    });
  } catch (error) {
    console.error("Create PG error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create PG",
    });
  }
};


// =====================================================
// UPDATE PG
// =====================================================

export const updatePG = async (req, res) => {
  try {
    const { pgId } = req.params;

    const {
      name,
      address,
      city,
      state,
      contactNumber,
      description,
    } = req.body;

    const pg = await PG.findOne({
      _id: pgId,
      ownerId: req.user.userId,
    });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found",
      });
    }

    if (name !== undefined) {
      pg.name = name.trim();
    }

    if (address !== undefined) {
      pg.address = address.trim();
    }

    if (city !== undefined) {
      pg.city = city.trim();
    }

    if (state !== undefined) {
      pg.state = state.trim();
    }

    if (contactNumber !== undefined) {
      pg.contactNumber = contactNumber.trim();
    }

    if (description !== undefined) {
      pg.description = description.trim();
    }

    await pg.save();

    return res.status(200).json({
      success: true,
      message: "PG updated successfully",
      pg,
    });
  } catch (error) {
    console.error("Update PG error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update PG",
    });
  }
};


// =====================================================
// DELETE PG
// =====================================================

export const deletePG = async (req, res) => {
  try {
    const { pgId } = req.params;

    const pg = await PG.findOne({
      _id: pgId,
      ownerId: req.user.userId,
    });

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found",
      });
    }

    await PG.deleteOne({
      _id: pgId,
      ownerId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "PG deleted successfully",
    });
  } catch (error) {
    console.error("Delete PG error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete PG",
    });
  }
};