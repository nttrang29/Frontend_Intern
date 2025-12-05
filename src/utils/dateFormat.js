import { getDateFormatSetting, formatDate as formatBySetting } from "./dateFormatSettings";

/**
 * Utility functions để format ngày giờ theo múi giờ Việt Nam (UTC+7)
 */

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
 * Format: YYYY-MM-DDTHH:mm (cho datetime-local input)
 * @returns {string} - Chuỗi datetime đã format (ví dụ: "2025-11-17T21:16")
 */
export function getVietnamDateTime() {
  const now = new Date();
  
  // Dùng toLocaleString với timezone Việt Nam để lấy đúng giờ VN
  const vnDateStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse: "11/17/2025, 21:16" -> "2025-11-17T21:16"
  const parts = vnDateStr.split(', ');
  const datePart = parts[0].split('/'); // ["11", "17", "2025"]
  const timePart = parts[1]; // "21:16"
  
  const year = datePart[2];
  const month = datePart[0].padStart(2, '0');
  const day = datePart[1].padStart(2, '0');
  
  return `${year}-${month}-${day}T${timePart}`;
}

/**
 * Convert một Date string/object sang múi giờ Việt Nam
 * Format: YYYY-MM-DDTHH:mm (cho datetime-local input)
 * @param {string|Date} dateInput - Date string hoặc Date object
 * @returns {string} - Chuỗi datetime đã format (ví dụ: "2025-11-17T21:16")
 */
export function convertToVietnamDateTime(dateInput) {
  if (!dateInput) return "";
  
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  
  // Dùng toLocaleString với timezone Việt Nam
  const vnDateStr = d.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse: "11/17/2025, 21:16" -> "2025-11-17T21:16"
  const parts = vnDateStr.split(', ');
  if (parts.length !== 2) return "";
  
  const datePart = parts[0].split('/'); // ["11", "17", "2025"]
  const timePart = parts[1]; // "21:16"
  
  const year = datePart[2];
  const month = datePart[0].padStart(2, '0');
  const day = datePart[1].padStart(2, '0');
  
  return `${year}-${month}-${day}T${timePart}`;
}

/**
 * Format ngày theo múi giờ Việt Nam (UTC+7)
 * Format: DD/MM/YYYY
 * @param {string|Date} date - Date string hoặc Date object
 * @returns {string} - Chuỗi ngày đã format (ví dụ: "17/11/2025")
 */
export function formatVietnamDate(date) {
  return formatBySetting(date, getDateFormatSetting(), { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Format giờ theo múi giờ Việt Nam (UTC+7)
 * Format: HH:mm
 * @param {string|Date} date - Date string hoặc Date object
 * @returns {string} - Chuỗi giờ đã format (ví dụ: "21:16")
 */
export function formatVietnamTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  
  return d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format ngày giờ đầy đủ theo múi giờ Việt Nam (UTC+7)
 * Format: DD/MM/YYYY HH:mm
 * @param {string|Date} date - Date string hoặc Date object
 * @returns {string} - Chuỗi ngày giờ đã format (ví dụ: "17/11/2025 21:16")
 */
export function formatVietnamDateTime(date) {
  const dateStr = formatVietnamDate(date);
  const timeStr = formatVietnamTime(date);

  if (dateStr && timeStr) return `${dateStr} ${timeStr}`;
  return dateStr || timeStr || "";
}

