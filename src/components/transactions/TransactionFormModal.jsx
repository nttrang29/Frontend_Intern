// src/components/transactions/TransactionFormModal.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { getVietnamDateTime, convertToVietnamDateTime, formatMoney } from "./utils/transactionUtils";
import useOnClickOutside from "../../hooks/useOnClickOutside";

/* ================== CẤU HÌNH MẶC ĐỊNH ================== */
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

// static defaults kept as fallback
/* ================== Select Input (chỉ dropdown) ================== */
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

/* ================== TransactionFormModal ================== */
export default function TransactionFormModal({
  open,
  mode = "create",
  initialData,
  onSubmit,
  onClose,
  variant = "external",
  availableWallets,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [categorySearchText, setCategorySearchText] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categorySelectRef = useRef(null);
  const { t } = useLanguage();
  
  useOnClickOutside(categorySelectRef, () => setCategoryDropdownOpen(false));

  /* ========== ESC để đóng ========== */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ========== Khóa scroll nền khi mở modal ========== */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // get shared categories and wallets (cần lấy trước để dùng trong useEffect)
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets: walletListFromContext } = useWalletData();
  const walletList = useMemo(() => {
    if (Array.isArray(availableWallets)) {
      return availableWallets;
    }
    return walletListFromContext || [];
  }, [availableWallets, walletListFromContext]);

  // Tìm ví mặc định
  const defaultWallet = walletList.find(w => w.isDefault === true);

  /* ========== Đổ dữ liệu ban đầu ========== */
  useEffect(() => {
    if (!open) return;
    // Luôn lấy thời gian hiện tại mới nhất theo múi giờ Việt Nam khi mở form
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
        // Mode create: luôn dùng thời gian hiện tại theo múi giờ Việt Nam
        setForm({
          ...EMPTY_FORM,
          type: "transfer",
          date: getVietnamDateTime(), // Luôn lấy thời gian mới nhất theo VN
          category: "Chuyển tiền giữa các ví",
        });
        setAttachmentPreview("");
      }
    } else {
      if (mode === "edit" && initialData) {
        // Mode edit: giữ nguyên thời gian của giao dịch cũ (convert sang VN timezone)
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
        // Mode create: luôn dùng thời gian hiện tại theo múi giờ Việt Nam
        // Tự động chọn ví mặc định nếu có
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
  }, [open, mode, initialData, variant, defaultWallet]);

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

  const hasCategories = categoryOptions.length > 0;

  // Reset category search khi đóng dropdown
  useEffect(() => {
    if (!categoryDropdownOpen) {
      setCategorySearchText("");
    }
  }, [categoryDropdownOpen]);

  // Danh sách ví cho ví gửi (tất cả ví)
  const walletOptions = useMemo(() => {
    if (!walletList || walletList.length === 0) return [];
    return walletList.map((w) => w.name).filter(Boolean);
  }, [walletList]);
  const hasWallets = walletOptions.length > 0;
  
  // Danh sách ví cho ví nhận (loại bỏ ví gửi đã chọn)
  const targetWalletOptions = useMemo(() => {
    if (!walletList || walletList.length === 0) return [];
    if (!form.sourceWallet) return walletList.map((w) => w.name).filter(Boolean);
    // Loại bỏ ví gửi khỏi danh sách ví nhận
    return walletList
      .filter((w) => w.name !== form.sourceWallet)
      .map((w) => w.name)
      .filter(Boolean);
  }, [walletList, form.sourceWallet]);
  const hasTargetWallets = targetWalletOptions.length > 0;

  // Tìm ví đã chọn trong form giao dịch thông thường
  const selectedWallet = walletList?.find(w => w.name === form.walletName);

  // Tìm ví gửi và ví nhận từ walletList để lấy số dư
  const sourceWallet = walletList?.find(w => w.name === form.sourceWallet);
  const targetWallet = walletList?.find(w => w.name === form.targetWallet);

  // Helper functions để tính tỷ giá và chuyển đổi (tham khảo WalletInspector)
  const decimalsOf = (c) => (String(c) === "VND" ? 0 : 2);
  const roundTo = (n, d = 0) => {
    const m = Math.pow(10, d);
    return Math.round(n * m) / m;
  };
  
  const getRate = (from, to) => {
    if (!from || !to || from === to) return 1;
    // Tỷ giá cố định (theo ExchangeRateServiceImpl)
    const rates = {
      VND: 1,
      USD: 0.000041, // 1 VND = 0.000041 USD
      EUR: 0.000038,
      JPY: 0.0063,
      GBP: 0.000032,
      CNY: 0.00030,
    };
    if (!rates[from] || !rates[to]) return 1;
    // Tính tỷ giá: from → VND → to
    const fromToVND = 1 / rates[from];
    const toToVND = 1 / rates[to];
    return fromToVND / toToVND;
  };

  // Kiểm tra hai ví có khác loại tiền tệ không (cho chuyển tiền)
  const currenciesDiffer = sourceWallet && targetWallet 
    ? (sourceWallet.currency || "VND") !== (targetWallet.currency || "VND")
    : false;
  
  // Tính tỷ giá và số tiền chuyển đổi (cho chuyển tiền)
  const transferRate = sourceWallet && targetWallet 
    ? getRate(sourceWallet.currency || "VND", targetWallet.currency || "VND")
    : 1;
  
  const amountNum = getMoneyValue(form.amount);
  const convertedAmount = useMemo(() => {
    if (!sourceWallet || !targetWallet || !amountNum) return 0;
    if (!currenciesDiffer) return amountNum;
    // Chuyển đổi từ sourceWallet.currency sang targetWallet.currency
    return roundTo(amountNum * transferRate, decimalsOf(targetWallet.currency || "VND"));
  }, [amountNum, transferRate, currenciesDiffer, sourceWallet, targetWallet]);

  // Kiểm tra số tiền có hợp lệ không (cho loại chi tiêu và chuyển tiền)
  const walletBalance = Number(selectedWallet?.balance || 0);
  const sourceWalletBalance = Number(sourceWallet?.balance || 0);
  
  // Validation cho form giao dịch thông thường (chi tiêu)
  const isExpenseAmountValid = form.type === "expense" 
    ? (amountNum > 0 && amountNum <= walletBalance)
    : (amountNum > 0);
  const showExpenseAmountError = form.type === "expense" && form.amount && !isExpenseAmountValid;
  
  // Validation cho form chuyển tiền
  const isTransferAmountValid = amountNum > 0 && amountNum <= sourceWalletBalance;
  const showTransferAmountError = form.amount && !isTransferAmountValid;
  
  // Tổng hợp validation
  // Khi edit transfer, không cần validate số tiền vì chỉ cho phép sửa ghi chú
  const isAmountValid = (mode === "edit" && variant === "internal")
    ? true  // Luôn valid khi edit transfer (chỉ sửa ghi chú)
    : (variant === "internal" 
        ? isTransferAmountValid 
        : isExpenseAmountValid);
  const showAmountError = variant === "internal" 
    ? showTransferAmountError 
    : showExpenseAmountError;


  // Keep form.category in sync when type changes or categories update
  useEffect(() => {
    if (variant === "internal") return; // internal uses fixed category
    if (!categoryOptions || categoryOptions.length === 0) return;
    if (!form.category || !categoryOptions.includes(form.category)) {
      setForm(f => ({ ...f, category: categoryOptions[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, expenseCategories, incomeCategories]);

  // Reset category dropdown khi mở/đóng modal
  useEffect(() => {
    if (!open) {
      setCategoryDropdownOpen(false);
      setCategorySearchText("");
    }
  }, [open]);

  // Tự động cập nhật currency khi chọn ví (chỉ cho variant external)
  useEffect(() => {
    if (variant !== "external") return;
    if (!selectedWallet || !selectedWallet.currency) return;
    // Chỉ cập nhật nếu currency khác với currency hiện tại
    if (form.currency !== selectedWallet.currency) {
      setForm(f => ({ ...f, currency: selectedWallet.currency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.walletName, selectedWallet, variant]);

  // Tự động cập nhật currency khi chọn ví gửi (cho variant internal - chuyển tiền)
  useEffect(() => {
    if (variant !== "internal") return;
    if (!sourceWallet || !sourceWallet.currency) return;
    // Cập nhật currency theo ví gửi
    if (form.currency !== sourceWallet.currency) {
      setForm(f => ({ ...f, currency: sourceWallet.currency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sourceWallet, sourceWallet, variant]);

  /* ========== Handlers ========== */
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
    
    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t("transactions.form.file_too_large") || "File size must not exceed 5MB");
      e.target.value = ""; // Reset input
      return;
    }
    
    // Resize và compress ảnh trước khi convert sang base64
    const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Tính toán kích thước mới
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
            
            // Tạo canvas để resize và compress
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert sang base64 với quality
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
      e.target.value = ""; // Reset input
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation: Kiểm tra số tiền cho loại chi tiêu và chuyển tiền (chỉ khi tạo mới)
    if (mode !== "edit" && !isAmountValid) {
      // Không submit nếu số tiền không hợp lệ
      return;
    }
    
    if (variant === "internal") {
      // Khi edit transfer, chỉ gửi note
      if (mode === "edit") {
        onSubmit?.({
          note: form.note || "",
        });
      } else {
        // Khi tạo mới, gửi đầy đủ thông tin
        onSubmit?.({
          sourceWallet: form.sourceWallet,
          targetWallet: form.targetWallet,
          amount: Number(form.amount || 0),
          date: form.date,
          note: form.note || "",
          currency: form.currency || "VND",
          attachment: form.attachment,
        });
      }
    } else {
      onSubmit?.({
        ...form,
        amount: Number(form.amount || 0),
        date: form.date,
      });
    }
  };

  if (!open) return null;

  /* ========== UI ========== */
  const modalUI = (
    <>
      <style>{`
        @keyframes tfmFadeIn { from { opacity: 0 } to { opacity: 1 } }

        .transaction-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          display: flex; align-items: center; justify-content: center;
          z-index: 2147483647;
          animation: tfmFadeIn .15s ease-out;
        }

        .transaction-modal-content {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
          width: 520px;
          max-width: 95%;
          overflow: hidden;
          z-index: 2147483648;
        }

        .type-pill.active:disabled {
          border-width: 2px !important;
          border-color: #black !important;
        }

        .type-pill:disabled:not(.active) {
          border: none !important;
        }
      `}</style>

      <div
        className="transaction-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="transaction-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header border-0 pb-0" style={{ padding: "16px 22px 8px" }}>
            <h5 className="modal-title fw-semibold">
              {mode === "create"
                ? variant === "internal"
                  ? t("transactions.form.title_create_transfer")
                  : t("transactions.form.title_create")
                : variant === "internal"
                ? t("transactions.form.title_edit_transfer")
                : t("transactions.form.title_edit")}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: "12px 22px 18px" }}>
              {variant === "external" ? (
                <>
                  {/* ===== GIAO DỊCH NGOÀI ===== */}
                  <div className="mb-3">
                    <div className="form-label fw-semibold">{t("transactions.form.type_label")}</div>
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "income" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                        disabled={mode === "edit"}
                      >
                        {t("transactions.type.income")}
                      </button>
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                        disabled={mode === "edit"}
                      >
                        {t("transactions.type.expense")}
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">{t("transactions.form.wallet")}</label>
                      <select
                        className="form-select"
                        value={form.walletName || ""}
                        onChange={(e) => setForm((f) => ({ ...f, walletName: e.target.value }))}
                        disabled={!hasWallets}
                        required={hasWallets}
                      >
                        <option value="">{t("transactions.form.select_option")}</option>
                        {walletOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {!hasWallets && (
                        <div className="text-muted small mt-1">
                          {t("transactions.form.no_wallets")}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
                      <div className="input-group">
                        <input
                          type="text"
                          name="amount"
                          className="form-control"
                          value={formatMoneyInput(form.amount)}
                          onChange={(e) => {
                            const parsed = getMoneyValue(e.target.value);
                            setForm((f) => ({ ...f, amount: parsed ? String(parsed) : "" }));
                          }}
                          required
                          inputMode="numeric"
                          disabled={mode === "edit"}
                          readOnly={mode === "edit"}
                          style={mode === "edit" ? { backgroundColor: "#f8f9fa", cursor: "not-allowed" } : {}}
                        />
                        <span className="input-group-text">{form.currency}</span>
                      </div>
                      {/* Hiển thị số dư cho loại chi tiêu (chỉ khi tạo mới) */}
                      {mode !== "edit" && form.type === "expense" && selectedWallet && (
                        <div className="form-text">
                          {t("wallets.inspector.current_balance_colon")} {" "}
                          <strong>
                            {formatMoney(selectedWallet.balance, selectedWallet.currency || "VND")}
                          </strong>
                        </div>
                      )}
                      {/* Hiển thị lỗi khi số tiền vượt quá số dư (chỉ khi tạo mới) */}
                      {mode !== "edit" && showAmountError && (
                        <div className="text-danger small mt-1">
                          {t("transactions.form.amount_invalid")}
                        </div>
                      )}
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
                              disabled={!hasCategories}
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

                          {categoryDropdownOpen && hasCategories && (
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
                                <div className="px-3 py-2 text-muted small text-center border-top">
                                  Và {filteredCategories.length - 5} danh mục khác...
                                </div>
                              )}
                            </div>
                          )}
                          {!hasCategories && (
                            <div className="text-muted small mt-1">
                              {t("categories.search_none") || "Không có danh mục"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
                      <textarea
                        name="note"
                        className="form-control"
                        rows={2}
                        value={form.note}
                        onChange={handleChange}
                        placeholder={t("transactions.form.note_placeholder")}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">{t("transactions.form.attachment")}</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      {attachmentPreview && (
                        <div className="mt-2">
                          <img
                            src={attachmentPreview}
                            alt={t("transactions.view.attachment")}
                            style={{
                              maxWidth: 180,
                              maxHeight: 140,
                              borderRadius: 12,
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* ===== CHUYỂN TIỀN ===== */
                <div className="row g-3">
                  <div className="col-12">
                    <div className="form-label fw-semibold mb-0">{t("transactions.form.transfer_legend")}</div>
                    <div className="text-muted small">
                      {t("transactions.form.transfer_hint")}
                    </div>
                  </div>

                  <div className="col-md-6">
                      <div className="mb-3">
                      <label className="form-label fw-semibold">{t("transactions.form.source_wallet")}</label>
                      <select
                        className="form-select"
                        value={form.sourceWallet || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => {
                            // Nếu ví nhận trùng với ví gửi mới, reset ví nhận
                            const newTarget = v === f.targetWallet ? "" : f.targetWallet;
                            return { ...f, sourceWallet: v, targetWallet: newTarget };
                          });
                        }}
                        disabled={mode === "edit" || !hasWallets}
                        required={hasWallets}
                      >
                        <option value="">{t("transactions.form.select_option")}</option>
                        {walletOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!hasWallets && (
                      <div className="text-muted small mt-n2 mb-2">
                        {t("transactions.form.no_wallets")}
                      </div>
                    )}
                    {sourceWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        {t("wallets.inspector.current_balance_colon")} <strong>{formatMoney(sourceWallet.balance, sourceWallet.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                      <div className="mb-3">
                      <label className="form-label fw-semibold">{t("transactions.form.target_wallet")}</label>
                      <select
                        className="form-select"
                        value={form.targetWallet || ""}
                        onChange={(e) => setForm((f) => ({ ...f, targetWallet: e.target.value }))}
                        disabled={
                          mode === "edit" ||
                          !hasWallets ||
                          !hasTargetWallets ||
                          walletOptions.length < 2
                        }
                        required={hasTargetWallets}
                      >
                        <option value="">{t("transactions.form.select_option")}</option>
                        {targetWalletOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(!hasWallets || walletOptions.length < 2) && (
                      <div className="text-muted small mt-n2 mb-2">
                        {t("transactions.form.need_two_wallets")}
                      </div>
                    )}
                    {targetWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        {t("wallets.inspector.current_balance_colon")} <strong>{formatMoney(targetWallet.balance, targetWallet.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
                    <div className="input-group">
                      <input
                        type="text"
                        name="amount"
                        className="form-control"
                        value={formatMoneyInput(form.amount)}
                        onChange={(e) => {
                          const parsed = getMoneyValue(e.target.value);
                          setForm((f) => ({ ...f, amount: parsed ? String(parsed) : "" }));
                        }}
                        required
                        inputMode="numeric"
                        placeholder={sourceWallet ? `${t("wallets.inspector.transfer_amount_placeholder")} ${sourceWallet.currency || ""}` : ""}
                        disabled={mode === "edit"}
                        readOnly={mode === "edit"}
                        style={mode === "edit" ? { backgroundColor: "#f8f9fa", cursor: "not-allowed" } : {}}
                      />
                      <span className="input-group-text">{sourceWallet?.currency || form.currency || "VND"}</span>
                    </div>
                    {/* Hiển thị số tiền chuyển đổi nếu khác loại tiền tệ */}
                    {currenciesDiffer && convertedAmount > 0 && (
                        <div className="small text-muted mt-1">
                        {t("transactions.form.converted_amount")} {" "}
                        <strong>
                          {formatMoney(convertedAmount, targetWallet?.currency || "VND", targetWallet?.currency === 'USD' ? 8 : undefined)}
                        </strong>
                      </div>
                    )}
                    {/* Hiển thị tỷ giá nếu khác loại tiền tệ */}
                    {currenciesDiffer && sourceWallet && targetWallet && (
                        <div className="small text-muted mt-1">
                        {t("transactions.form.exchange_rate_prefix")} 1 {sourceWallet.currency || "VND"} ={" "}
                        {new Intl.NumberFormat("vi-VN", {
                          maximumFractionDigits: 8,
                        }).format(transferRate)}{" "}
                        {targetWallet.currency || "VND"}
                      </div>
                    )}
                    {/* Hiển thị lỗi khi số tiền vượt quá số dư ví gửi (chỉ khi tạo mới) */}
                    {mode !== "edit" && showTransferAmountError && (
                      <div className="text-danger small mt-1">
                        {t("transactions.form.amount_invalid")}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">{t("transactions.form.date")}</label>
                    <input
                      type="datetime-local"
                      name="date"
                      className="form-control"
                      value={form.date}
                      readOnly
                      disabled={mode === "edit"}
                      style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                      required
                    />
                    {mode !== "edit" && (
                        <small className="text-muted">{t("transactions.form.auto_time_note")}</small>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
                    <textarea
                      name="note"
                      className="form-control"
                      rows={2}
                      value={form.note}
                      onChange={handleChange}
                      placeholder={t("transactions.form.transfer_note_placeholder")}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0" style={{ padding: "8px 22px 16px" }}>
              <button type="button" className="btn btn-light" onClick={onClose}>
                {t("transactions.btn.cancel")}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!isAmountValid}
              >
                {t("transactions.btn.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalUI, document.body);
}
