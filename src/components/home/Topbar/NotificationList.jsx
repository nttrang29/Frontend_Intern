// src/components/home/Topbar/NotificationBell.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationList from "./NotificationList";
import { useNotifications } from "../../../home/store/NotificationContext";
import useOnClickOutside from "../../../hooks/useOnClickOutside";

export default function NotificationBell({ role = "user" }) {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const ref = useRef(null);

  useOnClickOutside(ref, () => setOpen(false));

  // lấy thông báo đúng role (admin / user) mới xem được
  const roleItems = useMemo(
    () =>
      notifications
        .filter((n) => !role || n.role === role)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        ),
    [notifications, role]
  );

  const unreadCount = roleItems.filter((n) => !n.read).length;

  // rung chuông nhẹ khi có notif mới
  useEffect(() => {
    if (!roleItems.length) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [roleItems.length]);

  const handleItemClick = (n) => {
    markAsRead(n.id);
    setOpen(false);

    if (n.type === "user_feedback") {
      // admin xem review
      navigate("/admin/reviews", {
        state: { focusReviewId: n.reviewId },
      });
    } else if (n.type === "admin_reply") {
      // user xem phản hồi
      navigate("/home/feedback", {
        state: { focusReviewId: n.reviewId },
      });
    }
  };

  const handleMarkAll = () => {
    markAllAsRead(role);
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button
        type="button"
        className={
          "notif-bell " +
          (bump ? "notif-bell--bump" : "") +
          (open ? " notif-bell--open" : "")
        }
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
      >
        <i className="bi bi-bell-fill" />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="dd__panel dd__panel--notif">
            <div className="dd__head">Thông báo</div>

            <NotificationList
              items={roleItems}
              onItemClick={handleItemClick}
            />

            <div className="dd__foot">
              <button
                className="btn btn-sm btn-light"
                onClick={handleMarkAll}
              >
                Đánh dấu đã đọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}