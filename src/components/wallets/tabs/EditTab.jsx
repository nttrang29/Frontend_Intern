import React, { useState, useMemo } from "react";
import ConfirmModal from "../../common/Modal/ConfirmModal";
import { getRate, formatConvertedBalance } from "../utils/walletUtils";
import { formatMoney } from "../../../utils/formatMoney";

const NOTE_MAX_LENGTH = 60;

export default function EditTab({
  wallet,
  currencies,
  editForm,
  onEditFieldChange,
  editShareEmail,
  setEditShareEmail,
  onAddEditShareEmail,
  shareWalletLoading = false,
  onSubmitEdit,
  onDeleteWallet,
}) {
  const isGroupWallet = !!wallet.isShared;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDeleteWallet?.(wallet.id);
  };

  // Tính số dư mới khi currency thay đổi
  const oldCurrency = wallet?.currency || "VND";
  const newCurrency = editForm.currency;
  const currentBalance = Number(wallet?.balance || 0);
  const currencyChanged = oldCurrency !== newCurrency;
  
  const exchangeRate = useMemo(() => {
    if (!currencyChanged) return 1;
    return getRate(oldCurrency, newCurrency);
  }, [oldCurrency, newCurrency, currencyChanged]);

  const convertedBalance = useMemo(() => {
    if (!currencyChanged) return currentBalance;
    // Không làm tròn để giữ đúng giá như tỷ giá (giữ nhiều chữ số thập phân)
    const converted = currentBalance * exchangeRate;
    return converted;
  }, [currentBalance, exchangeRate, currencyChanged, newCurrency]);

  // Format thời gian tạo
  const createdAt = wallet?.createdAt
    ? new Date(wallet.createdAt).toLocaleString("vi-VN", {
        hour12: false,
      })
    : null;

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Sửa ví & chia sẻ</h3>
        <span>Chỉnh thông tin ví và quản lý người được chia sẻ.</span>
      </div>

      <form className="wallet-form" onSubmit={onSubmitEdit} autoComplete="off">
        <div className="wallet-form__row">
          <label>
            Tên ví
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => onEditFieldChange("name", e.target.value)}
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư hiện tại:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, oldCurrency)}
              </strong>
            </div>
          </label>
          <label>
            Tiền tệ
            <select
              value={editForm.currency}
              onChange={(e) =>
                onEditFieldChange("currency", e.target.value)
              }
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {/* Hiển thị tỷ giá và số dư sau khi chuyển đổi chỉ khi currency thay đổi */}
            {currencyChanged && wallet && (
              <>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tỷ giá: 1 {oldCurrency} = {newCurrency === "USD" 
                    ? exchangeRate.toLocaleString("en-US", { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 8 
                      })
                    : exchangeRate.toLocaleString("vi-VN", { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 8 
                      })
                  } {newCurrency}
                </div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#059669",
                  marginTop: "4px",
                  fontWeight: 600
                }}>
                  Số dư sau khi chuyển đổi:{" "}
                  <strong>
                    {formatConvertedBalance(convertedBalance, newCurrency)}
                  </strong>
                </div>
              </>
            )}
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={editForm.note}
              onChange={(e) => onEditFieldChange("note", e.target.value)}
              maxLength={NOTE_MAX_LENGTH}
            />
            <span className="wallet-form__char-hint">
              {(editForm.note || "").length}/{NOTE_MAX_LENGTH} ký tự
            </span>
          </label>
        </div>

        <div className="wallet-form__share-block">
          <label className="wallet-form__full">
            Thêm email chia sẻ
            <div className="wallet-form__share-row">
              <input
                type="email"
                value={editShareEmail}
                onChange={(e) => setEditShareEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={onAddEditShareEmail}
                disabled={!editShareEmail?.trim() || shareWalletLoading}
              >
                {shareWalletLoading ? "Đang chia sẻ..." : "Thêm"}
              </button>
            </div>
          </label>

          {(editForm.sharedEmails || []).length > 0 && (
            <div className="wallet-share-list">
              {editForm.sharedEmails.map((email) => (
                <span
                  key={email}
                  className="wallet-share-pill wallet-share-pill--readonly"
                >
                  {email}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hiển thị thời gian tạo */}
        {createdAt && (
          <div className="wallet-form__row" style={{ 
            padding: "10px 12px", 
            border: "1px dashed #d1d5db",
            borderRadius: "10px", 
            display: "flex", 
            justifyContent: "space-between",
            color: "#6b7280",
            marginBottom: "14px"
          }}>
            <span>Thời gian tạo</span>
            <strong style={{ color: "#111827" }}>{createdAt}</strong>
          </div>
        )}

        <div className="wallet-form__footer">
          {!isGroupWallet && (
            <label className="wallet-form__checkbox">
              <input
                type="checkbox"
                checked={editForm.isDefault}
                onChange={(e) =>
                  onEditFieldChange("isDefault", e.target.checked)
                }
              />
              <span>Đặt làm ví mặc định</span>
            </label>
          )}

          <div className="wallet-form__actions">
            {onDeleteWallet && (
              <button
                type="button"
                className="wallets-btn wallets-btn--danger-outline"
                onClick={handleOpenDelete}
              >
                Xóa ví này
              </button>
            )}
            <button type="submit" className="wallets-btn wallets-btn--primary">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Xác nhận xóa ví"
        message={`Bạn có chắc chắn muốn xóa ví "${
          wallet.name || "Không tên"
        }"? Hành động này không thể hoàn tác.`}
        okText="Xóa ví"
        cancelText="Hủy"
        danger={true}
        onOk={handleConfirmDelete}
        onClose={handleCloseDelete}
      />
    </div>
  );
}

