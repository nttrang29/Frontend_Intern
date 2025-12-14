// src/components/transactions/TransactionViewModal.jsx
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatVietnamDate, formatVietnamTime, formatMoney } from "./utils/transactionUtils";

export default function TransactionViewModal({ open, tx, onClose }) {
  const { t } = useLanguage();
  const { expenseCategories, incomeCategories } = useCategoryData();
  
  // Tìm icon của category - phải gọi trước early return
  const categoryIcon = useMemo(() => {
    if (!tx?.category) return "bi-tags";
    const allCategories = [...expenseCategories, ...incomeCategories];
    const foundCategory = allCategories.find(
      (cat) => cat.name === tx.category || cat.categoryName === tx.category
    );
    return foundCategory?.icon || "bi-tags";
  }, [tx?.category, expenseCategories, incomeCategories]);
  
  if (!open || !tx) return null;

  const d = tx.date ? new Date(tx.date) : null;
  const dateStr = formatVietnamDate(d);
  const timeStr = formatVietnamTime(d);

  const isTransfer = !!tx.sourceWallet && !!tx.targetWallet;

  const ui = (
    <>
      <style>{`
        @keyframes fadeInModal { 
          from { 
            opacity: 0;
          } 
          to { 
            opacity: 1;
          } 
        }

        .tx-modal-overlay {
          position: fixed; 
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          display: flex; 
          align-items: center; 
          justify-content: center;
          z-index: 2147483647;
          animation: fadeInModal 0.15s ease-out;
        }

        .tx-modal {
          width: 560px; 
          max-width: 95%;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          color: #111827;
          z-index: 2147483648;
          animation: fadeInModal 0.15s ease-out;
        }
        
        .tx-modal-header {
          background: linear-gradient(90deg, rgb(11, 90, 165) 0%, rgb(12, 127, 176) 60%, rgb(10, 181, 192) 100%);
          color: white;
          padding: 20px 24px;
          border-radius: 24px 24px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .tx-modal-header h5 {
          color: white;
          font-weight: 600;
          font-size: 1.25rem;
          margin: 0;
        }

        .tx-modal-close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1.2rem;
          line-height: 1;
        }

        .tx-modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .tx-modal-close-btn:active {
          transform: scale(0.95);
        }
        
        .tx-modal-body {
          padding: 24px;
        }
        
        .tx-detail-item {
          margin-bottom: 20px;
        }
        
        .tx-detail-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        
        .tx-detail-value {
          font-size: 1rem;
          color: #111827;
          font-weight: 500;
        }
        
        .tx-category-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tx-category-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(11, 90, 165, 0.1) 0%, rgba(10, 181, 192, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(11, 90, 165);
          font-size: 1.1rem;
        }
      `}</style>

      <div className="tx-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="tx-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tx-modal-header">
            <h5>{t("transactions.view.title")}</h5>
            <button 
              type="button" 
              className="tx-modal-close-btn"
              onClick={onClose}
              aria-label={t("common.close") || "Close"}
            >
              ×
            </button>
          </div>

          <div className="tx-modal-body">
            <div className="tx-detail-item">
              <div className="tx-detail-label">{t("transactions.view.type")}</div>
              <div>
                <span 
                  className="badge rounded-pill fw-semibold"
                  style={{
                    backgroundColor: isTransfer 
                      ? "rgba(14, 165, 233, 0.1)" 
                      : tx.type === "income" 
                      ? "rgba(22, 163, 74, 0.1)" 
                      : "rgba(220, 38, 38, 0.1)",
                    color: isTransfer 
                      ? "#0ea5e9" 
                      : tx.type === "income" 
                      ? "#16a34a" 
                      : "#dc2626",
                    padding: "6px 12px",
                    fontSize: "0.875rem"
                  }}
                >
                  {isTransfer
                    ? t("transactions.type.transfer")
                    : tx.type === "income"
                    ? t("transactions.type.income")
                    : t("transactions.type.expense")}
                </span>
              </div>
            </div>

            <div className="row g-3">
              {isTransfer ? (
                <>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">{t("transactions.view.source_wallet")}</div>
                      <div className="tx-detail-value">{tx.sourceWallet}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">{t("transactions.view.target_wallet")}</div>
                      <div className="tx-detail-value">{tx.targetWallet}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">{t("transactions.view.amount")}</div>
                      <div 
                        className="tx-detail-value"
                        style={{
                          color: "#0ea5e9",
                          fontWeight: "600",
                          fontSize: "1.1rem"
                        }}
                      >
                        {formatMoney(tx.amount, tx.currency)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">{t("transactions.view.wallet")}</div>
                      <div className="tx-detail-value">{tx.walletName}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">{t("transactions.view.amount")}</div>
                      <div 
                        className="tx-detail-value"
                        style={{
                          color: tx.type === "expense" ? "#dc2626" : "#16a34a",
                          fontWeight: "600",
                          fontSize: "1.1rem"
                        }}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatMoney(tx.amount, tx.currency)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.date")}</div>
                  <div className="tx-detail-value">{dateStr}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.time")}</div>
                  <div className="tx-detail-value">{timeStr}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.category")}</div>
                  <div className="tx-detail-value">
                    <div className="tx-category-with-icon">
                      <div className="tx-category-icon">
                        <i className={`bi ${categoryIcon}`} />
                      </div>
                      <span>{tx.category || (isTransfer ? t("transactions.type.transfer") : "")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.note")}</div>
                  <div className="tx-detail-value">
                    {tx.note || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{t("transactions.view.no_note")}</span>}
                  </div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.code")}</div>
                  <div className="tx-detail-value" style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{tx.code || "—"}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">{t("transactions.view.creator_code")}</div>
                  <div className="tx-detail-value" style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{tx.creatorCode || "—"}</div>
                </div>
              </div>

              {tx.attachment && (
                <div className="col-12">
                  <div className="tx-detail-item">
                    <div className="tx-detail-label">{t("transactions.view.attachment")}</div>
                    <div
                      style={{
                        width: 160,
                        height: 120,
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "#f3f4f6",
                        border: "2px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <img
                        src={tx.attachment}
                        alt={t("transactions.view.attachment")}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(ui, document.body);
}
