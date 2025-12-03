/**
 * Feedback Service - Gọi các Feedback APIs theo tài liệu backend
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

export const feedbackAPI = {
  /**
   * Gửi phản hồi/báo lỗi
   * @param {object} feedbackData - { type, subject, message, contactEmail }
   * type: FEEDBACK, BUG, FEATURE, OTHER
   */
  createFeedback: async (feedbackData) => {
    if (!feedbackData || !feedbackData.type) {
      throw new Error("type is required to create feedback");
    }
    if (!feedbackData.subject) {
      throw new Error("subject is required to create feedback");
    }
    if (!feedbackData.message) {
      throw new Error("message is required to create feedback");
    }
    return apiCall("/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: feedbackData.type,
        subject: feedbackData.subject,
        message: feedbackData.message,
        contactEmail: feedbackData.contactEmail || undefined,
      }),
    });
  },

  /**
   * Lấy danh sách phản hồi của user
   */
  getFeedbacks: async (params = {}) => {
    const query = buildQuery(params);
    return apiCall(`/feedback${query}`);
  },

  /**
   * Lấy chi tiết một phản hồi
   */
  getFeedback: async (feedbackId) => {
    if (!feedbackId && feedbackId !== 0) {
      throw new Error("feedbackId is required");
    }
    return apiCall(`/feedback/${feedbackId}`);
  },
};

export default feedbackAPI;

