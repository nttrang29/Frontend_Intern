/**
 * Transaction Service - Service layer cho các API calls liên quan đến transactions
 * Base URL: http://localhost:8080/transactions
 */

import { apiCall } from "./api-helper";

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
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
   * Lấy toàn bộ giao dịch của một ví, bao gồm giao dịch do thành viên khác tạo
   * @param {number|string} walletId
   * @param {object} [options]
   */
  getWalletTransactions: async (walletId, options = {}) => {
    if (!walletId && walletId !== 0) {
      throw new Error("walletId is required to fetch wallet transactions");
    }
    const query = buildQuery(options);
    return apiCall(`/wallets/${walletId}/transactions${query}`);
  },

  // Alias để tương thích với các đoạn code cũ
  getTransactionsByWallet: async (walletId, options = {}) => {
    return transactionAPI.getWalletTransactions(walletId, options);
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
   * Cập nhật giao dịch (category, note, imageUrl, amount)
   * @param {number} transactionId
   * @param {number} categoryId
   * @param {number} amount
   * @param {string} note
   * @param {string} imageUrl
   */
  updateTransaction: async (transactionId, categoryId, amount, note, imageUrl) => {
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
        amount: Number(amount),
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

export default transactionAPI;

