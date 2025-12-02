// src/components/transactions/TransactionForm.jsx
// Component form tạo giao dịch (không phải modal) - dùng cho layout inline
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { getVietnamDateTime, convertToVietnamDateTime, formatMoney } from "./utils/transactionUtils";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { getRate, formatConvertedBalance } from "../wallets/utils/walletUtils";

const EMPTY_FORM = {
  type: "expense",
  walletName: "",
  amount: "",
  date: "",
  category: "Ăn uống",
  note: "",
  currency: "VND",
  attachment: "",
  sourceWallet: "",
  targetWallet: "",
};

function SelectInput({
  label,
  value,
  onChange,
  options = [],
  required = true,
  disabled = false,
  emptyMessage,
}) {
  const { t } = useLanguage();
  const handleSelect = (e) => {
    onChange(e.target.value);
  };

  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      {hasOptions ? (
        <select
          className="form-select"
          value={value || ""}
          onChange={handleSelect}
          required={required}
          disabled={disabled}
        >
          <option value="">{t("transactions.form.select_option")}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-muted small">
          {emptyMessage || t("common.no_data") || "Không có dữ liệu để hiển thị."}
        </div>
      )}
    </div>
  );
}

export default function TransactionForm({
  mode = "create",
  initialData,
  onSubmit,
  variant = "external",
  onReset,
  expanded,
  onToggleExpand,
  availableWallets,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [categorySearchText, setCategorySearchText] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categorySelectRef = useRef(null);
  const { t } = useLanguage();
  
  useOnClickOutside(categorySelectRef, () => setCategoryDropdownOpen(false));

  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets: walletListFromContext } = useWalletData();
  const walletList = useMemo(() => {
    if (Array.isArray(availableWallets)) {
      return availableWallets;
    }
    return walletListFromContext || [];
  }, [availableWallets, walletListFromContext]);

  const defaultWallet = walletList.find(w => w.isDefault === true);

  // Initialize form
  useEffect(() => {
    const now = getVietnamDateTime();
    if (variant === "internal") {
      if (mode === "edit" && initialData) {
        let dateValue = "";
        if (initialData.date) {
          dateValue = convertToVietnamDateTime(initialData.date);
        }
        setForm({
          ...EMPTY_FORM,
          type: "transfer",
          sourceWallet: initialData.sourceWallet || "",
          targetWallet: initialData.targetWallet || "",
          amount: String(initialData.amount ?? ""),
          date: dateValue || now,
          category: initialData.category || "Chuyển tiền giữa các ví",
          note: initialData.note || "",
          currency: initialData.currency || "VND",
          attachment: initialData.attachment || "",
        });
        setAttachmentPreview(initialData.attachment || "");
      } else {
        setForm({
          ...EMPTY_FORM,
          type: "transfer",
          date: getVietnamDateTime(),
          category: "Chuyển tiền giữa các ví",
        });
        setAttachmentPreview("");
      }
    } else {
      if (mode === "edit" && initialData) {
        let dateValue = "";
        if (initialData.date) {
          dateValue = convertToVietnamDateTime(initialData.date);
        }
        setForm({
          ...EMPTY_FORM,
          type: initialData.type,
          walletName: initialData.walletName,
          amount: String(initialData.amount),
          date: dateValue || getVietnamDateTime(),
          category: initialData.category,
          note: initialData.note || "",
          currency: initialData.currency || "VND",
          attachment: initialData.attachment || "",
        });
        setAttachmentPreview(initialData.attachment || "");
      } else {
        const defaultWalletName = defaultWallet?.name || "";
        const defaultCurrency = defaultWallet?.currency || "VND";
        setForm({ 
          ...EMPTY_FORM, 
          date: getVietnamDateTime(),
          walletName: defaultWalletName,
          currency: defaultCurrency,
        });
        setAttachmentPreview("");
      }
    }
  }, [mode, initialData, variant, defaultWallet]);

  // Category options với icon và sắp xếp (mới tạo lên đầu)
  const categoryOptionsWithIcon = useMemo(() => {
    const source = form.type === "income" ? incomeCategories : expenseCategories;
    if (!source || source.length === 0) return [];
    
    // Sắp xếp: danh mục mới tạo (id lớn hơn) lên đầu
    const sorted = [...source].sort((a, b) => {
      const aId = a.id || a.categoryId || 0;
      const bId = b.id || b.categoryId || 0;
      return bId - aId; // Mới nhất lên đầu
    });
    
    return sorted.map((c) => ({
      name: c.name || c.categoryName || "",
      icon: c.icon || "bi-tags",
      id: c.id || c.categoryId,
    })).filter(c => c.name);
  }, [form.type, expenseCategories, incomeCategories]);

  const categoryOptions = useMemo(() => {
    return categoryOptionsWithIcon.map(c => c.name);
  }, [categoryOptionsWithIcon]);

  // Filtered categories dựa trên search text
  const filteredCategories = useMemo(() => {
    if (!categorySearchText.trim()) {
      return categoryOptionsWithIcon;
    }
    const keyword = categorySearchText.toLowerCase();
    return categoryOptionsWithIcon.filter(cat => 
      cat.name.toLowerCase().includes(keyword)
    );
  }, [categoryOptionsWithIcon, categorySearchText]);

  // Lấy icon của category đã chọn
  const selectedCategoryIcon = useMemo(() => {
    if (!form.category) return null;
    const found = categoryOptionsWithIcon.find(c => c.name === form.category);
    return found?.icon || "bi-tags";
  }, [form.category, categoryOptionsWithIcon]);

  const walletOptions = useMemo(() => {
    if (!walletList || walletList.length === 0) return [];
    return walletList.map((w) => w.name).filter(Boolean);
  }, [walletList]);

  const targetWalletOptions = useMemo(() => {
    if (!walletList || walletList.length === 0) return [];
    if (!form.sourceWallet) return walletList.map((w) => w.name).filter(Boolean);
    return walletList
      .filter((w) => w.name !== form.sourceWallet)
      .map((w) => w.name)
      .filter(Boolean);
  }, [walletList, form.sourceWallet]);

  const selectedWallet = walletList?.find(w => w.name === form.walletName);
  const sourceWallet = walletList?.find(w => w.name === form.sourceWallet);
  const targetWallet = walletList?.find(w => w.name === form.targetWallet);

  const amountNum = getMoneyValue(form.amount);
  const walletBalance = Number(selectedWallet?.balance || 0);
  const sourceWalletBalance = Number(sourceWallet?.balance || 0);

  // Kiểm tra ví khác loại tiền tệ (cho chuyển tiền giữa các ví)
  const sourceCurrency = sourceWallet?.currency || "VND";
  const targetCurrency = targetWallet?.currency || "VND";
  const currenciesDiffer = variant === "internal" && sourceWallet && targetWallet && sourceCurrency !== targetCurrency;

  // Tính tỷ giá và số tiền chuyển đổi
  const exchangeRate = useMemo(() => {
    if (!currenciesDiffer) return 1;
    return getRate(sourceCurrency, targetCurrency);
  }, [currenciesDiffer, sourceCurrency, targetCurrency]);

  const convertedAmount = useMemo(() => {
    if (!currenciesDiffer || !amountNum) return 0;
    // Không làm tròn để giữ đúng giá như tỷ giá (giữ nhiều chữ số thập phân)
    const converted = amountNum * exchangeRate;
    return converted;
  }, [amountNum, exchangeRate, currenciesDiffer]);

  const isExpenseAmountValid = form.type === "expense" 
    ? (amountNum > 0 && amountNum <= walletBalance)
    : (amountNum > 0);
  const showExpenseAmountError = form.type === "expense" && form.amount && !isExpenseAmountValid;

  const isTransferAmountValid = amountNum > 0 && amountNum <= sourceWalletBalance;
  const showTransferAmountError = form.amount && !isTransferAmountValid;

  const isAmountValid = (mode === "edit" && variant === "internal")
    ? true
    : (variant === "internal" 
        ? isTransferAmountValid 
        : isExpenseAmountValid);
  const showAmountError = variant === "internal" 
    ? showTransferAmountError 
    : showExpenseAmountError;

  useEffect(() => {
    if (variant === "internal") return;
    if (!categoryOptions || categoryOptions.length === 0) return;
    if (!form.category || !categoryOptions.includes(form.category)) {
      setForm(f => ({ ...f, category: categoryOptions[0] }));
    }
  }, [form.type, expenseCategories, incomeCategories, variant, categoryOptions]);

  // Reset category search khi đóng dropdown
  useEffect(() => {
    if (!categoryDropdownOpen) {
      setCategorySearchText("");
    }
  }, [categoryDropdownOpen]);

  useEffect(() => {
    if (variant !== "external") return;
    if (!selectedWallet || !selectedWallet.currency) return;
    if (form.currency !== selectedWallet.currency) {
      setForm(f => ({ ...f, currency: selectedWallet.currency }));
    }
  }, [form.walletName, selectedWallet, variant, form.currency]);

  useEffect(() => {
    if (variant !== "internal") return;
    if (!sourceWallet || !sourceWallet.currency) return;
    if (form.currency !== sourceWallet.currency) {
      setForm(f => ({ ...f, currency: sourceWallet.currency }));
    }
  }, [form.sourceWallet, sourceWallet, variant, form.currency]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, attachment: "" }));
      setAttachmentPreview("");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert(t("transactions.form.file_too_large") || "File size must not exceed 5MB");
      e.target.value = "";
      return;
    }
    
    const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              } else {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64String = canvas.toDataURL('image/jpeg', quality);
            resolve(base64String);
          };
          img.onerror = reject;
          img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };
    
    try {
      const base64String = await compressImage(file);
      setForm((f) => ({ ...f, attachment: base64String }));
      setAttachmentPreview(base64String);
    } catch (error) {
      console.error("Error processing image:", error);
      alert(t("transactions.form.image_process_error") || "Error processing image. Please try again.");
      e.target.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (mode !== "edit" && !isAmountValid) {
      return;
    }
    
    if (variant === "internal") {
      if (mode === "edit") {
        onSubmit?.({
          note: form.note || "",
        });
      } else {
        onSubmit?.({
          sourceWallet: form.sourceWallet,
          targetWallet: form.targetWallet,
          amount: amountNum,
          note: form.note || "",
        });
      }
    } else {
      onSubmit?.({
        type: form.type,
        walletName: form.walletName,
        amount: amountNum,
        date: form.date,
        category: form.category,
        note: form.note || "",
        currency: form.currency,
        attachment: form.attachment || null,
      });
    }

    // Reset form after submit (chỉ khi tạo mới)
    if (mode === "create") {
      const defaultWalletName = defaultWallet?.name || "";
      const defaultCurrency = defaultWallet?.currency || "VND";
      setForm({ 
        ...EMPTY_FORM, 
        date: getVietnamDateTime(),
        walletName: defaultWalletName,
        currency: defaultCurrency,
      });
      setAttachmentPreview("");
      onReset?.();
    }
  };

  const handleReset = () => {
    const defaultWalletName = defaultWallet?.name || "";
    const defaultCurrency = defaultWallet?.currency || "VND";
    setForm({ 
      ...EMPTY_FORM, 
      date: getVietnamDateTime(),
      walletName: defaultWalletName,
      currency: defaultCurrency,
    });
    setAttachmentPreview("");
    onReset?.();
  };

  if (variant === "internal") {
    return (
      <div className="transaction-form-card">
        <div className="card-header">
          <h5 className="mb-0">{mode === "edit" ? t("transactions.form.edit_transfer") : t("transactions.form.create_transfer")}</h5>
          {onToggleExpand && (
            <button
              type="button"
              className="btn-expand-header"
              onClick={onToggleExpand}
              title={expanded ? t("transactions.btn.collapse") : t("transactions.btn.expand")}
            >
              <i className={`bi ${expanded ? "bi-arrows-angle-contract" : "bi-arrows-angle-expand"}`} />
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <SelectInput
              label={t("transactions.form.source_wallet")}
              value={form.sourceWallet}
              onChange={(v) => setForm(f => ({ ...f, sourceWallet: v }))}
              options={walletOptions}
              disabled={mode === "edit"}
            />
            {form.sourceWallet && (
              <div className="mb-3">
                <label className="form-label fw-semibold">{t("transactions.form.current_balance")}</label>
                <div className="form-control-plaintext border rounded px-3 py-2 bg-light fw-semibold text-primary" style={{ minHeight: "38px", display: "flex", alignItems: "center" }}>
                  {formatMoney(sourceWalletBalance, sourceWallet?.currency || "VND")}
                </div>
              </div>
            )}

            <SelectInput
              label={t("transactions.form.target_wallet")}
              value={form.targetWallet}
              onChange={(v) => setForm(f => ({ ...f, targetWallet: v }))}
              options={targetWalletOptions}
              disabled={mode === "edit"}
            />
            {form.targetWallet && (
              <div className="mb-3">
                <label className="form-label fw-semibold">{t("transactions.form.current_balance")}</label>
                <div className="form-control-plaintext border rounded px-3 py-2 bg-light fw-semibold text-primary" style={{ minHeight: "38px", display: "flex", alignItems: "center" }}>
                  {formatMoney(Number(targetWallet?.balance || 0), targetWallet?.currency || "VND")}
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
              <div className="input-group">
                <input
                  type="text"
                  className={`form-control ${showAmountError ? "is-invalid" : ""}`}
                  value={formatMoneyInput(form.amount)}
                  onChange={(e) => handleMoneyInputChange(e, (val) => setForm((f) => ({ ...f, amount: val })))}
                  disabled={mode === "edit"}
                  required
                />
                <span className="input-group-text">{sourceCurrency}</span>
              </div>
              {/* Hiển thị số tiền chuyển đổi và tỷ giá nếu ví khác loại tiền tệ */}
              {currenciesDiffer && amountNum > 0 && (
                <>
                  <div style={{ 
                    fontSize: "0.875rem", 
                    color: "#6b7280",
                    marginTop: "6px"
                  }}>
                    Tiền chuyển đổi:{" "}
                    <strong style={{ color: "#059669" }}>
                      {formatConvertedBalance(convertedAmount, targetCurrency)}
                    </strong>
                  </div>
                  <div style={{ 
                    fontSize: "0.875rem", 
                    color: "#6b7280",
                    marginTop: "4px"
                  }}>
                    Tỷ giá: 1 {sourceCurrency} = {exchangeRate.toLocaleString("vi-VN", { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 6 
                    })} {targetCurrency}
                  </div>
                </>
              )}
              {showAmountError && (
                <div className="invalid-feedback">
                  {t("transactions.form.amount_invalid")}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
              <textarea
                className="form-control"
                rows={3}
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder={t("transactions.form.note_placeholder")}
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1">
                {mode === "edit" ? t("transactions.btn.update") : t("transactions.btn.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-form-card">
      <div className="card-header">
        <h5 className="mb-0">{mode === "edit" ? t("transactions.form.edit_transaction") : t("transactions.form.create_transaction")}</h5>
        {onToggleExpand && (
          <button
            type="button"
            className="btn-expand-header"
            onClick={onToggleExpand}
            title={expanded ? t("transactions.btn.collapse") : t("transactions.btn.expand")}
          >
            <i className={`bi ${expanded ? "bi-arrows-angle-contract" : "bi-arrows-angle-expand"}`} />
          </button>
        )}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold mb-2">{t("transactions.form.type")}</label>
            <div className="transaction-type-tabs-form">
              <button
                type="button"
                className={`transaction-type-tab-form ${form.type === "expense" ? "active" : ""}`}
                onClick={() => setForm(f => ({ ...f, type: "expense" }))}
              >
                {t("transactions.type.expense")}
              </button>
              <button
                type="button"
                className={`transaction-type-tab-form ${form.type === "income" ? "active" : ""}`}
                onClick={() => setForm(f => ({ ...f, type: "income" }))}
              >
                {t("transactions.type.income")}
              </button>
            </div>
          </div>

          {/* Row 1: Ví và Số tiền có trong ví */}
          <div className="row mb-3">
            <div className={form.walletName ? "col-md-6" : "col-12"}>
              <SelectInput
                label={t("transactions.form.wallet")}
                value={form.walletName}
                onChange={(v) => setForm(f => ({ ...f, walletName: v }))}
                options={walletOptions}
              />
            </div>
            {form.walletName && (
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t("transactions.form.current_balance")}</label>
                <div className="form-control-plaintext border rounded px-3 py-2 bg-light fw-semibold text-primary" style={{ minHeight: "38px", display: "flex", alignItems: "center" }}>
                  {formatMoney(walletBalance, selectedWallet?.currency || "VND")}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Số tiền và Danh mục */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
                <div className="input-group">
                  <input
                    type="text"
                    className={`form-control ${showAmountError ? "is-invalid" : ""}`}
                    value={formatMoneyInput(form.amount)}
                    onChange={(e) => handleMoneyInputChange(e, (val) => setForm((f) => ({ ...f, amount: val })))}
                    required
                  />
                  <span className="input-group-text">{form.currency}</span>
                </div>
                {showAmountError && (
                  <div className="invalid-feedback">
                    {t("transactions.form.amount_invalid")}
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">{t("transactions.form.category")}</label>
                <div 
                  className={`searchable-select category-select ${categoryDropdownOpen ? "is-open" : ""}`}
                  ref={categorySelectRef}
                  style={{ position: "relative" }}
                >
                  <div className="input-group" style={{ position: "relative" }}>
                    {form.category && selectedCategoryIcon && !categoryDropdownOpen && (
                      <span className="input-group-text bg-white border-end-0" style={{ borderRight: "none" }}>
                        <i className={`bi ${selectedCategoryIcon}`} style={{ color: "rgb(11, 90, 165)", fontSize: "1.1rem" }} />
                      </span>
                    )}
                    <input
                      type="text"
                      className="form-control"
                      placeholder={categoryDropdownOpen ? (t("transactions.form.category_placeholder") || "Chọn hoặc tìm kiếm danh mục...") : (form.category || (t("transactions.form.category_placeholder") || "Chọn hoặc tìm kiếm danh mục..."))}
                      value={categoryDropdownOpen ? categorySearchText : (form.category || "")}
                      onFocus={() => {
                        setCategoryDropdownOpen(true);
                        setCategorySearchText("");
                      }}
                      onChange={(e) => {
                        setCategorySearchText(e.target.value);
                        setCategoryDropdownOpen(true);
                      }}
                      style={{ 
                        borderLeft: form.category && selectedCategoryIcon && !categoryDropdownOpen ? "none" : undefined,
                        paddingLeft: form.category && selectedCategoryIcon && !categoryDropdownOpen ? "8px" : undefined,
                        paddingRight: categorySearchText ? "34px" : "12px"
                      }}
                    />
                    {categorySearchText && (
                      <button
                        type="button"
                        className="category-search-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategorySearchText("");
                        }}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#6c757d",
                          fontSize: "0.8rem",
                          zIndex: 10,
                        }}
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    )}
                  </div>

                  {categoryDropdownOpen && (
                    <div 
                      className="searchable-select-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                      }}
                    >
                      {filteredCategories.length === 0 ? (
                        <div className="px-3 py-2 text-muted small">
                          {t("categories.search_none") || "Không tìm thấy danh mục"}
                        </div>
                      ) : (
                        filteredCategories.slice(0, 5).map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            className={`searchable-option ${form.category === cat.name ? "active" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm(f => ({ ...f, category: cat.name }));
                              setCategorySearchText("");
                              setCategoryDropdownOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              border: "none",
                              background: form.category === cat.name ? "#eff6ff" : "transparent",
                              color: form.category === cat.name ? "#1e40af" : "#111827",
                              fontSize: "0.9rem",
                              cursor: "pointer",
                              transition: "background-color 0.2s, color 0.2s",
                              minWidth: 0,
                            }}
                            onMouseEnter={(e) => {
                              if (form.category !== cat.name) {
                                e.target.style.backgroundColor = "#f1f5f9";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (form.category !== cat.name) {
                                e.target.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <div 
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                background: "linear-gradient(135deg, rgba(11, 90, 165, 0.1) 0%, rgba(10, 181, 192, 0.1) 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "rgb(11, 90, 165)",
                                fontSize: "1rem",
                                flexShrink: 0,
                              }}
                            >
                              <i className={`bi ${cat.icon}`} />
                            </div>
                            <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word", overflowWrap: "break-word", color: "inherit" }}>{cat.name}</span>
                            {form.category === cat.name && (
                              <i className="bi bi-check-circle-fill" style={{ color: "rgb(11, 90, 165)", fontSize: "1rem" }} />
                            )}
                          </button>
                        ))
                      )}
                      {filteredCategories.length > 5 && (
                        <div className="px-3 py-2 text-muted small text-center" style={{ borderTop: "1px solid #e5e7eb" }}>
                          Và {filteredCategories.length - 5} danh mục khác...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">{t("transactions.form.date_time")}</label>
            <input
              type="datetime-local"
              className="form-control"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
            <small className="text-muted">{t("transactions.form.auto_current_time")}</small>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
            <textarea
              className="form-control"
              rows={3}
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder={t("transactions.form.note_placeholder")}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">{t("transactions.form.attachment")}</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
            />
            {attachmentPreview && (
              <div className="mt-2">
                <img src={attachmentPreview} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "contain" }} />
              </div>
            )}
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary flex-grow-1">
              {mode === "edit" ? t("transactions.btn.update") : t("transactions.btn.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

