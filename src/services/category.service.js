/**
 * Category Service - Service layer cho các API calls liên quan đến categories
 * Base URL: http://localhost:8080/categories
 */

import { apiCall } from "./api-helper";

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

export default categoryAPI;

