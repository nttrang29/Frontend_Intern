// src/components/common/Header.jsx
import { useLocation } from "react-router-dom";
import "../../styles/Header.css";
import GlobalSearch from "./GlobalSearch";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Header() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/login") || 
                     location.pathname.startsWith("/register") || 
                     location.pathname.startsWith("/forgot-password") ||
                     location.pathname.startsWith("/oauth");
  const { t } = useLanguage();

  return (
    <header className="app-header d-flex justify-content-between align-items-center p-3">
      <div className="app-header__brand d-flex align-items-center">
        {/* 🎬 Logo video động */}
        <video
          className="app-header__logo"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/logo512.png"  // ảnh fallback khi video chưa chạy
        >
          <source src="/videos/logo.mp4" type="video/mp4" />
        </video>

        <div className="app-header__brand-text ms-3">
          <strong className="app-header__title">{t("sidebar.brand.title")}</strong>
          <p className="app-header__subtitle mb-0">{t("sidebar.brand.subtitle")}</p>
        </div>
      </div>

      {/* Global Search - Ẩn ở các trang auth */}
      {!isAuthPage && <GlobalSearch />}
    </header>
  );
}
