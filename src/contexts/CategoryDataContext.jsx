import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import { categoryAPI } from "../services/category.service";

const CategoryDataContext = createContext(null);

// Helper để lấy userId từ localStorage
function getUserId() {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      // Xử lý nhiều format: { userId, ... } hoặc { user: { userId, ... } }
      if (userData.userId) {
        return userData.userId;
      } else if (userData.id) {
        return userData.id;
      } else if (userData.user && userData.user.userId) {
        return userData.user.userId;
      } else if (userData.user && userData.user.id) {
        return userData.user.id;
      }
    }
    // Fallback: thử lấy từ auth_user (AuthContext)
    const authUserStr = localStorage.getItem("auth_user");
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      return authUser.id || null;
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
        const userData = JSON.parse(userStr);
        // Xử lý nhiều format: { userId, ... } hoặc { user: { userId, ... } }
        if (userData.userId) {
          return userData.userId;
        } else if (userData.id) {
          return userData.id;
        } else if (userData.user && userData.user.userId) {
          return userData.user.userId;
        } else if (userData.user && userData.user.id) {
          return userData.user.id;
        }
      }
      // Fallback: thử lấy từ auth_user (AuthContext)
      const authUserStr = localStorage.getItem("auth_user");
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        return authUser.id || null;
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
      console.log("CategoryDataContext: Loading categories...");
      const response = await categoryAPI.getCategories();
      console.log("CategoryDataContext: API response:", response);
      console.log("CategoryDataContext: Response type:", typeof response);
      console.log("CategoryDataContext: Is array?", Array.isArray(response));

      // Xử lý response có thể là array trực tiếp hoặc wrap trong object
      let categories = [];
      if (Array.isArray(response)) {
        categories = response;
      } else if (response && Array.isArray(response.data)) {
        categories = response.data;
      } else if (
        response &&
        response.categories &&
        Array.isArray(response.categories)
      ) {
        categories = response.categories;
      } else {
        console.warn(
          "CategoryDataContext: Unexpected response format:",
          response
        );
        setExpenseCategories([]);
        setIncomeCategories([]);
        setCategoriesLoading(false);
        return;
      }

      console.log(
        "CategoryDataContext: Processed categories count:",
        categories.length
      );

      if (categories.length > 0) {
        // Phân loại categories theo transactionType
        const expenseList = [];
        const incomeList = [];

        categories.forEach((category) => {
          const typeName = category.transactionType?.typeName || "";
          // Jackson có thể serialize isSystem() thành "system" thay vì "isSystem"
          const isSystemValue =
            category.isSystem !== undefined
              ? category.isSystem
              : category.system !== undefined
              ? category.system
              : false;
          const isSystemBool =
            isSystemValue === true ||
            isSystemValue === "true" ||
            String(isSystemValue).toLowerCase() === "true";

          // Parse icon từ description hoặc lấy từ icon field nếu có
          let categoryIcon = "bi-tags"; // default
          let categoryDescription = category.description || "";
          
          // Nếu description bắt đầu với "icon:", tách icon ra
          if (categoryDescription && categoryDescription.startsWith("icon:")) {
            const parts = categoryDescription.split("|");
            categoryIcon = parts[0].replace("icon:", "") || "bi-tags";
            categoryDescription = parts[1] || "";
          } else if (category.icon) {
            // Nếu có field icon riêng
            categoryIcon = category.icon;
          }

          const mappedCategory = {
            id: category.categoryId,
            categoryId: category.categoryId,
            name: category.categoryName,
            categoryName: category.categoryName,
            description: categoryDescription,
            icon: categoryIcon,
            transactionTypeId: category.transactionType?.typeId,
            isSystem: isSystemBool,
          };

          // Phân loại: "Chi tiêu" = expense, "Thu nhập" = income
          if (
            typeName === "Chi tiêu" ||
            category.transactionType?.typeId === 1
          ) {
            expenseList.push(mappedCategory);
          } else if (
            typeName === "Thu nhập" ||
            category.transactionType?.typeId === 2
          ) {
            incomeList.push(mappedCategory);
          }
        });

        console.log(
          "CategoryDataContext: Expense categories:",
          expenseList.length
        );
        console.log(
          "CategoryDataContext: Income categories:",
          incomeList.length
        );

        setExpenseCategories(expenseList);
        setIncomeCategories(incomeList);
        setCurrentUserId(userId);
      } else {
        console.warn("CategoryDataContext: No categories found in response");
        setExpenseCategories([]);
        setIncomeCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      console.error("Error details:", error.message, error.stack);
      // Fallback to empty arrays on error
      setExpenseCategories([]);
      setIncomeCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load categories khi component mount hoặc khi userId thay đổi (chỉ khi có token)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setExpenseCategories([]);
      setIncomeCategories([]);
      setCategoriesLoading(false);
      return;
    }
    loadCategories();

    // Lắng nghe custom event khi user đăng nhập/đăng xuất trong cùng tab
    const handleUserChange = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setExpenseCategories([]);
        setIncomeCategories([]);
        setCategoriesLoading(false);
        return;
      }
      // Reload categories khi có event userChanged (có thể là unlock, role change, etc.)
      loadCategories();
    };
    window.addEventListener("userChanged", handleUserChange);

    // Lắng nghe sự kiện storage để reload khi user đăng nhập/đăng xuất từ tab khác
    const handleStorageChange = (e) => {
      if (
        e.key === "user" ||
        e.key === "accessToken" ||
        e.key === "auth_user"
      ) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          // Reload categories khi có thay đổi về user hoặc token
          loadCategories();
        } else {
          setExpenseCategories([]);
          setIncomeCategories([]);
          setCategoriesLoading(false);
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

      // Xử lý response có thể là array trực tiếp hoặc wrap trong object
      let categories = [];
      if (Array.isArray(response)) {
        categories = response;
      } else if (response && Array.isArray(response.data)) {
        categories = response.data;
      } else if (
        response &&
        response.categories &&
        Array.isArray(response.categories)
      ) {
        categories = response.categories;
      }

      if (categories.length > 0) {
        const expenseList = [];
        const incomeList = [];

        categories.forEach((category) => {
          const typeName = category.transactionType?.typeName || "";
          // Jackson có thể serialize isSystem() thành "system" thay vì "isSystem"
          const isSystemValue =
            category.isSystem !== undefined
              ? category.isSystem
              : category.system !== undefined
              ? category.system
              : false;
          const isSystemBool =
            isSystemValue === true ||
            isSystemValue === "true" ||
            String(isSystemValue).toLowerCase() === "true";

          // Parse icon từ description với format "icon:bi-name|description:text"
          let categoryIcon = "bi-tags"; // default
          let categoryDescription = category.description || "";
          
          // Nếu description bắt đầu với "icon:", tách icon ra
          if (categoryDescription && categoryDescription.startsWith("icon:")) {
            const parts = categoryDescription.split("|");
            categoryIcon = parts[0].replace("icon:", "") || "bi-tags";
            categoryDescription = parts[1] || "";
          } else if (category.icon) {
            // Nếu có field icon riêng
            categoryIcon = category.icon;
          }

          const mappedCategory = {
            id: category.categoryId,
            categoryId: category.categoryId,
            name: category.categoryName,
            categoryName: category.categoryName,
            description: categoryDescription,
            icon: categoryIcon,
            transactionTypeId: category.transactionType?.typeId,
            isSystem: isSystemBool,
          };

          if (
            typeName === "Chi tiêu" ||
            category.transactionType?.typeId === 1
          ) {
            expenseList.push(mappedCategory);
          } else if (
            typeName === "Thu nhập" ||
            category.transactionType?.typeId === 2
          ) {
            incomeList.push(mappedCategory);
          }
        });

        setExpenseCategories(expenseList);
        setIncomeCategories(incomeList);
      } else {
        // Nếu không có categories, vẫn set empty arrays để clear state
        setExpenseCategories([]);
        setIncomeCategories([]);
      }
    } catch (error) {
      console.error("Error reloading categories:", error);
      // Nếu có lỗi, không thay đổi state để giữ nguyên dữ liệu hiện tại
    }
  }, []);

  // Create expense category
  const createExpenseCategory = useCallback(
    async (payload) => {
      // Kiểm tra token thay vì userId vì backend tự lấy user từ token
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }

      try {
        // Lưu icon vào description với format "icon:bi-name|description:text"
        let descriptionValue = null;
        if (payload.icon && payload.description) {
          descriptionValue = `icon:${payload.icon}|${payload.description.trim()}`;
        } else if (payload.icon) {
          descriptionValue = `icon:${payload.icon}`;
        } else if (payload.description) {
          descriptionValue = payload.description.trim();
        }

        // Backend tự lấy userId từ token, không cần gửi userId
        const response = await categoryAPI.createCategory(
          null, // userId không cần thiết
          payload.name,
          descriptionValue,
          1, // transactionTypeId: 1 = Chi tiêu
          payload.isSystem // <--- Đã có: Gửi cờ hệ thống
        );

        // Reload categories to get the latest data
        await reloadCategories();

        // Parse icon từ description
        let parsedIcon = "bi-tags";
        let parsedDescription = response.description || "";
        if (parsedDescription && parsedDescription.startsWith("icon:")) {
          const parts = parsedDescription.split("|");
          parsedIcon = parts[0].replace("icon:", "") || "bi-tags";
          parsedDescription = parts[1] || "";
        }

        // Return the created category
        return {
          id: response.categoryId,
          categoryId: response.categoryId,
          name: response.categoryName,
          categoryName: response.categoryName,
          description: parsedDescription,
          icon: parsedIcon,
          transactionTypeId: 1,
          isSystem:
            response.isSystem === true ||
            response.isSystem === "true" ||
            String(response.isSystem).toLowerCase() === "true",
        };
      } catch (err) {
        console.error("Error creating expense category:", err);
        throw err;
      }
    },
    [reloadCategories]
  );

  // Create income category
  const createIncomeCategory = useCallback(
    async (payload) => {
      // Kiểm tra token thay vì userId vì backend tự lấy user từ token
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }

      try {
        // Lưu icon vào description với format "icon:bi-name|description:text"
        let descriptionValue = null;
        if (payload.icon && payload.description) {
          descriptionValue = `icon:${payload.icon}|${payload.description.trim()}`;
        } else if (payload.icon) {
          descriptionValue = `icon:${payload.icon}`;
        } else if (payload.description) {
          descriptionValue = payload.description.trim();
        }

        // Backend tự lấy userId từ token, không cần gửi userId
        const response = await categoryAPI.createCategory(
          null, // userId không cần thiết
          payload.name,
          descriptionValue,
          2, // transactionTypeId: 2 = Thu nhập
          payload.isSystem // <--- QUAN TRỌNG: Đã thêm tham số này
        );

        // Reload categories to get the latest data
        await reloadCategories();

        // Parse icon từ description
        let parsedIcon = "bi-tags";
        let parsedDescription = response.description || "";
        if (parsedDescription && parsedDescription.startsWith("icon:")) {
          const parts = parsedDescription.split("|");
          parsedIcon = parts[0].replace("icon:", "") || "bi-tags";
          parsedDescription = parts[1] || "";
        }

        // Return the created category
        return {
          id: response.categoryId,
          categoryId: response.categoryId,
          name: response.categoryName,
          categoryName: response.categoryName,
          description: parsedDescription,
          icon: parsedIcon,
          transactionTypeId: 2,
          isSystem:
            response.isSystem === true ||
            response.isSystem === "true" ||
            String(response.isSystem).toLowerCase() === "true",
        };
      } catch (err) {
        console.error("Error creating income category:", err);
        throw err;
      }
    },
    [reloadCategories]
  );

  // Update expense category
  const updateExpenseCategory = useCallback(
    async (id, patch) => {
      // Kiểm tra token thay vì userId vì backend tự lấy user từ token
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }

      try {
        // Lưu icon vào description với format "icon:bi-name|description:text"
        let descriptionValue = null;
        if (patch.icon && patch.description) {
          descriptionValue = `icon:${patch.icon}|${patch.description.trim()}`;
        } else if (patch.icon) {
          descriptionValue = `icon:${patch.icon}`;
        } else if (patch.description) {
          descriptionValue = patch.description.trim();
        }
        // Backend tự lấy userId từ token, không cần gửi userId
        const response = await categoryAPI.updateCategory(
          id,
          null, // userId không cần thiết, backend tự lấy từ token
          patch.name,
          descriptionValue,
          1 // transactionTypeId: 1 = Chi tiêu
        );

        // Reload categories to get the latest data
        await reloadCategories();

        // Parse icon từ description
        let parsedIcon = "bi-tags";
        let parsedDescription = response.description || "";
        if (parsedDescription && parsedDescription.startsWith("icon:")) {
          const parts = parsedDescription.split("|");
          parsedIcon = parts[0].replace("icon:", "") || "bi-tags";
          parsedDescription = parts[1] || "";
        }

        // Return the updated category
        return {
          id: response.categoryId,
          categoryId: response.categoryId,
          name: response.categoryName,
          categoryName: response.categoryName,
          description: parsedDescription,
          icon: parsedIcon,
          transactionTypeId: 1,
          isSystem:
            response.isSystem === true ||
            response.isSystem === "true" ||
            String(response.isSystem).toLowerCase() === "true",
        };
      } catch (err) {
        console.error("Error updating expense category:", err);
        throw err;
      }
    },
    [reloadCategories]
  );

  // Update income category
  const updateIncomeCategory = useCallback(
    async (id, patch) => {
      // Kiểm tra token thay vì userId vì backend tự lấy user từ token
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }

      try {
        // Lưu icon vào description với format "icon:bi-name|description:text"
        let descriptionValue = null;
        if (patch.icon && patch.description) {
          descriptionValue = `icon:${patch.icon}|${patch.description.trim()}`;
        } else if (patch.icon) {
          descriptionValue = `icon:${patch.icon}`;
        } else if (patch.description) {
          descriptionValue = patch.description.trim();
        }
        // Backend tự lấy userId từ token, không cần gửi userId
        const response = await categoryAPI.updateCategory(
          id,
          null, // userId không cần thiết, backend tự lấy từ token
          patch.name,
          descriptionValue,
          2 // transactionTypeId: 2 = Thu nhập (không cần gửi, backend giữ nguyên)
        );

        // Reload categories to get the latest data
        await reloadCategories();

        // Parse icon từ description
        let parsedIcon = "bi-tags";
        let parsedDescription = response.description || "";
        if (parsedDescription && parsedDescription.startsWith("icon:")) {
          const parts = parsedDescription.split("|");
          parsedIcon = parts[0].replace("icon:", "") || "bi-tags";
          parsedDescription = parts[1] || "";
        }

        // Return the updated category
        return {
          id: response.categoryId,
          categoryId: response.categoryId,
          name: response.categoryName,
          categoryName: response.categoryName,
          description: parsedDescription,
          icon: parsedIcon,
          transactionTypeId: 2,
          isSystem:
            response.isSystem === true ||
            response.isSystem === "true" ||
            String(response.isSystem).toLowerCase() === "true",
        };
      } catch (err) {
        console.error("Error updating income category:", err);
        throw err;
      }
    },
    [reloadCategories]
  );

  // Delete expense category
  const deleteExpenseCategory = useCallback(
    async (id) => {
      try {
        await categoryAPI.deleteCategory(id);

        // Optimistic update: Xóa ngay khỏi state sau khi xóa thành công
        setExpenseCategories((prev) =>
          prev.filter((cat) => cat.id !== id && cat.categoryId !== id)
        );

        // Reload categories to get the latest data from server
        await reloadCategories();
      } catch (err) {
        console.error("Error deleting expense category:", err);
        // Nếu lỗi, reload lại để đảm bảo state đúng (không xóa optimistic vì đã có lỗi)
        await reloadCategories();
        throw err;
      }
    },
    [reloadCategories]
  );

  // Delete income category
  const deleteIncomeCategory = useCallback(
    async (id) => {
      try {
        await categoryAPI.deleteCategory(id);

        // Optimistic update: Xóa ngay khỏi state sau khi xóa thành công
        setIncomeCategories((prev) =>
          prev.filter((cat) => cat.id !== id && cat.categoryId !== id)
        );

        // Reload categories to get the latest data from server
        await reloadCategories();
      } catch (err) {
        console.error("Error deleting income category:", err);
        // Nếu lỗi, reload lại để đảm bảo state đúng (không xóa optimistic vì đã có lỗi)
        await reloadCategories();
        throw err;
      }
    },
    [reloadCategories]
  );

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
    throw new Error("useCategoryData must be used within CategoryDataProvider");
  return ctx;
}
