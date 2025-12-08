/**
 * Profile Service - Service layer cho các API calls liên quan đến user profile
 * Base URL: http://localhost:8080
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

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
 * 👤 XEM THÔNG TIN PROFILE
 * @returns {Promise<Object>} - { user: Object } hoặc { error: string }
 */
export const getProfile = async () => {
  try {
    const response = await apiClient.get("/profile");

    return handleAxiosResponse(response);
  } catch (error) {
    if (error.response) {
      return {
        data: error.response.data || { error: "Đã xảy ra lỗi" },
        response: {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
        },
      };
    } else if (error.request) {
      return {
        response: { ok: false, status: 0 },
        data: { error: "Lỗi kết nối đến máy chủ khi lấy thông tin profile." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

/**
 * ✏️ CẬP NHẬT PROFILE
 * @param {Object} updateData - Dữ liệu cập nhật profile
 * @param {string} [updateData.fullName] - Họ và tên mới (optional)
 * @param {string} [updateData.avatar] - URL avatar mới (optional)
 * @returns {Promise<Object>} - { message: string, user: Object } hoặc { error: string }
 */
export const updateProfile = async ({ fullName, avatar }) => {
  try {
    const response = await apiClient.post("/profile/update", {
      fullName,
      avatar,
    });

    return handleAxiosResponse(response);
  } catch (error) {
    if (error.response) {
      return {
        data: error.response.data || { error: "Đã xảy ra lỗi" },
        response: {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
        },
      };
    } else if (error.request) {
      return {
        response: { ok: false, status: 0 },
        data: { error: "Lỗi kết nối đến máy chủ khi cập nhật profile." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

/**
 * 🔐 ĐỔI MẬT KHẨU
 * @param {Object} changePasswordData - Dữ liệu đổi mật khẩu
 * @param {string} [changePasswordData.oldPassword] - Mật khẩu hiện tại (bắt buộc nếu user đã có password)
 * @param {string} changePasswordData.newPassword - Mật khẩu mới
 * @param {string} changePasswordData.confirmPassword - Xác nhận mật khẩu mới
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const changePassword = async ({ oldPassword, newPassword, confirmPassword }) => {
  try {
    const response = await apiClient.post("/profile/change-password", {
      oldPassword,
      newPassword,
      confirmPassword,
    });

    return handleAxiosResponse(response);
  } catch (error) {
    if (error.response) {
      return {
        data: error.response.data || { error: "Đã xảy ra lỗi" },
        response: {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
        },
      };
    } else if (error.request) {
      return {
        response: { ok: false, status: 0 },
        data: { error: "Lỗi kết nối đến máy chủ khi đổi mật khẩu." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// Export API_BASE_URL để các component khác có thể sử dụng nếu cần
export { API_BASE_URL };

