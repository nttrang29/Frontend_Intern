import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("accessToken"); // 👈 đổi về accessToken
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
