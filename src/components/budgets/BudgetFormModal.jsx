import React, { useState, useEffect, useMemo } from "react";
import Modal from "../common/Modal/Modal";
import SearchableSelectInput from "../common/SearchableSelectInput";
import { mapWalletsToSelectOptions, WALLET_TYPE_ICON_CONFIG } from "../../utils/walletSelectHelpers";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
 
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
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
 
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
          ? formatMoneyInput(initialData.limitAmount)
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
    setFormError("");
    setSubmitting(false);
  }, [open, mode, initialData, wallets]);
 
  const handleCategoryChange = (value) => setSelectedCategoryId(value);
  const handleWalletChange = (value) => {
    setSelectedWalletId(value);
    if (value) {
      setWalletCurrency(resolveWalletCurrency(value));
    } else {
      const defaultCurrency = walletList.length === 1
        ? resolveWalletCurrency(walletList[0].id)
        : "VND";
      setWalletCurrency(defaultCurrency);
    }
  };
 
  const handleLimitChange = (e) => {
    handleMoneyInputChange(e, setLimitAmount);
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const limitNumeric = getMoneyValue(limitAmount);
 
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
    if (!limitNumeric || limitNumeric <= 0) {
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
        : null);
 
    const resolvedWalletId =
      walletObj && walletObj.id !== undefined && walletObj.id !== null
        ? walletObj.id
        : null;
 
    const resolvedWalletName =
      walletObj?.name || walletObj?.walletName || initialData?.walletName || (resolvedWalletId === null ? "Tất cả ví" : "");
 
    const payload = {
      categoryId: categoryObj.id || null,
      categoryName: categoryObj.name || initialData?.categoryName || "",
      categoryType: "expense",
      walletId: resolvedWalletId,
      walletName: resolvedWalletName,
      limitAmount: limitNumeric,
      startDate,
      endDate,
      alertPercentage: Number(alertThreshold),
      note: note.trim(),
    };
 
    try {
      setSubmitting(true);
      setFormError("");
      await onSubmit(payload);
      onClose();
    } catch (submitError) {
      const message =
        submitError?.message ||
        submitError?.error ||
        "Không thể lưu hạn mức. Vui lòng kiểm tra lại thông tin.";
      const normalizedMessage =
        message === "budgets.error.duplicate"
          ? "Hạn mức với ví, danh mục và ngày bắt đầu này đã tồn tại."
          : message;
      setFormError(normalizedMessage);
    } finally {
      setSubmitting(false);
    }
  };
 
  const categoryList = categories || [];
  const walletList = wallets || [];
 
  const categoryOptions = useMemo(() => {
    const defaults = categoryList.map((cat) => ({
      value: cat && cat.id !== undefined && cat.id !== null ? String(cat.id) : "",
      label: cat?.name || "",
      icon: cat?.icon || "bi-tags",
      iconColor: "#0b5aa5",
      iconBg: "linear-gradient(135deg, rgba(11,90,165,0.12) 0%, rgba(10,180,190,0.05) 100%)",
    })).filter((opt) => opt.value && opt.label);
 
    if (
      mode === "edit" &&
      selectedCategoryId &&
      !defaults.some((opt) => opt.value === String(selectedCategoryId))
    ) {
      defaults.push({
        value: String(selectedCategoryId),
        label: initialData?.categoryName || "Danh mục đã chọn",
        icon: "bi-bookmark-check",
        iconColor: "#0f172a",
        iconBg: "rgba(15,23,42,0.08)",
      });
    }
    return defaults;
  }, [categoryList, mode, selectedCategoryId, initialData]);
 
  const walletTypeLabels = useMemo(
    () => ({
      personal: "Ví cá nhân",
      shared: "Ví được chia sẻ",
      group: "Ví nhóm",
    }),
    []
  );
 
  const walletOptions = useMemo(() => {
    const options = mapWalletsToSelectOptions(
      walletList,
      walletTypeLabels,
      (wallet) => (wallet?.id !== undefined && wallet?.id !== null ? wallet.id : "")
    );
 
    const normalized = options.filter((opt) => opt.value !== "");
 
    if (
      mode === "edit" &&
      selectedWalletId &&
      !normalized.some((opt) => opt.value === String(selectedWalletId))
    ) {
      const fallbackConfig = WALLET_TYPE_ICON_CONFIG.shared;
      normalized.push({
        value: String(selectedWalletId),
        label: initialData?.walletName || "Ví đã chọn",
        icon: fallbackConfig.icon,
        iconColor: fallbackConfig.color,
        iconBg: fallbackConfig.bg,
      });
    }
 
    return normalized;
  }, [walletList, walletTypeLabels, mode, selectedWalletId, initialData]);
 
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
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}
          {/* Category Selector */}
          <div className="mb-3">
            <SearchableSelectInput
              label="Chọn Danh mục"
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder="-- Chọn danh mục --"
              disabled={mode === "edit"}
              emptyMessage="Không có danh mục phù hợp"
              error={errors.category}
            />
            {mode === "edit" && (
              <div className="form-text text-muted">
                Không thể thay đổi danh mục khi chỉnh sửa hạn mức.
              </div>
            )}
          </div>
 
          {/* Wallet Selector */}
          <div className="mb-3">
            <SearchableSelectInput
              label="Áp dụng cho Ví"
              value={selectedWalletId}
              onChange={handleWalletChange}
              options={walletOptions}
              placeholder="-- Chọn ví --"
              disabled={mode === "edit"}
              emptyMessage="Không có ví khả dụng"
              error={errors.wallet}
            />
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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang xử lý...
                </span>
              ) : mode === "create" ? (
                "Thêm Hạn mức"
              ) : (
                "Cập nhật"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
 
 