import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import pgIllustration from "../assets/pg-illustration.png";
import "./LandingPage.css";

function LandingPage() {
  const goToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <main className="landing-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="landing-navbar">

        <motion.div
          className="landing-logo"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          <div className="landing-logo-mark">
            <Building2
              size={25}
              strokeWidth={2.4}
            />
          </div>

          <div className="landing-logo-text">

            <span className="landing-logo-pg">
              PG
            </span>

            <span className="landing-logo-mate">
              mate
            </span>

          </div>

        </motion.div>


        <div className="landing-nav-links">

          <a href="#home">
            Home
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#about">
            About
          </a>

        </div>


        <button
          className="landing-login-nav"
          onClick={goToLogin}
        >
          Login
          <ArrowRight size={17} />
        </button>

      </nav>


      {/* =====================================================
          HERO SECTION
      ===================================================== */}

      <section
        className="landing-hero"
        id="home"
      >

        {/* Background decorations */}

        <div className="hero-circle hero-circle-one"></div>

        <div className="hero-circle hero-circle-two"></div>

        <div className="hero-circle hero-circle-three"></div>


        {/* =================================================
            HERO CONTENT
        ================================================= */}

        <motion.div
          className="hero-content"

          initial={{
            opacity: 0,
            x: -35,
          }}

          animate={{
            opacity: 1,
            x: 0,
          }}

          transition={{
            duration: 0.7,
          }}
        >

          <div className="hero-badge">

            <ShieldCheck size={16} />

            <span>
              Smart &amp; Secure PG Management
            </span>

          </div>


          <h1>
            Manage your PG.
            <br />

            <span>
              Monitor everything.
            </span>

            <br />

            Grow with ease.
          </h1>


          <p className="hero-description">
            PGmate brings property management,
            tenant management and payments
            together in one simple platform.
          </p>


          <div className="hero-buttons">

            <button
              className="hero-primary-button"
              onClick={goToLogin}
            >

              <span>
                Get Started
              </span>

              <ArrowRight size={20} />

            </button>


            <button
              className="hero-secondary-button"
              onClick={goToLogin}
            >
              Login
            </button>

          </div>


          <div className="hero-trust">

            <div>
              <CheckCircle2 size={16} />
              Easy to manage
            </div>

            <div>
              <CheckCircle2 size={16} />
              Secure
            </div>

            <div>
              <CheckCircle2 size={16} />
              Built for PGs
            </div>

          </div>

        </motion.div>


        {/* =================================================
            HERO IMAGE
        ================================================= */}

        <motion.div
          className="hero-image-area"

          initial={{
            opacity: 0,
            x: 35,
            scale: 0.95,
          }}

          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
          }}

          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
        >

          <div className="hero-image-background"></div>

          <div className="hero-image-wrapper">

            <img
              src={pgIllustration}
              alt="PG accommodation illustration"
              className="hero-image"
            />

          </div>


          {/* Floating card */}

          <motion.div
            className="hero-floating-card"

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.6,
              delay: 0.8,
            }}
          >

            <div className="floating-card-icon">
              <Building2 size={20} />
            </div>

            <div>

              <strong>
                Your PG, simplified.
              </strong>

              <span>
                Manage everything in one place
              </span>

            </div>

          </motion.div>

        </motion.div>

      </section>


      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section
        className="landing-features"
        id="features"
      >

        <div className="section-heading">

          <span>
            POWERFUL &amp; SIMPLE
          </span>

          <h2>
            Everything your PG needs
          </h2>

          <p>
            One platform to keep your everyday
            PG operations organized.
          </p>

        </div>


        <div className="features-grid">


          {/* Property */}

          <motion.div
            className="feature-card"

            whileHover={{
              y: -7,
            }}
          >

            <div className="feature-icon">
              <Building2 size={25} />
            </div>

            <h3>
              Property Management
            </h3>

            <p>
              Keep your PG property,
              rooms and daily operations
              organized in one place.
            </p>

          </motion.div>


          {/* Tenant */}

          <motion.div
            className="feature-card"

            whileHover={{
              y: -7,
            }}
          >

            <div className="feature-icon">
              <Users size={25} />
            </div>

            <h3>
              Tenant Management
            </h3>

            <p>
              Manage tenant information,
              occupancy and important
              details with ease.
            </p>

          </motion.div>


          {/* Payments */}

          <motion.div
            className="feature-card"

            whileHover={{
              y: -7,
            }}
          >

            <div className="feature-icon">
              <CreditCard size={25} />
            </div>

            <h3>
              Payment Tracking
            </h3>

            <p>
              Keep track of rent and
              payment information without
              the usual paperwork.
            </p>

          </motion.div>

        </div>

      </section>


      {/* =====================================================
          ABOUT / CTA
      ===================================================== */}

      <section
        className="landing-cta"
        id="about"
      >

        <div className="cta-content">

          <ShieldCheck size={28} />

          <h2>
            Ready to simplify your PG management?
          </h2>

          <p>
            Get started with PGmate and keep
            everything organized in one place.
          </p>

          <button
            className="cta-button"
            onClick={goToLogin}
          >

            Login to PGmate

            <ArrowRight size={19} />

          </button>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="landing-footer">

        <div className="footer-logo">

          <div className="footer-logo-mark">
            <Building2 size={18} />
          </div>

          <span>
            PG<span>mate</span>
          </span>

        </div>


        <p>
          Manage. Monitor. Grow.
        </p>


        <div className="footer-links">

          <button>
            Terms &amp; Services
          </button>

          <span>
            •
          </span>

          <button>
            Privacy Policy
          </button>

        </div>

      </footer>

    </main>
  );
}

export default LandingPage;