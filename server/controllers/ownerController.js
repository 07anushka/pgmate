import bcrypt from "bcryptjs";

import User from "../models/User.js";


// =====================================================
// CREATE OWNER
// =====================================================

export const createOwner = async (req, res) => {
  try {

    const {
      name,
      mobile,
      password,
    } = req.body;


    // -----------------------------
    // Validate input
    // -----------------------------

    if (!name || !mobile || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Name, mobile number and password are required.",
      });

    }


    // -----------------------------
    // Check if mobile already exists
    // -----------------------------

    const existingUser =
      await User.findOne({ mobile });


    if (existingUser) {

      return res.status(409).json({
        success: false,
        message:
          "A user with this mobile number already exists.",
      });

    }


    // -----------------------------
    // Hash password
    // -----------------------------

    const hashedPassword =
      await bcrypt.hash(password, 12);


    // -----------------------------
    // Create owner
    // -----------------------------

    const owner = await User.create({

      name,

      mobile,

      password: hashedPassword,

      role: "owner",

      // Super Admin who created this owner
      createdBy: req.user._id,

    });


    // -----------------------------
    // Send response
    // -----------------------------

    return res.status(201).json({

      success: true,

      message: "Owner created successfully.",

      owner: {

        id: owner._id,

        name: owner.name,

        mobile: owner.mobile,

        role: owner.role,

        createdBy: owner.createdBy,

        createdAt: owner.createdAt,

      },

    });


  } catch (error) {

    console.error(
      "Create owner error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Server error while creating owner.",

    });

  }
};



// =====================================================
// GET ALL OWNERS
// =====================================================

export const getOwners = async (req, res) => {

  try {

    const owners = await User.find({
      role: "owner",
    })
      .select("-password")
      .sort({
        createdAt: -1,
      });


    return res.status(200).json({

      success: true,

      count: owners.length,

      owners,

    });


  } catch (error) {

    console.error(
      "Get owners error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Server error while fetching owners.",

    });

  }

};