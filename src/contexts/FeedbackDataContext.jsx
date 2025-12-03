// src/home/store/FeedbackDataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { appReviewAPI } from "../services/app-review.service";

const FeedbackContext = createContext(null);

const normalizeReview = (review) => {
  if (!review) return null;
  return {
    id: review.reviewId ?? review.id,
    reviewId: review.reviewId ?? review.id,
    user: review.displayName ?? review.userName ?? review.user ?? "Người dùng ẩn danh",
    email: review.userEmail ?? review.email ?? "",
    rating: Number(review.rating ?? 0),
    comment: review.content ?? review.comment ?? "",
    createdAt: review.createdAt ?? new Date().toISOString(),
    source: "Feedback trong app",
    status: review.status ?? "PENDING",
    adminReply: review.adminReply
      ? {
          author: "Admin",
          message: review.adminReply,
          date: review.repliedAt ?? review.updatedAt ?? "",
        }
      : null,
  };
};

export function FeedbackProvider({ children }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load app reviews từ API
  const loadFeedbacks = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Lấy review của user hiện tại
      const response = await appReviewAPI.getMyReview();
      if (response.hasReview && response.review) {
        setReviews([normalizeReview(response.review)]);
      } else {
        setReviews([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading app review:", err);
      setReviews([]);
      setError(err?.message || "Không thể tải đánh giá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks();

    const handleUserChange = () => {
      loadFeedbacks();
    };

    const handleStorageChange = (event) => {
      if (
        event.key === "accessToken" ||
        event.key === "auth_user" ||
        event.key === "user"
      ) {
        loadFeedbacks();
      }
    };

    window.addEventListener("userChanged", handleUserChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadFeedbacks]);

  // user gửi đánh giá mới
  const addReview = useCallback(async (payload) => {
    try {
      const response = await appReviewAPI.createReview({
        displayName: payload.user || payload.displayName || "Người dùng ẩn danh",
        rating: Number(payload.rating),
        content: payload.comment || payload.content,
      });

      const newReview = normalizeReview(response?.review || response);
      if (newReview) {
        setReviews([newReview]); // User chỉ có 1 review
        return newReview;
      }
      
      // Fallback: reload
      await loadFeedbacks();
      return null;
    } catch (err) {
      console.error("Error creating review:", err);
      throw err;
    }
  }, [loadFeedbacks]);

  // admin phản hồi (giữ lại cho tương thích, nhưng thực tế admin dùng admin API)
  const addAdminReply = (reviewId, { author = "Admin", message, date }) => {
    const replyDate =
      date || new Date().toISOString().slice(0, 16).replace("T", " ");

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              adminReply: {
                author,
                message,
                date: replyDate,
              },
            }
          : r
      )
    );
  };

  return (
    <FeedbackContext.Provider
      value={{
        reviews,
        loading,
        error,
        addReview,
        addAdminReply,
        refreshFeedbacks: loadFeedbacks,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

// ✅ Hook có check, tránh trả về null im lặng
export function useFeedbackData() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error(
      "useFeedbackData phải được dùng bên trong <FeedbackProvider> (index.jsx)."
    );
  }
  return ctx;
}