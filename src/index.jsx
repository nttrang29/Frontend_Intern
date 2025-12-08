// src/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/base/variables.css";
import "./styles/base/dark-mode.css";
// Providers
import { WalletDataProvider } from "./contexts/WalletDataContext";
import { BudgetDataProvider } from "./contexts/BudgetDataContext";
import { CategoryDataProvider } from "./contexts/CategoryDataContext";
import { FundDataProvider } from "./contexts/FundDataContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/common/Toast/ToastContext";
import { FeedbackProvider } from "./contexts/FeedbackDataContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// Load và áp dụng theme ngay khi app khởi động
const loadTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  } else if (savedTheme === "light") {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  } else if (savedTheme === "system") {
    // System: theo preference của OS
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }
};

// Áp dụng theme ngay lập tức
loadTheme();

// Global error handlers
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  
  // Không hiển thị lỗi timeout ra UI, chỉ log
  if (reason && (
    reason.message?.includes("Timeout") ||
    reason.message?.includes("thời gian chờ") ||
    reason.message?.includes("timeout") ||
    reason.code === "ECONNABORTED" ||
    reason.name === "AbortError"
  )) {
    console.warn("Request timeout (đã được xử lý):", reason.message || reason);
    event.preventDefault(); // Ngăn không cho hiển thị lỗi ra UI
    return;
  }
  
  // Log các lỗi khác nhưng không prevent default để có thể debug
  console.error("Unhandled promise rejection:", reason);
});

window.addEventListener("error", (event) => {
  const error = event.error;
  
  // Không hiển thị lỗi timeout ra UI
  if (error && (
    error.message?.includes("Timeout") ||
    error.message?.includes("thời gian chờ") ||
    error.message?.includes("timeout")
  )) {
    console.warn("Error timeout (đã được xử lý):", error.message);
    event.preventDefault();
    return;
  }
  
  console.error("Global error:", error);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <LanguageProvider>
            <FeedbackProvider>
              <CategoryDataProvider>
                <WalletDataProvider>
                  <BudgetDataProvider>
                    <FundDataProvider>
                      <App />
                    </FundDataProvider>
                  </BudgetDataProvider>
                </WalletDataProvider>
              </CategoryDataProvider>
            </FeedbackProvider>
          </LanguageProvider>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
