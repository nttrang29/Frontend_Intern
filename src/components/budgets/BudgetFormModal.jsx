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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("VND");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  const resolveWalletCurrency = (walletId) => {
    const wallet = wallets.find((w) => String(w.id) === String(walletId));
    const code = wallet?.currency || wallet?.currencyCode;
    return (code || "VND").toUpperCase();
  };

  useEffect(() => {
    if (initialData && mode === "edit") {
      setSelectedCategoryId(initialData.categoryId ? String(initialData.categoryId) : "");
      if (initialData.walletId !== null && initialData.walletId !== undefined) {
        setSelectedWalletId(String(initialData.walletId));
      } else if (initialData.walletName) {
        setSelectedWalletId("__legacy__");
      } else {
        setSelectedWalletId("");
      }
      setLimitAmount(
        initialData.limitAmount !== undefined && initialData.limitAmount !== null
          ? String(initialData.limitAmount)
          : ""
      );
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      setAlertThreshold(initialData.alertPercentage ?? 90);
      setNote(initialData.note || "");
      const initialCurrency =
        initialData.currencyCode ||
        resolveWalletCurrency(initialData.walletId) ||
        "VND";
      setWalletCurrency(initialCurrency);
    } else {
      setSelectedCategoryId("");
      setSelectedWalletId("");
      setLimitAmount("");
      setStartDate("");
      setEndDate("");
      setAlertThreshold(90);
      setNote("");
      const defaultCurrency =
        wallets.length === 1 ? resolveWalletCurrency(wallets[0].id) : "VND";
      setWalletCurrency(defaultCurrency);
    }
    setErrors({});
  }, [open, mode, initialData, wallets]);

  const handleCategoryChange = (e) => setSelectedCategoryId(e.target.value);
  const handleWalletChange = (e) => {
    const value = e.target.value;
    setSelectedWalletId(value);
    if (value) {
      setWalletCurrency(resolveWalletCurrency(value));
    }
  };

  const handleLimitChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setLimitAmount(val);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    if (startDateObj) startDateObj.setHours(0, 0, 0, 0);
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);

    if (!selectedCategoryId) {
      newErrors.category = "Vui lòng chọn danh mục";
    }
    const walletRequired = !(mode === "edit" && (initialData?.walletId === null || initialData?.walletId === undefined));
    if (walletRequired && !selectedWalletId) {
      newErrors.wallet = "Vui lòng chọn ví áp dụng hạn mức";
    }
    if (!limitAmount || limitAmount === "0" || Number(limitAmount) <= 0) {
      newErrors.limit = "Vui lòng nhập hạn mức lớn hơn 0";
    }
    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }
    if (!endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }
    if (startDateObj && startDateObj < today) {
      newErrors.startDate = "Ngày bắt đầu không được nhỏ hơn ngày hiện tại";
    }
    if (startDateObj && endDateObj && endDateObj <= startDateObj) {
      newErrors.endDate = "Ngày kết thúc phải lớn hơn ngày bắt đầu";
    }
    if (alertThreshold < 50 || alertThreshold > 100) {
      newErrors.alertThreshold = "Ngưỡng cảnh báo phải trong khoảng 50% - 100%";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const categoryObj = categories.find((c) => String(c.id) === String(selectedCategoryId)) || {};
    const walletObj =
      wallets.find((w) => String(w.id) === String(selectedWalletId)) ||
      (mode === "edit" && (initialData?.walletId === null || initialData?.walletId === undefined)
        ? { id: null, name: initialData?.walletName || "Tất cả ví" }
        : {});

    const payload = {
      categoryId: categoryObj.id || null,
      categoryName: categoryObj.name || initialData?.categoryName || "",
      categoryType: "expense",
      walletId: walletObj.id || null,
      walletName: walletObj.name || initialData?.walletName || "",
      limitAmount: Number(limitAmount),
      startDate,
      endDate,
      alertPercentage: Number(alertThreshold),
      note: note.trim(),
    };

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
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              disabled={mode === "edit"}
            >
              <option value="">-- Chọn danh mục --</option>
              {categoryList.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
              {mode === "edit" &&
                selectedCategoryId &&
                !categoryList.some((cat) => String(cat.id) === String(selectedCategoryId)) && (
                  <option value={selectedCategoryId}>
                    {initialData?.categoryName || "Danh mục đã chọn"}
                  </option>
                )}
            </select>
            {errors.category && (
              <div className="invalid-feedback d-block">{errors.category}</div>
            )}
            {mode === "edit" && (
              <div className="form-text text-muted">
                Không thể thay đổi danh mục khi chỉnh sửa hạn mức.
              </div>
            )}
          </div>

          {/* Wallet Selector */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Áp dụng cho Ví</label>
            <select
              className={`form-select ${errors.wallet ? "is-invalid" : ""}`}
              value={selectedWalletId}
              onChange={handleWalletChange}
              disabled={mode === "edit"}
            >
              <option value="">-- Chọn ví --</option>
              {walletList.map((w) => (
                <option key={w.id || w.name} value={w.id !== undefined && w.id !== null ? String(w.id) : ""}>
                  {w.name}
                </option>
              ))}
              {mode === "edit" &&
                selectedWalletId &&
                !walletList.some((w) => String(w.id) === String(selectedWalletId)) && (
                  <option value={selectedWalletId}>
                    {initialData?.walletName || "Ví đã chọn"}
                  </option>
                )}
            </select>
            {errors.wallet && (
              <div className="invalid-feedback d-block">{errors.wallet}</div>
            )}
            {mode === "edit" && (
              <div className="form-text text-muted">
                Không thể thay đổi ví áp dụng khi chỉnh sửa.
              </div>
            )}
          </div>

          {/* Limit Amount */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Hạn mức Chi tiêu ({walletCurrency})</label>
            <div className="input-group">
              <input
                type="text"
                className={`form-control ${errors.limit ? "is-invalid" : ""}`}
                placeholder="0"
                value={limitAmount}
                onChange={handleLimitChange}
              />
              <span className="input-group-text">{walletCurrency}</span>
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
