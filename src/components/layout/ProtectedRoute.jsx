import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuth, user } = useAuthStore();

  if (!isAuth) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;