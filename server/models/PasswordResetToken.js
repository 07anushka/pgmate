
import mongoose from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        otpHash: {
            type: String,
            default: null,
        },
        otpExpiresAt: {
            type: Date,
            default: null,
        },
        lastSentAt: {
            type: Date,
            default: null,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        resetTokenHash: {
            type: String,
            default: null,
        },
        resetTokenExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model(
    "PasswordResetToken",
    passwordResetTokenSchema
);
