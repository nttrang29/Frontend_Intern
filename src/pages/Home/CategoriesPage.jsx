import React, { useState } from "react";
import "../../styles/home/CategoriesPage.css";
import Toast from "../../components/common/Toast/Toast";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
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
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [confirmDel, setConfirmDel] = useState(null); // Danh mục cần xóa

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
    // Không cho phép sửa danh mục hệ thống
    const isSystemValue = cat.isSystem !== undefined ? cat.isSystem : (cat.system !== undefined ? cat.system : false);
    const isSystemCategory = isSystemValue === true || isSystemValue === "true" || String(isSystemValue).toLowerCase() === "true";
    if (isSystemCategory) {
      return;
    }
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
      setToast({ open: true, message: "Đã thêm danh mục mới.", type: "success" });
    } else if (modalMode === "edit") {
      if (activeTab === "expense") {
        updateExpenseCategory(modalEditingId, payload);
      } else {
        updateIncomeCategory(modalEditingId, payload);
      }
      setToast({ open: true, message: "Đã cập nhật danh mục.", type: "success" });
    }
    setModalOpen(false);
    setModalEditingId(null);
  };

  const handleEdit = (cat) => {
    openEditModal(cat);
  };

  const handleDelete = (cat) => {
    // Không cho phép xóa danh mục hệ thống
    const isSystemValue = cat.isSystem !== undefined ? cat.isSystem : (cat.system !== undefined ? cat.system : false);
    const isSystemCategory = isSystemValue === true || isSystemValue === "true" || String(isSystemValue).toLowerCase() === "true";
    if (isSystemCategory) {
      return;
    }
    
    // Mở modal xác nhận thay vì window.confirm
    setConfirmDel(cat);
  };

  const doDelete = async () => {
    if (!confirmDel) return;

    const cat = confirmDel;
    setConfirmDel(null); // Đóng modal

    try {
      if (activeTab === "expense") {
        await deleteExpenseCategory(cat.id);
      } else {
        await deleteIncomeCategory(cat.id);
      }

      setToast({ open: true, message: `Đã xóa danh mục "${cat.name}"`, type: "success" });
      
      // Đóng modal edit nếu đang edit danh mục này
      if (modalEditingId === cat.id) {
        setModalEditingId(null);
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Lỗi khi xóa danh mục:", error);
      setToast({ open: true, message: error.message || "Lỗi khi xóa danh mục", type: "error" });
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
                className="btn btn-sm btn-success rounded-pill category-add-header-btn"
                onClick={openAddModal}
                style={{ padding: "6px 14px" }}
              >
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
                  paginatedList.map((c, idx) => {
                    // Kiểm tra isSystem - hỗ trợ cả boolean và string
                    // Jackson có thể serialize thành "system" thay vì "isSystem" (đã fix ở backend với @JsonProperty)
                    const isSystemValue = c.isSystem !== undefined ? c.isSystem : (c.system !== undefined ? c.system : false);
                    const isSystemCategory = isSystemValue === true || isSystemValue === "true" || String(isSystemValue).toLowerCase() === "true";
                    
                    return (
                      <tr key={c.id}>
                        <td>{(page - 1) * pageSize + idx + 1}</td>
                        <td className="fw-semibold">{c.name}</td>
                        <td>{c.description || "-"}</td>
                        <td className="text-center">
                          {!isSystemCategory ? (
                            <>
                              <button className="btn btn-link btn-sm text-muted me-2" type="button" onClick={() => openEditModal(c)} title="Sửa">
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
                            </>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* PAGINATION (bottom-right) */}
          <div className="d-flex justify-content-end align-items-center mt-3">
            <div className="text-muted small me-3">Trang {page} / {totalPages}</div>
            <nav aria-label="Page navigation">
              <ul className="pagination mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous">« Trước</button>
                </li>
                <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next">Sau »</button>
                </li>
              </ul>
            </nav>
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

      <ConfirmModal
        open={!!confirmDel}
        title="Xóa danh mục"
        message={confirmDel ? `Xóa danh mục "${confirmDel.name}"?` : ""}
        okText="Xóa"
        cancelText="Hủy"
        onOk={doDelete}
        onClose={() => setConfirmDel(null)}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={2200}
        onClose={() => setToast({ open: false, message: "", type: "success" })}
      />
    </div>
  );
}