import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../../styles/home/Sidebar.css";

const MENU = [
  { to: "/home", label: "Tổng quan", icon: "bi-speedometer2", end: true },
  { to: "/home/transactions", label: "Giao dịch", icon: "bi-cash-stack" },
  { to: "/home/budgets", label: "Ngân sách", icon: "bi-wallet2" },
  { to: "/home/reports", label: "Báo cáo", icon: "bi-graph-up-arrow" },
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
      {/* Nút 3 gạch – thay thế logo */}
      <button
        className="sb__hamburger"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Thu gọn / Mở rộng Sidebar"
        title="Thu gọn / Mở rộng"
      >
        <i className="bi bi-list" />
      </button>

      {/* Menu chính */}
      <nav className="sb__nav">
        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              "sb__link" + (isActive ? " is-active" : "")
            }
            title={collapsed ? m.label : undefined}
          >
            <span className="sb__icon">
              <i className={`bi ${m.icon}`} />
            </span>
            <span className="sb__text">{m.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb__footer">
        <div className="sb__leaf" />
      </div>
    </div>
  );
}
