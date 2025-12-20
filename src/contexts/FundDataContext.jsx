import React, { createContext, useContext, useState, useEffect } from "react";
import * as FundService from "../services/fund.service";
import { useWalletData } from "./WalletDataContext";
import { logActivity } from "../utils/activityLogger";
import { parseAmount, parseAmountNonNegative } from "../utils/parseAmount";

const FundDataContext = createContext(null);

const logFundActivity = (type, message, data = {}) => {
  try {
    logActivity({ type, message, data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.debug("FundDataContext: failed to log activity", error);
  }
};

/**
 * Helper: Normalize fund data từ API
 */
const normalizeFund = (apiFund) => {
  // Normalize type to lowercase for UI consistency
  const fundType = apiFund.fundType || apiFund.type || "PERSONAL";
  const normalizedType = fundType.toLowerCase(); // "personal" or "group"
  
  return {
    id: apiFund.fundId || apiFund.id,
    fundId: apiFund.fundId || apiFund.id,
    name: apiFund.fundName || apiFund.name || "",
    fundName: apiFund.fundName || apiFund.name || "",
    type: normalizedType,
    fundType: normalizedType,
    hasTerm: apiFund.hasDeadline ?? apiFund.hasTerm ?? false,
    hasDeadline: apiFund.hasDeadline ?? apiFund.hasTerm ?? false,
    // Parse số tiền từ API (có thể là string từ BigDecimal) - đảm bảo không mất precision
    current: parseAmountNonNegative(apiFund.currentAmount ?? apiFund.current, 0),
    currentAmount: parseAmountNonNegative(apiFund.currentAmount ?? apiFund.current, 0),
    target: apiFund.targetAmount != null ? parseAmountNonNegative(apiFund.targetAmount ?? apiFund.target, null) : null,
    targetAmount: apiFund.targetAmount != null ? parseAmountNonNegative(apiFund.targetAmount ?? apiFund.target, null) : null,
    currency: apiFund.currencyCode || apiFund.currency || "VND",
    frequency: apiFund.frequency || null,
    amountPerPeriod: apiFund.amountPerPeriod != null ? parseAmountNonNegative(apiFund.amountPerPeriod, null) : null,
    startDate: apiFund.startDate || null,
    endDate: apiFund.endDate || null,
    note: apiFund.note || "",
    status: apiFund.status || "ACTIVE",
    role: apiFund.role || apiFund.memberRole || "owner",
    
    // Thông tin ví
    targetWalletId: apiFund.targetWalletId || apiFund.walletId || null,
    targetWalletName: apiFund.targetWalletName || apiFund.walletName || "",
    sourceWalletId: apiFund.sourceWalletId || null,
    sourceWalletName: apiFund.sourceWalletName || "",
    
    // Chủ quỹ
    ownerId: apiFund.ownerId || apiFund.ownerUserId || null,
    ownerName: apiFund.ownerName || apiFund.ownerFullName || "",
    ownerEmail: apiFund.ownerEmail || "",
    
    // Nhắc nhở
    reminderEnabled: apiFund.reminderEnabled || false,
    reminderType: apiFund.reminderType || null,
    reminderTime: apiFund.reminderTime || null,
    reminderDayOfWeek: apiFund.reminderDayOfWeek || null,
    reminderDayOfMonth: apiFund.reminderDayOfMonth || null,
    reminderMonth: apiFund.reminderMonth || null,
    reminderDay: apiFund.reminderDay || null,
    
    // Tự động nạp tiền
    autoDepositEnabled: apiFund.autoDepositEnabled || false,
    autoDepositType: apiFund.autoDepositType || null,
    autoDepositScheduleType: apiFund.autoDepositScheduleType || null,
    autoDepositTime: apiFund.autoDepositTime || null,
    autoDepositDayOfWeek: apiFund.autoDepositDayOfWeek || null,
    autoDepositDayOfMonth: apiFund.autoDepositDayOfMonth || null,
    autoDepositMonth: apiFund.autoDepositMonth || null,
    autoDepositDay: apiFund.autoDepositDay || null,
    autoDepositAmount: apiFund.autoDepositAmount != null ? parseAmountNonNegative(apiFund.autoDepositAmount, null) : null,
    autoDepositStartAt: apiFund.autoDepositStartAt || null,
    
    // Pending auto topup
    pendingAutoTopupAmount: parseAmountNonNegative(apiFund.pendingAutoTopupAmount, 0),
    pendingAutoTopupAt: apiFund.pendingAutoTopupAt || null,
    
    // Thành viên (cho quỹ nhóm)
    members: apiFund.members || [],
    totalMembers: apiFund.totalMembers || apiFund.membersCount || 0,
    
    // Timestamps
    createdAt: apiFund.createdAt || null,
    updatedAt: apiFund.updatedAt || null,
  };
};

export function FundDataProvider({ children }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Wallet context: dùng để reload số dư ví sau các thao tác ảnh hưởng tới ví
  let loadWalletsSafe = null;
  try {
    // useWalletData chỉ hợp lệ khi FundDataProvider được dùng bên trong WalletDataProvider
    const walletCtx = useWalletData();
    loadWalletsSafe = walletCtx?.loadWallets || null;
  } catch (e) {
    // Nếu chưa có WalletDataProvider bên ngoài thì bỏ qua, tránh crash
    loadWalletsSafe = null;
  }

  /**
   * Load tất cả quỹ từ API
   * @param {boolean} silent - Nếu true, không set loading state (dùng cho background update)
   */
  const loadFunds = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      console.log("FundDataContext: Loading all funds from API...");
      
      const result = await FundService.getAllFunds();
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể tải danh sách quỹ");
      }
      
      const fundsArray = result.data?.funds || result.data || [];
      const normalized = fundsArray.map(normalizeFund);
      
      console.log("FundDataContext: Loaded funds from API:", normalized);
      setFunds(normalized);
    } catch (err) {
      console.error("FundDataContext: Error loading funds:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải quỹ");
      setFunds([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /**
   * Load quỹ cá nhân từ API
   */
  const loadPersonalFunds = async (hasDeadline = null) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("FundDataContext: Loading personal funds from API...");
      
      const result = await FundService.getPersonalFunds(hasDeadline);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể tải danh sách quỹ cá nhân");
      }
      
      const fundsArray = result.data?.funds || result.data || [];
      const normalized = fundsArray.map(normalizeFund);
      
      console.log("FundDataContext: Loaded personal funds from API:", normalized);
      setFunds(normalized);
    } catch (err) {
      console.error("FundDataContext: Error loading personal funds:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải quỹ cá nhân");
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load quỹ nhóm từ API
   */
  const loadGroupFunds = async (hasDeadline = null) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("FundDataContext: Loading group funds from API...");
      
      const result = await FundService.getGroupFunds(hasDeadline);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể tải danh sách quỹ nhóm");
      }
      
      const fundsArray = result.data?.funds || result.data || [];
      const normalized = fundsArray.map(normalizeFund);
      
      console.log("FundDataContext: Loaded group funds from API:", normalized);
      setFunds(normalized);
    } catch (err) {
      console.error("FundDataContext: Error loading group funds:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải quỹ nhóm");
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tạo quỹ mới
   */
  const createFund = async (fundData) => {
    try {
      console.log("FundDataContext: Creating fund via API...", fundData);
      
      const result = await FundService.createFund(fundData);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể tạo quỹ");
      }
      
      const createdFund = result.data?.fund || result.data;
      const normalizedCreated = normalizeFund(createdFund);
      console.log("FundDataContext: Fund created successfully:", createdFund);

      logFundActivity("fund.create", `Tạo quỹ ${normalizedCreated.fundName || normalizedCreated.id || ""}`,
        {
          fundId: normalizedCreated.fundId || normalizedCreated.id,
          fundType: normalizedCreated.fundType,
          targetWalletName: normalizedCreated.targetWalletName,
          currency: normalizedCreated.currency,
          targetAmount: normalizedCreated.targetAmount,
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizedCreated };
    } catch (err) {
      console.error("FundDataContext: Error creating fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi tạo quỹ" 
      };
    }
  };

  /**
   * Cập nhật quỹ
   */
  const updateFund = async (fundId, updateData) => {
    try {
      console.log(`FundDataContext: Updating fund ${fundId} via API...`, updateData);
      const normalizedId = String(fundId);
      const previousFund = funds.find((f) => String(f.id ?? f.fundId) === normalizedId);
      
      const result = await FundService.updateFund(fundId, updateData);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể cập nhật quỹ");
      }
      
      const updatedFund = result.data?.fund || result.data;
      const normalizedUpdated = normalizeFund(updatedFund);
      console.log("FundDataContext: Fund updated successfully:", updatedFund);

      logFundActivity("fund.update", `Chỉnh sửa quỹ ${normalizedUpdated.fundName || normalizedId}`,
        {
          fundId: normalizedUpdated.fundId || normalizedUpdated.id || normalizedId,
          fundType: normalizedUpdated.fundType,
          previousTarget: previousFund?.targetAmount ?? previousFund?.target ?? null,
          newTarget: normalizedUpdated.targetAmount,
          previousNote: previousFund?.note || "",
          note: normalizedUpdated.note || "",
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizedUpdated };
    } catch (err) {
      console.error("FundDataContext: Error updating fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi cập nhật quỹ" 
      };
    }
  };

  /**
   * Đóng quỹ - Soft delete, giữ lại lịch sử
   */
  const closeFund = async (fundId) => {
    try {
      console.log(`FundDataContext: Closing fund ${fundId} via API...`);
      const normalizedId = String(fundId);
      const targetFund = funds.find((f) => String(f.id ?? f.fundId) === normalizedId);
      
      const result = await FundService.closeFund(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể đóng quỹ");
      }
      
      console.log("FundDataContext: Fund closed successfully");
      logFundActivity("fund.close", `Đóng quỹ ${targetFund?.fundName || normalizedId}`,
        {
          fundId: normalizedId,
          fundType: targetFund?.fundType,
          currentAmount: targetFund?.currentAmount,
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error("FundDataContext: Error closing fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi đóng quỹ" 
      };
    }
  };

  /**
   * Xóa quỹ
   */
  const deleteFund = async (fundId) => {
    try {
      console.log(`FundDataContext: Deleting fund ${fundId} via API...`);
      const normalizedId = String(fundId);
      const targetFund = funds.find((f) => String(f.id ?? f.fundId) === normalizedId);
      
      const result = await FundService.deleteFund(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể xóa quỹ");
      }
      
      console.log("FundDataContext: Fund deleted successfully");
      logFundActivity("fund.delete", `Xóa quỹ ${targetFund?.fundName || normalizedId}`,
        {
          fundId: normalizedId,
          fundType: targetFund?.fundType,
          currentAmount: targetFund?.currentAmount,
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error("FundDataContext: Error deleting fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi xóa quỹ" 
      };
    }
  };

  /**
   * Nạp tiền vào quỹ
   */
  const depositToFund = async (fundId, amount) => {
    try {
      console.log(`FundDataContext: Depositing ${amount} to fund ${fundId} via API...`);
      
      const result = await FundService.depositToFund(fundId, amount);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể nạp tiền vào quỹ");
      }
      
      const updatedFund = result.data?.fund || result.data;
      const normalizedUpdated = normalizeFund(updatedFund);
      console.log("FundDataContext: Deposit successful:", updatedFund);

      logFundActivity("fund.deposit", `Nạp ${amount} vào quỹ ${normalizedUpdated.fundName || fundId}`,
        {
          fundId: normalizedUpdated.fundId || normalizedUpdated.id || fundId,
          amount: parseAmountNonNegative(amount, 0),
          currency: normalizedUpdated.currency,
          targetWalletName: normalizedUpdated.targetWalletName,
        }
      );
      
      // Reload funds list để cập nhật UI quỹ
      await loadFunds();

      // Reload wallets để cập nhật số dư ví nguồn/đích sau khi nạp quỹ
      if (typeof loadWalletsSafe === "function") {
        try {
          await loadWalletsSafe();
        } catch (e) {
          console.warn("FundDataContext: loadWallets sau khi nạp quỹ bị lỗi, bỏ qua", e);
        }
      }
      
      return { success: true, data: normalizedUpdated };
    } catch (err) {
      console.error("FundDataContext: Error depositing to fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi nạp tiền vào quỹ" 
      };
    }
  };

  /**
   * Rút tiền từ quỹ
   */
  const withdrawFromFund = async (fundId, amount) => {
    try {
      console.log(`FundDataContext: Withdrawing ${amount} from fund ${fundId} via API...`);
      
      const result = await FundService.withdrawFromFund(fundId, amount);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể rút tiền từ quỹ");
      }
      
      const updatedFund = result.data?.fund || result.data;
      const normalizedUpdated = normalizeFund(updatedFund);
      console.log("FundDataContext: Withdrawal successful:", updatedFund);

      logFundActivity("fund.withdraw", `Rút ${amount} từ quỹ ${normalizedUpdated.fundName || fundId}`,
        {
          fundId: normalizedUpdated.fundId || normalizedUpdated.id || fundId,
          amount: parseAmountNonNegative(amount, 0),
          currency: normalizedUpdated.currency,
          sourceWalletName: normalizedUpdated.sourceWalletName,
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();

      // Reload wallets để cập nhật số dư ví nguồn sau khi rút tiền (quan trọng: cần reload để hiển thị số dư ví đã được cộng)
      if (typeof loadWalletsSafe === "function") {
        try {
          // Reload ngay lập tức
          await loadWalletsSafe();
          console.log("FundDataContext: Reloaded wallets immediately after withdraw");
          
          // Dispatch event để trigger reload wallets ở các component khác
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent('walletUpdated', {
              detail: { 
                walletId: normalizedUpdated.sourceWalletId, 
                action: 'fundWithdraw',
                amount: parseAmountNonNegative(amount, 0)
              }
            }));
            console.log("FundDataContext: Dispatched walletUpdated event after withdraw");
          }
          
          // Reload lại sau delay ngắn để đảm bảo backend đã cập nhật số dư ví
          setTimeout(async () => {
            if (typeof loadWalletsSafe === "function") {
              await loadWalletsSafe();
              console.log("FundDataContext: Reloaded wallets after 500ms delay");
            }
          }, 500);
          
          // Reload lại sau delay dài hơn để chắc chắn
          setTimeout(async () => {
            if (typeof loadWalletsSafe === "function") {
              await loadWalletsSafe();
              console.log("FundDataContext: Reloaded wallets after 1500ms delay");
            }
          }, 1500);
          
          // Reload lại một lần nữa sau delay dài nhất
          setTimeout(async () => {
            if (typeof loadWalletsSafe === "function") {
              await loadWalletsSafe();
              console.log("FundDataContext: Reloaded wallets after 3000ms delay");
            }
          }, 3000);
        } catch (e) {
          console.warn("FundDataContext: loadWallets sau khi rút tiền từ quỹ bị lỗi, bỏ qua", e);
        }
      } else {
        console.warn("FundDataContext: loadWalletsSafe không có sẵn, không thể reload wallets sau khi rút tiền");
      }
      
      return { success: true, data: normalizedUpdated };
    } catch (err) {
      console.error("FundDataContext: Error withdrawing from fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi rút tiền từ quỹ" 
      };
    }
  };

  /**
   * Tất toán quỹ - rút toàn bộ số tiền còn lại về ví nguồn và đóng quỹ
   */
  const settleFund = async (fundId) => {
    try {
      console.log(`FundDataContext: Settling fund ${fundId} via API...`);
      const normalizedId = String(fundId);
      const targetFund = funds.find((f) => String(f.id ?? f.fundId) === normalizedId);
      
      const result = await FundService.settleFund(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể tất toán quỹ");
      }
      
      console.log("FundDataContext: Fund settled successfully");
      logFundActivity("fund.settle", `Tất toán quỹ ${targetFund?.fundName || normalizedId}`,
        {
          fundId: normalizedId,
          fundType: targetFund?.fundType,
          currentAmount: targetFund?.currentAmount,
        }
      );
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error("FundDataContext: Error settling fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi tất toán quỹ"
      };
    }
  };

  /**
   * Kiểm tra ví có đang được sử dụng không
   */
  const checkWalletUsed = async (walletId) => {
    try {
      console.log(`FundDataContext: Checking if wallet ${walletId} is used via API...`);
      
      const result = await FundService.checkWalletUsed(walletId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể kiểm tra ví");
      }
      
      const isUsed = result.data?.isUsed || false;
      console.log("FundDataContext: Wallet check result:", { isUsed });
      return { success: true, isUsed };
    } catch (err) {
      console.error("FundDataContext: Error checking wallet:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi kiểm tra ví" 
      };
    }
  };

  /**
   * Lấy chi tiết một quỹ
   */
  const getFundById = async (fundId) => {
    try {
      console.log(`FundDataContext: Getting fund ${fundId} via API...`);
      
      const result = await FundService.getFundById(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể lấy thông tin quỹ");
      }
      
      const fund = result.data?.fund || result.data;
      const normalized = normalizeFund(fund);
      console.log("FundDataContext: Got fund:", normalized);
      return { success: true, data: normalized };
    } catch (err) {
      console.error("FundDataContext: Error getting fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi lấy thông tin quỹ" 
      };
    }
  };

  // Load funds khi component mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      loadFunds();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    funds,
    loading,
    error,
    loadFunds,
    loadPersonalFunds,
    loadGroupFunds,
    createFund,
    updateFund,
    closeFund,
    deleteFund,
    depositToFund,
    withdrawFromFund,
    settleFund,
    checkWalletUsed,
    getFundById,
  };

  return (
    <FundDataContext.Provider value={value}>
      {children}
    </FundDataContext.Provider>
  );
}

/**
 * Custom hook để sử dụng FundDataContext
 */
export const useFundData = () => {
  const context = useContext(FundDataContext);
  if (!context) {
    throw new Error("useFundData must be used within FundDataProvider");
  }
  return context;
};

export default FundDataContext;

