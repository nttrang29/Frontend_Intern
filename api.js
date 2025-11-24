/**
 * API Client cho Personal Finance App
 * Sử dụng trong React project
 */

const API_BASE_URL = 'http://localhost:8080';

/**
 * Helper function để gọi API
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
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Có lỗi xảy ra');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== AUTHENTICATION APIs ====================

export const authAPI = {
  /**
   * Đăng ký tài khoản mới
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
   * Xác minh email với mã OTP
   */
  verify: async (email, code) => {
    return apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  /**
   * Đăng nhập
   */
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Làm mới access token
   */
  refreshToken: async (refreshToken) => {
    return apiCall('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Quên mật khẩu - Gửi OTP
   */
  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Xác thực OTP
   */
  verifyOtp: async (email, otp) => {
    return apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        'Mã xác thực': otp,
      }),
    });
  },

  /**
   * Đặt lại mật khẩu
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
   * Đăng nhập Google OAuth2
   */
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/oauth2/authorization/google`;
  },
};

// ==================== PROFILE APIs ====================

export const profileAPI = {
  /**
   * Lấy thông tin profile
   */
  getProfile: async () => {
    return apiCall('/profile');
  },

  /**
   * Cập nhật profile
   */
  updateProfile: async (fullName, avatar) => {
    return apiCall('/profile/update', {
      method: 'POST',
      body: JSON.stringify({ fullName, avatar }),
    });
  },

  /**
   * Đổi mật khẩu
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

// ==================== WALLET APIs ====================

export const walletAPI = {
  /**
   * Tạo ví mới
   */
  createWallet: async (walletName, currencyCode, description, setAsDefault, walletType) => {
    return apiCall('/wallets/create', {
      method: 'POST',
      body: JSON.stringify({
        walletName,
        currencyCode,
        initialBalance: 0.0,
        description,
        setAsDefault,
        walletType: walletType || 'PERSONAL',
      }),
    });
  },

  /**
   * Lấy danh sách tất cả ví
   */
  getAllWallets: async () => {
    return apiCall('/wallets');
  },

  /**
   * Lấy chi tiết ví
   */
  getWalletDetails: async (walletId) => {
    return apiCall(`/wallets/${walletId}`);
  },

  /**
   * Cập nhật ví
   * Có thể cập nhật: tên, mô tả, số dư (nếu chưa có giao dịch), loại ví (PERSONAL/GROUP), trạng thái ví mặc định
   * @param {number} walletId - ID của ví
   * @param {string} walletName - Tên ví mới
   * @param {string} description - Mô tả ví
   * @param {string} currencyCode - Mã tiền tệ (chỉ để kiểm tra, không thể sửa)
   * @param {number} balance - Số dư (chỉ có thể sửa nếu ví chưa có giao dịch)
   * @param {boolean|null} setAsDefault - Đặt làm ví mặc định: true = đặt làm mặc định, false = bỏ ví mặc định, null = không thay đổi
   * @param {string} walletType - Loại ví: "PERSONAL" hoặc "GROUP" (có thể chuyển PERSONAL -> GROUP, không thể GROUP -> PERSONAL)
   * @returns {Promise<{message: string, wallet: object}>}
   */
  updateWallet: async (walletId, walletName, description, currencyCode, balance, setAsDefault, walletType) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify({
        walletName,
        description,
        currencyCode,
        balance,
        setAsDefault,
        walletType,
      }),
    });
  },

  /**
   * Chuyển đổi ví cá nhân sang ví nhóm
   * @param {number} walletId - ID của ví cần chuyển đổi
   * @returns {Promise<{message: string, wallet: object}>}
   */
  convertToGroupWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify({
        walletType: 'GROUP',
      }),
    });
  },

  /**
   * Chuyển đổi ví nhóm về ví cá nhân
   * ⚠️ LƯU Ý: Không thể chuyển từ GROUP về PERSONAL. Sẽ báo lỗi.
   * @param {number} walletId - ID của ví cần chuyển đổi
   * @returns {Promise<{message: string, wallet: object}>}
   * @throws {Error} Nếu cố gắng chuyển GROUP -> PERSONAL
   */
  convertToPersonalWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify({
        walletType: 'PERSONAL',
      }),
    });
  },

  /**
   * Xóa ví
   * ⚠️ LƯU Ý: Không thể xóa ví có giao dịch hoặc ví mặc định
   * @param {number} walletId - ID của ví cần xóa
   * @returns {Promise<{message: string, deletedWallet: {deletedWalletId: number, deletedWalletName: string, balance: number, currencyCode: string, wasDefault: boolean, membersRemoved: number, transactionsDeleted: number}}>}
   * @throws {Error} Nếu ví có giao dịch hoặc là ví mặc định
   */
  deleteWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Đặt ví mặc định
   * Tự động bỏ ví mặc định cũ và đặt ví này làm ví mặc định
   * @param {number} walletId - ID của ví cần đặt làm mặc định
   * @returns {Promise<{message: string}>}
   */
  setDefaultWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}/set-default`, {
      method: 'PATCH',
    });
  },

  /**
   * Bỏ ví mặc định
   * Sử dụng updateWallet với setAsDefault = false để bỏ ví mặc định
   * @param {number} walletId - ID của ví cần bỏ mặc định
   * @returns {Promise<{message: string, wallet: object}>}
   */
  unsetDefaultWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify({
        setAsDefault: false,
      }),
    });
  },

  /**
   * Chia sẻ ví
   */
  shareWallet: async (walletId, email) => {
    return apiCall(`/wallets/${walletId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Lấy danh sách thành viên ví
   */
  getWalletMembers: async (walletId) => {
    return apiCall(`/wallets/${walletId}/members`);
  },

  /**
   * Xóa thành viên khỏi ví
   */
  removeMember: async (walletId, memberUserId) => {
    return apiCall(`/wallets/${walletId}/members/${memberUserId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Rời khỏi ví
   */
  leaveWallet: async (walletId) => {
    return apiCall(`/wallets/${walletId}/leave`, {
      method: 'POST',
    });
  },

  /**
   * Kiểm tra quyền truy cập ví
   */
  checkAccess: async (walletId) => {
    return apiCall(`/wallets/${walletId}/access`);
  },

  /**
   * Chuyển tiền giữa các ví
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
   * Lấy danh sách ví đích để chuyển tiền
   */
  getTransferTargets: async (walletId) => {
    return apiCall(`/wallets/${walletId}/transfer-targets`);
  },

  /**
   * Lấy danh sách ví có thể gộp
   * Chỉ trả về các ví mà user là OWNER
   * @param {number} sourceWalletId - ID của ví nguồn
   * @returns {Promise<{candidateWallets: Array, ineligibleWallets: Array, total: number}>}
   */
  getMergeCandidates: async (sourceWalletId) => {
    return apiCall(`/wallets/${sourceWalletId}/merge-candidates`);
  },

  /**
   * Xem trước kết quả gộp ví
   * Hiển thị số dư, số giao dịch, và các cảnh báo trước khi gộp
   * @param {number} targetWalletId - ID của ví đích (ví sẽ giữ lại)
   * @param {number} sourceWalletId - ID của ví nguồn (ví sẽ bị xóa)
   * @param {string} targetCurrency - Loại tiền tệ sau khi gộp (VD: "VND", "USD")
   * @returns {Promise<{preview: object}>}
   */
  previewMerge: async (targetWalletId, sourceWalletId, targetCurrency) => {
    return apiCall(
      `/wallets/${targetWalletId}/merge-preview?sourceWalletId=${sourceWalletId}&targetCurrency=${targetCurrency}`
    );
  },

  /**
   * Gộp ví nguồn vào ví đích
   * 
   * ⚠️ LƯU Ý: Ví nguồn sẽ BỊ XÓA sau khi gộp thành công!
   * 
   * Quy trình:
   * 1. Chuyển đổi số dư nếu khác currency
   * 2. Chuyển tất cả transactions từ ví nguồn sang ví đích
   * 3. Chuyển đổi amount của transactions nếu cần (lưu thông tin gốc)
   * 4. Chuyển tất cả members từ ví nguồn sang ví đích
   * 5. Chuyển flag "default wallet" nếu ví nguồn là default
   * 6. Xóa ví nguồn và lưu lịch sử merge
   * 
   * @param {number} targetWalletId - ID của ví đích (ví sẽ giữ lại)
   * @param {number} sourceWalletId - ID của ví nguồn (ví sẽ bị xóa)
   * @param {string} targetCurrency - Loại tiền tệ sau khi gộp (VD: "VND", "USD")
   * @returns {Promise<{success: boolean, message: string, result: object}>}
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
};

// ==================== CATEGORY APIs ====================

export const categoryAPI = {
  /**
   * Tạo danh mục mới
   */
  createCategory: async (categoryName, icon, transactionTypeId) => {
    return apiCall('/categories/create', {
      method: 'POST',
      body: JSON.stringify({
        categoryName,
        icon,
        transactionTypeId,
      }),
    });
  },

  /**
   * Cập nhật danh mục
   */
  updateCategory: async (categoryId, categoryName, icon) => {
    return apiCall(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        categoryName,
        icon,
      }),
    });
  },

  /**
   * Xóa danh mục
   */
  deleteCategory: async (categoryId) => {
    return apiCall(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy danh sách danh mục
   */
  getCategories: async () => {
    return apiCall('/categories');
  },
};

// ==================== TRANSACTION APIs ====================

export const transactionAPI = {
  /**
   * Tạo giao dịch chi tiêu
   */
  createExpense: async (walletId, categoryId, amount, transactionDate, note, imageUrl) => {
    return apiCall('/transactions/expense', {
      method: 'POST',
      body: JSON.stringify({
        walletId,
        categoryId,
        amount,
        transactionDate,
        note,
        imageUrl,
      }),
    });
  },

  /**
   * Tạo giao dịch thu nhập
   */
  createIncome: async (walletId, categoryId, amount, transactionDate, note, imageUrl) => {
    return apiCall('/transactions/income', {
      method: 'POST',
      body: JSON.stringify({
        walletId,
        categoryId,
        amount,
        transactionDate,
        note,
        imageUrl,
      }),
    });
  },
};

// ==================== EXPORT ALL APIs ====================

export default {
  auth: authAPI,
  profile: profileAPI,
  wallet: walletAPI,
  category: categoryAPI,
  transaction: transactionAPI,
};

/**
 * Ví dụ sử dụng:
 * 
 * import api from './api';
 * 
 * // ============ AUTHENTICATION ============
 * // Đăng nhập
 * const loginData = await api.auth.login('user@example.com', 'password');
 * localStorage.setItem('accessToken', loginData.accessToken);
 * localStorage.setItem('refreshToken', loginData.refreshToken);
 * 
 * // ============ WALLET ============
 * // Lấy danh sách ví
 * const { wallets } = await api.wallet.getAllWallets();
 * 
 * // Tạo ví mới
 * const newWallet = await api.wallet.createWallet(
 *   'Ví mới',
 *   'VND',
 *   'Mô tả ví',
 *   false, // setAsDefault
 *   'PERSONAL' // walletType
 * );
 * 
 * // Chuyển đổi ví cá nhân sang ví nhóm
 * const groupWallet = await api.wallet.convertToGroupWallet(1); // walletId
 * 
 * // Chuyển đổi ví nhóm về ví cá nhân (sẽ báo lỗi)
 * try {
 *   const personalWallet = await api.wallet.convertToPersonalWallet(1); // walletId
 * } catch (error) {
 *   console.error('Lỗi:', error.message); // "Không thể chuyển ví nhóm về ví cá nhân..."
 * }
 * 
 * // Hoặc cập nhật loại ví thông qua updateWallet
 * const updated = await api.wallet.updateWallet(
 *   1, // walletId
 *   'Ví nhóm', // walletName
 *   'Mô tả', // description
 *   'VND', // currencyCode
 *   null, // balance
 *   false, // setAsDefault (false = bỏ ví mặc định, true = đặt làm mặc định, null = không thay đổi)
 *   'GROUP' // walletType
 * );
 * 
 * // Bỏ ví mặc định
 * await api.wallet.unsetDefaultWallet(1); // walletId
 * 
 * // Hoặc sử dụng updateWallet với setAsDefault = false
 * await api.wallet.updateWallet(1, null, null, null, null, false, null);
 * 
 * // ============ MERGE WALLET ============
 * // 1. Lấy danh sách ví có thể gộp
 * const { candidateWallets } = await api.wallet.getMergeCandidates(1); // sourceWalletId
 * 
 * // 2. Xem trước kết quả gộp ví
 * const preview = await api.wallet.previewMerge(
 *   2, // targetWalletId (ví đích)
 *   1, // sourceWalletId (ví nguồn - sẽ bị xóa)
 *   'VND' // targetCurrency
 * );
 * 
 * console.log('Số dư sau khi gộp:', preview.preview.finalBalance);
 * console.log('Cảnh báo:', preview.preview.warnings);
 * 
 * // 3. Thực hiện gộp ví
 * // ⚠️ LƯU Ý: Ví nguồn sẽ BỊ XÓA sau khi gộp thành công!
 * const mergeResult = await api.wallet.mergeWallets(
 *   2, // targetWalletId (ví đích - giữ lại)
 *   1, // sourceWalletId (ví nguồn - sẽ bị xóa)
 *   'VND' // targetCurrency
 * );
 * 
 * if (mergeResult.success) {
 *   console.log('Gộp ví thành công!');
 *   console.log('Số dư cuối cùng:', mergeResult.result.finalBalance);
 *   console.log('Số giao dịch đã gộp:', mergeResult.result.mergedTransactions);
 * }
 * 
 * // ============ TRANSACTION ============
 * // Tạo giao dịch chi tiêu
 * const expense = await api.transaction.createExpense(
 *   1, // walletId
 *   1, // categoryId
 *   50000, // amount
 *   new Date().toISOString(), // transactionDate
 *   'Ăn trưa', // note
 *   null // imageUrl
 * );
 * 
 * // Tạo giao dịch thu nhập
 * const income = await api.transaction.createIncome(
 *   1, // walletId
 *   5, // categoryId
 *   1000000, // amount
 *   new Date().toISOString(), // transactionDate
 *   'Lương tháng 1', // note
 *   null // imageUrl
 * );
 * 
 * // ============ TRANSFER MONEY ============
 * // Chuyển tiền giữa các ví
 * const transfer = await api.wallet.transferMoney(
 *   1, // fromWalletId
 *   2, // toWalletId
 *   100000, // amount
 *   'Chuyển tiền' // note
 * );
 */

