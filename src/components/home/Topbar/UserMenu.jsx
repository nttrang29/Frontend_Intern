import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useOnClickOutside from "../../../hooks/useOnClickOutside";
import ConfirmModal from "../../common/Modal/ConfirmModal";
import { useLanguage } from "../../../contexts/LanguageContext";

// 👇 THÊM
import { useAuth, ROLES } from "../../../contexts/AuthContext";

export default function UserMenu({ avatarUrl }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // 👇 Lấy thông tin người dùng và hàm logout
  const { currentUser, logout } = useAuth();

  useOnClickOutside(ref, () => setOpen(false));

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onLogout = () => setConfirm(true);

  const doLogout = () => {
    // Gọi logout từ AuthContext để xóa TẤT CẢ cache
    logout();
    setConfirm(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="tb__dd" ref={ref}>
      <button
        className="tb__avatar btn-reset"
        title={t("topbar.account")}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <img src={avatarUrl} alt="avatar" />
      </button>

      {open && (
        <div className="dd__panel dd__panel--menu is-open shadow-lg" role="menu" style={{ width: 240 }}>
          <div className="dd__section">
            {/* Cài đặt */}
            <button
              className="dd__link"
              onClick={() => {
                setOpen(false);
                navigate("/home/settings");
              }}
            >
              <i className="bi bi-gear dd__icon" />
              <span>{t("settings.title")}</span>
            </button>

            {/* Đánh giá ứng dụng → ẨN với ADMIN */}
            {currentUser?.role !== ROLES.ADMIN && (
              <button
                className="dd__link"
                onClick={() => {
                  setOpen(false);
                  navigate("/home/feedback");
                }}
              >
                <i className="bi bi-stars dd__icon" />
                <span>{t("topbar.feedback")}</span>
              </button>
            )}
          </div>

          <div className="dd__divider" />

          <div className="dd__section">
            <button className="dd__link dd__danger" onClick={onLogout}>
              <i className="bi bi-box-arrow-right dd__icon" />
              <span>{t("topbar.logout")}</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm}
        title={t("topbar.logout_confirm_title")}
        message={t("topbar.logout_confirm_message")}
        okText={t("topbar.logout_confirm_ok")}
        cancelText={t("common.cancel")}
        onOk={doLogout}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}