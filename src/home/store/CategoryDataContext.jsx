import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

const CategoryDataContext = createContext(null);

export function CategoryDataProvider({ children }) {
  // Expense categories
  const [expenseCategories, setExpenseCategories] = useState([
    { id: 1, name: "Ăn uống", description: "Cơm, nước, cafe, đồ ăn vặt" },
    { id: 2, name: "Di chuyển", description: "Xăng xe, gửi xe, phương tiện công cộng" },
    { id: 3, name: "Mua sắm", description: "Quần áo, giày dép, đồ dùng cá nhân" },
    { id: 4, name: "Hóa đơn", description: "Điện, nước, internet, điện thoại" },
    { id: 5, name: "Giải trí", description: "Xem phim, game, du lịch, hội họp bạn bè" },
  ]);

  // Income categories
  const [incomeCategories, setIncomeCategories] = useState([
    { id: 101, name: "Lương", description: "Lương chính hàng tháng" },
    { id: 102, name: "Thưởng", description: "Thưởng dự án, thưởng KPI" },
    { id: 103, name: "Bán hàng", description: "Bán đồ cũ, bán online" },
    { id: 104, name: "Lãi tiết kiệm", description: "Lãi ngân hàng, lãi đầu tư an toàn" },
    { id: 105, name: "Khác", description: "Các khoản thu nhập khác" },
  ]);

  // Create expense category
  const createExpenseCategory = useCallback((payload) => {
    const newCategory = {
      id: Date.now(),
      name: payload.name,
      description: payload.description || "",
    };
    setExpenseCategories((prev) => [newCategory, ...prev]);
    return newCategory;
  }, []);

  // Create income category
  const createIncomeCategory = useCallback((payload) => {
    const newCategory = {
      id: Date.now(),
      name: payload.name,
      description: payload.description || "",
    };
    setIncomeCategories((prev) => [newCategory, ...prev]);
    return newCategory;
  }, []);

  // Update expense category
  const updateExpenseCategory = useCallback((id, patch) => {
    setExpenseCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  // Update income category
  const updateIncomeCategory = useCallback((id, patch) => {
    setIncomeCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  // Delete expense category
  const deleteExpenseCategory = useCallback((id) => {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Delete income category
  const deleteIncomeCategory = useCallback((id) => {
    setIncomeCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Get category by name and type
  const getCategoryByName = useCallback(
    (name, type) => {
      const list = type === "expense" ? expenseCategories : incomeCategories;
      return list.find((c) => c.name === name);
    },
    [expenseCategories, incomeCategories]
  );

  const value = useMemo(
    () => ({
      expenseCategories,
      incomeCategories,
      createExpenseCategory,
      createIncomeCategory,
      updateExpenseCategory,
      updateIncomeCategory,
      deleteExpenseCategory,
      deleteIncomeCategory,
      getCategoryByName,
    }),
    [
      expenseCategories,
      incomeCategories,
      createExpenseCategory,
      createIncomeCategory,
      updateExpenseCategory,
      updateIncomeCategory,
      deleteExpenseCategory,
      deleteIncomeCategory,
      getCategoryByName,
    ]
  );

  return (
    <CategoryDataContext.Provider value={value}>
      {children}
    </CategoryDataContext.Provider>
  );
}

export function useCategoryData() {
  const ctx = useContext(CategoryDataContext);
  if (!ctx)
    throw new Error(
      "useCategoryData must be used within CategoryDataProvider"
    );
  return ctx;
}
