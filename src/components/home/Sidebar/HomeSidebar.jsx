import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../../styles/pages/Sidebar.css";
import { useAuth, ROLES } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

// Use translation keys; labels resolved at render time
const BASE_MENU = [
  { to: "/home", labelKey: "sidebar.overview", icon: "bi-speedometer2", end: true },
  { to: "/home/wallets", labelKey: "sidebar.wallets", icon: "bi-wallet2" },
  { to: "/home/funds", labelKey: "sidebar.funds", icon: "bi-piggy-bank" },
  { to: "/home/categories", labelKey: "sidebar.categories", icon: "bi-tags" },
  { to: "/home/transactions", labelKey: "sidebar.transactions", icon: "bi-cash-stack" },
  { to: "/home/budgets", labelKey: "sidebar.budgets", icon: "bi-graph-up-arrow" },
  { to: "/home/activity", labelKey: "sidebar.activity", icon: "bi-clock-history" },
  { to: "/home/reports", labelKey: "sidebar.reports", icon: "bi-bar-chart-line" },
];

export default function HomeSidebar() {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sb_collapsed") === "1"
  );
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const isAdmin =
    !!currentUser?.role &&
    (currentUser.role === ROLES.ADMIN ||
      String(currentUser.role).toUpperCase() === "ADMIN" ||
      String(currentUser.role).toUpperCase().includes("ADMIN"));

  const MENU = useMemo(() => {
    const base = [...BASE_MENU];
    if (isAdmin) {
      base.push(
        {
          to: "/admin/users",
          labelKey: "sidebar.user_management",
          icon: "bi-people-fill",
        },
        {
          to: "/admin/reviews",
          labelKey: "sidebar.feedback",
          icon: "bi-chat-dots",
        }
      );
    }
    return base;
  }, [isAdmin]);

  useEffect(() => {
    document.body.classList.toggle("sb-collapsed", collapsed);
    localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className={`sb__container ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sb__brand">
        <video
          className="sb__brand-video"
          src="/videos/logo.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        <div className="sb__brand-text">
          <div className="sb__brand-title">{t("sidebar.brand.title")}</div>
          <div className="sb__brand-sub">{t("sidebar.brand.subtitle")}</div>
        </div>
      </div>

      <button
        type="button"
        className="sb__link sb__link--header"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Thu gọn / Mở rộng Sidebar"
      >
        <span className="sb__icon" aria-hidden="true">
          <i className="bi bi-list" />
        </span>
        <span className="sb__text sb__menu-title">{t("sidebar.menu")}</span>
      </button>

      <div className="sb__divider" />

      <nav className="sb__nav sb__scroll" aria-label="Sidebar">
        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              "sb__link" + (isActive ? " is-active" : "")
            }
            aria-label={collapsed ? (m.labelKey ? t(m.labelKey) : m.label) : undefined}
          >
            <span className="sb__icon" aria-hidden="true">
              <i className={`bi ${m.icon}`} />
            </span>
            <span className="sb__text">{m.labelKey ? t(m.labelKey) : m.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sb__footer" />
    </div>
  );
}
