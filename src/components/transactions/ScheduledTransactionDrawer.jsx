import React from "react";
import Modal from "../common/Modal/Modal";

const STATUS_LABEL = {
  PENDING: "Chờ chạy",
  RUNNING: "Đang chạy",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

const STATUS_CLASS = {
  PENDING: "schedule-status schedule-status--pending",
  RUNNING: "schedule-status schedule-status--running",
  COMPLETED: "schedule-status schedule-status--success",
  FAILED: "schedule-status schedule-status--failed",
  CANCELLED: "schedule-status schedule-status--muted",
};

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function ScheduledTransactionDrawer({ open, schedule, onClose, onCancel }) {
  if (!open || !schedule) return null;

  const typeLabel = schedule.scheduleTypeLabel || schedule.scheduleType;

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div className="modal__content" style={{ padding: "1.65rem" }}>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <p className="text-uppercase text-muted small mb-1">Chi tiết lịch #{schedule.id}</p>
            <h4 className="mb-0">{schedule.walletName}</h4>
          </div>
          <span className={STATUS_CLASS[schedule.status] || "badge bg-secondary"}>
            {STATUS_LABEL[schedule.status] || schedule.status}
          </span>
        </div>

        <div className="schedule-detail-box mb-3">
          <p className="fw-semibold mb-2">Thông tin lịch</p>
          <ul className="list-unstyled mb-0 schedule-detail-list">
            <li><span>Danh mục:</span> {schedule.categoryName} ({schedule.transactionType === "income" ? "Thu nhập" : "Chi tiêu"})</li>
            <li><span>Kiểu lịch:</span> {typeLabel}</li>
            <li>
              <span>Khoảng thời gian:</span> {formatDateTime(schedule.firstRun)}
              {schedule.endDate ? ` → ${new Date(schedule.endDate).toLocaleDateString("vi-VN")}` : " (Không giới hạn)"}
            </li>
            <li><span>Số tiền:</span> {schedule.amount.toLocaleString("vi-VN") } VND</li>
            <li><span>Tiếp theo:</span> {formatDateTime(schedule.nextRun)}</li>
            <li><span>Số lần hoàn thành:</span> {schedule.successRuns}/{schedule.totalRuns}</li>
          </ul>
        </div>

        <div className="schedule-history-box">
          <p className="fw-semibold mb-2">Lịch sử thực thi</p>
          {schedule.logs && schedule.logs.length > 0 ? (
            <ul className="list-unstyled mb-0 schedule-log-list">
              {schedule.logs.map((log) => (
                <li key={log.id}>
                  <div>
                    <strong>{formatDateTime(log.time)}</strong>
                    <span className={`ms-2 ${log.status === "COMPLETED" ? "schedule-status schedule-status--success" : "schedule-status schedule-status--failed"}`}>
                      {log.status === "COMPLETED" ? "Thành công" : "Thất bại"}
                    </span>
                  </div>
                  <p className="mb-0 text-muted">{log.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mb-0">Chưa có lần chạy nào.</p>
          )}
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          {schedule.status !== "CANCELLED" && (
            <button type="button" className="btn btn-outline-danger" onClick={() => onCancel?.(schedule.id)}>
              Hủy lịch
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
