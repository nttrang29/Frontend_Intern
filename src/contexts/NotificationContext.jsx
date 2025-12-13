// src/home/store/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as NotificationService from "../services/notification.service";
import { formatVietnamDate } from "../utils/dateFormat";
import { useAuth } from "./AuthContext";

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
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(() => Boolean(localStorage.getItem("accessToken")));
  // Track các notification IDs đã dispatch event để tránh dispatch nhiều lần
  const dispatchedNotificationIdsRef = useRef(new Set());

  const syncSessionState = useCallback(() => {
    setHasSession(Boolean(localStorage.getItem("accessToken")));
  }, []);

  useEffect(() => {
    syncSessionState();
  }, [currentUser, syncSessionState]);

  // Load notifications từ API
  // QUAN TRỌNG: Sử dụng ref để track notifications cũ, tránh stale closure
  const prevNotificationsRef = useRef([]);
  
  const loadNotifications = useCallback(async () => {
    const tokenExists = Boolean(localStorage.getItem("accessToken"));
    if (!tokenExists) {
      setNotifications([]);
      setLoading(false);
      prevNotificationsRef.current = [];
      return;
    }

    setLoading(true);
    try {
      const result = await NotificationService.fetchNotifications();
      const notifs = (result.notifications || []).map(n => {
        // Map referenceType thành type cho các notification liên quan đến fund và wallet
        let mappedType = n.type;
        if (n.referenceType === "FUND_REMINDER") {
          mappedType = "fund_reminder";
        } else if (n.referenceType === "FUND_AUTO_DEPOSIT_SUCCESS") {
          mappedType = "fund_auto_deposit";
        } else if (n.referenceType === "FUND_AUTO_DEPOSIT_FAILED") {
          mappedType = "FUND_AUTO_DEPOSIT_FAILED";
        } else if (n.referenceType === "FUND_COMPLETED") {
          mappedType = "FUND_COMPLETED";
        } else if (n.type === "WALLET_INVITED" || n.referenceType === "WALLET") {
          mappedType = n.type === "WALLET_INVITED" ? "WALLET_INVITED" : "wallet_invited";
        } else if (n.type === "WALLET_ROLE_UPDATED") {
          mappedType = "WALLET_ROLE_UPDATED";
        } else if (n.type === "WALLET_MEMBER_LEFT") {
          mappedType = "WALLET_MEMBER_LEFT";
        } else if (n.type === "WALLET_MEMBER_REMOVED") {
          mappedType = "WALLET_MEMBER_REMOVED";
        }
        
        return {
          id: n.notificationId,
          role: n.receiverRole === "ADMIN" ? "admin" : "user",
          type: mappedType,
          title: n.title,
          desc: n.message,
          timeLabel: formatTimeLabel(n.createdAt),
          read: n.isRead,
          createdAt: n.createdAt,
          referenceId: n.referenceId,
          referenceType: n.referenceType,
          // Mapping cho backward compatibility
          fundId: n.referenceType === "FUND" || n.referenceType === "FUND_REMINDER" || 
                  n.referenceType === "FUND_AUTO_DEPOSIT_SUCCESS" || 
                  n.referenceType === "FUND_AUTO_DEPOSIT_FAILED" || 
                  n.referenceType === "FUND_COMPLETED" ? n.referenceId : null,
          reviewId: n.referenceType === "APP_REVIEW" || n.referenceType === "FEEDBACK" ? n.referenceId : null,
          walletId: (n.referenceType === "WALLET" || n.type === "WALLET_INVITED" || n.type === "WALLET_ROLE_UPDATED" || n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED") ? (n.referenceId || n.walletId) : null,
        };
      });
      // Lưu notifications cũ để so sánh - sử dụng ref để tránh stale closure
      const prevNotifications = prevNotificationsRef.current;
      prevNotificationsRef.current = notifs;
      setNotifications(notifs);
      
      // Kiểm tra xem có notification wallet mới (chưa đọc) không
      const walletNotifications = notifs.filter(n => 
        (n.type === "WALLET_INVITED" || n.type === "WALLET_ROLE_UPDATED" || n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED") && 
        !n.read
      );
      
      // Tìm các notification WALLET_MEMBER_LEFT và WALLET_MEMBER_REMOVED mới (chưa có trong danh sách cũ)
      const prevMemberLeftIds = new Set(
        (prevNotifications || [])
          .filter(n => n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED")
          .map(n => n.id)
      );
      
      // Lấy tất cả notifications WALLET_MEMBER_LEFT và WALLET_MEMBER_REMOVED
      const allMemberLeftNotifications = notifs.filter(n => n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED");
      
      // Tìm các notification mới (chưa có trong danh sách cũ)
      const newMemberLeftNotifications = allMemberLeftNotifications.filter(n => {
        // Nếu là notification mới (chưa có trong danh sách cũ), luôn dispatch
        return !prevMemberLeftIds.has(n.id);
      });
      
      // Dispatch event walletNotificationReceived cho TẤT CẢ notifications WALLET_MEMBER_LEFT và WALLET_MEMBER_REMOVED
      // (không chỉ unread) để WalletDetail có thể force reload khi cần
      const allWalletMemberLeftNotifications = notifs.filter(n => n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED");
      
      // Luôn dispatch event cho tất cả notifications WALLET_MEMBER_LEFT
      // để đảm bảo UI được cập nhật khi có thay đổi
      if (allWalletMemberLeftNotifications.length > 0) {
        if (typeof window !== "undefined") {
          console.log("🔄 Dispatching walletNotificationReceived with all WALLET_MEMBER_LEFT notifications:", allWalletMemberLeftNotifications.length);
          window.dispatchEvent(new CustomEvent("walletNotificationReceived", {
            detail: { notifications: allWalletMemberLeftNotifications }
          }));
        }
      }
      
      // QUAN TRỌNG: Dispatch event riêng cho WALLET_ROLE_UPDATED (TẤT CẢ, không chỉ unread) để đảm bảo reload members
      // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào trong ví, không chỉ user hiện tại
      const allRoleUpdatedNotifs = notifs.filter(n => n.type === "WALLET_ROLE_UPDATED");
      if (allRoleUpdatedNotifs.length > 0) {
        if (typeof window !== "undefined") {
          console.log("🔄 Dispatching walletRoleUpdated events for", allRoleUpdatedNotifs.length, "notifications");
          
          // Dispatch qua walletNotificationReceived để handleNotificationReceived xử lý
          window.dispatchEvent(new CustomEvent("walletNotificationReceived", {
            detail: { notifications: allRoleUpdatedNotifs }
          }));
          
          // Cũng dispatch riêng cho từng notification để đảm bảo
          allRoleUpdatedNotifs.forEach(notif => {
            const walletId = notif.referenceId || notif.walletId || notif.reference_id;
            if (walletId) {
              console.log("🔄 Dispatching walletRoleUpdated event for wallet", walletId, "notification:", notif.id, "read:", notif.read);
              window.dispatchEvent(new CustomEvent("walletRoleUpdated", {
                detail: { 
                  walletId: Number(walletId),
                  notifications: [notif]
                }
              }));
            }
          });
        }
      }
      
      // QUAN TRỌNG: Dispatch event cho WALLET_INVITED (TẤT CẢ, không chỉ unread) để đảm bảo reload members khi có thành viên mới
      // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào trong ví, không chỉ người được mời
      const allInvitedNotifs = notifs.filter(n => n.type === "WALLET_INVITED");
      if (allInvitedNotifs.length > 0) {
        if (typeof window !== "undefined") {
          console.log("🔄 Dispatching walletNotificationReceived with WALLET_INVITED notifications:", allInvitedNotifs.length);
          window.dispatchEvent(new CustomEvent("walletNotificationReceived", {
            detail: { notifications: allInvitedNotifs }
          }));
        }
      }
      
      // Cũng dispatch cho các wallet notifications khác qua walletNotificationReceived
      const otherWalletNotifications = walletNotifications.filter(n => 
        n.type !== "WALLET_MEMBER_LEFT" && n.type !== "WALLET_MEMBER_REMOVED" && n.type !== "WALLET_ROLE_UPDATED" && n.type !== "WALLET_INVITED"
      );
      if (otherWalletNotifications.length > 0) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("walletNotificationReceived", {
            detail: { notifications: otherWalletNotifications }
          }));
        }
      }
      
      // Dispatch event riêng cho WALLET_MEMBER_LEFT và WALLET_MEMBER_REMOVED (chỉ các notification mới)
      // Luôn dispatch cho notification mới, không quan tâm đến việc đã dispatch hay chưa
      if (newMemberLeftNotifications.length > 0) {
        if (typeof window !== "undefined") {
          // Map walletIds từ referenceId hoặc walletId, đảm bảo convert sang string để so sánh
          const walletIds = newMemberLeftNotifications
            .map(n => {
              const id = n.referenceId || n.walletId || n.reference_id;
              return id ? String(id) : null;
            })
            .filter(Boolean);
          
          console.log("🔄 Dispatching walletMemberLeft event with walletIds:", walletIds, "notifications:", newMemberLeftNotifications.map(n => ({ id: n.id, type: n.type, read: n.read, createdAt: n.createdAt })));
          
          // Dispatch event ngay lập tức
          window.dispatchEvent(new CustomEvent("walletMemberLeft", {
            detail: { 
              notifications: newMemberLeftNotifications,
              walletIds: walletIds
            }
          }));
        }
      }
      
      // Ngoài ra, nếu có notification WALLET_MEMBER_LEFT hoặc WALLET_MEMBER_REMOVED chưa đọc, cũng dispatch để đảm bảo reload
      // (ngay cả khi không phải là notification mới)
      const unreadMemberLeftNotifications = allMemberLeftNotifications.filter(n => !n.read);
      if (unreadMemberLeftNotifications.length > 0) {
        const unreadWalletIds = unreadMemberLeftNotifications
          .map(n => {
            const id = n.referenceId || n.walletId || n.reference_id;
            return id ? String(id) : null;
          })
          .filter(Boolean);
        
        // Luôn dispatch cho unread notifications để đảm bảo reload
        if (unreadWalletIds.length > 0) {
          // Kiểm tra xem có notification nào chưa được dispatch trong lần này không
          const alreadyDispatched = newMemberLeftNotifications.some(n => !n.read);
          if (!alreadyDispatched) {
            console.log("🔄 Dispatching walletMemberLeft event for unread notifications, walletIds:", unreadWalletIds);
            window.dispatchEvent(new CustomEvent("walletMemberLeft", {
              detail: { 
                notifications: unreadMemberLeftNotifications,
                walletIds: unreadWalletIds
              }
            }));
          }
        }
      }
    } catch (error) {
      if (error?.status === 401) {
        setNotifications([]);
      } else {
        console.error("Failed to load notifications:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Lắng nghe event userChanged để force reload notifications
  // QUAN TRỌNG: Phải đặt sau khi loadNotifications được định nghĩa
  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const handler = () => {
      syncSessionState();
      // QUAN TRỌNG: Force reload notifications khi user thay đổi (đăng nhập/đăng xuất)
      // Đảm bảo hoạt động cho cả Google OAuth và password login
      const token = localStorage.getItem("accessToken");
      if (token && typeof loadNotifications === "function") {
        // Đợi một chút để đảm bảo token đã được lưu vào localStorage
        setTimeout(() => {
          loadNotifications().catch(err => {
            console.debug("Failed to reload notifications after user change:", err);
          });
        }, 300);
      }
    };
    window.addEventListener("userChanged", handler);
    return () => window.removeEventListener("userChanged", handler);
  }, [syncSessionState, loadNotifications]);

  // Load notifications khi mount
  // QUAN TRỌNG: Đảm bảo polling hoạt động cho cả Google OAuth và password login
  useEffect(() => {
    if (!hasSession) {
      setNotifications([]);
      return () => {};
    }

    loadNotifications();

    // Polling mỗi 30 giây để cập nhật notification mới
    // Đảm bảo chỉ poll khi có accessToken (user đã đăng nhập)
    const interval = setInterval(() => {
      const token = localStorage.getItem("accessToken");
      if (token && typeof loadNotifications === "function") {
        loadNotifications().catch(err => {
          console.debug("Failed to poll notifications:", err);
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [hasSession, loadNotifications]);

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
  
  return formatVietnamDate(created);
}

export const useNotifications = () => useContext(NotificationContext);