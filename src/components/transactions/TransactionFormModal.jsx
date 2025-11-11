import React, { useState, useEffect } from "react";

const EMPTY_FORM = {
  type: "expense",
  walletName: "",
  amount: "",
  date: "",
  category: "Ăn uống",
  note: "",
  currency: "VND",
};

const CATEGORIES = [
  "Ăn uống",
  "Di chuyển",
  "Quà tặng",
  "Giải trí",
  "Hóa đơn",
  "Khác",
];

const WALLETS = ["Tiền mặt", "Ngân hàng A", "Ngân hàng B"];

export default function TransactionFormModal({
  open,
  mode = "create",
  initialData,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        type: initialData.type,
        walletName: initialData.walletName,
        amount: String(initialData.amount),
        date: initialData.date.slice(0, 10),
        category: initialData.category,
        note: initialData.note || "",
        currency: initialData.currency || "VND",
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm({ ...EMPTY_FORM, date: today });
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)", // nền mờ
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount || 0),
      date: form.date,
    };
    onSubmit?.(payload);
  };

  return (
    <div style={overlayStyle}>
      <div className="modal-dialog modal-dialog-scrollable" style={{ maxWidth: 620 }}>
        <div
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: 20,
            backgroundColor: "#ffffff", // 🔹 card trắng 100%
          }}
        >
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-semibold">
              {mode === "create" ? "Thêm Giao dịch Mới" : "Chỉnh sửa Giao dịch"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Loại giao dịch */}
              <div className="mb-3">
                <div className="form-label fw-semibold">Loại giao dịch</div>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={"btn type-pill " + (form.type === "income" ? "active" : "")}
                    onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                  >
                    Thu nhập
                  </button>
                  <button
                    type="button"
                    className={"btn type-pill " + (form.type === "expense" ? "active" : "")}
                    onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                  >
                    Chi tiêu
                  </button>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Ví</label>
                  <select
                    name="walletName"
                    className="form-select"
                    value={form.walletName}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Chọn ví</option>
                    {WALLETS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Số tiền</label>
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
                  <label className="form-label">Ngày</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Danh mục</label>
                  <div className="tx-category-chips">
                    {CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={"chip " + (form.category === c ? "chip-active" : "")}
                        onClick={() => setForm((f) => ({ ...f, category: c }))}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">Ghi chú</label>
                  <input
                    type="text"
                    name="note"
                    className="form-control"
                    placeholder="Bữa trưa với đồng nghiệp..."
                    value={form.note}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 pt-0">
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
    </div>
  );
}