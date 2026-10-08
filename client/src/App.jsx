import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";


import LandingPage
  from "./pages/LandingPage";


import LoginPage
  from "./pages/LoginPage";


import ProtectedRoute
  from "./components/ProtectedRoute";


import SuperAdminDashboard
  from "./pages/SuperAdmin/SuperAdminDashboard";


import OwnerDashboard
  from "./pages/Owner/OwnerDashboard";


import TenantDashboard
  from "./pages/Tenant/TenantDashboard";


function App() {

  return (

    <BrowserRouter>

      <Routes>


        {/* =================================
            PUBLIC ROUTES
        ================================= */}

        <Route
          path="/"
          element={
            <LandingPage />
          }
        />


        <Route
          path="/login"
          element={
            <LoginPage />
          }
        />


        {/* =================================
            SUPER ADMIN
        ================================= */}

        <Route
          path="/super-admin"
          element={

            <ProtectedRoute
              allowedRoles={[
                "super_admin",
              ]}
            >

              <SuperAdminDashboard />

            </ProtectedRoute>

          }
        />


        {/* =================================
            OWNER
        ================================= */}

        <Route
          path="/owner"
          element={

            <ProtectedRoute
              allowedRoles={[
                "owner",
              ]}
            >

              <OwnerDashboard />

            </ProtectedRoute>

          }
        />


        {/* =================================
            TENANT
        ================================= */}

        <Route
          path="/tenant"
          element={

            <ProtectedRoute
              allowedRoles={[
                "tenant",
              ]}
            >

              <TenantDashboard />

            </ProtectedRoute>

          }
        />


      </Routes>

    </BrowserRouter>

  );

}


export default App;