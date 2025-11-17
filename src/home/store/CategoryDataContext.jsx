import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { categoryAPI } from "../../services/api-client";

const CategoryDataContext = createContext(null);

// Helper để lấy userId từ localStorage
function getUserId() {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.userId || user.id || null;
    }
  } catch (e) {
    console.error("Error parsing user from localStorage:", e);
  }
  return null;
}

export function CategoryDataProvider({ children }) {
  // Expense categories
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Load categories từ API
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await categoryAPI.getCategories();
        
        if (response && Array.isArray(response)) {
          // Phân loại categories theo transactionType
          const expenseList = [];
          const incomeList = [];
          
          response.forEach((category) => {
            const typeName = category.transactionType?.typeName || "";
            const mappedCategory = {
              id: category.categoryId,
              categoryId: category.categoryId,
              name: category.categoryName,
              categoryName: category.categoryName,
              description: category.description || "",
              icon: category.description || "default", // Backend dùng description thay vì icon
              transactionTypeId: category.transactionType?.typeId,
              isSystem: category.isSystem || false,
            };
            
            // Phân loại: "Chi tiêu" = expense, "Thu nhập" = income
            if (typeName === "Chi tiêu" || category.transactionType?.typeId === 1) {
              expenseList.push(mappedCategory);
            } else if (typeName === "Thu nhập" || category.transactionType?.typeId === 2) {
              incomeList.push(mappedCategory);
            }
          });
          
          setExpenseCategories(expenseList);
          setIncomeCategories(incomeList);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        // Fallback to empty arrays on error
        setExpenseCategories([]);
        setIncomeCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Helper function to reload categories from API
  const reloadCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getCategories();
      
      if (response && Array.isArray(response)) {
        const expenseList = [];
        const incomeList = [];
        
        response.forEach((category) => {
          const typeName = category.transactionType?.typeName || "";
          const mappedCategory = {
            id: category.categoryId,
            categoryId: category.categoryId,
            name: category.categoryName,
            categoryName: category.categoryName,
            description: category.description || "",
            icon: category.description || "default",
            transactionTypeId: category.transactionType?.typeId,
            isSystem: category.isSystem || false,
          };
          
          if (typeName === "Chi tiêu" || category.transactionType?.typeId === 1) {
            expenseList.push(mappedCategory);
          } else if (typeName === "Thu nhập" || category.transactionType?.typeId === 2) {
            incomeList.push(mappedCategory);
          }
        });
        
        setExpenseCategories(expenseList);
        setIncomeCategories(incomeList);
      }
    } catch (error) {
      console.error("Error reloading categories:", error);
    }
  }, []);

  // Create expense category
  const createExpenseCategory = useCallback(async (payload) => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
    }

    try {
      const response = await categoryAPI.createCategory(
        userId,
        payload.name,
        payload.description || payload.icon || "default",
        1 // transactionTypeId: 1 = Chi tiêu
      );
      
      // Reload categories to get the latest data
      await reloadCategories();
      
      // Return the created category
      return {
        id: response.categoryId,
        categoryId: response.categoryId,
        name: response.categoryName,
        categoryName: response.categoryName,
        description: response.description || "",
        icon: response.description || "default",
        transactionTypeId: 1,
        isSystem: response.isSystem || false,
      };
    } catch (err) {
      console.error("Error creating expense category:", err);
      throw err;
    }
  }, [reloadCategories]);

  // Create income category
  const createIncomeCategory = useCallback(async (payload) => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
    }

    try {
      const response = await categoryAPI.createCategory(
        userId,
        payload.name,
        payload.description || payload.icon || "default",
        2 // transactionTypeId: 2 = Thu nhập
      );
      
      // Reload categories to get the latest data
      await reloadCategories();
      
      // Return the created category
      return {
        id: response.categoryId,
        categoryId: response.categoryId,
        name: response.categoryName,
        categoryName: response.categoryName,
        description: response.description || "",
        icon: response.description || "default",
        transactionTypeId: 2,
        isSystem: response.isSystem || false,
      };
    } catch (err) {
      console.error("Error creating income category:", err);
      throw err;
    }
  }, [reloadCategories]);

  // Update expense category
  const updateExpenseCategory = useCallback(async (id, patch) => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
    }

    try {
      const response = await categoryAPI.updateCategory(
        id,
        userId,
        patch.name,
        patch.description || patch.icon || "default",
        1 // transactionTypeId: 1 = Chi tiêu
      );
      
      // Reload categories to get the latest data
      await reloadCategories();
      
      // Return the updated category
      return {
        id: response.categoryId,
        categoryId: response.categoryId,
        name: response.categoryName,
        categoryName: response.categoryName,
        description: response.description || "",
        icon: response.description || "default",
        transactionTypeId: 1,
        isSystem: response.isSystem || false,
      };
    } catch (err) {
      console.error("Error updating expense category:", err);
      throw err;
    }
  }, [reloadCategories]);

  // Update income category
  const updateIncomeCategory = useCallback(async (id, patch) => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
    }

    try {
      const response = await categoryAPI.updateCategory(
        id,
        userId,
        patch.name,
        patch.description || patch.icon || "default",
        2 // transactionTypeId: 2 = Thu nhập
      );
      
      // Reload categories to get the latest data
      await reloadCategories();
      
      // Return the updated category
      return {
        id: response.categoryId,
        categoryId: response.categoryId,
        name: response.categoryName,
        categoryName: response.categoryName,
        description: response.description || "",
        icon: response.description || "default",
        transactionTypeId: 2,
        isSystem: response.isSystem || false,
      };
    } catch (err) {
      console.error("Error updating income category:", err);
      throw err;
    }
  }, [reloadCategories]);

  // Delete expense category
  const deleteExpenseCategory = useCallback(async (id) => {
    try {
      await categoryAPI.deleteCategory(id);
      // Reload categories to get the latest data
      await reloadCategories();
    } catch (err) {
      console.error("Error deleting expense category:", err);
      throw err;
    }
  }, [reloadCategories]);

  // Delete income category
  const deleteIncomeCategory = useCallback(async (id) => {
    try {
      await categoryAPI.deleteCategory(id);
      // Reload categories to get the latest data
      await reloadCategories();
    } catch (err) {
      console.error("Error deleting income category:", err);
      throw err;
    }
  }, [reloadCategories]);

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
      categoriesLoading,
      createExpenseCategory,
      createIncomeCategory,
      updateExpenseCategory,
      updateIncomeCategory,
      deleteExpenseCategory,
      deleteIncomeCategory,
      getCategoryByName,
      reloadCategories, // Export để có thể reload từ bên ngoài nếu cần
    }),
    [
      expenseCategories,
      incomeCategories,
      categoriesLoading,
      createExpenseCategory,
      createIncomeCategory,
      updateExpenseCategory,
      updateIncomeCategory,
      deleteExpenseCategory,
      deleteIncomeCategory,
      getCategoryByName,
      reloadCategories,
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
