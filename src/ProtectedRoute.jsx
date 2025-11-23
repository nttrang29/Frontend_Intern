import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./home/store/AuthContext";

export default function ProtectedRoute({ requiredRoles }) {
  const { currentUser, loading, hasRole } = useAuth();
  const location = useLocation();

  // Đọc token giống chỗ bạn lưu ở LoginPage
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("auth_token");

  // Đang loading (nếu bạn có logic fetch user lúc mount)
  if (loading) {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  // Không có token và cũng không có currentUser => chưa đăng nhập
  if (!token && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Có yêu cầu role: chỉ check nếu đã có currentUser
  if (requiredRoles && currentUser && !hasRole(requiredRoles)) {
    return <Navigate to="/home" replace />;
  }

  // Có token (hoặc currentUser) => cho vào
  return <Outlet />;
}
  