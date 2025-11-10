import React, { useEffect, useMemo, useState } from "react";

export default function WalletEditModal({ wallet, onClose, onSubmit, currencies = [], existingNames = [] }) {
  const [form, setForm] = useState({
    name: "",
    currency: "VND",
    balance: "",
    note: "",
    isDefault: false,
    type: "CASH",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!wallet) return;
    setForm({
      name: wallet.name || "",
      currency: wallet.currency || "VND",
      balance: wallet.balance ?? "",
      note: wallet.note || "",
      isDefault: !!wallet.isDefault,
      type: wallet.type || "CASH",
    });
  }, [wallet]);

  const exists = useMemo(
    () =>
      new Set(
        (existingNames || [])
          .map(s => s.toLowerCase().trim())
          .filter(n => n !== (wallet?.name || "").toLowerCase().trim())
      ),
    [existingNames, wallet]
  );

  function validate() {
    const e = {};
    const name = form.name.trim();
    const balanceNum = Number(form.balance);

    if (!name) e.name = "Vui lòng nhập tên ví";
    if (exists.has(name.toLowerCase())) e.name = "Tên ví đã tồn tại";

    if (!form.currency) e.currency = "Vui lòng chọn loại tiền tệ";
    if (!currencies.includes(form.currency)) e.currency = "Loại tiền tệ không hợp lệ";

    if (form.balance === "" || form.balance === null) e.balance = "Vui lòng nhập số dư";
    if (!isFinite(balanceNum)) e.balance = "Số dư không hợp lệ";
    if (isFinite(balanceNum) && balanceNum < 0) e.balance = "Số dư phải ≥ 0";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: wallet.id,
      name: form.name.trim(),
      currency: form.currency,
      balance: Number(form.balance),
      note: form.note?.trim() || "",
      isDefault: !!form.isDefault,
      type: form.type,
      createdAt: wallet.createdAt,
    });
  }

  if (!wallet) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">Sửa ví</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {/* Tên ví */}
            <div className="mb-3">
              <label className="form-label">Tên ví <span className="text-danger">*</span></label>
              <input
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ví tiền mặt, Techcombank, Momo…"
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            {/* Loại tiền tệ */}
            <div className="mb-3">
              <label className="form-label">Loại tiền tệ <span className="text-danger">*</span></label>
              <select
                className={`form-select ${errors.currency ? "is-invalid" : ""}`}
                value={form.currency}
                onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                {(currencies || []).map(cur => <option key={cur} value={cur}>{cur}</option>)}
              </select>
              {errors.currency && <div className="invalid-feedback">{errors.currency}</div>}
            </div>

            {/* Số dư */}
            <div className="mb-3">
              <label className="form-label">Số dư <span className="text-danger">*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                className={`form-control ${errors.balance ? "is-invalid" : ""}`}
                value={form.balance}
                onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0"
              />
              {errors.balance && <div className="invalid-feedback">{errors.balance}</div>}
            </div>

            {/* Loại ví */}
            <div className="mb-3">
              <label className="form-label">Loại ví</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="CASH">Tiền mặt</option>
                <option value="BANK">Ngân hàng</option>
                <option value="EWALLET">Ví điện tử</option>
              </select>
            </div>

            {/* Ghi chú */}
            <div className="mb-3">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>

            {/* Mặc định */}
            <div className="form-check">
              <input
                id="editDefaultWallet"
                className="form-check-input"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="editDefaultWallet">
                Đặt làm ví mặc định
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-check2 me-1"></i> Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
