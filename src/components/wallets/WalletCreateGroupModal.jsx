// src/components/wallets/WalletCreateGroupModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWalletData } from "../../home/store/WalletDataContext";

export default function WalletCreateGroupModal({
  open,
  onClose,
  currencies = ["VND"],
  onCreated,
  existingNames = [],
}) {
  const { createWallet } = useWalletData();

  const [form, setForm] = useState({
    name: "",
    currency: currencies[0] || "VND",
    openingBalance: "0",
    note: "",
    approvalPolicy: { enabled: false, threshold: "" },
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const initialCurrency = useMemo(() => currencies[0] || "VND", [currencies]);
  useEffect(() => {
    setForm((f) => ({ ...f, currency: f.currency || initialCurrency }));
  }, [initialCurrency]);

  // khóa scroll nền khi mở modal
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  const existing = useMemo(
    () => new Set((existingNames || []).map((s) => (s || "").toLowerCase().trim())),
    [existingNames]
  );

  const blockSci = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const validate = (values = form) => {
    const e = {};
    const name = (values.name || "").trim();
    if (!name) e.name = "Vui lòng nhập tên ví nhóm";
    else if (name.length < 2) e.name = "Tên ví phải từ 2 ký tự";
    else if (name.length > 40) e.name = "Tên ví tối đa 40 ký tự";
    else if (existing.has(name.toLowerCase())) e.name = "Tên ví nhóm đã tồn tại";

    if (!values.currency) e.currency = "Vui lòng chọn loại tiền tệ";
    else if (!currencies.includes(values.currency))
      e.currency = "Loại tiền tệ không hợp lệ";

    if (values.openingBalance === "" || values.openingBalance === null)
      e.openingBalance = "Vui lòng nhập số dư ban đầu";
    else {
      const n = Number(values.openingBalance);
      if (!isFinite(n)) e.openingBalance = "Số dư không hợp lệ";
      else if (n < 0) e.openingBalance = "Số dư phải ≥ 0";
      else if (String(values.openingBalance).includes("."))
        e.openingBalance = "Chỉ nhận số nguyên";
      else if (n > 1_000_000_000_000)
        e.openingBalance = "Số dư quá lớn (≤ 1,000,000,000,000)";
    }

    if ((values.note || "").length > 200) e.note = "Ghi chú tối đa 200 ký tự";

    if (values.approvalPolicy.enabled) {
      const t = Number(values.approvalPolicy.threshold);
      if (!t || t <= 0) e.threshold = "Ngưỡng duyệt phải > 0";
    }

    return e;
  };

  const isValid = useMemo(() => Object.keys(validate()).length === 0, [form]);

  const setField = (name, value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) setErrors(validate(next));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    setTouched({
      name: true,
      currency: true,
      openingBalance: true,
      note: true,
      threshold: true,
    });
    if (Object.keys(v).length) return;

    const payload = {
      name: form.name.trim(),
      currency: form.currency,
      balance: Number(form.openingBalance || 0),
      note: form.note?.trim() || "",
      isDefault: false,
      isShared: true, // ví nhóm
      groupId: null,
      approvalPolicy: form.approvalPolicy.enabled
        ? { enabled: true, threshold: Number(form.approvalPolicy.threshold) }
        : { enabled: false },
    };

    const w = await createWallet(payload);
    onCreated?.(w);
    onClose?.();
  };

  if (!open) return null;

  const ui = (
    <>
      <style>{`
        .wallet-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1300;
        }
        .wallet-modal {
          width: 640px; max-width: 95%;
          background: #ffffff; color: #111827;
          border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.22);
          border: 1px solid #e5e7eb; overflow: hidden;
          position: relative; z-index: 1310;
        }
        .wallet-modal__header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 18px; background:#f9fafb; border-bottom:1px solid #e5e7eb;
        }
        .wallet-modal__title { font-size:1.05rem; font-weight:700; color:#111827; }
        .wallet-modal__close {
          background:none; border:none; color:#6b7280; font-size:22px;
          cursor:pointer; padding:4px 8px; border-radius:10px; transition:.2s;
        }
        .wallet-modal__close:hover { background:#f3f4f6; color:#111; }
        .wallet-modal__body { padding:18px; background:#fff; }
        .wallet-modal__footer {
          display:flex; justify-content:flex-end; gap:10px;
          padding:16px 18px; background:#f9fafb; border-top:1px solid #e5e7eb;
        }

        .fm-row { margin-bottom:14px; }
        .fm-label { color:#374151; font-size:.92rem; margin-bottom:6px; display:block; font-weight:500; }
        .req { color:#ef4444; margin-left:2px; }

        .fm-input, .fm-select, .fm-textarea {
          width:100%; background:#fff; color:#111827;
          border:1px solid #d1d5db; border-radius:10px;
          padding:10px 12px; transition:.2s;
        }
        .fm-input:focus, .fm-select:focus, .fm-textarea:focus {
          border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.15);
          outline:none;
        }
        .is-invalid { border-color:#ef4444 !important; box-shadow:0 0 0 3px rgba(239,68,68,0.15); }
        .fm-feedback { color:#ef4444; font-size:.86rem; margin-top:5px; }
        .fm-hint { color:#6b7280; font-size:.82rem; margin-top:4px; }

        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width:560px){ .grid-2{ grid-template-columns:1fr; } }

        .fm-check { display:flex; align-items:center; gap:8px; margin-top:8px; }
        .fm-check__input { width:18px; height:18px; accent-color:#2563eb; }

        .btn-cancel, .btn-submit {
          border:none; border-radius:999px; padding:10px 16px; font-weight:600;
          transition:.2s; cursor:pointer; font-size:.95rem;
        }
        .btn-cancel { background:#f3f4f6; color:#111827; border:1px solid #d1d5db; }
        .btn-cancel:hover { background:#e5e7eb; }
        .btn-submit { background:#2563eb; color:#fff; }
        .btn-submit:hover { background:#1d4ed8; }
        .btn-submit:disabled { opacity:.6; cursor:not-allowed; }
      `}</style>

      <div className="wallet-modal-overlay" onClick={onClose}>
        <form
          className="wallet-modal"
          onClick={(e) => e.stopPropagation()}
          onSubmit={submit}
        >
          <div className="wallet-modal__header">
            <h5 className="wallet-modal__title">Tạo ví nhóm</h5>
            <button type="button" className="wallet-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="wallet-modal__body">
            {/* Tên ví nhóm */}
            <div className="fm-row">
              <label className="fm-label">Tên ví nhóm<span className="req">*</span></label>
              <input
                className={`fm-input ${touched.name && errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ví nhóm công ty, lớp, đội bóng…"
                maxLength={40}
              />
              {touched.name && errors.name && <div className="fm-feedback">{errors.name}</div>}
            </div>

            {/* Tiền tệ & Số dư ban đầu */}
            <div className="grid-2">
              <div className="fm-row">
                <label className="fm-label">Tiền tệ<span className="req">*</span></label>
                <select
                  className={`fm-select ${touched.currency && errors.currency ? "is-invalid" : ""}`}
                  value={form.currency}
                  onBlur={() => setTouched((t) => ({ ...t, currency: true }))}
                  onChange={(e) => setField("currency", e.target.value)}
                >
                  {(currencies || ["VND"]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {touched.currency && errors.currency && (
                  <div className="fm-feedback">{errors.currency}</div>
                )}
              </div>

              <div className="fm-row">
                <label className="fm-label">Số dư ban đầu<span className="req">*</span></label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className={`fm-input ${touched.openingBalance && errors.openingBalance ? "is-invalid" : ""}`}
                  value={form.openingBalance}
                  onBlur={() => setTouched((t) => ({ ...t, openingBalance: true }))}
                  onChange={(e) => setField("openingBalance", e.target.value)}
                  onKeyDown={blockSci}
                  placeholder="0"
                />
                {touched.openingBalance && errors.openingBalance && (
                  <div className="fm-feedback">{errors.openingBalance}</div>
                )}
                <div className="fm-hint">Chỉ nhận số nguyên ≥ 0</div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="fm-row">
              <label className="fm-label">Ghi chú (tùy chọn)</label>
              <textarea
                className={`fm-textarea ${touched.note && errors.note ? "is-invalid" : ""}`}
                rows="2"
                value={form.note}
                onBlur={() => setTouched((t) => ({ ...t, note: true }))}
                onChange={(e) => setField("note", e.target.value)}
                maxLength={200}
                placeholder="Ghi chú cho ví nhóm (tối đa 200 ký tự)"
              />
              {touched.note && errors.note && <div className="fm-feedback">{errors.note}</div>}
            </div>

            {/* Duyệt chi theo ngưỡng */}
            <div className="fm-check">
              <input
                id="approval"
                className="fm-check__input"
                type="checkbox"
                checked={form.approvalPolicy.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    approvalPolicy: { ...form.approvalPolicy, enabled: e.target.checked },
                  })
                }
              />
              <label htmlFor="approval">Bật duyệt chi theo ngưỡng</label>
            </div>

            {form.approvalPolicy.enabled && (
              <div className="fm-row">
                <label className="fm-label">Ngưỡng duyệt<span className="req">*</span></label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className={`fm-input ${touched.threshold && errors.threshold ? "is-invalid" : ""}`}
                  value={form.approvalPolicy.threshold}
                  onBlur={() => setTouched((t) => ({ ...t, threshold: true }))}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      approvalPolicy: { ...form.approvalPolicy, threshold: e.target.value },
                    })
                  }
                  onKeyDown={blockSci}
                  placeholder={`VD: 5000000 (${form.currency})`}
                />
                {touched.threshold && errors.threshold && (
                  <div className="fm-feedback">{errors.threshold}</div>
                )}
              </div>
            )}
          </div>

          <div className="wallet-modal__footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-submit" disabled={!isValid}>Tạo ví nhóm</button>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(ui, document.body);
}
