import React, { useState } from "react";

const TYPES = ["CASH","BANK","EWALLET"];

export default function WalletCreatePersonalModal({ open, onClose, onSubmit, currencies = ["VND"], existingNames = [] }) {
  const [form, setForm] = useState({
    name: "", type: "CASH", currency: currencies[0] || "VND",
    openingBalance: 0, isDefault: false, note: ""
  });

  const dup = form.name && existingNames.includes(form.name.toLowerCase().trim());
  const canSubmit = form.name && !dup;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit?.(form);
  };

  if (!open) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.35)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <form className="modal-content" onSubmit={submit}>
          <div className="modal-header">
            <h5 className="modal-title">Tạo ví cá nhân</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Tên ví*</label>
              <input className={`form-control ${dup ? "is-invalid" : ""}`} value={form.name}
                     onChange={e=>setForm({...form, name:e.target.value})} />
              {dup && <div className="invalid-feedback">Tên ví đã tồn tại.</div>}
            </div>

            <div className="row g-3">
              
              <div className="col-md-4">
                <label className="form-label">Tiền tệ*</label>
                <select className="form-select" value={form.currency}
                        onChange={e=>setForm({...form, currency:e.target.value})}>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Số dư ban đầu</label>
                <input type="number" min="0" className="form-control" value={form.openingBalance}
                       onChange={e=>setForm({...form, openingBalance:e.target.value})}/>
              </div>
            </div>

            <div className="form-check mt-3">
              <input className="form-check-input" type="checkbox" id="isDefault"
                     checked={form.isDefault}
                     onChange={e=>setForm({...form, isDefault: e.target.checked})}/>
              <label className="form-check-label" htmlFor="isDefault">
                Đặt làm ví mặc định cho {form.currency}
              </label>
            </div>

            <div className="mt-3">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-control" rows={2}
                        value={form.note} onChange={e=>setForm({...form, note:e.target.value})}/>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>Tạo ví cá nhân</button>
          </div>
        </form>
      </div>
    </div>
  );
}
