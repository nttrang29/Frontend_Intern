/**
 * App Review Service - Gọi các App Review APIs (Đánh giá ứng dụng)
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

export const appReviewAPI = {
  /**
   * Gửi đánh giá ứng dụng
   * @param {object} reviewData - { displayName, rating, content }
   */
  createReview: async (reviewData) => {
    if (!reviewData || !reviewData.rating) {
      throw new Error("rating is required to create review");
    }
    if (!reviewData.content) {
      throw new Error("content is required to create review");
    }
    return apiCall("/app-reviews", {
      method: "POST",
      body: JSON.stringify({
        displayName: reviewData.displayName || undefined,
        rating: Number(reviewData.rating),
        content: reviewData.content,
      }),
    });
  },

  /**
   * Lấy đánh giá của user hiện tại
   */
  getMyReview: async () => {
    return apiCall("/app-reviews/my-review");
  },

  /**
   * Lấy thống kê đánh giá (public)
   */
  getStats: async () => {
    return apiCall("/app-reviews/stats");
  },
};

// Admin APIs
export const adminAppReviewAPI = {
  /**
   * Admin - Lấy tất cả đánh giá
   * @param {object} params - { status }
   * status: PENDING, ANSWERED
   */
  getAllReviews: async (params = {}) => {
    const query = buildQuery(params);
    return apiCall(`/admin/app-reviews${query}`);
  },

  /**
   * Admin - Lấy chi tiết một đánh giá
   */
  getReviewById: async (reviewId) => {
    if (!reviewId && reviewId !== 0) {
      throw new Error("reviewId is required");
    }
    return apiCall(`/admin/app-reviews/${reviewId}`);
  },

  /**
   * Admin - Phản hồi đánh giá
   */
  replyToReview: async (reviewId, adminReply) => {
    if (!reviewId && reviewId !== 0) {
      throw new Error("reviewId is required");
    }
    if (!adminReply) {
      throw new Error("adminReply is required");
    }
    return apiCall(`/admin/app-reviews/${reviewId}/reply`, {
      method: "PUT",
      body: JSON.stringify({ adminReply }),
    });
  },

  /**
   * Admin - Xóa đánh giá
   */
  deleteReview: async (reviewId) => {
    if (!reviewId && reviewId !== 0) {
      throw new Error("reviewId is required");
    }
    return apiCall(`/admin/app-reviews/${reviewId}`, {
      method: "DELETE",
    });
  },

  /**
   * Admin - Lấy thống kê đánh giá
   */
  getStats: async () => {
    return apiCall("/admin/app-reviews/stats");
  },
};

export default appReviewAPI;

