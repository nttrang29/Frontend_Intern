import React from "react";
import Modal from "../common/Modal/Modal";

export default function BudgetWarningModal({
  open,
  categoryName,
  budgetLimit,
  spent,
  transactionAmount,
  totalAfterTx,
  isExceeding,
  onConfirm,
  onCancel,
}) {
  const remaining = budgetLimit - spent;
  const remainingAfterTx = budgetLimit - totalAfterTx;
  const amountOver = transactionAmount - remaining;
  const percentAfterTx = totalAfterTx && budgetLimit ? (totalAfterTx / budgetLimit) * 100 : 0;

  // Determine title and message based on whether exceeding or approaching
  const isAlert = !isExceeding; // approaching but not exceeding
  const title = isAlert 
    ? "⚠️ Nhắc nhở Sắp Quá Hạn mức"
    : "⛔ Cảnh báo Vượt Hạn mức";
  const message = isAlert
    ? `Giao dịch này sẽ làm chi tiêu đạt ${Math.round(percentAfterTx)}% hạn mức. Vẫn còn 10% nữa là đầy hạn mức!`
    : `Giao dịch này sẽ vượt quá hạn mức chi tiêu đã đặt cho danh mục.`;

  return (
    <Modal open={open} onClose={onCancel} width={500}>
      <div className="modal__content" style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontWeight: 600, color: "#212529", marginBottom: "0.5rem" }}>
            {isAlert ? (
              <i className="bi bi-exclamation-circle me-2" style={{ color: "#ffc107" }}></i>
            ) : (
              <i className="bi bi-exclamation-triangle me-2" style={{ color: "#dc3545" }}></i>
            )}
            {title}
          </h4>
          <p style={{ color: "#6c757d", fontSize: "0.95rem", margin: 0 }}>
            {message}
          </p>
        </div>

        <div
          style={{
            backgroundColor: isAlert ? "#fff8e1" : "#ffebee",
            borderLeft: `4px solid ${isAlert ? "#ffc107" : "#dc3545"}`,
            padding: "1rem",
            borderRadius: "4px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
              Danh mục
            </label>
            <p style={{ color: "#212529", fontWeight: 500, margin: 0 }}>{categoryName}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Hạn mức
              </label>
              <p style={{ color: "#0066cc", fontWeight: 600, margin: 0 }}>
                {budgetLimit.toLocaleString("vi-VN")} VND
              </p>
            </div>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Đã chi
              </label>
              <p style={{ color: "#dc3545", fontWeight: 600, margin: 0 }}>
                {spent.toLocaleString("vi-VN")} VND
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Còn lại (trước giao dịch)
              </label>
              <p
                style={{
                  color: remaining <= 0 ? "#dc3545" : "#28a745",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {remaining.toLocaleString("vi-VN")} VND
              </p>
            </div>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Giao dịch này
              </label>
              <p style={{ color: "#0099cc", fontWeight: 600, margin: 0 }}>
                {transactionAmount.toLocaleString("vi-VN")} VND
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${isAlert ? "#ffc107" : "#dc3545"}` }}>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Tổng sau giao dịch
              </label>
              <p style={{ color: "#212529", fontWeight: 600, margin: 0 }}>
                {totalAfterTx.toLocaleString("vi-VN")} VND
              </p>
            </div>
            <div>
              <label style={{ fontWeight: 500, color: "#6c757d", marginBottom: "0.25rem", display: "block" }}>
                Còn lại (sau giao dịch)
              </label>
              <p
                style={{
                  color: remainingAfterTx < 0 ? "#dc3545" : remainingAfterTx < budgetLimit * 0.1 ? "#ffc107" : "#28a745",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {remainingAfterTx.toLocaleString("vi-VN")} VND
              </p>
            </div>
          </div>

          {isExceeding && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#ffcccc", borderRadius: "4px" }}>
              <strong style={{ color: "#dc3545" }}>Sẽ vượt quá:</strong>{" "}
              <span style={{ color: "#dc3545", fontWeight: 600 }}>
                {amountOver.toLocaleString("vi-VN")} VND
              </span>
            </div>
          )}

          {!isExceeding && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#fffbcc", borderRadius: "4px" }}>
              <strong style={{ color: "#ffc107" }}>Mức sử dụng sau giao dịch:</strong>{" "}
              <span style={{ color: "#212529", fontWeight: 600 }}>
                {Math.round(percentAfterTx)}% / 100%
              </span>
            </div>
          )}
        </div>

        <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "1.5rem" }}>
          {isAlert
            ? "Bạn vẫn có thể tiếp tục giao dịch nếu ví được chọn còn đủ tiền."
            : "Giao dịch này sẽ làm tổng chi tiêu vượt quá hạn mức. Bạn có thể tiếp tục nếu ví được chọn còn đủ tiền."}
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Hủy Giao dịch
          </button>
          <button
            type="button"
            className={`btn ${isAlert ? "btn-warning" : "btn-danger"}`}
            onClick={onConfirm}
          >
            Tiếp tục Giao dịch
          </button>
        </div>
      </div>
    </Modal>
  );
}
