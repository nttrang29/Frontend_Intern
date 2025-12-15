// src/components/funds/FundCard.jsx
import React from "react";
import { formatMoney } from "../../utils/formatMoney";
import "../../styles/components/funds/FundCard.css";

export default function FundCard({ fund, onClick }) {
  const { name, current, target, currency, autoDepositEnabled } = fund;
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isAutoDeposit = autoDepositEnabled || false;

  return (
    <div className="fund-card" onClick={onClick}>
      <div className="fund-card__top">
        <div className="fund-card__header-row">
          <div className="fund-card__title">{name}</div>
          <div className={`fund-card__deposit-badge ${isAutoDeposit ? 'fund-card__deposit-badge--auto' : 'fund-card__deposit-badge--manual'}`}>
            <i className={`bi ${isAutoDeposit ? 'bi-arrow-repeat' : 'bi-wallet2'}`}></i>
            <span>{isAutoDeposit ? 'Tự động' : 'Thủ công'}</span>
          </div>
        </div>
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
