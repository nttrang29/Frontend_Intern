import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

const BudgetDataContext = createContext(null);

export function BudgetDataProvider({ children }) {
  const [budgets, setBudgets] = useState([
    
  ]);

  // Calculate spent amount for category+wallet combinations
  // Key format: "categoryName:walletName" or "categoryName:all" for budgets applying to all wallets
  const [transactionsByCategory, setTransactionsByCategory] = useState({
    // example: { "Ăn uống:Tiền mặt": 1200000, "Ăn uống:all": 1500000, "Mua sắm:Techcombank": 800000 }
  });
  
  // Keep a copy of all external transactions so we can compute period-based totals
  const [externalTransactionsList, setExternalTransactionsList] = useState([]);

  // ====== helpers ======
  const createBudget = useCallback((payload) => {
    // payload: { categoryId, categoryName, categoryType, limitAmount, walletId, walletName, startDate, endDate }
    const currentMonth = new Date().toLocaleDateString("vi-VN", {
      month: "2-digit",
      year: "numeric",
    });
    const newBudget = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      month: currentMonth,
      startDate: payload.startDate,
      endDate: payload.endDate,
      // include wallet fields if provided
      walletId: payload.walletId || null,
      walletName: payload.walletName || null,
      alertPercentage: payload.alertPercentage ?? 90,
      note: payload.note || "",
      ...payload,
    };
    setBudgets((prev) => [newBudget, ...prev]);
    return newBudget;
  }, []);

  const updateBudget = useCallback((budgetId, patch) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === budgetId ? { ...b, ...patch } : b))
    );
    return patch;
  }, []);

  const deleteBudget = useCallback((budgetId) => {
    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
  }, []);

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
      if (budget.walletName && budget.walletName !== "Tất cả ví") {
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
    }),
    [
      budgets,
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
