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

const API_BASE_URL = 'http://localhost:8080';

/**
 * Helper function để gọi API với timeout
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('accessToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
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
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Phản hồi từ server không hợp lệ');
      }
    } else {
      const text = await response.text();
      throw new Error(text || 'Có lỗi xảy ra');
    }
    
    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
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
    if (error.name === 'AbortError') {
      throw new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.');
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy.');
    }
    
    // Re-throw với message gốc nếu đã có
    if (error.message) {
      throw error;
    }
    
    throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
  }
}

/**
 * ============================================
 * AUTHENTICATION APIs
 * ============================================
 */

export const authAPI = {
  /**
   * Đăng ký tài khoản
   * @param {string} fullName 
   * @param {string} email 
   * @param {string} password 
   * @param {string} confirmPassword 
   * @param {string} recaptchaToken 
   */
  register: async (fullName, email, password, confirmPassword, recaptchaToken) => {
    return apiCall('/auth/register', {
      method: 'POST',
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
    const data = await apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    // Lưu token vào localStorage
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    return data;
  },

  /**
   * Đăng nhập
   * @param {string} email 
   * @param {string} password 
   */
  login: async (email, password) => {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // ✅ Kiểm tra xem có accessToken không - nếu không có thì throw error
    if (!data || !data.accessToken) {
      throw new Error("Đăng nhập thất bại. Email hoặc mật khẩu không đúng.");
    }
    
    // Lưu token vào localStorage
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    return data;
  },

  /**
   * Làm mới token
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const data = await apiCall('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    
    return data;
  },

  /**
   * Quên mật khẩu
   * @param {string} email 
   */
  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Đặt lại mật khẩu
   * @param {string} email 
   * @param {string} otp 
   * @param {string} newPassword 
   * @param {string} confirmPassword 
   */
  resetPassword: async (email, otp, newPassword, confirmPassword) => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        'Mã xác thực': otp,
        newPassword,
        confirmPassword,
      }),
    });
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async () => {
    return apiCall('/auth/me');
  },

  /**
   * Đăng xuất (xóa token)
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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
    return apiCall('/profile');
  },

  /**
   * Cập nhật profile
   * @param {string} fullName 
   * @param {string} avatar 
   */
  updateProfile: async (fullName, avatar) => {
    return apiCall('/profile/update', {
      method: 'POST',
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
    return apiCall('/profile/change-password', {
      method: 'POST',
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
    return apiCall('/wallets/create', {
      method: 'POST',
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
    return apiCall('/wallets');
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
      method: 'PATCH',
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
    if (updateData.walletName !== undefined) body.walletName = updateData.walletName;
    if (updateData.description !== undefined) body.description = updateData.description;
    if (updateData.currencyCode !== undefined) body.currencyCode = updateData.currencyCode;
    if (updateData.balance !== undefined) body.balance = updateData.balance;
    if (updateData.setAsDefault !== undefined && updateData.setAsDefault !== null) {
      body.setAsDefault = updateData.setAsDefault;
    }
    if (updateData.walletType !== undefined) body.walletType = updateData.walletType;
    if (updateData.color !== undefined) body.color = updateData.color;
    
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * Xóa ví
   * @param {number} walletId 
   */
  deleteWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'DELETE',
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
    
    console.log("api-client: convertToGroupWallet - walletId:", walletId, "walletName:", walletName);
    
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify({
        walletName: walletName.trim(),
        walletType: 'GROUP',
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
      method: 'POST',
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
      method: 'DELETE',
    });
  },

  /**
   * Rời khỏi ví
   * @param {number} walletId 
   */
  leaveWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}/leave`, {
      method: 'POST',
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
      method: 'POST',
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
    return apiCall('/wallets/merge-history');
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
    return apiCall('/wallets/transfer', {
      method: 'POST',
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
    return apiCall('/wallets/transfers');
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
    return apiCall('/transactions');
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
  addExpense: async (amount, transactionDate, walletId, categoryId, note, imageUrl) => {
    return apiCall('/transactions/expense', {
      method: 'POST',
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
  addIncome: async (amount, transactionDate, walletId, categoryId, note, imageUrl) => {
    return apiCall('/transactions/income', {
      method: 'POST',
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
    return apiCall('/categories');
  },

  /**
   * Tạo danh mục
   * @param {number} userId - Không cần gửi lên, backend tự lấy từ token
   * @param {string} categoryName 
   * @param {string} description 
   * @param {number} transactionTypeId - 1: Chi tiêu, 2: Thu nhập
   */
  createCategory: async (userId, categoryName, description, transactionTypeId) => {
    return apiCall('/categories/create', {
      method: 'POST',
      body: JSON.stringify({
        categoryName,
        description: description || "",
        transactionTypeId,
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
  updateCategory: async (id, userId, categoryName, description, transactionTypeId) => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        categoryName,
        description: description || "",
      }),
    });
  },

  /**
   * Xóa danh mục
   * @param {number} id 
   */
  deleteCategory: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE',
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
 * Export default object chứa tất cả APIs
 */
export default {
  auth: authAPI,
  profile: profileAPI,
  wallet: walletAPI,
  transaction: transactionAPI,
  category: categoryAPI,
  googleOAuth: googleOAuthAPI,
};

