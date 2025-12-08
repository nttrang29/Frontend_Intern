/**
 * Fund Service - Service layer cho các API calls liên quan đến quỹ tiết kiệm
 * Base URL: http://localhost:8080/funds
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:8080/funds";

// Tạo axios instance với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 giây timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor để tự động thêm Authorization header vào mỗi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response errors (bao gồm timeout)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      console.warn("Request timeout:", error.config?.url);
      return Promise.reject({
        ...error,
        response: {
          status: 408,
          statusText: "Request Timeout",
          data: { error: "Yêu cầu quá thời gian chờ. Vui lòng thử lại." },
        },
      });
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function để xử lý response từ axios
 * @param {Object} axiosResponse - Response object từ axios
 * @returns {Object} - { data, response } với format tương tự fetch để component có thể check response.status
 */
const handleAxiosResponse = (axiosResponse) => {
  return {
    data: axiosResponse.data,
    response: {
      ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
    },
  };
};

/**
 * Helper function để xử lý error từ axios
 */
const handleAxiosError = (error, actionName) => {
  console.error(`fund.service: ${actionName} error:`, error);
  if (error.response) {
    console.error(`fund.service: Error response:`, {
      status: error.response.status,
      data: error.response.data,
    });
    return {
      data: error.response.data || { error: "Đã xảy ra lỗi" },
      response: {
        ok: false,
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  } else if (error.request) {
    console.error(`fund.service: No response received:`, error.request);
    return {
      response: { ok: false, status: 0 },
      data: { error: "Lỗi kết nối đến máy chủ." },
    };
  } else {
    console.error(`fund.service: Request setup error:`, error.message);
    return {
      response: { ok: false, status: 0 },
      data: { error: error.message || "Đã xảy ra lỗi không xác định." },
    };
  }
};

// ========================= CREATE FUND =========================

/**
 * 📝 TẠO QUỸ MỚI
 * @param {Object} createData - Dữ liệu tạo quỹ
 * @param {string} createData.fundName - Tên quỹ
 * @param {number} createData.targetWalletId - ID ví đích (ví quỹ)
 * @param {string} createData.fundType - Loại quỹ: "PERSONAL" hoặc "GROUP"
 * @param {boolean} createData.hasDeadline - Có kỳ hạn hay không
 * @param {number} [createData.targetAmount] - Số tiền mục tiêu (bắt buộc nếu hasDeadline = true)
 * @param {string} [createData.frequency] - Tần suất: "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
 * @param {number} [createData.amountPerPeriod] - Số tiền gửi mỗi kỳ
 * @param {string} [createData.startDate] - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} [createData.endDate] - Ngày kết thúc (YYYY-MM-DD)
 * @param {boolean} [createData.reminderEnabled] - Bật nhắc nhở
 * @param {string} [createData.reminderType] - Loại nhắc nhở
 * @param {string} [createData.reminderTime] - Giờ nhắc nhở (HH:mm:ss)
 * @param {number} [createData.reminderDayOfWeek] - Ngày trong tuần (1-7)
 * @param {number} [createData.reminderDayOfMonth] - Ngày trong tháng (1-31)
 * @param {number} [createData.reminderMonth] - Tháng (1-12)
 * @param {number} [createData.reminderDay] - Ngày (1-31)
 * @param {boolean} [createData.autoDepositEnabled] - Bật tự động nạp tiền
 * @param {string} [createData.autoDepositType] - "FOLLOW_REMINDER" hoặc "CUSTOM_SCHEDULE"
 * @param {number} [createData.sourceWalletId] - ID ví nguồn
 * @param {string} [createData.autoDepositScheduleType] - Loại lịch tự động nạp
 * @param {string} [createData.autoDepositTime] - Giờ tự động nạp (HH:mm:ss)
 * @param {number} [createData.autoDepositDayOfWeek] - Ngày trong tuần
 * @param {number} [createData.autoDepositDayOfMonth] - Ngày trong tháng
 * @param {number} [createData.autoDepositMonth] - Tháng
 * @param {number} [createData.autoDepositDay] - Ngày
 * @param {number} [createData.autoDepositAmount] - Số tiền nạp mỗi lần
 * @param {string} [createData.note] - Ghi chú
 * @param {Array} [createData.members] - Danh sách thành viên (chỉ cho GROUP)
 * @returns {Promise<Object>} - { message: string, fund: Object } hoặc { error: string }
 */
export const createFund = async (createData) => {
  try {
    console.log("fund.service: Calling POST /funds với data:", createData);
    const response = await apiClient.post("", createData);
    console.log("fund.service: POST /funds response:", {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, "POST /funds");
  }
};

// ========================= GET FUNDS =========================

/**
 * 📋 LẤY DANH SÁCH TẤT CẢ QUỸ CỦA USER
 * @returns {Promise<Object>} - { funds: Array, total: number }
 */
export const getAllFunds = async () => {
  try {
    console.log("fund.service: Calling GET /funds");
    const response = await apiClient.get("");
    console.log("fund.service: GET /funds response:", {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, "GET /funds");
  }
};

/**
 * 📋 LẤY DANH SÁCH QUỸ CÁ NHÂN
 * @param {boolean|null} hasDeadline - Lọc theo kỳ hạn (true, false, null = all)
 * @returns {Promise<Object>} - { funds: Array, total: number }
 */
export const getPersonalFunds = async (hasDeadline = null) => {
  try {
    const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : "";
    console.log(`fund.service: Calling GET /funds/personal${params}`);
    const response = await apiClient.get(`/personal${params}`);
    console.log("fund.service: GET /funds/personal response:", {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, "GET /funds/personal");
  }
};

/**
 * 📋 LẤY DANH SÁCH QUỸ NHÓM
 * @param {boolean|null} hasDeadline - Lọc theo kỳ hạn (true, false, null = all)
 * @returns {Promise<Object>} - { funds: Array, total: number }
 */
export const getGroupFunds = async (hasDeadline = null) => {
  try {
    const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : "";
    console.log(`fund.service: Calling GET /funds/group${params}`);
    const response = await apiClient.get(`/group${params}`);
    console.log("fund.service: GET /funds/group response:", {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, "GET /funds/group");
  }
};

/**
 * 📋 LẤY DANH SÁCH QUỸ THAM GIA (không phải chủ quỹ)
 * @returns {Promise<Object>} - { funds: Array, total: number }
 */
export const getParticipatedFunds = async () => {
  try {
    console.log("fund.service: Calling GET /funds/participated");
    const response = await apiClient.get("/participated");
    console.log("fund.service: GET /funds/participated response:", {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, "GET /funds/participated");
  }
};

/**
 * 🔍 LẤY CHI TIẾT MỘT QUỸ
 * @param {number} fundId - ID của quỹ
 * @returns {Promise<Object>} - { fund: Object }
 */
export const getFundById = async (fundId) => {
  try {
    console.log(`fund.service: Calling GET /funds/${fundId}`);
    const response = await apiClient.get(`/${fundId}`);
    console.log(`fund.service: GET /funds/${fundId} response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `GET /funds/${fundId}`);
  }
};

// ========================= UPDATE FUND =========================

/**
 * ✏️ CẬP NHẬT QUỸ
 * @param {number} fundId - ID của quỹ
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @param {string} [updateData.fundName] - Tên quỹ
 * @param {string} [updateData.frequency] - Tần suất gửi quỹ
 * @param {number} [updateData.amountPerPeriod] - Số tiền mỗi kỳ
 * @param {string} [updateData.startDate] - Ngày bắt đầu
 * @param {string} [updateData.endDate] - Ngày kết thúc
 * @param {string} [updateData.note] - Ghi chú
 * @param {boolean} [updateData.reminderEnabled] - Bật nhắc nhở
 * @param {string} [updateData.reminderType] - Loại nhắc nhở
 * @param {string} [updateData.reminderTime] - Giờ nhắc nhở
 * @param {number} [updateData.reminderDayOfWeek] - Ngày trong tuần
 * @param {number} [updateData.reminderDayOfMonth] - Ngày trong tháng
 * @param {number} [updateData.reminderMonth] - Tháng
 * @param {number} [updateData.reminderDay] - Ngày
 * @param {boolean} [updateData.autoDepositEnabled] - Bật tự động nạp tiền
 * @param {string} [updateData.autoDepositType] - Loại tự động nạp
 * @param {number} [updateData.sourceWalletId] - ID ví nguồn
 * @param {string} [updateData.autoDepositScheduleType] - Loại lịch tự động nạp
 * @param {string} [updateData.autoDepositTime] - Giờ tự động nạp
 * @param {number} [updateData.autoDepositDayOfWeek] - Ngày trong tuần
 * @param {number} [updateData.autoDepositDayOfMonth] - Ngày trong tháng
 * @param {number} [updateData.autoDepositMonth] - Tháng
 * @param {number} [updateData.autoDepositDay] - Ngày
 * @param {number} [updateData.autoDepositAmount] - Số tiền nạp mỗi lần
 * @returns {Promise<Object>} - { message: string, fund: Object }
 */
export const updateFund = async (fundId, updateData) => {
  try {
    console.log(`fund.service: Calling PUT /funds/${fundId} với data:`, updateData);
    const response = await apiClient.put(`/${fundId}`, updateData);
    console.log(`fund.service: PUT /funds/${fundId} response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `PUT /funds/${fundId}`);
  }
};

// ========================= CLOSE FUND =========================

/**
 * 🔒 ĐÓNG QUỸ
 * @param {number} fundId - ID của quỹ
 * @returns {Promise<Object>} - { message: string }
 */
export const closeFund = async (fundId) => {
  try {
    console.log(`fund.service: Calling PUT /funds/${fundId}/close`);
    const response = await apiClient.put(`/${fundId}/close`);
    console.log(`fund.service: PUT /funds/${fundId}/close response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `PUT /funds/${fundId}/close`);
  }
};

// ========================= DELETE FUND =========================

/**
 * 🗑️ XÓA QUỸ
 * @param {number} fundId - ID của quỹ
 * @returns {Promise<Object>} - { message: string }
 */
export const deleteFund = async (fundId) => {
  try {
    console.log(`fund.service: Calling DELETE /funds/${fundId}`);
    const response = await apiClient.delete(`/${fundId}`);
    console.log(`fund.service: DELETE /funds/${fundId} response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `DELETE /funds/${fundId}`);
  }
};

// ========================= DEPOSIT TO FUND =========================

/**
 * 💰 NẠP TIỀN VÀO QUỸ
 * @param {number} fundId - ID của quỹ
 * @param {number} amount - Số tiền nạp
 * @returns {Promise<Object>} - { message: string, fund: Object }
 */
export const depositToFund = async (fundId, amount) => {
  try {
    console.log(`fund.service: Calling POST /funds/${fundId}/deposit với amount:`, amount);
    const response = await apiClient.post(`/${fundId}/deposit`, { amount });
    console.log(`fund.service: POST /funds/${fundId}/deposit response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `POST /funds/${fundId}/deposit`);
  }
};

// ========================= WITHDRAW FROM FUND =========================

/**
 * 💸 RÚT TIỀN TỪ QUỸ (chỉ cho quỹ không kỳ hạn)
 * @param {number} fundId - ID của quỹ
 * @param {number} amount - Số tiền rút
 * @returns {Promise<Object>} - { message: string, fund: Object }
 */
export const withdrawFromFund = async (fundId, amount) => {
  try {
    console.log(`fund.service: Calling POST /funds/${fundId}/withdraw với amount:`, amount);
    const response = await apiClient.post(`/${fundId}/withdraw`, { amount });
    console.log(`fund.service: POST /funds/${fundId}/withdraw response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `POST /funds/${fundId}/withdraw`);
  }
};

// ========================= CHECK WALLET USED =========================

/**
 * ✅ KIỂM TRA VÍ CÓ ĐANG ĐƯỢC SỬ DỤNG CHO QUỸ/NGÂN SÁCH KHÔNG
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { isUsed: boolean }
 */
export const checkWalletUsed = async (walletId) => {
  try {
    console.log(`fund.service: Calling GET /funds/check-wallet/${walletId}`);
    const response = await apiClient.get(`/check-wallet/${walletId}`);
    console.log(`fund.service: GET /funds/check-wallet/${walletId} response:`, {
      status: response.status,
      data: response.data,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error, `GET /funds/check-wallet/${walletId}`);
  }
};

// ========================= EXPORT ALL =========================

export default {
  createFund,
  getAllFunds,
  getPersonalFunds,
  getGroupFunds,
  getParticipatedFunds,
  getFundById,
  updateFund,
  closeFund,
  deleteFund,
  depositToFund,
  withdrawFromFund,
  checkWalletUsed,
};

