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
import ErrorBoundary from "./components/common/ErrorBoundary";

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
  
  // Kiểm tra nhiều pattern để catch timeout errors
  const isTimeoutError = reason && (
    reason.message?.includes("Timeout") ||
    reason.message?.includes("timeout") ||
    reason.message?.includes("thời gian chờ") ||
    reason.message?.includes("quá thời gian") ||
    reason.message?.toLowerCase().includes("timeout") ||
    reason.code === "ECONNABORTED" ||
    reason.name === "AbortError" ||
    reason.name === "TimeoutError" ||
    (typeof reason === "string" && reason.toLowerCase().includes("timeout")) ||
    (reason?.toString && reason.toString().toLowerCase().includes("timeout"))
  );
  
  if (isTimeoutError) {
    console.warn("Request timeout (đã được xử lý):", reason.message || reason);
    event.preventDefault(); // Ngăn không cho hiển thị lỗi ra UI
    return;
  }
  
  // Log các lỗi khác nhưng không prevent default để có thể debug
  console.error("Unhandled promise rejection:", reason);
});

window.addEventListener("error", (event) => {
  const error = event.error || event;
  
  // Kiểm tra nhiều pattern để catch timeout errors
  const isTimeoutError = error && (
    error.message?.includes("Timeout") ||
    error.message?.includes("timeout") ||
    error.message?.includes("thời gian chờ") ||
    error.message?.includes("quá thời gian") ||
    error.message?.toLowerCase().includes("timeout") ||
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    (typeof error === "string" && error.toLowerCase().includes("timeout")) ||
    (error?.toString && error.toString().toLowerCase().includes("timeout"))
  );
  
  if (isTimeoutError) {
    console.warn("Error timeout (đã được xử lý):", error.message || error);
    event.preventDefault();
    return;
  }
  
  console.error("Global error:", error);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </React.StrictMode>
);
