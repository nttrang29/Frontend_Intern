// src/components/transactions/TransactionFormModal.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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

const CATEGORIES = ["Ăn uống", "Di chuyển", "Quà tặng", "Giải trí", "Hóa đơn", "Khác"];
const WALLETS = ["Ví tiền mặt", "Techcombank", "Momo", "Ngân hàng A", "Ngân hàng B"];

/* ================== AutocompleteInput ================== */
function AutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
  required = false,
}) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      <input
        list={id}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      <datalist id={id}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
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
  variant = "external", // "external" = giao dịch ngoài; "internal" = chuyển giữa các ví
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

  /* ========== Đổ dữ liệu ban đầu ========== */
  useEffect(() => {
    if (!open) return;
    const now = new Date().toISOString().slice(0, 16);
    if (variant === "internal") {
      if (mode === "edit" && initialData) {
        let dateValue = "";
        if (initialData.date) {
          const d = new Date(initialData.date);
          if (!Number.isNaN(d.getTime())) dateValue = d.toISOString().slice(0, 16);
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
        setForm({ ...EMPTY_FORM, type: "transfer", date: now, category: "Chuyển tiền giữa các ví" });
        setAttachmentPreview("");
      }
    } else {
      if (mode === "edit" && initialData) {
        let dateValue = "";
        if (initialData.date) {
          const d = new Date(initialData.date);
          if (!Number.isNaN(d.getTime())) dateValue = d.toISOString().slice(0, 16);
        }
        setForm({
          ...EMPTY_FORM,
          type: initialData.type,
          walletName: initialData.walletName,
          amount: String(initialData.amount),
          date: dateValue || now,
          category: initialData.category,
          note: initialData.note || "",
          currency: initialData.currency || "VND",
          attachment: initialData.attachment || "",
        });
        setAttachmentPreview(initialData.attachment || "");
      } else {
        setForm({ ...EMPTY_FORM, date: now });
        setAttachmentPreview("");
      }
    }
  }, [open, mode, initialData, variant]);

  /* ========== Handlers ========== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, attachment: "" }));
      setAttachmentPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, attachment: url }));
    setAttachmentPreview(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (variant === "internal") {
      onSubmit?.({
        sourceWallet: form.sourceWallet,
        targetWallet: form.targetWallet,
        amount: Number(form.amount || 0),
        date: form.date,
        note: form.note || "",
        currency: form.currency || "VND",
        attachment: form.attachment,
      });
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
                      >
                        Thu nhập
                      </button>
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                      >
                        Chi tiêu
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <AutocompleteInput
                        id="wallet-options"
                        label="Ví"
                        value={form.walletName}
                        onChange={(v) => setForm((f) => ({ ...f, walletName: v }))}
                        placeholder="Chọn ví hoặc gõ để tìm..."
                        options={WALLETS}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Số tiền</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="amount"
                          className="form-control"
                          value={form.amount}
                          onChange={handleChange}
                          required
                        />
                        <span className="input-group-text">{form.currency}</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Ngày & giờ</label>
                      <input
                        type="datetime-local"
                        name="date"
                        className="form-control"
                        value={form.date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <AutocompleteInput
                        id="category-options"
                        label="Danh mục"
                        value={form.category}
                        onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                        placeholder="Chọn danh mục hoặc gõ để tìm..."
                        options={CATEGORIES}
                        required
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
                /* ===== CHUYỂN TIỀN GIỮA CÁC VÍ ===== */
                <div className="row g-3">
                  <div className="col-12">
                    <div className="form-label fw-semibold mb-0">Chuyển tiền giữa các ví</div>
                    <div className="text-muted small">
                      Chọn ví gửi, ví nhận và số tiền cần chuyển.
                    </div>
                  </div>

                  <div className="col-md-6">
                    <AutocompleteInput
                      id="source-wallet"
                      label="Ví gửi"
                      value={form.sourceWallet}
                      onChange={(v) => setForm((f) => ({ ...f, sourceWallet: v }))}
                      placeholder="Chọn ví gửi..."
                      options={WALLETS}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <AutocompleteInput
                      id="target-wallet"
                      label="Ví nhận"
                      value={form.targetWallet}
                      onChange={(v) => setForm((f) => ({ ...f, targetWallet: v }))}
                      placeholder="Chọn ví nhận..."
                      options={WALLETS}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Số tiền</label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="amount"
                        className="form-control"
                        value={form.amount}
                        onChange={handleChange}
                        required
                      />
                      <span className="input-group-text">{form.currency}</span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Ngày & giờ</label>
                    <input
                      type="datetime-local"
                      name="date"
                      className="form-control"
                      value={form.date}
                      onChange={handleChange}
                      required
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
              <button type="submit" className="btn btn-primary">
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
