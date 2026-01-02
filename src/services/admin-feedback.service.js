/**
 * Admin Feedback Service - Gọi các Admin Feedback APIs
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

export const adminFeedbackAPI = {
  /**
   * Admin - Lấy tất cả feedback
   * @param {object} params - { status, type }
   * status: PENDING, REVIEWED, RESOLVED, CLOSED
   * type: FEEDBACK, BUG, FEATURE, OTHER
   */
  getAllFeedbacks: async (params = {}) => {
    const query = buildQuery(params);
    return apiCall(`/admin/feedbacks${query}`);
  },

  /**
   * Admin - Lấy chi tiết feedback
   */
  getFeedbackById: async (feedbackId) => {
    if (!feedbackId && feedbackId !== 0) {
      throw new Error("feedbackId is required");
    }
    return apiCall(`/admin/feedbacks/${feedbackId}`);
  },

  /**
   * Admin - Cập nhật trạng thái feedback
   * @param {number} feedbackId
   * @param {string} status - PENDING, REVIEWED, RESOLVED, CLOSED
   */
  updateFeedbackStatus: async (feedbackId, status) => {
    if (!feedbackId && feedbackId !== 0) {
      throw new Error("feedbackId is required");
    }
    if (!status) {
      throw new Error("status is required");
    }
    return apiCall(`/admin/feedbacks/${feedbackId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Admin - Thêm phản hồi cho user
   */
  addAdminResponse: async (feedbackId, adminResponse) => {
    if (!feedbackId && feedbackId !== 0) {
      throw new Error("feedbackId is required");
    }
    if (!adminResponse) {
      throw new Error("adminResponse is required");
    }
    return apiCall(`/admin/feedbacks/${feedbackId}/response`, {
      method: "PUT",
      body: JSON.stringify({ adminResponse }),
    });
  },

  /**
   * Admin - Lấy thống kê feedback
   */
  getFeedbackStats: async () => {
    return apiCall("/admin/feedbacks/stats");
  },
};

export default adminFeedbackAPI;

