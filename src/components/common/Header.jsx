// src/components/common/Header.jsx
import "../../styles/Header.css";

export default function Header() {
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
          <strong className="app-header__title">
            Hệ thống quản lý chi tiêu cá nhân
          </strong>
          <p className="app-header__subtitle mb-0">
            Chào mừng bạn đến với hệ thống
          </p>
        </div>
      </div>
    </header>
  );
}
