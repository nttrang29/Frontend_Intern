import React, { useMemo, useState, useEffect } from "react";
import FeedbackList from "../../components/feedback/FeedbackList";
import FeedbackForm from "../../components/feedback/FeedbackForm";
import "../../styles/pages/FeedbackPage.css";

import { useFeedbackData } from "../../contexts/FeedbackDataContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useToast } from "../../components/common/Toast/ToastContext";

import { useLocation } from "react-router-dom";

export default function FeedbackPage() {
  const { reviews, addReview } = useFeedbackData();
  const { pushNotification } = useNotifications();
  const { showToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const location = useLocation();
  const focusReviewId = location.state?.focusReviewId || null;

  // Tóm tắt
  const summary = useMemo(() => {
    if (!reviews.length)
      return { avg: 0, total: 0, repliedCount: 0 };

    const total = reviews.length;
    const avg =
      reviews.reduce((sum, fb) => sum + (fb.rating ?? 0), 0) / total;
    const repliedCount = reviews.filter((fb) => fb.adminReply).length;

    return {
      avg: Number(avg.toFixed(1)),
      total,
      repliedCount,
    };
  }, [reviews]);

  const handleAddFeedback = (payload) => {
    // 1) thêm vào store chung
    const newReview = addReview(payload);

    // 2) toast cho user
    showToast("Gửi đánh giá thành công!");

    // 3) đóng form
    setShowForm(false);

    // 4) bắn thông báo cho ADMIN
    pushNotification({
      role: "admin",
      type: "user_feedback",
      reviewId: newReview.id,
      title: `Đánh giá mới từ ${newReview.user}`,
      desc:
        newReview.comment.length > 60
          ? newReview.comment.slice(0, 60) + "..."
          : newReview.comment,
      timeLabel: "Vừa xong",
    });

    // 5) scroll tới feedback mới
    setTimeout(() => {
      const el = document.getElementById("feedback-" + newReview.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  // Auto scroll khi đi từ thông báo admin → feedback
  useEffect(() => {
    if (focusReviewId) {
      setTimeout(() => {
        const el = document.getElementById("feedback-" + focusReviewId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
    }
  }, [focusReviewId]);

  return (
    <div className="feedback-page tx-page container-fluid py-4">
      <div className="tx-page-inner">
      {/* Khối tổng quan */}
      <section className="feedback-summary-card">
        <div className="feedback-summary-header">
          <div>
            <h2 className="feedback-summary-title">
              Đánh giá ứng dụng
            </h2>
            <p className="feedback-summary-subtitle">
              Góp ý của bạn giúp MyWallet tốt hơn mỗi ngày.
            </p>
          </div>

          <button
            className="feedback-primary-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Đóng form đánh giá" : "Viết đánh giá"}
          </button>
        </div>

        <div className="feedback-summary-body">
          <div className="feedback-summary-left">
            <div className="feedback-summary-score">
              <span className="feedback-summary-score-number">
                {summary.avg.toFixed(1)}
              </span>
              <span className="feedback-summary-score-max">
                / 5
              </span>
            </div>
            <div className="feedback-summary-text">
              Dựa trên <strong>{summary.total}</strong> lượt
              đánh giá. Admin đã phản hồi{" "}
              <strong>{summary.repliedCount}</strong> đánh giá.
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section
        className={
          "feedback-form-wrapper " +
          (showForm ? "feedback-form--visible" : "")
        }
      >
        {showForm && <FeedbackForm onSubmit={handleAddFeedback} />}
      </section>

      {/* Danh sách */}
      <section className="feedback-list-wrapper">
        <FeedbackList
          feedbacks={reviews}
          focusReviewId={focusReviewId}
        />
      </section>
      </div>
    </div>
  );
}