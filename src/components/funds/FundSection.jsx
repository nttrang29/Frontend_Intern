// src/components/funds/FundSection.jsx
import React from "react";
import FundCard from "./FundCard";
import "../../styles/components/funds/FundSection.css";

export default function FundSection({ title, subtitle, items, onSelectFund }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="fund-section card border-0 shadow-sm mb-3">
      <div className="fund-section__header">
        <div>
          <h5 className="mb-1">{title}</h5>
          {subtitle && <p className="mb-0 text-muted small">{subtitle}</p>}
        </div>
        <span className="badge bg-light text-dark">{items.length} quỹ</span>
      </div>
      <div className="fund-section__grid">
        {items.map((f) => (
          <FundCard
            key={f.id}
            fund={f}
            onClick={onSelectFund ? () => onSelectFund(f) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
