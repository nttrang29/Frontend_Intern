import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useOnClickOutside from "../../../hooks/useOnClickOutside";
import ConfirmModal from "../../common/Modal/ConfirmModal";

// 👇 THÊM
import { useAuth, ROLES } from "../../../home/store/AuthContext";

export default function UserMenu({ avatarUrl }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // 👇 Lấy thông tin người dùng
  const { currentUser } = useAuth();

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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("auth_token");
    setConfirm(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="tb__dd" ref={ref}>
      <button
        className="tb__avatar btn-reset"
        title="Tài khoản"
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
              <span>Cài đặt</span>
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
                <span>Đánh giá ứng dụng</span>
              </button>
            )}
          </div>

          <div className="dd__divider" />

          <div className="dd__section">
            <button className="dd__link dd__danger" onClick={onLogout}>
              <i className="bi bi-box-arrow-right dd__icon" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất không?"
        okText="Đăng xuất"
        onOk={doLogout}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
