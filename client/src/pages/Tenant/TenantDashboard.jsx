import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Building2,
  LayoutDashboard,
  BedDouble,
  CreditCard,
  Utensils,
  Bell,
  MessageSquareWarning,
  UserCircle,
  LogOut,
  Menu,
  X,
  MapPin,
  Phone,
  CheckCircle2,
  Clock3,
  AlertCircle,
  CalendarDays,
  Wallet,
  ChevronRight,
  Plus,
  LoaderCircle,
  LockKeyhole,
  Save,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import "./TenantDashboard.css";
import TenantMyRoom from "./TenantMyRoom";
import TenantPayments from "./TenantPayments";
import TenantFoodMenu from "./TenantFoodMenu";
import TenantNotices from "./TenantNotices";
import TenantComplaints from "./TenantComplaints";


const API_URL =
  "http://localhost:5000/api";


function TenantDashboard() {
  const navigate = useNavigate();

  const {
    user,
    token,
    logout,
  } = useAuth();


  /* =========================================
     MENU
  ========================================= */

  const [
    activeSection,
    setActiveSection,
  ] = useState("overview");

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);


  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [profileForm, setProfileForm] = useState({
    name: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });


  /* =========================================
     DATA
  ========================================= */

  const [tenant, setTenant] =
    useState(null);

  const [roommates, setRoommates] = useState([]);

  const [payments, setPayments] =
    useState([]);

  const [foodMenu, setFoodMenu] =
    useState([]);

  const [notices, setNotices] =
    useState([]);

  const [complaints, setComplaints] =
    useState([]);


  /* =========================================
     LOADING
  ========================================= */

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [paymentsLoading, setPaymentsLoading] =
    useState(false);

  const [foodLoading, setFoodLoading] =
    useState(false);

  const [noticesLoading, setNoticesLoading] =
    useState(false);

  const [complaintsLoading, setComplaintsLoading] =
    useState(false);


  /* =========================================
     COMPLAINT MODAL
  ========================================= */

  const [
    showComplaintModal,
    setShowComplaintModal,
  ] = useState(false);

  const [
    submittingComplaint,
    setSubmittingComplaint,
  ] = useState(false);

  const [
    complaintError,
    setComplaintError,
  ] = useState("");

  const [
    complaintForm,
    setComplaintForm,
  ] = useState({
    title: "",
    description: "",
    category: "other",
    priority: "medium",
  });


  /* =========================================
     GENERAL ERROR
  ========================================= */

  const [error, setError] =
    useState("");


  /* =========================================
     AUTH HEADERS
  ========================================= */

  const getHeaders = () => ({
    Authorization:
      `Bearer ${token}`,
  });


  /* =========================================
     FETCH PROFILE
  ========================================= */

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setError("");

      const response =
        await fetch(
          `${API_URL}/tenant-portal/me`,
          {
            headers: getHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to load tenant profile."
        );
      }

      setTenant(data.tenant);
    } catch (err) {
      console.error(
        "Tenant profile error:",
        err
      );

      setError(
        err.message ||
        "Failed to load profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchRoommates = async () => {
    try {
      const response = await fetch(
        `${API_URL}/tenants/my-roommates`,
        {
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load roommates."
        );
      }

      setRoommates(data.roommates || []);
    } catch (err) {
      console.error("Roommates error:", err);
      setRoommates([]);
    }
  };



  /* =========================================
     FETCH PAYMENTS
  ========================================= */

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);

      const response =
        await fetch(
          `${API_URL}/tenant-portal/payments`,
          {
            headers: getHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to load payments."
        );
      }

      setPayments(
        data.payments || []
      );
    } catch (err) {
      console.error(
        "Tenant payments error:",
        err
      );

      setError(
        err.message ||
        "Failed to load payments."
      );
    } finally {
      setPaymentsLoading(false);
    }
  };


  /* =========================================
     FETCH FOOD MENU
  ========================================= */

  const fetchFoodMenu = async () => {
    try {
      setFoodLoading(true);

      const response =
        await fetch(
          `${API_URL}/tenant-portal/food-menu`,
          {
            headers: getHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to load food menu."
        );
      }

      setFoodMenu(
        data.foodMenu || []
      );
    } catch (err) {
      console.error(
        "Tenant food menu error:",
        err
      );

      setError(
        err.message ||
        "Failed to load food menu."
      );
    } finally {
      setFoodLoading(false);
    }
  };


  /* =========================================
     FETCH NOTICES
  ========================================= */

  const fetchNotices = async () => {
    try {
      setNoticesLoading(true);

      const response =
        await fetch(
          `${API_URL}/tenant-portal/notices`,
          {
            headers: getHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to load notices."
        );
      }

      setNotices(
        data.notices || []
      );
    } catch (err) {
      console.error(
        "Tenant notices error:",
        err
      );

      setError(
        err.message ||
        "Failed to load notices."
      );
    } finally {
      setNoticesLoading(false);
    }
  };


  /* =========================================
     FETCH COMPLAINTS
  ========================================= */

  const fetchComplaints =
    async () => {
      try {
        setComplaintsLoading(true);

        const response =
          await fetch(
            `${API_URL}/tenant-portal/complaints`,
            {
              headers: getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to load complaints."
          );
        }

        setComplaints(
          data.complaints || []
        );
      } catch (err) {
        console.error(
          "Tenant complaints error:",
          err
        );

        setError(
          err.message ||
          "Failed to load complaints."
        );
      } finally {
        setComplaintsLoading(false);
      }
    };


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    if (!token) return;

    fetchProfile();
    fetchPayments();
    fetchFoodMenu();
    fetchComplaints();
  }, [token]);


  /* =========================================
     LOAD SECTION DATA
  ========================================= */

  useEffect(() => {
    if (!token) return;

    if (activeSection === "payments") {
      fetchPayments();
    }

    if (activeSection === "room") {
      fetchRoommates();
    }

    if (activeSection === "food") {
      fetchFoodMenu();
    }

    if (activeSection === "notices") {
      fetchNotices();
    }

    if (activeSection === "complaints") {
      fetchComplaints();
    }
  }, [activeSection, token]);


  /* =========================================
     NAVIGATION
  ========================================= */

  const navigationItems = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      key: "overview",
    },
    {
      label: "My Room",
      icon: BedDouble,
      key: "room",
    },
    {
      label: "Payments",
      icon: CreditCard,
      key: "payments",
    },
    {
      label: "Food Menu",
      icon: Utensils,
      key: "food",
    },
    {
      label: "Notices",
      icon: Bell,
      key: "notices",
    },
    {
      label: "Complaints",
      icon: MessageSquareWarning,
      key: "complaints",
    },
    {
      label: "Profile",
      icon: UserCircle,
      key: "profile",
    },
  ];


  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  /* =========================================
     NAVIGATION HANDLER
  ========================================= */

  const handleNavigation = (
    section
  ) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setError("");
  };


  /* =========================================
     COMPLAINT FORM
  ========================================= */

  const handleComplaintChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setComplaintForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };


  const openComplaintModal = () => {
    setComplaintError("");

    setComplaintForm({
      title: "",
      description: "",
      category: "other",
      priority: "medium",
    });

    setShowComplaintModal(true);
  };


  const closeComplaintModal = () => {
    if (submittingComplaint) {
      return;
    }

    setShowComplaintModal(false);
    setComplaintError("");
  };


  /* =========================================
     SUBMIT COMPLAINT
  ========================================= */

  const handleComplaintSubmit =
    async (event) => {
      event.preventDefault();

      setComplaintError("");

      if (
        !complaintForm.title.trim() ||
        !complaintForm.description.trim()
      ) {
        setComplaintError(
          "Please fill in the title and description."
        );

        return;
      }

      try {
        setSubmittingComplaint(true);

        const response =
          await fetch(
            `${API_URL}/tenant-portal/complaints`,
            {
              method: "POST",

              headers: {
                ...getHeaders(),
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                complaintForm
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to submit complaint."
          );
        }

        setShowComplaintModal(false);

        await fetchComplaints();
      } catch (err) {
        console.error(
          "Submit complaint error:",
          err
        );

        setComplaintError(
          err.message ||
          "Failed to submit complaint."
        );
      } finally {
        setSubmittingComplaint(false);
      }
    };

  const startProfileEdit = () => {
    setProfileForm({
      name: tenant?.userId?.name || user?.name || "",
      emergencyContactName: tenant?.emergencyContactName || "",
      emergencyContactNumber: tenant?.emergencyContactNumber || "",
    });

    setProfileError("");
    setProfileMessage("");
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileError("");
    setProfileMessage("");
  };

  const handleProfileInputChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    setProfileError("");
    setProfileMessage("");

    if (!profileForm.name.trim()) {
      setProfileError("Please enter your full name.");
      return;
    }

    if (profileForm.name.trim().length > 100) {
      setProfileError("Name cannot exceed 100 characters.");
      return;
    }

    if (profileForm.emergencyContactName.trim().length > 100) {
      setProfileError("Emergency contact name is too long.");
      return;
    }

    if (
      profileForm.emergencyContactNumber.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(
        profileForm.emergencyContactNumber.trim()
      )
    ) {
      setProfileError("Please enter a valid emergency contact number.");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await fetch(`${API_URL}/tenant-portal/me`, {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          emergencyContactName:
            profileForm.emergencyContactName.trim(),
          emergencyContactNumber:
            profileForm.emergencyContactNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      // Refresh the profile from the server.
      await fetchProfile();

      setEditingProfile(false);
      setProfileMessage(data.message || "Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Your new password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setSavingPassword(true);

      const response = await fetch(
        `${API_URL}/tenant-portal/me/password`,
        {
          method: "PATCH",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordForm(false);
      setPasswordMessage(data.message || "Password changed successfully.");
    } catch (err) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };


  /* =========================================
     DERIVED DATA
  ========================================= */

  const userData =
    tenant?.userId || user;

  const pg =
    tenant?.pgId;

  const room =
    tenant?.roomId;

  const bed =
    tenant?.bedId;


  const paidPayments =
    payments.filter(
      (payment) =>
        payment.status ===
        "paid"
    );

  const pendingPayments =
    payments.filter(
      (payment) =>
        payment.status ===
        "pending" ||
        payment.status ===
        "overdue"
    );


  const totalPaid =
    paidPayments.reduce(
      (total, payment) =>
        total + payment.amount,
      0
    );


  const pendingAmount =
    pendingPayments.reduce(
      (total, payment) =>
        total + payment.amount,
      0
    );


  const activeComplaints =
    complaints.filter(
      (complaint) =>
        ![
          "resolved",
          "closed",
        ].includes(
          String(
            complaint.status
          ).toLowerCase()
        )
    );


  /* =========================================
     FORMAT DATE
  ========================================= */

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  /* =========================================
     STATUS CLASS
  ========================================= */

  const getStatusClass = (
    status
  ) => {
    return String(
      status || ""
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );
  };


  /* =========================================
     RENDER LOADING
  ========================================= */

  if (profileLoading) {
    return (
      <div className="tenant-dashboard">

        <div className="tenant-loading-page">

          <div className="tenant-loading-sidebar" />

          <div className="tenant-loading-content">

            <div className="tenant-loading-topbar" />

            <div className="tenant-loading-grid">

              <div className="tenant-loading-card" />
              <div className="tenant-loading-card" />
              <div className="tenant-loading-card" />
              <div className="tenant-loading-card" />

            </div>

            <div className="tenant-loading-large" />

          </div>

        </div>

      </div>
    );
  }


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="tenant-dashboard">


      {/* =====================================
          MOBILE HEADER
      ===================================== */}

      <header className="tenant-mobile-header">

        <div className="tenant-mobile-brand">

          <div className="tenant-mobile-brand-icon">
            <Building2 size={18} />
          </div>

          <div>
            <strong>
              PGmate
            </strong>

            <span>
              Tenant Portal
            </span>
          </div>

        </div>


        <div className="tenant-mobile-header-right">

          <div className="tenant-mobile-avatar">
            {userData?.name
              ?.charAt(0)
              ?.toUpperCase() ||
              "T"}
          </div>

          <button
            className="tenant-menu-button"
            onClick={() =>
              setMobileMenuOpen(true)
            }
          >
            <Menu size={20} />
          </button>

        </div>

      </header>


      {/* =====================================
          MOBILE OVERLAY
      ===================================== */}

      {mobileMenuOpen && (
        <div
          className="tenant-sidebar-overlay"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}


      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside
        className={`tenant-sidebar ${mobileMenuOpen
          ? "tenant-sidebar-open"
          : ""
          }`}
      >

        {/* BRAND */}

        <div className="tenant-brand">

          <div className="tenant-brand-icon">
            <Building2 size={20} />
          </div>

          <div className="tenant-brand-text">

            <strong>
              PGmate
            </strong>

            <span>
              TENANT PORTAL
            </span>

          </div>

          <button
            className="tenant-sidebar-close"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <X size={17} />
          </button>

        </div>


        {/* PROPERTY */}

        <div className="tenant-property-card">

          <span>
            YOUR PG
          </span>

          <strong>
            {pg?.name ||
              "Your PG"}
          </strong>

          <small>
            {pg?.city &&
              pg?.state
              ? `${pg.city}, ${pg.state}`
              : "Property details"}
          </small>

        </div>


        {/* NAVIGATION */}

        <nav className="tenant-navigation">

          {navigationItems.map(
            (item) => {

              const Icon =
                item.icon;

              return (
                <button
                  key={item.key}
                  className={`tenant-nav-item ${activeSection ===
                    item.key
                    ? "active"
                    : ""
                    }`}
                  onClick={() =>
                    handleNavigation(
                      item.key
                    )
                  }
                >

                  <Icon size={16} />

                  <span>
                    {item.label}
                  </span>

                </button>
              );
            }
          )}

        </nav>


        {/* LOGOUT */}

        <div className="tenant-sidebar-bottom">

          <button
            className="tenant-logout-button"
            onClick={handleLogout}
          >

            <LogOut size={16} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="tenant-main">


        {/* TOPBAR */}

        <header className="tenant-topbar">

          <div>

            <h1>
              {activeSection ===
                "overview" &&
                "Dashboard"}

              {activeSection ===
                "room" &&
                "My Room"}

              {activeSection ===
                "payments" &&
                "Payments"}

              {activeSection ===
                "food" &&
                "Food Menu"}

              {activeSection ===
                "notices" &&
                "Notices"}

              {activeSection ===
                "complaints" &&
                "Complaints"}

              {activeSection ===
                "profile" &&
                "Profile"}
            </h1>

            <p>
              {pg?.name ||
                "Your PG"}
            </p>

          </div>


          <div className="tenant-topbar-profile">

            <div className="tenant-topbar-avatar">

              {userData?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                "T"}

            </div>

            <div>

              <strong>
                {userData?.name ||
                  "Tenant"}
              </strong>

              <span>
                PG Tenant
              </span>

            </div>

          </div>

        </header>


        {/* CONTENT */}

        <section className="tenant-content">


          {/* =================================
              ERROR
          ================================= */}

          {error && (
            <div className="tenant-error">

              <AlertCircle
                size={17}
              />

              <span>
                {error}
              </span>

            </div>
          )}


          {/* =================================
              OVERVIEW
          ================================= */}

          {activeSection ===
            "overview" && (

              <div className="tenant-page">

                <div className="tenant-mobile-page-title">

                  <span>
                    TENANT PORTAL
                  </span>

                  <h1>
                    Welcome,{" "}
                    {userData?.name ||
                      "Tenant"}
                  </h1>

                  <p>
                    Here's your PG
                    information at a glance.
                  </p>

                </div>


                {/* ROOM CARD */}

                <section className="tenant-room-hero">

                  <div className="tenant-room-hero-icon">

                    <BedDouble
                      size={25}
                    />

                  </div>

                  <div className="tenant-room-hero-info">

                    <span>
                      YOUR ROOM
                    </span>

                    <h2>
                      {room?.roomNumber
                        ? `Room ${room.roomNumber}`
                        : "Room not assigned"}
                    </h2>

                    <p>
                      {room?.roomType
                        ? room.roomType
                        : "Room details unavailable"}
                    </p>

                  </div>

                  <div className="tenant-room-hero-bed">

                    <span>
                      BED
                    </span>

                    <strong>
                      {bed?.bedNumber ||
                        "-"}
                    </strong>

                  </div>

                </section>


                {/* STATS */}

                <div className="tenant-stat-grid">

                  <div className="tenant-stat-card">

                    <div className="tenant-stat-icon green">

                      <Wallet
                        size={18}
                      />

                    </div>

                    <div>

                      <strong>
                        ₹
                        {totalPaid.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <span>
                        Total Paid
                      </span>

                    </div>

                  </div>


                  <div className="tenant-stat-card">

                    <div className="tenant-stat-icon orange">

                      <Clock3
                        size={18}
                      />

                    </div>

                    <div>

                      <strong>
                        ₹
                        {pendingAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <span>
                        Pending
                      </span>

                    </div>

                  </div>


                  <div className="tenant-stat-card">

                    <div className="tenant-stat-icon blue">

                      <Utensils
                        size={18}
                      />

                    </div>

                    <div>

                      <strong>
                        {foodMenu.length}
                      </strong>

                      <span>
                        Food Items
                      </span>

                    </div>

                  </div>


                  <div className="tenant-stat-card">

                    <div className="tenant-stat-icon red">

                      <MessageSquareWarning
                        size={18}
                      />

                    </div>

                    <div>

                      <strong>
                        {activeComplaints.length}
                      </strong>

                      <span>
                        Open Complaints
                      </span>

                    </div>

                  </div>

                </div>


                {/* QUICK INFO */}

                <div className="tenant-two-column">


                  {/* PG */}

                  <section className="tenant-section">

                    <div className="tenant-section-header">

                      <div>

                        <h2>
                          PG Details
                        </h2>

                        <p>
                          Your current property
                        </p>

                      </div>

                    </div>


                    <div className="tenant-info-list">

                      <div>

                        <Building2
                          size={16}
                        />

                        <div>

                          <span>
                            PG Name
                          </span>

                          <strong>
                            {pg?.name ||
                              "-"}
                          </strong>

                        </div>

                      </div>


                      <div>

                        <MapPin
                          size={16}
                        />

                        <div>

                          <span>
                            Address
                          </span>

                          <strong>
                            {pg?.address ||
                              "-"}
                          </strong>

                        </div>

                      </div>


                      <div>

                        <Phone
                          size={16}
                        />

                        <div>

                          <span>
                            Contact
                          </span>

                          <strong>
                            {pg?.contactNumber ||
                              "-"}
                          </strong>

                        </div>

                      </div>

                    </div>

                  </section>


                  {/* TENANT */}

                  <section className="tenant-section">

                    <div className="tenant-section-header">

                      <div>

                        <h2>
                          My Stay
                        </h2>

                        <p>
                          Current stay information
                        </p>

                      </div>

                    </div>


                    <div className="tenant-info-list">

                      <div>

                        <CalendarDays
                          size={16}
                        />

                        <div>

                          <span>
                            Joining Date
                          </span>

                          <strong>
                            {formatDate(
                              tenant?.joiningDate
                            )}
                          </strong>

                        </div>

                      </div>


                      <div>

                        <Wallet
                          size={16}
                        />

                        <div>

                          <span>
                            Monthly Rent
                          </span>

                          <strong>
                            ₹
                            {Number(
                              tenant?.monthlyRent ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>

                        </div>

                      </div>


                      <div>

                        <BedDouble
                          size={16}
                        />

                        <div>

                          <span>
                            Bed
                          </span>

                          <strong>
                            {bed?.bedNumber ||
                              "-"}
                          </strong>

                        </div>

                      </div>

                    </div>

                  </section>

                </div>


                {/* RECENT PAYMENTS */}

                <section className="tenant-section">

                  <div className="tenant-section-header">

                    <div>

                      <h2>
                        Recent Payments
                      </h2>

                      <p>
                        Your latest rent payments
                      </p>

                    </div>

                    <button
                      className="tenant-view-all"
                      onClick={() =>
                        handleNavigation(
                          "payments"
                        )
                      }
                    >
                      View All
                      <ChevronRight
                        size={15}
                      />
                    </button>

                  </div>


                  {payments.length ===
                    0 ? (

                    <div className="tenant-empty-inline">
                      No payment records yet.
                    </div>

                  ) : (

                    <div className="tenant-payment-list">

                      {payments
                        .slice(0, 4)
                        .map(
                          (payment) => (
                            <div
                              className="tenant-payment-item"
                              key={
                                payment._id
                              }
                            >

                              <div>

                                <strong>
                                  ₹
                                  {Number(
                                    payment.amount
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                </strong>

                                <span>
                                  {payment.paymentMethod ||
                                    "Payment"}
                                  {" • "}
                                  {formatDate(
                                    payment.paymentDate
                                  )}
                                </span>

                              </div>


                              <span
                                className={`tenant-status-badge ${getStatusClass(
                                  payment.status
                                )}`}
                              >

                                {payment.status ===
                                  "paid" && (
                                    <CheckCircle2
                                      size={11}
                                    />
                                  )}

                                {payment.status ===
                                  "pending" && (
                                    <Clock3
                                      size={11}
                                    />
                                  )}

                                {payment.status ===
                                  "overdue" && (
                                    <AlertCircle
                                      size={11}
                                    />
                                  )}

                                {payment.status}

                              </span>

                            </div>
                          )
                        )}

                    </div>

                  )}

                </section>

              </div>
            )}


          {/* =================================
              MY ROOM
          ================================= */}


          {activeSection === "room" && (
            <TenantMyRoom
              room={room}
              tenant={tenant}
              pg={pg}
              roommates={roommates}
            />
          )}

          {/* =================================
              PAYMENTS
          ================================= */}

          {activeSection === "payments" && (
            <TenantPayments
              payments={payments}
              tenant={tenant}
              loading={paymentsLoading}
            />
          )}


          {/* =================================
              FOOD MENU
          ================================= */}

          {activeSection === "food" && (
            <TenantFoodMenu
              foodMenu={foodMenu}
              tenant={tenant}
              pg={pg}
              loading={foodLoading}
            />
          )}

          {/* =================================
              NOTICES
          ================================= */}

          {activeSection === "notices" && (
            <TenantNotices
              notices={notices}
              loading={noticesLoading}
            />
          )}


          {/* =================================
              COMPLAINTS
          ================================= */}

          {activeSection === "complaints" && <TenantComplaints />}

          {/* =================================
              PROFILE
          ================================= */}

          {/* PROFILE PAGE */}
          {activeSection === "profile" && (
            <div className="tenant-profile-page">

              {/* PROFILE BANNER */}
              <section className="tenant-profile-banner">
                <div className="tenant-profile-avatar">
                  {userData?.name?.charAt(0)?.toUpperCase() || "T"}
                </div>

                <div className="tenant-profile-banner-info">
                  <h2>{userData?.name || "Tenant"}</h2>
                  <p>PG Tenant</p>
                </div>

                {!editingProfile && (
                  <button
                    type="button"
                    className="tenant-profile-action"
                    onClick={startProfileEdit}
                  >
                    Edit Profile
                  </button>
                )}
              </section>

              {profileMessage && (
                <div className="tenant-profile-success">
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div className="tenant-form-error">
                  <AlertCircle size={16} />
                  {profileError}
                </div>
              )}

              {/* PERSONAL INFORMATION + STAY DETAILS */}
              <div className="tenant-profile-columns">

                <section className="tenant-profile-card">
                  <div className="tenant-profile-card-heading">
                    <div className="tenant-profile-card-icon">
                      <UserCircle size={25} />
                    </div>

                    <div>
                      <h2>Personal Information</h2>
                      <p>Your registered account details.</p>
                    </div>
                  </div>

                  {editingProfile ? (
                    <form onSubmit={handleProfileSave}>
                      <div className="tenant-profile-edit-field">
                        <label htmlFor="profile-name">Full Name</label>
                        <input
                          id="profile-name"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileInputChange}
                          maxLength={100}
                          required
                        />
                      </div>

                      <div className="tenant-profile-edit-field">
                        <label htmlFor="profile-mobile">Mobile Number</label>
                        <input
                          id="profile-mobile"
                          value={userData?.mobile || ""}
                          readOnly
                          disabled
                        />
                        <small>Mobile number cannot be changed here.</small>
                      </div>

                      <div className="tenant-profile-edit-actions">
                        <button
                          type="button"
                          className="tenant-profile-cancel"
                          onClick={cancelProfileEdit}
                          disabled={savingProfile}
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          className="tenant-profile-action"
                          disabled={savingProfile}
                        >
                          <Save size={16} />
                          {savingProfile ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="tenant-profile-detail">
                        <UserCircle size={21} />
                        <div>
                          <span>Full Name</span>
                          <strong>{userData?.name || "-"}</strong>
                        </div>
                      </div>

                      <div className="tenant-profile-detail">
                        <Phone size={21} />
                        <div>
                          <span>Mobile Number</span>
                          <strong>{userData?.mobile || "-"}</strong>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <section className="tenant-profile-card">
                  <div className="tenant-profile-card-heading">
                    <div className="tenant-profile-card-icon">
                      <Building2 size={25} />
                    </div>

                    <div>
                      <h2>Stay Details</h2>
                      <p>Information about your current stay.</p>
                    </div>
                  </div>

                  <div className="tenant-profile-detail">
                    <Building2 size={21} />
                    <div>
                      <span>PG</span>
                      <strong>{pg?.name || "-"}</strong>
                    </div>
                  </div>

                  <div className="tenant-profile-detail">
                    <BedDouble size={21} />
                    <div>
                      <span>Room</span>
                      <strong>
                        {room?.roomNumber ? `Room ${room.roomNumber}` : "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="tenant-profile-detail">
                    <MapPin size={21} />
                    <div>
                      <span>Location</span>
                      <strong>
                        {[pg?.city, pg?.state].filter(Boolean).join(", ") || "-"}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>

              {/* EMERGENCY CONTACT */}
              <section className="tenant-profile-card tenant-profile-emergency">
                <div className="tenant-profile-card-heading">
                  <div className="tenant-profile-card-icon">
                    <Phone size={25} />
                  </div>

                  <div>
                    <h2>Emergency Contact</h2>
                    <p>Contact information provided to your PG.</p>
                  </div>
                </div>

                {editingProfile ? (
                  <div className="tenant-profile-edit-grid">
                    <div className="tenant-profile-edit-field">
                      <label htmlFor="emergency-name">Contact Name</label>
                      <input
                        id="emergency-name"
                        name="emergencyContactName"
                        value={profileForm.emergencyContactName}
                        onChange={handleProfileInputChange}
                        maxLength={100}
                      />
                    </div>

                    <div className="tenant-profile-edit-field">
                      <label htmlFor="emergency-number">Contact Mobile Number</label>
                      <input
                        id="emergency-number"
                        name="emergencyContactNumber"
                        type="tel"
                        value={profileForm.emergencyContactNumber}
                        onChange={handleProfileInputChange}
                        maxLength={20}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="tenant-profile-emergency-grid">
                    <div className="tenant-profile-detail">
                      <UserCircle size={21} />
                      <div>
                        <span>Name</span>
                        <strong>{tenant?.emergencyContactName || "-"}</strong>
                      </div>
                    </div>

                    <div className="tenant-profile-detail">
                      <Phone size={21} />
                      <div>
                        <span>Mobile Number</span>
                        <strong>{tenant?.emergencyContactNumber || "-"}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* AADHAAR DOCUMENT */}
              <section className="tenant-profile-card">
                <div className="tenant-profile-card-heading">
                  <div className="tenant-profile-card-icon">
                    <LockKeyhole size={25} />
                  </div>

                  <div>
                    <h2>Aadhaar Document</h2>
                    <p>Document image currently stored in your tenant record.</p>
                  </div>
                </div>

                {tenant?.aadhaarCardImage || tenant?.tenantPhoto ? (
                  <img
                    className="tenant-aadhaar-image"
                    src={tenant.aadhaarCardImage || tenant.tenantPhoto}
                    alt="Uploaded tenant document"
                    loading="lazy"
                  />
                ) : (
                  <p className="tenant-profile-muted">
                    No Aadhaar card uploaded.
                  </p>
                )}

                <p className="tenant-profile-muted">
                  This image is displayed from the existing tenant record. It does not
                  indicate that Aadhaar has been officially verified.
                </p>
              </section>

              {/* CHANGE PASSWORD */}
              <section className="tenant-profile-card">
                <div className="tenant-profile-card-heading">
                  <div className="tenant-profile-card-icon">
                    <LockKeyhole size={25} />
                  </div>

                  <div>
                    <h2>Account Security</h2>
                    <p>Change your login password securely.</p>
                  </div>
                </div>

                {passwordMessage && (
                  <div className="tenant-profile-success">
                    {passwordMessage}
                  </div>
                )}

                {passwordError && (
                  <div className="tenant-form-error">
                    <AlertCircle size={16} />
                    {passwordError}
                  </div>
                )}

                {!showPasswordForm ? (
                  <button
                    type="button"
                    className="tenant-profile-action"
                    onClick={() => {
                      setPasswordError("");
                      setPasswordMessage("");
                      setShowPasswordForm(true);
                    }}
                  >
                    <LockKeyhole size={16} />
                    Change Password
                  </button>
                ) : (
                  <form
                    className="tenant-password-form"
                    onSubmit={handlePasswordSave}
                  >
                    <div className="tenant-profile-edit-field">
                      <label htmlFor="current-password">Current Password</label>
                      <input
                        id="current-password"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordInputChange}
                        required
                      />
                    </div>

                    <div className="tenant-profile-edit-field">
                      <label htmlFor="new-password">New Password</label>
                      <input
                        id="new-password"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange}
                        required
                      />
                      <small>Use at least 8 characters.</small>
                    </div>

                    <div className="tenant-profile-edit-field">
                      <label htmlFor="confirm-password">Confirm New Password</label>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordInputChange}
                        required
                      />
                    </div>

                    <div className="tenant-profile-edit-actions">
                      <button
                        type="button"
                        className="tenant-profile-cancel"
                        disabled={savingPassword}
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordError("");
                          setPasswordForm({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="tenant-profile-action"
                        disabled={savingPassword}
                      >
                        <Save size={16} />
                        {savingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                )}
              </section>

            </div>
          )}



          {/* =========================================
          COMPLAINT MODAL
      ========================================= */}

          {showComplaintModal && (

            <div
              className="tenant-modal-overlay"
              onMouseDown={(event) => {

                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeComplaintModal();
                }

              }}
            >

              <div className="tenant-modal">

                <div className="tenant-modal-header">

                  <div>

                    <span>
                      SUPPORT REQUEST
                    </span>

                    <h2>
                      New Complaint
                    </h2>

                  </div>


                  <button
                    onClick={
                      closeComplaintModal
                    }
                    disabled={
                      submittingComplaint
                    }
                  >
                    <X size={18} />
                  </button>

                </div>


                <form
                  className="tenant-complaint-form"
                  onSubmit={
                    handleComplaintSubmit
                  }
                >

                  <div className="tenant-form-group">

                    <label>
                      Title
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={
                        complaintForm.title
                      }
                      onChange={
                        handleComplaintChange
                      }
                      placeholder="Example: WiFi not working"
                      required
                    />

                  </div>


                  <div className="tenant-form-row">

                    <div className="tenant-form-group">

                      <label>
                        Category
                      </label>

                      <select
                        name="category"
                        value={
                          complaintForm.category
                        }
                        onChange={
                          handleComplaintChange
                        }
                      >

                        <option value="other">
                          Other
                        </option>

                        <option value="maintenance">
                          Maintenance
                        </option>

                        <option value="internet">
                          Internet
                        </option>

                        <option value="electricity">
                          Electricity
                        </option>

                        <option value="water">
                          Water
                        </option>

                        <option value="food">
                          Food
                        </option>

                        <option value="room">
                          Room
                        </option>

                      </select>

                    </div>


                    <div className="tenant-form-group">

                      <label>
                        Priority
                      </label>

                      <select
                        name="priority"
                        value={
                          complaintForm.priority
                        }
                        onChange={
                          handleComplaintChange
                        }
                      >

                        <option value="low">
                          Low
                        </option>

                        <option value="medium">
                          Medium
                        </option>

                        <option value="high">
                          High
                        </option>

                        <option value="urgent">
                          Urgent
                        </option>

                      </select>

                    </div>

                  </div>


                  <div className="tenant-form-group">

                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        complaintForm.description
                      }
                      onChange={
                        handleComplaintChange
                      }
                      placeholder="Describe the issue..."
                      rows="5"
                      required
                    />

                  </div>


                  {complaintError && (

                    <div className="tenant-form-error">

                      <AlertCircle
                        size={15}
                      />

                      {complaintError}

                    </div>

                  )}


                  <div className="tenant-modal-actions">

                    <button
                      type="button"
                      className="tenant-modal-cancel"
                      onClick={
                        closeComplaintModal
                      }
                      disabled={
                        submittingComplaint
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      className="tenant-modal-submit"
                      disabled={
                        submittingComplaint
                      }
                    >

                      {submittingComplaint ? (
                        <>
                          <LoaderCircle
                            size={16}
                            className="tenant-spin"
                          />

                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Complaint
                        </>
                      )}

                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}
        </section>
      </main>
    </div>
  );
}

export default TenantDashboard;