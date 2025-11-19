import React, { useState, useMemo } from "react";
import "../../styles/home/BudgetsPage.css";
import { useBudgetData } from "../../home/store/BudgetDataContext";
import { useCategoryData } from "../../home/store/CategoryDataContext";
import { useWalletData } from "../../home/store/WalletDataContext";
import BudgetFormModal from "../../components/budgets/BudgetFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";

// Use centralized categories from CategoryDataContext

export default function BudgetsPage() {
  const {
    budgets,
    getSpentAmount,
    getSpentForBudget,
    createBudget,
    updateBudget,
    deleteBudget,
  } = useBudgetData();
  const { expenseCategories } = useCategoryData();
  const { wallets } = useWalletData();
  const [modalMode, setModalMode] = useState("create");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [searchName, setSearchName] = useState("");
  const [searchDesc, setSearchDesc] = useState("");

  const handleAddBudget = () => {
    setModalMode("create");
    setModalInitial(null);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEditBudget = (budget) => {
    setModalMode("edit");
    setModalInitial({
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      categoryType: budget.categoryType,
      limitAmount: budget.limitAmount,
      startDate: budget.startDate,
      endDate: budget.endDate,
      // If walletId is null and walletName is missing or equals the special label, treat as ALL
      walletId: budget.walletId != null ? budget.walletId : (budget.walletName === "Tất cả ví" ? "ALL" : (budget.walletName || null)),
      walletName: budget.walletName != null ? budget.walletName : (budget.walletId == null ? "Tất cả ví" : null),
    });
    setEditingId(budget.id);
    setModalOpen(true);
  };

  const handleModalSubmit = (payload) => {
    if (modalMode === "create") {
      createBudget(payload);
      setToast({ open: true, message: "Đã thêm hạn mức chi tiêu mới.", type: "success" });
    } else {
      updateBudget(editingId, payload);
      setToast({ open: true, message: "Đã cập nhật hạn mức chi tiêu.", type: "success" });
    }
    setModalOpen(false);
  };

  const handleDeleteBudget = () => {
    if (!confirmDel) return;
    deleteBudget(confirmDel.id);
    setConfirmDel(null);
    setToast({ open: true, message: "Đã xóa hạn mức chi tiêu.", type: "success" });
  };

  // Check if a category is already budgeted
  const categoryBudgets = useMemo(() => {
    const set = new Set(budgets.map((b) => b.categoryName));
    // If editing, remove the current budget's category from the exclusion set
    if (modalMode === "edit" && modalInitial) {
      set.delete(modalInitial.categoryName);
    }
    return set;
  }, [budgets, modalMode, modalInitial]);

  const filteredCategories = (expenseCategories || []).filter(
    (c) => !categoryBudgets.has(c.name)
  );

  // Filter budgets by search criteria
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const nameMatch = (budget.categoryName || "").toLowerCase().includes((searchName || "").toLowerCase());
      const descMatch = (budget.walletName || "").toLowerCase().includes((searchDesc || "").toLowerCase());
      return nameMatch && descMatch;
    });
  }, [budgets, searchName, searchDesc]);

  const handleSearchReset = () => {
    setSearchName("");
    setSearchDesc("");
  };

  return (
    <div className="budget-page container py-4">
      {/* HEADER – bố cục giống trang Giao dịch: trái = icon + text, phải = nút */}
      <div className="budget-header card border-0 mb-3">
        <div className="card-body budget-header-inner">
          {/* BÊN TRÁI: ICON + TIÊU ĐỀ + MÔ TẢ */}
          <div className="budget-header-left">
            <div className="budget-header-icon-wrap">
              {/* icon tương ứng chức năng: hạn mức = bi-graph-up-arrow */}
              <i className="bi bi-graph-up-arrow budget-header-icon" />
            </div>
            <div>
              <h2 className="budget-title mb-1">
                Quản lý Hạn mức Chi tiêu
              </h2>
              <p className="mb-0 budget-subtitle">
                Thiết lập và theo dõi hạn mức chi tiêu cho từng danh mục.
              </p>
            </div>
          </div>

          {/* BÊN PHẢI: NÚT THÊM HẠN MỨC */}
          <div className="budget-header-right">
            <button
              className="btn btn-primary budget-add-btn d-flex align-items-center"
              style={{ whiteSpace: "nowrap" }}
              onClick={handleAddBudget}
            >
              <i className="bi bi-plus-lg me-2" />
              Thêm Hạn mức
            </button>
          </div>
        </div>
      </div>

      {/* FORM TÌM KIẾM */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={(e) => e.preventDefault()}>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Tên danh mục</label>
              <input
                className="form-control"
                placeholder="VD: Ăn uống, Lương..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label fw-semibold">Mô tả</label>
              <input
                className="form-control"
                placeholder="Mô tả ngắn cho danh mục (tùy chọn)"
                value={searchDesc}
                onChange={(e) => setSearchDesc(e.target.value)}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1">
                Tìm kiếm
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleSearchReset}>
                Xóa
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Empty State */}
      {filteredBudgets.length === 0 ? (
        <div className="budget-empty-state">
          <svg
            className="budget-empty-icon"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="60" cy="60" r="50" stroke="#e9ecef" strokeWidth="2" />
            <path
              d="M60 35v50M40 55h40"
              stroke="#6c757d"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="75" cy="35" r="8" fill="#28a745" />
            <path
              d="M72 35l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3>Bạn chưa thiết lập Hạn mức Chi tiêu</h3>
          <p>
            Hãy bắt đầu bằng cách tạo hạn mức cho một danh mục để kiểm soát
            chi tiêu của bạn.
          </p>
          <button className="btn btn-primary" onClick={handleAddBudget}>
            Thiết lập Hạn mức Chi tiêu đầu tiên
          </button>
        </div>
      ) : (
        /* Budget Cards Grid */
        <div className="row g-4">
          {filteredBudgets.map((budget) => {
            // Get spent amount for this budget's category+wallet combo
            // Use period-aware calculation if available, otherwise fall back to regular calculation
            const spent = getSpentForBudget ? getSpentForBudget(budget) : getSpentAmount(
              budget.categoryName,
              budget.walletName
            );
            const remaining = budget.limitAmount - spent;
            const percent = Math.min(
              (spent / budget.limitAmount) * 100,
              100
            );
            const isOver = percent >= 100;
            const isWarning = percent >= 80 && percent < 100;

            return (
              <div className="col-lg-4 col-md-6" key={budget.id}>
                <div className="budget-card">
                  <div className="budget-card-header">
                    <div>
                      <h5 className="budget-card-title">
                        {budget.categoryName}
                      </h5>
                      {budget.walletName && (
                        <div className="text-muted small">
                          Ví: {budget.walletName}
                        </div>
                      )}
                    </div>
                    <span className="budget-card-month">
                      {budget.startDate && budget.endDate
                        ? `Từ ${new Date(budget.startDate).toLocaleDateString("vi-VN")} đến ${new Date(budget.endDate).toLocaleDateString("vi-VN")}`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="progress">
                    <div
                      className={`progress-bar ${
                        isOver
                          ? "bg-danger"
                          : isWarning
                          ? "bg-warning"
                          : ""
                      }`}
                      style={{ width: `${percent}%` }}
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>

                  <div className="budget-stats">
                    <div className="budget-stat-item">
                      <label className="budget-stat-label">Hạn mức</label>
                      <div className="budget-stat-value">
                        {budget.limitAmount.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="budget-stat-item">
                      <label className="budget-stat-label">Đã chi</label>
                      <div
                        className={`budget-stat-value ${
                          isOver ? "danger" : ""
                        }`}
                      >
                        {spent.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="budget-stat-item">
                      <label className="budget-stat-label">Còn lại</label>
                      <div
                        className={`budget-stat-value ${
                          remaining < 0 ? "danger" : "success"
                        }`}
                      >
                        {remaining.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="budget-stat-item">
                      <label className="budget-stat-label">Sử dụng</label>
                      <div
                        className={`budget-stat-value ${
                          isOver
                            ? "danger"
                            : isWarning
                            ? "warning"
                            : ""
                        }`}
                      >
                        {Math.round(percent)}%
                      </div>
                    </div>
                  </div>

                  <div className="budget-card-actions">
                    <button
                      className="btn-edit-budget"
                      onClick={() => handleEditBudget(budget)}
                      title="Chỉnh sửa"
                    >
                      <i className="bi bi-pencil me-1"></i>Chỉnh sửa
                    </button>
                    <button
                      className="btn-delete-budget"
                      onClick={() => setConfirmDel(budget)}
                      title="Xóa"
                    >
                      <i className="bi bi-trash me-1"></i>Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BudgetFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={modalInitial}
        categories={filteredCategories}
        wallets={wallets}
        onSubmit={handleModalSubmit}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmModal
        open={!!confirmDel}
        title="Xóa Hạn mức Chi tiêu"
        message={
          confirmDel
            ? `Bạn chắc chắn muốn xóa hạn mức cho danh mục "${confirmDel.categoryName}"?`
            : ""
        }
        okText="Xóa"
        cancelText="Hủy"
        onOk={handleDeleteBudget}
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
