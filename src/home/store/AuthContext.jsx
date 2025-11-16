import React, { createContext, useContext, useEffect, useState } from "react";

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
  VIEWER: "VIEWER",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi app load lại, đọc từ localStorage
  useEffect(() => {
    const raw = localStorage.getItem("auth_user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setCurrentUser(user);
      } catch (e) {
        console.error("auth_user trong localStorage không hợp lệ");
      }
    }
    setLoading(false);
  }, []);

  const login = (user) => {
    // user = { id, fullName, email, role, accessToken? }
    setCurrentUser(user);
    localStorage.setItem("auth_user", JSON.stringify(user));
    if (user.accessToken) {
      localStorage.setItem("accessToken", user.accessToken);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("accessToken");
  };

  const hasRole = (requiredRoles) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!currentUser) return false;
    return requiredRoles.includes(currentUser.role);
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
