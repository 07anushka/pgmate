import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const existingSuperAdmin = await User.findOne({
      role: "super_admin",
    });

    if (existingSuperAdmin) {
      console.log("A Super Admin already exists.");
      process.exit(0);
    }

    const password = "Admin@123";

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const superAdmin = await User.create({
      name: "PGmate Super Admin",
      mobile: "9999999999",
      password: hashedPassword,
      role: "super_admin",
      createdBy: null,
    });

    console.log("=================================");
    console.log("Super Admin created successfully");
    console.log("=================================");
    console.log(`Name: ${superAdmin.name}`);
    console.log(`Mobile: ${superAdmin.mobile}`);
    console.log(`Password: ${password}`);
    console.log("=================================");

    process.exit(0);
  } catch (error) {
    console.error(
      "Failed to create Super Admin:",
      error.message
    );

    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

createSuperAdmin();