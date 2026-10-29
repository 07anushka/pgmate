
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Public pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Route protection and subscription access
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGate from "./components/SubscriptionGate";

// Super Admin layout and pages
import SuperAdminLayout from "./pages/SuperAdmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import SuperAdminOwners from "./pages/SuperAdmin/SuperAdminOwners";
import SuperAdminSubscriptions from "./pages/SuperAdmin/SuperAdminSubscriptions";
import SuperAdminSettings from "./pages/SuperAdmin/SuperAdminSettings";

// Owner and Tenant dashboards
import OwnerDashboard from "./pages/Owner/OwnerDashboard";
import TenantDashboard from "./pages/Tenant/TenantDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            PUBLIC ROUTES
        ========================= */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* =========================
            SUPER ADMIN ROUTES
        ========================= */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Default Super Admin dashboard */}
          <Route
            index
            element={<SuperAdminDashboard />}
          />

          {/* Manage owner accounts */}
          <Route
            path="owners"
            element={<SuperAdminOwners />}
          />

          {/* Manage subscriptions */}
          <Route
            path="subscriptions"
            element={<SuperAdminSubscriptions />}
          />

          {/* Super Admin settings */}
          <Route
            path="settings"
            element={<SuperAdminSettings />}
          />
        </Route>

        {/* Redirect the old dashboard URL */}
        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Navigate
                to="/super-admin"
                replace
              />
            </ProtectedRoute>
          }
        />

        {/* =========================
            OWNER ROUTE
        ========================= */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <SubscriptionGate>
                <OwnerDashboard />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />

        {/* =========================
            TENANT ROUTE
        ========================= */}
        <Route
          path="/tenant"
          element={
            <ProtectedRoute allowedRoles={["tenant"]}>
              <SubscriptionGate>
                <TenantDashboard />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />

        {/* =========================
            UNKNOWN ROUTES
        ========================= */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
