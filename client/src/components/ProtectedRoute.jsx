import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  // User is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User does not have permission for this route
  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {
    // Super Admin
    if (user?.role === "super_admin") {
      return (
        <Navigate
          to="/super-admin"
          replace
        />
      );
    }

    // Owner
    if (user?.role === "owner") {
      return (
        <Navigate
          to="/owner"
          replace
        />
      );
    }

    // Tenant
    if (user?.role === "tenant") {
      return (
        <Navigate
          to="/tenant"
          replace
        />
      );
    }

    // Unknown role
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and has permission
  return children;
}

export default ProtectedRoute;