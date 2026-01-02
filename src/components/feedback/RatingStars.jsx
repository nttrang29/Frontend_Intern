// src/components/feedback/RatingStars.jsx
import React, { useState } from "react";
import "../../styles/pages/FeedbackPage.css";


export default function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(0);

  const handleClick = (star) => {
    onChange?.(star);
  };

  return (
    <div className="fb-rating-stars">
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= (hover || value || 0);
        return (
          <button
            key={idx}
            type="button"
            className={
              "fb-star-btn " + (isFilled ? "fb-star-btn--filled" : "")
            }
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}