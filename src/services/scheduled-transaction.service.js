import { API_BASE_URL } from './api-client';

/**
 * Service để quản lý scheduled transactions (lịch hẹn giao dịch tự động)
 */

/**
 * Helper function để gọi API với authentication
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("accessToken");

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(text || "Có lỗi xảy ra");
  }

  if (!response.ok) {
    const errorMessage = data.error || data.message || `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = { data };
    throw error;
  }

  return data;
}

/**
 * Tạo scheduled transaction mới
 * @param {Object} data - Dữ liệu tạo lịch hẹn
 * @param {number} data.walletId - ID ví áp dụng
 * @param {number} data.transactionTypeId - ID loại giao dịch (1 = Chi tiêu, 2 = Thu nhập)
 * @param {number} data.categoryId - ID danh mục
 * @param {number} data.amount - Số tiền
 * @param {string} data.note - Ghi chú (tùy chọn)
 * @param {string} data.scheduleType - Kiểu lịch (ONCE, DAILY, WEEKLY, MONTHLY, YEARLY)
 * @param {string} data.startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} data.executionTime - Giờ thực hiện (HH:mm)
 * @param {string} data.endDate - Ngày kết thúc (YYYY-MM-DD) - tùy chọn cho lịch định kỳ
 * @param {number} data.dayOfWeek - Thứ trong tuần (1-7) - cho WEEKLY
 * @param {number} data.dayOfMonth - Ngày trong tháng (1-31) - cho MONTHLY
 * @param {number} data.month - Tháng (1-12) - cho YEARLY
 * @param {number} data.day - Ngày (1-31) - cho YEARLY
 */
export const createScheduledTransaction = async (data) => {
  return apiCall('/scheduled-transactions/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Lấy danh sách tất cả scheduled transactions của user
 */
export const getAllScheduledTransactions = async () => {
  return apiCall('/scheduled-transactions');
};

/**
 * Lấy chi tiết một scheduled transaction
 * @param {number} scheduleId - ID của scheduled transaction
 */
export const getScheduledTransactionById = async (scheduleId) => {
  return apiCall(`/scheduled-transactions/${scheduleId}`);
};

/**
 * Hủy scheduled transaction (đổi status thành CANCELLED)
 * @param {number} scheduleId - ID của scheduled transaction cần hủy
 */
export const cancelScheduledTransaction = async (scheduleId) => {
  return apiCall(`/scheduled-transactions/${scheduleId}/cancel`, {
    method: 'PUT',
  });
};

/**
 * Xóa scheduled transaction
 * @param {number} scheduleId - ID của scheduled transaction cần xóa
 */
export const deleteScheduledTransaction = async (scheduleId) => {
  return apiCall(`/scheduled-transactions/${scheduleId}`, {
    method: 'DELETE',
  });
};

/**
 * Preview ngày thực hiện tiếp theo
 * @param {Object} data - Dữ liệu preview
 */
export const previewNextExecution = async (data) => {
  return apiCall('/scheduled-transactions/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Lấy lịch sử thực hiện của một scheduled transaction
 * @param {number} scheduleId - ID của scheduled transaction
 */
export const getExecutionLogs = async (scheduleId) => {
  return apiCall(`/scheduled-transactions/${scheduleId}/logs`);
};

// Export API object for convenience
export const scheduledTransactionAPI = {
  create: createScheduledTransaction,
  getAll: getAllScheduledTransactions,
  getById: getScheduledTransactionById,
  cancel: cancelScheduledTransaction,
  delete: deleteScheduledTransaction,
  preview: previewNextExecution,
  getLogs: getExecutionLogs,
};

export default scheduledTransactionAPI;
