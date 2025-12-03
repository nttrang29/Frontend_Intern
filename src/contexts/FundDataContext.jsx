import React, { createContext, useContext, useState, useEffect } from "react";

const FundDataContext = createContext(null);

// ===================== MOCK DATA =====================
const MOCK_FUNDS = [
  {
    fundId: 1,
    fundName: "Quỹ mua xe máy Honda",
    fundType: "PERSONAL",
    hasDeadline: true,
    targetAmount: 50000000, // 50M VND
    currentAmount: 15000000, // Đã có 15M (30%)
    currencyCode: "VND",
    frequency: "MONTHLY",
    amountPerPeriod: 5000000, // 5M/tháng → 10 tháng đủ
    startDate: "2024-11-01",
    endDate: "2025-08-31", // 10 tháng
    note: "Tiết kiệm mua xe SH 150i để đi làm",
    status: "ACTIVE",
    sourceWalletId: 1,
    sourceWalletName: "Ví Momo",
    targetWalletId: 101,
    targetWalletName: "Ví quỹ xe máy",
    ownerId: 1,
    ownerName: "Trí Trần Vinh",
    ownerEmail: "tri@example.com",
    reminderEnabled: true,
    reminderType: "MONTHLY",
    reminderTime: "20:00:00",
    reminderDayOfMonth: 5,
    autoDepositEnabled: true,
    autoDepositType: "CUSTOM_SCHEDULE",
    autoDepositScheduleType: "MONTHLY",
    autoDepositTime: "20:00:00",
    autoDepositDayOfMonth: 5,
    autoDepositAmount: 5000000,
    createdAt: "2024-11-01T10:00:00",
    updatedAt: "2024-12-03T15:30:00",
  },
  {
    fundId: 2,
    fundName: "Quỹ khẩn cấp cá nhân",
    fundType: "PERSONAL",
    hasDeadline: false, // Không có kỳ hạn
    targetAmount: null, // Không có mục tiêu cụ thể
    currentAmount: 12000000, // 12M VND
    currencyCode: "VND",
    frequency: "MONTHLY",
    amountPerPeriod: 3000000, // 3M/tháng
    startDate: "2024-10-01",
    endDate: null,
    note: "Quỹ dự phòng cho các trường hợp khẩn cấp - ốm đau, tai nạn",
    status: "ACTIVE",
    sourceWalletId: 1,
    sourceWalletName: "Ví Momo",
    targetWalletId: 102,
    targetWalletName: "Ví quỹ khẩn cấp",
    ownerId: 1,
    ownerName: "Trí Trần Vinh",
    ownerEmail: "tri@example.com",
    reminderEnabled: true,
    reminderType: "MONTHLY",
    reminderTime: "19:00:00",
    reminderDayOfMonth: 1,
    autoDepositEnabled: false, // Nạp thủ công
    createdAt: "2024-10-01T10:00:00",
    updatedAt: "2024-11-28T14:20:00",
  },
  {
    fundId: 3,
    fundName: "Du lịch Đà Lạt - Tết 2025",
    fundType: "PERSONAL",
    hasDeadline: true,
    targetAmount: 15000000, // 15M VND
    currentAmount: 9000000, // Đã có 9M (60%)
    currencyCode: "VND",
    frequency: "WEEKLY",
    amountPerPeriod: 1000000, // 1M/tuần
    startDate: "2024-10-15",
    endDate: "2025-01-20", // Trước Tết
    note: "Tiết kiệm đi du lịch Đà Lạt cùng gia đình dịp Tết Nguyên Đán",
    status: "ACTIVE",
    sourceWalletId: 1,
    sourceWalletName: "Ví Momo",
    targetWalletId: 103,
    targetWalletName: "Ví quỹ du lịch",
    ownerId: 1,
    ownerName: "Trí Trần Vinh",
    ownerEmail: "tri@example.com",
    reminderEnabled: true,
    reminderType: "WEEKLY",
    reminderTime: "18:00:00",
    reminderDayOfWeek: 6, // Thứ 7
    autoDepositEnabled: true,
    autoDepositType: "FOLLOW_REMINDER",
    autoDepositAmount: 1000000,
    createdAt: "2024-10-15T10:00:00",
    updatedAt: "2024-11-30T09:15:00",
  },
  {
    fundId: 4,
    fundName: "Tiết kiệm USD - Đầu tư dài hạn",
    fundType: "PERSONAL",
    hasDeadline: true,
    targetAmount: 10000, // 10K USD
    currentAmount: 2500, // 2.5K USD (25%)
    currencyCode: "USD",
    frequency: "MONTHLY",
    amountPerPeriod: 500, // 500 USD/tháng
    startDate: "2024-09-01",
    endDate: "2026-02-28", // 18 tháng
    note: "Tiết kiệm USD để đầu tư chứng khoán quốc tế",
    status: "ACTIVE",
    sourceWalletId: 2,
    sourceWalletName: "PayPal Wallet",
    targetWalletId: 104,
    targetWalletName: "USD Savings Fund",
    ownerId: 1,
    ownerName: "Trí Trần Vinh",
    ownerEmail: "tri@example.com",
    reminderEnabled: false,
    autoDepositEnabled: false, // Nạp thủ công
    createdAt: "2024-09-01T10:00:00",
    updatedAt: "2024-11-25T11:45:00",
  },
  {
    fundId: 5,
    fundName: "Mua laptop mới",
    fundType: "PERSONAL",
    hasDeadline: true,
    targetAmount: 30000000, // 30M VND
    currentAmount: 18000000, // 18M (60%)
    currencyCode: "VND",
    frequency: "MONTHLY",
    amountPerPeriod: 6000000, // 6M/tháng
    startDate: "2024-09-01",
    endDate: "2025-01-31", // 5 tháng
    note: "Tiết kiệm mua MacBook Air M3 cho công việc",
    status: "ACTIVE",
    sourceWalletId: 1,
    sourceWalletName: "Ví Momo",
    targetWalletId: 105,
    targetWalletName: "Ví quỹ laptop",
    ownerId: 1,
    ownerName: "Trí Trần Vinh",
    ownerEmail: "tri@example.com",
    reminderEnabled: false,
    autoDepositEnabled: false,
    createdAt: "2024-09-01T10:00:00",
    updatedAt: "2024-11-20T16:00:00",
  }
];

let mockFundsData = [...MOCK_FUNDS];

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
   * Load tất cả quỹ từ MOCK DATA (chỉ quỹ ACTIVE)
   */
  const loadFunds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("FundDataContext: Loading all funds (MOCK)...");
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Filter chỉ lấy quỹ ACTIVE (soft delete - quỹ CLOSED vẫn có trong DB nhưng không hiển thị)
      const activeFunds = mockFundsData.filter(f => f.status === "ACTIVE");
      const normalized = activeFunds.map(normalizeFund);
      
      console.log("FundDataContext: Total funds in DB:", mockFundsData.length);
      console.log("FundDataContext: Active funds:", normalized.length);
      console.log("FundDataContext: Closed funds (hidden):", mockFundsData.length - normalized.length);
      console.log("FundDataContext: Loaded funds:", normalized);
      
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
   * Load quỹ cá nhân (MOCK)
   */
  const loadPersonalFunds = async (hasDeadline = null) => {
    await loadFunds();
  };

  /**
   * Load quỹ nhóm (MOCK)
   */
  const loadGroupFunds = async (hasDeadline = null) => {
    await loadFunds();
  };

  /**
   * Tạo quỹ mới (MOCK)
   */
  const createFund = async (fundData) => {
    try {
      console.log("FundDataContext: Creating fund (MOCK)...", fundData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newFund = {
        fundId: mockFundsData.length + 1,
        fundName: fundData.fundName,
        fundType: fundData.fundType,
        hasDeadline: fundData.hasDeadline,
        targetAmount: fundData.targetAmount || null,
        currentAmount: 0,
        currencyCode: fundData.currencyCode || "VND",
        frequency: fundData.frequency || null,
        amountPerPeriod: fundData.amountPerPeriod || null,
        startDate: fundData.startDate || null,
        endDate: fundData.endDate || null,
        note: fundData.note || "",
        status: "ACTIVE",
        sourceWalletId: fundData.sourceWalletId,
        sourceWalletName: "Ví nguồn mock",
        targetWalletId: 100 + mockFundsData.length + 1,
        targetWalletName: `Ví quỹ ${fundData.fundName}`,
        ownerId: 1,
        ownerName: "Trí Trần Vinh",
        ownerEmail: "tri@example.com",
        reminderEnabled: fundData.reminderEnabled || false,
        reminderType: fundData.reminderType || null,
        reminderTime: fundData.reminderTime || null,
        reminderDayOfWeek: fundData.reminderDayOfWeek || null,
        reminderDayOfMonth: fundData.reminderDayOfMonth || null,
        autoDepositEnabled: fundData.autoDepositEnabled || false,
        autoDepositType: fundData.autoDepositType || null,
        autoDepositScheduleType: fundData.autoDepositScheduleType || null,
        autoDepositTime: fundData.autoDepositTime || null,
        autoDepositDayOfWeek: fundData.autoDepositDayOfWeek || null,
        autoDepositDayOfMonth: fundData.autoDepositDayOfMonth || null,
        autoDepositAmount: fundData.autoDepositAmount || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockFundsData.push(newFund);
      console.log("FundDataContext: Fund created successfully (MOCK):", newFund);
      
      return { success: true, data: newFund };
    } catch (err) {
      console.error("FundDataContext: Error creating fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi tạo quỹ" 
      };
    }
  };

  /**
   * Cập nhật quỹ (MOCK)
   */
  const updateFund = async (fundId, updateData) => {
    try {
      console.log(`FundDataContext: Updating fund ${fundId} (MOCK)...`, updateData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = mockFundsData.findIndex(f => f.fundId === fundId);
      if (index === -1) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      mockFundsData[index] = {
        ...mockFundsData[index],
        fundName: updateData.fundName || mockFundsData[index].fundName,
        note: updateData.note !== undefined ? updateData.note : mockFundsData[index].note,
        targetAmount: updateData.targetAmount !== undefined ? updateData.targetAmount : mockFundsData[index].targetAmount,
        frequency: updateData.frequency !== undefined ? updateData.frequency : mockFundsData[index].frequency,
        amountPerPeriod: updateData.amountPerPeriod !== undefined ? updateData.amountPerPeriod : mockFundsData[index].amountPerPeriod,
        startDate: updateData.startDate !== undefined ? updateData.startDate : mockFundsData[index].startDate,
        endDate: updateData.endDate !== undefined ? updateData.endDate : mockFundsData[index].endDate,
        reminderEnabled: updateData.reminderEnabled !== undefined ? updateData.reminderEnabled : mockFundsData[index].reminderEnabled,
        reminderType: updateData.reminderType !== undefined ? updateData.reminderType : mockFundsData[index].reminderType,
        reminderTime: updateData.reminderTime !== undefined ? updateData.reminderTime : mockFundsData[index].reminderTime,
        reminderDayOfWeek: updateData.reminderDayOfWeek !== undefined ? updateData.reminderDayOfWeek : mockFundsData[index].reminderDayOfWeek,
        reminderDayOfMonth: updateData.reminderDayOfMonth !== undefined ? updateData.reminderDayOfMonth : mockFundsData[index].reminderDayOfMonth,
        autoDepositEnabled: updateData.autoDepositEnabled !== undefined ? updateData.autoDepositEnabled : mockFundsData[index].autoDepositEnabled,
        autoDepositType: updateData.autoDepositType !== undefined ? updateData.autoDepositType : mockFundsData[index].autoDepositType,
        autoDepositScheduleType: updateData.autoDepositScheduleType !== undefined ? updateData.autoDepositScheduleType : mockFundsData[index].autoDepositScheduleType,
        autoDepositTime: updateData.autoDepositTime !== undefined ? updateData.autoDepositTime : mockFundsData[index].autoDepositTime,
        autoDepositDayOfWeek: updateData.autoDepositDayOfWeek !== undefined ? updateData.autoDepositDayOfWeek : mockFundsData[index].autoDepositDayOfWeek,
        autoDepositDayOfMonth: updateData.autoDepositDayOfMonth !== undefined ? updateData.autoDepositDayOfMonth : mockFundsData[index].autoDepositDayOfMonth,
        autoDepositAmount: updateData.autoDepositAmount !== undefined ? updateData.autoDepositAmount : mockFundsData[index].autoDepositAmount,
        updatedAt: new Date().toISOString(),
      };
      
      console.log("FundDataContext: Fund updated successfully (MOCK):", mockFundsData[index]);
      return { success: true, data: mockFundsData[index] };
    } catch (err) {
      console.error("FundDataContext: Error updating fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi cập nhật quỹ" 
      };
    }
  };

  /**
   * Đóng quỹ (MOCK) - Soft delete, giữ lại lịch sử
   */
  const closeFund = async (fundId) => {
    try {
      console.log(`FundDataContext: Closing fund ${fundId} (MOCK - Soft Delete)...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = mockFundsData.findIndex(f => f.fundId === fundId);
      if (index === -1) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      // Soft delete: Set status = CLOSED thay vì xóa
      mockFundsData[index].status = "CLOSED";
      mockFundsData[index].updatedAt = new Date().toISOString();
      mockFundsData[index].closedAt = new Date().toISOString();
      
      console.log("FundDataContext: Fund closed successfully (MOCK - Soft Delete)");
      console.log("FundDataContext: Fund data still exists for history:", mockFundsData[index]);
      
      return { success: true, data: mockFundsData[index] };
    } catch (err) {
      console.error("FundDataContext: Error closing fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi đóng quỹ" 
      };
    }
  };

  /**
   * Xóa quỹ (MOCK)
   */
  const deleteFund = async (fundId) => {
    try {
      console.log(`FundDataContext: Deleting fund ${fundId} (MOCK)...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = mockFundsData.findIndex(f => f.fundId === fundId);
      if (index === -1) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      mockFundsData.splice(index, 1);
      
      console.log("FundDataContext: Fund deleted successfully (MOCK)");
      return { success: true, data: { message: "Xóa quỹ thành công" } };
    } catch (err) {
      console.error("FundDataContext: Error deleting fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi xóa quỹ" 
      };
    }
  };

  /**
   * Nạp tiền vào quỹ (MOCK)
   */
  const depositToFund = async (fundId, amount) => {
    try {
      console.log(`FundDataContext: Depositing ${amount} to fund ${fundId} (MOCK)...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = mockFundsData.findIndex(f => f.fundId === fundId);
      if (index === -1) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      mockFundsData[index].currentAmount += Number(amount);
      mockFundsData[index].updatedAt = new Date().toISOString();
      
      console.log("FundDataContext: Deposit successful (MOCK):", mockFundsData[index]);
      return { success: true, data: mockFundsData[index] };
    } catch (err) {
      console.error("FundDataContext: Error depositing to fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi nạp tiền vào quỹ" 
      };
    }
  };

  /**
   * Rút tiền từ quỹ (MOCK)
   */
  const withdrawFromFund = async (fundId, amount) => {
    try {
      console.log(`FundDataContext: Withdrawing ${amount} from fund ${fundId} (MOCK)...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = mockFundsData.findIndex(f => f.fundId === fundId);
      if (index === -1) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      if (mockFundsData[index].currentAmount < Number(amount)) {
        return { success: false, error: "Số dư không đủ để rút" };
      }
      
      mockFundsData[index].currentAmount -= Number(amount);
      mockFundsData[index].updatedAt = new Date().toISOString();
      
      console.log("FundDataContext: Withdrawal successful (MOCK):", mockFundsData[index]);
      return { success: true, data: mockFundsData[index] };
    } catch (err) {
      console.error("FundDataContext: Error withdrawing from fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi rút tiền từ quỹ" 
      };
    }
  };

  /**
   * Kiểm tra ví có đang được sử dụng không (MOCK)
   */
  const checkWalletUsed = async (walletId) => {
    try {
      console.log(`FundDataContext: Checking if wallet ${walletId} is used (MOCK)...`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const isUsed = mockFundsData.some(f => 
        f.targetWalletId === walletId || f.sourceWalletId === walletId
      );
      
      console.log("FundDataContext: Wallet check result (MOCK):", { isUsed });
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
   * Lấy chi tiết một quỹ (MOCK)
   */
  const getFundById = async (fundId) => {
    try {
      console.log(`FundDataContext: Getting fund ${fundId} (MOCK)...`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const fund = mockFundsData.find(f => f.fundId === fundId);
      if (!fund) {
        return { success: false, error: "Không tìm thấy quỹ" };
      }
      
      const normalized = normalizeFund(fund);
      console.log("FundDataContext: Got fund (MOCK):", normalized);
      return { success: true, data: normalized };
    } catch (err) {
      console.error("FundDataContext: Error getting fund:", err);
      return { 
        success: false, 
        error: err.message || "Đã xảy ra lỗi khi lấy thông tin quỹ" 
      };
    }
  };

  // Load funds khi component mount (MOCK - không cần check token)
  useEffect(() => {
    loadFunds();
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

