// src/home/store/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as NotificationService from "../services/notification.service";

const NotificationContext = createContext(null);

/**
 * notification:
 *  {
 *    id,
 *    role: "admin" | "user",
 *    type: "user_feedback" | "admin_reply",
 *    reviewId,
 *    title,
 *    desc,
 *    timeLabel,
 *    read: boolean
 *  }
 */

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load notifications từ API
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await NotificationService.fetchNotifications();
      const notifs = (result.notifications || []).map(n => ({
        id: n.notificationId,
        role: n.receiverRole === "ADMIN" ? "admin" : "user",
        type: n.type,
        title: n.title,
        desc: n.message,
        timeLabel: formatTimeLabel(n.createdAt),
        read: n.isRead,
        createdAt: n.createdAt,
        referenceId: n.referenceId,
        referenceType: n.referenceType,
        // Mapping cho backward compatibility
        fundId: n.referenceType === "FUND" ? n.referenceId : null,
        reviewId: n.referenceType === "APP_REVIEW" || n.referenceType === "FEEDBACK" ? n.referenceId : null,
      }));
      setNotifications(notifs);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications khi mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      loadNotifications();
      
      // Polling mỗi 30 giây để cập nhật notification mới
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [loadNotifications]);

  const pushNotification = (payload) => {
    const notif = {
      id: Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    setNotifications((prev) => [notif, ...prev]);
    return notif;
  };

  const markAsRead = async (id) => {
    try {
      await NotificationService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async (role) => {
    try {
      await NotificationService.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) =>
          !role || n.role === role ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, loading, pushNotification, markAsRead, markAllAsRead, loadNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Helper function để format thời gian
function formatTimeLabel(createdAt) {
  if (!createdAt) return "";
  
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return created.toLocaleDateString('vi-VN');
}

export const useNotifications = () => useContext(NotificationContext);