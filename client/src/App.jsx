
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGate from "./components/SubscriptionGate";

import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import OwnerDashboard from "./pages/Owner/OwnerDashboard";
import TenantDashboard from "./pages/Tenant/TenantDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* SUPER ADMIN — no subscription gate */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* OWNER — check subscription before dashboard access */}
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

        {/* TENANT — check linked owner's subscription */}
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
