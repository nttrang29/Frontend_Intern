/**
 * API Client cho Personal Finance App
 * Sử dụng trong React project
 *
 * Base URL: http://localhost:8080
 *
 * Cách sử dụng:
 * import { walletAPI, authAPI } from './services/api-client';
 *
 * const response = await authAPI.login('email@example.com', 'password');
 */

const API_BASE_URL = "http://localhost:8080";

/**
 * Helper function để gọi API với timeout
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

  // Timeout mặc định: 30 giây
  const timeout = options.timeout || 30000;

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

/**
 * ============================================
 * AUTHENTICATION APIs
 * ============================================
 */

export const authAPI = {
  /**
   * Đăng ký tài khoản - Bước 1: Yêu cầu OTP
   * @param {string} fullName
   * @param {string} email
   */
  registerRequestOtp: async (fullName, email) => {
    return apiCall("/auth/register-request-otp", {
      method: "POST",
      body: JSON.stringify({
        fullName,
        email,
      }),
    });
  },

  /**
   * Đăng ký tài khoản - Bước 2: Xác thực OTP và tạo tài khoản
   * @param {string} email
   * @param {string} otp
   * @param {string} password
   * @param {string} fullName
   */
  verifyRegisterOtp: async (email, otp, password, fullName) => {
    const data = await apiCall("/auth/verify-register-otp", {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
        password,
        fullName,
      }),
    });

    // Lưu token vào localStorage
    if (data.token) {
      localStorage.setItem("accessToken", data.token);
    }

    return data;
  },

  /**
   * Đăng ký tài khoản (CŨ - giữ lại để tương thích)
   * @param {string} fullName
   * @param {string} email
   * @param {string} password
   * @param {string} confirmPassword
   * @param {string} recaptchaToken
   */
  register: async (
    fullName,
    email,
    password,
    confirmPassword,
    recaptchaToken
  ) => {
    return apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName,
        email,
        password,
        confirmPassword,
        recaptchaToken,
      }),
    });
  },

  /**
   * Xác minh email
   * @param {string} email
   * @param {string} code
   */
  verify: async (email, code) => {
    const data = await apiCall("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    // Lưu token vào localStorage
    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
    }

    return data;
  },

  /**
   * Đăng nhập
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // ✅ Kiểm tra xem có token không (format mới) hoặc accessToken (format cũ)
    if (!data || (!data.token && !data.accessToken)) {
      throw new Error("Đăng nhập thất bại. Email hoặc mật khẩu không đúng.");
    }

    // Lưu token vào localStorage
    if (data.token) {
      localStorage.setItem("accessToken", data.token);
    } else if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
    }

    return data;
  },

  /**
   * Làm mới token
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const data = await apiCall("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
    }

    return data;
  },

  /**
   * Quên mật khẩu - Bước 1: Gửi OTP
   * @param {string} email
   */
  forgotPassword: async (email) => {
    return apiCall("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Quên mật khẩu - Bước 2: Xác nhận OTP, nhận resetToken
   * @param {string} email
   * @param {string} otp
   */
  verifyForgotOtp: async (email, otp) => {
    return apiCall("/auth/verify-forgot-otp", {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
      }),
    });
  },

  /**
   * Quên mật khẩu - Bước 3: Đặt lại mật khẩu với resetToken
   * @param {string} resetToken
   * @param {string} newPassword
   */
  resetPassword: async (resetToken, newPassword) => {
    return apiCall("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        resetToken,
        newPassword,
      }),
    });
  },

  /**
   * Đặt lại mật khẩu (CŨ - giữ lại để tương thích)
   * @param {string} email
   * @param {string} otp
   * @param {string} newPassword
   * @param {string} confirmPassword
   */
  resetPasswordOld: async (email, otp, newPassword, confirmPassword) => {
    return apiCall("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email,
        "Mã xác thực": otp,
        newPassword,
        confirmPassword,
      }),
    });
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async () => {
    return apiCall("/auth/me");
  },

  /**
   * Đổi mật khẩu khi đã đăng nhập
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  changePassword: async (oldPassword, newPassword) => {
    return apiCall("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });
  },

  /**
   * Đăng nhập bằng Google
   * @param {string} idToken - Google ID Token
   */
  loginWithGoogle: async (idToken) => {
    const data = await apiCall("/auth/google-login", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });

    // Lưu token vào localStorage
    if (data.token) {
      localStorage.setItem("accessToken", data.token);
    }

    return data;
  },

  /**
   * Đặt mật khẩu lần đầu cho tài khoản Google
   * @param {string} newPassword
   */
  setFirstPassword: async (newPassword) => {
    return apiCall("/auth/set-first-password", {
      method: "POST",
      body: JSON.stringify({
        newPassword,
      }),
    });
  },

  /**
   * Đăng xuất (xóa token)
   */
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // ✅ Trigger event để CategoryDataContext clear categories
    window.dispatchEvent(new CustomEvent("userChanged"));
  },
};

/**
 * ============================================
 * PROFILE APIs
 * ============================================
 */

export const profileAPI = {
  /**
   * Lấy thông tin profile
   */
  getProfile: async () => {
    return apiCall("/profile");
  },

  /**
   * Cập nhật profile
   * @param {string} fullName
   * @param {string} avatar
   */
  updateProfile: async (fullName, avatar) => {
    return apiCall("/profile/update", {
      method: "POST",
      body: JSON.stringify({ fullName, avatar }),
    });
  },

  /**
   * Đổi mật khẩu
   * @param {string} oldPassword - Optional nếu user chưa có password (Google user)
   * @param {string} newPassword
   * @param {string} confirmPassword
   */
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    return apiCall("/profile/change-password", {
      method: "POST",
      body: JSON.stringify({
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    });
  },
};

/**
 * ============================================
 * WALLET APIs
 * ============================================
 */

export const walletAPI = {
  /**
   * Tạo ví mới
   * @param {string} walletName
   * @param {string} currencyCode - VND, USD, ...
   * @param {string} description
   * @param {boolean} setAsDefault
   */
  createWallet: async (walletName, currencyCode, description, setAsDefault) => {
    return apiCall("/wallets/create", {
      method: "POST",
      body: JSON.stringify({
        walletName,
        currencyCode,
        description,
        setAsDefault,
      }),
    });
  },

  /**
   * Lấy danh sách ví
   */
  getWallets: async () => {
    return apiCall("/wallets");
  },

  /**
   * Lấy chi tiết ví
   * @param {number} walletId
   */
  getWalletDetails: async (walletId) => {
    return apiCall(`/wallets/${walletId}`);
  },

  /**
   * Đặt ví làm mặc định
   * @param {number} walletId
   */
  setDefaultWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}/set-default`, {
      method: "PATCH",
    });
  },

  /**
   * Cập nhật ví
   * Theo API_DOCUMENTATION.md (dòng 345-367):
   * - setAsDefault: true = đặt làm mặc định, false = bỏ ví mặc định, null/undefined = không thay đổi
   * - Có thể cập nhật: walletName, description, currencyCode, balance, setAsDefault, walletType
   * @param {number} walletId
   * @param {object} updateData - Object chứa các field cần cập nhật
   * @param {string} [updateData.walletName]
   * @param {string} [updateData.description]
   * @param {string} [updateData.currencyCode]
   * @param {number} [updateData.balance] - Chỉ có thể sửa khi ví chưa có giao dịch
   * @param {boolean|null} [updateData.setAsDefault] - true = đặt làm mặc định, false = bỏ ví mặc định, null/undefined = không thay đổi
   * @param {string} [updateData.walletType] - "PERSONAL" hoặc "GROUP"
   * @param {string} [updateData.color] - Màu ví (nếu API hỗ trợ)
   */
  updateWallet: async (walletId, updateData) => {
    // Chỉ gửi các field có giá trị (không gửi undefined)
    const body = {};
    if (updateData.walletName !== undefined)
      body.walletName = updateData.walletName;
    if (updateData.description !== undefined)
      body.description = updateData.description;
    if (updateData.currencyCode !== undefined)
      body.currencyCode = updateData.currencyCode;
    if (updateData.balance !== undefined) body.balance = updateData.balance;
    if (
      updateData.setAsDefault !== undefined &&
      updateData.setAsDefault !== null
    ) {
      body.setAsDefault = updateData.setAsDefault;
    }
    if (updateData.walletType !== undefined)
      body.walletType = updateData.walletType;
    if (updateData.color !== undefined) body.color = updateData.color;

    return apiCall(`/wallets/${walletId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * Xóa ví
   * @param {number} walletId
   */
  deleteWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: "DELETE",
    });
  },

  /**
   * Chuyển ví cá nhân thành ví nhóm
   * Sử dụng PUT /wallets/{walletId} với walletName và walletType: "GROUP" trong body
   * Theo API_DOCUMENTATION.md (dòng 384-390): Cần cả walletName và walletType
   * @param {number} walletId
   * @param {string} walletName - Tên ví (bắt buộc)
   */
  convertToGroupWallet: async (walletId, walletName) => {
    if (!walletName || walletName.trim() === "") {
      throw new Error("Tên ví không được để trống");
    }

    console.log(
      "api-client: convertToGroupWallet - walletId:",
      walletId,
      "walletName:",
      walletName
    );

    return apiCall(`/wallets/${walletId}`, {
      method: "PUT",
      body: JSON.stringify({
        walletName: walletName.trim(),
        walletType: "GROUP",
      }),
    });
  },

  /**
   * Chia sẻ ví
   * @param {number} walletId
   * @param {string} email
   */
  shareWallet: async (walletId, email) => {
    return apiCall(`/wallets/${walletId}/share`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Lấy danh sách thành viên
   * @param {number} walletId
   */
  getWalletMembers: async (walletId) => {
    return apiCall(`/wallets/${walletId}/members`);
  },

  /**
   * Xóa thành viên
   * @param {number} walletId
   * @param {number} memberUserId
   */
  removeMember: async (walletId, memberUserId) => {
    return apiCall(`/wallets/${walletId}/members/${memberUserId}`, {
      method: "DELETE",
    });
  },

  /**
   * Cập nhật role của thành viên trong ví
   * @param {number} walletId
   * @param {number} memberUserId
   * @param {string} role - e.g., "MEMBER" or "VIEW"
   */
  updateMemberRole: async (walletId, memberUserId, role) => {
    // Update member role. Server is expected to support PATCH for role updates.
    const endpoint = `/wallets/${walletId}/members/${memberUserId}`;
    return apiCall(endpoint, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Rời khỏi ví
   * @param {number} walletId
   */
  leaveWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}/leave`, {
      method: "POST",
    });
  },

  /**
   * Kiểm tra quyền truy cập
   * @param {number} walletId
   */
  checkAccess: async (walletId) => {
    return apiCall(`/wallets/${walletId}/access`);
  },

  /**
   * Lấy danh sách ví có thể gộp
   * @param {number} sourceWalletId
   */
  getMergeCandidates: async (sourceWalletId) => {
    return apiCall(`/wallets/${sourceWalletId}/merge-candidates`);
  },

  /**
   * Preview merge ví
   * @param {number} targetWalletId
   * @param {number} sourceWalletId
   * @param {string} targetCurrency
   */
  previewMerge: async (targetWalletId, sourceWalletId, targetCurrency) => {
    return apiCall(
      `/wallets/${targetWalletId}/merge-preview?sourceWalletId=${sourceWalletId}&targetCurrency=${targetCurrency}`
    );
  },

  /**
   * Gộp ví
   * @param {number} targetWalletId
   * @param {number} sourceWalletId
   * @param {string} targetCurrency
   */
  mergeWallets: async (targetWalletId, sourceWalletId, targetCurrency) => {
    return apiCall(`/wallets/${targetWalletId}/merge`, {
      method: "POST",
      body: JSON.stringify({
        sourceWalletId,
        targetCurrency,
      }),
    });
  },

  /**
   * Lấy lịch sử merge
   */
  getMergeHistory: async () => {
    return apiCall("/wallets/merge-history");
  },

  /**
   * Lấy danh sách ví có thể chuyển tiền đến
   * @param {number} walletId
   */
  getTransferTargets: async (walletId) => {
    return apiCall(`/wallets/${walletId}/transfer-targets`);
  },

  /**
   * Chuyển tiền giữa các ví
   * @param {number} fromWalletId
   * @param {number} toWalletId
   * @param {number} amount
   * @param {string} note
   */
  transferMoney: async (fromWalletId, toWalletId, amount, note) => {
    return apiCall("/wallets/transfer", {
      method: "POST",
      body: JSON.stringify({
        fromWalletId,
        toWalletId,
        amount,
        note,
      }),
    });
  },

  /**
   * Lấy danh sách tất cả wallet transfers
   */
  getAllTransfers: async () => {
    return apiCall("/wallets/transfers");
  },

  /**
   * Cập nhật giao dịch chuyển tiền (chỉ ghi chú)
   * @param {number} transferId
   * @param {string} note
   */
  updateTransfer: async (transferId, note) => {
    const id = Number(transferId);
    if (isNaN(id)) {
      throw new Error(`Invalid transfer ID: ${transferId}`);
    }
    console.log(`Calling PUT /wallets/transfers/${id}`);
    return apiCall(`/wallets/transfers/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        note: note || null,
      }),
    });
  },

  /**
   * Xóa giao dịch chuyển tiền
   * @param {number} transferId
   */
  deleteTransfer: async (transferId) => {
    const id = Number(transferId);
    if (isNaN(id)) {
      throw new Error(`Invalid transfer ID: ${transferId}`);
    }
    console.log(`Calling DELETE /wallets/transfers/${id}`);
    return apiCall(`/wallets/transfers/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * ============================================
 * FUND APIs (Quỹ Tiết Kiệm)
 * ============================================
 */

export const fundAPI = {
  /**
   * Tạo quỹ mới
   * @param {object} fundData
   */
  createFund: async (fundData) => {
    return apiCall("/funds", {
      method: "POST",
      body: JSON.stringify(fundData),
    });
  },

  /**
   * Lấy tất cả quỹ của user
   */
  getAllFunds: async () => {
    return apiCall("/funds");
  },

  /**
   * Lấy quỹ cá nhân
   * @param {boolean|null} hasDeadline
   */
  getPersonalFunds: async (hasDeadline = null) => {
    const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : "";
    return apiCall(`/funds/personal${params}`);
  },

  /**
   * Lấy quỹ nhóm
   * @param {boolean|null} hasDeadline
   */
  getGroupFunds: async (hasDeadline = null) => {
    const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : "";
    return apiCall(`/funds/group${params}`);
  },

  /**
   * Lấy quỹ tham gia
   */
  getParticipatedFunds: async () => {
    return apiCall("/funds/participated");
  },

  /**
   * Lấy chi tiết một quỹ
   * @param {number|string} fundId
   */
  getFund: async (fundId) => {
    return apiCall(`/funds/${fundId}`);
  },

  /**
   * Cập nhật quỹ
   * @param {number|string} fundId
   * @param {object} fundData
   */
  updateFund: async (fundId, fundData) => {
    return apiCall(`/funds/${fundId}`, {
      method: "PUT",
      body: JSON.stringify(fundData),
    });
  },

  /**
   * Đóng quỹ
   * @param {number|string} fundId
   */
  closeFund: async (fundId) => {
    return apiCall(`/funds/${fundId}/close`, {
      method: "PUT",
    });
  },

  /**
   * Xóa quỹ
   * @param {number|string} fundId
   */
  deleteFund: async (fundId) => {
    return apiCall(`/funds/${fundId}`, {
      method: "DELETE",
    });
  },

  /**
   * Nạp tiền vào quỹ
   * @param {number|string} fundId
   * @param {number} amount
   */
  depositToFund: async (fundId, amount) => {
    return apiCall(`/funds/${fundId}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  /**
   * Rút tiền từ quỹ
   * @param {number|string} fundId
   * @param {number} amount
   */
  withdrawFromFund: async (fundId, amount) => {
    return apiCall(`/funds/${fundId}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  /**
   * Kiểm tra ví có đang được sử dụng không
   * @param {number|string} walletId
   */
  checkWalletUsed: async (walletId) => {
    return apiCall(`/funds/check-wallet/${walletId}`);
  },
};

/**
 * ============================================
 * BUDGET APIs
 * ============================================
 */

export const budgetAPI = {
  /**
   * Lấy tất cả ngân sách của user
   */
  getBudgets: async () => {
    return apiCall("/budgets");
  },

  /**
   * Lấy chi tiết một ngân sách
   * @param {number|string} budgetId
   */
  getBudget: async (budgetId) => {
    return apiCall(`/budgets/${budgetId}`);
  },

  /**
   * Tạo ngân sách mới
   * @param {object} budgetData
   */
  createBudget: async (budgetData) => {
    return apiCall("/budgets/create", {
      method: "POST",
      body: JSON.stringify(budgetData),
    });
  },

  /**
   * Cập nhật ngân sách
   * @param {number|string} budgetId
   * @param {object} budgetData
   */
  updateBudget: async (budgetId, budgetData) => {
    return apiCall(`/budgets/${budgetId}`, {
      method: "PUT",
      body: JSON.stringify(budgetData),
    });
  },

  /**
   * Xóa ngân sách
   * @param {number|string} budgetId
   */
  deleteBudget: async (budgetId) => {
    return apiCall(`/budgets/${budgetId}`, {
      method: "DELETE",
    });
  },

  /**
   * Lấy danh sách giao dịch thuộc ngân sách
   * @param {number|string} budgetId
   */
  getBudgetTransactions: async (budgetId) => {
    return apiCall(`/budgets/${budgetId}/transactions`);
  },
};

/**
 * ============================================
 * TRANSACTION APIs
 * ============================================
 */

export const transactionAPI = {
  /**
   * Lấy danh sách tất cả transactions
   */
  getAllTransactions: async () => {
    return apiCall("/transactions");
  },
  
  /**
   * Lấy transactions cho một wallet cụ thể (nếu backend hỗ trợ query param)
   * @param {number|string} walletId
   */
  getTransactionsByWallet: async (walletId) => {
    if (!walletId) return apiCall("/transactions");
    const q = `?walletId=${encodeURIComponent(walletId)}`;
    return apiCall(`/transactions${q}`);
  },
  
  /**
   * Try endpoint that is explicitly wallet-scoped. Some backends expose `/wallets/{id}/transactions`.
   */
  getWalletTransactions: async (walletId) => {
    if (!walletId) return apiCall("/transactions");
    return apiCall(`/wallets/${encodeURIComponent(walletId)}/transactions`);
  },

  /**
   * Thêm chi tiêu
   * @param {number} amount
   * @param {string} transactionDate - ISO 8601 format: "2024-01-01T10:00:00"
   * @param {number} walletId
   * @param {number} categoryId
   * @param {string} note
   * @param {string} imageUrl
   */
  addExpense: async (
    amount,
    transactionDate,
    walletId,
    categoryId,
    note,
    imageUrl
  ) => {
    return apiCall("/transactions/expense", {
      method: "POST",
      body: JSON.stringify({
        amount,
        transactionDate,
        walletId,
        categoryId,
        note,
        imageUrl,
      }),
    });
  },

  /**
   * Thêm thu nhập
   * @param {number} amount
   * @param {string} transactionDate - ISO 8601 format: "2024-01-01T10:00:00"
   * @param {number} walletId
   * @param {number} categoryId
   * @param {string} note
   * @param {string} imageUrl
   */
  addIncome: async (
    amount,
    transactionDate,
    walletId,
    categoryId,
    note,
    imageUrl
  ) => {
    return apiCall("/transactions/income", {
      method: "POST",
      body: JSON.stringify({
        amount,
        transactionDate,
        walletId,
        categoryId,
        note,
        imageUrl,
      }),
    });
  },

  /**
   * Cập nhật giao dịch (chỉ được sửa category, note, imageUrl)
   * @param {number} transactionId
   * @param {number} categoryId
   * @param {string} note
   * @param {string} imageUrl
   */
  updateTransaction: async (transactionId, categoryId, note, imageUrl) => {
    // Đảm bảo transactionId là số nguyên
    const id = Number(transactionId);
    if (isNaN(id)) {
      throw new Error(`Invalid transaction ID: ${transactionId}`);
    }

    console.log(`Calling PUT /transactions/${id}`);

    return apiCall(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        categoryId: Number(categoryId),
        note: note || null,
        imageUrl: imageUrl || null,
      }),
    });
  },

  /**
   * Xóa giao dịch
   * @param {number} transactionId
   */
  deleteTransaction: async (transactionId) => {
    // Đảm bảo transactionId là số nguyên
    const id = Number(transactionId);
    if (isNaN(id)) {
      throw new Error(`Invalid transaction ID: ${transactionId}`);
    }

    console.log(`Calling DELETE /transactions/${id}`);

    return apiCall(`/transactions/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * ============================================
 * CATEGORY APIs
 * ============================================
 */

export const categoryAPI = {
  /**
   * Lấy danh sách tất cả categories (bao gồm system và user categories)
   */
  getCategories: async () => {
    return apiCall("/categories");
  },

  /**
   * Tạo danh mục
   * @param {number} userId - Không cần gửi lên, backend tự lấy từ token
   * @param {string} categoryName
   * @param {string} description
   * @param {number} transactionTypeId - 1: Chi tiêu, 2: Thu nhập
   */
  createCategory: async (
    userId,
    categoryName,
    description,
    transactionTypeId,
    isSystem
  ) => {
    return apiCall("/categories/create", {
      method: "POST",
      body: JSON.stringify({
        categoryName,
        description: description || "",
        transactionTypeId,
        isSystem: isSystem,
      }),
    });
  },

  /**
   * Cập nhật danh mục
   * @param {number} id
   * @param {number} userId - Không cần gửi lên, backend tự lấy từ token
   * @param {string} categoryName
   * @param {string} description
   * @param {number} transactionTypeId - Không cần gửi lên, backend giữ nguyên
   */
  updateCategory: async (
    id,
    userId,
    categoryName,
    description,
    transactionTypeId,
    isSystem
  ) => {
    return apiCall(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        categoryName,
        description: description || "",
        isSystem: isSystem,
      }),
    });
  },

  /**
   * Xóa danh mục
   * @param {number} id
   */
  deleteCategory: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * ============================================
 * GOOGLE OAUTH2
 * ============================================
 */

export const googleOAuthAPI = {
  /**
   * Redirect đến Google OAuth2 login
   */
  login: () => {
    window.location.href = `${API_BASE_URL}/auth/oauth2/authorization/google`;
  },
};

/**
 * ============================================
 * ADMIN APIs
 * ============================================
 */

export const adminAPI = {
  /**
   * Lấy danh sách tất cả users (Admin only)
   */
  getUsers: async () => {
    return apiCall("/admin/users");
  },

  /**
   * Lấy chi tiết 1 user
   * @param {number} userId
   */
  getUserDetail: async (userId) => {
    return apiCall(`/admin/users/${userId}/detail`);
  },

  /**
   * Khóa user
   * @param {number} userId
   */
  lockUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/lock`, {
      method: "POST",
    });
  },

  /**
   * Mở khóa user
   * @param {number} userId
   */
  unlockUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/unlock`, {
      method: "POST",
    });
  },

  /**
   * Đổi role user
   * @param {number} userId
   * @param {string} role - "USER" hoặc "ADMIN"
   */
  changeUserRole: async (userId, role) => {
    return apiCall(`/admin/users/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Xóa user (soft delete)
   * @param {number} userId
   */
  deleteUser: async (userId) => {
    return apiCall(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  /**
   * Lấy login logs của 1 user
   * @param {number} userId
   */
  getUserLoginLogs: async (userId) => {
    return apiCall(`/admin/users/${userId}/login-logs`);
  },

  /**
   * Lấy admin action logs
   */
  getAdminLogs: async () => {
    return apiCall("/admin/users/logs");
  },
};

/**
 * ============================================
 * LOGIN LOGS APIs
 * ============================================
 */

export const loginLogAPI = {
  /**
   * User tự xem login logs của mình
   */
  getMyLoginLogs: async () => {
    return apiCall("/me/login-logs");
  },
};

/**
 * Export default object chứa tất cả APIs
 */
const apiClient = {
  auth: authAPI,
  profile: profileAPI,
  wallet: walletAPI,
  fund: fundAPI,
  budget: budgetAPI,
  transaction: transactionAPI,
  category: categoryAPI,
  googleOAuth: googleOAuthAPI,
  admin: adminAPI,
  loginLog: loginLogAPI,
};

export default apiClient;
