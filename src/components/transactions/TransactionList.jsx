// src/components/transactions/TransactionList.jsx
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../hooks/useCurrency";
import "../../styles/components/transactions/TransactionList.css";

const PAGE_SIZE = 10;

function toDateObj(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatVietnamDate(date) {
  if (!date) return "";
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    return "";
  }
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatVietnamTime(date) {
  if (!date) return "";
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    return "";
  }
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatVietnamDateTime(date) {
  if (!date) return "";
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    return "";
  }
  if (Number.isNaN(d.getTime())) return "";
  const dateStr = d.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

export default function TransactionList({
  transactions,
  activeTab,
  loading,
  currentPage,
  totalPages,
  paginationRange,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  filterType,
  onFilterTypeChange,
  searchText,
  onSearchChange,
  fromDateTime,
  onFromDateTimeChange,
  toDateTime,
  onToDateTimeChange,
  currencyFilter,
  onCurrencyFilterChange,
  expanded,
  onToggleExpand,
}) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  // Format số tiền chỉ hiển thị số (không có ký hiệu tiền tệ)
  // Hiển thị với độ chính xác cao (tối đa 8 chữ số thập phân) để khớp với formatMoney trong modal
  const formatAmountOnly = (amount, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    
    // Format tương tự formatMoney nhưng không có ký hiệu tiền tệ
    if (currency === "USD") {
      // Nếu số tiền rất nhỏ (< 0.01), hiển thị nhiều chữ số thập phân hơn
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        return numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
      }
      return numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    }
    
    // Format cho VND và các currency khác
    if (currency === "VND") {
      // VND: hiển thị số thập phân nếu có (khi chuyển đổi từ currency khác)
      const hasDecimal = numAmount % 1 !== 0;
      if (hasDecimal) {
        return numAmount.toLocaleString("vi-VN", { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 8 
        });
      }
      return numAmount.toLocaleString("vi-VN");
    }
    
    // Với các currency khác, cũng hiển thị tối đa 8 chữ số thập phân để chính xác
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    }
    return numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return transactions.slice(start, start + PAGE_SIZE);
  }, [transactions, currentPage]);

  if (loading) {
    return (
      <div className="card border-0 shadow-sm tx-table-card">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2 text-muted">{t("transactions.loading.list")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm tx-table-card">
      {/* Tiêu đề */}
      <div className="card-header transaction-history-header">
        <h5 className="mb-0">{t("transactions.history.title")}</h5>
        {onToggleExpand && (
          <button
            type="button"
            className="btn-expand-header"
            onClick={onToggleExpand}
            title={expanded ? t("transactions.btn.collapse") : t("transactions.btn.expand")}
          >
            <i className={`bi ${expanded ? "bi-arrows-angle-contract" : "bi-arrows-angle-expand"}`} />
          </button>
        )}
      </div>
      {/* Header với filters và tabs */}
      <div className="card-header bg-transparent border-bottom">
        <div className="d-flex flex-column gap-3">
          {/* Tabs cho Loại giao dịch - chỉ hiện khi activeTab === "external" */}
          {activeTab === "external" && filterType !== undefined && onFilterTypeChange && (
            <div className="transaction-type-tabs">
              <button
                type="button"
                className={`transaction-type-tab ${filterType === "all" ? "active" : ""}`}
                onClick={() => onFilterTypeChange("all")}
              >
                {t("transactions.filter.type_all")}
              </button>
              <button
                type="button"
                className={`transaction-type-tab ${filterType === "income" ? "active" : ""}`}
                onClick={() => onFilterTypeChange("income")}
              >
                {t("transactions.type.income")}
              </button>
              <button
                type="button"
                className={`transaction-type-tab ${filterType === "expense" ? "active" : ""}`}
                onClick={() => onFilterTypeChange("expense")}
              >
                {t("transactions.type.expense")}
              </button>
            </div>
          )}

          {/* Filters: Search, Currency */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="tx-filter-item flex-grow-1">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <div className="tx-search-input-wrapper" style={{ position: "relative", flex: 1 }}>
                  <input
                    className="form-control border-start-0"
                    placeholder={t("transactions.filter.search_placeholder")}
                    value={searchText || ""}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    style={{ paddingRight: searchText && searchText.trim() ? "34px" : "12px" }}
                  />
                  {searchText && searchText.trim() && (
                    <button
                      type="button"
                      className="tx-search-clear-btn"
                      onClick={() => onSearchChange?.("")}
                      title={t("transactions.btn.clear")}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="tx-filter-item">
              <select
                className="form-select"
                value={currencyFilter || "all"}
                onChange={(e) => onCurrencyFilterChange?.(e.target.value)}
              >
                <option value="all">{t("transactions.filter.currency_all")}</option>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* From và To Date - cùng một hàng */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="tx-filter-item d-flex align-items-center gap-1">
              <span className="text-muted small px-1">{t("transactions.filter.from")}</span>
              <input
                type="datetime-local"
                className="form-control"
                value={fromDateTime || ""}
                onChange={(e) => onFromDateTimeChange?.(e.target.value)}
              />
            </div>

            <div className="tx-filter-item d-flex align-items-center gap-1">
              <span className="text-muted small px-1">{t("transactions.filter.to")}</span>
              <input
                type="datetime-local"
                className="form-control"
                value={toDateTime || ""}
                onChange={(e) => onToDateTimeChange?.(e.target.value)}
              />
            </div>

            {/* Nút X để xóa từ và đến */}
            {(fromDateTime || toDateTime) && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm tx-clear-filters-btn"
                onClick={() => {
                  onFromDateTimeChange?.("");
                  onToDateTimeChange?.("");
                }}
                title={t("transactions.filter.clear")}
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="table-responsive">
        {activeTab === "external" ? (
          <table className="table table-hover align-middle mb-0 tx-table-external">
            <thead>
              <tr>
                <th style={{ width: 60 }}>{t("transactions.table.no")}</th>
                <th>{t("transactions.table.wallet") || "Ví"}</th>
                <th>{t("transactions.table.time")}</th>
                <th>{t("transactions.table.type")}</th>
                <th className="tx-note-col">{t("transactions.table.note")}</th>
                <th className="text-end">{t("transactions.table.amount")}</th>
                <th>{t("transactions.table.currency")}</th>
                <th className="text-center">{t("transactions.table.action")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    {t("transactions.table.empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((tx, i) => {
                  const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const d = toDateObj(tx.date);
                  const dateTimeStr = formatVietnamDateTime(d);

                  return (
                    <tr 
                      key={tx.id}
                      onClick={() => onView(tx)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="text-muted">{serial}</td>
                      <td className="fw-medium">{tx.walletName || "-"}</td>
                      <td className="fw-medium">{dateTimeStr}</td>
                      <td>
                        <span 
                          className={`badge ${tx.type === "income" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`} 
                          style={{ 
                            fontSize: "0.75rem", 
                            padding: "4px 8px", 
                            borderRadius: "6px",
                            backgroundColor: tx.type === "income" ? "#d1fae5" : "#fee2e2",
                            color: tx.type === "income" ? "#059669" : "#dc2626"
                          }}
                        >
                          {tx.type === "income" ? t("transactions.type.income") : t("transactions.type.expense")}
                        </span>
                      </td>
                      <td className="tx-note-cell" title={tx.note || "-"}>{tx.note || "-"}</td>
                      <td className="text-end">
                        <span 
                          className={tx.type === "expense" ? "tx-amount-expense" : "tx-amount-income"}
                          style={{ 
                            color: tx.type === "expense" ? "#dc2626" : "#16a34a",
                            fontWeight: "600",
                            fontSize: "0.95rem"
                          }}
                        >
                          {tx.type === "expense" ? "-" : "+"}{formatAmountOnly(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark" style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "6px", fontWeight: "500" }}>
                          {tx.currency || "VND"}
                        </span>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="tx-action-buttons">
                          <button className="btn btn-link btn-sm text-muted" title={t("transactions.action.edit")} onClick={() => onEdit(tx)}>
                            <i className="bi bi-pencil-square" />
                          </button>
                          <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => onDelete(tx)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="table table-hover align-middle mb-0 tx-table-internal">
            <thead>
              <tr>
                <th style={{ width: 60 }}>{t("transactions.table.no")}</th>
                <th>{t("transactions.table.time")}</th>
                <th>{t("transactions.table.source_wallet")}</th>
                <th>{t("transactions.table.target_wallet")}</th>
                <th className="tx-note-col">{t("transactions.table.note")}</th>
                <th className="text-end">{t("transactions.table.amount")}</th>
                <th>{t("transactions.table.currency")}</th>
                <th className="text-center">{t("transactions.table.action")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    {t("transactions.table.empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((tx, i) => {
                  const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const d = toDateObj(tx.date);
                  const dateTimeStr = formatVietnamDateTime(d);

                  return (
                    <tr 
                      key={tx.id}
                      onClick={() => onView(tx)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="text-muted">{serial}</td>
                      <td className="fw-medium">{dateTimeStr}</td>
                      <td className="fw-medium">{tx.sourceWallet}</td>
                      <td className="fw-medium">{tx.targetWallet}</td>
                      <td className="tx-note-cell" title={tx.note || "-"}>{tx.note || "-"}</td>
                      <td className="text-end">
                        <span 
                          className="tx-amount-transfer"
                          style={{ 
                            color: "#0ea5e9",
                            fontWeight: "600",
                            fontSize: "0.95rem"
                          }}
                        >
                          {formatAmountOnly(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark" style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "6px", fontWeight: "500" }}>
                          {tx.currency || "VND"}
                        </span>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="tx-action-buttons">
                          <button className="btn btn-link btn-sm text-muted" title={t("transactions.action.edit")} onClick={() => onEdit(tx)}>
                            <i className="bi bi-pencil-square" />
                          </button>
                          <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => onDelete(tx)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
        <span className="text-muted small">
          Trang {currentPage}/{totalPages}
        </span>
        <div className="tx-pagination">
          <button
            type="button"
            className="page-arrow"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
          >
            «
          </button>
          <button
            type="button"
            className="page-arrow"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </button>
          {paginationRange.map((item, idx) =>
            typeof item === "string" && item.includes("ellipsis") ? (
              <span key={`${item}-${idx}`} className="page-ellipsis">…</span>
            ) : (
              <button
                key={`tx-page-${item}`}
                type="button"
                className={`page-number ${currentPage === item ? "active" : ""}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className="page-arrow"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </button>
          <button
            type="button"
            className="page-arrow"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

