/**
 * Wallet Service - Service layer cho các API calls liên quan đến wallet management
 * Base URL: http://localhost:8080/wallets
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:8080/wallets";

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

// ========================= CREATE WALLET =========================

/**
 * 📝 TẠO VÍ MỚI
 * @param {Object} createData - Dữ liệu tạo ví
 * @param {string} createData.walletName - Tên ví
 * @param {string} createData.currencyCode - Mã tiền tệ (VND hoặc USD)
 * @param {string} [createData.description] - Mô tả ví (optional)
 * @param {boolean} [createData.setAsDefault] - Đặt làm ví mặc định (optional)
 * @returns {Promise<Object>} - { message: string, wallet: Object } hoặc { error: string }
 * @note Số dư ban đầu luôn mặc định là 0. Để thêm tiền, tạo transaction "Thu nhập" hoặc chuyển từ ví khác.
 */
export const createWallet = async (createData) => {
  try {
    console.log("wallet.service: Calling POST /wallets/create với data:", createData);
    const response = await apiClient.post("/create", createData);
    console.log("wallet.service: POST /wallets/create response:", {
      status: response.status,
      data: response.data
    });
    return handleAxiosResponse(response);
  } catch (error) {
    console.error("wallet.service: POST /wallets/create error:", error);
    if (error.response) {
      console.error("wallet.service: Error response:", {
        status: error.response.status,
        data: error.response.data
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
      console.error("wallet.service: No response received:", error.request);
      return {
        response: { ok: false, status: 0 },
        data: { error: "Lỗi kết nối đến máy chủ khi tạo ví." },
      };
    } else {
      console.error("wallet.service: Request setup error:", error.message);
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================= GET ALL WALLETS =========================

/**
 * 📋 LẤY TẤT CẢ VÍ CỦA NGƯỜI DÙNG
 * @returns {Promise<Object>} - { wallets: Array, total: number } hoặc { error: string }
 */
export const getMyWallets = async () => {
  try {
    console.log("wallet.service: Calling GET /wallets...");
    const response = await apiClient.get("");
    console.log("wallet.service: GET /wallets response:", {
      status: response.status,
      data: response.data
    });
    return handleAxiosResponse(response);
  } catch (error) {
    console.error("wallet.service: GET /wallets error:", error);
    if (error.response) {
      console.error("wallet.service: Error response:", {
        status: error.response.status,
        data: error.response.data
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
      console.error("wallet.service: No response received:", error.request);
      return {
        response: { ok: false, status: 0 },
        data: { error: "Lỗi kết nối đến máy chủ khi lấy danh sách ví." },
      };
    } else {
      console.error("wallet.service: Request setup error:", error.message);
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================= GET WALLET DETAILS =========================

/**
 * 🔍 LẤY CHI TIẾT VÍ
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { wallet: Object } hoặc { error: string }
 */
export const getWalletDetails = async (walletId) => {
  try {
    const response = await apiClient.get(`/${walletId}`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy chi tiết ví." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================= SET DEFAULT WALLET =========================

/**
 * ⭐ ĐẶT VÍ MẶC ĐỊNH
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const setDefaultWallet = async (walletId) => {
  try {
    const response = await apiClient.patch(`/${walletId}/set-default`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi đặt ví mặc định." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================= SHARED WALLET ENDPOINTS =========================

/**
 * 🔗 CHIA SẺ VÍ CHO NGƯỜI KHÁC
 * @param {number} walletId - ID của ví
 * @param {string} email - Email của người được chia sẻ
 * @returns {Promise<Object>} - { message: string, member: Object } hoặc { error: string }
 */
export const shareWallet = async (walletId, email) => {
  try {
    const response = await apiClient.post(`/${walletId}/share`, { email });
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
        data: { error: "Lỗi kết nối đến máy chủ khi chia sẻ ví." },
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
 * 👥 LẤY DANH SÁCH THÀNH VIÊN CỦA VÍ
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { members: Array, total: number } hoặc { error: string }
 */
export const getWalletMembers = async (walletId) => {
  try {
    const response = await apiClient.get(`/${walletId}/members`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy danh sách thành viên." },
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
 * 🚫 XÓA THÀNH VIÊN KHỎI VÍ
 * @param {number} walletId - ID của ví
 * @param {number} memberUserId - ID của user cần xóa
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const removeMember = async (walletId, memberUserId) => {
  try {
    const response = await apiClient.delete(`/${walletId}/members/${memberUserId}`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi xóa thành viên." },
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
 * 🔧 CẬP NHẬT ROLE THÀNH VIÊN
 * @param {number} walletId
 * @param {number} memberUserId
 * @param {string} role
 * @returns {Promise<Object>} - { message, member } hoặc { error }
 */
export const updateMemberRole = async (walletId, memberUserId, role) => {
  try {
    const response = await apiClient.patch(`/${walletId}/members/${memberUserId}`, { role });
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
        data: { error: "Lỗi kết nối đến máy chủ khi cập nhật quyền thành viên." },
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
 * 🚪 RỜI KHỎI VÍ (nếu không phải chủ ví)
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const leaveWallet = async (walletId) => {
  try {
    const response = await apiClient.post(`/${walletId}/leave`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi rời khỏi ví." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================== ACCESS CHECK ==========================

/**
 * 🔐 KIỂM TRA QUYỀN TRUY CẬP VÍ
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { hasAccess: boolean, isOwner: boolean, role: string } hoặc { error: string }
 */
export const checkAccess = async (walletId) => {
  try {
    const response = await apiClient.get(`/${walletId}/access`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi kiểm tra quyền truy cập." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================== MERGE WALLET ==========================

/**
 * 🔀 LẤY DANH SÁCH VÍ CÓ THỂ GỘP
 * @param {number} sourceWalletId - ID của ví nguồn (ví sẽ bị gộp)
 * @returns {Promise<Object>} - { candidateWallets: Array, ineligibleWallets: Array, total: number } hoặc { error: string }
 */
export const getMergeCandidates = async (sourceWalletId) => {
  try {
    const response = await apiClient.get(`/${sourceWalletId}/merge-candidates`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy danh sách ví có thể gộp." },
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
 * 👁️ XEM TRƯỚC KẾT QUẢ GỘP VÍ
 * @param {number} targetWalletId - ID của ví đích (ví sẽ nhận)
 * @param {number} sourceWalletId - ID của ví nguồn (ví sẽ bị gộp)
 * @param {string} targetCurrency - Mã tiền tệ đích (VND, USD, etc.)
 * @returns {Promise<Object>} - { preview: Object } hoặc { error: string }
 */
export const previewMerge = async (targetWalletId, sourceWalletId, targetCurrency) => {
  try {
    const response = await apiClient.get(`/${targetWalletId}/merge-preview`, {
      params: {
        sourceWalletId,
        targetCurrency,
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
        data: { error: "Lỗi kết nối đến máy chủ khi xem trước gộp ví." },
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
 * 🔀 GỘP HAI VÍ LẠI VỚI NHAU
 * @param {number} targetWalletId - ID của ví đích (ví sẽ nhận)
 * @param {Object} mergeData - Dữ liệu gộp ví
 * @param {number} mergeData.sourceWalletId - ID của ví nguồn (ví sẽ bị gộp)
 * @param {string} mergeData.targetCurrency - Mã tiền tệ đích (VND, USD, etc.)
 * @returns {Promise<Object>} - { success: boolean, message: string, result: Object } hoặc { error: string }
 */
export const mergeWallets = async (targetWalletId, mergeData) => {
  try {
    console.log("wallet.service: Calling POST /wallets/" + targetWalletId + "/merge với data:", mergeData);
    const response = await apiClient.post(`/${targetWalletId}/merge`, mergeData);
    console.log("wallet.service: POST /wallets/" + targetWalletId + "/merge response:", {
      status: response.status,
      data: response.data
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
        data: { error: "Lỗi kết nối đến máy chủ khi gộp ví." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================== UPDATE WALLET ==========================

/**
 * ✏️ CẬP NHẬT THÔNG TIN VÍ
 * @param {number} walletId - ID của ví
 * @param {Object} updateData - Dữ liệu cập nhật
 * @param {string} [updateData.walletName] - Tên ví mới (optional)
 * @param {string} [updateData.description] - Mô tả ví mới (optional)
 * @param {string} [updateData.currencyCode] - Mã tiền tệ mới (optional)
 * @returns {Promise<Object>} - { message: string, wallet: Object } hoặc { error: string }
 */
export const updateWallet = async (walletId, updateData) => {
  try {
    const response = await apiClient.put(`/${walletId}`, updateData);
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
        data: { error: "Lỗi kết nối đến máy chủ khi cập nhật ví." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================== DELETE WALLET ==========================

/**
 * 🗑️ XÓA VÍ
 * @param {number} walletId - ID của ví
 * @returns {Promise<Object>} - { message: string, deletedWallet: Object } hoặc { error: string }
 */
export const deleteWallet = async (walletId) => {
  try {
    const response = await apiClient.delete(`/${walletId}`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi xóa ví." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

// ========================== TRANSFER MONEY ==========================

/**
 * 💰 LẤY DANH SÁCH VÍ ĐÍCH CÓ THỂ CHUYỂN TIỀN
 * @param {number} walletId - ID của ví nguồn (ví sẽ chuyển tiền)
 * @returns {Promise<Object>} - { sourceWallet: Object, targetWallets: Array, total: number } hoặc { error: string }
 */
export const getTransferTargets = async (walletId) => {
  try {
    const response = await apiClient.get(`/${walletId}/transfer-targets`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy danh sách ví đích." },
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
 * 💸 CHUYỂN TIỀN GIỮA CÁC VÍ
 * @param {Object} transferData - Dữ liệu chuyển tiền
 * @param {number} transferData.fromWalletId - ID của ví nguồn (hoặc sourceWalletId/sourceId)
 * @param {number} transferData.toWalletId - ID của ví đích (hoặc targetWalletId/targetId)
 * @param {number} transferData.amount - Số tiền cần chuyển
 * @param {string} [transferData.note] - Ghi chú giao dịch (optional, hoặc description)
 * @returns {Promise<Object>} - { message: string, transfer: Object } hoặc { error: string }
 */
export const transferMoney = async (transferData) => {
  try {
    // Map từ format linh hoạt sang format API
    const fromWalletId = transferData.fromWalletId || transferData.sourceWalletId || transferData.sourceId;
    const toWalletId = transferData.toWalletId || transferData.targetWalletId || transferData.targetId;
    const note = transferData.note || transferData.description || "";
    
    const apiPayload = {
      fromWalletId,
      toWalletId,
      amount: transferData.amount,
      targetCurrencyCode: transferData.targetCurrencyCode, // Currency của số tiền nhập vào (theo ví gửi)
      note,
    };
    
    console.log("wallet.service: Calling POST /wallets/transfer với data:", apiPayload);
    const response = await apiClient.post("/transfer", apiPayload);
    console.log("wallet.service: POST /wallets/transfer response:", {
      status: response.status,
      data: response.data
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
        data: { error: "Lỗi kết nối đến máy chủ khi chuyển tiền." },
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
 * 🔄 CHUYỂN VÍ CÁ NHÂN THÀNH VÍ NHÓM
 * @param {number} walletId - ID của ví
 * @param {string} walletName - Tên ví (bắt buộc)
 * @returns {Promise<Object>} - { wallet: Object } hoặc { error: string }
 */
export const convertToGroupWallet = async (walletId, walletName) => {
  try {
    if (!walletName || walletName.trim() === "") {
      throw new Error("Tên ví không được để trống");
    }

    console.log(
      "wallet.service: convertToGroupWallet - walletId:",
      walletId,
      "walletName:",
      walletName
    );

    const response = await apiClient.put(`/${walletId}`, {
      walletName: walletName.trim(),
      walletType: "GROUP",
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
        data: { error: "Lỗi kết nối đến máy chủ khi chuyển đổi ví." },
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
 * 📋 LẤY DANH SÁCH TẤT CẢ WALLET TRANSFERS
 * @returns {Promise<Object>} - { transfers: Array } hoặc { error: string }
 */
export const getAllTransfers = async () => {
  try {
    const response = await apiClient.get("/transfers");
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy danh sách chuyển tiền." },
      };
    } else {
      return {
        response: { ok: false, status: 0 },
        data: { error: error.message || "Đã xảy ra lỗi không xác định." },
      };
    }
  }
};

export const getWalletTransfers = async (walletId) => {
  try {
    if (walletId === undefined || walletId === null) {
      throw new Error("walletId is required to fetch wallet transfers");
    }
    const response = await apiClient.get(`/${walletId}/transfers`);
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
        data: { error: "Lỗi kết nối đến máy chủ khi lấy giao dịch chuyển tiền của ví." },
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
 * ✏️ CẬP NHẬT GIAO DỊCH CHUYỂN TIỀN (chỉ ghi chú)
 * @param {number} transferId - ID của giao dịch chuyển tiền
 * @param {string} note - Ghi chú mới
 * @returns {Promise<Object>} - { transfer: Object } hoặc { error: string }
 */
export const updateTransfer = async (transferId, note) => {
  try {
    const id = Number(transferId);
    if (isNaN(id)) {
      throw new Error(`Invalid transfer ID: ${transferId}`);
    }
    console.log(`wallet.service: Calling PUT /wallets/transfers/${id}`);
    
    const response = await apiClient.put(`/transfers/${id}`, {
      note: note || null,
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
        data: { error: "Lỗi kết nối đến máy chủ khi cập nhật giao dịch." },
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
 * 🗑️ XÓA GIAO DỊCH CHUYỂN TIỀN
 * @param {number} transferId - ID của giao dịch chuyển tiền
 * @returns {Promise<Object>} - { message: string } hoặc { error: string }
 */
export const deleteTransfer = async (transferId) => {
  try {
    const id = Number(transferId);
    if (isNaN(id)) {
      throw new Error(`Invalid transfer ID: ${transferId}`);
    }
    console.log(`wallet.service: Calling DELETE /wallets/transfers/${id}`);
    
    const response = await apiClient.delete(`/transfers/${id}`);

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
        data: { error: "Lỗi kết nối đến máy chủ khi xóa giao dịch." },
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

/**
 * Wallet API Object - Wrapper object cho các wallet API functions
 * Sử dụng: import { walletAPI } from './services/wallet.service';
 * 
 * Note: Các function bên trong gọi các function đã export ở trên
 * Sử dụng closure để tránh conflict tên
 */
const createWalletFn = createWallet;
const getMyWalletsFn = getMyWallets;
const getWalletDetailsFn = getWalletDetails;
const setDefaultWalletFn = setDefaultWallet;
const updateWalletFn = updateWallet;
const deleteWalletFn = deleteWallet;
const convertToGroupWalletFn = convertToGroupWallet;
const shareWalletFn = shareWallet;
const getWalletMembersFn = getWalletMembers;
const removeMemberFn = removeMember;
const leaveWalletFn = leaveWallet;
const checkAccessFn = checkAccess;
const getMergeCandidatesFn = getMergeCandidates;
const previewMergeFn = previewMerge;
const mergeWalletsFn = mergeWallets;
const updateMemberRoleFn = updateMemberRole;
const getTransferTargetsFn = getTransferTargets;
const transferMoneyFn = transferMoney;
const getAllTransfersFn = getAllTransfers;
const getWalletTransfersFn = getWalletTransfers;
const updateTransferFn = updateTransfer;
const deleteTransferFn = deleteTransfer;

export const walletAPI = {
  createWallet: async (walletName, currencyCode, description, setAsDefault) => {
    const result = await createWalletFn({
      walletName,
      currencyCode,
      description,
      setAsDefault,
    });
    return result.data || result;
  },
  getWallets: async () => {
    const result = await getMyWalletsFn();
    return result.data || result;
  },
  getWalletDetails: async (walletId) => {
    const result = await getWalletDetailsFn(walletId);
    return result.data || result;
  },
  setDefaultWallet: async (walletId) => {
    const result = await setDefaultWalletFn(walletId);
    return result.data || result;
  },
  updateWallet: async (walletId, updateData) => {
    const result = await updateWalletFn(walletId, updateData);
    return result.data || result;
  },
  deleteWallet: async (walletId) => {
    const result = await deleteWalletFn(walletId);
    return result.data || result;
  },
  convertToGroupWallet: async (walletId, walletName) => {
    const result = await convertToGroupWalletFn(walletId, walletName);
    return result.data || result;
  },
  shareWallet: async (walletId, email) => {
    const result = await shareWalletFn(walletId, email);
    return result.data || result;
  },
  getWalletMembers: async (walletId) => {
    const result = await getWalletMembersFn(walletId);
    return result.data || result;
  },
  // Alias cho getSharedMembers (tương thích với code cũ)
  getSharedMembers: async (walletId) => {
    const result = await getWalletMembersFn(walletId);
    return result.data || result;
  },
  updateMemberRole: async (walletId, memberUserId, role) => {
    const result = await updateMemberRoleFn(walletId, memberUserId, role);
    return result.data || result;
  },
  removeMember: async (walletId, memberUserId) => {
    const result = await removeMemberFn(walletId, memberUserId);
    return result.data || result;
  },
  // Alias cho removeSharedMember (tương thích với code cũ)
  removeSharedMember: async (walletId, memberUserId) => {
    const result = await removeMemberFn(walletId, memberUserId);
    return result.data || result;
  },
  leaveWallet: async (walletId) => {
    const result = await leaveWalletFn(walletId);
    return result.data || result;
  },
  checkAccess: async (walletId) => {
    const result = await checkAccessFn(walletId);
    return result.data || result;
  },
  getMergeCandidates: async (sourceWalletId) => {
    const result = await getMergeCandidatesFn(sourceWalletId);
    return result.data || result;
  },
  previewMerge: async (targetWalletId, sourceWalletId, targetCurrency) => {
    const result = await previewMergeFn(targetWalletId, sourceWalletId, targetCurrency);
    return result.data || result;
  },
  mergeWallets: async (targetWalletId, sourceWalletId, targetCurrency) => {
    const result = await mergeWalletsFn(targetWalletId, {
      sourceWalletId,
      targetCurrency,
    });
    return result.data || result;
  },
  getTransferTargets: async (walletId) => {
    const result = await getTransferTargetsFn(walletId);
    return result.data || result;
  },
  transferMoney: async (fromWalletId, toWalletId, amount, note) => {
    const result = await transferMoneyFn({
      fromWalletId,
      toWalletId,
      amount,
      note,
    });
    return result.data || result;
  },
  getAllTransfers: async () => {
    const result = await getAllTransfersFn();
    return result.data || result;
  },
  getWalletTransfers: async (walletId) => {
    const result = await getWalletTransfersFn(walletId);
    return result.data || result;
  },
  updateTransfer: async (transferId, note) => {
    const result = await updateTransferFn(transferId, note);
    return result.data || result;
  },
  deleteTransfer: async (transferId) => {
    const result = await deleteTransferFn(transferId);
    return result.data || result;
  },
}; 