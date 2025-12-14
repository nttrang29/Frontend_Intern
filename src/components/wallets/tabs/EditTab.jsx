import React, { useState } from "react";
import ConfirmModal from "../../common/Modal/ConfirmModal";
import { formatMoney } from "../../../utils/formatMoney";

const NOTE_MAX_LENGTH = 60;

export default function EditTab({
  wallet,
  editForm,
  onEditFieldChange,
  onSubmitEdit,
  onDeleteWallet,
  isTargetWallet = false,
  fundInfo = null,
}) {
  const isGroupWallet = !!wallet.isShared;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const walletCurrency = wallet?.currency || "VND";

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

  const currentBalance = Number(wallet?.balance || 0);

  // Format thời gian tạo
  const createdAt = wallet?.createdAt
    ? new Date(wallet.createdAt).toLocaleString("vi-VN", {
        hour12: false,
      })
    : null;

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Sửa ví</h3>
        <span>Chỉnh thông tin cơ bản của ví. Thêm thành viên tại tab "Quản lý người dùng".</span>
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
                {formatMoney(currentBalance, walletCurrency)}
              </strong>
            </div>
          </label>
          <label>
            Tiền tệ
            <input
              type="text"
              value={editForm.currency || "VND"}
              disabled
              className="form-control"
            />
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
            {onDeleteWallet && !isTargetWallet && (
              <button
                type="button"
                className="wallets-btn wallets-btn--danger-outline"
                onClick={handleOpenDelete}
              >
                Xóa ví này
              </button>
            )}
            {isTargetWallet && fundInfo && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                <strong>Lưu ý:</strong> Ví này là ví quỹ của "{fundInfo.fund?.fundName || fundInfo.fund?.name || 'Quỹ không xác định'}". 
                Để xóa ví, vui lòng vào quỹ để đổi ví nguồn.
              </div>
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

