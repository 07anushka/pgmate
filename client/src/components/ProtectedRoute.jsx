
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  // Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Allow authenticated users when no roles are specified
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // User has the required role
  if (allowedRoles.includes(user.role)) {
    return children;
  }

  // Redirect to the correct dashboard for this user's role
  switch (user.role) {
    case "super_admin":
      return <Navigate to="/super-admin" replace />;

    case "owner":
      return <Navigate to="/owner" replace />;

    case "tenant":
      return <Navigate to="/tenant" replace />;

    default:
      return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;
