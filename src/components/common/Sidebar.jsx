import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../../styles/home/Sidebar.css";
import { useAuth, ROLES } from "../../../home/store/AuthContext";

const BASE_MENU = [
  { to: "/home", label: "Tổng quan", icon: "bi-speedometer2", end: true },
  { to: "/home/wallets", label: "Ví", icon: "bi-wallet2" },
  { to: "/home/budgets", label: "Ngân sách", icon: "bi-graph-up-arrow" },
  { to: "/home/reports", label: "Báo cáo", icon: "bi-graph-up-arrow" },
  { to: "/home/accounts", label: "Tài khoản", icon: "bi-credit-card-2-front" },
];

export default function HomeSidebar() {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sb_collapsed") === "1"
  );
  const { currentUser } = useAuth();

  const menuItems = [...BASE_MENU];

  // Chỉ ADMIN mới thấy menu Quản lý người dùng
  if (currentUser?.role === ROLES.ADMIN) {
    menuItems.push({
      to: "/admin/users",
      label: "Quản lý người dùng",
      icon: "bi-people-fill",
    });
  }

  useEffect(() => {
    document.body.classList.toggle("sb-collapsed", collapsed);
    localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className={`sb__container ${collapsed ? "is-collapsed" : ""}`}>
      <button
        className="sb__hamburger"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Thu gọn / Mở rộng Sidebar"
        title="Thu gọn / Mở rộng"
      >
        <i className="bi bi-list" />
      </button>

      <nav className="sb__nav">
        {menuItems.map((m) => (
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

      {/* Hiển thị role để dễ debug */}
      <div className="sb__footer">
        <div className="sb__leaf" />
        {currentUser && (
          <div className="sb__role">
            <small>Vai trò: {currentUser.role}</small>
          </div>
        )}
      </div>
    </div>
  );
}
