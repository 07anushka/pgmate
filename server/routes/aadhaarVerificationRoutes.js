
import express from "express";

import {
  getAadhaarVerificationStatus,
  verifyAadhaarOfflineKyc,
} from "../controllers/aadhaarVerificationController.js";

const router = express.Router();

/*
 * GET /api/aadhaar-verification/status
 * Checks whether the verification certificate is readable.
 *
 * This does NOT mean Aadhaar verification is implemented.
 */
router.get("/status", getAadhaarVerificationStatus);

/*
 * POST /api/aadhaar-verification/offline-kyc
 * Intentionally returns HTTP 501 until actual UIDAI signature
 * verification has been implemented and tested.
 */
router.post("/offline-kyc", verifyAadhaarOfflineKyc);

export default router;
