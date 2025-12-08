/**
 * Login Log API - Service layer cho các API calls liên quan đến login logs
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
 * User tự xem lịch sử đăng nhập của chính mình
 * GET /me/login-logs?page=0&size=10
 */
export const getMyLoginLogs = async (params = {}) => {
  const {
    page = 0,
    size = 10,
    limit,
  } = params;

  try {
    const response = await apiClient.get("/me/login-logs", {
      params: {
        page,
        size,
        limit: typeof limit === "number" ? limit : size,
      },
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
        data: { error: "Lỗi kết nối đến máy chủ." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

