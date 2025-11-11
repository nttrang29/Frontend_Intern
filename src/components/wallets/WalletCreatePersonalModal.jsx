import React, { useMemo, useState } from "react";

export default function WalletCreatePersonalModal({
  open,
  onClose,
  onSubmit,
  currencies = ["VND"],
  existingNames = [],
}) {
  const [form, setForm] = useState({
    name: "",
    currency: currencies[0] || "VND",
    openingBalance: "0",
    isDefault: false,
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Chuẩn hóa danh sách tên đã có (case-insensitive, trim)
  const existing = useMemo(
    () =>
      new Set(
        (existingNames || []).map((s) => (s || "").toLowerCase().trim())
      ),
    [existingNames]
  );

  const blockSciNotationKeys = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const validate = (values = form) => {
    const e = {};
    const name = (values.name || "").trim();

    // Tên ví
    if (!name) e.name = "Vui lòng nhập tên ví";
    else if (name.length < 2) e.name = "Tên ví phải từ 2 ký tự";
    else if (name.length > 40) e.name = "Tên ví tối đa 40 ký tự";
    else if (existing.has(name.toLowerCase()))
      e.name = "Tên ví đã tồn tại";

    // Tiền tệ
    if (!values.currency) e.currency = "Vui lòng chọn loại tiền tệ";
    else if (!currencies.includes(values.currency))
      e.currency = "Loại tiền tệ không hợp lệ";

    // Số dư ban đầu: số nguyên ≥ 0
    if (values.openingBalance === "" || values.openingBalance === null) {
      e.openingBalance = "Vui lòng nhập số dư ban đầu";
    } else {
      const n = Number(values.openingBalance);
      if (!isFinite(n)) e.openingBalance = "Số dư không hợp lệ";
      else if (n < 0) e.openingBalance = "Số dư phải ≥ 0";
      else if (String(values.openingBalance).includes("."))
        e.openingBalance = "Chỉ nhận số nguyên";
      else if (n > 1_000_000_000_000)
        e.openingBalance = "Số dư quá lớn (≤ 1,000,000,000,000)";
    }

    // Ghi chú
    if ((values.note || "").length > 200)
      e.note = "Ghi chú tối đa 200 ký tự";

    return e;
  };

  const isValid = useMemo(
    () => Object.keys(validate()).length === 0,
    [form]
  );

  const setField = (name, value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) setErrors(validate(next));
  };

  const submit = (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    setTouched({
      name: true,
      currency: true,
      openingBalance: true,
      note: true,
    });
    if (Object.keys(v).length) return;

    onSubmit?.({
      name: form.name.trim(),
      currency: form.currency,
      openingBalance: Number(form.openingBalance),
      isDefault: !!form.isDefault,
      note: form.note?.trim() || "",
    });
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        .wallet-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .wallet-modal {
          width: 600px; max-width: 95%;
          background: #0f1115; color: #eaeef3;
          border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.45);
          overflow: hidden; border: 1px solid #2a2f3a;
        }
        .wallet-modal__header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 18px; background:#12151b; border-bottom:1px solid #2a2f3a;
        }
        .wallet-modal__title { font-size:1.05rem; font-weight:700; }
        .wallet-modal__close {
          background:none; border:none; color:#9aa3af; font-size:22px;
          cursor:pointer; padding:4px 8px; border-radius:10px;
          transition:all .2s ease;
        }
        .wallet-modal__close:hover { background:#1d2129; color:#fff; }
        .wallet-modal__body { padding:18px; }
        .wallet-modal__footer {
          display:flex; justify-content:flex-end; gap:10px;
          padding:16px 18px; border-top:1px solid #2a2f3a;
          background:#12151b;
        }

        .fm-row { margin-bottom:14px; }
        .fm-label { color:#9aa3af; font-size:.92rem; margin-bottom:6px; display:block; }
        .req { color:#fff; margin-left:2px; }

        .fm-input, .fm-select, .fm-textarea {
          width:100%; background:#0c0f14; color:#eaeef3;
          border:1px solid #2a2f3a; border-radius:10px;
          padding:10px 12px; transition:all .2s ease;
        }
        .fm-input:focus, .fm-select:focus, .fm-textarea:focus {
          border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,0.18);
          outline:none;
        }
        .is-invalid {
          border-color:#ef4444 !important; box-shadow:0 0 0 3px rgba(239,68,68,0.15);
        }
        .fm-feedback { color:#ef4444; font-size:.86rem; margin-top:5px; }
        .fm-hint { color:#9aa3af; font-size:.82rem; margin-top:4px; }

        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width:560px){ .grid-2{grid-template-columns:1fr;} }

        .fm-check { display:flex; align-items:center; gap:8px; margin-top:8px; }
        .fm-check__input { width:18px; height:18px; accent-color:#10b981; }

        .btn-cancel, .btn-submit {
          border:none; border-radius:999px; padding:10px 16px; font-weight:600;
          transition:all .2s ease; cursor:pointer;
        }
        .btn-cancel {
          background:#0c0f14; color:#eaeef3; border:1px solid #2a2f3a;
        }
        .btn-cancel:hover { background:#1a1d24; }
        .btn-submit {
          background:#10b981; color:#09100f;
        }
        .btn-submit:hover { background:#0ea371; }
        .btn-submit:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>

      <div className="wallet-modal-overlay">
        <form className="wallet-modal" onSubmit={submit}>
          <div className="wallet-modal__header">
            <h5 className="wallet-modal__title">Tạo ví cá nhân</h5>
            <button
              type="button"
              className="wallet-modal__close"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="wallet-modal__body">
            {/* Tên ví */}
            <div className="fm-row">
              <label className="fm-label">
                Tên ví<span className="req">*</span>
              </label>
              <input
                className={`fm-input ${touched.name && errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ví tiền mặt, Techcombank, Momo…"
                maxLength={40}
              />
              {touched.name && errors.name && (
                <div className="fm-feedback">{errors.name}</div>
              )}
            </div>

            {/* Tiền tệ & Số dư ban đầu */}
            <div className="grid-2">
              <div className="fm-row">
                <label className="fm-label">
                  Tiền tệ<span className="req">*</span>
                </label>
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
                <label className="fm-label">
                  Số dư ban đầu<span className="req">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className={`fm-input ${touched.openingBalance && errors.openingBalance ? "is-invalid" : ""}`}
                  value={form.openingBalance}
                  onBlur={() => setTouched((t) => ({ ...t, openingBalance: true }))}
                  onChange={(e) => setField("openingBalance", e.target.value)}
                  onKeyDown={blockSciNotationKeys}
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
                placeholder="Ghi chú cho ví này (tối đa 200 ký tự)"
              />
              {touched.note && errors.note && (
                <div className="fm-feedback">{errors.note}</div>
              )}
            </div>

            {/* Mặc định */}
            <div className="fm-check">
              <input
                id="createDefaultWallet"
                className="fm-check__input"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setField("isDefault", e.target.checked)}
              />
              <label htmlFor="createDefaultWallet">
                Đặt làm ví mặc định cho {form.currency}
              </label>
            </div>
          </div>

          <div className="wallet-modal__footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-submit" disabled={!isValid}>
              Tạo ví cá nhân
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
