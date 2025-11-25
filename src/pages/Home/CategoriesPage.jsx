// src/pages/Home/CategoriesPage.jsx
import React, { useRef, useState } from "react";
import "../../styles/home/CategoriesPage.css";
import Toast from "../../components/common/Toast/Toast";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import { useCategoryData } from "../../home/store/CategoryDataContext";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { useAuth } from "../../home/store/AuthContext";

const PAGE_SIZE = 9; // ✅ giới hạn 9 thẻ mỗi trang

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
  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "ROLE_ADMIN";

  // "expense" | "income" | "system"
  const [activeTab, setActiveTab] = useState("expense");

  // ===============================
  // TÌM KIẾM
  // ===============================
  const [searchQuery, setSearchQuery] = useState("");      // đang gõ
  const [searchKeyword, setSearchKeyword] = useState("");  // đã áp dụng
  const [selectedCategoryId, setSelectedCategoryId] = useState(""); // id đã áp dụng
  const [pendingCategoryId, setPendingCategoryId] = useState("");   // id đang chọn

  const [selectMenuOpen, setSelectMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [modalInitial, setModalInitial] = useState("");
  const [modalEditingId, setModalEditingId] = useState(null);
  const [modalEditingKind, setModalEditingKind] = useState(null); // 'expense' | 'income'

  const [page, setPage] = useState(1);

  // sortMode:
  // - Chi phí / Thu nhập: default | nameAsc | nameDesc | newest | oldest
  // - Mặc định: sysExpense | sysIncome
  const [sortMode, setSortMode] = useState("default");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [confirmDel, setConfirmDel] = useState(null);

  // ===============================
  // HELPER: check system category
  // ===============================
  const getIsSystemCategory = (cat) => {
    const value =
      cat?.isSystem !== undefined
        ? cat.isSystem
        : cat?.system !== undefined
        ? cat.system
        : false;

    return (
      value === true ||
      value === "true" ||
      String(value).toLowerCase() === "true"
    );
  };

  // ===============================
  // LISTS THEO TAB
  // ===============================
  const systemList = React.useMemo(() => {
    const ex =
      expenseCategories
        ?.filter((c) => getIsSystemCategory(c))
        .map((c) => ({ ...c, __type: "expense" })) || [];
    const inc =
      incomeCategories
        ?.filter((c) => getIsSystemCategory(c))
        .map((c) => ({ ...c, __type: "income" })) || [];
    return [...ex, ...inc];
  }, [expenseCategories, incomeCategories]);

  const rawList = React.useMemo(() => {
    if (activeTab === "expense") {
      return expenseCategories?.filter((c) => !getIsSystemCategory(c)) || [];
    }
    if (activeTab === "income") {
      return incomeCategories?.filter((c) => !getIsSystemCategory(c)) || [];
    }
    if (activeTab === "system") {
      return systemList;
    }
    return [];
  }, [activeTab, expenseCategories, incomeCategories, systemList]);

  // ===============================
  // SẮP XẾP
  // ===============================
  const currentList = React.useMemo(() => {
    if (!rawList) return [];
    const list = [...rawList];

    list.sort((a, b) => {
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

      if (activeTab === "system") {
        if (sortMode === "sysExpense") {
          if (a.__type !== b.__type) {
            return a.__type === "expense" ? -1 : 1;
          }
          return aName.localeCompare(bName, "vi", { sensitivity: "base" });
        }
        if (sortMode === "sysIncome") {
          if (a.__type !== b.__type) {
            return a.__type === "income" ? -1 : 1;
          }
          return aName.localeCompare(bName, "vi", { sensitivity: "base" });
        }
        return aName.localeCompare(bName, "vi", { sensitivity: "base" });
      }

      switch (sortMode) {
        case "default":
        case "newest":
          return bId - aId; // mới nhất trước
        case "oldest":
          return aId - bId;
        case "nameDesc":
          return bName.localeCompare(aName, "vi", { sensitivity: "base" });
        case "nameAsc":
        default:
          return aName.localeCompare(bName, "vi", { sensitivity: "base" });
      }
    });

    return list;
  }, [rawList, sortMode, activeTab]);

  const selectRef = useRef(null);
  useOnClickOutside(selectRef, () => setSelectMenuOpen(false));

  // ===============================
  // GỢI Ý DROPDOWN (searchQuery) + loại bỏ trùng tên
  // ===============================
  const filteredOptions = React.useMemo(() => {
    const keyword = (searchQuery || "").trim().toLowerCase();
    const source = currentList || [];

    const matched = keyword
      ? source.filter((c) =>
          (c.name || "").toLowerCase().includes(keyword)
        )
      : source;

    const seen = new Set();
    return matched.filter((c) => {
      const normalized = (c.name || "").trim().toLowerCase();
      if (!normalized) return false;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [currentList, searchQuery]);

  // ===============================
  // FILTER HIỂN THỊ (searchKeyword + selectedCategoryId)
  // ===============================
  const displayedList = React.useMemo(() => {
    const keyword = (searchKeyword || "").trim().toLowerCase();
    let list = [...currentList];

    if (keyword) {
      list = list.filter((c) =>
        (c.name || "").toLowerCase().includes(keyword)
      );
    }

    if (selectedCategoryId) {
      list = list.filter((c) => String(c.id) === selectedCategoryId);
    }

    return list;
  }, [currentList, searchKeyword, selectedCategoryId]);

  const totalPages = Math.max(1, Math.ceil(displayedList.length / PAGE_SIZE));

  const paginatedList = displayedList.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
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

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages, displayedList.length]);

  // ===============================
  // ACTIONS
  // ===============================
  const resetSearch = () => {
    setSelectedCategoryId("");
    setPendingCategoryId("");
    setSearchQuery("");
    setSearchKeyword("");
    setSelectMenuOpen(false);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchKeyword(searchQuery.trim());
    setSelectedCategoryId(pendingCategoryId || "");
    setSelectMenuOpen(false);
    setPage(1);
  };

  const openAddModal = () => {
    setModalMode("create");
    setModalInitial("");
    setModalEditingId(null);
    setModalEditingKind(activeTab === "income" ? "income" : "expense");
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    const isSystemCategory = getIsSystemCategory(cat);
    if (isSystemCategory && !isAdmin) return;

    const kind = cat.__type
      ? cat.__type
      : activeTab === "income"
      ? "income"
      : "expense";

    setModalMode("edit");
    setModalInitial({
      name: cat.name,
      description: cat.description || "",
    });
    setModalEditingId(cat.id);
    setModalEditingKind(kind);
    setModalOpen(true);
  };

  // ===============================
  // VALIDATE DUPLICATE & SUBMIT MODAL
  // ===============================
  const handleModalSubmit = (payload) => {
    const rawName = (payload.name || "").trim();
    if (!rawName) return;
    const normalized = rawName.toLowerCase();

    if (modalMode === "create") {
      const createKind =
        activeTab === "income" || modalEditingKind === "income"
          ? "income"
          : "expense";

      const listInKind =
        createKind === "expense"
          ? expenseCategories || []
          : incomeCategories || [];

      const isDuplicate = listInKind.some((c) => {
        if (getIsSystemCategory(c)) return false;
        const existingName = (c.name || "").trim().toLowerCase();
        if (!existingName) return false;
        return existingName === normalized;
      });

      if (isDuplicate) {
        setToast({
          open: true,
          message:
            createKind === "expense"
              ? "Bạn đã có danh mục chi phí cá nhân này rồi."
              : "Bạn đã có danh mục thu nhập cá nhân này rồi.",
          type: "error",
        });
        return;
      }

      if (createKind === "expense") {
        createExpenseCategory({ ...payload, name: rawName });
      } else {
        createIncomeCategory({ ...payload, name: rawName });
      }

      setPage(1);
      setToast({
        open: true,
        message: "Đã thêm danh mục mới.",
        type: "success",
      });
    } else if (modalMode === "edit") {
      const listInKind =
        modalEditingKind === "income"
          ? incomeCategories || []
          : expenseCategories || [];

      const isDuplicate = listInKind.some((c) => {
        if (c.id === modalEditingId) return false;
        if (getIsSystemCategory(c)) return false;
        const existingName = (c.name || "").trim().toLowerCase();
        if (!existingName) return false;
        return existingName === normalized;
      });

      if (isDuplicate) {
        setToast({
          open: true,
          message:
            modalEditingKind === "income"
              ? "Đã tồn tại danh mục thu nhập cá nhân này."
              : "Đã tồn tại danh mục chi phí cá nhân này.",
          type: "error",
        });
        return;
      }

      if (modalEditingKind === "expense") {
        updateExpenseCategory(modalEditingId, { ...payload, name: rawName });
      } else {
        updateIncomeCategory(modalEditingId, { ...payload, name: rawName });
      }

      setToast({
        open: true,
        message: "Đã cập nhật danh mục.",
        type: "success",
      });
    }

    setModalOpen(false);
    setModalEditingId(null);
    setModalEditingKind(null);
  };

  const handleDelete = (cat) => {
    const isSystemCategory = getIsSystemCategory(cat);
    if (isSystemCategory && !isAdmin) return;
    setConfirmDel(cat);
  };

  const doDelete = async () => {
    if (!confirmDel) return;

    const cat = confirmDel;
    setConfirmDel(null);

    try {
      const kind = cat.__type
        ? cat.__type
        : activeTab === "income"
        ? "income"
        : "expense";

      if (kind === "expense") {
        await deleteExpenseCategory(cat.id);
      } else {
        await deleteIncomeCategory(cat.id);
      }

      setToast({
        open: true,
        message: `Đã xóa danh mục "${cat.name}"`,
        type: "success",
      });

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

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="cat-page container py-4">
      {/* HEADER */}
      <div className="cat-header card border-0 mb-3 category-header-funds">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="cat-header-icon-wrap">
              <i className="bi bi-tags cat-header-icon" />
            </div>
            <div>
              <h2 className="mb-1">Danh Mục</h2>
              <p className="mb-0">
                Thêm các danh mục mà bạn thường tiêu tiền vào hoặc nhận tiền từ
                đây.
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="funds-tabs">
              <button
                type="button"
                className={
                  "funds-tab" +
                  (activeTab === "expense" ? " funds-tab--active" : "")
                }
                onClick={() => {
                  setActiveTab("expense");
                  setSortMode("default");
                  resetSearch();
                }}
              >
                Chi phí
              </button>
              <button
                type="button"
                className={
                  "funds-tab" +
                  (activeTab === "income" ? " funds-tab--active" : "")
                }
                onClick={() => {
                  setActiveTab("income");
                  setSortMode("default");
                  resetSearch();
                }}
              >
                Thu nhập
              </button>
              <button
                type="button"
                className={
                  "funds-tab" +
                  (activeTab === "system" ? " funds-tab--active" : "")
                }
                onClick={() => {
                  setActiveTab("system");
                  setSortMode("sysExpense");
                  resetSearch();
                }}
              >
                Mặc định
              </button>
            </div>

            <div className="ms-3">
              <button
                type="button"
                className="btn btn-outline-primary category-add-header-btn"
                onClick={openAddModal}
              >
                <i className="bi bi-plus-circle me-1" />
                Thêm danh mục
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FORM TÌM KIẾM */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 18 }}>
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
                    setPendingCategoryId("");
                    setSelectMenuOpen(true);
                  }}
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="category-search-clear-btn"
                    onClick={resetSearch}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}

                {selectMenuOpen && (
                  <div className="searchable-select-menu">
                    <button
                      type="button"
                      className={`searchable-option ${
                        !pendingCategoryId ? "active" : ""
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setPendingCategoryId("");
                        setSelectedCategoryId("");
                        setSearchKeyword("");
                        setSearchQuery("");
                        setSelectMenuOpen(false);
                        setPage(1);
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
                            pendingCategoryId === String(cat.id)
                              ? "active"
                              : ""
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const idStr = String(cat.id);
                            setPendingCategoryId(idStr);
                            setSelectedCategoryId(idStr);
                            setSearchQuery(cat.name || "");
                            setSearchKeyword(""); // lọc theo id
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

              {/* NÚT TÌM KIẾM + SẮP XẾP */}
              <div className="category-search-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm category-search-submit"
                >
                  Tìm kiếm
                </button>

                <div className="category-sort">
                  <span>
                    {activeTab === "system" ? "Ưu tiên:" : "Sắp xếp:"}
                  </span>
                  {activeTab === "system" ? (
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                    >
                      <option value="sysExpense">Chi phí mặc định</option>
                      <option value="sysIncome">Thu nhập mặc định</option>
                    </select>
                  ) : (
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                    >
                      <option value="default">Mặc định</option>
                      <option value="nameAsc">Tên (A → Z)</option>
                      <option value="nameDesc">Tên (Z → A)</option>
                      <option value="newest">Mới → Cũ</option>
                      <option value="oldest">Cũ → Mới</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* DANH MỤC DẠNG THẺ */}
      <div
        className="card border-0 shadow-sm cat-table-card"
        style={{ borderRadius: 18, overflow: "hidden" }}
      >
        <div className="card-body category-cards-wrapper">
          {displayedList.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <i className="bi bi-inboxes fs-1 d-block mb-2" />
              <div className="fw-semibold mb-1">
                Không còn danh mục phù hợp với tìm kiếm
              </div>
              <div className="small mb-3">
                Hãy thêm danh mục để quản lý chi tiết thu chi của bạn.
              </div>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              {paginatedList.map((c, idx) => {
                const isSystemCategory = getIsSystemCategory(c);
                const stt = (page - 1) * PAGE_SIZE + idx + 1;

                const isExpense =
                  activeTab === "system"
                    ? c.__type === "expense"
                    : activeTab === "expense";

                return (
                  <div className="col" key={c.id}>
                    <div className="category-card h-100 card border-0 shadow-sm">
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="badge bg-light text-muted cat-index-badge">
                            #{stt.toString().padStart(2, "0")}
                          </span>
                          {isSystemCategory && (
                            <span className="badge bg-soft-info text-info small">
                              Mặc định hệ thống
                            </span>
                          )}
                        </div>

                        <h5 className="category-card-title mb-1">{c.name}</h5>

                        <p
                          className="category-card-desc text-muted small mb-3 flex-grow-1"
                          title={c.description || "-"}
                        >
                          {c.description || "Không có mô tả."}
                        </p>

                        <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                          <div className="text-muted small">
                            {isExpense ? (
                              <span className="badge bg-soft-danger text-danger">
                                Chi phí
                              </span>
                            ) : (
                              <span className="badge bg-soft-success text-success">
                                Thu nhập
                              </span>
                            )}
                          </div>
                          <div className="d-flex align-items-center">
                            {!isSystemCategory || isAdmin ? (
                              <>
                                <button
                                  className="btn btn-link btn-sm text-muted me-2 p-0 category-action-btn"
                                  type="button"
                                  onClick={() => openEditModal(c)}
                                  title="Sửa danh mục"
                                >
                                  <i className="bi bi-pencil-square" />
                                  <span className="ms-1 d-none d-sm-inline">
                                    Sửa
                                  </span>
                                </button>
                                <button
                                  className="btn btn-link btn-sm text-danger p-0 category-action-btn"
                                  type="button"
                                  onClick={() => handleDelete(c)}
                                  title="Xóa danh mục"
                                >
                                  <i className="bi bi-trash" />
                                  <span className="ms-1 d-none d-sm-inline">
                                    Xóa
                                  </span>
                                </button>
                              </>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
        typeLabel={
          modalEditingKind === "income" || activeTab === "income"
            ? "thu nhập"
            : "chi phí"
        }
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
        onClose={() =>
          setToast({ open: false, message: "", type: "success" })
        }
      />
    </div>
  );
}
