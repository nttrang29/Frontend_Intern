import React, { useEffect, useMemo, useState } from "react";

export default function WalletGroupEditModal({
  group,
  onClose,
  onSubmit,
  existingNames = [],
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    wallets: "",
    isDefault: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!group) return;
    setForm({
      name: group.name || "",
      description: group.description || "",
      wallets: (group.wallets || []).join(", "),
      isDefault: !!group.isDefault,
    });
  }, [group]);

  const existing = useMemo(
    () =>
      new Set(
        (existingNames || [])
          .map((s) => s.toLowerCase().trim())
          .filter((n) => n !== (group?.name || "").toLowerCase().trim())
      ),
    [existingNames, group]
  );

  function validate() {
    const e = {};
    const name = form.name.trim();
    if (!name) e.name = "Vui lòng nhập tên nhóm ví";
    if (existing.has(name.toLowerCase())) e.name = "Tên nhóm đã tồn tại";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const walletList = form.wallets
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    onSubmit({
      id: group.id,
      name: form.name.trim(),
      description: form.description?.trim() || "",
      wallets: walletList,
      isDefault: !!form.isDefault,
      createdAt: group.createdAt, // giữ nguyên
    });
  }

  if (!group) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">Sửa nhóm ví</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {/* Tên nhóm */}
            <div className="mb-3">
              <label className="form-label">Tên nhóm ví <span className="text-danger">*</span></label>
              <input
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            {/* Mô tả */}
            <div className="mb-3">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Danh sách ví */}
            <div className="mb-3">
              <label className="form-label">Danh sách ví</label>
              <input
                className="form-control"
                placeholder="Ngăn cách bằng dấu phẩy, ví dụ: Momo, Techcombank"
                value={form.wallets}
                onChange={(e) => setForm((f) => ({ ...f, wallets: e.target.value }))}
              />
              <div className="form-text">Mẹo: bạn có thể làm UI multiselect sau</div>
            </div>

            {/* Mặc định */}
            <div className="form-check">
              <input
                id="editDefaultGroup"
                className="form-check-input"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="editDefaultGroup">
                Đặt làm nhóm mặc định
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-check2 me-1" /> Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
