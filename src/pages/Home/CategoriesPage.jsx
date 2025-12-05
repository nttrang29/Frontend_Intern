// src/pages/Home/CategoriesPage.jsx
import React, { useRef, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/pages/CategoriesPage.css";
import Toast from "../../components/common/Toast/Toast";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { useAuth } from "../../contexts/AuthContext";
import { useBudgetData } from "../../contexts/BudgetDataContext";

const PAGE_SIZE = 9; // ✅ giới hạn 9 thẻ mỗi trang

const parseDateOnly = (value) => {
  if (!value) return null;
  const [datePart] = String(value).split("T");
  const parts = datePart.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((num) => Number.isNaN(num))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
};

const isBudgetPendingOrActive = (budget) => {
  if (!budget) return false;
  const status = String(budget.status || budget.budgetStatus || "").toUpperCase();
  if (["PENDING", "ACTIVE", "RUNNING"].includes(status)) return true;
  if (["ENDED", "EXPIRED", "CANCELLED", "STOPPED", "ARCHIVED"].includes(status)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDateOnly(budget.startDate);
  const end = parseDateOnly(budget.endDate);

  if (start && today < start) return true;
  if (end && today > end) return false;
  return true;
};

const getLinkedBudgetsByCategory = (budgets, categoryId) => {
  if (!budgets || !categoryId) return [];
  const normalizedId = Number(categoryId);
  if (Number.isNaN(normalizedId)) return [];
  return budgets.filter((budget) => {
    if (budget?.categoryId === undefined || budget?.categoryId === null) {
      return false;
    }
    if (Number(budget.categoryId) !== normalizedId) return false;
    return isBudgetPendingOrActive(budget);
  });
};

export default function CategoriesPage() {
  const { t } = useLanguage();
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
  const { budgets, refreshBudgets } = useBudgetData();

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
  const [systemCategoryType, setSystemCategoryType] = useState("expense"); // 'expense' | 'income' - chỉ dùng khi ở tab system

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
  const [editBudgetWarning, setEditBudgetWarning] = useState(null);

  const closeCategoryModal = () => {
    setModalOpen(false);
    setModalEditingId(null);
    setModalEditingKind(null);
    setModalInitial("");
    setEditBudgetWarning(null);
  };

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
    // Chỉ admin mới được thêm danh mục hệ thống
    if (activeTab === "system" && !isAdmin) {
      return;
    }
    setEditBudgetWarning(null);
    
    setModalMode("create");
    setModalInitial("");
    setModalEditingId(null);
    if (activeTab === "system") {
      // Ở tab system, để user chọn loại
      setModalEditingKind(null);
      setSystemCategoryType("expense"); // Mặc định là chi phí
    } else {
      setModalEditingKind(activeTab === "income" ? "income" : "expense");
    }
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    const isSystemCategory = getIsSystemCategory(cat);
    if (isSystemCategory && !isAdmin) return;
    setEditBudgetWarning(null);

    const kind = cat.__type
      ? cat.__type
      : activeTab === "income"
      ? "income"
      : "expense";

    setModalMode("edit");
    setModalInitial({
      name: cat.name,
      description: cat.description || "",
      icon: cat.icon || "bi-tags",
    });
    setModalEditingId(cat.id);
    setModalEditingKind(kind);
    setModalOpen(true);
  };

  // ===============================
  // VALIDATE DUPLICATE & SUBMIT MODAL
  // ===============================
  const handleModalSubmit = async (payload, options = {}) => {
    const { skipBudgetWarning = false, linkedBudgetCount: providedLinkedCount = 0 } = options;
    const rawName = (payload.name || "").trim();
    if (!rawName) return;
    const normalized = rawName.toLowerCase();
    const payloadWithName = { ...payload, name: rawName };

    if (modalMode === "create") {
      const createKind =
        activeTab === "system"
          ? systemCategoryType || "expense"
          : activeTab === "income" || modalEditingKind === "income"
          ? "income"
          : "expense";

      // Nếu đang tạo danh mục system, không cần check duplicate với danh mục cá nhân
      const isSystemCategory = activeTab === "system" || payload.isSystem;

      const listInKind =
        createKind === "expense"
          ? expenseCategories || []
          : incomeCategories || [];

      // Chỉ check duplicate với danh mục cá nhân nếu không phải system category
      // Khi ở tab system, không check duplicate với danh mục cá nhân (vì có thể trùng tên)
      const isDuplicate = !isSystemCategory && listInKind.some((c) => {
        // Bỏ qua danh mục system khi check duplicate
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
              ? t("categories.error.duplicate_expense")
              : t("categories.error.duplicate_income"),
          type: "error",
        });
        return;
      }

      try {
        // Nếu có transactionType từ payload (tab system), dùng nó
        const finalKind = payload.transactionType || createKind;
        
        if (finalKind === "expense") {
          await createExpenseCategory(payloadWithName);
        } else {
          await createIncomeCategory(payloadWithName);
        }

        setPage(1);
        setToast({
          open: true,
          message: t("categories.toast.add_success"),
          type: "success",
        });
      } catch (error) {
        console.error("Error creating category:", error);
        setToast({
          open: true,
          message: error.message || t("categories.error.create_failed"),
          type: "error",
        });
        return;
      }
    } else if (modalMode === "edit") {
      let linkedBudgetCount = providedLinkedCount;
      if (!skipBudgetWarning) {
        const linkedBudgets = getLinkedBudgetsByCategory(budgets, modalEditingId);
        linkedBudgetCount = linkedBudgets.length;
        if (linkedBudgets.length > 0) {
          setEditBudgetWarning({
            payload: payloadWithName,
            budgets: linkedBudgets,
          });
          return;
        }
      }

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
              ? t("categories.error.duplicate_income")
              : t("categories.error.duplicate_expense"),
          type: "error",
        });
        return;
      }

      try {
        if (modalEditingKind === "expense") {
          await updateExpenseCategory(modalEditingId, payloadWithName);
        } else {
          await updateIncomeCategory(modalEditingId, payloadWithName);
        }

        if (linkedBudgetCount > 0 && typeof refreshBudgets === "function") {
          refreshBudgets();
        }

        setToast({
          open: true,
          message:
            linkedBudgetCount > 0
              ? t("categories.toast.update_sync_success", {
                  count: linkedBudgetCount,
                })
              : t("categories.toast.update_success"),
          type: "success",
        });
      } catch (error) {
        console.error("Error updating category:", error);
        setToast({
          open: true,
          message: error.message || t("categories.error.update_failed"),
          type: "error",
        });
        return;
      }
    }

    // Đóng modal sau khi tất cả operations hoàn thành
    closeCategoryModal();
  };

  const handleDelete = (cat) => {
    const isSystemCategory = getIsSystemCategory(cat);
    if (isSystemCategory && !isAdmin) return;
    const linkedBudgets = getLinkedBudgetsByCategory(budgets, cat?.id);
    if (linkedBudgets.length > 0) {
      setToast({
        open: true,
        message: t("categories.error.delete_has_budget", {
          count: linkedBudgets.length,
        }),
        type: "error",
      });
      return;
    }
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
        message: t("categories.toast.delete_success") + (cat?.name ? ` ${cat.name}` : ""),
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
        message: error.message || t("categories.error.delete_failed"),
        type: "error",
      });
    }
  };

  const handleProceedEditWarning = () => {
    if (!editBudgetWarning) return;
    const { payload, budgets: linked } = editBudgetWarning;
    setEditBudgetWarning(null);
    handleModalSubmit(payload, {
      skipBudgetWarning: true,
      linkedBudgetCount: Array.isArray(linked) ? linked.length : 0,
    });
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
              <h2 className="mb-1">{t("categories.page.title")}</h2>
              <p className="mb-0">{t("categories.page.subtitle")}</p>
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
                {t("categories.tab.expense")}
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
                {t("categories.tab.income")}
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
                {t("categories.tab.system")}
              </button>
            </div>

            {/* Chỉ hiển thị nút thêm khi không phải tab system hoặc là admin */}
            {(activeTab !== "system" || isAdmin) && (
              <div className="ms-3">
                <button
                  type="button"
                  className="btn btn-outline-primary category-add-header-btn"
                  onClick={openAddModal}
                >
                  <i className="bi bi-plus-circle me-1" />
                  {t("categories.btn.add")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORM TÌM KIẾM */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 18 }}>
        <div className="card-body">
          <form className="g-3" onSubmit={handleSearchSubmit}>
            <label className="form-label fw-semibold">{t("categories.filter.name")}</label>
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
                  placeholder={t("categories.filter.name_placeholder")}
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
                          {t("categories.search_all")}
                        </button>

                    {filteredOptions.length === 0 ? (
                      <div className="px-3 py-2 text-muted small">
                        {t("categories.search_none")}
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
                  {t("categories.btn.search")}
                </button>

                <div className="category-sort">
                  <span>
                    {activeTab === "system" ? t("categories.sort.priority") : t("categories.sort.label")}
                  </span>
                  {activeTab === "system" ? (
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                    >
                      <option value="sysExpense">{t("categories.sort.sysExpense")}</option>
                      <option value="sysIncome">{t("categories.sort.sysIncome")}</option>
                    </select>
                  ) : (
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                    >
                      <option value="default">{t("categories.sort.default")}</option>
                      <option value="nameAsc">{t("categories.sort.nameAsc")}</option>
                      <option value="nameDesc">{t("categories.sort.nameDesc")}</option>
                      <option value="newest">{t("categories.sort.newest")}</option>
                      <option value="oldest">{t("categories.sort.oldest")}</option>
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
                {t("categories.table.empty")}
              </div>
              <div className="small mb-3">{t("categories.empty_hint")}</div>
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
                              {t("categories.badge.system")}
                            </span>
                          )}
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-2">
                          {c.icon && (
                            <div className="category-card-icon">
                              <i className={`bi ${c.icon}`} />
                            </div>
                          )}
                          <h5 className="category-card-title mb-0">{c.name}</h5>
                        </div>

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
                                {t("categories.type.expense")}
                              </span>
                            ) : (
                              <span className="badge bg-soft-success text-success">
                                {t("categories.type.income")}
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
                                    title={t("categories.action.edit")}
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
                                  title={t("categories.action.delete")}
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
        onClose={closeCategoryModal}
        isAdmin={isAdmin}
        activeTab={activeTab}
        selectedType={systemCategoryType}
        onTypeChange={(type) => setSystemCategoryType(type)}
      />

      <ConfirmModal
        open={!!editBudgetWarning}
        title={t("categories.modal.budget_warning.title")}
        message={
          editBudgetWarning
            ? t("categories.modal.budget_warning.message", {
                count: editBudgetWarning.budgets.length,
              })
            : ""
        }
        okText={t("categories.modal.budget_warning.ok")}
        cancelText={t("categories.modal.budget_warning.cancel")}
        danger={false}
        onOk={handleProceedEditWarning}
        onClose={() => setEditBudgetWarning(null)}
      />

      <ConfirmModal
        open={!!confirmDel}
        title={t("categories.action.delete")}
        message={confirmDel ? t("categories.confirm.delete", { name: confirmDel.name }) : ""}
        okText={t("categories.action.delete")}
        cancelText={t("categories.btn.cancel")}
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
