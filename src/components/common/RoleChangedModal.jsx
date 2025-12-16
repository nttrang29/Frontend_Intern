// src/components/common/RoleChangedModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import ConfirmModal from "./Modal/ConfirmModal";

/**
 * Modal hiển thị khi admin thay đổi role của user
 * Khi user xác nhận, sẽ logout và redirect về trang login
 */
export default function RoleChangedModal() {
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const { logout } = useAuth();
  const { markAsRead } = useNotifications();
  const navigate = useNavigate();
  
  // Lấy danh sách notification đã hiển thị từ localStorage
  const getShownNotificationIds = () => {
    try {
      const stored = localStorage.getItem("roleChangedShownIds");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Lưu danh sách notification đã hiển thị vào localStorage
  const saveShownNotificationId = (id) => {
    try {
      const shownIds = getShownNotificationIds();
      shownIds.add(id);
      localStorage.setItem("roleChangedShownIds", JSON.stringify(Array.from(shownIds)));
    } catch (error) {
      console.error("Failed to save shown notification ID:", error);
    }
  };

  // Track các notification đã hiển thị modal để không hiển thị lại
  const shownNotificationIdsRef = useRef(getShownNotificationIds());

  useEffect(() => {
    const handleRoleChanged = (event) => {
      const { notifications } = event.detail || {};
      if (notifications && notifications.length > 0) {
        // Lấy notification đầu tiên (mới nhất) chưa đọc và chưa được hiển thị
        const latestNotification = notifications.find(
          (n) => !n.read && !shownNotificationIdsRef.current.has(String(n.id))
        );
        
        if (latestNotification) {
          // Đánh dấu notification này đã được hiển thị
          const notificationId = String(latestNotification.id);
          shownNotificationIdsRef.current.add(notificationId);
          saveShownNotificationId(notificationId);
          setNotification(latestNotification);
          setOpen(true);
        }
      }
    };

    window.addEventListener("roleChangedNotification", handleRoleChanged);
    return () => {
      window.removeEventListener("roleChangedNotification", handleRoleChanged);
    };
  }, []);

  const handleConfirm = async () => {
    // Đánh dấu notification đã đọc trước khi logout
    if (notification?.id) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    
    // Logout và redirect về login
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  if (!notification) return null;

  // Lấy tên role từ message hoặc title
  const roleName = notification.desc?.match(/thành (\w+)/)?.[1] || "quyền mới";

  return (
    <ConfirmModal
      open={open}
      title={notification.title || "Quyền của bạn đã được thay đổi"}
      message={notification.desc || `Admin đã thay đổi quyền của bạn thành ${roleName}. Vui lòng đăng nhập lại để áp dụng thay đổi.`}
      okText="Xác nhận"
      cancelText={null} // Không hiển thị nút cancel
      onOk={handleConfirm}
      onClose={() => {}} // Không cho đóng bằng cách click outside hoặc ESC
      allowClose={false} // Không cho phép đóng modal
      danger={false}
    />
  );
}

