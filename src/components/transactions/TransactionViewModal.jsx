// src/components/transactions/TransactionViewModal.jsx
import React, { useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { formatVietnamDate, formatVietnamTime, formatMoney } from "./utils/transactionUtils";

export default function TransactionViewModal({ open, tx, onClose }) {
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets } = useWalletData();
  
  // Lấy currentUserId để kiểm tra owner
  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        return user.userId || user.id || null;
      }
    } catch (error) {
      console.error("Không thể đọc user từ localStorage:", error);
    }
    return null;
  }, []);
  
  // Tìm icon của category - phải gọi trước early return
  const categoryIcon = useMemo(() => {
    if (!tx?.category) return "bi-tags";
    const allCategories = [...expenseCategories, ...incomeCategories];
    const foundCategory = allCategories.find(
      (cat) => cat.name === tx.category || cat.categoryName === tx.category
    );
    return foundCategory?.icon || "bi-tags";
  }, [tx?.category, expenseCategories, incomeCategories]);
  
  // Tìm wallet và lấy owner email cho ví gửi và ví nhận
  // Ưu tiên lấy từ transaction object (đã được map với ownerEmail), sau đó mới tìm trong wallets list
  const sourceWallet = useMemo(() => {
    if (!tx?.sourceWallet || !wallets) return null;
    // Xử lý tên ví có thể có "(đã rời ví)" hoặc "(đã xóa)"
    const cleanSourceWalletName = tx.sourceWallet.replace(/\s*\(đã rời ví\)\s*$/, "").replace(/\s*\(đã xóa\)\s*$/, "");
    return wallets.find(w => 
      w.name === cleanSourceWalletName || 
      w.walletName === cleanSourceWalletName ||
      (tx.sourceWalletId && (String(w.id || w.walletId) === String(tx.sourceWalletId)))
    );
  }, [tx?.sourceWallet, tx?.sourceWalletId, wallets]);
  
  const targetWallet = useMemo(() => {
    if (!tx?.targetWallet || !wallets) return null;
    // Xử lý tên ví có thể có "(đã rời ví)" hoặc "(đã xóa)"
    const cleanTargetWalletName = tx.targetWallet.replace(/\s*\(đã rời ví\)\s*$/, "").replace(/\s*\(đã xóa\)\s*$/, "");
    return wallets.find(w => 
      w.name === cleanTargetWalletName || 
      w.walletName === cleanTargetWalletName ||
      (tx.targetWalletId && (String(w.id || w.walletId) === String(tx.targetWalletId)))
    );
  }, [tx?.targetWallet, tx?.targetWalletId, wallets]);
  
  // Lấy owner email từ wallet
  const getOwnerEmailFromWallet = (wallet) => {
    if (!wallet) return null;
    return wallet.ownerEmail || 
           wallet.ownerContact || 
           wallet.owner?.email ||
           wallet.ownerUser?.email ||
           null;
  };
  
  // Ưu tiên lấy ownerEmail từ transaction object (đã được map trong mapTransferToFrontend)
  // Nếu không có, mới tìm trong wallet
  const sourceWalletOwnerEmail = useMemo(() => {
    // Ưu tiên 1: Lấy từ transaction object (đã được map với đầy đủ thông tin, kể cả khi wallet đã rời)
    if (tx?.sourceWalletOwnerEmail) {
      return tx.sourceWalletOwnerEmail;
    }
    // Ưu tiên 2: Lấy từ wallet trong wallets list
    return getOwnerEmailFromWallet(sourceWallet);
  }, [tx?.sourceWalletOwnerEmail, sourceWallet]);
  
  const targetWalletOwnerEmail = useMemo(() => {
    // Ưu tiên 1: Lấy từ transaction object (đã được map với đầy đủ thông tin, kể cả khi wallet đã rời)
    if (tx?.targetWalletOwnerEmail) {
      return tx.targetWalletOwnerEmail;
    }
    // Ưu tiên 2: Lấy từ wallet trong wallets list
    return getOwnerEmailFromWallet(targetWallet);
  }, [tx?.targetWalletOwnerEmail, targetWallet]);
  
  // Xác định xem có phải là giao dịch chuyển tiền không (phải khai báo trước khi dùng trong useMemo)
  const isTransfer = !!tx?.sourceWallet && !!tx?.targetWallet;
  
  // Hàm xác định loại ví: ví cá nhân, ví nhóm, hoặc ví được chia sẻ
  const getWalletTypeLabel = useCallback((wallet, walletId, savedRole = null) => {
    if (!wallet && !walletId) return null;
    
    let walletType = "";
    // Ưu tiên sử dụng savedRole (role đã lưu trong transaction object khi map)
    // Đây là thông tin đáng tin cậy nhất vì được lưu tại thời điểm tạo transaction
    let role = savedRole ? savedRole.toUpperCase() : "";
    let isShared = false;
    let isOwner = false;
    
    // Nếu có wallet trong wallets list, lấy thông tin từ đó (nhưng vẫn ưu tiên savedRole)
    if (wallet) {
      walletType = (wallet.walletType || wallet.type || "").toString().toUpperCase();
      // Chỉ lấy role từ wallet nếu không có savedRole
      if (!role) {
        role = (wallet.walletRole || wallet.sharedRole || wallet.role || "").toString().toUpperCase();
      }
      isShared = !!wallet.isShared || !!(wallet.walletRole || wallet.sharedRole || wallet.role);
      
      // Kiểm tra xem user có phải là owner không
      isOwner = 
        (wallet.ownerUserId && currentUserId && String(wallet.ownerUserId) === String(currentUserId)) ||
        ["OWNER", "MASTER", "ADMIN"].includes(role);
    } else if (tx?.rawTransfer) {
      // Nếu không có wallet trong list, thử lấy từ rawTransfer (cho trường hợp wallet đã rời hoặc bị xóa)
      const transfer = tx.rawTransfer;
      if (walletId && (String(walletId) === String(transfer.fromWallet?.walletId))) {
        walletType = (transfer.fromWallet?.walletType || "").toString().toUpperCase();
        // Chỉ lấy role từ rawTransfer nếu không có savedRole
        if (!role) {
          role = (transfer.fromWallet?.walletRole || transfer.fromWallet?.sharedRole || transfer.fromWallet?.role || "").toString().toUpperCase();
        }
        isShared = !!(transfer.fromWallet?.isShared || transfer.fromWallet?.walletRole || transfer.fromWallet?.sharedRole || transfer.fromWallet?.role);
        isOwner = 
          (transfer.fromWallet?.ownerUserId && currentUserId && String(transfer.fromWallet.ownerUserId) === String(currentUserId)) ||
          ["OWNER", "MASTER", "ADMIN"].includes(role);
      } else if (walletId && (String(walletId) === String(transfer.toWallet?.walletId))) {
        walletType = (transfer.toWallet?.walletType || "").toString().toUpperCase();
        // Chỉ lấy role từ rawTransfer nếu không có savedRole
        if (!role) {
          role = (transfer.toWallet?.walletRole || transfer.toWallet?.sharedRole || transfer.toWallet?.role || "").toString().toUpperCase();
        }
        isShared = !!(transfer.toWallet?.isShared || transfer.toWallet?.walletRole || transfer.toWallet?.sharedRole || transfer.toWallet?.role);
        isOwner = 
          (transfer.toWallet?.ownerUserId && currentUserId && String(transfer.toWallet.ownerUserId) === String(currentUserId)) ||
          ["OWNER", "MASTER", "ADMIN"].includes(role);
      }
    }
    
    // Xác định loại ví dựa trên walletType và role
    // Ví nhóm: walletType === "GROUP" VÀ user là owner (OWNER/MASTER/ADMIN)
    // Ví được chia sẻ: walletType === "GROUP" NHƯNG user không phải owner (MEMBER/USER/USE)
    // QUAN TRỌNG: Không fallback về "Ví nhóm" nếu không có thông tin role/owner để tránh hiển thị sai
    // khi ví được chia sẻ bị kick hoặc bị xóa
    if (walletType === "GROUP") {
      // Nếu có role, dùng role để xác định
      if (role) {
        if (["OWNER", "MASTER", "ADMIN"].includes(role)) {
          return "Ví nhóm";
        }
        if (["MEMBER", "USER", "USE"].includes(role)) {
          return "Ví được chia sẻ";
        }
      }
      // Nếu không có role nhưng có thông tin isOwner từ wallet
      if (wallet && isOwner !== undefined) {
        if (isOwner) {
          return "Ví nhóm";
        }
        // Nếu không phải owner và có isShared → "Ví được chia sẻ"
        if (isShared) {
          return "Ví được chia sẻ";
        }
      }
      // Nếu không có thông tin gì (wallet đã xóa/rời và không có role đã lưu), không thể xác định
      // Trả về null để UI không hiển thị loại ví (hoặc có thể hiển thị "Không xác định")
      return null;
    }
    
    // Ví cá nhân hoặc ví được chia sẻ: walletType !== "GROUP"
    // Ví cá nhân: user là owner
    if (isOwner) {
      return "Ví cá nhân";
    }
    
    // Ví được chia sẻ: user không phải owner
    if (isShared) {
      return "Ví được chia sẻ";
    }
    
    // Fallback: mặc định là ví cá nhân
    return "Ví cá nhân";
  }, [currentUserId, tx?.rawTransfer]);
  
  // Xác định loại ví cho sourceWallet và targetWallet
  // Sử dụng role đã lưu trong transaction object (nếu có) để giữ lại thông tin ban đầu
  const sourceWalletTypeLabel = useMemo(() => {
    if (!isTransfer) return null;
    const savedRole = tx?.sourceWalletRole ? tx.sourceWalletRole.toUpperCase() : null;
    return getWalletTypeLabel(sourceWallet, tx?.sourceWalletId, savedRole);
  }, [isTransfer, sourceWallet, tx?.sourceWalletId, tx?.sourceWalletRole, getWalletTypeLabel]);
  
  const targetWalletTypeLabel = useMemo(() => {
    if (!isTransfer) return null;
    const savedRole = tx?.targetWalletRole ? tx.targetWalletRole.toUpperCase() : null;
    return getWalletTypeLabel(targetWallet, tx?.targetWalletId, savedRole);
  }, [isTransfer, targetWallet, tx?.targetWalletId, tx?.targetWalletRole, getWalletTypeLabel]);
  
  // Xác định loại ví cho transaction thông thường (không phải transfer)
  const walletTypeLabel = useMemo(() => {
    if (isTransfer) return null;
    // Tìm wallet từ transaction
    if (!tx?.walletName) return null;
    const cleanWalletName = tx.walletName.replace(/\s*\(đã rời ví\)\s*$/, "").replace(/\s*\(đã xóa\)\s*$/, "");
    const wallet = wallets ? wallets.find(w => 
      w.name === cleanWalletName || 
      w.walletName === cleanWalletName ||
      (tx.walletId && (String(w.id || w.walletId) === String(tx.walletId)))
    ) : null;
    
    // Nếu không tìm thấy wallet, thử lấy từ rawTx (cho trường hợp wallet đã rời hoặc bị xóa)
    if (!wallet && tx?.rawTx?.wallet) {
      const walletType = (tx.rawTx.wallet.walletType || "").toString().toUpperCase();
      const role = (tx.rawTx.wallet.walletRole || tx.rawTx.wallet.sharedRole || tx.rawTx.wallet.role || "").toString().toUpperCase();
      const isShared = !!(tx.rawTx.wallet.isShared || tx.rawTx.wallet.walletRole || tx.rawTx.wallet.sharedRole || tx.rawTx.wallet.role);
      
      // Kiểm tra xem user có phải là owner không
      const isOwner = 
        (tx.rawTx.wallet.ownerUserId && currentUserId && String(tx.rawTx.wallet.ownerUserId) === String(currentUserId)) ||
        ["OWNER", "MASTER", "ADMIN"].includes(role);
      
      // Ví nhóm: walletType === "GROUP"
      // - Nếu có role OWNER/MASTER/ADMIN → "Ví nhóm"
      // - Nếu có role MEMBER/USER/USE → "Ví được chia sẻ"
      // - Nếu không có role, không thể xác định (không fallback)
      if (walletType === "GROUP") {
        if (role) {
          if (["OWNER", "MASTER", "ADMIN"].includes(role)) {
            return "Ví nhóm";
          }
          if (["MEMBER", "USER", "USE"].includes(role)) {
            return "Ví được chia sẻ";
          }
        }
        // Nếu có thông tin isOwner
        if (isOwner !== undefined) {
          if (isOwner) {
            return "Ví nhóm";
          }
          if (isShared) {
            return "Ví được chia sẻ";
          }
        }
        // Không có thông tin, không thể xác định
        return null;
      }
      
      // Ví cá nhân: walletType !== "GROUP" VÀ user là owner
      if (isOwner) {
        return "Ví cá nhân";
      }
      
      // Ví được chia sẻ: user không phải owner
      if (isShared) {
        return "Ví được chia sẻ";
      }
      
      return "Ví cá nhân";
    }
    
    return getWalletTypeLabel(wallet, tx?.walletId);
  }, [isTransfer, tx?.walletName, tx?.walletId, tx?.rawTx, wallets, currentUserId, getWalletTypeLabel]);
  
  if (!open || !tx) return null;

  const d = tx.date ? new Date(tx.date) : null;
  const dateStr = formatVietnamDate(d);
  const timeStr = formatVietnamTime(d);

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
          <div className="tx-modal-header d-flex justify-content-between align-items-start">
            <h5>Chi tiết Giao dịch</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Đóng"
              onClick={onClose}
              style={{ filter: "invert(1) brightness(2)" }}
            />
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
                      {sourceWalletOwnerEmail && (
                        <div className="tx-detail-value" style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                          Chủ ví: {sourceWalletOwnerEmail}
                        </div>
                      )}
                      {sourceWalletTypeLabel && (
                        <div className="tx-detail-value" style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>
                          Loại ví: {sourceWalletTypeLabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Ví nhận</div>
                      <div className="tx-detail-value">{tx.targetWallet}</div>
                      {targetWalletOwnerEmail && (
                        <div className="tx-detail-value" style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                          Chủ ví: {targetWalletOwnerEmail}
                        </div>
                      )}
                      {targetWalletTypeLabel && (
                        <div className="tx-detail-value" style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>
                          Loại ví: {targetWalletTypeLabel}
                        </div>
                      )}
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
                  {/* Hiển thị "Chủ ví" luôn luôn, kể cả khi wallet đã rời hoặc bị xóa */}
                  <div className="col-6">
                    <div className="tx-detail-item">
                      <div className="tx-detail-label">Chủ ví</div>
                      <div className="tx-detail-value">
                        {tx.ownerEmail ? (
                          tx.ownerEmail
                        ) : (
                          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Không có thông tin</span>
                        )}
                      </div>
                      {walletTypeLabel && (
                        <div className="tx-detail-value" style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                          Loại ví: {walletTypeLabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={tx.ownerEmail ? "col-12" : "col-6"}>
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