// Add these imports at the top of routes/authRoutes.js:
import crypto from "crypto";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { sendPasswordResetOtp } from "../utils/email.js";

// Add these routes before `export default router;`.
// Requires `nodemailer` and SMTP environment variables.
const RESET_OTP_TTL_MS = 60 * 1000;
const RESEND_DELAY_MS = 30 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const validEmail = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

router.post("/forgot-password/send-otp", async (req, res) => {
  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a password reset code will be sent.",
  };

  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email }).select("_id email");
    // Do not disclose whether an email is registered.
    if (!user) return res.status(200).json(genericResponse);

    const now = new Date();
    let record = await PasswordResetToken.findOne({ userId: user._id });

    if (record && now.getTime() - record.lastSentAt.getTime() < RESEND_DELAY_MS) {
      // Keep resend behavior generic to avoid revealing whether an email is registered.
      return res.status(200).json(genericResponse);
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    if (!record) {
      record = new PasswordResetToken({
        userId: user._id,
        email,
        otpHash: sha256(otp),
        otpExpiresAt: new Date(now.getTime() + RESET_OTP_TTL_MS),
        lastSentAt: now,
        attempts: 0,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      });
    } else {
      record.email = email;
      record.otpHash = sha256(otp);
      record.otpExpiresAt = new Date(now.getTime() + RESET_OTP_TTL_MS);
      record.lastSentAt = now;
      record.attempts = 0;
      record.resetTokenHash = null;
      record.resetTokenExpiresAt = null;
    }

    await record.save();
    await sendPasswordResetOtp(email, otp);
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password send OTP error:", error.message);
    // Do not report success if the email provider failed, but keep the message generic.
    return res.status(503).json({
      success: false,
      message: "Unable to send a reset code right now. Please try again later.",
    });
  }
});

router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "");

    if (!validEmail(email) || !/^\\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Enter a valid email and 6-digit code." });
    }

    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    const record = await PasswordResetToken.findOne({ userId: user._id });
    if (!record || record.email !== email || record.otpExpiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new code." });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new code." });
    }

    if (sha256(otp) !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "OTP did not match. Please try again." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    record.otpHash = "used";
    record.otpExpiresAt = new Date(0);
    record.resetTokenHash = sha256(resetToken);
    record.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await record.save();

    return res.json({ success: true, resetToken });
  } catch (error) {
    console.error("Forgot password verify OTP error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify the code. Please try again." });
  }
});

router.post("/forgot-password/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!validEmail(email) || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const user = await User.findOne({ email }).select("_id");
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset session." });

    const record = await PasswordResetToken.findOne({ userId: user._id });
    if (
      !record ||
      record.email !== email ||
      !record.resetTokenHash ||
      !record.resetTokenExpiresAt ||
      record.resetTokenExpiresAt <= new Date() ||
      sha256(String(resetToken)) !== record.resetTokenHash
    ) {
      return res.status(400).json({ success: false, message: "Reset session expired. Verify a new code." });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
    await PasswordResetToken.deleteOne({ _id: record._id });

    return res.json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset password." });
  }
});
