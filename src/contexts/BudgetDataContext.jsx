import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

import { budgetAPI } from "../services/api-client";
import { logActivity } from "../utils/activityLogger";

const BudgetDataContext = createContext(null);

const ALL_WALLETS_LABEL = "Tất cả ví";

const normalizeBudget = (budget) => {
  if (!budget) return null;

  const amountLimit = Number(budget.amountLimit ?? budget.limitAmount ?? 0);
  const warningThreshold =
    budget.warningThreshold ?? budget.alertPercentage ?? 80;
  const walletId =
    budget.walletId !== undefined && budget.walletId !== null
      ? Number(budget.walletId)
      : null;

  return {
    id: budget.budgetId ?? budget.id ?? Date.now(),
    budgetId: budget.budgetId ?? budget.id ?? null,
    categoryId: budget.categoryId ?? null,
    categoryName: budget.categoryName ?? "",
    categoryType: budget.categoryType || "expense",
    walletId,
    walletName:
      budget.walletName ??
      (walletId === null ? ALL_WALLETS_LABEL : null),
    limitAmount: amountLimit,
    amountLimit,
    startDate: budget.startDate || null,
    endDate: budget.endDate || null,
    note: budget.note || "",
    alertPercentage: warningThreshold,
    warningThreshold,
    spentAmount: Number(budget.spentAmount ?? 0),
    remainingAmount:
      budget.remainingAmount ??
      Math.max(
        amountLimit - Number(budget.spentAmount ?? 0),
        0
      ),
    exceededAmount: Number(budget.exceededAmount ?? 0),
    usagePercentage: Number(budget.usagePercentage ?? 0),
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
  const [externalTransactionsList, setExternalTransactionsList] = useState([]);

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
      const created = normalizeBudget(response?.budget || response);
      if (created) {
        setBudgets((prev) => [created, ...prev]);
        try {
          logActivity({
            type: "budget.create",
            message: `Tạo ngân sách ${created.categoryName} ${created.limitAmount ? `— ${created.limitAmount}` : ""}`,
            data: { budgetId: created.id, category: created.categoryName, limit: created.limitAmount },
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
      const body = buildBudgetRequest(patch);
      const response = await budgetAPI.updateBudget(budgetId, body);
      const updated = normalizeBudget(response?.budget || response);

      if (updated?.id) {
        setBudgets((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
        );
      } else {
        await loadBudgets();
      }

      return updated;
    },
    [loadBudgets]
  );

  const deleteBudget = useCallback(async (budgetId) => {
    if (!budgetId) {
      throw new Error("Thiếu budgetId khi xóa ngân sách.");
    }
    await budgetAPI.deleteBudget(budgetId);
    const normalizedId = String(budgetId);
    setBudgets((prev) =>
      prev.filter((b) => String(b.id ?? b.budgetId) !== normalizedId)
    );
    try {
      logActivity({
        type: "budget.delete",
        message: `Xóa ngân sách ${budgetId}`,
        data: { budgetId },
      });
    } catch (e) {}
  }, []);

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

    window.addEventListener("userChanged", handleUserChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
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
      // Check wallet match
      if (budget.walletName && budget.walletName !== ALL_WALLETS_LABEL) {
        if (t.walletName !== budget.walletName) return;
      }
      
      const transactionDate = new Date(t.date);
      if (isNaN(transactionDate.getTime())) return;
      
      // Check if transaction is within budget period
      if (transactionDate >= budgetStart && transactionDate <= budgetEnd) {
        sum += t.amount;
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

  const updateAllExternalTransactions = useCallback((list) => {
    setExternalTransactionsList(list || []);
  }, []);

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
