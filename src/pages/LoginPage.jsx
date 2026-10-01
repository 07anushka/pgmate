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
import pgIllustration from "../assets/pg-illustration.png";
import "./LoginPage.css";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    // Backend authentication will be connected here later.
    console.log("Login:", {
      username,
      password,
    });
  };

  return (
    <main className="pg-login-page">
      <div className="pg-login-container">

        {/* =========================================
            LEFT SIDE
        ========================================= */}
        <section className="pg-login-left">

          {/* Decorative background */}
          <div className="left-decoration decoration-one"></div>
          <div className="left-decoration decoration-two"></div>
          <div className="left-decoration decoration-three"></div>

          {/* Logo */}
          <motion.div
            className="pgmate-logo"
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

              <small>
                Manage. Monitor. Grow.
              </small>
            </div>
          </motion.div>

          {/* Illustration */}
          <motion.div
            className="pg-illustration-wrapper"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.15,
            }}
          >
            <img
              src={pgIllustration}
              alt="PG accommodation illustration"
              className="pg-illustration"
            />
          </motion.div>

          {/* Small left information */}
          <motion.div
            className="left-bottom-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.35,
            }}
          >
            <div className="secure-badge">
              <ShieldCheck size={17} />
              <span>Secure PG Management</span>
            </div>

            <p>
              Manage your property, tenants, payments
              and daily PG operations from one place.
            </p>
          </motion.div>
        </section>

        {/* =========================================
            RIGHT SIDE
        ========================================= */}
        <section className="pg-login-right">

          {/* Decorative shapes */}
          <div className="right-shape right-shape-one"></div>
          <div className="right-shape right-shape-two"></div>
          <div className="right-shape right-shape-three"></div>

          <motion.div
            className="login-content"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
          >

            {/* Login heading */}
            <div className="login-title">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.25,
                }}
              >
                Login
              </motion.h1>

              <p>
                Welcome back! Login to continue
                to your PGmate account.
              </p>
            </div>

            {/* Form */}
            <form
              className="pg-login-form"
              onSubmit={handleLogin}
            >

              {/* Username */}
              <div className="pg-input-group">
                <label htmlFor="username">
                  Username / Email / Tenant ID
                </label>

                <div className="pg-input-wrapper">

                  <User
                    size={20}
                    strokeWidth={2}
                    className="pg-input-icon"
                  />

                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    autoComplete="username"
                    required
                  />

                </div>
              </div>

              {/* Password */}
              <div className="pg-input-group">
                <label htmlFor="password">
                  Password
                </label>

                <div className="pg-input-wrapper">

                  <Lock
                    size={20}
                    strokeWidth={2}
                    className="pg-input-icon"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>
              </div>

              {/* Forgot password */}
              <div className="forgot-row">
                <button
                  type="button"
                  className="forgot-button"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login button */}
              <motion.button
                type="submit"
                className="pg-login-button"
                whileHover={{
                  scale: 1.015,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
              >
                <span>Login</span>

                <ArrowRight
                  size={21}
                  strokeWidth={2.3}
                />
              </motion.button>
            </form>

            {/* Contact owner */}
            <div className="contact-owner">
              <p>
                Don't have an account?
              </p>

              <button
                type="button"
                className="contact-owner-button"
              >
                Contact Owner
              </button>
            </div>

            {/* Security message */}
            <div className="login-security">
              <ShieldCheck size={18} />

              <span>
                Your account information is securely
                protected.
              </span>
            </div>

            {/* Footer */}
            <div className="login-footer">
              <button type="button">
                Terms &amp; Services
              </button>

              <span>•</span>

              <button type="button">
                Privacy Policy
              </button>
            </div>

          </motion.div>
        </section>

      </div>
    </main>
  );
}

export default LoginPage;