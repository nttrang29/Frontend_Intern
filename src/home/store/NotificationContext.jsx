// src/home/store/NotificationContext.jsx
import { createContext, useContext, useState } from "react";

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

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = (role) => {
    setNotifications((prev) =>
      prev.map((n) =>
        !role || n.role === role ? { ...n, read: true } : n
      )
    );
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, pushNotification, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);