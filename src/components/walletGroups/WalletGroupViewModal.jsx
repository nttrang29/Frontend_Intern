import React from "react";

export default function WalletGroupViewModal({ group, onClose }) {
  if (!group) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Chi tiết nhóm ví — <strong>{group.name}</strong>
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-2">
              <div className="text-muted small">Mô tả</div>
              <div>{group.description || <em>—</em>}</div>
            </div>

            <div className="mb-2">
              <div className="text-muted small">Trạng thái</div>
              <div>{group.isDefault ? "Mặc định" : "—"}</div>
            </div>

            <div className="mb-2">
              <div className="text-muted small">Danh sách ví</div>
              <div>
                {group.wallets?.length ? (
                  <ul className="mb-0">
                    {group.wallets.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <em>Chưa có ví nào</em>
                )}
              </div>
            </div>

            <div className="text-muted small">
              Tạo ngày:{" "}
              {new Date(group.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
