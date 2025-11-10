import React from "react";

export default function WalletViewModal({ wallet, onClose }) {
  if (!wallet) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Chi tiết ví — <strong>{wallet.name}</strong></h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-2"><span className="text-muted small">Loại ví</span><div>{wallet.type}</div></div>
            <div className="mb-2"><span className="text-muted small">Tiền tệ</span><div>{wallet.currency}</div></div>
            <div className="mb-2">
              <span className="text-muted small">Số dư</span>
              <div className="fw-semibold text-primary">{wallet.balance.toLocaleString()} {wallet.currency}</div>
            </div>
            <div className="mb-2"><span className="text-muted small">Ghi chú</span><div>{wallet.note || <em>—</em>}</div></div>
            <div className="text-muted small">Tạo ngày: {new Date(wallet.createdAt).toLocaleString("vi-VN")}</div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}
