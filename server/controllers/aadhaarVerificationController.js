
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/*
 * PGmate Aadhaar Verification Controller
 *
 * IMPORTANT:
 * This file is a safe starting point, not a completed UIDAI verifier.
 * A readable certificate or decoded QR/XML does not prove authenticity.
 * Do not return verified identity fields until the correct UIDAI
 * signature-verification implementation has been completed and tested.
 */

const certificatePath = path.resolve(
  process.cwd(),
  "certificates",
  "uidai_offline_publickey_2026.cer"
);

export const getAadhaarVerificationStatus = (req, res) => {
  let certificateAvailable = false;
  let certificateReadable = false;
  let certificateWithinDates = false;

  try {
    if (fs.existsSync(certificatePath)) {
      certificateAvailable = true;

      const certificateText = fs.readFileSync(
        certificatePath,
        "utf8"
      );

      const certificate = new crypto.X509Certificate(
        certificateText
      );

      certificateReadable = true;

      const now = Date.now();

      certificateWithinDates =
        now >= Date.parse(certificate.validFrom) &&
        now <= Date.parse(certificate.validTo);
    }
  } catch (error) {
    console.error(
      "Aadhaar certificate inspection failed:",
      error.message
    );
  }

  return res.status(200).json({
    success: true,
    verificationImplemented: false,
    certificateAvailable,
    certificateReadable,
    certificateWithinDates,
    message:
      "Certificate inspection is available. Aadhaar signature verification is not implemented.",
  });
};

/*
 * This endpoint intentionally refuses verification requests.
 * Replace this handler only after implementing and testing the
 * correct UIDAI offline e-KYC signature verification process.
 */
export const verifyAadhaarOfflineKyc = (req, res) => {
  return res.status(501).json({
    success: false,
    verified: false,
    code: "VERIFICATION_NOT_IMPLEMENTED",
    message:
      "Aadhaar offline e-KYC verification is not available yet. No identity data has been verified.",
  });
};
