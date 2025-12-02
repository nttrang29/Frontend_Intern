import React, { useState, useEffect } from "react";
import Modal from "../common/Modal/Modal";

export default function BudgetFormModal({
  open,
  mode, // 'create' or 'edit'
  initialData, // { categoryId, categoryName, categoryType, limitAmount, walletId }
  categories = [], // expense categories array
  wallets = [], // wallet list from WalletDataContext
  onSubmit,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && mode === "edit") {
      setSelectedCategory(initialData.categoryName);
      setLimitAmount(initialData.limitAmount);
      setCurrency(initialData.currency || "VND");
      // If wallet info exists on initialData, preselect
      setSelectedWallet(initialData.walletId || initialData.walletName || "");
      // Set dates from initialData if available
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      setAlertThreshold(initialData.alertPercentage ?? 90);
      setNote(initialData.note || "");
    } else {
      setSelectedCategory("");
      setSelectedWallet("");
      setLimitAmount("");
      setCurrency("VND");
      setStartDate("");
      setEndDate("");
      setAlertThreshold(90);
      setNote("");
    }
    setErrors({});
  }, [open, mode, initialData]);

  const handleCategoryChange = (e) => setSelectedCategory(e.target.value);
  const handleWalletChange = (e) => setSelectedWallet(e.target.value);

  const handleLimitChange = (e) => {
    const val = e.target.value;
    // allow numbers and decimal point for USD
    if (currency === "USD") {
      // Allow decimal for USD
      if (/^\d*\.?\d{0,2}$/.test(val)) {
        setLimitAmount(val);
      }
    } else {
      // Only integers for VND
      if (/^\d*$/.test(val)) {
        setLimitAmount(val);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!selectedCategory) {
      newErrors.category = "Vui lòng chọn danh mục";
    }
    // wallet optional but recommended
    if (!selectedWallet) {
      newErrors.wallet = "Vui lòng chọn ví áp dụng hạn mức";
    }
    if (!limitAmount || limitAmount === "0") {
      newErrors.limit = "Vui lòng nhập hạn mức lớn hơn 0";
    }
    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }
    if (!endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.dateRange = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (alertThreshold < 50 || alertThreshold > 100) {
      newErrors.alertThreshold = "Ngưỡng cảnh báo phải trong khoảng 50% - 100%";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const categoryObj = categories.find((c) => c.name === selectedCategory) || {};
    // support special 'ALL' value meaning apply to all wallets
    let payload = {
      categoryId: categoryObj.id || null,
      categoryName: selectedCategory,
      categoryType: "expense",
      limitAmount: parseFloat(limitAmount),
      currency: currency,
      startDate,
      endDate,
      alertPercentage: Number(alertThreshold),
      note: note.trim(),
    };

    if (selectedWallet === "ALL") {
      payload = { ...payload, walletId: null, walletName: "Tất cả ví" };
    } else {
      const walletObj = wallets.find((w) => String(w.id) === String(selectedWallet)) || wallets.find((w) => w.name === selectedWallet) || {};
      payload = { ...payload, walletId: walletObj.id || null, walletName: walletObj.name || selectedWallet || null };
    }

    onSubmit(payload);
    onClose();
  };

  const categoryList = categories || [];
  const walletList = wallets || [];

  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="modal__content budget-form-modal" style={{ padding: "2rem" }}>
        <button
          type="button"
          className="btn-close budget-form-close"
          aria-label="Đóng"
          onClick={onClose}
        />
        <div className="budget-form-breadcrumbs">
          <span>Ngân sách</span>
          <i className="bi bi-chevron-right" />
          <strong>{mode === "create" ? "Tạo hạn mức" : "Chỉnh sửa hạn mức"}</strong>
        </div>
        <h4 className="mb-3" style={{ fontWeight: 600, color: "#212529" }}>
          {mode === "create" ? "Thêm Hạn mức Chi tiêu Mới" : "Chỉnh sửa Hạn mức Chi tiêu"}
        </h4>
        <div className="budget-form-info mb-4">
          <i className="bi bi-info-circle" />
          <div>
            <p>Thiết lập hạn mức theo danh mục và ví cụ thể để dễ dàng theo dõi tiến độ chi tiêu.</p>
            <span>Bạn có thể bật cảnh báo khi mức sử dụng đạt ngưỡng mong muốn.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category Selector */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Chọn Danh mục</label>
            <select
              className={`form-select ${errors.category ? "is-invalid" : ""}`}
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">-- Chọn danh mục --</option>
              {categoryList.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <div className="invalid-feedback d-block">{errors.category}</div>
            )}
          </div>

          {/* Wallet Selector */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Áp dụng cho Ví</label>
            <select
              className={`form-select ${errors.wallet ? "is-invalid" : ""}`}
              value={selectedWallet}
              onChange={handleWalletChange}
            >
              <option value="">-- Chọn ví --</option>
              <option value="ALL">Áp dụng cho tất cả ví</option>
              {walletList.map((w) => (
                <option key={w.id || w.name} value={w.id ?? w.name}>
                  {w.name}
                </option>
              ))}
            </select>
            {errors.wallet && (
              <div className="invalid-feedback d-block">{errors.wallet}</div>
            )}
          </div>

          {/* Limit Amount */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Hạn mức Chi tiêu ({currency})</label>
            <div className="input-group">
              <input
                type="text"
                className={`form-control ${errors.limit ? "is-invalid" : ""}`}
                placeholder={currency === "USD" ? "0.00" : "0"}
                value={limitAmount}
                onChange={handleLimitChange}
              />
              <select 
                className="form-select" 
                style={{ maxWidth: "100px" }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
            {errors.limit && (
              <div className="invalid-feedback d-block">{errors.limit}</div>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Khoảng thời gian áp dụng</label>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-text small mb-1 d-block">Từ ngày</label>
                <input
                  type="date"
                  className={`form-control ${errors.startDate ? "is-invalid" : ""}`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {errors.startDate && (
                  <div className="invalid-feedback d-block">{errors.startDate}</div>
                )}
              </div>
              <div className="col-6">
                <label className="form-text small mb-1 d-block">Đến ngày</label>
                <input
                  type="date"
                  className={`form-control ${errors.endDate ? "is-invalid" : ""}`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {errors.endDate && (
                  <div className="invalid-feedback d-block">{errors.endDate}</div>
                )}
              </div>
            </div>
            {errors.dateRange && (
              <div className="invalid-feedback d-block" style={{ marginTop: "0.5rem" }}>
                {errors.dateRange}
              </div>
            )}
            <div className="form-text mt-2">Hạn mức sẽ được theo dõi trong khoảng thời gian này.</div>
          </div>

          {/* Alert threshold */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Ngưỡng cảnh báo (%)</label>
            <input
              type="range"
              className="form-range"
              min="50"
              max="100"
              step="5"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>50%</span>
              <span>{alertThreshold}%</span>
              <span>100%</span>
            </div>
            {errors.alertThreshold && (
              <div className="invalid-feedback d-block">{errors.alertThreshold}</div>
            )}
            <div className="form-text">Gửi cảnh báo khi mức sử dụng đạt ngưỡng này.</div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Ghi chú (tùy chọn)</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Nhập lưu ý nội bộ cho hạn mức này"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="form-text">Ghi chú sẽ hiển thị trong thẻ hạn mức để cả nhóm dễ theo dõi.</div>
          </div>

          {/* Buttons */}
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? "Thêm Hạn mức" : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
