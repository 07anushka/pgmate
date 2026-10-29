
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { sendPasswordResetOtp } from "../utils/email.js";

const router = express.Router();

const OTP_TTL_MS = 60 * 1000;
const RESEND_DELAY_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const createOtp = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const createResetToken = () =>
  crypto.randomBytes(32).toString("hex");

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// POST /api/auth/forgot-password/send-otp
router.post("/send-otp", async (req, res) => {
  console.log("Forgot password request body:", req.body);
  console.log("Received email:", req.body?.email);

  const email = normalizeEmail(req.body?.email);

  console.log("Normalized email:", JSON.stringify(email));
  console.log("Email validation result:", validEmail(email));

  if (!validEmail(email)) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  try {
    const user = await User.findOne({ email });

    // Do not reveal whether an account exists.
    if (!user) {
      return res.json({
        message: "If this email is registered, an OTP will be sent.",
      });
    }

    const existing = await PasswordResetToken.findOne({
      userId: user._id,
    });

    if (
      existing?.lastSentAt &&
      Date.now() - existing.lastSentAt.getTime() < RESEND_DELAY_MS
    ) {
      return res.status(429).json({
        message: "Please wait 30 seconds before requesting another OTP.",
      });
    }

    const otp = createOtp();
    const now = new Date();

    // Send first so a mail failure does not overwrite an existing session.
    await sendPasswordResetOtp(email, otp);

    await PasswordResetToken.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          email,
          otpHash: sha256(otp),
          otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
          lastSentAt: now,
          attempts: 0,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      message: "If this email is registered, an OTP will be sent.",
    });
  } catch (error) {
    console.error("Send email OTP error:", error);

    return res.status(503).json({
      message: "Unable to send OTP right now. Check your email configuration.",
    });
  }
});

// POST /api/auth/forgot-password/verify-otp
router.post("/verify-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "");

  if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message: "Enter a valid email and the complete 6-digit OTP.",
    });
  }

  try {
    const record = await PasswordResetToken.findOne({ email });

    if (
      !record ||
      !record.otpHash ||
      !record.otpExpiresAt ||
      record.otpExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    if (sha256(otp) !== record.otpHash) {
      record.attempts += 1;
      await record.save();

      return res.status(400).json({
        message: "OTP did not match. Please try again.",
      });
    }

    const resetToken = createResetToken();

    // Consume the OTP and issue a short-lived reset token.
    record.otpHash = null;
    record.otpExpiresAt = null;
    record.resetTokenHash = sha256(resetToken);
    record.resetTokenExpiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MS
    );
    record.attempts = 0;

    await record.save();

    return res.json({
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);

    return res.status(500).json({
      message: "Unable to verify OTP. Please try again.",
    });
  }
});

// POST /api/auth/forgot-password/reset-password
router.post("/reset-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { resetToken, newPassword, confirmPassword } = req.body || {};

  if (!validEmail(email)) {
    return res.status(400).json({
      message: "Invalid email address.",
    });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({
      message: "Password must contain at least 8 characters.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      message: "Passwords do not match.",
    });
  }

  if (typeof resetToken !== "string" || resetToken.length < 32) {
    return res.status(400).json({
      message: "Please verify your OTP again.",
    });
  }

  try {
    const record = await PasswordResetToken.findOne({ email });

    if (
      !record ||
      !record.resetTokenHash ||
      !record.resetTokenExpiresAt ||
      record.resetTokenExpiresAt.getTime() <= Date.now() ||
      sha256(resetToken) !== record.resetTokenHash
    ) {
      return res.status(400).json({
        message: "Reset session expired. Verify a new OTP.",
      });
    }

    const user = await User.findById(record.userId);

    if (!user || normalizeEmail(user.email) !== email) {
      return res.status(400).json({
        message: "Unable to reset this account's password.",
      });
    }

    // Assumes User.js does not hash passwords in a pre-save hook.
    // If it does, this line must be changed to avoid double hashing.
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    await PasswordResetToken.deleteOne({ _id: record._id });

    return res.json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset email password error:", error);

    return res.status(500).json({
      message: "Unable to reset password. Please try again.",
    });
  }
});

export default router;
