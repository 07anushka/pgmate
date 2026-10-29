
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { forgotPasswordApi } from "../services/forgotPasswordApi";
import "./ForgotPasswordModal.css";

const OTP_LENGTH = 6;
const OTP_EXPIRY = 60;
const RESEND_DELAY = 30;

export default function ForgotPasswordModal({
  initialEmail = "",
  onClose,
}) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY);
  const [resendIn, setResendIn] = useState(RESEND_DELAY);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shake, setShake] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (step !== "otp") return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, loading]);

  const cleanEmail = email.trim().toLowerCase();
  const otpValue = otp.join("");

  function showError(message) {
    setError(message);
    setShake(false);

    window.setTimeout(() => setShake(true), 10);
    window.setTimeout(() => setShake(false), 500);
  }

  async function sendOtp(event) {
    event?.preventDefault();
    setError("");
    setNotice("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      await forgotPasswordApi.sendOtp(cleanEmail);

      setOtp(Array(OTP_LENGTH).fill(""));
      setSecondsLeft(OTP_EXPIRY);
      setResendIn(RESEND_DELAY);
      setStep("otp");

      setNotice(
        "If this email is registered, an OTP will be sent."
      );

      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      showError(err.message || "Unable to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateOtp(index, rawValue) {
    setError("");

    const digits = rawValue.replace(/\D/g, "");

    // Support pasting the complete six-digit OTP.
    if (digits.length > 1) {
      const pastedDigits = digits.slice(0, OTP_LENGTH).split("");

      setOtp((previous) => {
        const next = [...previous];

        pastedDigits.forEach((digit, position) => {
          next[position] = digit;
        });

        return next;
      });

      inputRefs.current[
        Math.min(pastedDigits.length, OTP_LENGTH - 1)
      ]?.focus();

      return;
    }

    setOtp((previous) => {
      const next = [...previous];
      next[index] = digits;
      return next;
    });

    if (digits && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, event) {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError("");

    // Do not call the backend if all six digits are not entered.
    if (otp.some((digit) => !digit) || otpValue.length !== OTP_LENGTH) {
      showError("Please enter all 6 digits of the OTP.");
      return;
    }

    if (secondsLeft <= 0) {
      showError("OTP expired. Please request a new OTP.");
      return;
    }

    try {
      setLoading(true);

      const result = await forgotPasswordApi.verifyOtp(
        cleanEmail,
        otpValue
      );

      if (!result?.resetToken) {
        throw new Error("OTP verification failed. Please try again.");
      }

      setResetToken(result.resetToken);
      setStep("reset");
      setError("");
      setNotice("");
    } catch (err) {
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();

      showError(
        err.message || "OTP did not match. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendIn > 0 || loading || secondsLeft > 0) return;
    await sendOtp();
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      showError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match. Please check again.");
      return;
    }

    try {
      setLoading(true);

      await forgotPasswordApi.resetPassword({
        email: cleanEmail,
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep("done");
      setNotice("Your password has been reset successfully.");
    } catch (err) {
      showError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fp-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="fp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-title"
      >
        <button
          className="fp-close"
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="fp-icon">
          <ShieldCheck size={25} />
        </div>

        <p className="fp-eyebrow">PGMATE ACCOUNT SECURITY</p>

        <h2 id="fp-title">
          {step === "email" && "Forgot password?"}
          {step === "otp" && "Verify your email"}
          {step === "reset" && "Create a new password"}
          {step === "done" && "Password updated"}
        </h2>

        <p className="fp-subtitle">
          {step === "email" &&
            "Enter your registered email address to receive an OTP."}

          {step === "otp" && (
            <>
              Enter the 6-digit code sent to{" "}
              <strong>{cleanEmail}</strong>.
            </>
          )}

          {step === "reset" &&
            "Choose a new password for your PGmate account."}

          {step === "done" &&
            "You can now sign in using your new password."}
        </p>

        {error && (
          <div
            className={`fp-message fp-error ${
              shake ? "fp-shake" : ""
            }`}
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && (
          <div className="fp-message fp-notice" role="status">
            {notice}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={sendOtp} className="fp-form">
            <label htmlFor="fp-email">Email address</label>

            <div className="fp-input-wrap">
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
              />
            </div>

            <button
              className="fp-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="fp-form">
            <label htmlFor="fp-otp-0">6-digit OTP</label>

            <div className="fp-otp-row">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  id={`fp-otp-${index}`}
                  className="fp-otp-box"
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0 ? "one-time-code" : "off"
                  }
                  maxLength={6}
                  value={digit}
                  aria-label={`OTP digit ${index + 1}`}
                  onChange={(event) =>
                    updateOtp(index, event.target.value)
                  }
                  onKeyDown={(event) =>
                    handleOtpKeyDown(index, event)
                  }
                  onPaste={(event) => {
                    event.preventDefault();
                    updateOtp(
                      index,
                      event.clipboardData.getData("text")
                    );
                  }}
                />
              ))}
            </div>

            <div className="fp-timers">
              <span
                className={
                  secondsLeft <= 10 ? "fp-time-warning" : ""
                }
              >
                Expires in{" "}
                <strong>
                  00:{String(secondsLeft).padStart(2, "0")}
                </strong>
              </span>

              <button
                type="button"
                className="fp-text-button"
                onClick={resendOtp}
                disabled={
                  resendIn > 0 || loading || secondsLeft > 0
                }
              >
                {resendIn > 0
                  ? `Resend in ${resendIn}s`
                  : secondsLeft > 0
                    ? "Wait for expiry"
                    : "Resend OTP"}
              </button>
            </div>

            <button
              className="fp-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="fp-back-button"
              onClick={() => {
                setStep("email");
                setError("");
                setNotice("");
              }}
            >
              <ArrowLeft size={16} />
              Change email address
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="fp-form">
            <label htmlFor="fp-new-password">New password</label>

            <div className="fp-password-wrap">
              <LockKeyhole size={18} />

              <input
                id="fp-new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="At least 8 characters"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword((value) => !value)
                }
                aria-label="Toggle new password visibility"
              >
                {showNewPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <label htmlFor="fp-confirm-password">
              Confirm new password
            </label>

            <div className="fp-password-wrap">
              <LockKeyhole size={18} />

              <input
                id="fp-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Re-enter new password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <p className="fp-password-hint">
              Use at least 8 characters.
            </p>

            <button
              className="fp-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating password..." : "Reset password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <button
            className="fp-primary"
            type="button"
            onClick={onClose}
          >
            Back to login
          </button>
        )}
      </section>
    </div>
  );
}
