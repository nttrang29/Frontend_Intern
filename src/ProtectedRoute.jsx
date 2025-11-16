import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./home/store/AuthContext";

export default function ProtectedRoute({ requiredRoles }) {
  const { currentUser, loading, hasRole } = useAuth();

  if (loading) {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  // Chưa đăng nhập
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Có yêu cầu role mà không đủ quyền
  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
