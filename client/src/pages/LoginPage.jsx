
import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import pgIllustration from "../assets/pg-illustration.png";
import { useAuth } from "../context/AuthContext";
import { loginApi } from "../services/api";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!mobileNumber || !password) {
      setError("Please enter your mobile number and password.");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(mobileNumber, password);

      login(data.user, data.token);

      if (data.user.role === "super_admin") {
        navigate("/super-admin");
      } else if (data.user.role === "owner") {
        navigate("/owner");
      } else if (data.user.role === "tenant") {
        navigate("/tenant");
      } else {
        setError("Invalid user role.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pg-login-page">
      <div className="pg-login-container">
        {/* LEFT SIDE */}
        <section className="pg-login-left">
          <div className="left-decoration decoration-one" />
          <div className="left-decoration decoration-two" />
          <div className="left-decoration decoration-three" />

          <motion.div
            className="pgmate-logo desktop-logo"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pgmate-logo-mark">
              <Building2 size={28} strokeWidth={2.4} />
            </div>

            <div className="pgmate-logo-text">
              <span className="logo-pg">PG</span>
              <span className="logo-mate">mate</span>
              <small>Manage. Monitor. Grow.</small>
            </div>
          </motion.div>

          <motion.div
            className="pg-illustration-wrapper"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <img
              src={pgIllustration}
              alt="PG accommodation illustration"
              className="pg-illustration"
            />
          </motion.div>

          <motion.div
            className="left-bottom-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <div className="secure-badge">
              <ShieldCheck size={17} />
              <span>Secure PG Management</span>
            </div>

            <p>
              Manage your property, tenants, payments and daily PG
              operations from one place.
            </p>
          </motion.div>
        </section>

        {/* RIGHT SIDE */}
        <section className="pg-login-right">
          <motion.div
            className="pgmate-logo mobile-logo"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pgmate-logo-mark">
              <Building2 size={25} strokeWidth={2.4} />
            </div>

            <div className="pgmate-logo-text">
              <span className="logo-pg">PG</span>
              <span className="logo-mate">mate</span>
              <small>Manage. Monitor. Grow.</small>
            </div>
          </motion.div>

          <div className="login-curve">
            <svg
              viewBox="0 0 180 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M 0 0 L 58 0 C 112 120, 150 245, 126 370 C 108 470, 45 530, 56 625 C 68 735, 125 835, 70 1000 L 0 1000 Z"
                fill="#f8fffd"
              />
            </svg>
          </div>

          <div className="right-shape right-shape-one" />
          <div className="right-shape right-shape-two" />
          <div className="right-shape right-shape-three" />

          {/* FORM OR FORGOT PASSWORD — SAME GREEN PANEL */}
          <motion.div
            className={`login-content ${
              showForgotPassword ? "login-content-forgot" : ""
            }`}
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {showForgotPassword ? (
              <ForgotPasswordModal
                initialMobile={mobileNumber}
                onClose={() => {
                  setShowForgotPassword(false);
                  setError("");
                }}
                embedded
              />
            ) : (
              <>
                <div className="login-title">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                  >
                    Login
                  </motion.h1>

                  <p>Login to continue to your PGmate account.</p>
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    {error}
                  </div>
                )}

                <form
                  className="pg-login-form"
                  onSubmit={handleLogin}
                >
                  <div className="pg-input-group">
                    <label htmlFor="mobileNumber">
                      Mobile Number
                    </label>

                    <div className="pg-input-wrapper">
                      <User
                        size={20}
                        strokeWidth={2}
                        className="pg-input-icon"
                      />

                      <input
                        id="mobileNumber"
                        type="tel"
                        inputMode="numeric"
                        placeholder="Enter your mobile number"
                        value={mobileNumber}
                        onChange={(event) =>
                          setMobileNumber(event.target.value)
                        }
                        autoComplete="tel"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="pg-input-group">
                    <label htmlFor="password">Password</label>

                    <div className="pg-input-wrapper">
                      <Lock
                        size={20}
                        strokeWidth={2}
                        className="pg-input-icon"
                      />

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        autoComplete="current-password"
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="show-password-button"
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="forgot-row">
                    <button
                      type="button"
                      className="forgot-button"
                      onClick={() => {
                        setError("");
                        setShowForgotPassword(true);
                      }}
                      disabled={loading}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    className="pg-login-button"
                    whileHover={
                      !loading ? { scale: 1.015, y: -2 } : {}
                    }
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    disabled={loading}
                  >
                    <span>
                      {loading ? "Signing in..." : "Login"}
                    </span>

                    {!loading && (
                      <ArrowRight size={21} strokeWidth={2.3} />
                    )}
                  </motion.button>
                </form>

                <div className="login-security">
                  <ShieldCheck size={18} />
                  <span>
                    Your account information is securely protected.
                  </span>
                </div>

                <div className="login-footer">
                  <button type="button">Terms &amp; Services</button>
                  <span>•</span>
                  <button type="button">Privacy Policy</button>
                </div>
              </>
            )}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
