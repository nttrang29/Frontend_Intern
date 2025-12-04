// src/components/home/Topbar/NotificationBell.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationList from "./NotificationList";
import { useNotifications } from "../../../contexts/NotificationContext";
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
    } else if (n.type === "fund_warning") {
      // Chuyển đến trang quỹ và mở fund với tab warnings
      navigate("/home/funds", {
        state: { 
          openFundId: n.fundId,
          defaultTab: "warnings"
        },
      });
    } else if (n.type === "fund_reminder") {
      // Nhắc nạp tiền - mở fund với tab deposit
      navigate("/home/funds", {
        state: { 
          openFundId: n.fundId,
          defaultTab: "deposit"
        },
      });
    } else if (n.type === "FUND_AUTO_DEPOSIT_SUCCESS" || n.type === "fund_auto_deposit") {
      // Thông báo nạp tự động thành công - mở fund với tab info
      navigate("/home/funds", {
        state: { 
          openFundId: n.referenceId || n.fundId,
          defaultTab: "info"
        },
      });
    } else if (n.type === "FUND_AUTO_DEPOSIT_FAILED") {
      // Thông báo nạp tự động thất bại - mở fund với tab deposit để nạp thủ công
      navigate("/home/funds", {
        state: { 
          openFundId: n.referenceId,
          defaultTab: "deposit"
        },
      });
    } else if (n.type === "FUND_COMPLETED") {
      // Thông báo quỹ đạt mục tiêu - mở fund với tab info
      navigate("/home/funds", {
        state: { 
          openFundId: n.referenceId,
          defaultTab: "info"
        },
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