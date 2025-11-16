import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// AUTH
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import OAuthCallback from "./pages/Auth/OAuthCallback";

import ProtectedRoute from "./ProtectedRoute";

// HOME (layout + pages)
import HomeLayout from "./layouts/HomeLayout";
import DashboardPage from "./pages/Home/DashboardPage";
import WalletsPage from "./pages/Home/WalletsPage";
import WalletGroupsPage from "./pages/Home/WalletGroupsPage";
import TransactionsPage from "./pages/Home/TransactionsPage";
import BudgetsPage from "./pages/Home/BudgetsPage";
import ReportsPage from "./pages/Home/ReportsPage";
import SettingsPage from "./pages/Home/SettingsPage";
import FeedbackPage from "./pages/Home/FeedbackPage";
import FundsPage from "./pages/Home/FundsPage";
import CategoriesPage from "./pages/Home/CategoriesPage";

// ADMIN
import AdminUsersPage from "./pages/Admin/AdminUsersPage";
import AdminReviewsPage from "./pages/Admin/AdminReviewsPage";
import { ROLES } from "./home/store/AuthContext";

// 🔄 STORE ĐÁNH GIÁ & THÔNG BÁO
import { FeedbackProvider } from "./home/store/FeedbackDataContext";
import { NotificationProvider } from "./home/store/NotificationContext";

export default function App() {
  return (
    <FeedbackProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* "/" -> /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* AUTH */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* HOME: yêu cầu đăng nhập */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home/*" element={<HomeLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="wallets" element={<WalletsPage />} />
                <Route path="wallet-groups" element={<WalletGroupsPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="funds" element={<FundsPage />} />

                {/* Feedback: chỉ cho USER & VIEWER, không cho ADMIN */}
                <Route
                  element={
                    <ProtectedRoute
                      requiredRoles={[ROLES.USER, ROLES.VIEWER]}
                    />
                  }
                >
                  <Route path="feedback" element={<FeedbackPage />} />
                </Route>
              </Route>
            </Route>

            {/* ADMIN: quyền ADMIN, dùng lại HomeLayout */}
            <Route
              element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]} />}
            >
              <Route path="/admin/*" element={<HomeLayout />}>
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
              </Route>
            </Route>

            {/* wildcard */}
            <Route
              path="*"
              element={
                localStorage.getItem("accessToken") ||
                localStorage.getItem("auth_token") ? (
                  <Navigate to="/home" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </FeedbackProvider>
  );
}
