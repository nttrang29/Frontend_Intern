import React, { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal/Modal";
import SearchableSelectInput from "../common/SearchableSelectInput";
import {
  formatVietnamDate,
  formatVietnamDateTime,
} from "../../utils/dateFormat";

const SCHEDULE_TYPES = [
  {
    value: "ONE_TIME",
    label: "Một lần",
    tooltip: "Chỉ thực hiện một lần vào ngày đã chọn",
  },
  {
    value: "DAILY",
    label: "Hằng ngày",
    tooltip: "Lặp lại hàng ngày vào giờ đã chọn",
  },
  {
    value: "WEEKLY",
    label: "Hằng tuần",
    tooltip: "Chạy mỗi tuần vào cùng ngày / giờ",
  },
  { value: "MONTHLY", label: "Hằng tháng", tooltip: "Tự động chạy mỗi tháng" },
  {
    value: "YEARLY",
    label: "Hằng năm",
    tooltip: "Lặp lại vào cùng ngày mỗi năm",
  },
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
    () =>
      (form.transactionType === "income"
        ? incomeCategories
        : expenseCategories) || [],
    [form.transactionType, expenseCategories, incomeCategories]
  );

  // Format wallet options for SearchableSelectInput
  const walletSelectOptions = useMemo(() => {
    return wallets.map((wallet) => ({
      value: String(wallet.walletId || wallet.id),
      label: wallet.walletName || wallet.name,
    }));
  }, [wallets]);

  // Format category options for SearchableSelectInput
  const categorySelectOptions = useMemo(() => {
    return categoryOptions.map((cat) => ({
      value: String(cat.categoryId || cat.id),
      label: cat.categoryName || cat.name,
    }));
  }, [categoryOptions]);

  const previewText = useMemo(() => {
    if (!form.firstRun) return "Chưa chọn thời điểm chạy";
    const start = new Date(form.firstRun);
    if (Number.isNaN(start.getTime())) return "Chưa chọn thời điểm chạy";

    const startLabel = formatVietnamDateTime(start) || "";

    if (form.scheduleType === "ONE_TIME" || !form.endDate) {
      return `Sẽ chạy từ ${startLabel}`;
    }

    const end = new Date(form.endDate);
    if (Number.isNaN(end.getTime()) || end <= start) {
      return `Bắt đầu ${startLabel}`;
    }

    const diffDays = Math.max(
      1,
      Math.floor((end - start) / (1000 * 60 * 60 * 24))
    );
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

    const endLabel = formatVietnamDate(end) || "";
    return `Ước tính chạy ${estimate} lần (từ ${startLabel} → ${endLabel})`;
  }, [form.firstRun, form.endDate, form.scheduleType]);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Format money input like TopupTab - Vietnamese format (dots for thousands, comma for decimal)
  const handleAmountChange = (e) => {
    let value = e.target.value;
    // Remove invalid characters - only allow digits, dots, and comma
    value = value.replace(/[^\d.,]/g, "");
    // Only allow one comma (decimal separator)
    const parts = value.split(",");
    if (parts.length > 2) {
      value = parts[0] + "," + parts.slice(1).join("");
    }
    // Format integer part with dots every 3 digits
    let integerPart = parts[0].replace(/\./g, "");
    if (integerPart.length > 0) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    // Combine with decimal part if exists
    const formattedValue =
      parts.length > 1 ? integerPart + "," + parts[1] : integerPart;
    setForm((prev) => ({ ...prev, amount: formattedValue }));
  };

  // Parse formatted amount to number (e.g., "1.234.567,89" -> 1234567.89)
  const parseFormattedAmount = (formattedValue) => {
    if (!formattedValue) return 0;
    // Remove dots (thousands separator) and replace comma with dot (decimal)
    const cleaned = String(formattedValue).replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // Get current datetime in local format for min attribute
  const nowLocalDatetime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  // Calculate minimum end date based on schedule type and firstRun
  const minEndDate = useMemo(() => {
    if (!form.firstRun) return "";
    const startDate = new Date(form.firstRun);
    if (Number.isNaN(startDate.getTime())) return "";

    let minDate = new Date(startDate);
    switch (form.scheduleType) {
      case "DAILY":
        minDate.setDate(minDate.getDate() + 1); // At least 1 day later
        break;
      case "WEEKLY":
        minDate.setDate(minDate.getDate() + 7); // At least 1 week later
        break;
      case "MONTHLY":
        minDate.setMonth(minDate.getMonth() + 1); // At least 1 month later
        break;
      case "YEARLY":
        minDate.setFullYear(minDate.getFullYear() + 1); // At least 1 year later
        break;
      default:
        minDate.setDate(minDate.getDate() + 1);
    }

    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, "0");
    const day = String(minDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [form.firstRun, form.scheduleType]);

  // Get label for minimum end date requirement
  const minEndDateLabel = useMemo(() => {
    switch (form.scheduleType) {
      case "DAILY":
        return "ít nhất 1 ngày sau";
      case "WEEKLY":
        return "ít nhất 1 tuần sau";
      case "MONTHLY":
        return "ít nhất 1 tháng sau";
      case "YEARLY":
        return "ít nhất 1 năm sau";
      default:
        return "";
    }
  }, [form.scheduleType]);

  // Validate and auto-correct endDate when firstRun or scheduleType changes
  useEffect(() => {
    if (form.scheduleType === "ONE_TIME" || !form.firstRun || !form.endDate)
      return;

    const endDateValue = new Date(form.endDate);
    const minDateValue = new Date(minEndDate);

    if (
      !Number.isNaN(endDateValue.getTime()) &&
      !Number.isNaN(minDateValue.getTime())
    ) {
      if (endDateValue < minDateValue) {
        setForm((prev) => ({ ...prev, endDate: minEndDate }));
      }
    }
  }, [form.firstRun, form.scheduleType, minEndDate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.walletId) nextErrors.walletId = "Vui lòng chọn ví áp dụng";
    if (!form.categoryId) nextErrors.categoryId = "Vui lòng chọn danh mục";
    const parsedAmount = parseFormattedAmount(form.amount);
    if (!form.amount || parsedAmount <= 0)
      nextErrors.amount = "Số tiền phải lớn hơn 0";

    // Validate firstRun - must not be in the past (allow 2 minutes tolerance)
    if (!form.firstRun) {
      nextErrors.firstRun = "Vui lòng chọn thời điểm bắt đầu";
    } else {
      const firstRunDate = new Date(form.firstRun);
      const now = new Date();

      if (firstRunDate < now) {
        nextErrors.firstRun = "Thời điểm bắt đầu không được ở quá khứ";
      }
    }

    // Validate endDate for recurring schedules
    if (form.scheduleType !== "ONE_TIME") {
      if (!form.endDate) {
        nextErrors.endDate = "Vui lòng chọn ngày kết thúc";
      } else if (minEndDate) {
        const endDateValue = new Date(form.endDate);
        const minDateValue = new Date(minEndDate);
        if (endDateValue < minDateValue) {
          nextErrors.endDate = `Ngày kết thúc phải ${minEndDateLabel}`;
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const wallet = wallets.find(
      (w) => String(w.walletId || w.id) === String(form.walletId)
    );
    const category = categoryOptions.find(
      (c) => String(c.categoryId || c.id) === String(form.categoryId)
    );

    onSubmit?.({
      transactionType: form.transactionType,
      walletId: wallet?.walletId || wallet?.id || null,
      walletName: wallet?.walletName || wallet?.name || "",
      categoryId: category?.categoryId || category?.id || null,
      categoryName: category?.categoryName || category?.name || "",
      amount: parseFormattedAmount(form.amount),
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
            <p className="text-muted mb-0">
              Tự động hóa các khoản thu chi định kỳ.
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Đóng"
          />
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
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    transactionType: "expense",
                    categoryId: "",
                  }))
                }
              />
              <label
                className="btn btn-outline-primary"
                htmlFor="schedule-expense"
              >
                Chi tiêu
              </label>
              <input
                type="radio"
                className="btn-check"
                name="schedule-type"
                id="schedule-income"
                checked={form.transactionType === "income"}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    transactionType: "income",
                    categoryId: "",
                  }))
                }
              />
              <label
                className="btn btn-outline-primary"
                htmlFor="schedule-income"
              >
                Thu nhập
              </label>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <SearchableSelectInput
                label="Ví áp dụng"
                value={form.walletId}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, walletId: val }))
                }
                options={walletSelectOptions}
                placeholder="-- Chọn ví --"
                emptyMessage="Không tìm thấy ví"
                error={errors.walletId}
              />
            </div>

            <div className="col-md-6">
              <SearchableSelectInput
                label="Danh mục"
                value={form.categoryId}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, categoryId: val }))
                }
                options={categorySelectOptions}
                placeholder="-- Chọn danh mục --"
                emptyMessage="Không tìm thấy danh mục"
                error={errors.categoryId}
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="form-label">Số tiền</label>
              <div className="input-group">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`form-control ${
                    errors.amount ? "is-invalid" : ""
                  }`}
                  value={form.amount}
                  onChange={handleAmountChange}
                  placeholder="VD: 1.000.000"
                />
                <span className="input-group-text">VND</span>
              </div>
              {errors.amount && (
                <div className="invalid-feedback d-block">{errors.amount}</div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Ghi chú (tùy chọn)</label>
              <input
                className="form-control"
                value={form.note}
                onChange={handleChange("note")}
                placeholder="VD: Thanh toán điện"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold">Kiểu lịch hẹn</label>
            <div className="row g-2 schedule-type-grid">
              {SCHEDULE_TYPES.map((type) => (
                <div className="col-6" key={type.value}>
                  <button
                    type="button"
                    className={`btn w-100 schedule-type-item ${
                      form.scheduleType === type.value ? "active" : ""
                    }`}
                    title={type.tooltip}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, scheduleType: type.value }))
                    }
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
                className={`form-control ${
                  errors.firstRun ? "is-invalid" : ""
                }`}
                value={form.firstRun}
                onChange={handleChange("firstRun")}
                min={nowLocalDatetime}
              />
              {errors.firstRun && (
                <div className="invalid-feedback d-block">
                  {errors.firstRun}
                </div>
              )}
              <small className="text-muted">
                Không được chọn thời gian trong quá khứ
              </small>
            </div>
            {form.scheduleType !== "ONE_TIME" && (
              <div className="col-md-6">
                <label className="form-label">Ngày kết thúc</label>
                <input
                  type="date"
                  className={`form-control ${
                    errors.endDate ? "is-invalid" : ""
                  }`}
                  value={form.endDate}
                  onChange={handleChange("endDate")}
                  min={minEndDate}
                />
                {errors.endDate && (
                  <div className="invalid-feedback d-block">
                    {errors.endDate}
                  </div>
                )}
                {minEndDateLabel && (
                  <small className="text-muted">
                    Phải {minEndDateLabel} ngày bắt đầu
                  </small>
                )}
              </div>
            )}
          </div>

          <div className="alert alert-secondary mt-3" role="alert">
            <strong>Mini preview:</strong> {previewText}.
          </div>

          <p className="text-muted small mb-3">
            (Δ) Hệ thống sẽ kiểm tra số dư ví tại thời điểm chạy. Nếu thiếu
            tiền, báo cáo "Không đủ số dư" sẽ được ghi nhận.
          </p>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
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
