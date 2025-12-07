/**
 * 2FA Service - Service layer cho các API calls liên quan đến xác thực 2 lớp
 * Base URL: http://localhost:8080/profile/2fa
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

// Tạo axios instance với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

const buildAxiosErrorResponse = (error, defaultMessage = "Đã xảy ra lỗi") => {
  if (error?.response) {
    return {
      data: {
        error: error.response.data?.error || error.response.data?.message || defaultMessage,
        code: error.response.data?.code,
      },
      response: {
        ok: false,
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  }
  return {
    data: { error: defaultMessage },
    response: { ok: false, status: 0, statusText: "Network Error" },
  };
};

/**
 * Lấy trạng thái 2FA của user hiện tại
 * @returns {Promise<{data: {enabled: boolean, hasSecret: boolean}, response: {ok: boolean, status: number}}>}
 */
export const get2FAStatus = async () => {
  try {
    const response = await apiClient.get("/profile/2fa/status");
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể lấy trạng thái 2FA");
  }
};

/**
 * Setup 2FA (user tự tạo mã pin 6 số)
 * @param {string} code - Mã pin 6 số do user tự tạo
 * @returns {Promise<{data: {message: string}, response: {ok: boolean, status: number}}>}
 */
export const setup2FA = async (code) => {
  try {
    const response = await apiClient.post("/profile/2fa/setup", { code });
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể setup 2FA");
  }
};

/**
 * Bật 2FA
 * @param {string} code - Mã 2FA để xác nhận (chỉ cần khi lần đầu bật)
 * @returns {Promise<{data: {message: string}, response: {ok: boolean, status: number}}>}
 */
export const enable2FA = async (code = null) => {
  try {
    const response = await apiClient.post("/profile/2fa/enable", code ? { code } : {});
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể bật 2FA");
  }
};

/**
 * Tắt 2FA
 * @returns {Promise<{data: {message: string}, response: {ok: boolean, status: number}}>}
 */
export const disable2FA = async () => {
  try {
    const response = await apiClient.post("/profile/2fa/disable");
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể tắt 2FA");
  }
};

/**
 * Xác thực mã 2FA sau khi login
 * @param {string} email - Email của user
 * @param {string} code - Mã 2FA 6 số
 * @returns {Promise<{data: {token: string}, response: {ok: boolean, status: number}}>}
 */
export const verify2FA = async (email, code) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/verify-2fa`, {
      email,
      code,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Mã xác thực không đúng");
  }
};

/**
 * Lấy mã xác thực 2FA tạm thời (khi quên mã)
 * @param {string} email - Email của user
 * @returns {Promise<{data: {message: string}, response: {ok: boolean, status: number}}>}
 */
export const resetTemporary2FA = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-2fa-temporary`, {
      email,
    });
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể lấy mã xác thực tạm thời");
  }
};

/**
 * Đổi mã xác thực 2FA
 * @param {Object} data - Dữ liệu đổi mã
 * @param {string} data.oldCode - Mã xác thực cũ
 * @param {string} data.newCode - Mã xác thực mới
 * @param {string} data.confirmCode - Nhập lại mã xác thực mới
 * @returns {Promise<{data: {message: string}, response: {ok: boolean, status: number}}>}
 */
export const change2FA = async (data) => {
  try {
    const response = await apiClient.post("/profile/2fa/change", data);
    return handleAxiosResponse(response);
  } catch (error) {
    return buildAxiosErrorResponse(error, "Không thể đổi mã xác thực");
  }
};

