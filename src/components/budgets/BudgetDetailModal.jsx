import React, { useMemo } from "react";
import Modal from "../common/Modal/Modal";
import { formatVietnamDate } from "../../utils/dateFormat";

// Budget Progress Ring Component
const BudgetProgressRing = ({ percent = 0, status = "healthy" }) => {
  const normalizedPercent = Math.min(Math.max(percent, 0), 100);
  const radius = 68;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference;
  
  const statusColors = {
    healthy: { main: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    warning: { main: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
    over: { main: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  };
  
  const colors = statusColors[status] || statusColors.healthy;
  
  return (
    <div className="budget-progress-ring-container">
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className="budget-progress-ring-svg"
      >
        {/* Background circle */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={colors.main}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius} ${radius})`}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="budget-progress-ring-content">
        <span className="budget-progress-ring-percent" style={{ color: colors.main }}>
          {Math.round(normalizedPercent)}%
        </span>
        <small className="budget-progress-ring-label">Đã dùng</small>
      </div>
    </div>
  );
};

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
  
  // Calculate actual percent from spent and limit
  const limit = budget.limitAmount || 0;
  const spent = usage?.spent || 0;
  const actualPercent = limit > 0 ? (spent / limit) * 100 : 0;
  const percent = usage?.percent ?? actualPercent;
  
  // Determine status based on actual usage
  const alertPercentage = budget.alertPercentage ?? 80;
  let actualStatus = "healthy";
  if (percent >= 100) {
    actualStatus = "over";
  } else if (percent >= alertPercentage) {
    actualStatus = "warning";
  }
  
  const remaining = usage?.remaining ?? limit - spent;
  const rangeLabel = budget.startDate && budget.endDate
    ? `${formatVietnamDate(budget.startDate)} - ${formatVietnamDate(budget.endDate)}`
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
            {statusLabel[usage?.status || actualStatus]}
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
            <BudgetProgressRing percent={percent} status={actualStatus} />
          </div>
          <div className="budget-detail-info">
            <p>
              Hạn mức sẽ gửi cảnh báo khi đạt <strong>{budget.alertPercentage ?? 80}%</strong> tổng hạn mức.
            </p>
            {budget.note && <p className="budget-detail-note">Ghi chú: {budget.note}</p>}
            <ul>
              <li>Danh mục: {budget.categoryName}</li>
              <li>Ví áp dụng: {budget.walletName || "Tất cả ví"}</li>
              <li>Ngày tạo: {budget.createdAt ? formatVietnamDate(budget.createdAt) : "--"}</li>
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
