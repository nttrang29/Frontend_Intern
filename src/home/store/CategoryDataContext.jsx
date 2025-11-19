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

  // Helper để lấy userId hiện tại từ localStorage
  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || user.id || null;
      }
      // Nếu không có user, thử lấy từ accessToken (decode nếu cần)
      const token = localStorage.getItem("accessToken");
      return token ? "hasToken" : null; // Dùng string để trigger reload
    } catch (e) {
      return null;
    }
  };

  // State để theo dõi userId hiện tại
  const [currentUserId, setCurrentUserId] = useState(() => getCurrentUserId());

  // Load categories từ API
  const loadCategories = useCallback(async () => {
    // Kiểm tra xem có user đăng nhập không
    const userId = getCurrentUserId();
    
    if (!userId) {
      // Nếu không có user, clear categories
      setExpenseCategories([]);
      setIncomeCategories([]);
      setCategoriesLoading(false);
      setCurrentUserId(null);
      return;
    }

    setCategoriesLoading(true);
    try {
      const response = await categoryAPI.getCategories();
      
      if (response && Array.isArray(response)) {
        // Phân loại categories theo transactionType
        const expenseList = [];
        const incomeList = [];
        
        response.forEach((category) => {
          const typeName = category.transactionType?.typeName || "";
          // Jackson có thể serialize isSystem() thành "system" thay vì "isSystem"
          const isSystemValue = category.isSystem !== undefined ? category.isSystem : (category.system !== undefined ? category.system : false);
          const isSystemBool = isSystemValue === true || isSystemValue === "true" || String(isSystemValue).toLowerCase() === "true";
          
          const mappedCategory = {
            id: category.categoryId,
            categoryId: category.categoryId,
            name: category.categoryName,
            categoryName: category.categoryName,
            description: category.description || "",
            icon: category.description || "default", // Backend dùng description thay vì icon
            transactionTypeId: category.transactionType?.typeId,
            isSystem: isSystemBool,
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
        setCurrentUserId(userId);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // Fallback to empty arrays on error
      setExpenseCategories([]);
      setIncomeCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load categories khi component mount hoặc khi userId thay đổi
  useEffect(() => {
    loadCategories();

    // Lắng nghe custom event khi user đăng nhập/đăng xuất trong cùng tab
    const handleUserChange = () => {
      const newUserId = getCurrentUserId();
      // Chỉ reload nếu userId thực sự thay đổi
      if (newUserId !== currentUserId) {
        loadCategories();
      }
    };
    window.addEventListener("userChanged", handleUserChange);

    // Lắng nghe sự kiện storage để reload khi user đăng nhập/đăng xuất từ tab khác
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "accessToken") {
        const newUserId = getCurrentUserId();
        if (newUserId !== currentUserId) {
          loadCategories();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadCategories, currentUserId]);

  // Theo dõi userId từ localStorage để reload khi thay đổi (backup mechanism)
  useEffect(() => {
    const checkUserChange = () => {
      const newUserId = getCurrentUserId();
      if (newUserId !== currentUserId) {
        loadCategories();
      }
    };

    // Kiểm tra mỗi 2 giây (polling) để phát hiện thay đổi user
    // Chỉ chạy khi có accessToken để tránh tốn tài nguyên
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return; // Không cần polling nếu không có token
    }

    const interval = setInterval(checkUserChange, 2000);

    return () => clearInterval(interval);
  }, [currentUserId, loadCategories]);

  // Helper function to reload categories from API
  const reloadCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getCategories();
      
      if (response && Array.isArray(response)) {
        const expenseList = [];
        const incomeList = [];
        
        response.forEach((category) => {
          const typeName = category.transactionType?.typeName || "";
          // Jackson có thể serialize isSystem() thành "system" thay vì "isSystem"
          const isSystemValue = category.isSystem !== undefined ? category.isSystem : (category.system !== undefined ? category.system : false);
          const isSystemBool = isSystemValue === true || isSystemValue === "true" || String(isSystemValue).toLowerCase() === "true";
          
          const mappedCategory = {
            id: category.categoryId,
            categoryId: category.categoryId,
            name: category.categoryName,
            categoryName: category.categoryName,
            description: category.description || "",
            icon: category.description || "default",
            transactionTypeId: category.transactionType?.typeId,
            isSystem: isSystemBool,
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
      // Nếu description rỗng hoặc chỉ có khoảng trắng thì gửi null
      const descriptionValue = (payload.description || payload.icon || "").trim() || null;
      const response = await categoryAPI.createCategory(
        userId,
        payload.name,
        descriptionValue,
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
        isSystem: response.isSystem === true || response.isSystem === "true" || String(response.isSystem).toLowerCase() === "true",
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
      // Nếu description rỗng hoặc chỉ có khoảng trắng thì gửi null
      const descriptionValue = (payload.description || payload.icon || "").trim() || null;
      const response = await categoryAPI.createCategory(
        userId,
        payload.name,
        descriptionValue,
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
        isSystem: response.isSystem === true || response.isSystem === "true" || String(response.isSystem).toLowerCase() === "true",
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
      // Nếu description rỗng hoặc chỉ có khoảng trắng thì gửi null
      const descriptionValue = (patch.description || patch.icon || "").trim() || null;
      const response = await categoryAPI.updateCategory(
        id,
        userId,
        patch.name,
        descriptionValue,
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
        isSystem: response.isSystem === true || response.isSystem === "true" || String(response.isSystem).toLowerCase() === "true",
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
      // Nếu description rỗng hoặc chỉ có khoảng trắng thì gửi null
      const descriptionValue = (patch.description || patch.icon || "").trim() || null;
      const response = await categoryAPI.updateCategory(
        id,
        userId,
        patch.name,
        descriptionValue,
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
        isSystem: response.isSystem === true || response.isSystem === "true" || String(response.isSystem).toLowerCase() === "true",
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
      
      // Optimistic update: Xóa ngay khỏi state sau khi xóa thành công
      setExpenseCategories(prev => prev.filter(cat => cat.id !== id && cat.categoryId !== id));
      
      // Reload categories to get the latest data from server
      await reloadCategories();
    } catch (err) {
      console.error("Error deleting expense category:", err);
      // Nếu lỗi, reload lại để đảm bảo state đúng (không xóa optimistic vì đã có lỗi)
      await reloadCategories();
      throw err;
    }
  }, [reloadCategories]);

  // Delete income category
  const deleteIncomeCategory = useCallback(async (id) => {
    try {
      await categoryAPI.deleteCategory(id);
      
      // Optimistic update: Xóa ngay khỏi state sau khi xóa thành công
      setIncomeCategories(prev => prev.filter(cat => cat.id !== id && cat.categoryId !== id));
      
      // Reload categories to get the latest data from server
      await reloadCategories();
    } catch (err) {
      console.error("Error deleting income category:", err);
      // Nếu lỗi, reload lại để đảm bảo state đúng (không xóa optimistic vì đã có lỗi)
      await reloadCategories();
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
