// src/components/wallets/WalletCreateGroupModal.jsx
import React, { useEffect, useState } from "react";
import { useWalletData } from "../../home/store/WalletDataContext";

const TYPES = ["CASH","BANK","EWALLET"];

export default function WalletCreateGroupModal({ open, onClose, currencies = ["VND"], onCreated }) {
  const { createWallet } = useWalletData();

  const [form, setForm] = useState({
    name: "",
    type: "BANK",
    currency: currencies[0] || "VND",
    openingBalance: 0,
    note: "",
    approvalPolicy: { enabled: false, threshold: "" },
  });

  useEffect(() => {
    setForm(f => ({ ...f, currency: currencies[0] || "VND" }));
  }, [currencies]);

  if (!open) return null;

  const canSubmit = !!form.name.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      name: form.name.trim(),
      currency: form.currency,
      type: form.type || "BANK",
      balance: Number(form.openingBalance || 0),
      note: form.note?.trim() || "",
      isDefault: false,
      isShared: true,       // ✅ là ví nhóm
      groupId: null,        // ✅ KHÔNG gắn nhóm
      approvalPolicy: form.approvalPolicy.enabled
        ? { enabled: true, threshold: Number(form.approvalPolicy.threshold || 0) }
        : { enabled: false },
    };

    const w = await createWallet(payload); // sẽ hiển thị ngay ở Danh sách ví
    onCreated?.(w);
    onClose?.();
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.35)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <form className="modal-content" onSubmit={submit}>
          <div className="modal-header">
            <h5 className="modal-title">Tạo ví nhóm</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Tên ví nhóm *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="row g-3">
              

              <div className="col-md-4">
                <label className="form-label">Tiền tệ *</label>
                <select
                  className="form-select"
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                >
                  {(currencies || ["VND"]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Số dư ban đầu</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={form.openingBalance}
                  onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label">Ghi chú</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <hr className="my-4" />
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="apprv"
                checked={form.approvalPolicy.enabled}
                onChange={e => setForm({
                  ...form,
                  approvalPolicy: { ...form.approvalPolicy, enabled: e.target.checked }
                })}
              />
              <label className="form-check-label" htmlFor="apprv">
                Bật duyệt chi theo ngưỡng
              </label>
            </div>

            {form.approvalPolicy.enabled && (
              <div className="mt-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Ngưỡng duyệt (VND)"
                  value={form.approvalPolicy.threshold}
                  onChange={e => setForm({
                    ...form,
                    approvalPolicy: { ...form.approvalPolicy, threshold: e.target.value }
                  })}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              Tạo ví nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
