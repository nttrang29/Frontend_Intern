import apiClient from "./api-client";

/**
 * Lấy tất cả thông báo
 */
export async function fetchNotifications() {
  return await apiClient.notification.getAll();
}

/**
 * Lấy thông báo chưa đọc
 */
export async function fetchUnreadNotifications() {
  return await apiClient.notification.getUnread();
}

/**
 * Đếm số thông báo chưa đọc
 */
export async function getUnreadCount() {
  return await apiClient.notification.getUnreadCount();
}

/**
 * Đánh dấu thông báo đã đọc
 */
export async function markNotificationAsRead(notificationId) {
  return await apiClient.notification.markAsRead(notificationId);
}

/**
 * Đánh dấu tất cả thông báo đã đọc
 */
export async function markAllNotificationsAsRead() {
  return await apiClient.notification.markAllAsRead();
}

/**
 * Xóa thông báo
 */
export async function deleteNotification(notificationId) {
  return await apiClient.notification.delete(notificationId);
}
