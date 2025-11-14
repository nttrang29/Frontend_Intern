// src/components/funds/FundCard.jsx
import React from "react";

export default function FundCard({ fund, onClick }) {
  const { name, current, target, currency } = fund;
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="fund-card" onClick={onClick}>
      <div className="fund-card__top">
        <div className="fund-card__title">{name}</div>
        <div className="fund-card__amount">
          {current.toLocaleString("vi-VN")} {currency}
          {target && (
            <span className="fund-card__target">
              {" "}
              / {target.toLocaleString("vi-VN")} {currency}
            </span>
          )}
        </div>
      </div>
      {target && (
        <div className="fund-card__progress">
          <div className="fund-card__progress-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="fund-card__progress-text">{pct}% hoàn thành</div>
        </div>
      )}
    </div>
  );
}
