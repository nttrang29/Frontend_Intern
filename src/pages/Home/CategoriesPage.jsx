import React, { useState } from "react";
import "../../styles/home/CategoriesPage.css";
import SuccessToast from "../../components/common/Toast/SuccessToast";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import { useCategoryData } from "../../home/store/CategoryDataContext";

export default function CategoriesPage() {
  const { expenseCategories, incomeCategories, createExpenseCategory, createIncomeCategory, updateExpenseCategory, updateIncomeCategory, deleteExpenseCategory, deleteIncomeCategory } = useCategoryData();

  const [activeTab, setActiveTab] = useState("expense"); // expense | income
  // search inputs (the inline form will be used for search)
  const [searchName, setSearchName] = useState("");
  const [searchDesc, setSearchDesc] = useState("");

  // modal for create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [modalInitial, setModalInitial] = useState("");
  const [modalEditingId, setModalEditingId] = useState(null);
  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({ open: false, message: "" });

  const currentList =
    activeTab === "expense" ? expenseCategories : incomeCategories;
  const displayedList = currentList.filter((c) => {
    const nameMatch = (c.name || "").toLowerCase().includes((searchName || "").toLowerCase());
    const descMatch = (c.description || "").toLowerCase().includes((searchDesc || "").toLowerCase());
    return nameMatch && descMatch;
  });
  const totalPages = Math.max(1, Math.ceil(displayedList.length / pageSize));
  const paginatedList = displayedList.slice((page - 1) * pageSize, page * pageSize);

  // adjust page if current page is out of bounds after filters/changes
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages, displayedList.length]);

  const resetSearch = () => {
    setSearchName("");
    setSearchDesc("");
    setPage(1);
  };

  // inline form becomes search; add/edit handled by modal
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // search is reactive via searchName/searchDesc
  };

  const openAddModal = () => {
    setModalMode("create");
    setModalInitial("");
    setModalEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setModalMode("edit");
    setModalInitial({ name: cat.name, description: cat.description || "" });
    setModalEditingId(cat.id);
    setModalOpen(true);
  };

  const handleModalSubmit = (payload) => {
    // payload = { name, description }
    if (modalMode === "create") {
      if (activeTab === "expense") {
        createExpenseCategory(payload);
      } else {
        createIncomeCategory(payload);
      }
      // go to first page to show the new item
      setPage(1);
      setToast({ open: true, message: "Đã thêm danh mục mới." });
    } else if (modalMode === "edit") {
      if (activeTab === "expense") {
        updateExpenseCategory(modalEditingId, payload);
      } else {
        updateIncomeCategory(modalEditingId, payload);
      }
      setToast({ open: true, message: "Đã cập nhật danh mục." });
    }
    setModalOpen(false);
    setModalEditingId(null);
  };

  const handleEdit = (cat) => {
    openEditModal(cat);
  };

  const handleDelete = (cat) => {
    if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) return;

    if (activeTab === "expense") {
      deleteExpenseCategory(cat.id);
    } else {
      deleteIncomeCategory(cat.id);
    }

    setToast({ open: true, message: "Đã xóa danh mục." });
    if (modalEditingId === cat.id) {
      setModalEditingId(null);
      setModalOpen(false);
    }
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
          {/* BÊN TRÁI: ICON + TEXT */}
            <div className="d-flex align-items-center gap-2">
            <div className="cat-header-icon-wrap">
              {/* icon giống ở sidebar: Danh mục = bi-tags */}
              <i className="bi bi-tags cat-header-icon" />
            </div>
            <div>
              <h2 className="mb-1" style={{ color: "#ffffff" }}>
                Danh Mục
              </h2>
              <p className="mb-0" style={{ color: "rgba(255,255,255,0.82)" }}>
                Thêm các danh mục mà bạn thường tiêu tiền vào hoặc nhận tiền từ
                đây.
              </p>
            </div>
          
          </div>

          {/* BÊN PHẢI: NÚT TAB */}
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
                  resetSearch();
                  setPage(1);
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
                  resetSearch();
                  setPage(1);
                }}
              >
                Thu nhập
              </button>
            </div>
            <div className="ms-3">
              <button
                type="button"
                className="btn category-add-header-btn d-flex align-items-center"
                onClick={openAddModal}
                aria-label="Thêm danh mục"
              >
                <i className="bi bi-plus-lg me-2" />
                Thêm danh mục
              </button>
            </div>
          </div>
        </div>
      </div>

      

      {/* FORM THÊM / SỬA */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Tên danh mục</label>
              <input
                className="form-control"
                placeholder="VD: Ăn uống, Lương..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label fw-semibold">Mô tả</label>
              <input
                className="form-control"
                placeholder="Mô tả ngắn cho danh mục (tùy chọn)"
                value={searchDesc}
                onChange={(e) => setSearchDesc(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1">
                Tìm kiếm
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={resetSearch}>
                Xóa
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* BẢNG DANH MỤC */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Danh sách danh mục</h5>
            <span className="text-muted small">Tổng: {displayedList.length} danh mục</span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>STT</th>
                  <th style={{ width: "25%" }}>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th className="text-center" style={{ width: "15%" }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Chưa có danh mục nào.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((c, idx) => (
                    <tr key={c.id}>
                      <td>{(page - 1) * pageSize + idx + 1}</td>
                      <td className="fw-semibold">{c.name}</td>
                      <td>{c.description || "-"}</td>
                      <td className="text-center">
                        <div className="dropdown">
                          <button
                            className="btn btn-link btn-sm text-muted p-0"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            title="Sửa, xóa"
                          >
                            <i className="bi bi-three-dots-vertical" />
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <button
                                className="dropdown-item"
                                type="button"
                                onClick={() => openEditModal(c)}
                              >
                                <i className="bi bi-pencil-square me-2" /> Sửa
                              </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                type="button"
                                onClick={() => handleDelete(c)}
                              >
                                <i className="bi bi-trash me-2" /> Xóa
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* PAGINATION (buttons left, counter right) */}
          <div className="d-flex justify-content-between align-items-center mt-3 gap-2">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(1)}
                title="Trang đầu"
              >
                «
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Trang trước"
              >
                ‹
              </button>
              <span className="text-muted small px-2">
                {totalPages <= 2 ? (
                  /* Show all page numbers if <= 2 pages */
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`btn btn-link btn-sm p-0 me-1 ${
                        p === page ? "text-primary fw-bold" : "text-muted"
                      }`}
                      onClick={() => setPage(p)}
                      style={{ textDecoration: "none" }}
                    >
                      {p}
                    </button>
                  ))
                ) : (
                  /* Show 1,2,...last format if > 2 pages */
                  <>
                    <button
                      className={`btn btn-link btn-sm p-0 me-1 ${
                        page === 1 ? "text-primary fw-bold" : "text-muted"
                      }`}
                      onClick={() => setPage(1)}
                      style={{ textDecoration: "none" }}
                    >
                      1
                    </button>
                    <button
                      className={`btn btn-link btn-sm p-0 me-1 ${
                        page === 2 ? "text-primary fw-bold" : "text-muted"
                      }`}
                      onClick={() => setPage(2)}
                      style={{ textDecoration: "none" }}
                    >
                      2
                    </button>
                    <span className="text-muted">...</span>
                    <button
                      className={`btn btn-link btn-sm p-0 ms-1 ${
                        page === totalPages ? "text-primary fw-bold" : "text-muted"
                      }`}
                      onClick={() => setPage(totalPages)}
                      style={{ textDecoration: "none" }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
              >
                ›
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                title="Trang cuối"
              >
                »
              </button>
            </div>
            <span className="text-muted small">
              {page}/{totalPages}
            </span>
          </div>
        </div>
      </div>

      <CategoryFormModal
        open={modalOpen}
        mode={modalMode}
        initialValue={modalInitial}
        typeLabel={activeTab === "expense" ? "chi phí" : "thu nhập"}
        onSubmit={handleModalSubmit}
        onClose={() => setModalOpen(false)}
      />

      <SuccessToast
        open={toast.open}
        message={toast.message}
        duration={2200}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}