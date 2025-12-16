import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

import { budgetAPI } from "../services/api-client";
import { logActivity } from "../utils/activityLogger";
import { parseAmount, parseAmountNonNegative } from "../utils/parseAmount";

const TRANSACTION_CACHE_KEY = "budget_external_transactions";
const MAX_CACHED_TRANSACTIONS = 300;

const BudgetDataContext = createContext(null);

const ALL_WALLETS_LABEL = "Tất cả ví";

const normalizeBudget = (budget) => {
  if (!budget) return null;

  const amountLimit = parseAmountNonNegative(budget.amountLimit ?? budget.limitAmount, 0);
  const warningThreshold =
    budget.warningThreshold ?? budget.alertPercentage ?? 80;
  const walletId =
    budget.walletId !== undefined && budget.walletId !== null
      ? Number(budget.walletId)
      : null;

  const walletNameFromPayload =
    budget.walletName ||
    budget.wallet?.walletName ||
    budget.wallet?.name ||
    budget.wallet?.title ||
    budget.walletLabel ||
    budget.walletTitle ||
    budget.walletDisplayName ||
    budget.wallet?.label ||
    "";

  return {
    id: budget.budgetId ?? budget.id ?? Date.now(),
    budgetId: budget.budgetId ?? budget.id ?? null,
    categoryId: budget.categoryId ?? null,
    categoryName: budget.categoryName ?? "",
    categoryType: budget.categoryType || "expense",
    walletId,
    walletName:
      walletId === null
        ? ALL_WALLETS_LABEL
        : walletNameFromPayload || null,
    limitAmount: amountLimit,
    amountLimit,
    startDate: budget.startDate || null,
    endDate: budget.endDate || null,
    note: budget.note || "",
    alertPercentage: warningThreshold,
    warningThreshold,
    spentAmount: parseAmountNonNegative(budget.spentAmount, 0),
    remainingAmount:
      budget.remainingAmount != null
        ? parseAmount(budget.remainingAmount, 0)
        : Math.max(
            amountLimit - parseAmountNonNegative(budget.spentAmount, 0),
            0
          ),
    exceededAmount: parseAmountNonNegative(budget.exceededAmount, 0),
    usagePercentage: parseAmount(budget.usagePercentage, 0),
    status: budget.status || budget.budgetStatus || "ACTIVE",
    budgetStatus: budget.budgetStatus || budget.status || "ACTIVE",
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
};

const buildBudgetRequest = (payload = {}) => {
  const limit =
    payload.limitAmount ?? payload.amountLimit;
  const warningThreshold =
    payload.alertPercentage ?? payload.warningThreshold ?? 80;

  return {
    categoryId:
      payload.categoryId !== undefined && payload.categoryId !== null
        ? Number(payload.categoryId)
        : undefined,
    walletId:
      payload.walletId === undefined ||
      payload.walletId === null ||
      payload.walletId === "ALL"
        ? null
        : Number(payload.walletId),
    amountLimit: limit !== undefined ? Number(limit) : undefined,
    startDate: payload.startDate,
    endDate: payload.endDate,
    note: payload.note || "",
    warningThreshold,
  };
};

export function BudgetDataProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState(null);

  // Calculate spent amount for category+wallet combinations
  // Key format: "categoryName:walletName" or "categoryName:all" for budgets applying to all wallets
  const [transactionsByCategory, setTransactionsByCategory] = useState({
    // example: { "Ăn uống:Tiền mặt": 1200000, "Ăn uống:all": 1500000, "Mua sắm:Techcombank": 800000 }
  });
  
  // Keep a copy of all external transactions so we can compute period-based totals
  const [externalTransactionsList, setExternalTransactionsList] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = window.localStorage.getItem(TRANSACTION_CACHE_KEY);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      window.localStorage.removeItem(TRANSACTION_CACHE_KEY);
      return [];
    }
  });

  // ====== helpers ======
  const loadBudgets = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setBudgets([]);
      setBudgetsLoading(false);
      return;
    }

    setBudgetsLoading(true);
    try {
      const response = await budgetAPI.getBudgets();
      const list = Array.isArray(response?.budgets)
        ? response.budgets
        : Array.isArray(response)
        ? response
        : [];
      setBudgets(list.map((item) => normalizeBudget(item)).filter(Boolean));
      setBudgetsError(null);
    } catch (error) {
      console.error("Error loading budgets:", error);
      setBudgets([]);
      setBudgetsError(
        error?.message || "Không thể tải danh sách ngân sách. Vui lòng thử lại."
      );
    } finally {
      setBudgetsLoading(false);
    }
  }, []);

  const createBudget = useCallback(
    async (payload) => {
      const body = buildBudgetRequest(payload);
      if (body.categoryId === undefined) {
        throw new Error("Thiếu danh mục khi tạo ngân sách.");
      }
      if (body.amountLimit === undefined) {
        throw new Error("Thiếu hạn mức chi tiêu.");
      }

      const response = await budgetAPI.createBudget(body);
      const createdRaw = normalizeBudget(response?.budget || response);
      
      // Xác định walletId - QUAN TRỌNG: Ưu tiên từ body.walletId (từ payload), đây là source of truth
      // Vì backend có thể trả về Budget entity với Wallet LAZY fetch, nên walletId có thể không có trong response
      // Nhưng body.walletId đã được gửi lên backend, nên phải có giá trị đúng
      const resolvedWalletId = 
        (body.walletId !== undefined && body.walletId !== null)
          ? body.walletId
          : (createdRaw?.walletId !== undefined && createdRaw?.walletId !== null)
            ? createdRaw.walletId
            : (payload.walletId !== undefined && payload.walletId !== null)
              ? payload.walletId
              : null;
      
      // Xác định walletName - QUAN TRỌNG: Ưu tiên từ payload.walletName (người dùng đã chọn), đây là source of truth
      let resolvedWalletName = "";
      if (payload.walletName && payload.walletName.trim() !== "" && payload.walletName !== "Tất cả ví" && payload.walletName !== ALL_WALLETS_LABEL) {
        // Ưu tiên cao nhất: walletName từ payload (người dùng đã chọn)
        resolvedWalletName = payload.walletName;
      } else if (resolvedWalletId !== null) {
        // Nếu có walletId nhưng không có walletName từ payload, thử lấy từ response
        if (createdRaw?.walletName && createdRaw.walletName.trim() !== "" && createdRaw.walletName !== "Tất cả ví" && createdRaw.walletName !== ALL_WALLETS_LABEL) {
          resolvedWalletName = createdRaw.walletName;
        } else {
          // Fallback: dùng format "Ví {id}"
          resolvedWalletName = `Ví ${resolvedWalletId}`;
        }
      } else {
        // walletId = null => "Tất cả ví"
        resolvedWalletName = ALL_WALLETS_LABEL;
      }
      
      // Debug log để kiểm tra
      console.log("📊 BudgetDataContext.createBudget - Resolved values:", {
        bodyWalletId: body.walletId,
        payloadWalletId: payload.walletId,
        payloadWalletName: payload.walletName,
        createdRawWalletId: createdRaw?.walletId,
        createdRawWalletName: createdRaw?.walletName,
        resolvedWalletId,
        resolvedWalletName
      });
      
      const created = createdRaw
        ? {
            ...createdRaw,
            categoryId:
              createdRaw.categoryId ??
              (payload.categoryId !== undefined ? Number(payload.categoryId) : null),
            categoryName:
              createdRaw.categoryName || payload.categoryName || "",
            walletId: resolvedWalletId,
            walletName: resolvedWalletName,
          }
        : null;
      if (created) {
        setBudgets((prev) => [created, ...prev]);
        try {
          const categoryName = payload.categoryName || created.categoryName || "";
          const categoryId = payload.categoryId || created.categoryId || null;
          const walletName = payload.walletName || created.walletName || "";
          logActivity({
            type: "budget.create",
            message: `Tạo ngân sách ${categoryName || created.id}`,
            data: {
              budgetId: created.id,
              category: categoryName,
              categoryId,
              walletName,
              limit: created.limitAmount,
            },
          });
        } catch (e) {}
      } else {
        await loadBudgets();
      }
      return created;
    },
    [loadBudgets]
  );

  const updateBudget = useCallback(
    async (budgetId, patch) => {
      if (!budgetId) {
        throw new Error("Thiếu budgetId khi cập nhật ngân sách.");
      }
      const normalizedId = String(budgetId);
      const previousBudget = budgets.find(
        (b) => String(b.id ?? b.budgetId) === normalizedId
      );
      const body = buildBudgetRequest(patch);
      const response = await budgetAPI.updateBudget(budgetId, body);
      const updatedRaw = normalizeBudget(response?.budget || response);
      const updated = updatedRaw
        ? {
            ...updatedRaw,
            categoryId:
              updatedRaw.categoryId ??
              (patch.categoryId !== undefined ? Number(patch.categoryId) : null),
            categoryName:
              updatedRaw.categoryName || patch.categoryName || "",
            walletId:
              updatedRaw.walletId !== undefined && updatedRaw.walletId !== null
                ? updatedRaw.walletId
                : body.walletId ?? null,
            walletName:
              updatedRaw.walletName || patch.walletName || (body.walletId == null ? "Tất cả ví" : ""),
          }
        : null;

      if (updated?.id) {
        setBudgets((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
        );
      } else {
        await loadBudgets();
      }

      try {
        const categoryName =
          updated?.categoryName || previousBudget?.categoryName || "";
        const walletName =
          updated?.walletName || previousBudget?.walletName || ALL_WALLETS_LABEL;
        const prevLimit =
          previousBudget?.amountLimit ?? previousBudget?.limitAmount ?? null;
        const nextLimit =
          updated?.amountLimit ??
          updated?.limitAmount ??
          patch.amountLimit ??
          patch.limitAmount ??
          null;
        logActivity({
          type: "budget.update",
          message: `Cập nhật ngân sách ${categoryName || normalizedId}`,
          data: {
            budgetId: updated?.id || budgetId,
            category: categoryName,
            walletName,
            previousLimit: prevLimit,
            newLimit: nextLimit,
            startDate: updated?.startDate || previousBudget?.startDate || null,
            endDate: updated?.endDate || previousBudget?.endDate || null,
          },
        });
      } catch (e) {}

      return updated;
    },
    [budgets, loadBudgets]
  );

  const deleteBudget = useCallback(async (budgetId) => {
    if (!budgetId) {
      throw new Error("Thiếu budgetId khi xóa ngân sách.");
    }
    const normalizedId = String(budgetId);
    const targetBudget = budgets.find(
      (b) => String(b.id ?? b.budgetId) === normalizedId
    );
    await budgetAPI.deleteBudget(budgetId);
    setBudgets((prev) =>
      prev.filter((b) => String(b.id ?? b.budgetId) !== normalizedId)
    );
    try {
      logActivity({
        type: "budget.delete",
        message: `Xóa ngân sách ${targetBudget?.categoryName || budgetId}`,
        data: {
          budgetId,
          category: targetBudget?.categoryName || "",
          categoryId: targetBudget?.categoryId || null,
          walletName: targetBudget?.walletName || "",
        },
      });
    } catch (e) {}
  }, [budgets]);

  useEffect(() => {
    loadBudgets();

    const handleUserChange = () => {
      loadBudgets();
    };

    const handleStorageChange = (event) => {
      if (
        event.key === "accessToken" ||
        event.key === "auth_user" ||
        event.key === "user"
      ) {
        loadBudgets();
      }
    };

    const handleLogout = () => {
      // Reset tất cả state khi logout
      setBudgets([]);
      setExternalTransactionsList([]);
      setTransactionsByCategory({});
      // Xóa cache
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TRANSACTION_CACHE_KEY);
      }
    };

    window.addEventListener("userChanged", handleUserChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("user:loggedout", handleLogout);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user:loggedout", handleLogout);
    };
  }, [loadBudgets]);

  // Compute spent amount for a budget object by scanning externalTransactionsList within the budget's date range
  const getSpentForBudget = useCallback((budget) => {
    if (!budget || !budget.categoryName) return 0;
    if (!budget.startDate || !budget.endDate) return 0;
    
    // Parse dates carefully to handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm" formats
    // For "YYYY-MM-DD", parse as local time, not UTC
    const parseDate = (dateStr) => {
      const parts = dateStr.split('T')[0].split('-'); // Get YYYY-MM-DD part
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };
    
    const budgetStart = parseDate(budget.startDate);
    const budgetEnd = parseDate(budget.endDate);
    
    if (!budgetStart || !budgetEnd) return 0;
    
    budgetStart.setHours(0, 0, 0, 0); // Start of day
    budgetEnd.setHours(23, 59, 59, 999); // End of day

    let sum = 0;
    externalTransactionsList.forEach((t) => {
      if (t.type !== "expense") return;
      if (!t.category) return;
      if (t.category !== budget.categoryName) return;
      
      // Check wallet match - QUAN TRỌNG: So sánh cả walletId và walletName
      if (budget.walletId !== null && budget.walletId !== undefined) {
        // Budget áp dụng cho một ví cụ thể
        const txWalletId = t.walletId || t.wallet?.walletId || t.wallet?.id || null;
        if (txWalletId !== null) {
          // So sánh bằng walletId (chính xác hơn)
          if (Number(txWalletId) !== Number(budget.walletId)) return;
        } else {
          // Nếu transaction không có walletId, so sánh bằng walletName
          if (budget.walletName && budget.walletName !== ALL_WALLETS_LABEL) {
            if (t.walletName !== budget.walletName) return;
          }
        }
      } else if (budget.walletName && budget.walletName !== ALL_WALLETS_LABEL) {
        // Fallback: Nếu không có walletId, so sánh bằng walletName
        if (t.walletName !== budget.walletName) return;
      }
      // Nếu budget.walletId = null và walletName = "Tất cả ví", thì tính tất cả transactions
      
      const transactionDate = new Date(t.date);
      if (isNaN(transactionDate.getTime())) return;
      
      // Check if transaction is within budget period
      if (transactionDate >= budgetStart && transactionDate <= budgetEnd) {
        sum += Number(t.amount) || 0;
      }
    });
    return sum;
  }, [externalTransactionsList]);

  const getRemainingAmount = useCallback((categoryName, limitAmount, walletName = null, startDate = null, endDate = null) => {
    // Create a temp budget object to calculate spent amount
    const bud = { categoryName, walletName, startDate, endDate };
    const spent = getSpentForBudget(bud);
    return limitAmount - spent;
  }, [getSpentForBudget]);
  // Backwards-compatible: return total spent using the aggregated map (no period)
  const getSpentAmount = useCallback((categoryName, walletName = null) => {
    if (!walletName) {
      return transactionsByCategory[`${categoryName}:all`] || 0;
    }
    return transactionsByCategory[`${categoryName}:${walletName}`] || 0;
  }, [transactionsByCategory]);

  // Update transactions map (called from TransactionsPage)
  // Expected format: { "categoryName:walletName": amount, "categoryName:all": amount, ... }
  const updateTransactionsByCategory = useCallback((categoryMap) => {
    setTransactionsByCategory(categoryMap);
  }, []);

  const persistTransactions = useCallback((list) => {
    if (typeof window === "undefined") return;
    if (list.length > 0) {
      window.localStorage.setItem(TRANSACTION_CACHE_KEY, JSON.stringify(list));
    } else {
      window.localStorage.removeItem(TRANSACTION_CACHE_KEY);
    }
  }, []);

  const updateAllExternalTransactions = useCallback((list, { append } = {}) => {
    let nextList = Array.isArray(list) ? list : [];
    if (append && nextList.length > 0) {
      setExternalTransactionsList((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const dedupeMap = new Map();
        [...existing, ...nextList].forEach((tx) => {
          if (!tx) return;
          const key =
            tx.id ??
            tx.transactionId ??
            tx.code ??
            `${tx.category || "unknown"}-${tx.date || Date.now()}-${tx.amount || 0}`;
          dedupeMap.set(String(key), tx);
        });
        const merged = Array.from(dedupeMap.values()).slice(0, MAX_CACHED_TRANSACTIONS);
        persistTransactions(merged);
        return merged;
      });
      return;
    }

    nextList = nextList.slice(0, MAX_CACHED_TRANSACTIONS);
    setExternalTransactionsList(nextList);
    try {
      persistTransactions(nextList);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug("BudgetDataContext: unable to cache transactions", error);
    }
  }, [persistTransactions]);

  const value = useMemo(
    () => ({
      budgets,
      budgetsLoading,
      budgetsError,
      transactionsByCategory,
      externalTransactionsList,
      createBudget,
      updateBudget,
      deleteBudget,
      getSpentAmount,
      getSpentForBudget,
      getRemainingAmount,
      updateTransactionsByCategory,
      updateAllExternalTransactions,
      refreshBudgets: loadBudgets,
    }),
    [
      budgets,
      budgetsLoading,
      budgetsError,
      transactionsByCategory,
      externalTransactionsList,
      createBudget,
      updateBudget,
      deleteBudget,
      getSpentAmount,
      getSpentForBudget,
      getRemainingAmount,
      updateTransactionsByCategory,
      updateAllExternalTransactions,
      loadBudgets,
    ]
  );

  return (
    <BudgetDataContext.Provider value={value}>
      {children}
    </BudgetDataContext.Provider>
  );
}

export function useBudgetData() {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) throw new Error("useBudgetData must be used within BudgetDataProvider");
  return ctx;
}
