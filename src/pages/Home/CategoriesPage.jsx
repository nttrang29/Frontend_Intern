import React, { useRef, useState } from "react";
import "../../styles/home/CategoriesPage.css";
import Toast from "../../components/common/Toast/Toast";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import { useCategoryData } from "../../home/store/CategoryDataContext";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { useAuth } from "../../home/store/AuthContext";

export default function CategoriesPage() {
  const {
    expenseCategories,
    incomeCategories,
    createExpenseCategory,
    createIncomeCategory,
    updateExpenseCategory,
    updateIncomeCategory,
    deleteExpenseCategory,
    deleteIncomeCategory,
  } = useCategoryData();

  const { currentUser } = useAuth();
  // Kiểm tra role an toàn
  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "ROLE_ADMIN";

  const [activeTab, setActiveTab] = useState("expense"); // expense | income
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);

  // modal for create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [modalInitial, setModalInitial] = useState("");
  const [modalEditingId, setModalEditingId] = useState(null);
  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [confirmDel, setConfirmDel] = useState(null); // Danh mục cần xóa

  const currentList =
    activeTab === "expense" ? expenseCategories : incomeCategories;
  const selectRef = useRef(null);
  useOnClickOutside(selectRef, () => setSelectMenuOpen(false));

  const filteredOptions = React.useMemo(() => {
    const keyword = (searchQuery || "").trim().toLowerCase();
    if (!keyword) return currentList;
    return currentList.filter((c) =>
      (c.name || "").toLowerCase().includes(keyword)
    );
  }, [currentList, searchQuery]);
  const displayedList = currentList.filter((c) => {
    if (!selectedCategoryId) return true;
    return String(c.id) === selectedCategoryId;
  });
  const totalPages = Math.max(1, Math.ceil(displayedList.length / pageSize));
  const paginatedList = displayedList.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const paginationRange = React.useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = [];
    const startPage = Math.max(2, page - 1);
    const endPage = Math.min(totalPages - 1, page + 1);

    pages.push(1);
    if (startPage > 2) pages.push("start-ellipsis");

    for (let p = startPage; p <= endPage; p += 1) {
      pages.push(p);
    }

    if (endPage < totalPages - 1) pages.push("end-ellipsis");
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  // adjust page if current page is out of bounds after filters/changes
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages, displayedList.length]);

  const resetSearch = () => {
    setSelectedCategoryId("");
    setSearchQuery("");
    setSelectMenuOpen(false);
    setPage(1);
  };

  // inline form becomes search; add/edit handled by modal
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const openAddModal = () => {
    setModalMode("create");
    setModalInitial("");
    setModalEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    const isSystemValue =
      cat.isSystem !== undefined
        ? cat.isSystem
        : cat.system !== undefined
        ? cat.system
        : false;
    const isSystemCategory =
      String(isSystemValue) === "true" || isSystemValue === true;
    if (isSystemCategory && !isAdmin) {
      return;
    }

    setModalMode("edit");
    setModalInitial({
      name: cat.name,
      description: cat.description || "",
    });
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
      setToast({
        open: true,
        message: "Đã thêm danh mục mới.",
        type: "success",
      });
    } else if (modalMode === "edit") {
      if (activeTab === "expense") {
        updateExpenseCategory(modalEditingId, payload);
      } else {
        updateIncomeCategory(modalEditingId, payload);
      }
      setToast({
        open: true,
        message: "Đã cập nhật danh mục.",
        type: "success",
      });
    }
    setModalOpen(false);
    setModalEditingId(null);
  };

  const handleEdit = (cat) => {
    openEditModal(cat);
  };

  const handleDelete = (cat) => {
    const isSystemValue =
      cat.isSystem !== undefined
        ? cat.isSystem
        : cat.system !== undefined
        ? cat.system
        : false;

    const isSystemCategory =
      String(isSystemValue) === "true" || isSystemValue === true;
    if (isSystemCategory && !isAdmin) {
      return;
    }

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

      setToast({
        open: true,
        message: `Đã xóa danh mục "${cat.name}"`,
        type: "success",
      });

      // Đóng modal edit nếu đang edit danh mục này
      if (modalEditingId === cat.id) {
        setModalEditingId(null);
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Lỗi khi xóa danh mục:", error);
      setToast({
        open: true,
        message: error.message || "Lỗi khi xóa danh mục",
        type: "error",
      });
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
          <form className="g-3" onSubmit={handleSearchSubmit}>
            <label className="form-label fw-semibold">Tìm danh mục</label>
            <div className="category-search-inline">
              <div
                className={`searchable-select category-search-select flex-grow-1 ${
                  selectMenuOpen ? "is-open" : ""
                }`}
                ref={selectRef}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Chọn hoặc nhập tên danh mục"
                  value={searchQuery}
                  onFocus={() => setSelectMenuOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCategoryId("");
                    setSelectMenuOpen(true);
                  }}
                />
                {selectMenuOpen && (
                  <div className="searchable-select-menu">
                    <button
                      type="button"
                      className={`searchable-option ${
                        selectedCategoryId === "" ? "active" : ""
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedCategoryId("");
                        setSearchQuery("");
                        setSelectMenuOpen(false);
                      }}
                    >
                      Tất cả danh mục
                    </button>
                    {filteredOptions.length === 0 ? (
                      <div className="px-3 py-2 text-muted small">
                        Không tìm thấy danh mục
                      </div>
                    ) : (
                      filteredOptions.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`searchable-option ${
                            selectedCategoryId === String(cat.id)
                              ? "active"
                              : ""
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedCategoryId(String(cat.id));
                            setSearchQuery(cat.name || "");
                            setSelectMenuOpen(false);
                            setPage(1);
                          }}
                        >
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="category-search-actions">
                <button type="submit" className="btn btn-primary">
                  Tìm kiếm
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetSearch}
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* BẢNG DANH MỤC */}
      <div className="card border-0 shadow-sm cat-table-card">
        <div className="card-body p-0">
          <div className="table-responsive category-table-scroll">
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
                    const isSystemValue =
                      c.isSystem !== undefined
                        ? c.isSystem
                        : c.system !== undefined
                        ? c.system
                        : false;
                    const isSystemCategory =
                      isSystemValue === true ||
                      isSystemValue === "true" ||
                      String(isSystemValue).toLowerCase() === "true";

                    return (
                      <tr key={c.id}>
                        <td>{(page - 1) * pageSize + idx + 1}</td>
                        <td className="fw-semibold">{c.name}</td>
                        <td
                          className="category-note-cell"
                          title={c.description || "-"}
                        >
                          {c.description || "-"}
                        </td>
                        <td className="text-center">
                          {!isSystemCategory || isAdmin ? (
                            <>
                              <button
                                className="btn btn-link btn-sm text-muted me-2"
                                type="button"
                                onClick={() => openEditModal(c)}
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
        </div>
        {/* PAGINATION */}
        <div className="card-footer category-pagination-bar">
          <span className="text-muted small">
            Trang {page} / {totalPages}
          </span>
          <div className="category-pagination">
            <button
              type="button"
              className="page-arrow"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              «
            </button>
            <button
              type="button"
              className="page-arrow"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {paginationRange.map((item, idx) =>
              typeof item === "string" && item.includes("ellipsis") ? (
                <span key={item + idx} className="page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={`page-${item}`}
                  type="button"
                  className={`page-number ${page === item ? "active" : ""}`}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              className="page-arrow"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
            <button
              type="button"
              className="page-arrow"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
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
        isAdmin={isAdmin}
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
