// src/home/store/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
  VIEWER: "VIEWER",
};

const STORAGE_KEY = "auth_user";
const AuthContext = createContext(null);

/**
 * Xóa TẤT CẢ cache và dữ liệu localStorage khi logout
 * Đảm bảo không còn dữ liệu của user cũ
 */
export function clearAllCache() {
  if (typeof window === "undefined" || !window.localStorage) return;
  
  // Xóa tất cả các key liên quan đến authentication
  localStorage.removeItem("auth_user");
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("auth_token");
  
  // Xóa cache transactions từ BudgetDataContext
  localStorage.removeItem("budget_external_transactions");
  
  // Xóa TẤT CẢ activity logs (bao gồm cả legacy keys và theo userId)
  const activityKeys = [
    "activity_log",
    "activityLog", 
    "activity-log"
  ];
  
  // Xóa tất cả activity logs theo pattern
  // Lưu ý: Phải tạo array trước khi loop vì localStorage.length thay đổi khi removeItem
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      activityKeys.some(ak => key.startsWith(ak + ":")) ||
      activityKeys.includes(key)
    )) {
      keysToRemove.push(key);
    }
  }
  
  // Xóa tất cả keys đã tìm thấy
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Dispatch event để các context khác có thể reset state
  try {
    window.dispatchEvent(new CustomEvent("user:loggedout"));
  } catch (e) {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi app load lại, đọc từ localStorage
  useEffect(() => {
    try {
      // Ưu tiên auth_user (đúng chuẩn context)
      const rawAuth = localStorage.getItem(STORAGE_KEY);
      const rawUser = localStorage.getItem("user"); // fallback cho chỗ khác dùng

      let user = null;

      if (rawAuth) {
        user = JSON.parse(rawAuth);
      } else if (rawUser) {
        // nếu chỉ có "user" thì map sang cấu trúc currentUser
        const u = JSON.parse(rawUser);
        user = {
          id: u.id,
          fullName: u.fullName || u.name || u.username || "",
          email: u.email,
          role:
            u.role ||
            u.roleName ||
            (Array.isArray(u.roles) ? u.roles[0] : ROLES.USER),
        };
      }

      if (user) {
        setCurrentUser(user);
      }
    } catch (e) {
      console.error("auth_user / user trong localStorage không hợp lệ", e);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * login(user)
   * user: { id, fullName, email, role, accessToken? }
   */
  const login = (user) => {
    if (!user) return;

    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    if (user.accessToken) {
      localStorage.setItem("accessToken", user.accessToken);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    // Xóa TẤT CẢ cache và dữ liệu localStorage
    clearAllCache();
  };

  /**
   * hasRole(requiredRoles)
   * requiredRoles: ["ADMIN"] / ["USER", "ADMIN"]
   */
  const hasRole = (requiredRoles) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!currentUser || !currentUser.role) return false;

    const userRole = currentUser.role.toUpperCase();

    // Cho phép các kiểu "ADMIN" hoặc "ROLE_ADMIN"
    return requiredRoles.some((r) => {
      const need = r.toUpperCase();
      return (
        userRole === need ||
        userRole === `ROLE_${need}` ||
        userRole.includes(need)
      );
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

