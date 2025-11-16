// src/components/funds/FundCard.jsx
import React from "react";

export default function FundCard({ fund, onClick }) {
  const {
    name,
    current,
    target,
    currency,
    type,
    startDate,
    endDate,
    members,
  } = fund;

  const hasTarget = !!target && target > 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((current / target) * 100))
    : 0;

  const isGroup = type === "group";
  const memberCount = Array.isArray(members) ? members.length : 0;

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN");
  };

  const timeLabel =
    startDate || endDate
      ? `${formatDate(startDate)}${endDate ? " - " + formatDate(endDate) : ""}`
      : "";

  return (
    <div className="fund-card" onClick={onClick}>
      <div className="fund-card__top">
        <div className="fund-card__title-row">
          <div className="fund-card__title">{name}</div>

          {isGroup && (
            <span className="fund-card__badge">
              {memberCount} người tham gia
            </span>
          )}
        </div>

        <div className="fund-card__amount">
          {current.toLocaleString("vi-VN")} {currency}
          {hasTarget && (
            <span className="fund-card__target">
              {" "}
              / {target.toLocaleString("vi-VN")} {currency}
            </span>
          )}
        </div>

        {timeLabel && <div className="fund-card__time">{timeLabel}</div>}
      </div>

      {hasTarget && (
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
