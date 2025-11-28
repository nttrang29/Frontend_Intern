// src/components/transactions/TransactionFilters.jsx
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function TransactionFilters({
  activeTab,
  searchText,
  onSearchChange,
  toDateTime,
  onToDateTimeChange,
  onClearFilters,
}) {
  const { t } = useLanguage();

  return (
    <div className="tx-filters card border-0 mb-3">
      <div className="card-body d-flex flex-column gap-2">
        <div className="d-flex flex-wrap gap-2">
          <div className="tx-filter-item flex-grow-1">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                className="form-control border-start-0"
                placeholder={t("transactions.filter.search_placeholder")}
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="tx-filter-item d-flex align-items-center gap-1">
            <span className="text-muted small px-1">{t("transactions.filter.to")}</span>
            <input
              type="datetime-local"
              className="form-control"
              value={toDateTime}
              onChange={(e) => onToDateTimeChange(e.target.value)}
            />
          </div>

          <div className="ms-auto">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={onClearFilters}
            >
              <i className="bi bi-x-circle me-1" />
              {t("transactions.btn.clear")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

