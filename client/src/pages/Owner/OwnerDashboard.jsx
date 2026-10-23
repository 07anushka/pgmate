import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Building2,
  LayoutDashboard,
  BedDouble,
  Users,
  CreditCard,
  Receipt,
  MessageSquareWarning,
  Utensils,
  Bell,
  LogOut,
  Menu,
  X,
  MapPin,
  Phone,
  Plus,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Wallet,
  TrendingUp,
  UserCircle,
  ChevronDown,
  Check,
  CalendarDays,
  KeyRound,
  Wrench,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  getMyPGsApi,
  createPGApi,
  getMyRoomsApi,
  getMyPaymentsApi,
  getPaymentSummaryApi,
  getMyExpensesApi,
  getExpenseSummaryApi,
  getOwnerComplaintsApi,
} from "../../services/api";

import "./OwnerDashboard.css";

import RoomsBeds from "./RoomsBeds";
import Tenants from "./Tenants";
import Payments from "./Payments";
import Expenses from "./Expenses";
import Complaints from "./Complaints";
import FoodMenu from "./FoodMenu";
import Notices from "./Notices";
import OwnerProfile from "./OwnerProfile";

/* --------------------------------------------------
   GENERAL HELPERS
-------------------------------------------------- */

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const asArray = (response, key) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.[key])) return response[key];
  if (Array.isArray(response?.data?.[key])) return response.data[key];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const safeNumber = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const validDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const paymentDate = (payment) =>
  payment?.paymentDate ||
  payment?.paidAt ||
  payment?.date ||
  payment?.createdAt ||
  payment?.updatedAt ||
  null;

const paymentAmount = (payment) =>
  safeNumber(
    payment?.amount ??
    payment?.paidAmount ??
    payment?.rentAmount ??
    payment?.totalAmount
  );

const paymentStatus = (payment) =>
  String(payment?.status || "").toLowerCase();

const isPaid = (payment) =>
  ["paid", "success", "successful", "completed", "complete"].includes(
    paymentStatus(payment)
  );

const isOverdue = (payment) =>
  ["overdue", "late"].includes(paymentStatus(payment));

const isPending = (payment) =>
  ["pending", "unpaid", "due", "overdue", "late"].includes(
    paymentStatus(payment)
  );

const getMonthKey = (value) => {
  const date = validDate(value);

  if (!date) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getRoomBeds = (room) =>
  Array.isArray(room?.beds) ? room.beds : [];

const isOccupiedBed = (bed) =>
  Boolean(
    bed?.tenantId ||
    bed?.tenant ||
    ["occupied", "booked", "filled"].includes(
      String(bed?.status || "").toLowerCase()
    )
  );

const roomCapacity = (room) => {
  const beds = getRoomBeds(room);

  if (beds.length) return beds.length;

  return safeNumber(
    room?.totalBeds ??
    room?.capacity ??
    room?.bedCapacity ??
    room?.numberOfBeds ??
    room?.bedCount
  );
};

const roomOccupied = (room) => {
  const beds = getRoomBeds(room);

  if (beds.length) {
    return beds.filter(isOccupiedBed).length;
  }

  return safeNumber(
    room?.occupiedBeds ??
    room?.occupiedCount ??
    room?.currentOccupancy ??
    room?.occupied
  );
};

const roomVacant = (room) => {
  const beds = getRoomBeds(room);

  if (beds.length) {
    return Math.max(0, beds.length - beds.filter(isOccupiedBed).length);
  }

  if (room?.availableBeds != null) {
    return safeNumber(room.availableBeds);
  }

  if (room?.vacantBeds != null) {
    return safeNumber(room.vacantBeds);
  }

  return Math.max(0, roomCapacity(room) - roomOccupied(room));
};

const getTenantName = (payment) => {
  const tenant =
    payment?.tenantId ||
    payment?.tenant ||
    payment?.userId ||
    payment?.user ||
    {};

  if (typeof tenant === "string") {
    return payment?.tenantName || "Tenant";
  }

  return (
    payment?.tenantName ||
    tenant?.name ||
    tenant?.fullName ||
    tenant?.userId?.name ||
    payment?.userName ||
    payment?.name ||
    "Tenant"
  );
};

const getRoomName = (payment) => {
  const room =
    payment?.roomId ||
    payment?.room ||
    payment?.tenantId?.roomId ||
    payment?.tenant?.roomId;

  if (typeof room === "string") {
    return `Room ${room.slice(-4)}`;
  }

  if (room && typeof room === "object") {
    const value =
      room.roomNumber ||
      room.name ||
      room.roomName ||
      room.number;

    if (value) {
      return String(value).toLowerCase().startsWith("room")
        ? value
        : `Room ${value}`;
    }
  }

  return payment?.roomNumber || payment?.roomName || "—";
};

const getStatusLabel = (payment) => {
  if (isPaid(payment)) return "Paid";
  if (isOverdue(payment)) return "Overdue";
  return "Pending";
};

const getSummaryObject = (response) =>
  response?.summary ??
  response?.data?.summary ??
  response?.data ??
  response ??
  {};

const findSummaryNumber = (summary, keys) => {
  for (const key of keys) {
    const value = summary?.[key];

    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
};

const isComplaintOpen = (complaint) =>
  !["resolved", "closed", "completed"].includes(
    String(complaint?.status || "").toLowerCase()
  );

const dateLabel = (value) => {
  const date = validDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* --------------------------------------------------
   DASHBOARD COMPONENT
-------------------------------------------------- */

function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  /* Navigation */

  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Properties */

  const [pgs, setPGs] = useState([]);
  const [pgLoading, setPgLoading] = useState(true);

  const [activePGId, setActivePGId] = useState(
    () => localStorage.getItem("pgmate_active_pg") || "all"
  );

  const activePG = pgs.find(
    (pg) => String(pg._id) === String(activePGId)
  );

  /* Add property modal */

  const [showPGModal, setShowPGModal] = useState(false);
  const [creatingPG, setCreatingPG] = useState(false);
  const [pgError, setPGError] = useState("");

  const [pgForm, setPGForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    contactNumber: "",
    description: "",
  });

  /* Overview data */

  const [overviewData, setOverviewData] = useState({
    rooms: [],
    payments: [],
    expenses: [],
    complaints: [],
    paymentSummaries: [],
    expenseSummaries: [],
    loading: true,
    error: "",
  });

  const [chartPeriod, setChartPeriod] = useState(6);
  const [refreshing, setRefreshing] = useState(false);

  /* Fetch properties */

  const fetchPGs = useCallback(async () => {
    if (!token) {
      setPGs([]);
      setPgLoading(false);
      return;
    }

    setPgLoading(true);

    try {
      const response = await getMyPGsApi();
      const propertyList = asArray(response, "pgs");

      setPGs(propertyList);

      const savedPGId = localStorage.getItem("pgmate_active_pg") || "all";

      if (
        savedPGId !== "all" &&
        !propertyList.some(
          (pg) => String(pg._id) === String(savedPGId)
        )
      ) {
        setActivePGId("all");
        localStorage.setItem("pgmate_active_pg", "all");
      }
    } catch (error) {
      console.error("Fetch PGs error:", error);
      setPGs([]);
    } finally {
      setPgLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPGs();
  }, [fetchPGs]);

  /* Change selected property */

  const handlePropertyChange = (pgId) => {
    setActivePGId(pgId);

    localStorage.setItem("pgmate_active_pg", pgId);

    // Notify all modules that the selected PG changed.
    window.dispatchEvent(
      new Event("pgmate-pg-changed")
    );
  };

  /* Create property */

  const handlePGChange = (event) => {
    const { name, value } = event.target;

    setPGForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreatePG = async (event) => {
    event.preventDefault();

    setPGError("");
    setCreatingPG(true);

    try {
      const response = await createPGApi(pgForm);
      const newPG = response?.pg || response?.data?.pg;

      if (!newPG?._id) {
        throw new Error("The server did not return the new property.");
      }

      setPGs((previous) => [newPG, ...previous]);

      setActivePGId(newPG._id);

      localStorage.setItem(
        "pgmate_active_pg",
        newPG._id
      );

      window.dispatchEvent(
        new Event("pgmate-pg-changed")
      );

      setPGForm({
        name: "",
        address: "",
        city: "",
        state: "",
        contactNumber: "",
        description: "",
      });

      setShowPGModal(false);
    } catch (error) {
      setPGError(error.message || "Failed to create property.");
    } finally {
      setCreatingPG(false);
    }
  };

  /* Logout */

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* Navigation items */

  const navigationItems = [
    { label: "Overview", icon: LayoutDashboard, key: "overview" },
    { label: "Rooms & Beds", icon: BedDouble, key: "rooms" },
    { label: "Tenants", icon: Users, key: "tenants" },
    { label: "Payments", icon: CreditCard, key: "payments" },
    { label: "Expenses", icon: Receipt, key: "expenses" },
    { label: "Complaints", icon: MessageSquareWarning, key: "complaints" },
    { label: "Food Menu", icon: Utensils, key: "food" },
    { label: "Notices", icon: Bell, key: "notices" },
    { label: "Profile", icon: UserCircle, key: "profile" },
  ];

  /* Fetch overview data */

  const loadOverview = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);

      setOverviewData((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));

      try {
        const properties =
          activePGId === "all"
            ? pgs
            : pgs.filter(
              (pg) => String(pg._id) === String(activePGId)
            );

        if (!properties.length) {
          setOverviewData({
            rooms: [],
            payments: [],
            expenses: [],
            complaints: [],
            paymentSummaries: [],
            expenseSummaries: [],
            loading: false,
            error: "",
          });

          return;
        }

        const now = new Date();
        const month = String(now.getMonth() + 1);
        const year = String(now.getFullYear());

        const results = await Promise.all(
          properties.map(async (pg) => {
            const requests = await Promise.allSettled([
              getMyRoomsApi(pg._id),
              getMyPaymentsApi(pg._id),
              getPaymentSummaryApi(pg._id, month, year),
              getMyExpensesApi(pg._id),
              getExpenseSummaryApi(pg._id),
              getOwnerComplaintsApi(pg._id),
            ]);

            const resultAt = (index) =>
              requests[index].status === "fulfilled"
                ? requests[index].value
                : null;

            const roomResponse = resultAt(0);
            const paymentResponse = resultAt(1);
            const paymentSummaryResponse = resultAt(2);
            const expenseResponse = resultAt(3);
            const expenseSummaryResponse = resultAt(4);
            const complaintResponse = resultAt(5);

            return {
              rooms: asArray(roomResponse, "rooms"),
              payments: asArray(paymentResponse, "payments"),
              paymentSummary: getSummaryObject(paymentSummaryResponse),
              expenses: asArray(expenseResponse, "expenses"),
              expenseSummary: getSummaryObject(expenseSummaryResponse),
              complaints: asArray(complaintResponse, "complaints"),
            };
          })
        );

        setOverviewData({
          rooms: results.flatMap((item) => item.rooms),
          payments: results.flatMap((item) => item.payments),
          expenses: results.flatMap((item) => item.expenses),
          complaints: results.flatMap((item) => item.complaints),
          paymentSummaries: results.map((item) => item.paymentSummary),
          expenseSummaries: results.map((item) => item.expenseSummary),
          loading: false,
          error: "",
        });
      } catch (error) {
        console.error("Overview loading error:", error);

        setOverviewData((previous) => ({
          ...previous,
          loading: false,
          error: error.message || "Could not load overview data.",
        }));
      } finally {
        setRefreshing(false);
      }
    },
    [activePGId, pgs]
  );

  useEffect(() => {
    if (!pgLoading) {
      loadOverview();
    }
  }, [pgLoading, loadOverview]);

  /* Dynamic totals */

  const dashboard = useMemo(() => {
    const rooms = overviewData.rooms;
    const payments = overviewData.payments;
    const expenses = overviewData.expenses;
    const complaints = overviewData.complaints;

    const capacity = rooms.reduce(
      (sum, room) => sum + roomCapacity(room),
      0
    );

    const occupied = rooms.reduce(
      (sum, room) => sum + roomOccupied(room),
      0
    );

    const vacant = rooms.reduce(
      (sum, room) => sum + roomVacant(room),
      0
    );

    const currentMonth = getMonthKey(new Date());

    const currentMonthPayments = payments.filter(
      (payment) => getMonthKey(paymentDate(payment)) === currentMonth
    );

    const collectedFromRecords = currentMonthPayments
      .filter(isPaid)
      .reduce((sum, payment) => sum + paymentAmount(payment), 0);

    const pendingFromRecords = currentMonthPayments
      .filter(isPending)
      .reduce((sum, payment) => sum + paymentAmount(payment), 0);

    const expenseFromRecords = expenses
      .filter((expense) =>
        getMonthKey(
          expense?.expenseDate ||
          expense?.date ||
          expense?.createdAt
        ) === currentMonth
      )
      .reduce((sum, expense) => sum + safeNumber(expense?.amount), 0);


    const collectedFromSummary = overviewData.paymentSummaries.reduce(
      (sum, summary) =>
        sum +
        (findSummaryNumber(summary, [
          "totalCollected",
          "monthlyCollected",
          "monthlyPaid",
          "totalPaid",
          "collectedAmount",
          "paidAmount",
        ]) ?? 0),
      0
    );


    const pendingFromSummary = overviewData.paymentSummaries.reduce(
      (sum, summary) =>
        sum +
        (findSummaryNumber(summary, [
          "pendingAmount",
          "overdueAmount",
          "totalPending",
        ]) ?? 0),
      0
    );

    const expensesFromSummary = overviewData.expenseSummaries.reduce(
      (sum, summary) =>
        sum +
        (findSummaryNumber(summary, [
          "monthlyTotal",
          "currentMonthTotal",
          "totalThisMonth",
          "monthlyExpenses",
        ]) ?? 0),
      0
    );

    const collected = collectedFromSummary || collectedFromRecords;
    const pendingAmount = pendingFromSummary || pendingFromRecords;
    const expenseTotal = expensesFromSummary || expenseFromRecords;

    const recentPayments = [...payments]
      .filter((payment) => paymentDate(payment))
      .sort((a, b) => {
        const dateA = validDate(paymentDate(a))?.getTime() || 0;
        const dateB = validDate(paymentDate(b))?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 4);

    return {
      capacity,
      occupied,
      vacant,
      occupancyPercent: capacity
        ? Math.min(100, Math.round((occupied / capacity) * 100))
        : 0,
      collected,
      pendingAmount,
      netIncome: collected - expenseTotal,
      overdueCount: payments.filter(isOverdue).length,
      openComplaints: complaints.filter(isComplaintOpen),
      payments,
      recentPayments,
    };
  }, [overviewData]);

  /* Date and greeting */

  const now = new Date();

  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 17
        ? "Good Afternoon"
        : "Good Evening";

  const ownerName = user?.name || user?.fullName || "Owner";

  const propertyName =
    activePGId === "all"
      ? "All Properties"
      : activePG?.name || "Select a property";

  const propertyLocation =
    activePGId === "all"
      ? `${pgs.length} properties combined`
      : [activePG?.city, activePG?.state].filter(Boolean).join(", ") ||
      activePG?.address ||
      "Property location";

  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const goTo = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const monthlyRevenue = useMemo(() => {
    const currentDate = new Date();

    return Array.from({ length: chartPeriod }, (_, index) => {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - chartPeriod + index + 1,
        1
      );

      const key = getMonthKey(date);

      const total = dashboard.payments
        .filter(
          (payment) =>
            isPaid(payment) &&
            getMonthKey(paymentDate(payment)) === key
        )
        .reduce((sum, payment) => sum + paymentAmount(payment), 0);

      return {
        key,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        total,
      };
    });
  }, [dashboard.payments, chartPeriod]);

  const revenueMax = Math.max(
    1,
    ...monthlyRevenue.map((item) => item.total)
  );

  const revenuePoints = monthlyRevenue.map((item, index) => {
    const width = 600;
    const height = 160;
    const left = 10;
    const right = 10;
    const top = 12;
    const bottom = 25;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    return {
      ...item,
      x:
        left +
        (index / Math.max(monthlyRevenue.length - 1, 1)) * plotWidth,
      y: top + plotHeight - (item.total / revenueMax) * plotHeight,
    };
  });

  const revenueLine = revenuePoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const revenueArea = revenuePoints.length
    ? `10,135 ${revenueLine} 590,135`
    : "";

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="owner-dashboard">
      {/* MOBILE HEADER */}

      <header className="owner-mobile-header">
        <div className="owner-mobile-brand">
          <div className="owner-mobile-brand-icon">
            <Building2 size={18} />
          </div>

          <div>
            <strong>PGmate</strong>
            <span>Owner Portal</span>
          </div>
        </div>

        <div className="owner-mobile-header-right">
          <div className="owner-mobile-avatar">
            {ownerName.charAt(0).toUpperCase()}
          </div>

          <button
            className="owner-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="owner-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`owner-sidebar ${mobileMenuOpen ? "owner-sidebar-open" : ""
          }`}
      >
        <div className="owner-brand">
          <div className="owner-brand-icon">
            <Building2 size={20} />
          </div>

          <div className="owner-brand-text">
            <strong>PGmate</strong>
            <span>OWNER PORTAL</span>
          </div>

          <button
            className="owner-sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        <div className="owner-property-selector">
          <span className="owner-property-label">ACTIVE PROPERTY</span>

          <div className="owner-property-select-wrapper">
            <Building2 size={16} />

            <select
              value={activePGId}
              onChange={(event) =>
                handlePropertyChange(event.target.value)
              }
              aria-label="Select property"
            >

              {pgs.map((pg) => (
                <option key={pg._id} value={pg._id}>
                  {pg.name}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="owner-property-chevron"
            />
          </div>
        </div>

        <nav className="owner-navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                className={`owner-nav-item ${activeSection === item.key ? "active" : ""
                  }`}
                onClick={() => goTo(item.key)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="owner-sidebar-bottom">
          <button
            className="owner-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="owner-main">
        <header className="owner-topbar">
          <div>
            <h1>
              {activeSection === "overview"
                ? `${greeting}, ${ownerName}`
                : navigationItems.find(
                  (item) => item.key === activeSection
                )?.label || "Dashboard"}
            </h1>

            <p>
              {activeSection === "overview"
                ? "Here's what's happening at your property today."
                : activeSection === "profile"
                  ? "Manage your account and properties"
                  : propertyName}
            </p>
          </div>

          <div className="owner-topbar-right">
            <div className="ov-date">
              <CalendarDays size={17} />
              <span>{todayLabel}</span>
            </div>

            <div className="owner-profile">
              <div className="owner-avatar">
                {ownerName.charAt(0).toUpperCase()}
              </div>

              <div className="owner-profile-info">
                <strong>{ownerName}</strong>
                <span>PG Owner</span>
              </div>
            </div>
          </div>
        </header>

        <section className="owner-content">
          {/* OTHER EXISTING PAGES */}

          {activeSection === "rooms" ? (
            <RoomsBeds />
          ) : activeSection === "tenants" ? (
            <Tenants />
          ) : activeSection === "payments" ? (
            <Payments />
          ) : activeSection === "expenses" ? (
            <Expenses />
          ) : activeSection === "complaints" ? (
            <Complaints />
          ) : activeSection === "food" ? (
            <FoodMenu />
          ) : activeSection === "notices" ? (
            <Notices />
          ) : activeSection === "profile" ? (
            <OwnerProfile />
          ) : (
            <>
              {pgLoading || overviewData.loading ? (
                <div className="ov-loading">
                  Loading your dashboard...
                </div>
              ) : (
                <>
                  {overviewData.error && (
                    <div className="ov-error">
                      <AlertCircle size={17} />
                      <span>{overviewData.error}</span>

                      <button
                        onClick={() => loadOverview(true)}
                        disabled={refreshing}
                      >
                        <RefreshCw size={14} />
                        {refreshing ? "Loading..." : "Retry"}
                      </button>
                    </div>
                  )}


                  {pgs.length === 0 ? (
                    <section className="owner-first-property">
                      <div className="owner-first-property-content">
                        <Building2 size={44} strokeWidth={2} />

                        <h2>No properties yet</h2>

                        <p>Add your first PG to get started.</p>

                        <button
                          type="button"
                          onClick={() => {
                            setPGError("");
                            setShowPGModal(true);
                          }}
                          disabled={creatingPG}
                        >
                          <Plus size={17} />
                          Add Your First PG
                        </button>
                      </div>
                    </section>
                  ) : (

                    <>
                      {/* ACTIVE PROPERTY BANNER */}

                      <section className="ov-property-banner">
                        <div className="ov-property-art">
                          <Building2 size={68} strokeWidth={1.1} />
                        </div>

                        <div className="ov-property-main">
                          <span>ACTIVE PROPERTY</span>
                          <h2>{propertyName}</h2>

                          <p>
                            <MapPin size={15} />
                            {propertyLocation}
                          </p>
                        </div>

                        <div className="ov-property-metrics">
                          <div>
                            <Building2 size={22} />
                            <strong>{dashboard.capacity}</strong>
                            <span>Total Capacity</span>
                          </div>

                          <div>
                            <Users size={23} />
                            <strong>{dashboard.occupied}</strong>
                            <span>Current Occupancy</span>
                          </div>

                          <div>
                            <KeyRound size={22} />
                            <strong>{dashboard.vacant}</strong>
                            <span>Vacant Beds</span>
                          </div>
                        </div>

                        <button
                          className="ov-property-link"
                          onClick={() => goTo("profile")}
                        >
                          View property
                          <ArrowRight size={16} />
                        </button>
                      </section>

                      {/* SUMMARY CARDS */}

                      <section className="ov-stats-grid">
                        <article className="ov-stat-card">
                          <div className="ov-stat-icon ov-orange">
                            <BedDouble size={23} />
                          </div>

                          <div className="ov-stat-content">
                            <span className="ov-stat-label">Occupancy</span>

                            <strong className="ov-stat-value">
                              {dashboard.occupied} / {dashboard.capacity}
                            </strong>

                            <div className="ov-progress-track">
                              <span
                                style={{
                                  width: `${dashboard.occupancyPercent}%`,
                                }}
                              />
                            </div>

                            <small>
                              {dashboard.occupancyPercent}% occupied
                            </small>
                          </div>
                        </article>

                        <article className="ov-stat-card">
                          <div className="ov-stat-icon ov-green">
                            <Wallet size={23} />
                          </div>

                          <div className="ov-stat-content">
                            <span className="ov-stat-label">
                              Rent Collected
                            </span>

                            <strong className="ov-stat-value">
                              {money(dashboard.collected)}
                            </strong>

                            <small>Current month</small>
                          </div>
                        </article>

                        <article className="ov-stat-card">
                          <div className="ov-stat-icon ov-red">
                            <AlertCircle size={23} />
                          </div>

                          <div className="ov-stat-content">
                            <span className="ov-stat-label">
                              Pending Rent
                            </span>

                            <strong className="ov-stat-value">
                              {money(dashboard.pendingAmount)}
                            </strong>

                            <small>
                              {dashboard.overdueCount} overdue payments
                            </small>
                          </div>
                        </article>

                        <article className="ov-stat-card">
                          <div className="ov-stat-icon ov-blue">
                            <TrendingUp size={23} />
                          </div>

                          <div className="ov-stat-content">
                            <span className="ov-stat-label">Net Income</span>

                            <strong className="ov-stat-value">
                              {money(dashboard.netIncome)}
                            </strong>

                            <small>After expenses</small>
                          </div>
                        </article>
                      </section>

                      {/* REVENUE AND OCCUPANCY */}

                      <section className="ov-analytics-grid">
                        <article className="ov-panel ov-revenue-card">
                          <div className="ov-panel-heading">
                            <div>
                              <h2>Revenue Overview</h2>
                              <p>Rent collection trend over time</p>
                            </div>

                            <div className="ov-period-switch">
                              <button
                                type="button"
                                className={
                                  chartPeriod === 6 ? "active" : ""
                                }
                                onClick={() => setChartPeriod(6)}
                              >
                                6 months
                              </button>

                              <button
                                type="button"
                                className={
                                  chartPeriod === 12 ? "active" : ""
                                }
                                onClick={() => setChartPeriod(12)}
                              >
                                12 months
                              </button>
                            </div>
                          </div>

                          <div className="ov-chart-layout">
                            <div className="ov-chart-axis">
                              <span>{money(revenueMax)}</span>
                              <span>{money(revenueMax * 0.66)}</span>
                              <span>{money(revenueMax * 0.33)}</span>
                              <span>₹0</span>
                            </div>

                            <svg
                              className="ov-chart-svg"
                              viewBox="0 0 600 160"
                              role="img"
                              aria-label="Monthly rent collection chart"
                            >
                              <defs>
                                <linearGradient
                                  id="ov-revenue-gradient"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#08a66a"
                                    stopOpacity="0.35"
                                  />

                                  <stop
                                    offset="100%"
                                    stopColor="#08a66a"
                                    stopOpacity="0.04"
                                  />
                                </linearGradient>
                              </defs>

                              {[12, 53, 94, 135].map((y) => (
                                <line
                                  key={y}
                                  x1="10"
                                  x2="590"
                                  y1={y}
                                  y2={y}
                                  className="ov-grid-line"
                                />
                              ))}

                              {revenuePoints.map((point) => (
                                <line
                                  key={`grid-${point.key}`}
                                  x1={point.x}
                                  x2={point.x}
                                  y1="12"
                                  y2="135"
                                  className="ov-grid-line ov-grid-vertical"
                                />
                              ))}

                              {revenueArea && (
                                <polygon
                                  points={revenueArea}
                                  fill="url(#ov-revenue-gradient)"
                                />
                              )}

                              <polyline
                                points={revenueLine}
                                className="ov-chart-line"
                              />

                              {revenuePoints.map((point) => (
                                <g key={point.key}>
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4.5"
                                    className="ov-chart-point"
                                  />

                                  <text
                                    x={point.x}
                                    y="155"
                                    textAnchor="middle"
                                    className="ov-chart-label"
                                  >
                                    {point.label}
                                  </text>
                                </g>
                              ))}
                            </svg>
                          </div>

                          {dashboard.payments.length === 0 && (
                            <div className="ov-chart-empty">
                              No payment records available yet.
                            </div>
                          )}
                        </article>

                        <article className="ov-panel ov-occupancy-card">
                          <div className="ov-panel-heading">
                            <div>
                              <h2>Occupancy Snapshot</h2>
                              <p>Current room occupancy status</p>
                            </div>
                          </div>

                          <div className="ov-occupancy-layout">
                            <div
                              className="ov-donut"
                              style={{
                                background: `conic-gradient(#08a66a ${dashboard.occupancyPercent * 3.6
                                  }deg, #a9ead8 0deg)`,
                              }}
                            >
                              <div className="ov-donut-inner">
                                <strong>
                                  {dashboard.occupancyPercent}%
                                </strong>
                                <span>Occupied</span>
                              </div>
                            </div>

                            <div className="ov-legend">
                              <div className="ov-legend-row">
                                <i className="ov-dot ov-dot-green" />
                                <span>Occupied Beds</span>
                                <strong>{dashboard.occupied}</strong>
                                <small>
                                  {dashboard.occupancyPercent}%
                                </small>
                              </div>

                              <div className="ov-legend-row">
                                <i className="ov-dot ov-dot-mint" />
                                <span>Vacant Beds</span>
                                <strong>{dashboard.vacant}</strong>
                                <small>
                                  {dashboard.capacity
                                    ? Math.round(
                                      (dashboard.vacant /
                                        dashboard.capacity) *
                                      100
                                    )
                                    : 0}
                                  %
                                </small>
                              </div>

                              <div className="ov-capacity-row">
                                <BedDouble size={22} />
                                <span>Total Capacity</span>
                                <strong>{dashboard.capacity}</strong>
                              </div>
                            </div>
                          </div>
                        </article>
                      </section>

                      {/* RECENT RENT PAYMENTS */}

                      <section className="ov-panel ov-payments-panel">
                        <div className="ov-panel-heading">
                          <div>
                            <h2>Recent Rent Payments</h2>
                            <p>Latest rent collections</p>
                          </div>

                          <button
                            type="button"
                            className="ov-text-link"
                            onClick={() => goTo("payments")}
                          >
                            View All
                            <ArrowRight size={15} />
                          </button>
                        </div>

                        <div className="ov-table-wrap">
                          <table className="ov-payments-table">
                            <thead>
                              <tr>
                                <th>Tenant</th>
                                <th>Room</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                              </tr>
                            </thead>

                            <tbody>
                              {dashboard.recentPayments.map(
                                (payment, index) => {
                                  const status = getStatusLabel(payment);

                                  return (
                                    <tr
                                      key={
                                        payment._id ||
                                        payment.id ||
                                        `${paymentDate(payment)}-${index}`
                                      }
                                    >
                                      <td>
                                        <div className="ov-tenant-cell">
                                          <span
                                            className={`ov-initial ov-initial-${index % 4
                                              }`}
                                          >
                                            {getTenantName(payment)
                                              .charAt(0)
                                              .toUpperCase()}
                                          </span>

                                          <strong>
                                            {getTenantName(payment)}
                                          </strong>
                                        </div>
                                      </td>

                                      <td>{getRoomName(payment)}</td>

                                      <td className="ov-amount-cell">
                                        {money(paymentAmount(payment))}
                                      </td>

                                      <td>
                                        {dateLabel(paymentDate(payment))}
                                      </td>

                                      <td>
                                        <span
                                          className={`ov-status ${status.toLowerCase()}`}
                                        >
                                          {status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}

                              {dashboard.recentPayments.length === 0 && (
                                <tr>
                                  <td colSpan={5}>
                                    No rent payments found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* NEEDS ATTENTION */}

                      <section className="ov-panel ov-attention-panel">
                        <div className="ov-panel-heading">
                          <div>
                            <h2>Needs Attention</h2>
                            <p>Items that require your action</p>
                          </div>
                        </div>

                        <div className="ov-attention-grid">
                          <button
                            type="button"
                            className="ov-attention-item ov-attention-red"
                            onClick={() => goTo("payments")}
                          >
                            <span className="ov-attention-icon">
                              <AlertCircle size={23} />
                            </span>

                            <span className="ov-attention-text">
                              <strong>
                                {dashboard.overdueCount} Rent Payments
                                Overdue
                              </strong>

                              <small>
                                Follow up with tenants for pending payments
                              </small>
                            </span>

                            <ArrowRight size={17} />
                          </button>

                          <button
                            type="button"
                            className="ov-attention-item ov-attention-orange"
                            onClick={() => goTo("complaints")}
                          >
                            <span className="ov-attention-icon">
                              <Wrench size={23} />
                            </span>

                            <span className="ov-attention-text">
                              <strong>
                                {dashboard.openComplaints.length} Maintenance
                                Requests
                              </strong>

                              <small>
                                Address reported issues in rooms
                              </small>
                            </span>

                            <ArrowRight size={17} />
                          </button>

                          <button
                            type="button"
                            className="ov-attention-item ov-attention-blue"
                            onClick={() => goTo("rooms")}
                          >
                            <span className="ov-attention-icon">
                              <BedDouble size={23} />
                            </span>

                            <span className="ov-attention-text">
                              <strong>
                                {dashboard.vacant} Beds Available
                              </strong>

                              <small>
                                View available space for new tenants
                              </small>
                            </span>

                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>

      {/* ADD PROPERTY MODAL */}

      {showPGModal && (
        <div
          className="owner-modal-overlay"
          onClick={() => {
            if (!creatingPG) setShowPGModal(false);
          }}
        >
          <div
            className="owner-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="owner-modal-header">
              <div>
                <h2>Add New PG</h2>
                <p>Enter your property details</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPGModal(false)}
                disabled={creatingPG}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePG}>
              <div className="owner-form-group">
                <label>PG Name</label>
                <input
                  type="text"
                  name="name"
                  value={pgForm.name}
                  onChange={handlePGChange}
                  placeholder="Enter PG name"
                  required
                />
              </div>

              <div className="owner-form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={pgForm.address}
                  onChange={handlePGChange}
                  placeholder="Enter full address"
                  required
                />
              </div>

              <div className="owner-form-row">
                <div className="owner-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={pgForm.city}
                    onChange={handlePGChange}
                    placeholder="City"
                    required
                  />
                </div>

                <div className="owner-form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    value={pgForm.state}
                    onChange={handlePGChange}
                    placeholder="State"
                    required
                  />
                </div>
              </div>

              <div className="owner-form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={pgForm.contactNumber}
                  onChange={handlePGChange}
                  placeholder="PG contact number"
                  required
                />
              </div>

              <div className="owner-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={pgForm.description}
                  onChange={handlePGChange}
                  placeholder="Short description of your PG"
                  rows={3}
                />
              </div>

              {pgError && (
                <div className="owner-form-error">{pgError}</div>
              )}

              <div className="owner-modal-actions">
                <button
                  type="button"
                  className="owner-modal-cancel"
                  onClick={() => setShowPGModal(false)}
                  disabled={creatingPG}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="owner-modal-submit"
                  disabled={creatingPG}
                >
                  {creatingPG ? "Saving..." : "Add PG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;