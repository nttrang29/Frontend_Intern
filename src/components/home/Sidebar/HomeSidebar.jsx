import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../../styles/home/Sidebar.css";

const MENU = [
  { to: "/home", label: "Tổng quan", icon: "bi-speedometer2", end: true },
  { to: "/home/wallets", label: "Ví", icon: "bi-wallet2" },
  { to: "/home/funds", label: "Quỹ", icon: "bi-piggy-bank" },
  { to: "/home/transactions", label: "Giao dịch", icon: "bi-cash-stack" },
  { to: "/home/categories", label: "Danh mục", icon: "bi-tags" },
  { to: "/home/wallet-groups", label: "Nhóm ví", icon: "bi-collection" },
  { to: "/home/budgets", label: "Ngân sách", icon: "bi-graph-up-arrow" },
  { to: "/home/reports", label: "Báo cáo", icon: "bi-bar-chart-line" },
  { to: "/home/accounts", label: "Tài khoản", icon: "bi-credit-card-2-front" },
];

export default function HomeSidebar() {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sb_collapsed") === "1"
  );

  useEffect(() => {
    document.body.classList.toggle("sb-collapsed", collapsed);
    localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className={`sb__container ${collapsed ? "is-collapsed" : ""}`}>
      {/* ============================
          BRAND / LOGO VIDEO
         ============================ */}
      <div className="sb__brand">
        <video
          className="sb__brand-video"
          src="/videos/logo.mp4" // đổi đường dẫn video của bạn ở đây
          autoPlay
          loop
          muted
          playsInline
        />

        <div className="sb__brand-text">
          <div className="sb__brand-title">HỆ THỐNG QUẢN LÝ</div>
          <div className="sb__brand-sub">Quản lý ví cá nhân</div>
        </div>
      </div>

      {/* ============================
          HEADER BUTTON (MENU)
         ============================ */}
      <button
        type="button"
        className="sb__link sb__link--header"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Thu gọn / Mở rộng Sidebar"
        data-title={collapsed ? "Mở rộng" : undefined}
      >
        <span className="sb__icon" aria-hidden="true">
          <i className="bi bi-list" />
        </span>
        <span className="sb__text sb__menu-title">Menu</span>
      </button>

      <div className="sb__divider" />

      {/* ============================
          NAVIGATION
         ============================ */}
      <nav className="sb__nav sb__scroll" aria-label="Sidebar">
        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              "sb__link" + (isActive ? " is-active" : "")
            }
            // dùng data-title để tooltip CSS, tránh title mặc định
            data-title={collapsed ? m.label : undefined}
            aria-label={collapsed ? m.label : undefined}
          >
            <span className="sb__icon" aria-hidden="true">
              <i className={`bi ${m.icon}`} />
            </span>
            <span className="sb__text">{m.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer (đệm dưới) */}
      <div className="sb__footer" />
    </div>
  );
}
