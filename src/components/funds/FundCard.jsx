// src/components/funds/FundCard.jsx
import React from "react";
import { formatMoney } from "../../utils/formatMoney";
import "../../styles/components/funds/FundCard.css";

export default function FundCard({ fund, onClick }) {
  const { name, current, target, currency } = fund;
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="fund-card" onClick={onClick}>
      <div className="fund-card__top">
        <div className="fund-card__title">{name}</div>
        <div className="fund-card__amount">
          {formatMoney(current, currency || "VND")}
          {target && (
            <span className="fund-card__target">
              {" "}
              / {formatMoney(target, currency || "VND")}
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
