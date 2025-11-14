import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function WalletEditModal({
  wallet,
  onClose,
  onSubmit,
  currencies = [],
  existingNames = [],
}) {
  const [form, setForm] = useState({
    name: "",
    currency: "VND",
    balance: "",
    note: "",
    isDefault: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // ✅ chặn cuộn nền khi mở modal
  useEffect(() => {
    if (!wallet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [wallet]);

  const exists = useMemo(
    () =>
      new Set(
        (existingNames || [])
          .map((s) => s.toLowerCase().trim())
          .filter((n) => n !== (wallet?.name || "").toLowerCase().trim())
      ),
    [existingNames, wallet]
  );

  useEffect(() => {
    if (!wallet) return;
    setForm({
      name: wallet.name || "",
      currency: wallet.currency || "VND",
      balance:
        wallet.balance === 0 || wallet.balance ? String(wallet.balance) : "",
      note: wallet.note || "",
      isDefault: !!wallet.isDefault,
    });
  }, [wallet]);

  function validate(values = form) {
    const e = {};
    const name = (values.name || "").trim();
    if (!name) e.name = "Vui lòng nhập tên ví";
    else if (name.length < 2) e.name = "Tên ví phải từ 2 ký tự";
    else if (name.length > 40) e.name = "Tên ví tối đa 40 ký tự";
    else if (exists.has(name.toLowerCase())) e.name = "Tên ví đã tồn tại";

    if (!values.currency) e.currency = "Vui lòng chọn loại tiền tệ";
    else if (!currencies.includes(values.currency))
      e.currency = "Loại tiền tệ không hợp lệ";

    if (values.balance === "" || values.balance === null)
      e.balance = "Vui lòng nhập số dư";
    else {
      const bn = Number(values.balance);
      if (!isFinite(bn)) e.balance = "Số dư không hợp lệ";
      else if (bn < 0) e.balance = "Số dư phải ≥ 0";
      else if (String(values.balance).includes("."))
        e.balance = "Số dư chỉ nhận số nguyên";
    }

    if ((values.note || "").length > 200)
      e.note = "Mô tả tối đa 200 ký tự";
    return e;
  }

  const isValid = useMemo(() => Object.keys(validate()).length === 0, [form]);

  function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    setTouched({
      name: true,
      currency: true,
      balance: true,
      note: true,
    });
    if (Object.keys(v).length > 0) return;

    onSubmit({
      id: wallet.id,
      name: form.name.trim(),
      currency: form.currency,
      balance: Number(form.balance),
      note: form.note?.trim() || "",
      isDefault: !!form.isDefault,
      createdAt: wallet.createdAt,
    });
  }

  function setField(name, value) {
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) setErrors(validate(next));
  }

  if (!wallet) return null;

  const createdAt =
    wallet.createdAt &&
    new Date(wallet.createdAt).toLocaleString("vi-VN", {
      hour12: false,
    });

  // ✅ UI modal (light theme)
  const modalUI = (
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
          width: 600px; max-width: 95%;
          background: #ffffff; color: #111827;
          border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          overflow: hidden; border: 1px solid #e5e7eb;
          position: relative; z-index: 1310;
        }
        .wallet-modal__header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 18px; background:#f9fafb; border-bottom:1px solid #e5e7eb;
        }
        .wallet-modal__title { font-size:1.05rem; font-weight:700; color:#111827; }
        .wallet-modal__close {
          background:none; border:none; color:#6b7280; font-size:22px;
          cursor:pointer; padding:4px 8px; border-radius:10px;
          transition:all .2s ease;
        }
        .wallet-modal__close:hover { background:#f3f4f6; color:#000; }
        .wallet-modal__body { padding:18px; background:#ffffff; }
        .wallet-modal__footer {
          display:flex; justify-content:flex-end; gap:10px;
          padding:16px 18px; border-top:1px solid #e5e7eb;
          background:#f9fafb;
        }

        .fm-row { margin-bottom:14px; }
        .fm-label { color:#374151; font-size:.92rem; margin-bottom:6px; display:block; font-weight:500; }
        .req { color:#ef4444; margin-left:2px; }

        .fm-input, .fm-select, .fm-textarea {
          width:100%; background:#fff; color:#111827;
          border:1px solid #d1d5db; border-radius:10px;
          padding:10px 12px; transition:all .2s ease;
        }
        .fm-input:focus, .fm-select:focus, .fm-textarea:focus {
          border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.15);
          outline:none;
        }
        .is-invalid {
          border-color:#ef4444 !important; box-shadow:0 0 0 3px rgba(239,68,68,0.15);
        }
        .fm-feedback { color:#ef4444; font-size:.86rem; margin-top:5px; }

        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width:560px){ .grid-2{grid-template-columns:1fr;} }

        .fm-check { display:flex; align-items:center; gap:8px; margin-top:8px; }
        .fm-check__input { width:18px; height:18px; accent-color:#2563eb; }

        .fm-meta {
          margin-top:12px; padding:10px 12px; border:1px dashed #d1d5db;
          border-radius:10px; display:flex; justify-content:space-between;
          color:#6b7280;
        }
        .fm-meta strong { color:#111827; }

        .btn-cancel, .btn-submit {
          border:none; border-radius:999px; padding:10px 16px; font-weight:600;
          transition:all .2s ease; cursor:pointer; font-size:.95rem;
        }
        .btn-cancel {
          background:#f3f4f6; color:#111827; border:1px solid #d1d5db;
        }
        .btn-cancel:hover { background:#e5e7eb; }
        .btn-submit {
          background:#2563eb; color:#ffffff;
        }
        .btn-submit:hover { background:#1d4ed8; }
        .btn-submit:disabled { opacity:.6; cursor:not-allowed; }
      `}</style>

      <div className="wallet-modal-overlay" onClick={onClose}>
        <form className="wallet-modal" onClick={(e)=>e.stopPropagation()} onSubmit={handleSubmit}>
          <div className="wallet-modal__header">
            <h5 className="wallet-modal__title">Sửa ví</h5>
            <button type="button" className="wallet-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="wallet-modal__body">
            {/* Tên ví */}
            <div className="fm-row">
              <label className="fm-label">Tên ví<span className="req">*</span></label>
              <input
                className={`fm-input ${touched.name && errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ví tiền mặt, Ngân hàng ACB…"
                maxLength={40}
              />
              {touched.name && errors.name && <div className="fm-feedback">{errors.name}</div>}
            </div>

            {/* Loại tiền & Số dư */}
            <div className="grid-2">
              <div className="fm-row">
                <label className="fm-label">Loại tiền tệ<span className="req">*</span></label>
                <select
                  className={`fm-select ${touched.currency && errors.currency ? "is-invalid" : ""}`}
                  value={form.currency}
                  onBlur={() => setTouched((t) => ({ ...t, currency: true }))}
                  onChange={(e) => setField("currency", e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {touched.currency && errors.currency && (
                  <div className="fm-feedback">{errors.currency}</div>
                )}
              </div>

              <div className="fm-row">
                <label className="fm-label">Số dư<span className="req">*</span></label>
                <input
                  type="number"
                  className={`fm-input ${touched.balance && errors.balance ? "is-invalid" : ""}`}
                  value={form.balance}
                  onBlur={() => setTouched((t) => ({ ...t, balance: true }))}
                  onChange={(e) => setField("balance", e.target.value)}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  placeholder="0"
                />
                {touched.balance && errors.balance && (
                  <div className="fm-feedback">{errors.balance}</div>
                )}
              </div>
            </div>

            {/* Mô tả */}
            <div className="fm-row">
              <label className="fm-label">Mô tả (tùy chọn)</label>
              <textarea
                className={`fm-textarea ${touched.note && errors.note ? "is-invalid" : ""}`}
                rows="2"
                value={form.note}
                onBlur={() => setTouched((t) => ({ ...t, note: true }))}
                onChange={(e) => setField("note", e.target.value)}
                maxLength={200}
                placeholder="Ghi chú cho ví này (tối đa 200 ký tự)"
              />
              {touched.note && errors.note && <div className="fm-feedback">{errors.note}</div>}
            </div>

            {/* Checkbox */}
            <div className="fm-check">
              <input
                id="editDefaultWallet"
                className="fm-check__input"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setField("isDefault", e.target.checked)}
              />
              <label htmlFor="editDefaultWallet">Đặt làm ví mặc định</label>
            </div>

            {/* Meta */}
            {createdAt && (
              <div className="fm-meta">
                <span>Thời gian tạo</span>
                <strong>{createdAt}</strong>
              </div>
            )}
          </div>

          <div className="wallet-modal__footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-submit" disabled={!isValid}>Lưu</button>
          </div>
        </form>
      </div>
    </>
  );

  // ✅ Render modal ra ngoài layout (không bị đè)
  return createPortal(modalUI, document.body);
}
