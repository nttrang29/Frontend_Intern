import React, { useState, useMemo, useCallback } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import "../../styles/pages/BudgetsPage.css";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import BudgetFormModal from "../../components/budgets/BudgetFormModal";
import BudgetDetailModal from "../../components/budgets/BudgetDetailModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatVietnamDate, formatVietnamDateTime } from "../../utils/dateFormat";
 
// Use centralized categories from CategoryDataContext
 
export default function BudgetsPage() {
  const {
    budgets,
    getSpentAmount,
    getSpentForBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    externalTransactionsList,
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
 
  // Currency toggle state (similar to WalletsPage)
  const [budgetCurrency, setBudgetCurrency] = useState(() => localStorage.getItem("budgets_currency") || "VND");
  React.useEffect(() => {
    localStorage.setItem("budgets_currency", budgetCurrency);
  }, [budgetCurrency]);
  const toggleBudgetCurrency = () => setBudgetCurrency((c) => (c === "VND" ? "USD" : "VND"));
  const [detailBudget, setDetailBudget] = useState(null);
  const statusTabs = [
    { value: "all", label: "all" },
    { value: "healthy", label: "healthy" },
    { value: "warning", label: "warning" },
    { value: "over", label: "over" },
  ];
 
  // Helper function to convert currency (similar to WalletsPage)
  const convertCurrency = useCallback((amount, targetCurrency) => {
    const numericAmount = Number(amount) || 0;
    if (!targetCurrency || targetCurrency === "VND") return numericAmount;
   
    // Get cached exchange rate from localStorage
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
   
    if (targetCurrency === "USD") {
      return numericAmount / vndToUsd;
    }
    return numericAmount;
  }, []);
 
  // Format money with proper currency
  const formatMoneyWithCurrency = useCallback((amount, currency) => {
    const numAmount = Number(amount) || 0;
    if (currency === "USD") {
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `$${formatted}`;
    }
    return `${numAmount.toLocaleString("vi-VN")} VND`;
  }, []);
 
  const computeBudgetUsage = useCallback(
    (budget) => {
      if (!budget) {
        return { spent: 0, remaining: 0, percent: 0, status: "healthy" };
      }
 
      const spentValue = getSpentForBudget
        ? getSpentForBudget(budget)
        : getSpentAmount(budget.categoryName, budget.walletName);
 
      const limit = budget.limitAmount || 0;
      const percentRaw = limit > 0 ? (spentValue / limit) * 100 : 0;
      const percent = Math.min(999, Math.max(0, Math.round(percentRaw)));
      const threshold = budget.alertPercentage ?? 80;
 
      let status = "healthy";
      if (percent >= 100) {
        status = "over";
      } else if (percent >= threshold) {
        status = "warning";
      }
 
      return {
        spent: spentValue,
        remaining: limit - spentValue,
        percent,
        status,
      };
    },
    [getSpentAmount, getSpentForBudget]
  );
 
  const budgetUsageMap = useMemo(() => {
    const map = new Map();
    (budgets || []).forEach((budget) => {
      map.set(budget.id, computeBudgetUsage(budget));
    });
    return map;
  }, [budgets, computeBudgetUsage]);
 
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
      alertPercentage: budget.alertPercentage ?? 90,
      note: budget.note || "",
    });
    setEditingId(budget.id);
    setModalOpen(true);
  };
 
  const formatDateTime = (value) => {
    if (!value) return "";
    const formatted = formatVietnamDateTime(value);
    return formatted || "";
  };
 
  const parseDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split("T")[0].split("-").map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };
 
  const budgetStatusLabel = {
    healthy: "healthy",
    warning: "warning",
    over: "over",
  };
 
  const budgetStatusTone = {
    healthy: "success",
    warning: "warning",
    over: "danger",
  };
 
  const statusCounts = useMemo(() => {
    const total = Array.isArray(budgets) ? budgets.length : 0;
    const counts = { all: total, healthy: 0, warning: 0, over: 0 };
    budgetUsageMap.forEach((usage) => {
      if (usage?.status === "warning") counts.warning += 1;
      if (usage?.status === "over") counts.over += 1;
      if (usage?.status === "healthy") counts.healthy += 1;
    });
    counts.healthy = counts.healthy || 0;
    return counts;
  }, [budgets, budgetUsageMap]);
 
  const overviewStats = useMemo(() => {
    if (!budgets || budgets.length === 0) {
      return {
        totalLimit: 0,
        totalSpent: 0,
        totalRemaining: 0,
        warningCount: 0,
        overCount: 0,
        activeBudgets: 0,
      };
    }
 
    let totalLimit = 0;
    let totalSpent = 0;
    let warningCount = 0;
    let overCount = 0;
    let activeBudgets = 0;
    const today = new Date();
 
    budgets.forEach((budget) => {
      totalLimit += budget.limitAmount || 0;
      const usage = budgetUsageMap.get(budget.id) || { spent: 0, status: "healthy" };
      totalSpent += usage.spent || 0;
      if (usage.status === "warning") warningCount += 1;
      if (usage.status === "over") overCount += 1;
 
      const start = budget.startDate ? parseDateOnly(budget.startDate) : null;
      const end = budget.endDate ? parseDateOnly(budget.endDate) : null;
      if (!start || !end || (today >= start && today <= end)) {
        activeBudgets += 1;
      }
    });
 
    return {
      totalLimit,
      totalSpent,
      totalRemaining: totalLimit - totalSpent,
      warningCount,
      overCount,
      activeBudgets,
    };
  }, [budgets, budgetUsageMap]);
 
  const bannerState = useMemo(() => {
    const overItems = [];
    const warningItems = [];
    budgets.forEach((budget) => {
      const usage = budgetUsageMap.get(budget.id);
      if (!usage) return;
      if (usage.status === "over") overItems.push({ budget, usage });
      if (usage.status === "warning") warningItems.push({ budget, usage });
    });
    return { overItems, warningItems };
  }, [budgets, budgetUsageMap]);
 
 
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
 
  const filteredCategories = useMemo(() => {
    if (Array.isArray(expenseCategories) && expenseCategories.length > 0) {
      return expenseCategories;
    }
    const fallbackMap = new Map();
    (budgets || []).forEach((budget) => {
      const key = budget.categoryId || budget.categoryName;
      if (!key) return;
      if (!fallbackMap.has(key)) {
        fallbackMap.set(key, {
          id: budget.categoryId || key,
          name: budget.categoryName,
          categoryName: budget.categoryName,
        });
      }
    });
    return Array.from(fallbackMap.values());
  }, [expenseCategories, budgets]);
 
  const categoryIconMap = useMemo(() => {
    const map = new Map();
    (expenseCategories || []).forEach((category) => {
      if (!category) return;
      const icon = category.icon || "bi-tags";
      const idKey = category.id ?? category.categoryId;
      if (idKey !== undefined && idKey !== null) {
        map.set(`id:${idKey}`, icon);
      }
      const nameKey = (category.name || category.categoryName || "").toLowerCase();
      if (nameKey) {
        map.set(`name:${nameKey}`, icon);
      }
    });
    return map;
  }, [expenseCategories]);

  const resolveCategoryIcon = useCallback(
    (budget) => {
      if (!budget) return "bi bi-tags";
      const byId =
        budget.categoryId !== undefined && budget.categoryId !== null
          ? categoryIconMap.get(`id:${budget.categoryId}`)
          : null;
      const byName = budget.categoryName
        ? categoryIconMap.get(`name:${budget.categoryName.toLowerCase()}`)
        : null;
      const rawIcon = byId || byName || "bi-tags";
      if (rawIcon.startsWith("bi ")) return rawIcon;
      if (rawIcon.startsWith("bi-")) return `bi ${rawIcon}`;
      return `bi bi-${rawIcon}`;
    },
    [categoryIconMap]
  );

  const visibleBudgets = useMemo(() => {
    if (!Array.isArray(budgets)) return [];
    const normalizedName = searchName.trim().toLowerCase();
 
    return budgets.filter((budget) => {
      const matchesName = !normalizedName || budget.categoryName?.toLowerCase().includes(normalizedName);
      if (!matchesName) return false;
      if (statusFilter === "all") return true;
      const usage = budgetUsageMap.get(budget.id);
      return usage?.status === statusFilter;
    });
  }, [budgets, searchName, statusFilter, budgetUsageMap]);
 
  const latestTransactions = useMemo(() => {
    const list = Array.isArray(externalTransactionsList) ? externalTransactionsList : [];
   
    // Nếu có budget được chọn, lọc transactions theo budget đó
    let filtered = list;
    if (selectedBudgetId) {
      const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
      if (selectedBudget) {
        filtered = list.filter((tx) => {
          // Kiểm tra type phải là expense
          if (tx.type !== "expense") return false;
         
          // Kiểm tra danh mục
          const categoryMatch = tx.category === selectedBudget.categoryName ||
                                tx.categoryName === selectedBudget.categoryName;
          if (!categoryMatch) return false;
         
          // Kiểm tra ví (nếu budget có chỉ định ví cụ thể)
          if (selectedBudget.walletId && selectedBudget.walletName !== "Tất cả ví") {
            const walletMatch = tx.walletId === selectedBudget.walletId ||
                               tx.walletName === selectedBudget.walletName;
            if (!walletMatch) return false;
          }
         
          // Kiểm tra thời gian
          if (selectedBudget.startDate && selectedBudget.endDate) {
            const txDate = new Date(tx.date);
            const startDate = new Date(selectedBudget.startDate);
            const endDate = new Date(selectedBudget.endDate);
            endDate.setHours(23, 59, 59, 999); // Bao gồm cả ngày cuối
           
            if (txDate < startDate || txDate > endDate) return false;
          }
         
          return true;
        });
      }
    } else {
      // Nếu không có budget được chọn, lọc theo type
      filtered = list.filter((tx) => {
        if (transactionFilter === "all") return true;
        return (tx.type || "").toLowerCase() === transactionFilter.toLowerCase();
      });
    }
 
    return filtered
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [externalTransactionsList, transactionFilter, selectedBudgetId, budgets]);
 
  const handleSearchReset = useCallback(() => {
    setSearchName("");
  }, []);
 
  const handleOpenDetail = useCallback((budget) => {
    if (!budget) return;
    const usage = budgetUsageMap.get(budget.id) || computeBudgetUsage(budget);
    setDetailBudget({ budget, usage });
  }, [budgetUsageMap, computeBudgetUsage]);
 
  const handleCloseDetail = useCallback(() => {
    setDetailBudget(null);
  }, []);
 
  const handleSendReminder = useCallback((budget) => {
    if (!budget) return;
    setToast({
      open: true,
      message: t("budgets.toast.remind_sent", { category: budget.categoryName }),
      type: "success",
    });
  }, []);
 
  const handleCreateTransactionShortcut = useCallback((budget) => {
    if (!budget) return;
    setToast({
      open: true,
      message: t("budgets.toast.create_tx_placeholder", { category: budget.categoryName }),
      type: "success",
    });
  }, []);
 
  const handleViewAllTransactions = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/home/transactions";
      return;
    }
    setToast({
      open: true,
      message: "Không thể điều hướng trong môi trường hiện tại.",
      type: "error",
    });
  }, []);
 
  const handleModalSubmit = useCallback(async (payload) => {
    try {
      if (modalMode === "edit" && editingId != null) {
        await updateBudget(editingId, payload);
        setToast({ open: true, message: t("budgets.toast.update_success"), type: "success" });
      } else {
        await createBudget(payload);
        setToast({ open: true, message: t("budgets.toast.add_success"), type: "success" });
      }
    } catch (error) {
      console.error("Failed to save budget", error);
      setToast({ open: true, message: t("budgets.error.save_failed"), type: "error" });
    } finally {
      setEditingId(null);
    }
  }, [modalMode, editingId, updateBudget, createBudget]);
 
  const handleDeleteBudget = useCallback(async () => {
    if (!confirmDel) return;
    try {
      await deleteBudget(confirmDel.id);
      setToast({ open: true, message: t("budgets.toast.delete_success"), type: "success" });
    } catch (error) {
      console.error("Failed to delete budget", error);
      setToast({ open: true, message: t("budgets.error.delete_failed"), type: "error" });
    } finally {
      setConfirmDel(null);
    }
  }, [confirmDel, deleteBudget]);
 
  return (
    <div className="budget-page container-fluid py-4">
      <div className="tx-page-inner">
        {/* HEADER now uses wallet-style single container */}
        <div className="wallet-header">
          <div className="wallet-header-left">
            <div className="wallet-header-icon">
              <i className="bi bi-graph-up-arrow" />
            </div>
            <div>
              <h2 className="wallet-header-title">{t("budgets.page.title")}</h2>
              <p className="wallet-header-subtitle">{t("budgets.page.subtitle")}</p>
            </div>
          </div>
 
          <div className="wallet-header-right">
            <button
              className="wallet-header-btn d-flex align-items-center"
              onClick={handleAddBudget}
            >
              <i className="bi bi-plus-lg me-2" />
              {t("budgets.btn.add")}
            </button>
          </div>
        </div>
 
      {/* Overview metrics */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="budget-metric-card">
            <span className="budget-metric-label">
              {t("budgets.metric.total_limit")}
              <button
                type="button"
                className="budget-metric-toggle"
                title={budgetCurrency === 'VND' ? 'Chuyển sang USD' : 'Chuyển sang VND'}
                onClick={(e) => { e.stopPropagation(); toggleBudgetCurrency(); }}
                aria-pressed={budgetCurrency === 'USD'}
              >
                <i className="bi bi-arrow-repeat"></i>
              </button>
            </span>
            <div className="budget-metric-value">{formatMoneyWithCurrency(convertCurrency(overviewStats.totalLimit, budgetCurrency), budgetCurrency)}</div>
            <small className="text-muted">{t("budgets.metric.active_count", { count: overviewStats.activeBudgets })}</small>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="budget-metric-card">
            <span className="budget-metric-label">{t("budgets.metric.used")}</span>
            <div className="budget-metric-value text-primary">{formatMoneyWithCurrency(convertCurrency(overviewStats.totalSpent, budgetCurrency), budgetCurrency)}</div>
            <small className="text-muted">
              {overviewStats.totalLimit > 0
                ? t("budgets.metric.used_percent", { percent: Math.round((overviewStats.totalSpent / overviewStats.totalLimit) * 100) })
                : t("budgets.metric.no_data")}
            </small>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="budget-metric-card">
            <span className="budget-metric-label">{t("budgets.metric.remaining")}</span>
            <div className="budget-metric-value text-success">{formatMoneyWithCurrency(convertCurrency(overviewStats.totalRemaining, budgetCurrency), budgetCurrency)}</div>
            <small className="text-muted">{t("budgets.metric.overall")}</small>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="budget-metric-card">
            <span className="budget-metric-label">{t("budgets.metric.alerts")}</span>
            <div className="budget-metric-value text-danger">
              {overviewStats.warningCount + overviewStats.overCount}
            </div>
            <small className="text-muted">
              {t("budgets.metric.warning_label", { w: overviewStats.warningCount, o: overviewStats.overCount })}
            </small>
          </div>
        </div>
      </div>
 
      {(bannerState.warningItems.length > 0 || bannerState.overItems.length > 0) && (
        <div className="budget-warning-banner mb-4">
          <div>
            <p className="budget-warning-title">{t("budgets.banner.title")}</p>
            <span>
              {bannerState.overItems.length > 0 && t("budgets.banner.over_count", { count: bannerState.overItems.length })}
              {bannerState.warningItems.length > 0 && t("budgets.banner.warning_count", { count: bannerState.warningItems.length })}
            </span>
          </div>
          <div className="budget-warning-actions">
            {bannerState.warningItems.length > 0 && (
              <button className="btn btn-warning btn-sm" onClick={() => setStatusFilter("warning")}>
                {t("budgets.banner.view_warnings")}
              </button>
            )}
            {bannerState.overItems.length > 0 && (
              <button className="btn btn-outline-danger btn-sm" onClick={() => setStatusFilter("over")}>
                {t("budgets.banner.view_over")}
              </button>
            )}
          </div>
        </div>
      )}
 
      {/* FORM TÌM KIẾM */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form className="budget-filter-form row g-3 align-items-end" onSubmit={(e) => e.preventDefault()}>
            <div className="col-md-7">
              <label className="form-label fw-semibold">{t("budgets.filter.category")}</label>
              <div className="input-with-btn d-flex align-items-center">
                <input
                  className="form-control"
                  placeholder={t("budgets.filter.category_placeholder")}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-5 d-flex align-items-center justify-content-end">
              <div className="d-flex gap-2 flex-wrap w-100 justify-content-end budget-status-group">
                <button type="button" className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setStatusFilter('all')}>
                  {t('budgets.tab.all')} <span className="badge bg-white text-primary ms-2">{statusCounts.all ?? 0}</span>
                </button>
                <button type="button" className={`btn btn-sm ${statusFilter === 'healthy' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter('healthy')}>
                  {t('budgets.tab.healthy')} <span className="badge bg-white text-dark ms-2">{statusCounts.healthy ?? 0}</span>
                </button>
                <button type="button" className={`btn btn-sm ${statusFilter === 'warning' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setStatusFilter('warning')}>
                  {t('budgets.tab.warning')} <span className="badge bg-white text-warning ms-2">{statusCounts.warning ?? 0}</span>
                </button>
                <button type="button" className={`btn btn-sm ${statusFilter === 'over' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setStatusFilter('over')}>
                  {t('budgets.tab.over')} <span className="badge bg-white text-danger ms-2">{statusCounts.over ?? 0}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
 
      {/* Status buttons have been moved into the search form */}
 
      <div className="budget-content-layout">
        <div className="budget-main-column">
          {visibleBudgets.length === 0 ? (
            <div className="budget-empty-state">
              <svg className="budget-empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" stroke="#e9ecef" strokeWidth="2" />
                <path d="M60 35v50M40 55h40" stroke="#6c757d" strokeWidth="3" strokeLinecap="round" />
                <circle cx="75" cy="35" r="8" fill="#28a745" />
                <path d="M72 35l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3>Bạn chưa thiết lập Hạn mức Chi tiêu</h3>
              <p>Hãy bắt đầu bằng cách tạo hạn mức cho một danh mục để kiểm soát chi tiêu của bạn.</p>
              <button className="btn btn-primary" onClick={handleAddBudget}>Thiết lập Hạn mức Chi tiêu đầu tiên</button>
            </div>
          ) : (
            <div className="row g-4">
              {visibleBudgets.map((budget) => {
                const usage = budgetUsageMap.get(budget.id) || computeBudgetUsage(budget);
                const { spent, remaining, percent, status } = usage;
                const isOver = status === "over";
                const isWarning = status === "warning";
 
                return (
                  <div className="col-xl-6" key={budget.id}>
                    <div
                      className={`budget-card ${selectedBudgetId === budget.id ? 'budget-card--selected' : ''}`}
                      onClick={() => setSelectedBudgetId(budget.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="budget-card-header">
                        <div className="budget-card-heading">
                          <div className="budget-card-icon">
                            <i className={resolveCategoryIcon(budget)} />
                          </div>
                          <div>
                            <h5 className="budget-card-title">{budget.categoryName}</h5>
                            {budget.walletName && <div className="text-muted small">Ví: {budget.walletName}</div>}
                          </div>
                        </div>
                        <span className={`budget-status-chip ${budgetStatusTone[status] || ""}`}>
                          {t(`budgets.status.${status}`)}
                        </span>
                      </div>
 
                      <div className="budget-card-meta">
                            <div>
                          <label>{t("budgets.form.date_range_label")}</label>
                          <p>
                            {budget.startDate && budget.endDate
                              ? t("budgets.card.from_to", { start: formatVietnamDate(budget.startDate), end: formatVietnamDate(budget.endDate) })
                              : t("budgets.card.no_date")}
                          </p>
                        </div>
                        <div>
                          <label>{t("budgets.card.alert_label")}</label>
                          <p>{(budget.alertPercentage ?? 80) + "% " + t("budgets.card.alert_suffix")}</p>
                        </div>
                      </div>
 
                      <div className="progress">
                        <div
                          className={`progress-bar ${isOver ? "bg-danger" : isWarning ? "bg-warning" : ""}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                          role="progressbar"
                          aria-valuenow={percent}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
 
                      <div className="budget-stats">
                        <div className="budget-stat-item">
                          <label className="budget-stat-label">Hạn mức</label>
                          <div className="budget-stat-value">{formatMoneyWithCurrency(convertCurrency(budget.limitAmount, budgetCurrency), budgetCurrency)}</div>
                        </div>
                        <div className="budget-stat-item">
                          <label className="budget-stat-label">Đã chi</label>
                          <div className={`budget-stat-value ${isOver ? "danger" : ""}`}>{formatMoneyWithCurrency(convertCurrency(spent, budgetCurrency), budgetCurrency)}</div>
                        </div>
                        <div className="budget-stat-item">
                          <label className="budget-stat-label">Còn lại</label>
                          <div className={`budget-stat-value ${remaining < 0 ? "danger" : "success"}`}>{formatMoneyWithCurrency(convertCurrency(remaining, budgetCurrency), budgetCurrency)}</div>
                        </div>
                        <div className="budget-stat-item">
                          <label className="budget-stat-label">Sử dụng</label>
                          <div className={`budget-stat-value ${isOver ? "danger" : isWarning ? "warning" : ""}`}>{Math.round(percent)}%</div>
                        </div>
                      </div>
 
                      {budget.note && (
                        <div className="budget-note">
                          <i className="bi bi-chat-left-text" />
                          <span>{budget.note}</span>
                        </div>
                      )}
 
                      <div className="budget-card-actions">
                        <button className="btn-detail-budget" onClick={() => handleOpenDetail(budget)} title={t("budgets.action.detail")}>
                          <i className="bi bi-pie-chart me-1"></i>{t("budgets.action.detail")}
                        </button>
                        <button className="btn-edit-budget" onClick={() => handleEditBudget(budget)} title={t("budgets.action.edit")}>
                          <i className="bi bi-pencil me-1"></i>{t("budgets.action.edit")}
                        </button>
                        <button className="btn-delete-budget" onClick={() => setConfirmDel(budget)} title={t("budgets.action.delete")}>
                          <i className="bi bi-trash me-1"></i>{t("budgets.action.delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
 
        <aside className="budget-side-column">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="mb-1">
                    {selectedBudgetId ? "Giao dịch liên quan" : t("budgets.side.recent_title")}
                  </h5>
                  {selectedBudgetId && (() => {
                    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
                    if (selectedBudget) {
                      return (
                        <div className="mt-2">
                          <small className="text-muted d-block">
                            <strong>{selectedBudget.categoryName}</strong>
                            {selectedBudget.walletName && selectedBudget.walletName !== "Tất cả ví" && (
                              <> • Ví: {selectedBudget.walletName}</>
                            )}
                          </small>
                          {selectedBudget.startDate && selectedBudget.endDate && (
                            <small className="text-muted d-block">
                              {formatVietnamDate(selectedBudget.startDate)} - {formatVietnamDate(selectedBudget.endDate)}
                            </small>
                          )}
                          <button
                            className="btn btn-sm btn-outline-secondary mt-2"
                            onClick={() => setSelectedBudgetId(null)}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Xóa bộ lọc
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {!selectedBudgetId && (
                  <select
                    className="form-select budget-transaction-filter"
                    value={transactionFilter}
                    onChange={(e) => setTransactionFilter(e.target.value)}
                  >
                    <option value="all">{t("transactions.all")}</option>
                    <option value="expense">{t("transactions.type.expense")}</option>
                    <option value="income">{t("transactions.type.income")}</option>
                  </select>
                )}
              </div>
 
              <div className="table-responsive budget-transaction-mini">
                <table className="table budget-transaction-table">
                  <thead>
                    <tr>
                      <th>{t("transactions.col.code")}</th>
                      <th>{t("transactions.col.category")}</th>
                      <th>{t("transactions.col.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-4">
                          {t("budgets.transactions.empty")}
                        </td>
                      </tr>
                    ) : (
                      latestTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{tx.code || tx.id}</td>
                          <td>
                            <div className="fw-semibold">{tx.category || "Không xác định"}</div>
                            <small className="text-muted">{formatDateTime(tx.date)}</small>
                          </td>
                          <td className={`fw-semibold ${tx.type === "expense" ? "text-danger" : "text-success"}`}>
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
 
              <button className="btn btn-outline-primary w-100" type="button" onClick={handleViewAllTransactions}>
                {t("transactions.view_all")}
              </button>
            </div>
          </div>
        </aside>
      </div>
 
      {/* Modals */}
      <BudgetDetailModal
        open={!!detailBudget}
        budget={detailBudget?.budget}
        usage={detailBudget?.usage}
        onClose={handleCloseDetail}
        onEdit={handleEditBudget}
        onRemind={handleSendReminder}
      />
 
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
        title={t("budgets.confirm.delete_title")}
        message={confirmDel ? t("budgets.confirm.delete_message", { category: confirmDel.categoryName }) : ""}
        okText={t("budgets.confirm.delete_ok")}
        cancelText={t("budgets.confirm.delete_cancel")}
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
    </div>
  );
}