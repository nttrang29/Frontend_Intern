import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { getProfile } from "./services/profile.service";
import { normalizeUserProfile } from "./utils/userProfile";

export default function ProtectedRoute({ requiredRoles }) {
  const { currentUser, loading: authLoading, hasRole, login } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Đọc token từ localStorage
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("auth_token");

  // Verify token với backend khi component mount
  useEffect(() => {
    const verifyToken = async () => {
      // Nếu không có token, không cần verify
      if (!token) {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }

      // Nếu đã có currentUser từ AuthContext, có thể token đã được verify
      if (currentUser) {
        setIsAuthenticated(true);
        setIsVerifying(false);
        return;
      }

      // Verify token bằng cách gọi API /profile
      try {
        const res = await getProfile();
        
        // Kiểm tra response có hợp lệ không
        if (res && res.data) {
          let userData = res.data;
          
          // Nếu có wrap trong { user: {...} }, lấy user ra
          if (userData.user) {
            userData = userData.user;
          }

          // Cập nhật AuthContext với user data
          const normalizedUser = normalizeUserProfile(userData) || userData;

          const primaryRole =
            normalizedUser.role ||
            normalizedUser.roleName ||
            (Array.isArray(normalizedUser.roles) && normalizedUser.roles.length > 0
              ? normalizedUser.roles[0]
              : "USER");

          login({
            id: normalizedUser.id || normalizedUser.userId,
            fullName:
              normalizedUser.fullName ||
              normalizedUser.name ||
              normalizedUser.username ||
              "",
            email: normalizedUser.email,
            role: primaryRole,
            accessToken: token,
          });

          // Lưu user vào localStorage để đồng bộ
          localStorage.setItem("user", JSON.stringify(normalizedUser));

          setIsAuthenticated(true);
        } else {
          // Response không hợp lệ
          throw new Error("Invalid response");
        }
      } catch (error) {
        // Token không hợp lệ hoặc đã hết hạn
        console.error("Token verification failed:", error);
        
        // Xóa token và user data
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("auth_user");
        
        setIsAuthenticated(false);
      } finally {
        setIsVerifying(false);
      }
    };

    // Chỉ verify nếu AuthContext đã load xong
    if (!authLoading) {
      verifyToken();
    }
  }, [token, currentUser, authLoading, login]);

  // Đang loading (AuthContext hoặc đang verify token)
  if (authLoading || isVerifying) {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  // Không có token hoặc token không hợp lệ => chưa đăng nhập
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Có yêu cầu role: chỉ check nếu đã có currentUser
  if (requiredRoles && currentUser && !hasRole(requiredRoles)) {
    return <Navigate to="/home" replace />;
  }

  // Token hợp lệ và có quyền truy cập => cho vào
  return <Outlet />;
}
