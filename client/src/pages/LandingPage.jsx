
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  BedDouble,
  Receipt,
  MessageSquare,
  Bell,
  Utensils,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Wallet,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

import pgIllustration from "../assets/pg-illustration.png";
import "./LandingPage.css";

const features = [
  {
    icon: Building2,
    title: "Property management",
    description:
      "Keep property information, rooms, beds, and daily operations organized.",
    number: "01",
  },
  {
    icon: Users,
    title: "Tenant management",
    description:
      "Maintain tenant profiles, joining details, emergency contacts, and occupancy.",
    number: "02",
  },
  {
    icon: CreditCard,
    title: "Rent and payments",
    description:
      "Track rent status, payment history, security deposits, and pending dues.",
    number: "03",
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description:
      "Record operating expenses and get a clearer picture of property finances.",
    number: "04",
  },
  {
    icon: MessageSquare,
    title: "Complaints",
    description:
      "Keep maintenance requests organized and follow their progress.",
    number: "05",
  },
  {
    icon: Bell,
    title: "Notices and updates",
    description:
      "Keep important announcements accessible to tenants in one place.",
    number: "06",
  },
  {
    icon: Utensils,
    title: "Food menu",
    description:
      "Make daily meal information easy for tenants to find.",
    number: "07",
  },
  {
    icon: ShieldCheck,
    title: "Account and access",
    description:
      "Provide role-based access to the information relevant to each user.",
    number: "08",
  },
];

const faqs = [
  {
    question: "What is PGmate?",
    answer:
      "PGmate is a property management platform designed to help PG owners organize properties, rooms, tenants, rent information, expenses, and everyday communication.",
  },
  {
    question: "Can tenants use PGmate too?",
    answer:
      "Yes. Tenants can access the features available to their account, such as their profile, payment information, notices, food menu, and complaints.",
  },
  {
    question: "Can I manage multiple PG properties?",
    answer:
      "PGmate is designed around property management workflows. The properties available to an owner depend on their account and the features enabled for it.",
  },
  {
    question: "Does viewing a tenant document mean it is verified?",
    answer:
      "No. Viewing an uploaded document is different from verifying its authenticity. Official identity verification requires an appropriate authorized verification process.",
  },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const goToLogin = () => {
    window.location.href = "/login";
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing-page">
      {/* NAVIGATION */}
      <nav className="landing-navbar">
        <a
          href="#home"
          className="landing-logo"
          aria-label="PGmate home"
          onClick={closeMenu}
        >
          <div className="landing-logo-mark">
            <Building2 size={24} strokeWidth={2.3} />
          </div>

          <div className="landing-logo-text">
            <span className="landing-logo-pg">PG</span>
            <span className="landing-logo-mate">mate</span>
          </div>
        </a>

        <div className={`landing-nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#about" onClick={closeMenu}>About</a>

          <button
            className="mobile-nav-login"
            onClick={goToLogin}
          >
            Login <ArrowRight size={16} />
          </button>
        </div>

        <button
          className="landing-login-nav"
          onClick={goToLogin}
        >
          Login <ArrowRight size={17} />
        </button>

        <button
          className="landing-menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* HERO */}
      <section className="landing-hero" id="home">
        <div className="hero-circle hero-circle-one" />
        <div className="hero-circle hero-circle-two" />
        <div className="hero-circle hero-circle-three" />

        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>A smarter way to manage your PG</span>
          </div>

          <h1>
            Your PG.
            <br />
            <span>One organized</span>
            <br />
            experience.
          </h1>

          <p className="hero-description">
            From rooms and tenants to rent, expenses, and everyday updates,
            bring your PG operations together with PGmate.
          </p>

          <div className="hero-buttons">
            <button
              className="hero-primary-button"
              onClick={goToLogin}
            >
              Get started <ArrowRight size={19} />
            </button>

            <a
              href="#features"
              className="hero-secondary-button"
            >
              Explore features
            </a>
          </div>

          <div className="hero-trust">
            <div><CheckCircle2 size={16} /> Organized operations</div>
            <div><CheckCircle2 size={16} /> Owner and tenant access</div>
            <div><CheckCircle2 size={16} /> One central workspace</div>
          </div>
        </motion.div>

        <motion.div
          className="hero-image-area"
          initial={{ opacity: 0, x: 30, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="hero-image-background" />

          <div className="hero-image-wrapper">
            <img
              src={pgIllustration}
              alt="Illustration of PG accommodation"
              className="hero-image"
            />
          </div>

          <motion.div
            className="hero-floating-card"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="floating-card-icon">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <strong>Everything in one place</strong>
              <span>Properties · Tenants · Payments</span>
            </div>
          </motion.div>

          <div className="hero-mini-card hero-mini-card-top">
            <div className="hero-mini-icon">
              <Users size={17} />
            </div>
            <div>
              <span>Tenant records</span>
              <strong>Easy to access</strong>
            </div>
          </div>

          <div className="hero-mini-card hero-mini-card-bottom">
            <div className="hero-mini-icon purple">
              <Wallet size={17} />
            </div>
            <div>
              <span>Rent tracking</span>
              <strong>Clear payment status</strong>
            </div>
          </div>
        </motion.div>
      </section>

      {/* VALUE STRIP */}
      <section className="landing-value-strip">
        <div>
          <span className="value-strip-icon"><Building2 size={20} /></span>
          <span><strong>Properties</strong><small>Keep your spaces organized</small></span>
        </div>
        <div>
          <span className="value-strip-icon"><BedDouble size={20} /></span>
          <span><strong>Rooms and beds</strong><small>See occupancy details</small></span>
        </div>
        <div>
          <span className="value-strip-icon"><CreditCard size={20} /></span>
          <span><strong>Payments</strong><small>Follow rent status</small></span>
        </div>
        <div>
          <span className="value-strip-icon"><MessageSquare size={20} /></span>
          <span><strong>Communication</strong><small>Keep tenants informed</small></span>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section className="landing-showcase" id="about">
        <div className="showcase-copy">
          <span className="section-eyebrow">YOUR PG AT A GLANCE</span>
          <h2>
            Less scattered information.
            <br />
            <span>More clarity every day.</span>
          </h2>
          <p>
            Bring important management tasks into one workspace. Move between
            property details, tenant records, and payment information without
            juggling separate lists.
          </p>

          <div className="showcase-checks">
            <div><CheckCircle2 size={18} /> View property and occupancy details</div>
            <div><CheckCircle2 size={18} /> Keep tenant information organized</div>
            <div><CheckCircle2 size={18} /> Review rent and payment status</div>
          </div>

          <button className="showcase-link" onClick={goToLogin}>
            Open your workspace <ArrowRight size={17} />
          </button>
        </div>

        <motion.div
          className="dashboard-preview"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <div className="preview-topbar">
            <div className="preview-brand">
              <span className="preview-brand-icon"><Building2 size={17} /></span>
              <strong>PGmate</strong>
            </div>
            <span className="preview-demo-label">ILLUSTRATIVE PREVIEW</span>
          </div>

          <div className="preview-content">
            <div className="preview-welcome">
              <div>
                <span>OWNER WORKSPACE</span>
                <h3>Your management overview</h3>
              </div>
              <div className="preview-date"><CalendarDays size={14} /> Dashboard</div>
            </div>

            <div className="preview-stat-grid">
              <div className="preview-stat">
                <span className="preview-stat-icon"><Building2 size={17} /></span>
                <small>Properties</small>
                <strong>Manage</strong>
                <span className="preview-stat-note">Property records</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-icon mint"><Users size={17} /></span>
                <small>Tenants</small>
                <strong>Organize</strong>
                <span className="preview-stat-note">Tenant records</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-icon lavender"><Wallet size={17} /></span>
                <small>Payments</small>
                <strong>Track</strong>
                <span className="preview-stat-note">Rent information</span>
              </div>
            </div>

            <div className="preview-lower-grid">
              <div className="preview-panel">
                <div className="preview-panel-heading">
                  <span>Daily operations</span>
                  <BarChart3 size={17} />
                </div>
                <div className="preview-operation">
                  <span className="operation-icon"><BedDouble size={15} /></span>
                  <span><strong>Rooms and beds</strong><small>Occupancy details</small></span>
                  <CheckCircle2 size={16} />
                </div>
                <div className="preview-operation">
                  <span className="operation-icon"><CreditCard size={15} /></span>
                  <span><strong>Rent tracking</strong><small>Payment records</small></span>
                  <CheckCircle2 size={16} />
                </div>
                <div className="preview-operation">
                  <span className="operation-icon"><ClipboardCheck size={15} /></span>
                  <span><strong>Tenant requests</strong><small>Complaints and updates</small></span>
                  <ArrowRight size={15} />
                </div>
              </div>

              <div className="preview-side-panel">
                <div className="preview-side-icon"><ShieldCheck size={22} /></div>
                <strong>One connected workspace</strong>
                <p>Keep important PG information easier to find.</p>
                <div className="preview-side-line"><span /></div>
                <small>Organized. Accessible. Practical.</small>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="landing-features" id="features">
        <div className="section-heading">
          <span>BUILT FOR EVERYDAY PG OPERATIONS</span>
          <h2>Everything you need to stay organized</h2>
          <p>
            Practical tools for managing the details that keep a paying guest
            accommodation running.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                className="feature-card"
                key={feature.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: (index % 4) * 0.07 }}
                whileHover={{ y: -6 }}
              >
                <div className="feature-card-top">
                  <div className="feature-icon"><Icon size={23} /></div>
                  <span className="feature-number">{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <a href="#how-it-works" className="feature-learn-link">
                  Explore <ArrowRight size={15} />
                </a>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* OWNER AND TENANT */}
      <section className="landing-audience">
        <div className="section-heading">
          <span>ONE PLATFORM, DIFFERENT NEEDS</span>
          <h2>Designed for owners and tenants</h2>
          <p>Relevant information and tools for each side of the PG experience.</p>
        </div>

        <div className="audience-grid">
          <article className="audience-card owner-card">
            <div className="audience-illustration owner-illustration">
              <div className="audience-orbit orbit-one" />
              <div className="audience-orbit orbit-two" />
              <div className="audience-main-icon"><Building2 size={42} /></div>
              <div className="audience-float audience-float-one"><BarChart3 size={18} /></div>
              <div className="audience-float audience-float-two"><Users size={18} /></div>
            </div>
            <span className="audience-label">FOR PG OWNERS</span>
            <h3>Run your property with more clarity.</h3>
            <p>
              Manage property details, room assignments, tenant records,
              payments, expenses, complaints, and notices from your owner portal.
            </p>
            <button onClick={goToLogin} className="audience-button">
              Owner login <ArrowRight size={17} />
            </button>
          </article>

          <article className="audience-card tenant-card">
            <div className="audience-illustration tenant-illustration">
              <div className="audience-orbit orbit-one" />
              <div className="audience-orbit orbit-two" />
              <div className="audience-main-icon"><Users size={42} /></div>
              <div className="audience-float audience-float-one"><Bell size={18} /></div>
              <div className="audience-float audience-float-two"><MessageSquare size={18} /></div>
            </div>
            <span className="audience-label">FOR TENANTS</span>
            <h3>Your essential PG details in one place.</h3>
            <p>
              Access available profile information, payment records, food menus,
              notices, and complaint tools through the tenant portal.
            </p>
            <button onClick={goToLogin} className="audience-button">
              Tenant login <ArrowRight size={17} />
            </button>
          </article>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-how" id="how-it-works">
        <div className="section-heading">
          <span>GET STARTED</span>
          <h2>A clearer way to manage your PG</h2>
          <p>Start with your account and use the tools available in your portal.</p>
        </div>

        <div className="how-steps">
          <article className="how-step">
            <div className="how-step-number">01</div>
            <div className="how-step-icon"><Users size={23} /></div>
            <h3>Sign in</h3>
            <p>Open PGmate and sign in with your account credentials.</p>
          </article>
          <div className="how-connector"><ArrowRight size={19} /></div>
          <article className="how-step">
            <div className="how-step-number">02</div>
            <div className="how-step-icon"><LayoutDashboard size={23} /></div>
            <h3>Open your portal</h3>
            <p>Use the owner or tenant features available to your account.</p>
          </article>
          <div className="how-connector"><ArrowRight size={19} /></div>
          <article className="how-step">
            <div className="how-step-number">03</div>
            <div className="how-step-icon"><CheckCircle2 size={23} /></div>
            <h3>Stay organized</h3>
            <p>Keep everyday property information and tasks in one workflow.</p>
          </article>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq">
        <div className="faq-intro">
          <span className="section-eyebrow">GOOD TO KNOW</span>
          <h2>Questions about PGmate?</h2>
          <p>Here are a few useful things to know before you get started.</p>
          <div className="faq-help-icon"><CircleHelp size={30} /></div>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <article className={`faq-item ${openFaq === index ? "active" : ""}`} key={faq.question}>
              <button
                className="faq-question"
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              >
                <span>{faq.question}</span>
                <ChevronDown size={19} />
              </button>
              {openFaq === index && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-decoration cta-decoration-one" />
        <div className="cta-decoration cta-decoration-two" />

        <div className="cta-content">
          <div className="cta-pill"><Sparkles size={15} /> A more organized PG starts here</div>
          <h2>Make room for better management.</h2>
          <p>
            Bring your property information, tenant workflows, and payment
            tracking together with PGmate.
          </p>
          <button className="cta-button" onClick={goToLogin}>
            Login to PGmate <ArrowRight size={19} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-main">
          <a href="#home" className="footer-logo">
            <div className="footer-logo-mark"><Building2 size={19} /></div>
            <span>PG<span>mate</span></span>
          </a>
          <p>Manage. Monitor. Grow.</p>
          <a href="#features" className="footer-explore">Explore the platform <ArrowRight size={15} /></a>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PGmate. All rights reserved.</span>
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <button onClick={goToLogin}>Login</button>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
