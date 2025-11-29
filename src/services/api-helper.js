/**
 * API Helper - Helper function chung cho tất cả API calls
 * Base URL: http://localhost:8080
 */

const API_BASE_URL = "http://localhost:8080";

/**
 * Helper function để gọi API với timeout
 * @param {string} endpoint - API endpoint (ví dụ: "/auth/login")
 * @param {object} options - Fetch options (method, body, headers, timeout)
 * @returns {Promise<any>} - Response data từ server
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("accessToken");

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Timeout mặc định: 60 giây (tăng lên để tránh timeout với các query phức tạp)
  const timeout = options.timeout || 60000;

  // Tạo AbortController để có thể cancel request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const config = {
    ...options,
    signal: controller.signal,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Xóa timeout khỏi options để không gửi lên fetch
  delete config.timeout;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Phản hồi từ server không hợp lệ");
      }
    } else {
      const text = await response.text();
      throw new Error(text || "Có lỗi xảy ra");
    }

    if (!response.ok) {
      const errorMessage =
        data.error ||
        data.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      // Tạo error object với status code để có thể check sau
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Xử lý các loại lỗi khác nhau
    if (error.name === "AbortError") {
      throw new Error("Yêu cầu quá thời gian chờ. Vui lòng thử lại.");
    }

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy."
      );
    }

    // Re-throw với message gốc nếu đã có
    if (error.message) {
      throw error;
    }

    throw new Error(
      "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
    );
  }
}

export { API_BASE_URL };

