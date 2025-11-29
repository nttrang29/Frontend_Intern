// src/components/transactions/TransactionViewModal.jsx
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { formatVietnamDate, formatVietnamTime, formatMoney } from "./utils/transactionUtils";

export default function TransactionViewModal({ open, tx, onClose }) {
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
        }
        
        .tx-modal-header h5 {
          color: white;
          font-weight: 600;
          font-size: 1.25rem;
          margin: 0;
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
            <h5>Chi tiết Giao dịch</h5>
          </div>

          <div className="tx-modal-body">
            <div className="tx-detail-item">
              <div className="tx-detail-label">Loại giao dịch</div>
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
                    ? "Chuyển tiền giữa các ví"
                    : tx.type === "income"
                    ? "Thu nhập"
                    : "Chi tiêu"}
                </span>
              </div>
            </div>

            <div className="row g-3">
              {isTransfer ? (
                <>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Ví gửi</div>
                      <div className="tx-detail-value">{tx.sourceWallet}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Ví nhận</div>
                      <div className="tx-detail-value">{tx.targetWallet}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Số tiền</div>
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
                      <div className="tx-detail-label">Ví</div>
                      <div className="tx-detail-value">{tx.walletName}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Số tiền</div>
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
                  <div className="tx-detail-label">Ngày</div>
                  <div className="tx-detail-value">{dateStr}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">Giờ</div>
                  <div className="tx-detail-value">{timeStr}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">Danh mục</div>
                  <div className="tx-detail-value">
                    <div className="tx-category-with-icon">
                      <div className="tx-category-icon">
                        <i className={`bi ${categoryIcon}`} />
                      </div>
                      <span>{tx.category || (isTransfer ? "Chuyển tiền giữa các ví" : "")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">Ghi chú</div>
                  <div className="tx-detail-value">
                    {tx.note || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Không có</span>}
                  </div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">Mã giao dịch</div>
                  <div className="tx-detail-value" style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{tx.code || "—"}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="tx-detail-item">
                  <div className="tx-detail-label">Mã người tạo</div>
                  <div className="tx-detail-value" style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{tx.creatorCode || "—"}</div>
                </div>
              </div>

              {tx.attachment && (
                <div className="col-12">
                  <div className="tx-detail-item">
                    <div className="tx-detail-label">Ảnh đính kèm</div>
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
                        alt="Đính kèm"
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
