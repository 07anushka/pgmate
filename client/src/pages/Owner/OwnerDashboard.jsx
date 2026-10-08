import { useEffect, useState } from "react";
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
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    AlertCircle,
    Wallet,
    TrendingUp,
    UserCircle,
    ChevronDown,
    Check,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import "./OwnerDashboard.css";
import RoomsBeds from "./RoomsBeds";
import Tenants from "./Tenants";
import Payments from "./Payments";
import Expenses from "./Expenses";
import Complaints from "./Complaints";
import FoodMenu from "./FoodMenu";
import Notices from "./Notices";

function OwnerDashboard() {

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


    /* =========================================
       PGs
    ========================================= */

    const [pgs, setPGs] = useState([]);

    const [pgLoading, setPgLoading] =
        useState(true);

    const [activePGId, setActivePGId] =
        useState(() => {

            return (
                localStorage.getItem(
                    "pgmate_active_pg"
                ) || "all"
            );

        });


    /* =========================================
       ADD PG MODAL
    ========================================= */

    const [
        showPGModal,
        setShowPGModal,
    ] = useState(false);

    const [
        creatingPG,
        setCreatingPG,
    ] = useState(false);

    const [
        pgError,
        setPGError,
    ] = useState("");

    const [
        pgForm,
        setPGForm,
    ] = useState({
        name: "",
        address: "",
        city: "",
        state: "",
        contactNumber: "",
        description: "",
    });


    /* =========================================
       FETCH PGs
    ========================================= */

    useEffect(() => {

        const fetchPGs = async () => {

            try {

                setPgLoading(true);

                const response =
                    await fetch(
                        "http://localhost:5000/api/pg/my",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to fetch properties."
                    );
                }

                const propertyList =
                    data.pgs || [];

                setPGs(propertyList);


                /*
                  Make sure saved active PG
                  still exists.
                */

                if (
                    activePGId !== "all" &&
                    !propertyList.some(
                        (pg) =>
                            pg._id ===
                            activePGId
                    )
                ) {

                    setActivePGId("all");

                    localStorage.setItem(
                        "pgmate_active_pg",
                        "all"
                    );

                }

            } catch (error) {

                console.error(
                    "Fetch PGs error:",
                    error
                );

            } finally {

                setPgLoading(false);

            }

        };


        if (token) {
            fetchPGs();
        }

    }, [token]);


    /* =========================================
       ACTIVE PG
    ========================================= */

    const activePG =
        pgs.find(
            (pg) =>
                pg._id ===
                activePGId
        );


    /* =========================================
       SWITCH PG
    ========================================= */

    const handlePropertyChange = (
        pgId
    ) => {

        setActivePGId(pgId);

        localStorage.setItem(
            "pgmate_active_pg",
            pgId
        );

    };


    /* =========================================
       PG FORM
    ========================================= */

    const handlePGChange = (
        event
    ) => {

        const {
            name,
            value,
        } = event.target;

        setPGForm(
            (previous) => ({
                ...previous,
                [name]: value,
            })
        );

    };


    /* =========================================
       CREATE PG
    ========================================= */

    const handleCreatePG = async (
        event
    ) => {

        event.preventDefault();

        setPGError("");

        setCreatingPG(true);

        try {

            const response =
                await fetch(
                    "http://localhost:5000/api/pg",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },

                        body:
                            JSON.stringify(
                                pgForm
                            ),
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to create PG."
                );

            }


            /* Add new PG */

            setPGs(
                (previous) => [
                    data.pg,
                    ...previous,
                ]
            );


            /* Make new PG active */

            setActivePGId(
                data.pg._id
            );

            localStorage.setItem(
                "pgmate_active_pg",
                data.pg._id
            );


            /* Close modal */

            setShowPGModal(false);


            /* Reset form */

            setPGForm({
                name: "",
                address: "",
                city: "",
                state: "",
                contactNumber: "",
                description: "",
            });

        } catch (error) {

            setPGError(
                error.message
            );

        } finally {

            setCreatingPG(false);

        }

    };


    /* =========================================
       LOGOUT
    ========================================= */

    const handleLogout = () => {

        logout();

        navigate("/login");

    };


    /* =========================================
       NAVIGATION ITEMS
    ========================================= */

    const navigationItems = [
        {
            label: "Overview",
            icon: LayoutDashboard,
            key: "overview",
        },
        {
            label: "Rooms & Beds",
            icon: BedDouble,
            key: "rooms",
        },
        {
            label: "Tenants",
            icon: Users,
            key: "tenants",
        },
        {
            label: "Payments",
            icon: CreditCard,
            key: "payments",
        },
        {
            label: "Expenses",
            icon: Receipt,
            key: "expenses",
        },
        {
            label: "Complaints",
            icon: MessageSquareWarning,
            key: "complaints",
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
            label: "Profile",
            icon: UserCircle,
            key: "profile",
        },
    ];


    /* =========================================
       DEMO DATA
    ========================================= */

    const recentPayments = [
        {
            name: "Rahul Sharma",
            room: "Room 101",
            method: "UPI",
            date: "02 Jul 2026",
            amount: "₹12,500",
        },
        {
            name: "Priya Sundaram",
            room: "Room 102",
            method: "Bank Transfer",
            date: "03 Jul 2026",
            amount: "₹18,000",
        },
        {
            name: "Siddharth Rao",
            room: "Room 201",
            method: "UPI",
            date: "05 Jul 2026",
            amount: "₹13,000",
        },
        {
            name: "Rohan Gupta",
            room: "Room 201",
            method: "Cash",
            date: "06 Jul 2026",
            amount: "₹13,000",
        },
    ];


    const tenantRentStatus = [
        {
            name: "Rahul Sharma",
            room: "Room 101 • Bed A",
            status: "Paid",
        },
        {
            name: "Amit Verma",
            room: "Room 101 • Bed B",
            status: "Pending",
            due: "₹12,500",
        },
        {
            name: "Priya Sundaram",
            room: "Room 102 • Bed A",
            status: "Paid",
        },
        {
            name: "Vikram Reddy",
            room: "Room 103 • Bed A",
            status: "Overdue",
            due: "₹9,500",
        },
    ];


    const rooms = [
        {
            room: "Room 101",
            floor: "Floor 1",
            type: "Double Sharing",
            ac: "AC",
            occupancy: "2 / 2",
            rent: "₹12,500",
        },
        {
            room: "Room 102",
            floor: "Floor 1",
            type: "Single Room",
            ac: "AC",
            occupancy: "1 / 1",
            rent: "₹18,000",
        },
        {
            room: "Room 103",
            floor: "Floor 1",
            type: "Triple Sharing",
            ac: "Non-AC",
            occupancy: "2 / 3",
            rent: "₹9,500",
        },
        {
            room: "Room 201",
            floor: "Floor 2",
            type: "Double Sharing",
            ac: "AC",
            occupancy: "2 / 2",
            rent: "₹13,000",
        },
    ];


    const complaints = [
        {
            id: "TKT-801",
            title:
                "WiFi internet lagging during evening hours",
            tenant: "Rahul Sharma",
            room: "Room 101",
            date: "22 Jul 2026",
            status: "In Progress",
        },
        {
            id: "TKT-802",
            title:
                "Bathroom tap leaking continuously",
            tenant: "Vikram Reddy",
            room: "Room 103",
            date: "24 Jul 2026",
            status: "Open",
        },
        {
            id: "TKT-803",
            title:
                "AC remote battery replacement",
            tenant: "Karthik Raja",
            room: "Room 201",
            date: "18 Jul 2026",
            status: "Resolved",
        },
    ];


    /* =========================================
       RENDER
    ========================================= */

    return (
        <div className="owner-dashboard">


            {/* MOBILE HEADER */}

            <header className="owner-mobile-header">

                <div className="owner-mobile-brand">

                    <div className="owner-mobile-brand-icon">
                        <Building2 size={18} />
                    </div>

                    <div>
                        <strong>
                            PGmate
                        </strong>

                        <span>
                            Owner Portal
                        </span>
                    </div>

                </div>


                <div className="owner-mobile-header-right">

                    <div className="owner-mobile-avatar">
                        {user?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "O"}
                    </div>

                    <button
                        className="owner-menu-button"
                        onClick={() =>
                            setMobileMenuOpen(
                                true
                            )
                        }
                    >
                        <Menu size={20} />
                    </button>

                </div>

            </header>


            {/* MOBILE OVERLAY */}

            {mobileMenuOpen && (
                <div
                    className="owner-sidebar-overlay"
                    onClick={() =>
                        setMobileMenuOpen(
                            false
                        )
                    }
                />
            )}


            {/* SIDEBAR */}

            <aside
                className={`owner-sidebar ${mobileMenuOpen
                    ? "owner-sidebar-open"
                    : ""
                    }`}
            >

                {/* BRAND */}

                <div className="owner-brand">

                    <div className="owner-brand-icon">
                        <Building2 size={20} />
                    </div>

                    <div className="owner-brand-text">

                        <strong>
                            PGmate
                        </strong>

                        <span>
                            OWNER PORTAL
                        </span>

                    </div>

                    <button
                        className="owner-sidebar-close"
                        onClick={() =>
                            setMobileMenuOpen(
                                false
                            )
                        }
                    >
                        <X size={17} />
                    </button>

                </div>


                {/* ACTIVE PROPERTY */}

                <div className="owner-property-selector">

                    <span className="owner-property-label">
                        ACTIVE PROPERTY
                    </span>


                    <div className="owner-property-select-wrapper">

                        <Building2
                            size={16}
                        />


                        <select
                            value={activePGId}
                            onChange={(event) =>
                                handlePropertyChange(
                                    event.target.value
                                )
                            }
                        >

                            <option value="all">
                                All Properties (Combined)
                            </option>


                            {pgs.map(
                                (pg) => (
                                    <option
                                        key={pg._id}
                                        value={pg._id}
                                    >
                                        {pg.name}
                                    </option>
                                )
                            )}

                        </select>


                        <ChevronDown
                            size={16}
                            className="owner-property-chevron"
                        />

                    </div>

                </div>


                {/* NAVIGATION */}

                <nav className="owner-navigation">

                    {navigationItems.map(
                        (item) => {

                            const Icon =
                                item.icon;

                            return (
                                <button
                                    key={item.key}
                                    className={`owner-nav-item ${activeSection ===
                                        item.key
                                        ? "active"
                                        : ""
                                        }`}
                                    onClick={() => {

                                        setActiveSection(
                                            item.key
                                        );

                                        setMobileMenuOpen(
                                            false
                                        );

                                    }}
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

                <div className="owner-sidebar-bottom">

                    <button
                        className="owner-logout-button"
                        onClick={
                            handleLogout
                        }
                    >

                        <LogOut size={16} />

                        <span>
                            Logout
                        </span>

                    </button>

                </div>

            </aside>


            {/* MAIN */}

            <main className="owner-main">


                {/* DESKTOP TOPBAR */}

                <header className="owner-topbar">

                    <div>

                        <h1>
                            {activeSection ===
                                "profile"
                                ? "Profile"
                                : "Dashboard"}
                        </h1>

                        <p>

                            {activeSection ===
                                "profile"
                                ? "Manage your account and properties"
                                : activePGId ===
                                    "all"
                                    ? "All properties combined"
                                    : activePG?.name ||
                                    "Select a property"}

                        </p>

                    </div>


                    <div className="owner-profile">

                        <div className="owner-avatar">

                            {user?.name
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "O"}

                        </div>


                        <div className="owner-profile-info">

                            <strong>
                                {user?.name ||
                                    "Owner"}
                            </strong>

                            <span>
                                PG Owner
                            </span>

                        </div>

                    </div>

                </header>


                {/* CONTENT */}

                <section className="owner-content">


                    {/* =================================
              PROFILE
          ================================= */}

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

                        <div className="owner-profile-page">


                            <div className="owner-mobile-page-title">

                                <span>
                                    ACCOUNT
                                </span>

                                <h1>
                                    Profile
                                </h1>

                                <p>
                                    Manage your account
                                    and properties.
                                </p>

                            </div>


                            {/* ACCOUNT */}

                            <section className="owner-section">

                                <div className="owner-section-header">

                                    <div>

                                        <h2>
                                            Account Information
                                        </h2>

                                        <p>
                                            Your PGmate owner account
                                        </p>

                                    </div>

                                </div>


                                <div className="owner-profile-account">

                                    <div className="owner-profile-large-avatar">

                                        {user?.name
                                            ?.charAt(0)
                                            ?.toUpperCase() ||
                                            "O"}

                                    </div>


                                    <div>

                                        <h2>
                                            {user?.name ||
                                                "Owner"}
                                        </h2>

                                        <span>
                                            PG Owner
                                        </span>

                                    </div>

                                </div>


                                <div className="owner-account-info">

                                    <div>

                                        <span>
                                            Name
                                        </span>

                                        <strong>
                                            {user?.name ||
                                                "-"}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Mobile
                                        </span>

                                        <strong>
                                            {user?.mobile ||
                                                "-"}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Role
                                        </span>

                                        <strong>
                                            PG Owner
                                        </strong>

                                    </div>

                                </div>

                            </section>


                            {/* PROPERTIES */}

                            <section className="owner-section">

                                <div className="owner-section-header">

                                    <div>

                                        <h2>
                                            My Properties
                                        </h2>

                                        <p>
                                            Add and manage your PGs
                                        </p>

                                    </div>


                                    <button
                                        className="owner-profile-add-button"
                                        onClick={() => {

                                            setPGError("");

                                            setShowPGModal(
                                                true
                                            );

                                        }}
                                    >

                                        <Plus size={14} />

                                        Add PG

                                    </button>

                                </div>


                                <div className="owner-properties-list">

                                    {pgLoading ? (

                                        <div className="owner-empty-state">

                                            Loading properties...

                                        </div>

                                    ) : pgs.length ===
                                        0 ? (

                                        <div className="owner-empty-state">

                                            <Building2
                                                size={30}
                                            />

                                            <strong>
                                                No properties yet
                                            </strong>

                                            <span>
                                                Add your first PG to get started.
                                            </span>


                                            <button
                                                onClick={() =>
                                                    setShowPGModal(
                                                        true
                                                    )
                                                }
                                            >

                                                <Plus size={14} />

                                                Add Your First PG

                                            </button>

                                        </div>

                                    ) : (

                                        pgs.map(
                                            (pg) => (

                                                <div
                                                    className={`owner-property-card ${activePGId ===
                                                        pg._id
                                                        ? "selected"
                                                        : ""
                                                        }`}
                                                    key={pg._id}
                                                >

                                                    <div className="owner-property-card-icon">

                                                        <Building2
                                                            size={19}
                                                        />

                                                    </div>


                                                    <div className="owner-property-card-info">

                                                        <div className="owner-property-card-title">

                                                            <strong>
                                                                {pg.name}
                                                            </strong>


                                                            {activePGId ===
                                                                pg._id && (
                                                                    <span>
                                                                        Active
                                                                    </span>
                                                                )}

                                                        </div>


                                                        <p>

                                                            <MapPin
                                                                size={12}
                                                            />

                                                            {pg.address},{" "}
                                                            {pg.city},{" "}
                                                            {pg.state}

                                                        </p>


                                                        <p>

                                                            <Phone
                                                                size={12}
                                                            />

                                                            {pg.contactNumber}

                                                        </p>

                                                    </div>


                                                    <button
                                                        className="owner-switch-property"
                                                        onClick={() =>
                                                            handlePropertyChange(
                                                                pg._id
                                                            )
                                                        }
                                                    >

                                                        {activePGId ===
                                                            pg._id ? (
                                                            <>
                                                                <Check
                                                                    size={12}
                                                                />

                                                                Active
                                                            </>
                                                        ) : (
                                                            "Switch"
                                                        )}

                                                    </button>

                                                </div>

                                            )
                                        )

                                    )}

                                </div>

                            </section>

                        </div>

                    ) : (

                        <>

                            {/* MOBILE TITLE */}

                            <div className="owner-mobile-page-title">

                                <span>
                                    {activePGId ===
                                        "all"
                                        ? "ALL PROPERTIES"
                                        : "ACTIVE PROPERTY"}
                                </span>

                                <h1>
                                    Dashboard
                                </h1>

                                <p>

                                    {activePGId ===
                                        "all"
                                        ? "Combined overview of all your PG properties."
                                        : activePG?.name ||
                                        "Select a property."}

                                </p>

                            </div>


                            {/* ACTIVE PROPERTY */}

                            <section className="owner-active-property-card">

                                <div className="owner-active-property-icon">

                                    <Building2
                                        size={23}
                                    />

                                </div>


                                <div className="owner-active-property-info">

                                    <span>
                                        ACTIVE PROPERTY
                                    </span>

                                    <h2>

                                        {activePGId ===
                                            "all"
                                            ? "All Properties"
                                            : activePG?.name ||
                                            "No property selected"}

                                    </h2>

                                    <p>

                                        {activePGId ===
                                            "all"
                                            ? `${pgs.length} ${pgs.length ===
                                                1
                                                ? "property"
                                                : "properties"
                                            } combined`
                                            : activePG
                                                ? `${activePG.city}, ${activePG.state}`
                                                : "Select a property"}

                                    </p>

                                </div>


                                <div className="owner-active-property-badge">

                                    {activePGId ===
                                        "all"
                                        ? "Combined"
                                        : "Active"}

                                </div>

                            </section>


                            {/* STATS */}

                            <div className="owner-stat-grid">

                                <div className="owner-stat-card">

                                    <div className="owner-stat-icon orange">

                                        <BedDouble
                                            size={19}
                                        />

                                    </div>

                                    <div>

                                        <strong>
                                            42 / 48
                                        </strong>

                                        <span>
                                            Total Occupancy
                                        </span>

                                        <small className="stat-positive">
                                            88% Occupied
                                        </small>

                                    </div>

                                </div>


                                <div className="owner-stat-card">

                                    <div className="owner-stat-icon green">

                                        <Wallet
                                            size={19}
                                        />

                                    </div>

                                    <div>

                                        <strong>
                                            ₹94,000
                                        </strong>

                                        <span>
                                            Rent Collected
                                        </span>

                                        <small>
                                            Current Month
                                        </small>

                                    </div>

                                </div>


                                <div className="owner-stat-card">

                                    <div className="owner-stat-icon red">

                                        <AlertCircle
                                            size={19}
                                        />

                                    </div>

                                    <div>

                                        <strong>
                                            ₹28,000
                                        </strong>

                                        <span>
                                            Pending Rent
                                        </span>

                                        <small className="stat-danger">
                                            3 tenants pending
                                        </small>

                                    </div>

                                </div>


                                <div className="owner-stat-card">

                                    <div className="owner-stat-icon blue">

                                        <TrendingUp
                                            size={19}
                                        />

                                    </div>

                                    <div>

                                        <strong>
                                            ₹48,810
                                        </strong>

                                        <span>
                                            Net Income
                                        </span>

                                        <small>
                                            After expenses
                                        </small>

                                    </div>

                                </div>

                            </div>


                            {/* QUICK ACTIONS */}

                            <section className="owner-section">

                                <div className="owner-section-header">

                                    <div>

                                        <h2>
                                            Quick Actions
                                        </h2>

                                        <p>
                                            Manage your PG operations
                                        </p>

                                    </div>

                                </div>


                                <div className="owner-quick-actions">

                                    <button className="quick-primary">

                                        <Plus size={17} />

                                        Add Tenant

                                    </button>


                                    <button>

                                        <BedDouble size={17} />

                                        Add Room

                                    </button>


                                    <button>

                                        <CreditCard size={17} />

                                        Record Payment

                                    </button>


                                    <button>

                                        <Receipt size={17} />

                                        Log Expense

                                    </button>

                                </div>

                            </section>


                            {/* TWO COLUMNS */}

                            <div className="owner-two-column">


                                {/* PAYMENTS */}

                                <section className="owner-section">

                                    <div className="owner-section-header">

                                        <div>

                                            <h2>
                                                Recent Rent Payments
                                            </h2>

                                            <p>
                                                Latest collections
                                            </p>

                                        </div>

                                        <button className="owner-view-all">

                                            View All

                                            <ArrowUpRight
                                                size={13}
                                            />

                                        </button>

                                    </div>


                                    <div className="owner-payment-list">

                                        {recentPayments.map(
                                            (payment) => (

                                                <div
                                                    className="owner-payment-item"
                                                    key={`${payment.name}-${payment.date}`}
                                                >

                                                    <div className="owner-payment-main">

                                                        <strong>
                                                            {payment.name}
                                                        </strong>

                                                        <span>
                                                            {payment.room}
                                                            {" • "}
                                                            {payment.method}
                                                        </span>

                                                        <small>
                                                            {payment.date}
                                                        </small>

                                                    </div>


                                                    <div className="owner-payment-right">

                                                        <strong>
                                                            +{payment.amount}
                                                        </strong>

                                                        <span className="status-success">
                                                            Successful
                                                        </span>

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                </section>


                                {/* RENT STATUS */}

                                <section className="owner-section">

                                    <div className="owner-section-header">

                                        <div>

                                            <h2>
                                                Tenant Rent Status
                                            </h2>

                                            <p>
                                                Current payments
                                            </p>

                                        </div>

                                        <button className="owner-view-all">

                                            Manage

                                            <ArrowUpRight
                                                size={13}
                                            />

                                        </button>

                                    </div>


                                    <div className="owner-rent-status-list">

                                        {tenantRentStatus.map(
                                            (tenant) => (

                                                <div
                                                    className="owner-rent-item"
                                                    key={tenant.name}
                                                >

                                                    <div>

                                                        <strong>
                                                            {tenant.name}
                                                        </strong>

                                                        <span>
                                                            {tenant.room}
                                                        </span>

                                                    </div>


                                                    <div className="owner-rent-status">

                                                        <span
                                                            className={`rent-badge ${tenant.status.toLowerCase()
                                                                }`}
                                                        >

                                                            {tenant.status ===
                                                                "Paid" && (
                                                                    <CheckCircle2
                                                                        size={11}
                                                                    />
                                                                )}

                                                            {tenant.status ===
                                                                "Pending" && (
                                                                    <Clock3
                                                                        size={11}
                                                                    />
                                                                )}

                                                            {tenant.status ===
                                                                "Overdue" && (
                                                                    <AlertCircle
                                                                        size={11}
                                                                    />
                                                                )}

                                                            {tenant.status}

                                                        </span>


                                                        {tenant.due && (
                                                            <small>
                                                                Due:{" "}
                                                                {tenant.due}
                                                            </small>
                                                        )}

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                </section>

                            </div>


                            {/* ROOMS */}

                            <section className="owner-section">

                                <div className="owner-section-header">

                                    <div>

                                        <h2>
                                            Rooms Overview
                                        </h2>

                                        <p>
                                            Current room occupancy
                                        </p>

                                    </div>

                                    <button className="owner-view-all">

                                        View All

                                        <ArrowUpRight
                                            size={13}
                                        />

                                    </button>

                                </div>


                                <div className="owner-room-list">

                                    {rooms.map(
                                        (room) => (

                                            <div
                                                className="owner-room-item"
                                                key={room.room}
                                            >

                                                <div className="owner-room-icon">

                                                    <BedDouble
                                                        size={17}
                                                    />

                                                </div>


                                                <div className="owner-room-info">

                                                    <strong>
                                                        {room.room}
                                                    </strong>

                                                    <span>
                                                        {room.floor}
                                                        {" • "}
                                                        {room.type}
                                                        {" • "}
                                                        {room.ac}
                                                    </span>

                                                </div>


                                                <div className="owner-room-rent">

                                                    <strong>
                                                        {room.rent}
                                                    </strong>

                                                </div>


                                                <span className="room-occupancy available">

                                                    {room.occupancy}

                                                    <small>
                                                        occupied
                                                    </small>

                                                </span>

                                            </div>

                                        )
                                    )}

                                </div>

                            </section>


                            {/* COMPLAINTS */}

                            <section className="owner-section">

                                <div className="owner-section-header">

                                    <div>

                                        <h2>
                                            Recent Complaints
                                        </h2>

                                        <p>
                                            Latest maintenance tickets
                                        </p>

                                    </div>

                                    <button className="owner-view-all">

                                        View All

                                        <ArrowUpRight
                                            size={13}
                                        />

                                    </button>

                                </div>


                                <div className="owner-complaint-list">

                                    {complaints.map(
                                        (complaint) => (

                                            <div
                                                className="owner-complaint-item"
                                                key={complaint.id}
                                            >

                                                <div className="owner-complaint-icon">

                                                    <MessageSquareWarning
                                                        size={16}
                                                    />

                                                </div>


                                                <div className="owner-complaint-content">

                                                    <div className="owner-complaint-top">

                                                        <span className="complaint-id">
                                                            {complaint.id}
                                                        </span>

                                                        <span
                                                            className={`complaint-status ${complaint.status
                                                                .toLowerCase()
                                                                .replace(
                                                                    " ",
                                                                    "-"
                                                                )
                                                                }`}
                                                        >
                                                            {complaint.status}
                                                        </span>

                                                    </div>


                                                    <strong>
                                                        {complaint.title}
                                                    </strong>


                                                    <span>
                                                        {complaint.tenant}
                                                        {" • "}
                                                        {complaint.room}
                                                        {" • "}
                                                        {complaint.date}
                                                    </span>

                                                </div>

                                            </div>

                                        )
                                    )}

                                </div>

                            </section>

                        </>

                    )}

                </section>

            </main>


            {/* =========================================
          ADD PG MODAL
      ========================================= */}

            {showPGModal && (

                <div className="owner-modal-overlay">

                    <div className="owner-modal">

                        <div className="owner-modal-header">

                            <div>

                                <span>
                                    PROPERTY MANAGEMENT
                                </span>

                                <h2>
                                    Add New PG
                                </h2>

                            </div>


                            <button
                                onClick={() =>
                                    setShowPGModal(
                                        false
                                    )
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>


                        <form
                            className="owner-pg-form"
                            onSubmit={
                                handleCreatePG
                            }
                        >

                            <div className="owner-form-group">

                                <label>
                                    PG Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={
                                        pgForm.name
                                    }
                                    onChange={
                                        handlePGChange
                                    }
                                    placeholder="Example: Sunrise Luxury PG"
                                    required
                                />

                            </div>


                            <div className="owner-form-group">

                                <label>
                                    Address
                                </label>

                                <input
                                    type="text"
                                    name="address"
                                    value={
                                        pgForm.address
                                    }
                                    onChange={
                                        handlePGChange
                                    }
                                    placeholder="Enter full address"
                                    required
                                />

                            </div>


                            <div className="owner-form-row">

                                <div className="owner-form-group">

                                    <label>
                                        City
                                    </label>

                                    <input
                                        type="text"
                                        name="city"
                                        value={
                                            pgForm.city
                                        }
                                        onChange={
                                            handlePGChange
                                        }
                                        placeholder="Bengaluru"
                                        required
                                    />

                                </div>


                                <div className="owner-form-group">

                                    <label>
                                        State
                                    </label>

                                    <input
                                        type="text"
                                        name="state"
                                        value={
                                            pgForm.state
                                        }
                                        onChange={
                                            handlePGChange
                                        }
                                        placeholder="Karnataka"
                                        required
                                    />

                                </div>

                            </div>


                            <div className="owner-form-group">

                                <label>
                                    Contact Number
                                </label>

                                <input
                                    type="tel"
                                    name="contactNumber"
                                    value={
                                        pgForm.contactNumber
                                    }
                                    onChange={
                                        handlePGChange
                                    }
                                    placeholder="PG contact number"
                                    required
                                />

                            </div>


                            <div className="owner-form-group">

                                <label>
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        pgForm.description
                                    }
                                    onChange={
                                        handlePGChange
                                    }
                                    placeholder="Short description of your PG"
                                    rows="3"
                                />

                            </div>


                            {pgError && (

                                <div className="owner-form-error">
                                    {pgError}
                                </div>

                            )}


                            <div className="owner-modal-actions">

                                <button
                                    type="button"
                                    className="owner-modal-cancel"
                                    onClick={() =>
                                        setShowPGModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="owner-modal-submit"
                                    disabled={
                                        creatingPG
                                    }
                                >

                                    {creatingPG
                                        ? "Saving..."
                                        : "Add PG"}

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