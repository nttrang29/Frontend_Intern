import React, { useState } from "react";
import "../../styles/home/CategoriesPage.css";
import SuccessToast from "../../components/common/Toast/SuccessToast";

// 5 danh mục mẫu – Chi phí
const INITIAL_EXPENSE_CATEGORIES = [
  { id: 1, name: "Ăn uống", description: "Cơm, nước, cafe, đồ ăn vặt" },
  { id: 2, name: "Di chuyển", description: "Xăng xe, gửi xe, phương tiện công cộng" },
  { id: 3, name: "Mua sắm", description: "Quần áo, giày dép, đồ dùng cá nhân" },
  { id: 4, name: "Hóa đơn", description: "Điện, nước, internet, điện thoại" },
  { id: 5, name: "Giải trí", description: "Xem phim, game, du lịch, hội họp bạn bè" },
];

// 5 danh mục mẫu – Thu nhập
const INITIAL_INCOME_CATEGORIES = [
  { id: 101, name: "Lương", description: "Lương chính hàng tháng" },
  { id: 102, name: "Thưởng", description: "Thưởng dự án, thưởng KPI" },
  { id: 103, name: "Bán hàng", description: "Bán đồ cũ, bán online" },
  { id: 104, name: "Lãi tiết kiệm", description: "Lãi ngân hàng, lãi đầu tư an toàn" },
  { id: 105, name: "Khác", description: "Các khoản thu nhập khác" },
];

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState("expense"); // expense | income
  const [expenseCategories, setExpenseCategories] = useState(
    INITIAL_EXPENSE_CATEGORIES
  );
  const [incomeCategories, setIncomeCategories] = useState(
    INITIAL_INCOME_CATEGORIES
  );
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  const currentList =
    activeTab === "expense" ? expenseCategories : incomeCategories;

  const resetForm = () => {
    setNameInput("");
    setDescInput("");
    setEditingId(null);
  };

  const handleAddOrUpdate = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const data = {
      id: editingId || Date.now(),
      name: nameInput.trim(),
      description: descInput.trim(),
    };

    if (activeTab === "expense") {
      setExpenseCategories((list) => {
        if (editingId) {
          return list.map((c) => (c.id === editingId ? data : c));
        }
        return [...list, data];
      });
    } else {
      setIncomeCategories((list) => {
        if (editingId) {
          return list.map((c) => (c.id === editingId ? data : c));
        }
        return [...list, data];
      });
    }

    setToast({
      open: true,
      message: editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.",
    });
    resetForm();
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setNameInput(cat.name);
    setDescInput(cat.description || "");
  };

  const handleDelete = (cat) => {
    if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) return;

    if (activeTab === "expense") {
      setExpenseCategories((list) => list.filter((c) => c.id !== cat.id));
    } else {
      setIncomeCategories((list) => list.filter((c) => c.id !== cat.id));
    }

    setToast({ open: true, message: "Đã xóa danh mục." });
    if (editingId === cat.id) resetForm();
  };

  return (
    <div className="cat-page container py-4">
      {/* HEADER – màu giống trang Danh sách ví */}
      <div
        className="cat-header card border-0 mb-3"
        style={{
          borderRadius: 18,
          background:
            "linear-gradient(90deg, #00325d 0%, #004b8f 40%, #005fa8 100%)",
          color: "#ffffff",
        }}
      >
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1" style={{ color: "#ffffff" }}>
              Danh Mục
            </h2>
            <p className="mb-0" style={{ color: "rgba(255,255,255,0.82)" }}>
              Thêm các danh mục mà bạn thường tiêu tiền vào hoặc nhận tiền từ đây.
            </p>
          </div>

          <div className="d-flex align-items-center gap-3">
           <div
  className="btn-group rounded-pill bg-white p-1"
  role="group"
  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.4)" }}
>
  <button
    type="button"
    className={
      "btn btn-sm rounded-pill fw-semibold px-3 " +
      (activeTab === "expense"
        ? "text-white bg-success"
        : "text-dark bg-white")
    }
    onClick={() => {
      setActiveTab("expense");
      resetForm();
    }}
  >
    Chi phí
  </button>

  <button
    type="button"
    className={
      "btn btn-sm rounded-pill fw-semibold px-3 " +
      (activeTab === "income"
        ? "text-white bg-success"
        : "text-dark bg-white")
    }
    onClick={() => {
      setActiveTab("income");
      resetForm();
    }}
  >
    Thu nhập
  </button>
</div>
          </div>
        </div>
      </div>

      {/* FORM THÊM / SỬA */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form
            className="row g-3 align-items-end"
            onSubmit={handleAddOrUpdate}
          >
            <div className="col-md-4">
              <label className="form-label fw-semibold">Tên danh mục</label>
              <input
                className="form-control"
                placeholder="VD: Ăn uống, Lương..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="col-md-5">
              <label className="form-label fw-semibold">Mô tả</label>
              <input
                className="form-control"
                placeholder="Mô tả ngắn cho danh mục (tùy chọn)"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1">
                {editingId ? "Lưu thay đổi" : "Thêm danh mục"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* BẢNG DANH MỤC */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              Danh sách danh mục{" "}
              <span className="badge bg-light text-secondary ms-1">
                {activeTab === "expense" ? "Chi phí" : "Thu nhập"}
              </span>
            </h5>
            <span className="text-muted small">
              Tổng: {currentList.length} danh mục
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th style={{ width: "25%" }}>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th className="text-center" style={{ width: "15%" }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Chưa có danh mục nào.
                    </td>
                  </tr>
                ) : (
                  currentList.map((c, idx) => (
                    <tr key={c.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">{c.name}</td>
                      <td>{c.description || "-"}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-link btn-sm text-muted me-2"
                          type="button"
                          onClick={() => handleEdit(c)}
                          title="Sửa"
                        >
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button
                          className="btn btn-link btn-sm text-danger"
                          type="button"
                          onClick={() => handleDelete(c)}
                          title="Xóa"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SuccessToast
        open={toast.open}
        message={toast.message}
        duration={2200}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}
