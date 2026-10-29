import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, LayoutDashboard, Users, CreditCard, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./SuperAdmin.css";

const navItems = [
    { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/super-admin/owners", label: "Owners", icon: Users },
    { to: "/super-admin/subscriptions", label: "Subscriptions & Plans", icon: CreditCard },
    { to: "/super-admin/settings", label: "Settings", icon: Settings },
];

const pageMeta = {
    "/super-admin": ["Dashboard", "Platform overview and subscription health"],
    "/super-admin/owners": ["Owners", "Create and manage PG owner accounts"],
    "/super-admin/subscriptions": ["Subscriptions & Plans", "Review subscription status and renewals"],
    "/super-admin/settings": ["Settings", "Manage your administrator preferences"],
};

export default function SuperAdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const meta = pageMeta[location.pathname] || pageMeta["/super-admin"];

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="super-admin-page super-admin-layout">
            <aside className="super-admin-sidebar">
                <div className="super-admin-brand">
                    <div className="super-admin-brand-icon"><Building2 size={22} /></div>
                    <div className="super-admin-brand-text"><strong>PGmate</strong><span>Super Admin</span></div>
                </div>

                <nav className="super-admin-nav" aria-label="Super Admin navigation">
                    {navItems.map(({ to, label, icon: Icon, end }) => (
                        <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "active" : ""}>
                            <Icon size={18} /><span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="super-admin-sidebar-bottom">
                    <button className="super-admin-logout" type="button" onClick={handleLogout}>
                        <LogOut size={18} /><span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="super-admin-main">
                <header className="super-admin-topbar">
                    <div className="super-admin-topbar-title"><h1>{meta[0]}</h1><p>{meta[1]}</p></div>
                    <div className="super-admin-user">
                        <div className="super-admin-avatar">{user?.name?.charAt(0)?.toUpperCase() || "A"}</div>
                        <div className="super-admin-user-info"><strong>{user?.name || "Administrator"}</strong><span>Super Administrator</span></div>
                    </div>
                </header>
                <div className="super-admin-content"><Outlet /></div>
            </main>
        </div>
    );
}
