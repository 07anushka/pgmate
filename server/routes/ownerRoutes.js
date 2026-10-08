import express from "express";

import {
  createOwner,
  getOwners,
} from "../controllers/ownerController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";


const router = express.Router();


// =====================================================
// CREATE OWNER
// Only Super Admin can create owners
// =====================================================

router.post(
  "/",
  protect,
  authorizeRoles("super_admin"),
  createOwner
);


// =====================================================
// GET ALL OWNERS
// Only Super Admin can view owners
// =====================================================

router.get(
  "/",
  protect,
  authorizeRoles("super_admin"),
  getOwners
);


export default router;