import React, { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal/Modal";

const SCHEDULE_TYPES = [
  { value: "ONE_TIME", label: "Một lần", tooltip: "Chỉ thực hiện một lần vào ngày đã chọn" },
  { value: "DAILY", label: "Hằng ngày", tooltip: "Lặp lại hàng ngày vào giờ đã chọn" },
  { value: "WEEKLY", label: "Hằng tuần", tooltip: "Chạy mỗi tuần vào cùng ngày / giờ" },
  { value: "MONTHLY", label: "Hằng tháng", tooltip: "Tự động chạy mỗi tháng" },
  { value: "YEARLY", label: "Hằng năm", tooltip: "Lặp lại vào cùng ngày mỗi năm" },
];

const DEFAULT_FORM = {
  transactionType: "expense",
  walletId: "",
  categoryId: "",
  amount: "",
  note: "",
  scheduleType: "MONTHLY",
  firstRun: "",
  endDate: "",
};

export default function ScheduledTransactionModal({
  open,
  wallets = [],
  expenseCategories = [],
  incomeCategories = [],
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...DEFAULT_FORM,
        transactionType: prev.transactionType || "expense",
        scheduleType: prev.scheduleType || "MONTHLY",
      }));
      setErrors({});
    }
  }, [open]);

  const categoryOptions = useMemo(
    () => (form.transactionType === "income" ? incomeCategories : expenseCategories) || [],
    [form.transactionType, expenseCategories, incomeCategories]
  );

  const previewText = useMemo(() => {
    if (!form.firstRun) return "Chưa chọn thời điểm chạy";
    const start = new Date(form.firstRun);
    if (Number.isNaN(start.getTime())) return "Chưa chọn thời điểm chạy";

    const startLabel = start.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (form.scheduleType === "ONE_TIME" || !form.endDate) {
      return `Sẽ chạy từ ${startLabel}`;
    }

    const end = new Date(form.endDate);
    if (Number.isNaN(end.getTime()) || end <= start) {
      return `Bắt đầu ${startLabel}`;
    }

    const diffDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    let estimate = 1;
    switch (form.scheduleType) {
      case "DAILY":
        estimate = diffDays + 1;
        break;
      case "WEEKLY":
        estimate = Math.floor(diffDays / 7) + 1;
        break;
      case "MONTHLY":
        estimate = Math.max(1, Math.round(diffDays / 30)) + 1;
        break;
      case "YEARLY":
        estimate = Math.max(1, Math.round(diffDays / 365)) + 1;
        break;
      default:
        estimate = 1;
    }

    const endLabel = end.toLocaleDateString("vi-VN");
    return `Ước tính chạy ${estimate} lần (từ ${startLabel} → ${endLabel})`;
  }, [form.firstRun, form.endDate, form.scheduleType]);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.walletId) nextErrors.walletId = "Vui lòng chọn ví áp dụng";
    if (!form.categoryId) nextErrors.categoryId = "Vui lòng chọn danh mục";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Số tiền phải lớn hơn 0";
    if (!form.firstRun) nextErrors.firstRun = "Vui lòng chọn thời điểm bắt đầu";
    if (form.scheduleType !== "ONE_TIME" && !form.endDate) nextErrors.endDate = "Vui lòng chọn ngày kết thúc";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const wallet = wallets.find((w) => String(w.walletId || w.id) === String(form.walletId));
    const category = categoryOptions.find((c) => String(c.categoryId || c.id) === String(form.categoryId));

    onSubmit?.({
      transactionType: form.transactionType,
      walletId: wallet?.walletId || wallet?.id || null,
      walletName: wallet?.walletName || wallet?.name || "",
      categoryId: category?.categoryId || category?.id || null,
      categoryName: category?.categoryName || category?.name || "",
      amount: Number(form.amount),
      note: form.note.trim(),
      scheduleType: form.scheduleType,
      firstRun: form.firstRun,
      endDate: form.scheduleType === "ONE_TIME" ? null : form.endDate,
    });
    setForm(DEFAULT_FORM);
  };

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div className="modal__content" style={{ padding: "1.75rem" }}>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="mb-1">Tạo lịch giao dịch</h4>
            <p className="text-muted mb-0">Tự động hóa các khoản thu chi định kỳ.</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng" />
        </div>

        <form className="schedule-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Loại giao dịch</label>
            <div className="btn-group" role="group">
              <input
                type="radio"
                className="btn-check"
                name="schedule-type"
                id="schedule-expense"
                checked={form.transactionType === "expense"}
                onChange={() => setForm((prev) => ({ ...prev, transactionType: "expense", categoryId: "" }))}
              />
              <label className="btn btn-outline-primary" htmlFor="schedule-expense">
                Chi tiêu
              </label>
              <input
                type="radio"
                className="btn-check"
                name="schedule-type"
                id="schedule-income"
                checked={form.transactionType === "income"}
                onChange={() => setForm((prev) => ({ ...prev, transactionType: "income", categoryId: "" }))}
              />
              <label className="btn btn-outline-primary" htmlFor="schedule-income">
                Thu nhập
              </label>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Ví áp dụng</label>
              <select
                className={`form-select ${errors.walletId ? "is-invalid" : ""}`}
                value={form.walletId}
                onChange={handleChange("walletId")}
              >
                <option value="">-- Chọn ví --</option>
                {wallets.map((wallet) => (
                  <option key={wallet.walletId || wallet.id} value={wallet.walletId || wallet.id}>
                    {wallet.walletName || wallet.name}
                  </option>
                ))}
              </select>
              {errors.walletId && <div className="invalid-feedback d-block">{errors.walletId}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Danh mục</label>
              <select
                className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
                value={form.categoryId}
                onChange={handleChange("categoryId")}
              >
                <option value="">-- Chọn danh mục --</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.categoryId || cat.id} value={cat.categoryId || cat.id}>
                    {cat.categoryName || cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <div className="invalid-feedback d-block">{errors.categoryId}</div>}
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="form-label">Số tiền</label>
              <div className="input-group">
                <input
                  type="number"
                  min="0"
                  className={`form-control ${errors.amount ? "is-invalid" : ""}`}
                  value={form.amount}
                  onChange={handleChange("amount")}
                />
                <span className="input-group-text">VND</span>
              </div>
              {errors.amount && <div className="invalid-feedback d-block">{errors.amount}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Ghi chú (tùy chọn)</label>
              <input className="form-control" value={form.note} onChange={handleChange("note")} placeholder="VD: Thanh toán điện" />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold">Kiểu lịch hẹn</label>
            <div className="row g-2 schedule-type-grid">
              {SCHEDULE_TYPES.map((type) => (
                <div className="col-6" key={type.value}>
                  <button
                    type="button"
                    className={`btn w-100 schedule-type-item ${form.scheduleType === type.value ? "active" : ""}`}
                    title={type.tooltip}
                    onClick={() => setForm((prev) => ({ ...prev, scheduleType: type.value }))}
                  >
                    {type.label}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="form-label">Thời điểm đầu tiên</label>
              <input
                type="datetime-local"
                className={`form-control ${errors.firstRun ? "is-invalid" : ""}`}
                value={form.firstRun}
                onChange={handleChange("firstRun")}
              />
              {errors.firstRun && <div className="invalid-feedback d-block">{errors.firstRun}</div>}
            </div>
            {form.scheduleType !== "ONE_TIME" && (
              <div className="col-md-6">
                <label className="form-label">Ngày kết thúc</label>
                <input
                  type="date"
                  className={`form-control ${errors.endDate ? "is-invalid" : ""}`}
                  value={form.endDate}
                  onChange={handleChange("endDate")}
                />
                {errors.endDate && <div className="invalid-feedback d-block">{errors.endDate}</div>}
              </div>
            )}
          </div>

          <div className="alert alert-secondary mt-3" role="alert">
            <strong>Mini preview:</strong> {previewText}.
          </div>

          <p className="text-muted small mb-3">
            (Δ) Hệ thống sẽ kiểm tra số dư ví tại thời điểm chạy. Nếu thiếu tiền, báo cáo "Không đủ số dư" sẽ được ghi nhận.
          </p>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo lịch
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
