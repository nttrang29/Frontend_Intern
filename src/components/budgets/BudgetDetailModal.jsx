import React from "react";
import Modal from "../common/Modal/Modal";

export default function BudgetDetailModal({ open, budget, usage, onClose, onEdit, onRemind }) {
  if (!open || !budget) return null;

  const formatCurrency = (value = 0) => {
    try {
      return (value || 0).toLocaleString("vi-VN");
    } catch (error) {
      return String(value || 0);
    }
  };

  const statusLabel = {
    healthy: "Đang hoạt động",
    warning: "Vượt ngưỡng cảnh báo",
    over: "Vượt hạn mức",
  };

  const statusTone = {
    healthy: "success",
    warning: "warning",
    over: "danger",
  }[usage?.status || "healthy"] || "success";
  const percent = usage?.percent ?? 0;
  const limit = budget.limitAmount || 0;
  const spent = usage?.spent || 0;
  const remaining = usage?.remaining ?? limit - spent;
  const rangeLabel = budget.startDate && budget.endDate
    ? `${new Date(budget.startDate).toLocaleDateString("vi-VN")} - ${new Date(budget.endDate).toLocaleDateString("vi-VN")}`
    : "Chưa thiết lập";

  return (
    <Modal open={open} onClose={onClose} width={620}>
      <div className="budget-detail-modal">
        <div className="budget-detail-header">
          <div>
            <p className="eyebrow-text">Tổng quan hạn mức</p>
            <h4>{budget.categoryName}</h4>
            <span className="text-muted">Áp dụng cho ví: {budget.walletName || "Tất cả ví"}</span>
          </div>
          <span className={`budget-status-chip ${statusTone}`}>
            {statusLabel[usage?.status || "healthy"]}
          </span>
        </div>

        <div className="budget-detail-grid">
          <div>
            <label>Hạn mức</label>
            <p>{formatCurrency(limit)} VND</p>
          </div>
          <div>
            <label>Đã chi</label>
            <p className={spent > limit ? "text-danger" : ""}>{formatCurrency(spent)} VND</p>
          </div>
          <div>
            <label>Còn lại</label>
            <p className={remaining < 0 ? "text-danger" : "text-success"}>{formatCurrency(remaining)} VND</p>
          </div>
          <div>
            <label>Khoảng thời gian</label>
            <p>{rangeLabel}</p>
          </div>
        </div>

        <div className="budget-detail-body">
          <div className="budget-detail-chart">
            <div className="budget-detail-chart-ring">
              <span>{Math.min(percent, 999)}%</span>
              <small>Đã dùng</small>
            </div>
          </div>
          <div className="budget-detail-info">
            <p>
              Hạn mức sẽ gửi cảnh báo khi đạt <strong>{budget.alertPercentage ?? 80}%</strong> tổng hạn mức.
            </p>
            {budget.note && <p className="budget-detail-note">Ghi chú: {budget.note}</p>}
            <ul>
              <li>Danh mục: {budget.categoryName}</li>
              <li>Ví áp dụng: {budget.walletName || "Tất cả ví"}</li>
              <li>Ngày tạo: {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString("vi-VN") : "--"}</li>
            </ul>
          </div>
        </div>

        <div className="budget-detail-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={() => onRemind?.(budget)}>
            Gửi nhắc nhở
          </button>
          <div className="ms-auto d-flex gap-2">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Đóng
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onEdit?.(budget)}>
              Chỉnh sửa hạn mức
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
