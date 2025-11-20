// src/components/transactions/TransactionFormModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../home/store/CategoryDataContext";
import { useWalletData } from "../../home/store/WalletDataContext";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";

/* ================== HELPER FUNCTIONS ================== */
/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
 * Format: YYYY-MM-DDTHH:mm (cho datetime-local input)
 */
function getVietnamDateTime() {
  const now = new Date();
  
  // Dùng toLocaleString với timezone Việt Nam để lấy đúng giờ VN
  const vnDateStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse: "11/17/2025, 21:16" -> "2025-11-17T21:16"
  const parts = vnDateStr.split(', ');
  const datePart = parts[0].split('/'); // ["11", "17", "2025"]
  const timePart = parts[1]; // "21:16"
  
  const year = datePart[2];
  const month = datePart[0].padStart(2, '0');
  const day = datePart[1].padStart(2, '0');
  
  return `${year}-${month}-${day}T${timePart}`;
}

/**
 * Convert một Date string/object sang múi giờ Việt Nam
 * Format: YYYY-MM-DDTHH:mm
 */
function convertToVietnamDateTime(dateInput) {
  if (!dateInput) return "";
  
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  
  // Dùng toLocaleString với timezone Việt Nam
  const vnDateStr = d.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse: "11/17/2025, 21:16" -> "2025-11-17T21:16"
  const parts = vnDateStr.split(', ');
  if (parts.length !== 2) return "";
  
  const datePart = parts[0].split('/'); // ["11", "17", "2025"]
  const timePart = parts[1]; // "21:16"
  
  const year = datePart[2];
  const month = datePart[0].padStart(2, '0');
  const day = datePart[1].padStart(2, '0');
  
  return `${year}-${month}-${day}T${timePart}`;
}

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
          <option value="">Chọn</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-muted small">
          {emptyMessage || "Không có dữ liệu để hiển thị."}
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
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentPreview, setAttachmentPreview] = useState("");

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
  const { wallets: walletList } = useWalletData();

  // Tìm ví mặc định
  const defaultWallet = walletList?.find(w => w.isDefault === true);

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

  // Map categories - hỗ trợ cả name và categoryName
  const categoryOptions = useMemo(() => {
    const source =
      form.type === "income" ? incomeCategories : expenseCategories;
    if (!source || source.length === 0) return [];
    return source.map((c) => c.name || c.categoryName || "").filter(Boolean);
  }, [form.type, expenseCategories, incomeCategories]);
  const hasCategories = categoryOptions.length > 0;

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

  // Helper function để format số tiền
  const formatMoney = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    
    // Custom format cho USD: hiển thị $ ở trước
    // Sử dụng tối đa 8 chữ số thập phân để hiển thị chính xác số tiền nhỏ
    if (currency === "USD") {
      // Nếu số tiền rất nhỏ (< 0.01), hiển thị nhiều chữ số thập phân hơn
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    
    // Format cho VND và các currency khác
    try {
      if (currency === "VND") {
        return `${numAmount.toLocaleString("vi-VN")} VND`;
      }
      // Với các currency khác, cũng hiển thị tối đa 8 chữ số thập phân để chính xác
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
      }
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    } catch {
      return `${numAmount.toLocaleString("vi-VN")} ${currency}`;
    }
  };

  // Keep form.category in sync when type changes or categories update
  useEffect(() => {
    if (variant === "internal") return; // internal uses fixed category
    if (!categoryOptions || categoryOptions.length === 0) return;
    if (!form.category || !categoryOptions.includes(form.category)) {
      setForm(f => ({ ...f, category: categoryOptions[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, expenseCategories, incomeCategories]);

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
      alert("Kích thước file không được vượt quá 5MB");
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
      alert("Lỗi khi xử lý ảnh. Vui lòng thử lại.");
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
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2147483647;
          animation: tfmFadeIn .2s ease-out;
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
          border-color: #1d4ed8 !important;
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
                  ? "Chuyển tiền giữa các ví"
                  : "Thêm Giao dịch Mới"
                : variant === "internal"
                ? "Sửa giao dịch chuyển tiền"
                : "Chỉnh sửa Giao dịch"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: "12px 22px 18px" }}>
              {variant === "external" ? (
                <>
                  {/* ===== GIAO DỊCH NGOÀI ===== */}
                  <div className="mb-3">
                    <div className="form-label fw-semibold">Loại giao dịch</div>
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "income" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                        disabled={mode === "edit"}
                      >
                        Thu nhập
                      </button>
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                        disabled={mode === "edit"}
                      >
                        Chi tiêu
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Ví</label>
                        <select
                          className="form-select"
                          value={form.walletName || ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, walletName: e.target.value }))
                          }
                          disabled={mode === "edit" || !hasWallets}
                          required={hasWallets}
                        >
                          <option value="">Chọn</option>
                          {walletOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {!hasWallets && (
                          <div className="text-muted small mt-1">
                            Không có ví nào. Vui lòng tạo ví trước khi thêm giao dịch.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Số tiền</label>
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
                          Số dư hiện tại:{" "}
                          <strong>
                            {formatMoney(selectedWallet.balance, selectedWallet.currency || "VND")}
                          </strong>
                        </div>
                      )}
                      {/* Hiển thị lỗi khi số tiền vượt quá số dư (chỉ khi tạo mới) */}
                      {mode !== "edit" && showAmountError && (
                        <div className="text-danger small mt-1">
                          Số tiền không hợp lệ hoặc vượt quá số dư.
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Ngày & giờ</label>
                      <input
                        type="datetime-local"
                        name="date"
                        className="form-control"
                        value={form.date}
                        readOnly
                        style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                        required
                      />
                      {mode !== "edit" && (
                        <small className="text-muted">Tự động lấy thời gian hiện tại</small>
                      )}
                    </div>

                    <div className="col-md-6">
                      <SelectInput
                        label="Danh mục"
                        value={form.category}
                        onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                        options={categoryOptions}
                        required={hasCategories}
                        disabled={!hasCategories}
                        emptyMessage="Không có danh mục nào. Vui lòng tạo danh mục trước."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Ghi chú</label>
                      <textarea
                        name="note"
                        className="form-control"
                        rows={2}
                        value={form.note}
                        onChange={handleChange}
                        placeholder="Thêm mô tả cho giao dịch..."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Ảnh đính kèm</label>
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
                            alt="Đính kèm"
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
                    <div className="form-label fw-semibold mb-0">Chuyển tiền giữa các ví</div>
                    <div className="text-muted small">
                      Chọn ví gửi, ví nhận và số tiền cần chuyển.
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Ví gửi</label>
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
                        <option value="">Chọn</option>
                        {walletOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!hasWallets && (
                      <div className="text-muted small mt-n2 mb-2">
                        Không có ví nào. Vui lòng tạo ít nhất một ví trước khi chuyển tiền.
                      </div>
                    )}
                    {sourceWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        Số dư: <strong>{formatMoney(sourceWallet.balance, sourceWallet.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Ví nhận</label>
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
                        <option value="">Chọn</option>
                        {targetWalletOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(!hasWallets || walletOptions.length < 2) && (
                      <div className="text-muted small mt-n2 mb-2">
                        Cần ít nhất hai ví để chuyển tiền. Vui lòng tạo thêm ví.
                      </div>
                    )}
                    {targetWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        Số dư: <strong>{formatMoney(targetWallet.balance, targetWallet.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Số tiền</label>
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
                        placeholder={sourceWallet ? `Nhập số tiền bằng ${sourceWallet.currency || "ví gửi"}` : ""}
                        disabled={mode === "edit"}
                        readOnly={mode === "edit"}
                        style={mode === "edit" ? { backgroundColor: "#f8f9fa", cursor: "not-allowed" } : {}}
                      />
                      <span className="input-group-text">{sourceWallet?.currency || form.currency || "VND"}</span>
                    </div>
                    {/* Hiển thị số tiền chuyển đổi nếu khác loại tiền tệ */}
                    {currenciesDiffer && convertedAmount > 0 && (
                      <div className="small text-muted mt-1">
                        Tiền chuyển đổi:{" "}
                        <strong>
                          {formatMoney(convertedAmount, targetWallet?.currency || "VND")}
                        </strong>
                      </div>
                    )}
                    {/* Hiển thị tỷ giá nếu khác loại tiền tệ */}
                    {currenciesDiffer && sourceWallet && targetWallet && (
                      <div className="small text-muted mt-1">
                        Tỷ giá: 1 {sourceWallet.currency || "VND"} ={" "}
                        {new Intl.NumberFormat("vi-VN", {
                          maximumFractionDigits: 6,
                        }).format(transferRate)}{" "}
                        {targetWallet.currency || "VND"}
                      </div>
                    )}
                    {/* Hiển thị lỗi khi số tiền vượt quá số dư ví gửi (chỉ khi tạo mới) */}
                    {mode !== "edit" && showTransferAmountError && (
                      <div className="text-danger small mt-1">
                        Số tiền không hợp lệ hoặc vượt quá số dư ví gửi.
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Ngày & giờ</label>
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
                      <small className="text-muted">Tự động lấy thời gian hiện tại</small>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Ghi chú</label>
                    <textarea
                      name="note"
                      className="form-control"
                      rows={2}
                      value={form.note}
                      onChange={handleChange}
                      placeholder="Thêm ghi chú cho lần chuyển tiền..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0" style={{ padding: "8px 22px 16px" }}>
              <button type="button" className="btn btn-light" onClick={onClose}>
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!isAmountValid}
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalUI, document.body);
}
