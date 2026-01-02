// src/components/transactions/TransactionList.jsx
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../hooks/useCurrency";
import { formatVietnamDateTime } from "../../utils/dateFormat";
import "../../styles/components/transactions/TransactionList.css";

const PAGE_SIZE = 10;

function toDateObj(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
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
  expanded,
  onToggleExpand,
}) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  // Format số tiền chỉ hiển thị số (không có ký hiệu tiền tệ)
  // Hiển thị với độ chính xác cao (tối đa 8 chữ số thập phân) để khớp với formatMoney trong modal
  const formatAmountOnly = (amount) => {
    const numAmount = Number(amount) || 0;
    const hasDecimal = numAmount % 1 !== 0;
    return numAmount.toLocaleString("vi-VN", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: hasDecimal ? 8 : 0 
    });
  };

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return transactions.slice(start, start + PAGE_SIZE);
  }, [transactions, currentPage]);

  // Kiểm tra xem có transaction nào không phải viewer/deleted/left không
  // Nếu tất cả đều là viewer/deleted/left thì ẩn hoàn toàn cột hành động
  // QUAN TRỌNG: Kiểm tra trên toàn bộ transactions list, không chỉ paginated
  const hasActionableTransactions = React.useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return false;
    }
    const hasActionable = transactions.some(tx => {
      const isActionable = !tx.isWalletDeleted && !tx.isLeftWallet && !tx.isViewerWallet;
      return isActionable;
    });
    return hasActionable;
  }, [transactions]);

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
        {onToggleExpand && activeTab !== "fund" && (
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
          {/* Tabs cho Loại giao dịch - chỉ hiện khi activeTab === "external" hoặc "group_external" (không hiện ở tab fund) */}
          {(activeTab === "external" || activeTab === "group_external") && filterType !== undefined && onFilterTypeChange && (
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
         {(activeTab === "external" || activeTab === "group_external" || activeTab === "fund") ? (
          <table className="table table-hover align-middle mb-0 tx-table-external">
            <thead>
              <tr>
                <th style={{ width: "60px", whiteSpace: "nowrap" }}>{t("transactions.table.no")}</th>
                {activeTab === "fund" ? (
                  <>
                    <th style={{ width: "100px", whiteSpace: "nowrap" }}>Quỹ</th>
                    <th style={{ width: "120px", whiteSpace: "nowrap" }}>Ví</th>
                  </>
                ) : (
                  <th style={{ whiteSpace: "nowrap" }}>{t("transactions.table.wallet") || "Ví"}</th>
                )}
                <th style={{ width: "140px", whiteSpace: "nowrap" }}>{t("transactions.table.time")}</th>
                <th style={{ width: "100px", whiteSpace: "nowrap" }}>{t("transactions.table.type")}</th>
                <th className={activeTab === "fund" ? "" : "tx-note-col"} style={activeTab === "fund" ? { width: "140px", whiteSpace: "nowrap" } : { whiteSpace: "nowrap" }}>{t("transactions.table.category") || "Danh mục"}</th>
                <th className="text-end" style={activeTab === "fund" ? { width: "200px", whiteSpace: "nowrap" } : { width: "150px", whiteSpace: "nowrap" }}>{t("transactions.table.amount")}</th>
                {activeTab !== "fund" && (
                  <th className="text-center" style={{ width: "100px", whiteSpace: "nowrap" }}>{t("transactions.table.action")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "fund" ? 7 : 7} className="text-center text-muted py-4">
                    {t("transactions.table.empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((tx, i) => {
                  const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const d = toDateObj(tx.date);
                  const dateTimeStr = formatVietnamDateTime(d);
                  
                  // Kiểm tra xem transaction này có thể thực hiện hành động không
                  // Fund transactions không thể edit/delete
                  // Giao dịch đã xóa mềm (isDeleted) cũng không thể edit/delete
                  const canPerformAction = !tx.isDeleted && !tx.isFundTransaction && !tx.isWalletDeleted && !tx.isLeftWallet && !tx.isViewerWallet;

                  return (
                    <tr 
                      key={tx.id}
                      onClick={() => onView(tx)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                        {serial}
                        {tx.isDeleted ? (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontWeight: "bold", fontStyle: "normal" }}>
                            (đã xoá)
                          </span>
                        ) : tx.isEdited && (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontWeight: "bold", fontStyle: "normal" }}>
                            (đã sửa)
                          </span>
                        )}
                      </td>
                      {activeTab === "fund" ? (
                        <>
                          <td className="fw-medium" style={{ whiteSpace: "nowrap" }}>{tx.fundName || "-"}</td>
                          <td className="fw-medium" style={{ whiteSpace: "nowrap" }}>{tx.walletName || tx.sourceWallet || tx.targetWallet || "-"}</td>
                        </>
                      ) : (
                        <td className="fw-medium" style={{ whiteSpace: "nowrap" }}>{tx.walletName || "-"}</td>
                      )}
                      <td className="fw-medium" style={{ whiteSpace: "nowrap" }}>{dateTimeStr}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span 
                          className={`badge ${tx.type === "income" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`} 
                          style={{ 
                            fontSize: "0.75rem", 
                            padding: "4px 8px", 
                            borderRadius: "6px",
                            backgroundColor: tx.type === "income" ? "#d1fae5" : "#fee2e2",
                            color: tx.type === "income" ? "#059669" : "#dc2626",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {tx.type === "income" ? t("transactions.type.income") : t("transactions.type.expense")}
                        </span>
                      </td>
                      <td className={activeTab === "fund" ? "" : "tx-note-cell"} title={tx.category || "-"} style={{ whiteSpace: "nowrap" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.category || "-"}</span>
                      </td>
                      <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                        <span 
                          className={tx.type === "expense" ? "tx-amount-expense" : "tx-amount-income"}
                          style={{ 
                            // Nếu là fund transaction và trạng thái là FAILED, hiển thị màu xám
                            color: (tx.isFundTransaction && tx.fundTransactionStatus === "FAILED") 
                              ? "#6b7280" 
                              : (tx.type === "expense" ? "#dc2626" : "#16a34a"),
                            fontWeight: "600",
                            fontSize: "0.95rem"
                          }}
                        >
                          {tx.type === "expense" ? "-" : "+"}{formatAmountOnly(tx.amount)}
                        </span>
                      </td>
                      {activeTab !== "fund" && (
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          {canPerformAction ? (
                            <div className="tx-action-buttons">
                              <button className="btn btn-link btn-sm text-muted" title={t("transactions.action.edit")} onClick={() => onEdit(tx)}>
                                <i className="bi bi-pencil-square" />
                              </button>
                              <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => onDelete(tx)}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          ) : null}
                        </td>
                      )}
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
                <th style={{ width: 100 }}>{t("transactions.table.time")}</th>
                <th>{t("transactions.table.source_wallet")}</th>
                <th>{t("transactions.table.target_wallet")}</th>
                <th className="text-end" style={{ width: 230 }}>{t("transactions.table.amount")}</th>
                <th className="text-center" style={{ width: 100 }}>{t("transactions.table.action")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    {t("transactions.table.empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((tx, i) => {
                  const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const d = toDateObj(tx.date);
                  const dateTimeStr = formatVietnamDateTime(d);
                  
                  // Kiểm tra xem transaction này có thể thực hiện hành động không
                  // Nếu một trong hai ví bị xóa, vẫn cho phép xem nhưng không cho sửa/xóa
                  // Tuy nhiên, nếu ví bị xóa thì isWalletDeleted = true, nên canPerformAction = false
                  // Điều này đúng với yêu cầu: "ẩn cột hành động đi thôi chứ vẫn hiện trong trang giao dịch"
                  const canPerformAction = !tx.isDeleted && !tx.isWalletDeleted && !tx.isLeftWallet && !tx.isViewerWallet;

                  return (
                    <tr 
                      key={tx.id}
                      onClick={() => onView(tx)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                        {serial}
                        {(tx.isDeleted || tx.isWalletDeleted) ? (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontWeight: "bold", fontStyle: "normal" }}>
                            (đã xoá)
                          </span>
                        ) : tx.isEdited && (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontWeight: "bold", fontStyle: "normal" }}>
                            (đã sửa)
                          </span>
                        )}
                      </td>
                      <td className="fw-medium">{dateTimeStr}</td>
                      <td className="fw-medium">
                        {tx.sourceWallet}
                        {tx.isFromWalletDeleted && !tx.sourceWallet.includes("(đã xóa)") && (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>(đã xóa)</span>
                        )}
                      </td>
                      <td className="fw-medium">
                        {tx.targetWallet}
                        {tx.isToWalletDeleted && !tx.targetWallet.includes("(đã xóa)") && (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>(đã xóa)</span>
                        )}
                      </td>
                      <td className="text-end" style={{ width: 230 }}>
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
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        {canPerformAction ? (
                          <div className="tx-action-buttons">
                            <button className="btn btn-link btn-sm text-muted" title={t("transactions.action.edit")} onClick={() => onEdit(tx)}>
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => onDelete(tx)}>
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        ) : null}
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
          {t('common.pagination.page', { current: currentPage, total: totalPages })}
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

