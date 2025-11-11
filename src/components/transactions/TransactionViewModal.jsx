import React from "react";

export default function TransactionViewModal({ open, tx, onClose }) {
  if (!open || !tx) return null;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
  };

  const d = tx.date ? new Date(tx.date) : null;
  const dateStr = d
    ? d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
  const timeStr = d
    ? d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const isTransfer = !!tx.sourceWallet && !!tx.targetWallet;

  return (
    <div style={overlayStyle}>
      <div className="modal-dialog modal-dialog-scrollable" style={{ maxWidth: 520 }}>
        <div
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: 20,
            backgroundColor: "#ffffff",
          }}
        >
          <div
            className="modal-header border-0 pb-0"
            style={{ padding: "16px 22px 8px" }}
          >
            <h5 className="modal-title fw-semibold">Chi tiết Giao dịch</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div
            className="modal-body"
            style={{ padding: "12px 22px 18px" }}
          >
            <div className="mb-3">
              <div className="text-muted small mb-1">Loại giao dịch</div>
              <div className="badge rounded-pill bg-soft-blue text-primary fw-semibold">
                {isTransfer
                  ? "Chuyển tiền giữa các ví"
                  : tx.type === "income"
                  ? "Thu nhập"
                  : "Chi tiêu"}
              </div>
            </div>

            <div className="row g-3">
              {isTransfer ? (
                <>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">
                      Ví gửi
                    </label>
                    <div className="form-control-plaintext fw-semibold">
                      {tx.sourceWallet}
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">
                      Ví nhận
                    </label>
                    <div className="form-control-plaintext fw-semibold">
                      {tx.targetWallet}
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">
                      Số tiền
                    </label>
                    <div className="form-control-plaintext fw-semibold">
                      {tx.amount.toLocaleString("vi-VN")} {tx.currency}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">Ví</label>
                    <div className="form-control-plaintext fw-semibold">
                      {tx.walletName}
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">
                      Số tiền
                    </label>
                    <div className="form-control-plaintext fw-semibold text-danger">
                      {tx.type === "expense" ? "-" : "+"}
                      {tx.amount.toLocaleString("vi-VN")} {tx.currency}
                    </div>
                  </div>
                </>
              )}

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Ngày</label>
                <div className="form-control-plaintext">{dateStr}</div>
              </div>
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Giờ</label>
                <div className="form-control-plaintext">{timeStr}</div>
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">
                  Danh mục
                </label>
                <div className="form-control-plaintext">
                  {tx.category || (isTransfer ? "Chuyển tiền giữa các ví" : "")}
                </div>
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">
                  Ghi chú
                </label>
                <div className="form-control-plaintext">
                  {tx.note || (
                    <span className="text-muted fst-italic">Không có</span>
                  )}
                </div>
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">
                  Mã giao dịch
                </label>
                <div className="form-control-plaintext">{tx.code}</div>
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">
                  Mã người tạo
                </label>
                <div className="form-control-plaintext">{tx.creatorCode}</div>
              </div>

              {tx.attachment && (
                <div className="col-12">
                  <label className="form-label small text-muted mb-1">
                    Ảnh đính kèm
                  </label>
                  <div className="d-flex gap-2 align-items-center">
                    <div
                      style={{
                        width: 120,
                        height: 90,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f3f4f6",
                      }}
                    >
                      <img
                        src={tx.attachment}
                        alt="Đính kèm"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <div className="small text-muted flex-grow-1">
                      Ảnh minh họa (demo). Sau này sẽ lấy từ API file thật.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="modal-footer border-0 pt-0"
            style={{ padding: "8px 22px 16px" }}
          >
            <button className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
