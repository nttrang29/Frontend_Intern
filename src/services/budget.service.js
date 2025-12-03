/**
 * Budget Service - Gọi các Budget APIs theo tài liệu backend
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

export const budgetAPI = {
  /**
   * Lấy tất cả ngân sách của user
   */
  getBudgets: async (params = {}) => {
    const query = buildQuery(params);
    return apiCall(`/budgets${query}`);
  },

  /**
   * Lấy chi tiết một ngân sách
   */
  getBudget: async (budgetId) => {
    if (!budgetId && budgetId !== 0) {
      throw new Error("budgetId is required");
    }
    return apiCall(`/budgets/${budgetId}`);
  },

  /**
   * Tạo ngân sách mới
   */
  createBudget: async (budgetData) => {
    if (!budgetData || !budgetData.categoryId) {
      throw new Error("categoryId is required to create budget");
    }
    if (budgetData.amountLimit === undefined && budgetData.limitAmount === undefined) {
      throw new Error("amountLimit is required to create budget");
    }
    return apiCall("/budgets/create", {
      method: "POST",
      body: JSON.stringify(budgetData),
    });
  },

  /**
   * Cập nhật ngân sách
   */
  updateBudget: async (budgetId, budgetData = {}) => {
    if (!budgetId && budgetId !== 0) {
      throw new Error("budgetId is required for update");
    }
    return apiCall(`/budgets/${budgetId}`, {
      method: "PUT",
      body: JSON.stringify(budgetData),
    });
  },

  /**
   * Xóa ngân sách
   */
  deleteBudget: async (budgetId) => {
    if (!budgetId && budgetId !== 0) {
      throw new Error("budgetId is required for delete");
    }
    return apiCall(`/budgets/${budgetId}`, {
      method: "DELETE",
    });
  },

  /**
   * Lấy danh sách giao dịch thuộc một ngân sách
   */
  getBudgetTransactions: async (budgetId) => {
    if (!budgetId && budgetId !== 0) {
      throw new Error("budgetId is required");
    }
    return apiCall(`/budgets/${budgetId}/transactions`);
  },
};

export default budgetAPI;

