import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useCurrency } from "../../hooks/useCurrency";

import { useLocation } from "react-router-dom";
import "../../styles/home/TransactionsPage.css";
import TransactionViewModal from "../../components/transactions/TransactionViewModal";
import TransactionFormModal from "../../components/transactions/TransactionFormModal";
import ScheduledTransactionModal from "../../components/transactions/ScheduledTransactionModal";
import ScheduledTransactionDrawer from "../../components/transactions/ScheduledTransactionDrawer";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import BudgetWarningModal from "../../components/budgets/BudgetWarningModal";
import { useBudgetData } from "../../home/store/BudgetDataContext";
import { useCategoryData } from "../../home/store/CategoryDataContext";
import { useWalletData } from "../../home/store/WalletDataContext";
import { useLanguage } from "../../home/store/LanguageContext";
import { transactionAPI, walletAPI } from "../../services/api-client";

// ===== REMOVED MOCK DATA - Now using API =====

const TABS = {
  EXTERNAL: "external",
  INTERNAL: "internal",
  SCHEDULE: "schedule",
};

const PAGE_SIZE = 10;

function toDateObj(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format ngày theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string} date - Date object hoặc date string (ISO format từ API)
 * @returns {string} - Format: "DD/MM/YYYY"
 */
function formatVietnamDate(date) {
  if (!date) return "";
  
  // Parse date string từ API (thường là ISO string ở UTC)
  // Không dùng new Date() trực tiếp vì nó sẽ parse theo local timezone
  // Thay vào đó, parse ISO string và convert sang VN timezone
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    // Nếu là ISO string, parse nó như UTC time
    d = new Date(date);
  } else {
    return "";
  }
  
  if (Number.isNaN(d.getTime())) return "";
  
  // Dùng toLocaleString với timezone VN để convert đúng
  return d.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format giờ theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string} date - Date object hoặc date string (ISO format từ API)
 * @returns {string} - Format: "HH:mm"
 */
function formatVietnamTime(date) {
  if (!date) return "";
  
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    // Parse ISO string như UTC time
    d = new Date(date);
  } else {
    return "";
  }
  
  if (Number.isNaN(d.getTime())) return "";
  
  // Dùng toLocaleString với timezone VN để convert đúng
  return d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format số tiền với độ chính xác cao (tối đa 8 chữ số thập phân)
 * Để hiển thị chính xác số tiền nhỏ khi chuyển đổi tiền tệ
 */



export default function TransactionsPage() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [externalTransactions, setExternalTransactions] = useState([]);
  const [internalTransactions, setInternalTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.EXTERNAL);

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const [currentPage, setCurrentPage] = useState(1);

  const [scheduledTransactions, setScheduledTransactions] = useState(MOCK_SCHEDULES);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Get shared data from contexts
  const { budgets, getSpentAmount, getSpentForBudget, updateTransactionsByCategory, updateAllExternalTransactions } = useBudgetData();
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets, loadWallets } = useWalletData();
  const location = useLocation();
  const [appliedFocusParam, setAppliedFocusParam] = useState("");
  
  // Budget warning state
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  // Helper function to map Transaction entity to frontend format
  const mapTransactionToFrontend = useCallback((tx) => {
    const walletName = wallets.find(w => w.walletId === tx.wallet?.walletId)?.walletName || tx.wallet?.walletName || "Unknown";
    const categoryName = tx.category?.categoryName || "Unknown";
    const typeName = tx.transactionType?.typeName || "";
    const type = typeName === "Chi tiêu" ? "expense" : "income";
    
    // Dùng created_at từ database thay vì transaction_date
    // Giữ nguyên date string từ API (ISO format), không convert
    // Format sẽ được xử lý khi hiển thị bằng formatVietnamDate/Time
    const dateValue = tx.createdAt || tx.transactionDate || new Date().toISOString();
    
    return {
      id: tx.transactionId,
      code: `TX-${String(tx.transactionId).padStart(4, "0")}`,
      type: type,
      walletName: walletName,
      amount: parseFloat(tx.amount || 0),
      currency: tx.wallet?.currencyCode || "VND",
      date: dateValue,
      category: categoryName,
      note: tx.note || "",
      creatorCode: `USR${String(tx.user?.userId || 0).padStart(3, "0")}`,
      attachment: tx.imageUrl || "",
    };
  }, [wallets]);

  // Helper function to map WalletTransfer entity to frontend format
  const mapTransferToFrontend = useCallback((transfer) => {
    const sourceWalletName = wallets.find(w => w.walletId === transfer.fromWallet?.walletId)?.walletName || transfer.fromWallet?.walletName || "Unknown";
    const targetWalletName = wallets.find(w => w.walletId === transfer.toWallet?.walletId)?.walletName || transfer.toWallet?.walletName || "Unknown";
    
    // Dùng created_at từ database thay vì transfer_date
    // Giữ nguyên date string từ API (ISO format), không convert
    const dateValue = transfer.createdAt || transfer.transferDate || new Date().toISOString();
    
    return {
      id: transfer.transferId,
      code: `TR-${String(transfer.transferId).padStart(4, "0")}`,
      type: "transfer",
      sourceWallet: sourceWalletName,
      targetWallet: targetWalletName,
      amount: parseFloat(transfer.amount || 0),
      currency: transfer.currencyCode || "VND",
      date: dateValue,
      category: "Chuyển tiền giữa các ví",
      note: transfer.note || "",
      creatorCode: `USR${String(transfer.user?.userId || 0).padStart(3, "0")}`,
      attachment: "",
    };
  }, [wallets]);

  const hasWallets = Array.isArray(wallets) && wallets.length > 0;
  // Load transactions from API
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const txResponse = await transactionAPI.getAllTransactions();
      if (txResponse && txResponse.transactions) {
        const mapped = txResponse.transactions.map(mapTransactionToFrontend);
        setExternalTransactions(mapped);
      }

      const transferResponse = await walletAPI.getAllTransfers();
      if (transferResponse && transferResponse.transfers) {
        const mappedTransfers = transferResponse.transfers.map(mapTransferToFrontend);
        setInternalTransactions(mappedTransfers);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadTransactions();

    // Lắng nghe event khi user đăng nhập
    const handleUserChange = () => {
      loadTransactions();
    };
    window.addEventListener("userChanged", handleUserChange);

    // Lắng nghe storage event
    const handleStorageChange = (e) => {
      if (e.key === "accessToken" || e.key === "user" || e.key === "auth_user") {
        loadTransactions();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [hasWallets, mapTransactionToFrontend, mapTransferToFrontend]);

  // Apply wallet filter when navigated with ?focus=<walletId|walletName>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusParam = params.get("focus");

    if (!focusParam) {
      if (appliedFocusParam) {
        setAppliedFocusParam("");
      }
      return;
    }

    if (!wallets || wallets.length === 0 || focusParam === appliedFocusParam) {
      return;
    }

    const normalizedFocus = focusParam.trim();
    const focusLower = normalizedFocus.toLowerCase();

    let walletNameToApply = normalizedFocus;

    const walletById = wallets.find(
      (wallet) => String(wallet.id) === normalizedFocus || String(wallet.walletId) === normalizedFocus
    );

    if (walletById) {
      walletNameToApply = walletById.name || walletById.walletName || walletNameToApply;
    } else {
      const walletByName = wallets.find(
        (wallet) => (wallet.name || wallet.walletName || "").toLowerCase() === focusLower
      );
      if (walletByName) {
        walletNameToApply = walletByName.name || walletByName.walletName || walletNameToApply;
      }
    }

    if (activeTab !== TABS.EXTERNAL) {
      setActiveTab(TABS.EXTERNAL);
    }

    setFilterWallet(walletNameToApply);
    setCurrentPage(1);
    setAppliedFocusParam(normalizedFocus);
  }, [location.search, wallets, activeTab, appliedFocusParam]);

  const handleTabChange = (e) => {
    const value = e.target.value;
    setActiveTab(value);
    setSearchText("");
  };
  
  const handleCreate = async (payload) => {
    try {
        if (activeTab === TABS.EXTERNAL) {
        // Find walletId and categoryId
        const wallet = wallets.find(w => w.walletName === payload.walletName || w.name === payload.walletName);
        if (!wallet) {
          setToast({ open: true, message: t("transactions.error.wallet_not_found").replace("{wallet}", payload.walletName), type: "error" });
          return;
        }

        // Tìm category trong đúng danh sách dựa trên loại giao dịch
        // Tránh tìm nhầm category cùng tên nhưng khác loại
        const categoryList = payload.type === "income" 
          ? (incomeCategories || [])
          : (expenseCategories || []);
        
        const category = categoryList.find(
          c => c.name === payload.category || 
               c.categoryName === payload.category ||
               (c.name && c.name.trim() === payload.category?.trim()) ||
               (c.categoryName && c.categoryName.trim() === payload.category?.trim())
        );
        
        if (!category) {
          setToast({ 
            open: true, 
            message: `Không tìm thấy danh mục "${payload.category}" trong loại ${payload.type === "income" ? "thu nhập" : "chi tiêu"}.`,
            type: "error"
          });
          return;
        }

        const walletId = wallet.walletId || wallet.id;
        const categoryId = category.categoryId || category.id;
        
        if (!categoryId) {
          setToast({ open: true, message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.", type: "error" });
          return;
        }
        
        const transactionDate = payload.date ? new Date(payload.date).toISOString() : new Date().toISOString();

        // Call API
        if (payload.type === "expense") {
          await transactionAPI.addExpense(
            payload.amount,
            transactionDate,
            walletId,
            categoryId,
            payload.note || "",
            payload.attachment || null
          );
    } else {
          await transactionAPI.addIncome(
            payload.amount,
            transactionDate,
            walletId,
            categoryId,
            payload.note || "",
            payload.attachment || null
          );
        }

        setToast({ open: true, message: t("transactions.toast.add_success") });
      } else {
        // Internal transfer
        const sourceWallet = wallets.find(w => w.walletName === payload.sourceWallet || w.name === payload.sourceWallet);
        const targetWallet = wallets.find(w => w.walletName === payload.targetWallet || w.name === payload.targetWallet);
        
        if (!sourceWallet || !targetWallet) {
          setToast({ open: true, message: t("transactions.error.wallet_not_found_pair"), type: "error" });
          return;
        }

        const fromWalletId = sourceWallet.walletId || sourceWallet.id;
        const toWalletId = targetWallet.walletId || targetWallet.id;

        await walletAPI.transferMoney(
          fromWalletId,
          toWalletId,
          payload.amount,
          payload.note || ""
        );

        setToast({ open: true, message: t("transactions.toast.add_success") });
      }

      // Reload wallets để cập nhật số dư sau khi tạo giao dịch
      // Điều này đảm bảo trang ví tiền tự động cập nhật mà không cần reload
      await loadWallets();

      // Reload all transaction data
      const txResponse = await transactionAPI.getAllTransactions();
      if (txResponse.transactions) {
        const mapped = txResponse.transactions.map(mapTransactionToFrontend);
        setExternalTransactions(mapped);
      }

      const transferResponse = await walletAPI.getAllTransfers();
      if (transferResponse.transfers) {
        const mapped = transferResponse.transfers.map(mapTransferToFrontend);
        setInternalTransactions(mapped);
      }

    setCreating(false);
    setCurrentPage(1);
    } catch (error) {
      console.error("Error creating transaction:", error);
      setToast({ open: true, message: t("transactions.error.create_failed") + (error?.message ? `: ${error.message}` : ""), type: "error" });
    }
  };

  // Handle budget warning confirmation (user wants to continue)
  const handleBudgetWarningConfirm = async () => {
    if (!pendingTransaction) return;

    // Create the transaction anyway by calling handleCreate
    await handleCreate(pendingTransaction);

    setBudgetWarning(null);
    setPendingTransaction(null);
  };

  // Handle budget warning cancellation
  const handleBudgetWarningCancel = () => {
    setBudgetWarning(null);
    setPendingTransaction(null);
    setCreating(true); // Go back to create form
  };

  const handleUpdate = async (payload) => {
    if (!editing) {
      console.error("handleUpdate: editing is null");
      return;
    }

    if (!editing.id) {
      console.error("handleUpdate: editing.id is missing", editing);
      setToast({ open: true, message: t("transactions.error.id_not_found"), type: "error" });
      return;
    }

    try {
      // Xử lý giao dịch chuyển tiền (transfer)
      if (editing.type === "transfer") {
        console.log("Updating transfer:", {
          transferId: editing.id,
          note: payload.note || "",
        });
        
        const response = await walletAPI.updateTransfer(
          editing.id,
          payload.note || ""
        );
        
        console.log("Update transfer response:", response);

        // Reload transfers
        const transferResponse = await walletAPI.getAllTransfers();
        if (transferResponse.transfers) {
          const mapped = transferResponse.transfers.map(mapTransferToFrontend);
          setInternalTransactions(mapped);
        }

        setEditing(null);
        setToast({ open: true, message: t("transactions.toast.update_success"), type: "success" });
        return;
      }

      // Xử lý giao dịch thu nhập/chi tiêu (external transactions)
      // Tìm categoryId từ category name
      const categoryList = editing.type === "income" 
        ? (incomeCategories || [])
        : (expenseCategories || []);
      
      const category = categoryList.find(
        c => c.name === payload.category || 
             c.categoryName === payload.category ||
             (c.name && c.name.trim() === payload.category?.trim()) ||
             (c.categoryName && c.categoryName.trim() === payload.category?.trim())
      );
      
      if (!category) {
        setToast({ 
          open: true, 
          message: `Không tìm thấy danh mục "${payload.category}" trong loại ${editing.type === "income" ? "thu nhập" : "chi tiêu"}.`,
          type: "error",
        });
        return;
      }

      const categoryId = category.categoryId || category.id;
      if (!categoryId) {
        setToast({ open: true, message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.", type: "error" });
        return;
      }

      // Gọi API update
      console.log("Updating transaction:", {
        transactionId: editing.id,
        categoryId,
        note: payload.note || "",
        attachment: payload.attachment || null
      });
      
      const response = await transactionAPI.updateTransaction(
        editing.id,
        categoryId,
        payload.note || "",
        payload.attachment || null
      );
      
      console.log("Update transaction response:", response);

      // Reload transactions
      const txResponse = await transactionAPI.getAllTransactions();
      if (txResponse.transactions) {
        const mapped = txResponse.transactions.map(mapTransactionToFrontend);
        setExternalTransactions(mapped);
      }

      setEditing(null);
      setToast({ open: true, message: t("transactions.toast.update_success"), type: "success" });
    } catch (error) {
      console.error("Error updating transaction/transfer:", error);
      const errorMessage = error.message || "Lỗi không xác định";
      if (editing.type === "transfer") {
        setToast({ open: true, message: t("transactions.error.update_failed") + ": " + errorMessage, type: "error" });
      } else {
        setToast({ open: true, message: t("transactions.error.update_failed") + ": " + errorMessage, type: "error" });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;

    const item = confirmDel;
    setConfirmDel(null); // Đóng modal

    try {
      // Xử lý xóa giao dịch chuyển tiền
      if (item.type === "transfer") {
        // Gọi API xóa transfer
        await walletAPI.deleteTransfer(item.id);

        // Reload transfers
        const transferResponse = await walletAPI.getAllTransfers();
        if (transferResponse.transfers) {
          const mapped = transferResponse.transfers.map(mapTransferToFrontend);
          setInternalTransactions(mapped);
        }

        // Reload wallets để cập nhật số dư
        await loadWallets();

        setToast({ open: true, message: t("transactions.toast.delete_success"), type: "success" });
        return;
      }

      // Xử lý xóa giao dịch thu nhập/chi tiêu
      // Gọi API xóa
      await transactionAPI.deleteTransaction(item.id);

      // Reload transactions
      const txResponse = await transactionAPI.getAllTransactions();
      if (txResponse.transactions) {
        const mapped = txResponse.transactions.map(mapTransactionToFrontend);
        setExternalTransactions(mapped);
      }

      // Reload wallets để cập nhật số dư
      await loadWallets();

      setToast({ open: true, message: t("transactions.toast.delete_success"), type: "success" });
    } catch (error) {
      console.error("Error deleting transaction/transfer:", error);
      // Kiểm tra nếu lỗi là về ví âm tiền
      const errorMessage = error.message || "Lỗi không xác định";
      if (errorMessage.includes("Không thể xóa giao dịch vì ví không được âm tiền") || 
          errorMessage.includes("ví không được âm tiền") || 
          errorMessage.includes("ví âm tiền") ||
          errorMessage.includes("âm tiền")) {
        setToast({ open: true, message: t("transactions.error.delete_wallet_negative"), type: "error" });
      } else {
        if (item.type === "transfer") {
          setToast({ open: true, message: t("transactions.error.delete_failed") + ": " + errorMessage, type: "error" });
        } else {
          setToast({ open: true, message: t("transactions.error.delete_failed") + ": " + errorMessage, type: "error" });
        }
      }
    }
  };

  // Update budget data when transactions change
  useEffect(() => {
    // Build transaction map keyed by category:wallet and category:all
    // category:walletName = spent for transactions of that category in that specific wallet
    // category:all = sum of all wallets for that category (for "apply to all wallets" budgets)
    const categoryMap = {};
    const categoryAllTotals = {}; // Temp to sum by category

    externalTransactions.forEach((t) => {
      if (t.type === "expense" && t.category && t.walletName) {
        // Add to specific wallet key
        const walletKey = `${t.category}:${t.walletName}`;
        categoryMap[walletKey] = (categoryMap[walletKey] || 0) + t.amount;

        // Track total for category:all calculation
        categoryAllTotals[t.category] = (categoryAllTotals[t.category] || 0) + t.amount;
      }
    });

    // Add category:all totals to map
    Object.entries(categoryAllTotals).forEach(([category, total]) => {
      categoryMap[`${category}:all`] = total;
    });

    updateTransactionsByCategory(categoryMap);
    // also provide the full transactions list to budget context for period-based calculations
    updateAllExternalTransactions(externalTransactions);
  }, [externalTransactions, updateTransactionsByCategory, updateAllExternalTransactions]);

  const currentTransactions = useMemo(
    () =>
      activeTab === TABS.EXTERNAL
        ? externalTransactions
        : internalTransactions,
    [activeTab, externalTransactions, internalTransactions]
  );

  const allCategories = useMemo(() => {
    const s = new Set(currentTransactions.map((t) => t.category).filter(Boolean));
    return Array.from(s);
  }, [currentTransactions]);

  const allWallets = useMemo(() => {
    if (activeTab === TABS.EXTERNAL) {
      const s = new Set(
        externalTransactions.map((t) => t.walletName).filter(Boolean)
      );
      return Array.from(s);
    }
    const s = new Set();
    internalTransactions.forEach((t) => {
      if (t.sourceWallet) s.add(t.sourceWallet);
      if (t.targetWallet) s.add(t.targetWallet);
    });
    return Array.from(s);
  }, [activeTab, externalTransactions, internalTransactions]);

  const scheduleCounts = useMemo(() => {
    const counts = { all: scheduledTransactions.length, pending: 0, recurring: 0 };
    scheduledTransactions.forEach((item) => {
      if (item.status === "PENDING" || item.status === "RUNNING") counts.pending += 1;
      if (item.scheduleType !== "ONE_TIME") counts.recurring += 1;
    });
    return counts;
  }, [scheduledTransactions]);

  const filteredSchedules = useMemo(() => {
    return scheduledTransactions.filter((item) => {
      if (scheduleFilter === "pending") {
        return item.status === "PENDING" || item.status === "RUNNING";
      }
      if (scheduleFilter === "recurring") {
        return item.scheduleType !== "ONE_TIME";
      }
      return true;
    });
  }, [scheduledTransactions, scheduleFilter]);

  const isScheduleView = activeTab === TABS.SCHEDULE;

  const filteredSorted = useMemo(() => {
    let list = currentTransactions.slice();

    list = list.filter((t) => {
      if (activeTab === TABS.EXTERNAL) {
        if (filterType !== "all" && t.type !== filterType) return false;
      }

      if (filterCategory !== "all" && t.category !== filterCategory) return false;

      if (filterWallet !== "all") {
        if (activeTab === TABS.EXTERNAL) {
          if (t.walletName !== filterWallet) return false;
        } else {
          if (
            t.sourceWallet !== filterWallet &&
            t.targetWallet !== filterWallet
          )
            return false;
        }
      }

      const d = toDateObj(t.date);
      if (!d) return false;

      if (fromDateTime) {
        const from = toDateObj(fromDateTime);
        if (from && d < from) return false;
      }
      if (toDateTime) {
        const to = toDateObj(toDateTime);
        if (to && d > to) return false;
      }

      if (searchText) {
        const keyword = searchText.toLowerCase();
        const joined =
          activeTab === TABS.EXTERNAL
            ? [
                t.code,
                t.walletName,
                t.category,
                t.note,
                t.amount?.toString(),
              ]
                .join(" ")
                .toLowerCase()
            : [
                t.code,
                t.sourceWallet,
                t.targetWallet,
                t.category,
                t.note,
                t.amount?.toString(),
              ]
                .join(" ")
                .toLowerCase();
        if (!joined.includes(keyword)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const da = toDateObj(a.date)?.getTime() || 0;
      const db = toDateObj(b.date)?.getTime() || 0;
      return db - da;
    });

    return list;
  }, [
    currentTransactions,
    activeTab,
    filterType,
    filterCategory,
    filterWallet,
    fromDateTime,
    toDateTime,
    searchText,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  const paginationRange = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (startPage > 2) pages.push("left-ellipsis");

    for (let p = startPage; p <= endPage; p += 1) {
      pages.push(p);
    }

    if (endPage < totalPages - 1) pages.push("right-ellipsis");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, currentPage]);

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchText("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterWallet("all");
    setFromDateTime("");
    setToDateTime("");
    setCurrentPage(1);
  };

  const handleScheduleSubmit = (payload) => {
    const scheduleId = Date.now();
    const totalRuns = estimateScheduleRuns(payload.firstRun, payload.endDate, payload.scheduleType);
    const newSchedule = {
      id: scheduleId,
      walletId: payload.walletId,
      walletName: payload.walletName,
      categoryName: payload.categoryName,
      transactionType: payload.transactionType,
      amount: payload.amount,
      currency: "VND",
      scheduleType: payload.scheduleType,
      scheduleTypeLabel: SCHEDULE_TYPE_LABELS[payload.scheduleType] || payload.scheduleType,
      status: "PENDING",
      firstRun: payload.firstRun,
      nextRun: payload.firstRun,
      endDate: payload.endDate,
      successRuns: 0,
      totalRuns,
      warning: null,
      logs: [],
    };

    setScheduledTransactions((prev) => [newSchedule, ...prev]);
    setScheduleModalOpen(false);
    setToast({ open: true, message: t("transactions.toast.schedule_created"), type: "success" });
  };

  const handleScheduleCancel = (scheduleId) => {
    setScheduledTransactions((prev) =>
      prev.map((item) => {
        if (item.id !== scheduleId) return item;
        return {
          ...item,
          status: "CANCELLED",
          warning: null,
          logs: [
            {
              id: Date.now(),
              time: new Date().toISOString(),
              status: "FAILED",
              message: "Người dùng đã hủy lịch.",
            },
            ...item.logs,
          ],
        };
      })
    );

    setSelectedSchedule((prev) => (prev?.id === scheduleId ? null : prev));
    setToast({ open: true, message: t("transactions.toast.schedule_cancelled"), type: "success" });
  };

  return (
    <div className="tx-page container-fluid py-4">
      <div className="tx-page-inner">
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-header-icon">
            <i className="bi bi-cash-stack" />
          </div>
          <div>
            <h2 className="wallet-header-title">{t("transactions.page.title")}</h2>
            <p className="wallet-header-subtitle">{t("transactions.page.subtitle")}</p>
          </div>
        </div>

        <div className="wallet-header-center d-flex justify-content-center">
          <select
            className="form-select form-select-sm"
            style={{ minWidth: 220, maxWidth: 360 }}
            value={activeTab}
            onChange={handleTabChange}
          >
            <option value={TABS.EXTERNAL}>{t("transactions.tab.external")}</option>
            <option value={TABS.INTERNAL}>{t("transactions.tab.internal")}</option>
            <option value={TABS.SCHEDULE}>{t("transactions.tab.schedule")}</option>
          </select>
        </div>

        <div className="wallet-header-right d-flex align-items-center justify-content-end">
          <button
            className="wallet-header-btn d-flex align-items-center"
            onClick={() => setCreating(true)}
          >
            <i className="bi bi-plus-lg me-2" />
            {t("transactions.btn.add")}
          </button>
        </div>
      </div>


      {!isScheduleView && (
        <div className="tx-filters card border-0 mb-3">
          <div className="card-body d-flex flex-column gap-2">
            <div className="d-flex flex-wrap gap-2">
              <div className="tx-filter-item flex-grow-1">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted" />
                  </span>
                  <input
                    className="form-control border-start-0"
                    placeholder={t("transactions.filter.search_placeholder")}
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {activeTab === TABS.EXTERNAL && (
                <div className="tx-filter-item">
                  <select
                    className="form-select"
                    value={filterType}
                    onChange={handleFilterChange(setFilterType)}
                  >
                    <option value="all">{t("transactions.filter.type_all")}</option>
                    <option value="income">{t("transactions.type.income")}</option>
                    <option value="expense">{t("transactions.type.expense")}</option>
                  </select>
                </div>
              )}

              <div className="tx-filter-item">
                  <select
                  className="form-select"
                  value={filterCategory}
                  onChange={handleFilterChange(setFilterCategory)}
                >
                    <option value="all">{t("transactions.filter.category_all")}</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="tx-filter-item">
                <select
                  className="form-select"
                  value={filterWallet}
                  onChange={handleFilterChange(setFilterWallet)}
                >
                  <option value="all">{t("transactions.filter.wallet_all")}</option>
                  {allWallets.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tx-filter-item d-flex align-items-center gap-1">
                <input
                  type="datetime-local"
                  className="form-control"
                  value={fromDateTime}
                  onChange={handleDateChange(setFromDateTime)}
                />
                <span className="text-muted small px-1">{t("transactions.filter.to")}</span>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={toDateTime}
                  onChange={handleDateChange(setToDateTime)}
                />
              </div>

              <div className="ms-auto">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={clearFilters}
                >
                  <i className="bi bi-x-circle me-1" />
                  {t("transactions.btn.clear")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScheduleView ? (
        <div className="scheduled-section card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h5 className="mb-1">{t("transactions.schedule.title")}</h5>
                <p className="text-muted mb-0">{t("transactions.schedule.desc")}</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => setScheduleModalOpen(true)}>
                <i className="bi bi-plus-lg me-2" />{t("transactions.schedule.create_btn")}
              </button>
            </div>

            <div className="schedule-tabs mb-3">
              {SCHEDULE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`schedule-tab ${scheduleFilter === tab.value ? "active" : ""}`}
                  onClick={() => setScheduleFilter(tab.value)}
                >
                  {t(`transactions.schedule.tab.${tab.value}`)}
                  <span className="badge rounded-pill bg-light text-dark ms-2">
                    {scheduleCounts[tab.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="text-center text-muted py-4">
                Chưa có lịch nào phù hợp.
              </div>
            ) : (
              <div className="schedule-list">
                {filteredSchedules.map((schedule) => {
                  const meta = SCHEDULE_STATUS_META[schedule.status] || SCHEDULE_STATUS_META.PENDING;
                  const progress = schedule.totalRuns > 0 ? Math.min(100, Math.round((schedule.successRuns / schedule.totalRuns) * 100)) : 0;
                  return (
                    <div className="scheduled-card" key={schedule.id}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="mb-1">
                            {schedule.walletName} • {schedule.transactionType === "income" ? t("transactions.type.income") : t("transactions.type.expense")}
                          </h6>
                          <p className="mb-1 text-muted">
                            {schedule.categoryName} · {schedule.scheduleTypeLabel}
                          </p>
                        </div>
                        <span className={meta.className}>{t(`transactions.schedule.status.${String(schedule.status).toLowerCase()}`)}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-3 mb-2 small text-muted">
                        <span>{t("transactions.schedule.amount")} {formatCurrency(schedule.amount)}</span>
                        <span>{t("transactions.schedule.next_run")} {formatVietnamDateTime(schedule.nextRun)}</span>
                        <span>
                          {t("transactions.schedule.completed_runs")} {schedule.successRuns}/{schedule.totalRuns || "∞"}
                        </span>
                      </div>
                      <div className="progress schedule-progress">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                      </div>
                      {schedule.warning && (
                        <div className="schedule-warning">
                          <i className="bi bi-exclamation-triangle-fill me-1" />
                          {schedule.warning}
                        </div>
                      )}
                      <div className="scheduled-card-actions">
                        <button type="button" className="btn btn-link px-0" onClick={() => setSelectedSchedule(schedule)}>
                          {t("transactions.schedule.view_history")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-link px-0 text-danger"
                          disabled={schedule.status === "CANCELLED"}
                          onClick={() => handleScheduleCancel(schedule.id)}
                        >
                          {t("transactions.schedule.cancel")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm tx-table-card">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="mt-2 text-muted">{t("transactions.loading.list")}</p>
            </div>
          ) : (
          <div className="table-responsive">
            {activeTab === TABS.EXTERNAL ? (
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>{t("transactions.table.no")}</th>
                    <th>{t("transactions.table.date")}</th>
                    <th>{t("transactions.table.time")}</th>
                    <th>{t("transactions.table.type")}</th>
                    <th>{t("transactions.table.wallet")}</th>
                    <th>{t("transactions.table.category")}</th>
                    <th className="tx-note-col">{t("transactions.table.note")}</th>
                    <th className="text-end">{t("transactions.table.amount")}</th>
                    <th className="text-center">{t("transactions.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        {t("transactions.table.empty")}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((tx, i) => {
                      const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                      const d = toDateObj(tx.date);
                      const dateStr = formatVietnamDate(d);
                      const timeStr = formatVietnamTime(d);

                      return (
                        <tr key={tx.id}>
                          <td>{serial}</td>
                          <td>{dateStr}</td>
                          <td>{timeStr}</td>
                          <td>{tx.type === "income" ? t("transactions.type.income") : t("transactions.type.expense")}</td>
                          <td>{tx.walletName}</td>
                          <td>{tx.category}</td>
                          <td className="tx-note-cell" title={tx.note || "-"}>{tx.note || "-"}</td>
                          <td className="text-end">
                            <span className={tx.type === "expense" ? "tx-amount-expense" : "tx-amount-income"}>
                              {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="text-center">
                            <button className="btn btn-link btn-sm text-muted me-1" title={t("transactions.action.view")} onClick={() => setViewing(tx)}>
                              <i className="bi bi-eye" />
                            </button>
                            <button className="btn btn-link btn-sm text-muted me-1" title={t("transactions.action.edit")} onClick={() => setEditing(tx)}>
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => setConfirmDel(tx)}>
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>{t("transactions.table.no")}</th>
                    <th>{t("transactions.table.date")}</th>
                    <th>{t("transactions.table.time")}</th>
                    <th>{t("transactions.table.source_wallet")}</th>
                    <th>{t("transactions.table.target_wallet")}</th>
                    <th className="tx-note-col">{t("transactions.table.note")}</th>
                    <th className="text-end">{t("transactions.table.amount")}</th>
                    <th className="text-center">{t("transactions.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        {t("transactions.table.empty")}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((tx, i) => {
                      const serial = (currentPage - 1) * PAGE_SIZE + i + 1;
                      const d = toDateObj(tx.date);
                      const dateStr = formatVietnamDate(d);
                      const timeStr = formatVietnamTime(d);

                      return (
                        <tr key={tx.id}>
                          <td>{serial}</td>
                          <td>{dateStr}</td>
                          <td>{timeStr}</td>
                          <td>{tx.sourceWallet}</td>
                          <td>{tx.targetWallet}</td>
                          <td className="tx-note-cell" title={tx.note || "-"}>{tx.note || "-"}</td>
                          <td className="text-end">
                            <span className="tx-amount-transfer">{formatCurrency(tx.amount)}</span>
                          </td>
                          <td className="text-center">
                            <button className="btn btn-link btn-sm text-muted me-1" title={t("transactions.action.view")} onClick={() => setViewing(tx)}>
                              <i className="bi bi-eye" />
                            </button>
                            <button className="btn btn-link btn-sm text-muted me-1" title={t("transactions.action.edit")} onClick={() => setEditing(tx)}>
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button className="btn btn-link btn-sm text-danger" title={t("transactions.action.delete")} onClick={() => setConfirmDel(tx)}>
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
          )}

          <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <span className="text-muted small">
              Trang {currentPage}/{totalPages}
            </span>
            <div className="tx-pagination">
              <button
                type="button"
                className="page-arrow"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
              >
                «
              </button>
              <button
                type="button"
                className="page-arrow"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ‹
              </button>
              {paginationRange.map((item, idx) =>
                typeof item === "string" && item.includes("ellipsis") ? (
                  <span key={`${item}-${idx}`} className="page-ellipsis">…</span>
                ) : (
                  <button
                    key={`tx-page-${item}`}
                    type="button"
                    className={`page-number ${currentPage === item ? "active" : ""}`}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                className="page-arrow"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="page-arrow"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduledTransactionModal
        open={scheduleModalOpen}
        wallets={wallets}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onSubmit={handleScheduleSubmit}
        onClose={() => setScheduleModalOpen(false)}
      />

      <ScheduledTransactionDrawer
        open={!!selectedSchedule}
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onCancel={handleScheduleCancel}
      />

      <TransactionViewModal
        open={!!viewing}
        tx={viewing}
        onClose={() => setViewing(null)}
      />

      <TransactionFormModal
        open={creating}
        mode="create"
        variant={activeTab === TABS.EXTERNAL ? "external" : "internal"}
        onSubmit={handleCreate}
        onClose={() => setCreating(false)}
      />

      <TransactionFormModal
        open={!!editing}
        mode="edit"
        variant={editing && editing.sourceWallet ? "internal" : "external"}
        initialData={editing}
        onSubmit={handleUpdate}
        onClose={() => setEditing(null)}
      />

      <ConfirmModal
        open={!!confirmDel}
        title={t("transactions.confirm.delete_title")}
        message={
          confirmDel ? t("transactions.confirm.delete_message").replace("{code}", confirmDel.code) : ""
        }
        okText={t("transactions.confirm.delete_ok")}
        cancelText={t("transactions.confirm.delete_cancel")}
        onOk={handleDelete}
        onClose={() => setConfirmDel(null)}
      />

      <BudgetWarningModal
        open={!!budgetWarning}
        categoryName={budgetWarning?.categoryName}
        budgetLimit={budgetWarning?.budgetLimit || 0}
        spent={budgetWarning?.spent || 0}
        transactionAmount={budgetWarning?.transactionAmount || 0}
        totalAfterTx={budgetWarning?.totalAfterTx || 0}
        isExceeding={budgetWarning?.isExceeding || false}
        onConfirm={handleBudgetWarningConfirm}
        onCancel={handleBudgetWarningCancel}
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

function formatVietnamDateTime(date) {
  if (!date) return "";
  let d;
  if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }
  if (Number.isNaN(d.getTime())) return "";
  return `${formatVietnamDate(d)} ${formatVietnamTime(d)}`.trim();
}

function estimateScheduleRuns(startValue, endValue, scheduleType) {
  if (scheduleType === "ONE_TIME") return 1;
  if (!startValue || !endValue) return 0;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  switch (scheduleType) {
    case "DAILY":
      return diffDays + 1;
    case "WEEKLY":
      return Math.floor(diffDays / 7) + 1;
    case "MONTHLY":
      return Math.max(1, Math.round(diffDays / 30));
    case "YEARLY":
      return Math.max(1, Math.round(diffDays / 365));
    default:
      return 0;
  }
}

const SCHEDULE_TYPE_LABELS = {
  ONE_TIME: "Một lần",
  DAILY: "Hằng ngày",
  WEEKLY: "Hằng tuần",
  MONTHLY: "Hằng tháng",
  YEARLY: "Hằng năm",
};

const SCHEDULE_STATUS_META = {
  PENDING: { label: "Chờ chạy", className: "schedule-status schedule-status--pending" },
  RUNNING: { label: "Đang chạy", className: "schedule-status schedule-status--running" },
  COMPLETED: { label: "Hoàn tất", className: "schedule-status schedule-status--success" },
  FAILED: { label: "Thất bại", className: "schedule-status schedule-status--failed" },
  CANCELLED: { label: "Đã hủy", className: "schedule-status schedule-status--muted" },
};

const SCHEDULE_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ chạy" },
  { value: "recurring", label: "Định kỳ" },
];

const MOCK_SCHEDULES = [
  {
    id: 101,
    walletId: "wallet-main",
    walletName: "Ví chính",
    categoryName: "Hóa đơn",
    transactionType: "expense",
    amount: 2500000,
    currency: "VND",
    scheduleType: "MONTHLY",
    scheduleTypeLabel: SCHEDULE_TYPE_LABELS.MONTHLY,
    status: "PENDING",
    firstRun: "2025-01-05T08:00",
    nextRun: "2025-03-05T08:00",
    endDate: "2025-12-31",
    successRuns: 1,
    totalRuns: 12,
    warning: null,
    logs: [
      { id: 1, time: "2025-02-05T08:00", status: "FAILED", message: "Không đủ số dư" },
      { id: 2, time: "2025-01-05T08:00", status: "COMPLETED", message: "Thành công" },
    ],
  },
  {
    id: 102,
    walletId: "wallet-travel",
    walletName: "Ví du lịch",
    categoryName: "Tiền lãi",
    transactionType: "income",
    amount: 1000000,
    currency: "VND",
    scheduleType: "DAILY",
    scheduleTypeLabel: SCHEDULE_TYPE_LABELS.DAILY,
    status: "FAILED",
    firstRun: "2025-02-01T09:00",
    nextRun: "2025-02-22T09:00",
    endDate: null,
    successRuns: 3,
    totalRuns: 5,
    warning: "Không đủ số dư ở lần gần nhất",
    logs: [
      { id: 3, time: "2025-02-10T09:00", status: "FAILED", message: "Không đủ số dư ví du lịch" },
      { id: 4, time: "2025-02-09T09:00", status: "COMPLETED", message: "Thành công" },
    ],
  },
];