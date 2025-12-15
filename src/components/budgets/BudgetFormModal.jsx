import React, { useState, useEffect, useMemo } from "react";
import Modal from "../common/Modal/Modal";
import SearchableSelectInput from "../common/SearchableSelectInput";
import { mapWalletsToSelectOptions, WALLET_TYPE_ICON_CONFIG } from "../../utils/walletSelectHelpers";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
import { useLanguage } from "../../contexts/LanguageContext";

const ALL_WALLETS_LABEL = "Tất cả ví";
 
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
  const [selectedWalletLabel, setSelectedWalletLabel] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("VND");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();
 
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
        setSelectedWalletLabel(initialData.walletName || "");
      } else if (initialData.walletName) {
        setSelectedWalletId("__legacy__");
        setSelectedWalletLabel(initialData.walletName || ALL_WALLETS_LABEL);
      } else {
        setSelectedWalletId("");
        setSelectedWalletLabel("");
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
      setSelectedWalletLabel("");
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
      const matchedOption = walletOptions.find((opt) => opt.value === String(value));
      setSelectedWalletLabel(matchedOption?.label || "");
      setWalletCurrency(resolveWalletCurrency(value));
    } else {
      setSelectedWalletLabel("");
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
      newErrors.category = t('budgets.error.category');
    }
    const walletRequired = !(mode === "edit" && (initialData?.walletId === null || initialData?.walletId === undefined));
    if (walletRequired && !selectedWalletId) {
      newErrors.wallet = t('budgets.error.wallet');
    }

    if (selectedWalletId) {
      const currencyCode = resolveWalletCurrency(selectedWalletId);
      if (currencyCode !== "VND") {
        newErrors.wallet = t('budgets.error.wallet_vnd_only');
      }
    }
    if (!limitNumeric || limitNumeric <= 0) {
      newErrors.limit = t('budgets.error.limit_required');
    }
    if (!startDate) {
      newErrors.startDate = t('budgets.error.start_date');
    }
    if (!endDate) {
      newErrors.endDate = t('budgets.error.end_date');
    }
    if (startDateObj && startDateObj < today) {
      newErrors.startDate = t('budgets.error.start_date_past');
    }
    if (startDateObj && endDateObj && endDateObj <= startDateObj) {
      newErrors.endDate = t('budgets.error.date_range');
    }
    if (alertThreshold < 50 || alertThreshold > 100) {
      newErrors.alertThreshold = t('budgets.error.alert_threshold');
    }
 
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
 
    const categoryObj = categories.find((c) => String(c.id) === String(selectedCategoryId)) || {};
    const walletObj =
      wallets.find((w) => String(w.id) === String(selectedWalletId)) ||
      (mode === "edit" && (initialData?.walletId === null || initialData?.walletId === undefined)
        ? { id: null, name: initialData?.walletName || ALL_WALLETS_LABEL }
        : null);
 
    const resolvedWalletId =
      walletObj && walletObj.id !== undefined && walletObj.id !== null
        ? walletObj.id
        : null;
 
    const resolvedWalletName =
      resolvedWalletId === null
        ? (initialData?.walletName || ALL_WALLETS_LABEL)
        : (walletObj?.name || walletObj?.walletName || selectedWalletLabel || initialData?.walletName || "");
 
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
  const vndWallets = useMemo(
    () =>
      walletList.filter((w) => {
        const code = (w?.currency || w?.currencyCode || "").toUpperCase();
        return code === "VND";
      }),
    [walletList]
  );
 
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
      vndWallets,
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
  }, [walletList, walletTypeLabels, mode, selectedWalletId, initialData, vndWallets]);
 
  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="modal__content budget-form-modal" style={{ padding: "2rem" }}>
        <button
          type="button"
          className="btn-close budget-form-close"
          aria-label={t('common.close')}
          onClick={onClose}
        />
        <div className="budget-form-breadcrumbs">
          <span>{t('budgets.form.breadcrumb_budget')}</span>
          <i className="bi bi-chevron-right" />
          <strong>{mode === "create" ? t('budgets.form.breadcrumb_create') : t('budgets.form.breadcrumb_edit')}</strong>
        </div>
        <h4 className="mb-3" style={{ fontWeight: 600, color: "#212529" }}>
          {mode === "create" ? t('budgets.form.title_create') : t('budgets.form.title_edit')}
        </h4>
        <div className="budget-form-info mb-4">
          <i className="bi bi-info-circle" />
          <div>
            <p>{t('budgets.form.info_desc')}</p>
            <span>{t('budgets.form.info_alert')}</span>
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
              label={t('budgets.form.category_label')}
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder={t('budgets.form.category_placeholder')}
              disabled={mode === "edit"}
              emptyMessage={t('budgets.form.category_empty')}
              error={errors.category}
            />
            {mode === "edit" && (
              <div className="form-text text-muted">
                {t('budgets.form.category_edit_hint')}
              </div>
            )}
          </div>
 
          {/* Wallet Selector */}
          <div className="mb-3">
            <SearchableSelectInput
              label={t('budgets.form.wallet_label')}
              value={selectedWalletId}
              onChange={handleWalletChange}
              options={walletOptions}
              placeholder={t('budgets.form.wallet_placeholder')}
              disabled={mode === "edit"}
              emptyMessage={t('budgets.form.wallet_empty')}
              error={errors.wallet}
            />
            {mode === "edit" && (
              <div className="form-text text-muted">
                {t('budgets.form.wallet_edit_hint')}
              </div>
            )}
          </div>
 
          {/* Limit Amount */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.limit_label', { currency: walletCurrency })}</label>
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
            <label className="form-label fw-semibold">{t('budgets.form.date_range_label')}</label>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-text small mb-1 d-block">{t('budgets.form.start_date_label')}</label>
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
                <label className="form-text small mb-1 d-block">{t('budgets.form.end_date_label')}</label>
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
            <div className="form-text mt-2">{t('budgets.form.date_range_hint')}</div>
          </div>
 
          {/* Alert threshold */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.alert_threshold_label')}</label>
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
            <div className="form-text">{t('budgets.form.alert_threshold_hint')}</div>
          </div>
 
          {/* Notes */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.note_label')}</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={t('budgets.form.note_placeholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="form-text">{t('budgets.form.note_hint')}</div>
          </div>
 
          {/* Buttons */}
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              {t('budgets.form.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {t('budgets.form.processing')}
                </span>
              ) : mode === "create" ? (
                t('budgets.form.submit_create')
              ) : (
                t('budgets.form.submit_update')
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
 
 