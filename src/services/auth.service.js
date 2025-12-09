/**
 * Auth Service - Service layer cho các API calls liên quan đến authentication
 * Base URL: http://localhost:8080/auth
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

const buildAxiosErrorResponse = (error, defaultMessage = "Đã xảy ra lỗi") => {
  if (error?.response) {
    return {
      data: error.response.data || { error: defaultMessage },
      response: {
        ok: false,
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  }
  if (error?.request) {
    return {
      response: { ok: false, status: 0 },
      data: { error: defaultMessage },
    };
  }
  return {
    response: { ok: false, status: 0 },
    data: { error: error?.message || defaultMessage },
  };
};

/**
 * 📌 ĐĂNG KÝ (FLOW MỚI – OTP)
 * Step 1: registerRequestOtp - Gửi OTP đăng ký
 * @param {Object} registerData - Dữ liệu đăng ký
 * @param {string} registerData.fullName - Họ và tên
 * @param {string} registerData.email - Email
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const registerRequestOtp = async ({ fullName, email }) => {
  try {
    const response = await apiClient.post("/auth/register-request-otp", {
      fullName,
      email,
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
        data: { error: "Lỗi kết nối đến máy chủ. Kiểm tra backend và secret key." },
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
 * Step 2: verifyRegisterOtp - Xác minh OTP + tạo tài khoản
 * @param {Object} verifyData - Dữ liệu xác minh
 * @param {string} verifyData.email - Email
 * @param {string} verifyData.otp - Mã OTP 6 số
 * @param {string} verifyData.password - Mật khẩu
 * @param {string} verifyData.fullName - Họ và tên
 * @returns {Promise<Object>} - { token: string } hoặc { error: string }
 */
export const verifyRegisterOtp = async ({ email, otp, password, fullName }) => {
  try {
    const response = await apiClient.post("/auth/verify-register-otp", {
      email,
      otp,
      password,
      fullName,
    });

    const result = handleAxiosResponse(response);
    
    // Lưu token vào localStorage (backend trả về { token: "..." })
    if (result.data && result.data.token) {
      localStorage.setItem("accessToken", result.data.token);
    } else if (result.data && typeof result.data === "string") {
      // Nếu backend trả về string token trực tiếp
      localStorage.setItem("accessToken", result.data);
    }
    
    return result;
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
        data: { error: "Lỗi kết nối đến máy chủ khi xác minh mã." },
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
 * 📌 ĐĂNG KÝ (CŨ - giữ lại để tương thích)
 * @param {Object} registerData - Dữ liệu đăng ký
 * @param {string} registerData.fullName - Họ và tên
 * @param {string} registerData.email - Email
 * @param {string} registerData.password - Mật khẩu
 * @param {string} registerData.confirmPassword - Xác nhận mật khẩu
 * @param {string} registerData.recaptchaToken - Token từ reCAPTCHA
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const register = async ({ fullName, email, password, confirmPassword, recaptchaToken }) => {
  try {
    const response = await apiClient.post("/auth/register", {
      fullName,
      email,
      password,
      confirmPassword,
      recaptchaToken,
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
        data: { error: "Lỗi kết nối đến máy chủ. Kiểm tra backend và secret key." },
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
 * 📩 XÁC MINH EMAIL (CŨ - giữ lại để tương thích)
 * @param {Object} verifyData - Dữ liệu xác minh
 * @param {string} verifyData.email - Email cần xác minh
 * @param {string} verifyData.code - Mã xác minh 6 số
 * @returns {Promise<Object>} - { message: string, accessToken: string, refreshToken: string } hoặc { error: string }
 */
export const verifyAccount = async ({ email, code }) => {
  try {
    const response = await apiClient.post("/auth/verify", {
      email,
      code,
    });

    const result = handleAxiosResponse(response);
    
    // Lưu token vào localStorage
    if (result.data && result.data.accessToken) {
      localStorage.setItem("accessToken", result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem("refreshToken", result.data.refreshToken);
      }
    }
    
    return result;
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
        data: { error: "Lỗi kết nối đến máy chủ khi xác minh mã." },
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
 * 📌 ĐĂNG NHẬP (chỉ cho tài khoản đã xác minh)
 * @param {Object} loginData - Dữ liệu đăng nhập
 * @param {string} loginData.email - Email
 * @param {string} loginData.password - Mật khẩu
 * @returns {Promise<Object>} - { token: string } hoặc { error: string }
 */
export const login = async ({ email, password }) => {
  try {
    const response = await apiClient.post("/auth/login", {
      email,
      password,
    });

    const result = handleAxiosResponse(response);
    
    // Lưu token vào localStorage
    if (result.data && result.data.token) {
      localStorage.setItem("accessToken", result.data.token);
    } else if (result.data && result.data.accessToken) {
      // Tương thích với format cũ
      localStorage.setItem("accessToken", result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem("refreshToken", result.data.refreshToken);
      }
    }
    
    return result;
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
        data: { error: "Không thể kết nối server. Kiểm tra backend giúp nhé." },
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
 * 🔄 LÀM MỚI TOKEN (CŨ - giữ lại để tương thích)
 * @param {Object} refreshData - Dữ liệu refresh token
 * @param {string} refreshData.refreshToken - Refresh token
 * @returns {Promise<Object>} - { accessToken: string, message: string } hoặc { error: string }
 */
export const refreshToken = async ({ refreshToken }) => {
  try {
    const response = await apiClient.post("/auth/refresh", {
      refreshToken,
    });

    const result = handleAxiosResponse(response);
    
    if (result.data && result.data.accessToken) {
      localStorage.setItem("accessToken", result.data.accessToken);
    }
    
    return result;
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
        data: { error: "Lỗi kết nối đến máy chủ khi làm mới token." },
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
 * 🚪 Đăng xuất khỏi tất cả thiết bị (trừ thiết bị hiện tại)
 */
export const logoutAllDevices = async () => {
  const execute = async (path) => {
    const response = await apiClient.post(path);
    return handleAxiosResponse(response);
  };

  try {
    return await execute("/auth/logout-all-devices");
  } catch (error) {
    if (error?.response?.status === 404) {
      try {
        return await execute("/auth/logout-all");
      } catch (fallbackError) {
        return buildAxiosErrorResponse(
          fallbackError,
          "Không thể đăng xuất khỏi các thiết bị khác."
        );
      }
    }

    return buildAxiosErrorResponse(
      error,
      "Không thể đăng xuất khỏi các thiết bị khác."
    );
  }
};

/**
 * 🔐 QUÊN MẬT KHẨU - Bước 1: Gửi mã OTP qua email
 * @param {Object} forgotPasswordData - Dữ liệu quên mật khẩu
 * @param {string} forgotPasswordData.email - Email cần reset mật khẩu
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const forgotPassword = async ({ email }) => {
  try {
    const response = await apiClient.post("/auth/forgot-password", {
      email,
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
        data: { error: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// Alias cho forgotPassword để tương thích với new_frontend
export const forgotPasswordRequest = forgotPassword;

/**
 * 📲 XÁC MINH OTP (cho Quên Mật Khẩu) - Bước 2: Xác nhận OTP, nhận resetToken
 * @param {Object} verifyData - Dữ liệu xác minh
 * @param {string} verifyData.email - Email
 * @param {string} verifyData.otp - Mã OTP 6 số
 * @returns {Promise<Object>} - { resetToken: string } hoặc { error: string }
 */
export const verifyForgotOtp = async ({ email, otp }) => {
  try {
    const response = await apiClient.post("/auth/verify-forgot-otp", {
      email,
      otp,
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
        data: { error: "Lỗi kết nối khi xác thực mã." },
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
 * 📲 XÁC MINH OTP (CŨ - giữ lại để tương thích)
 * @param {Object} verifyData - Dữ liệu xác minh
 * @param {string} verifyData.email - Email
 * @param {string} verifyData.otp - Mã OTP 6 số
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const verifyOtp = async ({ email, otp }) => {
  try {
    const response = await apiClient.post("/auth/verify-otp", {
      email,
      otp,
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
        data: { error: "Lỗi kết nối khi xác thực mã." },
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
 * 🔑 RESET MẬT KHẨU - Bước 3: Đặt lại mật khẩu mới với resetToken
 * @param {Object} resetPasswordData - Dữ liệu reset mật khẩu
 * @param {string} resetPasswordData.resetToken - Reset token từ bước verifyForgotOtp
 * @param {string} resetPasswordData.newPassword - Mật khẩu mới
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const resetPassword = async ({ resetToken, newPassword }) => {
  try {
    const response = await apiClient.post("/auth/reset-password", {
      resetToken,
      newPassword,
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
        data: { error: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
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
 * 🔐 ĐỔI MẬT KHẨU KHI ĐÃ ĐĂNG NHẬP
 * @param {Object} changePasswordData - Dữ liệu đổi mật khẩu
 * @param {string} changePasswordData.oldPassword - Mật khẩu cũ
 * @param {string} changePasswordData.newPassword - Mật khẩu mới
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const changePassword = async ({ oldPassword, newPassword }) => {
  try {
    const response = await apiClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
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
        data: { error: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
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
 * 🌐 ĐĂNG NHẬP GOOGLE
 * @param {Object} loginData - Dữ liệu đăng nhập Google
 * @param {string} loginData.idToken - Google ID Token
 * @returns {Promise<Object>} - { token: string } hoặc { error: string }
 */
export const loginWithGoogle = async ({ idToken }) => {
  try {
    const response = await apiClient.post("/auth/google-login", {
      idToken,
    });

    const result = handleAxiosResponse(response);
    
    // Lưu token vào localStorage
    if (result.data && result.data.token) {
      localStorage.setItem("accessToken", result.data.token);
    }
    
    return result;
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
        data: { error: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
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
 * 🔑 ĐẶT MẬT KHẨU LẦN ĐẦU (TÀI KHOẢN GOOGLE)
 * @param {Object} passwordData - Dữ liệu đặt mật khẩu
 * @param {string} passwordData.newPassword - Mật khẩu mới
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const setFirstPassword = async ({ newPassword }) => {
  try {
    const response = await apiClient.post("/auth/set-first-password", {
      newPassword,
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
        data: { error: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
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

