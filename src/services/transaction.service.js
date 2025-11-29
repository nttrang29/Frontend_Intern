/**
 * Transaction Service - Service layer cho các API calls liên quan đến transactions
 * Base URL: http://localhost:8080/transactions
 */

import { apiCall } from "./api-helper";

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

export default transactionAPI;

