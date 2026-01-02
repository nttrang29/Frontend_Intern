// src/home/store/FeedbackDataContext.jsx
import React, { createContext, useContext, useState } from "react";

const FeedbackContext = createContext(null);

const INITIAL_REVIEWS = [
  {
    id: 1,
    user: "Nguyễn Văn A",
    email: "user1@example.com",
    rating: 5,
    comment: "Ứng dụng quản lý ví rất tốt, giao diện dễ nhìn.",
    createdAt: "2025-11-12 20:05",
    source: "Feedback trong app",
    adminReply: {
      author: "MyWallet Team",
      message: "Cảm ơn bạn đã tin tưởng sử dụng MyWallet! ❤️",
      date: "2025-11-13 09:10",
    },
  },
  {
    id: 2,
    user: "Trần Thị B",
    email: "user2@example.com",
    rating: 3,
    comment:
      "Muốn xuất báo cáo ra Excel, hiện tại chỉ xem được trong giao diện.",
    createdAt: "2025-11-11 14:12",
    source: "Đánh giá app store",
    adminReply: null,
  },
];

export function FeedbackProvider({ children }) {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);

  // user gửi đánh giá mới
  const addReview = (payload) => {
    const now = new Date();
    const createdAt = now.toISOString().slice(0, 16).replace("T", " ");

    const newReview = {
      id: Date.now(),
      user: payload.user,
      email: payload.email || "user@example.com", // sau này lấy từ tài khoản thật
      rating: payload.rating,
      comment: payload.comment,
      createdAt,
      source: "Feedback trong app",
      adminReply: null,
    };

    setReviews((prev) => [newReview, ...prev]);
    return newReview;
  };

  // admin phản hồi
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
    <FeedbackContext.Provider value={{ reviews, addReview, addAdminReply }}>
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