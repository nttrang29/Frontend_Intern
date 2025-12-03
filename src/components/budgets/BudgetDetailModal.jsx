import React from "react";
import Modal from "../common/Modal/Modal";
import { useLanguage } from "../../contexts/LanguageContext";

const STATUS_TONE = {
  active: "success",
  pending: "info",
  completed: "secondary",
  warning: "warning",
  over: "danger",
};

const FALLBACK_LABEL = {
  active: "Đang hoạt động",
  pending: "Đang chờ",
  completed: "Hoàn thành",
  warning: "Vượt ngưỡng",
  over: "Vượt hạn mức",
};

const formatAmount = (value = 0, currencyCode = "VND") => {
  const amount = Number(value) || 0;
  const code = (currencyCode || "VND").toUpperCase();
  if (code === "USD") {
    const formatted =
      Math.abs(amount) < 0.01 && amount !== 0
        ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })
        : amount % 1 === 0
        ? amount.toLocaleString("en-US")
        : amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formatted}`;
  }
  if (code === "VND") {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
  return `${amount.toLocaleString("en-US")} ${code}`;
};

export default function BudgetDetailModal({ open, budget, usage, status = "active", onClose, onEdit }) {
  const { t } = useLanguage();
  if (!open || !budget) return null;
  const currencyCode = (budget.currencyCode || "VND").toUpperCase();

  const statusTone = STATUS_TONE[status] || "secondary";
  const statusLabel = t(`budgets.status.${status}`) || FALLBACK_LABEL[status] || FALLBACK_LABEL.active;
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
            {statusLabel}
          </span>
        </div>

        <div className="budget-detail-grid">
          <div>
            <label>Hạn mức</label>
            <p>{formatAmount(limit, currencyCode)}</p>
          </div>
          <div>
            <label>Đã chi</label>
            <p className={spent > limit ? "text-danger" : ""}>{formatAmount(spent, currencyCode)}</p>
          </div>
          <div>
            <label>Còn lại</label>
            <p className={remaining < 0 ? "text-danger" : "text-success"}>{formatAmount(remaining, currencyCode)}</p>
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
