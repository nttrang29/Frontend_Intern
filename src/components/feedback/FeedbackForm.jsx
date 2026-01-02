// src/components/feedback/FeedbackForm.jsx
import React, { useState } from "react";
import RatingStars from "./RatingStars";

export default function FeedbackForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const payload = {
      user: name.trim() || "Người dùng ẩn danh",
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    };

    onSubmit?.(payload);
    setName("");
    setRating(5);
    setComment("");
  };

  return (
    <div className="feedback-form-card">
      <h3 className="feedback-form-title">Viết đánh giá của bạn</h3>
      <p className="feedback-form-subtitle">
        Chia sẻ trải nghiệm của bạn với MyWallet.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="fb-form-group">
          <label className="fb-label">Tên hiển thị (không bắt buộc)</label>
          <input
            type="text"
            className="fb-input"
            placeholder="VD: Nguyễn Văn A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="fb-form-group">
          <label className="fb-label">Mức độ hài lòng</label>
          <RatingStars value={rating} onChange={setRating} />
        </div>

        <div className="fb-form-group">
          <label className="fb-label">Nội dung đánh giá</label>
          <textarea
            className="fb-textarea"
            rows={4}
            placeholder="Hãy chia sẻ cảm nhận của bạn về ứng dụng..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </div>

        <div className="fb-form-actions">
          <button type="submit" className="feedback-primary-btn">
            Gửi đánh giá
          </button>
        </div>
      </form>
    </div>
  );
}