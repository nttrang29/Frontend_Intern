import React, { useMemo, useState } from "react";
import { useWalletData } from "../../home/store/WalletDataContext";

export default function WalletGroupCreateModal({ open, onClose }) {
  const { wallets, createGroup, createWallet, linkBudgetWallet } = useWalletData();
  const [form, setForm] = useState({ name: "", description: "", isDefault: false, budgetWalletId: "" });

  const sharedWallets = useMemo(() => wallets.filter(w => w.isShared), [wallets]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState({ name: "", currency: "VND", type: "BANK", openingBalance: 0 });

  if (!open) return null;

  const canSubmit = !!form.name.trim();

  const handleQuickCreateWallet = async () => {
    if (!quick.name.trim()) return;
    const w = await createWallet({
      name: quick.name.trim(),
      currency: quick.currency,
      type: quick.type,
      balance: Number(quick.openingBalance || 0),
      note: "",
      isDefault: false,
      isShared: true,   // ví nhóm
      groupId: null,    // sẽ gắn sau khi nhóm tạo xong
    });
    setForm(f => ({ ...f, budgetWalletId: String(w.id) })); // auto chọn
    setQuickOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const g = await createGroup({
      name: form.name,
      description: form.description,
      isDefault: form.isDefault
    });

    if (form.budgetWalletId) {
      linkBudgetWallet(g.id, Number(form.budgetWalletId)); // gán 2 chiều
    }
    onClose?.();
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content" onSubmit={submit}>
          <div className="modal-header">
            <h5 className="modal-title">Tạo nhóm ví</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Tên nhóm ví *</label>
              <input className="form-control"
                     value={form.name}
                     onChange={e => setForm({ ...form, name: e.target.value })}/>
            </div>

            <div className="mb-3">
              <label className="form-label">Mô tả</label>
              <textarea className="form-control" rows="2"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}/>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Ví ngân sách của nhóm</label>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setQuickOpen(v => !v)}>
                + Tạo nhanh ví nhóm
              </button>
            </div>

            {quickOpen && (
              <div className="border rounded p-3 mb-3 bg-light">
                <div className="row g-2">
                  <div className="col-md-5">
                    <input className="form-control" placeholder="Tên ví *"
                           value={quick.name} onChange={e=>setQuick(p=>({ ...p, name:e.target.value }))}/>
                  </div>
                  <div className="col-md-3">
                    <select className="form-select" value={quick.type} onChange={e=>setQuick(p=>({ ...p, type:e.target.value }))}>
                      <option value="BANK">BANK</option>
                      <option value="CASH">CASH</option>
                      <option value="EWALLET">EWALLET</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select className="form-select" value={quick.currency} onChange={e=>setQuick(p=>({ ...p, currency:e.target.value }))}>
                      <option>VND</option><option>USD</option><option>EUR</option>
                    </select>
                  </div>
                  <div className="col-md-2 d-grid">
                    <button type="button" className="btn btn-primary" onClick={handleQuickCreateWallet}>Tạo ví</button>
                  </div>
                </div>
              </div>
            )}

            <select className="form-select mb-3" value={form.budgetWalletId}
                    onChange={e=>setForm({ ...form, budgetWalletId: e.target.value })}>
              <option value="">— Chưa chọn —</option>
              {sharedWallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>

            <div className="form-check">
              <input id="setDefaultGroup" type="checkbox" className="form-check-input"
                     checked={form.isDefault}
                     onChange={e => setForm({ ...form, isDefault: e.target.checked })}/>
              <label className="form-check-label" htmlFor="setDefaultGroup">Đặt làm nhóm mặc định</label>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-light" type="button" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              <i className="bi bi-check2 me-1"></i> Tạo nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
