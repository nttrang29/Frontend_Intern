import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import "../../styles/pages/BudgetsPage.css";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import BudgetFormModal from "../../components/budgets/BudgetFormModal";
import BudgetDetailModal from "../../components/budgets/BudgetDetailModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import { useLanguage } from "../../contexts/LanguageContext";
import { budgetAPI } from "../../services/budget.service";
import { transactionAPI } from "../../services/transaction.service";

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("T")[0].split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const deriveBudgetState = (budget, usage) => {
  if (!budget) return "active";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = budget.startDate ? parseDateOnly(budget.startDate) : null;
  const end = budget.endDate ? parseDateOnly(budget.endDate) : null;

  // Nếu chưa đến ngày bắt đầu
  if (start && today < start) {
    return "pending";
  }

  // Nếu đã quá ngày kết thúc
  if (end && today > end) {
    return "completed";
  }

  // Trong thời gian hiệu lực, kiểm tra mức sử dụng
  const percent = usage?.percent ?? 0;
  const threshold = budget.alertPercentage ?? budget.warningThreshold ?? 80;
  
  // Ưu tiên kiểm tra vượt hạn mức trước
  if (percent > 100) {
    return "over"; // Vượt hạn mức - ngân sách vẫn hoạt động, ghi nhận chi tiêu
  }
  
  // Đạt đúng 100% hạn mức
  if (percent === 100) {
    return "completed"; // Hoàn thành - đạt đúng hạn mức
  }
  
  // Đạt ngưỡng cảnh báo (50% - 100%)
  if (percent >= threshold) {
    return "warning"; // Vượt ngưỡng - cảnh báo người dùng
  }
  
  // Dưới ngưỡng cảnh báo, trong thời gian hiệu lực
  return "active"; // Đang hoạt động bình thường
};

const BUDGET_STATUS_TONE = {
  active: "success",
  pending: "info",
  completed: "secondary",
  warning: "warning",
  over: "danger",
};

export default function BudgetsPage() {
  const {
    budgets,
    getSpentAmount,
    getSpentForBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    externalTransactionsList,
    updateAllExternalTransactions,
    refreshBudgets,
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
  const [selectedBudgetTransactions, setSelectedBudgetTransactions] = useState({
    loading: false,
    items: [],
    error: null,
  });
  const preloadExternalTransactionsAttempted = useRef(false);

  const extractTransactionsResponse = useCallback((payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.transactions)) return payload.transactions;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }, []);

  const detectTransactionKind = useCallback((tx) => {
    const normalize = (value) => {
      if (value === undefined || value === null) return "";
      if (typeof value === "string") return value.trim().toUpperCase();
      if (typeof value === "number") return String(value).trim().toUpperCase();
      if (typeof value === "object") {
        return normalize(
          value.type ||
            value.typeName ||
            value.code ||
            value.key ||
            value.name ||
            value.value ||
            value.direction
        );
      }
      return "";
    };

    const expenseTokens = ["EXPENSE", "CHI", "OUT", "DEBIT", "SPEND", "PAYMENT"];
    const incomeTokens = ["INCOME", "THU", "IN", "CREDIT", "RECEIVE", "TOPUP", "DEPOSIT"];

    const candidates = [
      tx.transactionType,
      tx.transactionType?.type,
      tx.transactionType?.typeName,
      tx.transactionType?.code,
      tx.transactionType?.direction,
      tx.transactionCategory?.type,
      tx.transactionCategory?.direction,
      tx.type,
      tx.typeName,
      tx.category?.type,
      tx.category?.categoryType,
    ];

    for (const candidate of candidates) {
      const normalized = normalize(candidate);
      if (!normalized) continue;
      if (expenseTokens.some((token) => normalized.includes(token))) return "expense";
      if (incomeTokens.some((token) => normalized.includes(token))) return "income";
    }

    if (typeof tx.amount === "number") {
      if (tx.amount < 0) return "expense";
      if (tx.amount > 0) return "income";
    }

    return "expense";
  }, []);

  const normalizeExternalTransaction = useCallback(
    (tx) => {
      const walletName = (() => {
        if (tx.wallet?.walletName) return tx.wallet.walletName;
        if (tx.walletName) return tx.walletName;
        const match = (wallets || []).find(
          (wallet) =>
            String(wallet.id) === String(tx.walletId) ||
            String(wallet.walletId) === String(tx.walletId)
        );
        return match?.name || match?.walletName || "";
      })();

      const categoryName =
        tx.category?.categoryName || tx.categoryName || tx.category || "";
      const type = detectTransactionKind(tx);
      const amount = Number(tx.amount || 0);

      return {
        id:
          tx.transactionId ??
          tx.id ??
          tx.txId ??
          tx.transactionID ??
          tx.code ??
          `${Date.now()}-${Math.random()}`,
        code:
          tx.code ||
          (tx.transactionId || tx.id
            ? `TX-${String(tx.transactionId || tx.id).padStart(4, "0")}`
            : "TX-0000"),
        category: categoryName,
        walletName,
        amount,
        date: tx.createdAt || tx.transactionDate || tx.date || new Date().toISOString(),
        currencyCode:
          (tx.currencyCode ||
            tx.currency ||
            tx.wallet?.currencyCode ||
            tx.wallet?.currency ||
            tx.walletCurrency ||
            "VND").toUpperCase(),
        type,
      };
    },
    [wallets, detectTransactionKind]
  );

  useEffect(() => {
    if (Array.isArray(externalTransactionsList) && externalTransactionsList.length > 0) {
      return;
    }
    if (preloadExternalTransactionsAttempted.current) return;

    let cancelled = false;
    preloadExternalTransactionsAttempted.current = true;

    const preloadTransactions = async () => {
      try {
        const response = await transactionAPI.getAllTransactions();
        const list = extractTransactionsResponse(response);
        const normalized = list.map(normalizeExternalTransaction);
        if (!cancelled && normalized.length > 0) {
          updateAllExternalTransactions(normalized, { append: true });
        }
      } catch (error) {
        console.warn("BudgetsPage: unable to preload transactions", error);
        preloadExternalTransactionsAttempted.current = false;
      }
    };

    preloadTransactions();

    return () => {
      cancelled = true;
    };
  }, [
    externalTransactionsList,
    extractTransactionsResponse,
    normalizeExternalTransaction,
    updateAllExternalTransactions,
  ]);

  // Helper function to convert currency
  const convertCurrency = useCallback((amount, sourceCurrency, targetCurrency) => {
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
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return value;
    return `${dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} ${dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const parseDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split("T")[0].split("-").map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const categoryNameMap = useMemo(() => {
    const map = new Map();
    (expenseCategories || []).forEach((category) => {
      if (!category) return;
      const id = category.id ?? category.categoryId;
      if (id === undefined || id === null) return;
      map.set(Number(id), category.name || category.categoryName || "");
    });
    return map;
  }, [expenseCategories]);

  const walletNameMap = useMemo(() => {
    const map = new Map();
    (wallets || []).forEach((wallet) => {
      if (wallet?.id === undefined || wallet?.id === null) return;
      const label = wallet.name || wallet.walletName || wallet.title || "";
      map.set(String(wallet.id), label);
    });
    return map;
  }, [wallets]);

  const getBudgetCurrency = useCallback(
    (budget) => {
      if (!budget) return "VND";
      return (budget.currencyCode || walletCurrencyMap.get(budget.walletId) || "VND").toUpperCase();
    },
    [walletCurrencyMap]
  );

  const getBudgetWalletName = useCallback(
    (budget) => {
      if (!budget) return "";
      if (budget.walletName && budget.walletName !== "") {
        if (budget.walletId === null || budget.walletId === undefined) {
          return budget.walletName;
        }
        if (budget.walletName !== "Tất cả ví") {
          return budget.walletName;
        }
      }
      if (budget.walletId === null || budget.walletId === undefined) {
        return "Tất cả ví";
      }
      const known = walletNameMap.get(String(budget.walletId));
      return known || budget.walletName || "";
    },
    [walletNameMap]
  );

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

  const getWalletRole = useCallback((wallet) => {
    if (!wallet) return "";
    const candidates = [
      wallet.walletRole,
      wallet.sharedRole,
      wallet.role,
      wallet.accessRole,
      wallet.membershipRole,
      wallet.currentRole,
    ];
    for (const candidate of candidates) {
      if (!candidate && candidate !== 0) continue;
      if (typeof candidate === "string") return candidate.toUpperCase();
      if (typeof candidate === "number") return String(candidate).toUpperCase();
      if (typeof candidate === "object") {
        if (typeof candidate.role === "string") return candidate.role.toUpperCase();
        if (typeof candidate.name === "string") return candidate.name.toUpperCase();
        if (typeof candidate.value === "string") return candidate.value.toUpperCase();
      }
    }
    return "";
  }, []);

  const isPersonalOwnedWallet = useCallback(
    (wallet) => {
      if (!wallet) return false;
      if (wallet.isShared) return false; // Loại ví nhóm
      const role = getWalletRole(wallet);
      if (!role) return true; // ví cá nhân chuẩn
      return ["OWNER", "MASTER", "ADMIN"].includes(role);
    },
    [getWalletRole]
  );

  const vndWallets = useMemo(() => {
    return (wallets || []).filter((wallet) => {
      const currency = (wallet.currency || wallet.currencyCode || "VND").toUpperCase();
      if (currency !== "VND") return false;
      return isPersonalOwnedWallet(wallet);
    });
  }, [wallets, isPersonalOwnedWallet]);

  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.id === selectedBudgetId) || null,
    [budgets, selectedBudgetId]
  );

  const selectedBudgetWalletName = useMemo(
    () => getBudgetWalletName(selectedBudget),
    [selectedBudget, getBudgetWalletName]
  );

  const selectedBudgetCategoryName = useMemo(
    () =>
      selectedBudget
        ? selectedBudget.categoryName || categoryNameMap.get(Number(selectedBudget.categoryId)) || selectedBudget.category || ""
        : "",
    [selectedBudget, categoryNameMap]
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
  }, [budgets, searchName, statusFilter, budgetStateMap]);

  const normalizedSelectedBudgetTransactions = useMemo(() => {
    if (!selectedBudgetId) return [];
    const rawList = selectedBudgetTransactions.items || [];
    return rawList
      .map((tx) => {
        const id = tx.transactionId ?? tx.id ?? tx.code ?? `${Date.now()}`;
        const walletName =
          tx.wallet?.walletName || tx.walletName || tx.wallet?.name || selectedBudgetWalletName || "";
        const categoryName =
          tx.category?.categoryName ||
          tx.categoryName ||
          tx.category ||
          selectedBudgetCategoryName ||
          "";
        const typeName = (tx.transactionType?.typeName || tx.transactionType || tx.type || "").toLowerCase();
        const isIncome = typeName.includes("thu") || typeName.includes("income");
        const txCurrency =
          tx.currencyCode ||
          tx.currency ||
          tx.wallet?.currencyCode ||
          tx.walletCurrency ||
          selectedBudget?.currencyCode ||
          "VND";
        return {
          id,
          code: tx.code || `TX-${String(id).padStart(4, "0")}`,
          type: isIncome ? "income" : "expense",
          category: categoryName,
          amount: Number(tx.amount || 0),
          date: tx.transactionDate || tx.createdAt || tx.date,
          walletName,
          currencyCode: txCurrency,
        };
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [selectedBudgetId, selectedBudgetTransactions.items, selectedBudgetWalletName, selectedBudgetCategoryName]);

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
          const categoryMatch =
            tx.category === selectedBudgetCategoryName || tx.categoryName === selectedBudgetCategoryName;
          if (!categoryMatch) return false;

          if (selectedBudget.walletId && selectedBudgetWalletName && selectedBudgetWalletName !== "Tất cả ví") {
            const walletMatch =
              tx.walletId === selectedBudget.walletId || tx.walletName === selectedBudgetWalletName;
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
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id || tx.code,
        code: tx.code || tx.id,
        category:
          tx.category ||
          tx.categoryName ||
          (selectedBudgetId ? selectedBudgetCategoryName : ""),
        amount: Number(tx.amount || 0),
        date: tx.date,
        walletName: tx.walletName,
        currencyCode: tx.currency || tx.currencyCode || "VND",
        type: (tx.type || "").toLowerCase(),
      }));
  }, [externalTransactionsList, transactionFilter, selectedBudgetId, selectedBudget, selectedBudgetWalletName, selectedBudgetCategoryName]);

  const shouldUseSelectedBudgetFallback = useMemo(() => {
    if (!selectedBudgetId) return false;
    if (selectedBudgetTransactions.error) return true;
    const hasApiItems = Array.isArray(selectedBudgetTransactions.items)
      ? selectedBudgetTransactions.items.length > 0
      : false;
    if (!hasApiItems && fallbackTransactions.length > 0) {
      return true;
    }
    return false;
  }, [selectedBudgetId, selectedBudgetTransactions.error, selectedBudgetTransactions.items, fallbackTransactions.length]);

  const sideTransactions = useMemo(() => {
    if (!selectedBudgetId) return fallbackTransactions;
    if (shouldUseSelectedBudgetFallback) return fallbackTransactions;
    return normalizedSelectedBudgetTransactions;
  }, [selectedBudgetId, fallbackTransactions, normalizedSelectedBudgetTransactions, shouldUseSelectedBudgetFallback]);

  const sideTransactionsLoading = selectedBudgetId && !shouldUseSelectedBudgetFallback
    ? selectedBudgetTransactions.loading
    : false;

  const friendlySideError =
    t("budgets.transactions.fetch_error") ||
    "Không thể tải giao dịch liên quan ngay lúc này.";

  const sideTransactionsError =
    selectedBudgetId &&
    selectedBudgetTransactions.error &&
    fallbackTransactions.length === 0
      ? friendlySideError
      : null;

  const handleSearchReset = useCallback(() => {
    setSearchName("");
  }, []);

  const handleOpenDetail = useCallback(
    (budget) => {
      if (!budget) return;
      const usage = budgetUsageMap.get(budget.id) || computeBudgetUsage(budget);
      const status = budgetStateMap.get(budget.id) || deriveBudgetState(budget, usage);
      const currencyCode = getBudgetCurrency(budget);
      const walletName = getBudgetWalletName(budget);
      const categoryLabel =
        budget.categoryName ||
        categoryNameMap.get(Number(budget.categoryId)) ||
        t("budgets.card.unnamed_category") ||
        "Danh mục chưa xác định";
      setDetailBudget({ budget: { ...budget, currencyCode, walletName, categoryName: categoryLabel }, usage, status });
    },
    [budgetUsageMap, budgetStateMap, computeBudgetUsage, getBudgetCurrency, getBudgetWalletName, categoryNameMap, t]
  );

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

  const hasDuplicateBudget = useCallback(
    (payload, ignoreBudgetId = null) => {
      if (!Array.isArray(budgets) || budgets.length === 0) return false;
      const normalizeDateOnly = (value) => {
        if (!value) return "";
        return value.split("T")[0];
      };
      const payloadCategoryId = payload?.categoryId != null ? String(payload.categoryId) : null;
      const payloadWalletId = payload?.walletId != null ? String(payload.walletId) : "null";
      const payloadStart = normalizeDateOnly(payload?.startDate);

      return budgets.some((budget) => {
        if (!budget) return false;
        if (ignoreBudgetId && String(budget.id) === String(ignoreBudgetId)) return false;
        const budgetCategoryId = budget.categoryId != null ? String(budget.categoryId) : null;
        const budgetWalletId = budget.walletId != null ? String(budget.walletId) : "null";
        const budgetStart = normalizeDateOnly(budget.startDate);
        return (
          budgetCategoryId === payloadCategoryId &&
          budgetWalletId === payloadWalletId &&
          budgetStart === payloadStart
        );
      });
    },
    [budgets]
  );

  const handleModalSubmit = useCallback(
    async (payload) => {
      const ignoreId = modalMode === "edit" ? editingId : null;
      if (hasDuplicateBudget(payload, ignoreId)) {
        const duplicateMsgRaw = t("budgets.error.duplicate") || "";
        const duplicateMsg =
          duplicateMsgRaw && duplicateMsgRaw !== "budgets.error.duplicate"
            ? duplicateMsgRaw
            : "Hạn mức với ví, danh mục và ngày bắt đầu này đã tồn tại.";
        const error = new Error(duplicateMsg);
        error.code = "BUDGET_DUPLICATE";
        throw error;
      }

      try {
        let result = null;
        let shouldForceRefresh = false;
        if (modalMode === "edit" && editingId != null) {
          result = await updateBudget(editingId, payload);
          setToast({ open: true, message: t("budgets.toast.update_success"), type: "success" });
          if (!result) {
            shouldForceRefresh = true;
          }
        } else {
          result = await createBudget(payload);
          setToast({ open: true, message: t("budgets.toast.add_success"), type: "success" });
          if (!result) {
            shouldForceRefresh = true;
          }
        }
        if (shouldForceRefresh) {
          await refreshBudgets();
        }
        if (result?.id) {
          setSelectedBudgetId(result.id);
        }

        if (modalMode === "edit") {
          setEditingId(null);
        }
      } catch (error) {
        console.error("Failed to save budget", error);
        setToast({ open: true, message: t("budgets.error.save_failed"), type: "error" });
        throw error;
      }
    },
    [modalMode, editingId, updateBudget, createBudget, refreshBudgets, t, hasDuplicateBudget]
  );

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
          <div className="budget-metric-card budget-metric-card--has-toggle">
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
                const { spent, remaining, percent } = usage;
                const state = budgetStateMap.get(budget.id) || deriveBudgetState(budget, usage);
                const statusLabel = getStatusLabel(state);
                const resolvedWalletName = getBudgetWalletName(budget);
                const resolvedCategoryName =
                  budget.categoryName ||
                  categoryNameMap.get(Number(budget.categoryId)) ||
                  t("budgets.card.unnamed_category") ||
                  "Danh mục chưa xác định";
                const statusTone = BUDGET_STATUS_TONE[state] || "secondary";
                const budgetCurrencyCode = getBudgetCurrency(budget);
                const isOver = state === "over";
                const isWarning = state === "warning";

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
                            <i className="bi bi-wallet2" />
                          </div>
                          <div>
                            <h5 className="budget-card-title">{resolvedCategoryName}</h5>
                            {resolvedWalletName && <div className="text-muted small">Ví: {resolvedWalletName}</div>}
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
                              ? t("budgets.card.from_to", { start: new Date(budget.startDate).toLocaleDateString(), end: new Date(budget.endDate).toLocaleDateString() })
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
                  {selectedBudget && (
                    <div className="mt-2">
                      <small className="text-muted d-block">
                        <strong>{selectedBudgetCategoryName || (t("budgets.card.unnamed_category") || "Danh mục chưa xác định")}</strong>
                        {selectedBudgetWalletName && selectedBudgetWalletName !== "Tất cả ví" && (
                          <> • {t("budgets.card.wallet")}: {selectedBudgetWalletName}</>
                        )}
                      </small>
                      {selectedBudget.startDate && selectedBudget.endDate && (
                        <small className="text-muted d-block">
                          {new Date(selectedBudget.startDate).toLocaleDateString("vi-VN")} -{" "}
                          {new Date(selectedBudget.endDate).toLocaleDateString("vi-VN")}
                        </small>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary mt-2"
                        onClick={() => setSelectedBudgetId(null)}
                      >
                        <i className="bi bi-x-circle me-1"></i>
                        {t("transactions.all")}
                      </button>
                    </div>
                  )}
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
