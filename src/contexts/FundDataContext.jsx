import React, { createContext, useContext, useState, useEffect } from "react";
import * as FundService from "../services/fund.service";

const FundDataContext = createContext(null);

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
    current: Number(apiFund.currentAmount ?? apiFund.current ?? 0),
    currentAmount: Number(apiFund.currentAmount ?? apiFund.current ?? 0),
    target: apiFund.targetAmount ?? apiFund.target ?? null,
    targetAmount: apiFund.targetAmount ?? apiFund.target ?? null,
    currency: apiFund.currencyCode || apiFund.currency || "VND",
    frequency: apiFund.frequency || null,
    amountPerPeriod: apiFund.amountPerPeriod || null,
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
    autoDepositAmount: apiFund.autoDepositAmount || null,
    
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

  /**
   * Load tất cả quỹ từ API
   */
  const loadFunds = async () => {
    setLoading(true);
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
      setLoading(false);
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
      console.log("FundDataContext: Fund created successfully:", createdFund);
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizeFund(createdFund) };
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
      
      const result = await FundService.updateFund(fundId, updateData);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể cập nhật quỹ");
      }
      
      const updatedFund = result.data?.fund || result.data;
      console.log("FundDataContext: Fund updated successfully:", updatedFund);
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizeFund(updatedFund) };
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
      
      const result = await FundService.closeFund(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể đóng quỹ");
      }
      
      console.log("FundDataContext: Fund closed successfully");
      
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
      
      const result = await FundService.deleteFund(fundId);
      
      if (!result.response.ok) {
        throw new Error(result.data?.error || "Không thể xóa quỹ");
      }
      
      console.log("FundDataContext: Fund deleted successfully");
      
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
      console.log("FundDataContext: Deposit successful:", updatedFund);
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizeFund(updatedFund) };
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
      console.log("FundDataContext: Withdrawal successful:", updatedFund);
      
      // Reload funds list để cập nhật UI
      await loadFunds();
      
      return { success: true, data: normalizeFund(updatedFund) };
    } catch (err) {
      console.error("FundDataContext: Error withdrawing from fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi rút tiền từ quỹ" 
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

