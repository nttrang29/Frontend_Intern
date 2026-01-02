// src/components/feedback/FeedbackList.jsx
import React, { useMemo } from "react";
import "../../styles/pages/FeedbackPage.css";
import { formatVietnamDateTime } from "../../utils/dateFormat";

const getDisplayDate = (input) => {
  if (!input) return "Không rõ thời gian";
  const formatted = formatVietnamDateTime(input);
  return formatted || "Không rõ thời gian";
};

export default function FeedbackList({ feedbacks }) {
  const items = useMemo(() => {
    if (!feedbacks?.length) return [];
    return feedbacks.map((fb) => ({
      ...fb,
      displayDate: getDisplayDate(fb.createdAt || fb.date),
      adminDisplayDate: fb.adminReply?.date ? getDisplayDate(fb.adminReply.date) : "",
    }));
  }, [feedbacks]);

  if (!items.length) {
    return (
      <div className="feedback-empty">
        Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận của bạn! 📝
      </div>
    );
  }

  return (
    <div className="feedback-list">
      {items.map((fb) => (
        <article key={fb.id} className="feedback-item">
          <header className="feedback-item-header">
            <div className="feedback-item-user">
              <div className="feedback-avatar">
                {fb.user.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="feedback-username">{fb.user}</div>
                <div className="feedback-date">
                  {fb.displayDate}
                </div>
              </div>
            </div>

            <div className="feedback-item-rating">
              {Array.from({ length: 5 }).map((_, idx) => {
                const starIndex = idx + 1;
                const filled = starIndex <= (fb.rating || 0);
                return (
                  <span
                    key={idx}
                    className={
                      "fb-star fb-star--small " +
                      (filled ? "fb-star--filled" : "")
                    }
                  >
                    ★
                  </span>
                );
              })}
              <span className="feedback-item-rating-number">
                {fb.rating?.toFixed ? fb.rating.toFixed(1) : fb.rating}/5
              </span>
            </div>
          </header>

          <p className="feedback-comment">{fb.comment}</p>

          {/* Phản hồi admin nếu có */}
          {fb.adminReply && (
            <div className="feedback-admin-reply">
              <div className="feedback-admin-tag">Phản hồi từ admin</div>
              <p className="feedback-admin-message">{fb.adminReply.message}</p>
              <div className="feedback-admin-meta">
                {fb.adminReply.author} • {fb.adminDisplayDate}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}