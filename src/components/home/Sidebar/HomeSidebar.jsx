import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../../styles/home/Sidebar.css";

const MENU = [
  { to: "/home", label: "Tổng quan", icon: "bi-speedometer2", end: true },
  { to: "/home/wallets", label: "Ví", icon: "bi-wallet2" },
  { to: "/home/wallet-groups", label: "Nhóm ví", icon: "bi-collection" },
  { to: "/home/budgets", label: "Ngân sách", icon: "bi-graph-up-arrow" },
  { to: "/home/transactions", label: "Giao dịch", icon: "bi-cash-stack" },
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
    <div className="sb__container">
      {/* 🌄 Background image */}
      <div className="sb__bg">
        <img src="/images/sidebar-bg.png" alt="sidebar background" />
        <div className="sb__overlay" />
      </div>

      {/* Nội dung chính của sidebar */}
      <div className="sb__content">
        {/* Nút “ba gạch” styled như item menu */}
        <button
          type="button"
          className="sb__link sb__link--header"
          onClick={() => setCollapsed(v => !v)}
          aria-label="Thu gọn / Mở rộng Sidebar"
          title="Thu gọn / Mở rộng"
        >
          <span className="sb__icon" aria-hidden="true">
            <i className="bi bi-list" />
          </span>
          <span className="sb__text sb__menu-title">Menu</span>
        </button>

        <div className="sb__divider" />

        <nav className="sb__nav" aria-label="Sidebar">
          {MENU.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) => "sb__link" + (isActive ? " is-active" : "")}
              title={collapsed ? m.label : undefined}
            >
              <span className="sb__icon" aria-hidden="true">
                <i className={`bi ${m.icon}`} />
              </span>
              <span className="sb__text">{m.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
