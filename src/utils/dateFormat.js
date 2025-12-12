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
  if (!date) return "";
  
  // Nếu là string, extract ngày trực tiếp từ string (không parse và convert)
  if (typeof date === "string") {
    // Extract ngày trực tiếp từ string format: "2025-12-12T00:40:07" hoặc "2025-12-12T00:40:07+07:00"
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2];
      const day = dateMatch[3];
      const formatKey = getDateFormatSetting();
      switch (formatKey) {
        case "MM/dd/yyyy":
          return `${month}/${day}/${year}`;
        case "yyyy-MM-dd":
          return `${year}-${month}-${day}`;
        case "dd/MM/yyyy":
        default:
          return `${day}/${month}/${year}`;
      }
    }
    // Fallback: parse như local time
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const formatKey = getDateFormatSetting();
    switch (formatKey) {
      case "MM/dd/yyyy":
        return `${month}/${day}/${year}`;
      case "yyyy-MM-dd":
        return `${year}-${month}-${day}`;
      case "dd/MM/yyyy":
      default:
        return `${day}/${month}/${year}`;
    }
  } else {
    // Nếu là Date object, convert sang GMT+7
    return formatBySetting(date, getDateFormatSetting(), { timeZone: "Asia/Ho_Chi_Minh" });
  }
}

/**
 * Format giờ theo múi giờ Việt Nam (UTC+7)
 * Format: HH:mm
 * @param {string|Date} date - Date string hoặc Date object
 * @returns {string} - Chuỗi giờ đã format (ví dụ: "21:16")
 */
export function formatVietnamTime(date) {
  if (!date) return "";
  
  // Nếu là string và đã có timezone +07:00 (GMT+7), extract trực tiếp từ string
  // Vì đã đúng timezone rồi, không cần parse và convert
  if (typeof date === "string") {
    const hasGMT7 = /\+07:00$/.test(date);
    if (hasGMT7) {
      // Date đã là GMT+7, extract giờ trực tiếp từ string
      const timeMatch = date.match(/(?:T|\s)(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }
    // Nếu không có +07:00, parse như UTC và convert sang GMT+7
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    
    return d.toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else {
    // Nếu là Date object, convert sang GMT+7
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    
    return d.toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
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

