// src/components/funds/FundDetailView.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useToast } from "../common/Toast/ToastContext";
import { useNotifications } from "../../contexts/NotificationContext";
import ConfirmModal from "../common/Modal/ConfirmModal";
import AutoTopupBlock from "./AutoTopupBlock";
import ReminderBlock from "./ReminderBlock";
import FundInfoTab from "./tabs/FundInfoTab";
import FundEditTab from "./tabs/FundEditTab";
import FundDepositTab from "./tabs/FundDepositTab";
import FundWithdrawTab from "./tabs/FundWithdrawTab";
import FundHistoryTab from "./tabs/FundHistoryTab";
import { formatMoney } from "../../utils/formatMoney";
import { formatVietnamDate, formatVietnamTime } from "../../utils/dateFormat";
import { getFundTransactions, getFundById } from "../../services/fund.service";
import { parseAmount, parseAmountNonNegative } from "../../utils/parseAmount";
import "../../styles/components/funds/FundDetail.css";
import "../../styles/components/funds/FundForms.css";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const PACE_STATUS_LABELS = {
  ahead: "Vượt tiến độ",
  on_track: "Theo kế hoạch",
  behind: "Chậm tiến độ",
  critical: "Nguy cơ trễ hạn",
  unknown: "Chưa xác định",
};

const PACE_STATUS_DEFINITIONS = [
  { key: "ahead", label: "Vượt tiến độ" },
  { key: "on_track", label: "Theo kế hoạch" },
  { key: "behind", label: "Chậm tiến độ" },
  { key: "critical", label: "Nguy cơ" },
];

const buildFormState = (fund) => ({
  name: fund.name || "",
  note: fund.note || "",
  target: fund.target ?? "",
  frequency: fund.frequency || "",
  amountPerPeriod: fund.amountPerPeriod || "",
  startDate: fund.startDate || "",
  endDate: fund.endDate || "",
  reminderEnabled: fund.reminderEnabled || false,
  reminderType: fund.reminderType || "",
  reminderTime: fund.reminderTime ? fund.reminderTime.substring(0, 5) : "",
  reminderDayOfWeek: fund.reminderDayOfWeek || "",
  reminderDayOfMonth: fund.reminderDayOfMonth || "",
  autoDepositEnabled: fund.autoDepositEnabled || false,
  autoDepositType: fund.autoDepositType || "",
  autoDepositAmount: fund.autoDepositAmount || "",
  autoDepositScheduleType: fund.autoDepositScheduleType || "",
  autoDepositTime: fund.autoDepositTime ? fund.autoDepositTime.substring(0, 5) : "",
  autoDepositDayOfWeek: fund.autoDepositDayOfWeek || "",
  autoDepositDayOfMonth: fund.autoDepositDayOfMonth || "",
  autoDepositStartAt: fund.autoDepositStartAt || "",
});

export default function FundDetailView({ fund, onBack, onUpdateFund, defaultTab = "info" }) {
  const { updateFund, depositToFund, withdrawFromFund, deleteFund, closeFund, settleFund } = useFundData();
  const { wallets, loadWallets } = useWalletData();
  const { showToast } = useToast();
  const { notifications } = useNotifications();
  
  const [activeTab, setActiveTab] = useState(defaultTab); // info | edit | deposit | withdraw | history
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [partialWithdrawAmount, setPartialWithdrawAmount] = useState("");
  const [form, setForm] = useState(() => buildFormState(fund));
  const [saving, setSaving] = useState(false);
  const [withdrawProgress, setWithdrawProgress] = useState(0);
  
  // States for currency and wallet selection (chỉ VND)
  const [selectedCurrency] = useState("VND");
  const [selectedSourceWalletId, setSelectedSourceWalletId] = useState(fund.sourceWalletId || "");
  
  // State for auto deposit data (for editing)
  const [autoDepositData, setAutoDepositData] = useState(null);
  
  // State for reminder data (for editing)
  const [reminderData, setReminderData] = useState(null);

  // Fund history
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  
  // Chart tooltip state
  const [chartTooltip, setChartTooltip] = useState({
    show: false,
    x: 0,
    y: 0,
    data: null
  });
  
  // State for delete confirmation modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // State for settle confirmation modal
  const [confirmSettleOpen, setConfirmSettleOpen] = useState(false);
  
  // Filter wallets theo VND
  const filteredWallets = useMemo(() => {
    return wallets.filter(w => (w.currency || "VND") === "VND");
  }, [wallets]);

  // Khi chọn quỹ khác hoặc defaultTab thay đổi
  useEffect(() => {
    setActiveTab(defaultTab);
    setForm(buildFormState(fund));
    setSelectedSourceWalletId(fund.sourceWalletId || "");
  }, [fund.id, defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính toán trạng thái nạp tiền (cho quỹ không tự động)
  const getDepositStatus = () => {
    if (fund.autoDepositEnabled) {
      return { canDeposit: false, status: 'auto_enabled' };
    }
    
    if (!fund.frequency || !fund.startDate) {
      return { canDeposit: true, status: 'anytime' };
    }
    
    const now = new Date();
    const start = new Date(fund.startDate);
    const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    // Tính kỳ hiện tại
    let currentPeriod = 0;
    let daysPerPeriod = 1;
    
    switch (fund.frequency) {
      case 'DAILY':
        currentPeriod = daysSinceStart;
        daysPerPeriod = 1;
        break;
      case 'WEEKLY':
        currentPeriod = Math.floor(daysSinceStart / 7);
        daysPerPeriod = 7;
        break;
      case 'MONTHLY':
        currentPeriod = Math.floor(daysSinceStart / 30);
        daysPerPeriod = 30;
        break;
      default:
        return { canDeposit: true, status: 'anytime' };
    }
    
    // Giả lập số kỳ đã nạp (từ transaction history)
    const depositedPeriods = Math.floor(fund.current / (fund.amountPerPeriod || 1));
    
    if (depositedPeriods < currentPeriod) {
      // Đã quá hạn - cần nạp bù
      return { 
        canDeposit: true, 
        status: 'overdue',
        missedPeriods: currentPeriod - depositedPeriods,
        nextDepositDate: new Date(start.getTime() + depositedPeriods * daysPerPeriod * 24 * 60 * 60 * 1000)
      };
    } else if (depositedPeriods === currentPeriod) {
      // Đúng hạn - có thể nạp
      return { 
        canDeposit: true, 
        status: 'ready',
        period: currentPeriod + 1
      };
    } else {
      // Chưa đến lúc
      const nextDepositDate = new Date(start.getTime() + (depositedPeriods + 1) * daysPerPeriod * 24 * 60 * 60 * 1000);
      return { 
        canDeposit: false, 
        status: 'waiting',
        nextDepositDate
      };
    }
  };
  
  const depositStatus = getDepositStatus();
  
  // Tính toán trạng thái nạp tiền tự động hôm nay (cần tính trước fundPacing)
  const todayAutoDepositStatus = useMemo(() => {
    if (!fund.autoDepositEnabled) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Kiểm tra lịch sử giao dịch hôm nay
    const todayDeposits = historyItems.filter(tx => {
      const txDate = new Date(tx.createdAt || tx.transactionDate || tx.transactionAt);
      const isToday = txDate >= today && txDate <= todayEnd;
      const isAutoDeposit = tx.type === 'AUTO_DEPOSIT' || tx.type === 'AUTO_DEPOSIT_RECOVERY';
      return isToday && isAutoDeposit && tx.status === 'SUCCESS';
    });
    
    // Kiểm tra pending auto topup
    const pendingAmount = parseAmountNonNegative(fund.pendingAutoTopupAmount, 0);
    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
    const sourceWalletBalance = parseAmount(sourceWallet?.balance, 0);
    const autoDepositAmount = parseAmountNonNegative(fund.autoDepositAmount || fund.amountPerPeriod, 0);
    
    if (todayDeposits.length > 0) {
      // Đã nạp hôm nay
      const totalDeposited = todayDeposits.reduce((sum, tx) => sum + parseAmountNonNegative(tx.amount, 0), 0);
      return {
        status: 'deposited',
        message: 'Hôm nay đã nạp',
        amount: totalDeposited,
        time: todayDeposits[0].createdAt || todayDeposits[0].transactionDate
      };
    } else if (pendingAmount > 0 && sourceWalletBalance < pendingAmount) {
      // Đang chờ (không đủ số dư) - chỉ hiển thị khi có pendingAmount và số dư ví < số tiền cần nạp
      const missingAmount = pendingAmount - sourceWalletBalance;
      return {
        status: 'pending',
        message: 'Đang chờ nạp',
        pendingAmount: pendingAmount,
        missingAmount: missingAmount > 0 ? missingAmount : pendingAmount,
        sourceWalletBalance: sourceWalletBalance,
        sourceWalletName: fund.sourceWalletName || 'Ví nguồn'
      };
    } else {
      // Chưa nạp
      return {
        status: 'not_deposited',
        message: 'Chưa nạp hôm nay'
      };
    }
  }, [fund.autoDepositEnabled, fund.pendingAutoTopupAmount, fund.autoDepositAmount, fund.amountPerPeriod, fund.sourceWalletId, fund.sourceWalletName, historyItems, wallets]);

  const progress =
    fund.target && fund.target > 0
      ? Math.min(100, Math.round((fund.current / fund.target) * 100))
      : null;
  const progressValue = progress ?? 0;
  const fundPacing = useMemo(() => {
    const currentAmount = parseAmountNonNegative(fund.current ?? fund.currentAmount, 0);
    const targetAmount = parseAmountNonNegative(fund.target ?? fund.targetAmount, 0);
    const hasTarget = targetAmount > 0;

    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const startDate = parseDate(fund.startDate);
    const endDate = parseDate(fund.endDate);

    // Chuẩn hóa startDate và endDate
    const startDateNormalized = startDate ? (() => {
      const d = new Date(startDate);
      d.setHours(0, 0, 0, 0);
      return d;
    })() : null;
    const endDateNormalized = endDate ? (() => {
      const d = new Date(endDate);
      d.setHours(0, 0, 0, 0);
      return d;
    })() : null;

    let totalDays = null;
    let elapsedDays = null;
    let expectedPct = null;
    let expectedAmount = null;

    // Tính toán expectedPct và expectedAmount dựa trên startDate và endDate
    if (startDate && endDate && endDate.getTime() > startDate.getTime()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Tính tổng số ngày: từ startDate đến endDate (bao gồm cả 2 ngày)
      // Ví dụ: 14 -> 16 = 3 ngày (14, 15, 16)
      const daysDiff = Math.round((endDateNormalized.getTime() - startDateNormalized.getTime()) / MS_PER_DAY);
      totalDays = Math.max(1, daysDiff + 1); // +1 để bao gồm cả ngày bắt đầu và kết thúc
      
      // Tính số ngày đã trôi qua (từ startDate đến hôm nay, bao gồm cả ngày hôm nay)
      // Nếu hôm nay < startDate, thì elapsedDays = 0
      // Nếu hôm nay > endDate, thì elapsedDays = totalDays
      // Nếu hôm nay = startDate, thì elapsedDays = 1 (ngày đầu tiên)
      if (today.getTime() < startDateNormalized.getTime()) {
        // Chưa đến ngày bắt đầu
        elapsedDays = 0;
      } else if (today.getTime() > endDateNormalized.getTime()) {
        // Đã qua ngày kết thúc
        elapsedDays = totalDays;
      } else {
        // Trong khoảng thời gian: tính số ngày từ startDate đến hôm nay (bao gồm cả hôm nay)
        const daysFromStart = Math.round((today.getTime() - startDateNormalized.getTime()) / MS_PER_DAY);
        elapsedDays = Math.max(1, daysFromStart + 1); // +1 để bao gồm cả ngày hôm nay
      }
      
      // Tính phần trăm và số tiền theo kế hoạch
      if (totalDays > 0 && elapsedDays >= 0) {
        const expectedRatio = elapsedDays / totalDays;
        expectedPct = Math.min(100, Math.max(0, expectedRatio * 100));
        if (hasTarget && targetAmount > 0) {
          // Tính expectedAmount từ expectedPct để đảm bảo nhất quán
          expectedAmount = (expectedPct / 100) * targetAmount;
          // Giới hạn tối đa bằng targetAmount
          expectedAmount = Math.min(targetAmount, expectedAmount);
        }
      }
    }

    // Điều chỉnh expectedAmount nếu có pending auto deposit nhưng không đủ số dư
    // Khi đến thời gian nạp tự động nhưng không đủ số dư, số tiền đáng lẽ phải được nạp
    // nên được tính vào expectedAmount để phản ánh đúng tình trạng chậm tiến độ
    if (todayAutoDepositStatus?.status === 'pending' && expectedAmount != null && hasTarget && targetAmount > 0) {
      const pendingAmount = todayAutoDepositStatus.pendingAmount || 0;
      // Điều chỉnh expectedAmount để bao gồm số tiền pending chưa được nạp
      expectedAmount = expectedAmount + pendingAmount;
      // Giới hạn tối đa bằng targetAmount
      expectedAmount = Math.min(targetAmount, expectedAmount);
      // Tính lại expectedPct từ expectedAmount để đảm bảo nhất quán
      expectedPct = Math.min(100, Math.max(0, (expectedAmount / targetAmount) * 100));
    }

    let paceStatus = "unknown";
    const isAutoDeposit = fund.autoDepositEnabled || false;
    
    // Tính toán số lần nạp và số kỳ đã trôi qua (chỉ cho quỹ có thời hạn)
    let depositCount = 0;
    let expectedPeriodCount = 0;
    let hasDepositedInCurrentPeriod = false;
    let isReminderTimePassed = false;
    
    if (startDate && fund.frequency) {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Tính số kỳ đã trôi qua từ startDate
      const daysSinceStart = Math.max(0, Math.floor((today.getTime() - startDateNormalized.getTime()) / MS_PER_DAY));
      
      let daysPerPeriod = 1;
      switch (fund.frequency) {
        case 'DAILY':
          daysPerPeriod = 1;
          break;
        case 'WEEKLY':
          daysPerPeriod = 7;
          break;
        case 'MONTHLY':
          daysPerPeriod = 30;
          break;
      }
      
      expectedPeriodCount = Math.floor(daysSinceStart / daysPerPeriod) + 1; // +1 vì kỳ đầu tiên bắt đầu từ ngày 0
      
      // Đếm số lần nạp từ lịch sử giao dịch
      const depositTransactions = historyItems.filter(tx => {
        const txType = tx.type || '';
        return (txType === 'DEPOSIT' || txType === 'AUTO_DEPOSIT' || txType === 'AUTO_DEPOSIT_RECOVERY') 
          && tx.status === 'SUCCESS';
      });
      depositCount = depositTransactions.length;
      
      // Kiểm tra xem đã nạp trong chu kỳ hiện tại chưa
      if (depositTransactions.length > 0) {
        const latestDeposit = depositTransactions[depositTransactions.length - 1];
        const latestDepositDate = new Date(latestDeposit.createdAt || latestDeposit.transactionDate || latestDeposit.transactionAt);
        latestDepositDate.setHours(0, 0, 0, 0);
        
        // Tính kỳ của lần nạp cuối cùng
        const daysFromStartToDeposit = Math.max(0, Math.floor((latestDepositDate.getTime() - startDateNormalized.getTime()) / MS_PER_DAY));
        const depositPeriod = Math.floor(daysFromStartToDeposit / daysPerPeriod) + 1;
        const currentPeriod = expectedPeriodCount;
        
        // Đã nạp trong chu kỳ hiện tại nếu kỳ của lần nạp cuối cùng bằng kỳ hiện tại
        hasDepositedInCurrentPeriod = depositPeriod === currentPeriod;
      }
      
      // Kiểm tra xem đã đến giờ nhắc nhở chưa (chỉ cho quỹ có reminder)
      if (fund.reminderEnabled && fund.reminderTime) {
        const reminderTimeStr = fund.reminderTime.substring(0, 5); // HH:mm
        const [reminderHour, reminderMinute] = reminderTimeStr.split(':').map(Number);
        const reminderType = fund.reminderType || fund.frequency || 'MONTHLY';
        const currentTime = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (reminderType === 'DAILY') {
          // Kiểm tra giờ nhắc nhở hôm nay
          const reminderTime = new Date();
          reminderTime.setHours(reminderHour, reminderMinute, 0, 0);
          isReminderTimePassed = currentTime >= reminderTime;
        } else if (reminderType === 'WEEKLY') {
          // Kiểm tra xem hôm nay có phải ngày nhắc nhở và đã qua giờ nhắc nhở chưa
          const targetDow = fund.reminderDayOfWeek || 1; // 1=Mon, 7=Sun
          const jsDow = today.getDay(); // 0=Sun..6
          const todayDow1 = ((jsDow + 6) % 7) + 1; // convert to 1=Mon..7=Sun
          if (todayDow1 === targetDow) {
            const reminderTime = new Date();
            reminderTime.setHours(reminderHour, reminderMinute, 0, 0);
            isReminderTimePassed = currentTime >= reminderTime;
          }
        } else if (reminderType === 'MONTHLY') {
          // Kiểm tra xem hôm nay có phải ngày nhắc nhở và đã qua giờ nhắc nhở chưa
          const targetDay = fund.reminderDayOfMonth || 1;
          if (today.getDate() === targetDay) {
            const reminderTime = new Date();
            reminderTime.setHours(reminderHour, reminderMinute, 0, 0);
            isReminderTimePassed = currentTime >= reminderTime;
          }
        }
      }
    }
    
    if (expectedPct == null) {
      if (hasTarget && progressValue >= 100) {
        // Chỉ hiển thị "ahead" nếu là nạp thủ công
        paceStatus = isAutoDeposit ? "on_track" : "ahead";
      }
    } else {
      // Logic mới: 
      // 1. Chỉ đánh dấu "chậm tiến độ" khi đến giờ nhắc nhở mà chưa nạp
      // 2. Khi nạp xong thì là "theo kế hoạch"
      // 3. Khi nạp nhiều hơn tần suất thì là "vượt tiến độ"
      
      if (fund.reminderEnabled && isReminderTimePassed && !hasDepositedInCurrentPeriod) {
        // Đã đến giờ nhắc nhở nhưng chưa nạp -> chậm tiến độ
        paceStatus = "behind";
      } else if (depositCount > expectedPeriodCount) {
        // Nạp nhiều hơn số kỳ đã trôi qua -> vượt tiến độ
        paceStatus = isAutoDeposit ? "on_track" : "ahead";
      } else if (hasDepositedInCurrentPeriod || depositCount === expectedPeriodCount) {
        // Đã nạp đúng hoặc đủ số kỳ -> theo kế hoạch
        paceStatus = "on_track";
      } else {
        // Các trường hợp khác: so sánh theo phần trăm
        const diff = progressValue - expectedPct;
        if (diff >= 7) {
          paceStatus = isAutoDeposit ? "on_track" : "ahead";
        } else if (diff >= -4) {
          paceStatus = "on_track";
        } else {
          paceStatus = "behind";
        }
      }
    }

    // Tính diffPct: chênh lệch giữa thực tế và kế hoạch (làm tròn đến 1 chữ số thập phân)
    const diffPct = expectedPct == null ? null : Math.round((progressValue - expectedPct) * 10) / 10;
    // Tính diffDays: chênh lệch số ngày
    const pctPerDay = totalDays ? 100 / totalDays : null;
    const diffDays = diffPct != null && pctPerDay && pctPerDay > 0 
      ? Math.round((diffPct / pctPerDay) * 10) / 10 
      : null;

    return {
      currentAmount,
      targetAmount,
      expectedPct,
      expectedAmount,
      paceStatus,
      diffPct,
      diffDays,
      shortage: hasTarget ? Math.max(0, targetAmount - currentAmount) : null,
      totalDays,
      elapsedDays,
    };
  }, [fund.current, fund.currentAmount, fund.target, fund.targetAmount, fund.startDate, fund.endDate, fund.autoDepositEnabled, fund.reminderEnabled, fund.reminderTime, fund.reminderType, fund.reminderDayOfWeek, fund.reminderDayOfMonth, fund.frequency, progressValue, todayAutoDepositStatus, historyItems]);

  // Tạo gradient ID dựa trên pace status để thay đổi màu
  const gaugeGradientId = useMemo(() => {
    const identity = fund.id || fund.fundId || fund.code || "fund";
    const status = fundPacing.paceStatus || "unknown";
    return `fundPaceGradient-${identity}-${status}`;
  }, [fund.code, fund.fundId, fund.id, fundPacing.paceStatus]);
  
  // Xác định màu gradient dựa trên pace status
  const gaugeGradientColors = useMemo(() => {
    const status = fundPacing.paceStatus || "unknown";
    switch (status) {
      case "ahead":
        return { start: "#22c55e", end: "#10b981" }; // Xanh lá (vượt tiến độ)
      case "on_track":
        return { start: "#0d6efd", end: "#00c2ff" }; // Xanh dương (theo kế hoạch)
      case "behind":
        return { start: "#f97316", end: "#fb923c" }; // Cam (chậm tiến độ)
      case "critical":
        return { start: "#ef4444", end: "#f87171" }; // Đỏ (nguy cơ)
      default:
        return { start: "#0d6efd", end: "#00c2ff" }; // Mặc định xanh dương
    }
  }, [fundPacing.paceStatus]);

  const paceStatusLabel = PACE_STATUS_LABELS[fundPacing.paceStatus] || PACE_STATUS_LABELS.unknown;
  const paceStatusDescription = useMemo(() => {
    if (fundPacing.diffPct == null) {
      return "Chưa có thời hạn để so sánh với kế hoạch.";
    }
    
    // Làm tròn diffPct để so sánh (tolerance 0.1%)
    const roundedDiff = Math.round(fundPacing.diffPct * 10) / 10;
    
    if (Math.abs(roundedDiff) < 0.1) {
      return "Đang đúng với kế hoạch đề ra.";
    }
    
    const absPct = Math.abs(roundedDiff);
    const absPctFormatted = absPct % 1 === 0 ? Math.round(absPct) : absPct.toFixed(1);
    
    const dayHint = fundPacing.diffDays && Math.abs(fundPacing.diffDays) >= 0.5
      ? ` (~${Math.abs(fundPacing.diffDays).toFixed(1)} ngày ${fundPacing.diffDays > 0 ? "sớm" : "trễ"})`
      : "";
    
    if (roundedDiff > 0) {
      return `Vượt kế hoạch ${absPctFormatted}%${dayHint}.`;
    }
    return `Chậm hơn kế hoạch ${absPctFormatted}%${dayHint}.`;
  }, [fundPacing.diffPct, fundPacing.diffDays]);

  // Làm tròn các giá trị để hiển thị
  const actualPct = Math.max(0, Math.min(progressValue, 100));
  const expectedPctValue = fundPacing.expectedPct != null ? Math.max(0, Math.min(fundPacing.expectedPct, 100)) : null;
  const gaugeRadius = 105;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const actualOffset = gaugeCircumference * (1 - actualPct / 100);
  const expectedOffset = expectedPctValue != null ? gaugeCircumference * (1 - expectedPctValue / 100) : null;
  
  // Format các giá trị tiền tệ - không làm tròn để giữ precision
  const actualAmountLabel = formatMoney(fundPacing.currentAmount, fund.currency);
  const planAmountLabel = fundPacing.expectedAmount != null ? formatMoney(fundPacing.expectedAmount, fund.currency) : "—";
  const shortageLabel = fundPacing.shortage != null ? formatMoney(fundPacing.shortage, fund.currency) : "—";
  
  // Format phần trăm: làm tròn đến 1 chữ số thập phân, nhưng nếu là số nguyên thì hiển thị số nguyên
  const expectedPercentLabel = expectedPctValue != null 
    ? (expectedPctValue % 1 === 0 ? `${Math.round(expectedPctValue)}%` : `${expectedPctValue.toFixed(1)}%`)
    : "--";
  
  // Tính % vượt tiến độ (chỉ hiển thị khi paceStatus là "ahead")
  const aheadPct = fundPacing.paceStatus === "ahead" && fundPacing.diffPct != null && fundPacing.diffPct > 0
    ? (fundPacing.diffPct % 1 === 0 ? `${Math.round(fundPacing.diffPct)}%` : `${fundPacing.diffPct.toFixed(1)}%`)
    : null;
  
  // Format diffPct: làm tròn đến 1 chữ số thập phân
  const diffPercentLabel = fundPacing.diffPct != null 
    ? `${fundPacing.diffPct > 0 ? "+" : ""}${fundPacing.diffPct % 1 === 0 ? Math.round(fundPacing.diffPct) : fundPacing.diffPct.toFixed(1)}%`
    : "--";
  const remainingDaysLabel = (() => {
    if (fundPacing.totalDays == null || fundPacing.elapsedDays == null) return "Chưa có thời hạn";
    const remaining = Math.max(0, fundPacing.totalDays - fundPacing.elapsedDays);
    return remaining === 0 ? "Đến hạn hôm nay" : `${remaining} ngày còn lại`;
  })();

  // Trạng thái quỹ từ backend (ACTIVE, CLOSED, COMPLETED)
  const fundStatus = fund.status || fund.fundStatus || null;
  const isFundActive = !fundStatus || fundStatus === "ACTIVE";
  const isFundCompleted = fundStatus === "COMPLETED" || (progress !== null && progress >= 100);

  // Set số tiền nạp mặc định khi vào tab deposit
  useEffect(() => {
    if (activeTab === 'deposit' && !fund.autoDepositEnabled && fund.amountPerPeriod) {
      if (depositStatus.status === 'ready' || depositStatus.status === 'overdue') {
        const defaultAmount = depositStatus.status === 'overdue' 
          ? fund.amountPerPeriod * depositStatus.missedPeriods
          : fund.amountPerPeriod;
        setDepositAmount(String(defaultAmount));
      }
    }
  }, [activeTab, fund.autoDepositEnabled, fund.amountPerPeriod, depositStatus.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setForm(buildFormState(fund));
    setActiveTab("info");
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Vui lòng nhập tên quỹ.", "error");
      return;
    }

    setSaving(true);

    try {
      // Validation
      if (!selectedCurrency) {
        showToast("Vui lòng chọn loại tiền tệ.", "error");
        setSaving(false);
        return;
      }
      if (!selectedSourceWalletId) {
        showToast("Vui lòng chọn ví nguồn.", "error");
        setSaving(false);
        return;
      }


      const updateData = {
        fundName: form.name.trim(),
        currencyCode: selectedCurrency,
        sourceWalletId: Number(selectedSourceWalletId),
        note: form.note.trim() || null,
        frequency: form.frequency || null,
        amountPerPeriod: form.amountPerPeriod ? parseAmountNonNegative(form.amountPerPeriod, null) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      // Thêm target nếu có kỳ hạn
      if (fund.hasTerm && form.target) {
        updateData.targetAmount = parseAmountNonNegative(form.target, null);
      }

      // Giữ nguyên chế độ nạp tiền ban đầu (không cho thay đổi khi sửa)
      if (fund.autoDepositEnabled) {
        updateData.reminderEnabled = false;
        updateData.autoDepositEnabled = true;
        // Cập nhật thông tin auto deposit từ form (cho phép sửa thời gian)
        if (autoDepositData) {
          updateData.autoDepositTime = autoDepositData.autoDepositTime || fund.autoDepositTime;
          updateData.autoDepositDayOfWeek = autoDepositData.autoDepositDayOfWeek || fund.autoDepositDayOfWeek;
          updateData.autoDepositDayOfMonth = autoDepositData.autoDepositDayOfMonth || fund.autoDepositDayOfMonth;
          updateData.autoDepositStartAt = autoDepositData.autoDepositStartAt || fund.autoDepositStartAt;
        } else {
          // Giữ nguyên nếu chưa có thay đổi
          updateData.autoDepositTime = fund.autoDepositTime;
          updateData.autoDepositDayOfWeek = fund.autoDepositDayOfWeek;
          updateData.autoDepositDayOfMonth = fund.autoDepositDayOfMonth;
          updateData.autoDepositStartAt = fund.autoDepositStartAt;
        }
        // Giữ nguyên các thông tin khác
        updateData.autoDepositType = fund.autoDepositType;
        updateData.autoDepositAmount = fund.autoDepositAmount;
        updateData.autoDepositScheduleType = fund.autoDepositScheduleType || fund.autoDepositType;
      } else {
        updateData.reminderEnabled = true;
        updateData.autoDepositEnabled = false;
        // Cập nhật thông tin reminder từ form (cho phép sửa thời gian)
        if (reminderData) {
          updateData.reminderType = reminderData.reminderType || fund.reminderType;
          updateData.reminderTime = reminderData.reminderTime || fund.reminderTime;
          updateData.reminderDayOfWeek = reminderData.reminderDayOfWeek || fund.reminderDayOfWeek;
          updateData.reminderDayOfMonth = reminderData.reminderDayOfMonth || fund.reminderDayOfMonth;
        } else {
          // Giữ nguyên nếu chưa có thay đổi
          updateData.reminderType = fund.reminderType;
          updateData.reminderTime = fund.reminderTime;
          updateData.reminderDayOfWeek = fund.reminderDayOfWeek;
          updateData.reminderDayOfMonth = fund.reminderDayOfMonth;
        }
      }

      console.log("Updating fund:", fund.id, updateData);

      // Gọi API update
      const result = await updateFund(fund.id, updateData);

      if (result.success) {
        showToast("Cập nhật quỹ thành công!", "success");
        // Callback để reload fund list
        if (onUpdateFund) {
          await onUpdateFund();
        }
        setActiveTab("info");
      } else {
        showToast(`Không thể cập nhật quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error updating fund:", error);
      showToast("Đã xảy ra lỗi khi cập nhật quỹ.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Load fund transaction history function
  const loadHistory = useCallback(async () => {
    if (!fund.id) return;
    
    setHistoryLoading(true);
    setHistoryError(null);
    
    try {
      const result = await getFundTransactions(fund.id, 50);
      if (result.response.ok && result.data) {
        const transactions = Array.isArray(result.data) ? result.data : (result.data.transactions || []);
        setHistoryItems(transactions);
      } else {
        setHistoryError("Không thể tải lịch sử giao dịch");
        setHistoryItems([]);
      }
    } catch (error) {
      console.error("Error loading fund history:", error);
      setHistoryError("Lỗi khi tải lịch sử giao dịch");
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [fund.id]);

  // Load fund transaction history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Transaction history for chart (from historyItems) - bao gồm cả DEPOSIT và WITHDRAW
  const transactionHistory = useMemo(() => {
    if (!historyItems || historyItems.length === 0) return [];
    
    // Sort by date descending, then map to chart format
    return historyItems
      .filter(tx => tx.status === 'SUCCESS' && (
        tx.type === 'DEPOSIT' || 
        tx.type === 'AUTO_DEPOSIT' || 
        tx.type === 'AUTO_DEPOSIT_RECOVERY' ||
        tx.type === 'WITHDRAW'
      ))
      .sort((a, b) => new Date(b.createdAt || b.transactionDate) - new Date(a.createdAt || a.transactionDate))
      .map(tx => ({
        date: tx.createdAt || tx.transactionDate,
        amount: tx.type === 'WITHDRAW' 
          ? -parseAmountNonNegative(tx.amount, 0) // Rút tiền là số âm
          : parseAmountNonNegative(tx.amount, 0), // Nạp tiền là số dương
        type: tx.type
      }));
  }, [historyItems]);

  // Growth chart data for no-term funds (cumulative growth) - tính cả nạp và rút
  const growthChartData = useMemo(() => {
    if (fund.hasTerm) return null; // Chỉ dùng cho quỹ không thời hạn
    
    if (!transactionHistory || transactionHistory.length === 0) {
      return { points: [], cumulative: 0, max: 0 };
    }
    
    // Sort by date ascending để tính tích lũy
    const sorted = [...transactionHistory].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    let cumulative = 0;
    const points = sorted.map((tx, idx) => {
      cumulative += tx.amount; // amount có thể âm (rút) hoặc dương (nạp)
      return {
        date: tx.date,
        amount: tx.amount,
        cumulative: Math.max(0, cumulative), // Đảm bảo không âm
        index: idx,
        type: tx.type
      };
    });
    
    const maxCumulative = Math.max(...points.map(p => p.cumulative), 1);
    const minCumulative = Math.min(...points.map(p => p.cumulative), 0);
    
    // Tính tổng đã rút
    const totalWithdrawn = points
      .filter(p => p.type === 'WITHDRAW')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);
    
    // Tính tổng đã nạp
    const totalDeposited = points
      .filter(p => p.type !== 'WITHDRAW')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      points: points,
      cumulative: cumulative,
      max: maxCumulative,
      min: minCumulative,
      totalTransactions: points.filter(p => p.type !== 'WITHDRAW').length, // Chỉ đếm nạp tiền
      totalWithdrawals: points.filter(p => p.type === 'WITHDRAW').length,
      totalWithdrawn: totalWithdrawn,
      totalDeposited: totalDeposited
    };
  }, [transactionHistory, fund.hasTerm]);

  // Sparkline data (lấy tối đa 10 giao dịch nạp gần nhất)
  const sparkline = useMemo(() => {
    if (!transactionHistory || transactionHistory.length === 0) {
      return { points: "", max: 0, lastAmount: 0 };
    }
    const slice = transactionHistory.slice(0, 10).reverse(); // mới nhất lên cuối để vẽ trái->phải
    const maxVal = Math.max(...slice.map((p) => p.amount), 1);
    const pts = slice.map((p, idx) => {
      const x = (idx / Math.max(slice.length - 1, 1)) * 100;
      const y = 70 - (p.amount / maxVal) * 60; // padding 10px top/bot
      return `${x},${y}`;
    });
    return {
      points: pts.join(" "),
      max: maxVal,
      lastAmount: slice[slice.length - 1]?.amount || 0,
    };
  }, [transactionHistory]);

  // Bar chart data (tối đa 12 giao dịch gần nhất)
  const barChart = useMemo(() => {
    if (!transactionHistory || transactionHistory.length === 0) {
      return { bars: [], max: 0 };
    }
    const slice = transactionHistory.slice(0, 12).reverse(); // trái->phải
    const maxVal = Math.max(...slice.map((p) => p.amount), 1);
    const bars = slice.map((p, idx) => ({
      key: `${p.date || idx}`,
      height: Math.max(8, Math.round((p.amount / maxVal) * 100)),
      label: idx % 2 === 0 ? `${idx + 1}` : "",
      amount: p.amount,
    }));
    return { bars, max: maxVal };
  }, [transactionHistory]);

  // Thống kê giao dịch
  const txStats = useMemo(() => {
    const total = historyItems.length;
    const success = historyItems.filter((tx) => tx.status === "SUCCESS").length;
    const auto = historyItems.filter(
      (tx) => tx.status === "SUCCESS" && (tx.type === "AUTO_DEPOSIT" || tx.type === "AUTO_DEPOSIT_RECOVERY")
    ).length;
    const manual = historyItems.filter(
      (tx) => tx.status === "SUCCESS" && (tx.type === "DEPOSIT" || tx.type === "MANUAL_DEPOSIT")
    ).length;
    return {
      total,
      success,
      auto,
      manual,
      autoPct: total ? Math.round((auto / total) * 100) : 0,
      manualPct: total ? Math.round((manual / total) * 100) : 0,
    };
  }, [historyItems]);

  const maxAmount = Math.max(fund.target || 0, fund.current || 1);
  
  // Tính toán trạng thái nạp tiền thủ công hôm nay
  const todayManualDepositStatus = useMemo(() => {
    if (fund.autoDepositEnabled) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Kiểm tra lịch sử giao dịch hôm nay (manual deposit)
    const todayDeposits = historyItems.filter(tx => {
      const txDate = new Date(tx.createdAt || tx.transactionDate || tx.transactionAt);
      const isToday = txDate >= today && txDate <= todayEnd;
      const isManualDeposit = tx.type === 'DEPOSIT' || tx.type === 'MANUAL_DEPOSIT';
      return isToday && isManualDeposit && tx.status === 'SUCCESS';
    });
    
    if (todayDeposits.length > 0) {
      // Đã nạp hôm nay
      const totalDeposited = todayDeposits.reduce((sum, tx) => sum + parseAmountNonNegative(tx.amount, 0), 0);
      return {
        status: 'deposited',
        message: 'Hôm nay đã nạp',
        amount: totalDeposited,
        time: todayDeposits[0].createdAt || todayDeposits[0].transactionDate
      };
    } else {
      // Chưa nạp hôm nay
      return {
        status: 'not_deposited',
        message: 'Chưa nạp hôm nay'
      };
    }
  }, [fund.autoDepositEnabled, historyItems]);

  const hasTodayAutoDeposit = todayAutoDepositStatus?.status === 'deposited';

  const nextAutoDepositDate = useMemo(() => {
    if (!fund.autoDepositEnabled) return null;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    const frequency = fund.frequency || fund.autoDepositScheduleType || 'MONTHLY';

    if (frequency === 'DAILY') {
      // Luôn áp dụng cho ngày tiếp theo nếu đã nạp hôm nay
      return addDays(today, hasTodayAutoDeposit ? 1 : 0);
    }

    if (frequency === 'WEEKLY') {
      const targetDow = fund.autoDepositDayOfWeek || 1; // 1=Mon, 7=Sun (backend)
      const jsDow = today.getDay(); // 0=Sun..6
      const todayDow1 = ((jsDow + 6) % 7) + 1; // convert to 1=Mon..7=Sun
      let diff = (targetDow - todayDow1 + 7) % 7;
      if (diff === 0) {
        diff = hasTodayAutoDeposit ? 7 : 0;
      }
      return addDays(today, diff);
    }

    // MONTHLY (default)
    const targetDay = fund.autoDepositDayOfMonth || 1;
    const candidate = new Date(today.getFullYear(), today.getMonth(), targetDay, now.getHours(), now.getMinutes(), 0, 0);
    if (candidate < now || hasTodayAutoDeposit) {
      // sang tháng sau
      return new Date(today.getFullYear(), today.getMonth() + 1, targetDay, now.getHours(), now.getMinutes(), 0, 0);
    }
    return candidate;
  }, [fund.autoDepositEnabled, fund.frequency, fund.autoDepositDayOfWeek, fund.autoDepositDayOfMonth, fund.autoDepositScheduleType, hasTodayAutoDeposit]);
  
  // Kiểm tra xem đã có reminder notification trong chu kỳ hiện tại chưa
  const hasTodayReminder = useMemo(() => {
    if (!fund.reminderEnabled || !fund.fundId) return false;
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tìm notification reminder cho quỹ này
    const reminderNotifications = notifications.filter(n => 
      n.type === 'fund_reminder' && n.fundId === fund.fundId
    );
    
    if (reminderNotifications.length === 0) return false;
    
    // Tìm notification mới nhất
    const latestReminder = reminderNotifications.reduce((latest, current) => {
      const latestDate = new Date(latest.createdAt);
      const currentDate = new Date(current.createdAt);
      return currentDate > latestDate ? current : latest;
    });
    
    const reminderDate = new Date(latestReminder.createdAt);
    const reminderType = fund.reminderType || fund.frequency || 'MONTHLY';
    
    if (reminderType === 'DAILY') {
      // Kiểm tra xem có notification trong ngày hôm nay không
      return reminderDate >= today;
    }
    
    if (reminderType === 'WEEKLY') {
      // Kiểm tra xem có notification trong tuần này không
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Thứ 2 đầu tuần
      startOfWeek.setHours(0, 0, 0, 0);
      return reminderDate >= startOfWeek;
    }
    
    // MONTHLY
    // Kiểm tra xem có notification trong tháng này không
    return reminderDate.getFullYear() === now.getFullYear() && 
           reminderDate.getMonth() === now.getMonth();
  }, [fund.reminderEnabled, fund.fundId, fund.reminderType, fund.frequency, notifications]);
  
  // Tính toán ngày nhắc nhở tiếp theo
  const nextReminderDate = useMemo(() => {
    if (!fund.reminderEnabled) return null;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    const reminderType = fund.reminderType || fund.frequency || 'MONTHLY';

    if (reminderType === 'DAILY') {
      return addDays(today, hasTodayReminder ? 1 : 0);
    }

    if (reminderType === 'WEEKLY') {
      const targetDow = fund.reminderDayOfWeek || 1; // 1=Mon, 7=Sun (backend)
      const jsDow = today.getDay(); // 0=Sun..6
      const todayDow1 = ((jsDow + 6) % 7) + 1; // convert to 1=Mon..7=Sun
      let diff = (targetDow - todayDow1 + 7) % 7;
      if (diff === 0) {
        diff = hasTodayReminder ? 7 : 0;
      }
      return addDays(today, diff);
    }

    // MONTHLY (default)
    const targetDay = fund.reminderDayOfMonth || 1;
    const candidate = new Date(today.getFullYear(), today.getMonth(), targetDay, now.getHours(), now.getMinutes(), 0, 0);
    if (candidate < now || hasTodayReminder) {
      // sang tháng sau
      return new Date(today.getFullYear(), today.getMonth() + 1, targetDay, now.getHours(), now.getMinutes(), 0, 0);
    }
    return candidate;
  }, [fund.reminderEnabled, fund.reminderType, fund.frequency, fund.reminderDayOfWeek, fund.reminderDayOfMonth, hasTodayReminder]);
  
  // Map historyItems to display format - phân biệt DEPOSIT và WITHDRAW
  const displayHistory = useMemo(() => {
    return historyItems.map(tx => {
      const isSuccess = tx.status === 'SUCCESS';
      const txType = tx.type || 'DEPOSIT';
      const isWithdraw = txType === 'WITHDRAW';
      const isAuto = txType === 'AUTO_DEPOSIT' || txType === 'AUTO_DEPOSIT_RECOVERY';
      const isRecovery = txType === 'AUTO_DEPOSIT_RECOVERY';
      
      return {
        id: tx.id || tx.transactionId,
        type: isWithdraw ? 'withdraw' : (isAuto ? 'auto' : 'manual'),
        typeLabel: isWithdraw 
          ? 'Rút tiền' 
          : (isRecovery ? 'Nạp bù tự động' : (isAuto ? 'Nạp tự động' : 'Nạp thủ công')),
        amount: parseAmountNonNegative(tx.amount, 0),
        status: isSuccess ? 'success' : 'failed',
        date: tx.createdAt || tx.transactionDate || tx.transactionAt,
        message: tx.message || (
          isWithdraw 
            ? 'Rút tiền khỏi quỹ' 
            : (isRecovery ? 'Nạp bù tự động thành công' : (isAuto ? 'Nạp tự động thành công' : 'Nạp tiền thành công'))
        ),
        walletBalance: tx.walletBalance,
        isWithdraw: isWithdraw
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [historyItems]);

  // Tính toán trạng thái nạp: đã nạp đủ cho chu kỳ hiện tại chưa
  const depositStatusInfo = useMemo(() => {
    if (!fund.frequency || !fund.startDate) {
      return { hasEnoughForCurrentPeriod: false, extraDepositCount: 0 };
    }
    
    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    
    const startDate = parseDate(fund.startDate);
    if (!startDate) {
      return { hasEnoughForCurrentPeriod: false, extraDepositCount: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    
    const daysSinceStart = Math.max(0, Math.floor((today.getTime() - startDateNormalized.getTime()) / MS_PER_DAY));
    
    let daysPerPeriod = 1;
    switch (fund.frequency) {
      case 'DAILY':
        daysPerPeriod = 1;
        break;
      case 'WEEKLY':
        daysPerPeriod = 7;
        break;
      case 'MONTHLY':
        daysPerPeriod = 30;
        break;
    }
    
    const expectedPeriodCount = Math.floor(daysSinceStart / daysPerPeriod) + 1;
    
    // Đếm số lần nạp từ lịch sử giao dịch
    const depositTransactions = historyItems.filter(tx => {
      const txType = tx.type || '';
      return (txType === 'DEPOSIT' || txType === 'AUTO_DEPOSIT' || txType === 'AUTO_DEPOSIT_RECOVERY') 
        && tx.status === 'SUCCESS';
    });
    const depositCount = depositTransactions.length;
    
    const hasEnoughForCurrentPeriod = depositCount >= expectedPeriodCount;
    const extraDepositCount = Math.max(0, depositCount - expectedPeriodCount);
    
    return {
      hasEnoughForCurrentPeriod,
      extraDepositCount,
      expectedPeriodCount,
      depositCount
    };
  }, [fund.frequency, fund.startDate, historyItems]);

  const handleDeposit = async (e) => {
    e.preventDefault();

    // Chặn nạp nếu quỹ không còn ACTIVE (đã đóng hoặc hoàn thành)
    if (!isFundActive) {
      showToast("Quỹ đã đóng hoặc hoàn thành mục tiêu, không thể nạp thêm.", "error");
      return;
    }
    const amount = parseAmountNonNegative(depositAmount, 0);
    
    // Validation cơ bản
    if (!amount || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ.", "error");
      return;
    }

    if (amount < 1000) {
      showToast("Số tiền nạp tối thiểu là 1,000.", "error");
      return;
    }

    // Logic mới: Nếu đã nạp đủ cho chu kỳ hiện tại
    if (depositStatusInfo.hasEnoughForCurrentPeriod) {
      // Lần nạp thêm đầu tiên: phải >= amountPerPeriod
      if (depositStatusInfo.extraDepositCount === 0 && fund.amountPerPeriod && amount < fund.amountPerPeriod) {
        showToast(
          `Lần nạp thêm đầu tiên phải lớn hơn hoặc bằng số tiền theo tần suất: ${formatMoney(fund.amountPerPeriod, fund.currency)}.`,
          "error"
        );
        return;
      }
      // Các lần nạp thêm sau: nạp bao nhiêu cũng được (không cần validation)
    } else {
      // Chưa nạp đủ cho chu kỳ hiện tại: phải >= amountPerPeriod
      if (fund.amountPerPeriod && amount < fund.amountPerPeriod) {
        showToast(
          `Số tiền nạp phải lớn hơn hoặc bằng số tiền theo tần suất: ${formatMoney(fund.amountPerPeriod, fund.currency)}.`,
          "error"
        );
        return;
      }
    }

    // Kiểm tra số dư ví nguồn
    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
    if (!sourceWallet) {
      showToast("Không tìm thấy ví nguồn.", "error");
      return;
    }

    if (amount > sourceWallet.balance) {
      showToast(
        `Số dư ví nguồn không đủ! Số dư hiện tại: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`,
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      console.log("Depositing to fund:", fund.id, amount);
      const result = await depositToFund(fund.id, amount);

      if (result.success) {
        showToast(`Nạp ${formatMoney(amount, fund.currency)} vào quỹ thành công!`, "success");

        // Nếu backend trả về quỹ đã COMPLETED sau nạp, hiển thị thông báo đóng băng
        const updatedFund = result.data || fund;
        const updatedStatus = updatedFund.status || updatedFund.fundStatus || null;
        const updatedProgress =
          updatedFund.target && updatedFund.target > 0
            ? Math.min(100, Math.round((updatedFund.current / updatedFund.target) * 100))
            : null;

        if (
          updatedStatus === "COMPLETED" ||
          (updatedFund.hasTerm && updatedFund.target && updatedProgress !== null && updatedProgress >= 100)
        ) {
          showToast(
            "Quỹ đã hoàn thành mục tiêu. Quỹ sẽ được đóng băng và không thể nạp thêm.",
            "info"
          );
        }
        setDepositAmount("");
        setActiveTab("info");
        // Reload history after successful deposit
        await loadHistory();
        // Callback để reload
        if (onUpdateFund) {
          await onUpdateFund();
        }
      } else {
        showToast(`Không thể nạp tiền: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error depositing to fund:", error);
      showToast("Đã xảy ra lỗi khi nạp tiền.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    // Quỹ có thời hạn: luôn rút toàn bộ
    // Quỹ không thời hạn: rút theo số tiền nhập vào
    let amount;
    if (fund.hasTerm) {
      // Quỹ có thời hạn: rút toàn bộ
      amount = fund.current;
    } else {
      // Quỹ không thời hạn: lấy số tiền từ input
      const withdrawValue = partialWithdrawAmount.trim() || String(fund.current);
      amount = parseAmountNonNegative(withdrawValue, 0);
    }
    
    // Validation cho quỹ không thời hạn: có thể rút bất kỳ số tiền nào nhưng không được quá số dư quỹ
    if (!fund.hasTerm) {
      if (!amount || amount <= 0) {
        showToast("Vui lòng nhập số tiền hợp lệ.", "error");
        return;
      }

      if (amount > fund.current) {
        showToast(`Số tiền rút không được vượt quá số dư quỹ: ${formatMoney(fund.current, fund.currency)}`, "error");
        return;
      }
      // Bỏ validation tối thiểu 1,000 - có thể rút bất kỳ số tiền nào
    }

    setSaving(true);
    setWithdrawProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setWithdrawProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until actual completion
        }
        return prev + 10;
      });
    }, 200);

    try {
      console.log("Withdrawing ALL from fund:", fund.id, amount);
      
      // Rút toàn bộ tiền
      const result = await withdrawFromFund(fund.id, amount);

      // Complete progress
      clearInterval(progressInterval);
      setWithdrawProgress(100);

      if (result.success) {
        const isFullWithdraw = amount >= fund.current;
        
        // Bỏ thông báo thành công cho quỹ không thời hạn
        if (fund.hasTerm) {
          // Chỉ hiển thị thông báo cho quỹ có thời hạn
          showToast(
            isFullWithdraw 
              ? `🎉 Hoàn thành quỹ! Rút toàn bộ ${formatMoney(amount, fund.currency)} về ví nguồn thành công!`
              : `✅ Rút ${formatMoney(amount, fund.currency)} về ví nguồn thành công!`,
            "success"
          );
        }
        
        // Reload history after successful withdraw
        await loadHistory();
        
        // Reload wallets so UI shows updated balances
        try {
          if (loadWallets) await loadWallets();
        } catch (e) {
          console.warn('Unable to reload wallets after withdraw', e);
        }
        // Let parent refresh funds list if provided
        if (onUpdateFund) await onUpdateFund();

        // Kiểm tra số dư sau khi rút để quyết định có xóa quỹ không
        const updatedFundResult = await getFundById(fund.id);
        const updatedFund = updatedFundResult?.response?.ok ? updatedFundResult.data?.fund || updatedFundResult.data : null;
        const remainingBalance = updatedFund?.currentAmount || updatedFund?.current || 0;
        const shouldDeleteFund = isFullWithdraw && remainingBalance === 0;

        // Xóa quỹ nếu rút hết (cho cả quỹ có thời hạn và không thời hạn)
        if (shouldDeleteFund) {
          await deleteFund(fund.id);
        }

        // Reset form
        setPartialWithdrawAmount("");

        // Quỹ có thời hạn: quay về danh sách sau khi rút
        if (fund.hasTerm) {
          setTimeout(() => {
            if (onBack) {
              onBack();
            }
          }, 1000);
        } else {
          // Quỹ không thời hạn: nếu rút hết (số dư = 0), xóa quỹ và quay về danh sách
          if (shouldDeleteFund) {
            setTimeout(() => {
              if (onBack) {
                onBack();
              }
            }, 1000);
          } else {
            // Nếu còn số dư, reload fund data để cập nhật số dư
            if (onUpdateFund) await onUpdateFund();
          }
        }
      } else {
        showToast(`Không thể rút tiền: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error withdrawing from fund:", error);
      showToast("Đã xảy ra lỗi khi rút tiền.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = () => {
    if (!fund.current || fund.current <= 0) {
      showToast("Quỹ không có số dư để tất toán.", "error");
      return;
    }
    
    // Mở modal xác nhận
    setConfirmSettleOpen(true);
  };

  const confirmSettle = async () => {
    setConfirmSettleOpen(false);
    
    if (!fund.current || fund.current <= 0) {
      showToast("Quỹ không có số dư để tất toán.", "error");
      return;
    }

    setSaving(true);
    setWithdrawProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setWithdrawProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      console.log("Settling fund:", fund.id);
      
      const result = await settleFund(fund.id);

      clearInterval(progressInterval);
      setWithdrawProgress(100);

      if (result.success) {
        // Bỏ thông báo thành công cho quỹ không thời hạn
        if (fund.hasTerm) {
          showToast(`✅ Tất toán quỹ thành công! Đã rút toàn bộ ${formatMoney(fund.current, fund.currency)} về ví nguồn.`, "success");
        }
        await loadHistory();
        
        // Xóa quỹ sau khi tất toán thành công (cho cả quỹ có thời hạn và không thời hạn)
        await deleteFund(fund.id);
        
        try {
          if (loadWallets) await loadWallets();
        } catch (e) {
          console.warn('Unable to reload wallets after settle', e);
        }
        if (onUpdateFund) await onUpdateFund();

        setTimeout(() => {
          if (onBack) {
            onBack();
          }
        }, 1000);
      } else {
        showToast(`Không thể tất toán quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error settling fund:", error);
      showToast("Đã xảy ra lỗi khi tất toán quỹ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFund = () => {
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteFund = async () => {
    setConfirmDeleteOpen(false);
    setSaving(true);

    try {
      console.log("Deleting fund:", fund.id);
      const result = await deleteFund(fund.id);

      if (result.success) {
        showToast("Xóa quỹ thành công!", "success");
        // Quay về danh sách
        if (onBack) {
          onBack();
        }
      } else {
        showToast(`Không thể xóa quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting fund:", error);
      showToast("Đã xảy ra lỗi khi xóa quỹ.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fund-detail-layout">
      {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
      <div className="fund-detail-form">
        <h5 className="mb-4" style={{ fontWeight: '700', color: '#111827' }}>Quản lý quỹ</h5>

        {/* TABS NAVIGATION - Wallet Style */}
        <div className="fund-detail-tabs">
          <button
            onClick={() => setActiveTab("info")}
            className={
              activeTab === "info"
                ? "fund-detail-tab fund-detail-tab--active"
                : "fund-detail-tab"
            }
          >
            <i className="bi bi-info-circle"></i>
            <span>Thông tin quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("edit")}
            className={
              activeTab === "edit"
                ? "fund-detail-tab fund-detail-tab--active"
                : "fund-detail-tab"
            }
          >
            <i className="bi bi-pencil-square"></i>
            <span>Sửa quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("deposit")}
            className={
              activeTab === "deposit"
                ? "fund-detail-tab fund-detail-tab--active"
                : "fund-detail-tab"
            }
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Nạp tiền</span>
          </button>
          
          <button
            onClick={() => setActiveTab("withdraw")}
            className={
              activeTab === "withdraw"
                ? "fund-detail-tab fund-detail-tab--active"
                : "fund-detail-tab"
            }
          >
            <i className="bi bi-dash-circle-fill"></i>
            <span>Rút tiền</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="mt-3">
          {activeTab === "info" && (
            <FundInfoTab fund={fund} wallets={wallets} />
          )}

          {activeTab === "edit" && (
            <FundEditTab
              fund={fund}
              form={form}
              isFundCompleted={isFundCompleted}
              saving={saving}
              selectedSourceWalletId={selectedSourceWalletId}
              setSelectedSourceWalletId={setSelectedSourceWalletId}
              filteredWallets={filteredWallets}
              autoDepositData={autoDepositData}
              setAutoDepositData={setAutoDepositData}
              reminderData={reminderData}
              setReminderData={setReminderData}
              hasTodayAutoDeposit={hasTodayAutoDeposit}
              nextAutoDepositDate={nextAutoDepositDate ? formatVietnamDate(nextAutoDepositDate) : null}
              hasTodayReminder={hasTodayReminder}
              nextReminderDate={nextReminderDate ? formatVietnamDate(nextReminderDate) : null}
              handleFormChange={handleFormChange}
              handleSubmitEdit={handleSubmitEdit}
            />
          )}

          {activeTab === "deposit" && (
            <FundDepositTab
              fund={fund}
              wallets={wallets}
              isFundCompleted={isFundCompleted}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              saving={saving}
              todayAutoDepositStatus={todayAutoDepositStatus}
              todayManualDepositStatus={todayManualDepositStatus}
              depositStatus={depositStatus}
              handleDeposit={handleDeposit}
              depositStatusInfo={depositStatusInfo}
            />
          )}

          {activeTab === "withdraw" && (
            <FundWithdrawTab
              fund={fund}
              wallets={wallets}
              progress={progress}
              saving={saving}
              withdrawProgress={withdrawProgress}
              partialWithdrawAmount={partialWithdrawAmount}
              setPartialWithdrawAmount={setPartialWithdrawAmount}
              handleWithdraw={handleWithdraw}
              handleSettle={handleSettle}
              handleDelete={handleDeleteFund}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BIỂU ĐỒ TRẠNG THÁI MỚI */}
      <div className="fund-detail-summary">
        <div className="fund-progress-card card border-0 shadow-sm">
          {fund.hasTerm ? (
            /* QUỸ CÓ THỜI HẠN: Hiển thị gauge với trạng thái tốc độ */
            <div className="fund-progress-modern">
              <div className="fund-progress-gauge" data-pace-status={fundPacing.paceStatus}>
              <svg width="260" height="260" viewBox="0 0 260 260" role="img" aria-label="Fund pacing gauge">
                <defs>
                  <linearGradient id={gaugeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={gaugeGradientColors.start} />
                    <stop offset="100%" stopColor={gaugeGradientColors.end} />
                  </linearGradient>
                </defs>
                <circle
                  className="fund-progress-ring"
                  cx="130"
                  cy="130"
                  r={gaugeRadius}
                  strokeWidth="18"
                  fill="none"
                />
                {expectedOffset != null && (
                  <circle
                    className="fund-progress-expected"
                    cx="130"
                    cy="130"
                    r={gaugeRadius}
                    strokeWidth="12"
                    strokeDasharray={`${gaugeCircumference} ${gaugeCircumference}`}
                    strokeDashoffset={expectedOffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 130 130)"
                  />
                )}
                <circle
                  className="fund-progress-actual"
                  cx="130"
                  cy="130"
                  r={gaugeRadius}
                  stroke={`url(#${gaugeGradientId})`}
                  strokeWidth="18"
                  strokeDasharray={`${gaugeCircumference} ${gaugeCircumference}`}
                  strokeDashoffset={actualOffset}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 130 130)"
                />
              </svg>
              <div className="fund-progress-center">
                <span>Thực tế</span>
                <strong>{Math.round(actualPct)}%</strong>
                <small>
                  {aheadPct ? (
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>
                      Vượt tiến độ {aheadPct}
                    </span>
                  ) : (
                    actualAmountLabel
                  )}
                </small>
              </div>
            </div>
            <div className="fund-progress-info">
              <div className="fund-progress-status-head">
                <div>
                  <p>Trạng thái tốc độ</p>
                  <h5>{paceStatusLabel}</h5>
                </div>
                <span className={`fund-progress-status-badge is-${fundPacing.paceStatus}`}>
                  {diffPercentLabel}
                </span>
              </div>
              <p className="fund-progress-status-desc">{paceStatusDescription}</p>
              <div className="fund-progress-stat-grid">
                <div className="fund-progress-stat">
                  <p>Thực tế</p>
                  <strong>{actualAmountLabel}</strong>
                  <span>Đã đạt {Math.round(actualPct)}% mục tiêu</span>
                </div>
                <div className="fund-progress-stat">
                  <p>Còn thiếu</p>
                  <strong>{shortageLabel}</strong>
                  <span>{fundPacing.shortage === 0 ? "Đã chạm mục tiêu" : remainingDaysLabel}</span>
                </div>
              </div>
              <div className="fund-progress-pill-row">
                {PACE_STATUS_DEFINITIONS.filter((status) => {
                  // Ẩn "Vượt tiến độ" nếu quỹ có nạp tự động
                  if (status.key === "ahead" && fund.autoDepositEnabled) {
                    return false;
                  }
                  // Ẩn "Nguy cơ"
                  if (status.key === "critical") {
                    return false;
                  }
                  return true;
                }).map((status) => (
                  <span
                    key={status.key}
                    className={`fund-progress-pill ${status.key === fundPacing.paceStatus ? "is-active" : ""}`}
                  >
                    <span className={`pill-dot pill-dot--${status.key}`} />
                    {status.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          ) : (
            /* QUỸ KHÔNG THỜI HẠN: Hiển thị biểu đồ tăng trưởng */
            <div className="fund-growth-modern">
              <div className="fund-growth-header">
                <div>
                  <p>Tăng trưởng quỹ</p>
                  <h5>Tổng tích lũy</h5>
                </div>
                <div className="fund-growth-badge">
                  <i className="bi bi-graph-up-arrow"></i>
                  <span>{growthChartData?.totalTransactions || 0} lần nạp{growthChartData?.totalWithdrawals > 0 ? `, ${growthChartData.totalWithdrawals} lần rút` : ''}</span>
                </div>
              </div>
              
              <div className="fund-growth-chart" style={{ position: 'relative' }}>
                {growthChartData && growthChartData.points.length > 0 ? (
                  <>
                  <svg width="100%" height="240" viewBox="0 0 400 240" className="fund-growth-svg" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id={`growthGradient-${fund.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Y-axis labels */}
                    {[0, 25, 50, 75, 100].map((pct) => {
                      const value = (pct / 100) * growthChartData.max;
                      const y = 200 - (pct / 100) * 180;
                      return (
                        <g key={`y-label-${pct}`}>
                          <line
                            x1="0"
                            y1={y}
                            x2="400"
                            y2={y}
                            stroke="rgba(0, 0, 0, 0.08)"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                          <text
                            x="-5"
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="#64748b"
                            fontWeight="500"
                          >
                            {formatMoney(value, fund.currency, 0)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* X-axis labels */}
                    {growthChartData.points.map((p, idx) => {
                      if (growthChartData.points.length > 10 && idx % Math.ceil(growthChartData.points.length / 5) !== 0 && idx !== growthChartData.points.length - 1) {
                        return null; // Chỉ hiển thị một số labels nếu có nhiều điểm
                      }
                      const x = (idx / Math.max(growthChartData.points.length - 1, 1)) * 400;
                      const date = p.date ? formatVietnamDate(p.date) : '';
                      return (
                        <text
                          key={`x-label-${idx}`}
                          x={x}
                          y="235"
                          textAnchor="middle"
                          fontSize="9"
                          fill="#64748b"
                          fontWeight="500"
                        >
                          {date}
                        </text>
                      );
                    })}
                    
                    {/* Area chart */}
                    <path
                      d={`M 0,200 ${growthChartData.points.map((p, idx) => {
                        const x = (idx / Math.max(growthChartData.points.length - 1, 1)) * 400;
                        const y = 200 - (p.cumulative / growthChartData.max) * 180;
                        return `L ${x},${y}`;
                      }).join(' ')} L 400,200 Z`}
                      fill={`url(#growthGradient-${fund.id})`}
                    />
                    
                    {/* Line chart - có thể hover */}
                    <polyline
                      points={growthChartData.points.map((p, idx) => {
                        const x = (idx / Math.max(growthChartData.points.length - 1, 1)) * 400;
                        const y = 200 - (p.cumulative / growthChartData.max) * 180;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#0d6efd"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ cursor: 'pointer' }}
                    />
                    
                    {/* Interactive data points với tooltip */}
                    {growthChartData.points.map((p, idx) => {
                      const x = (idx / Math.max(growthChartData.points.length - 1, 1)) * 400;
                      const y = 200 - (p.cumulative / growthChartData.max) * 180;
                      const isWithdraw = p.type === 'WITHDRAW';
                      const date = p.date ? formatVietnamDate(p.date) : '';
                      const time = p.date ? formatVietnamTime(p.date) : '';
                      
                      return (
                        <g key={idx}>
                          {/* Invisible larger circle for easier hover */}
                          <circle
                            cx={x}
                            cy={y}
                            r="12"
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const chartRect = e.currentTarget.closest('.fund-growth-chart')?.getBoundingClientRect();
                              if (chartRect) {
                                setChartTooltip({
                                  show: true,
                                  x: e.clientX - chartRect.left,
                                  y: e.clientY - chartRect.top,
                                  data: {
                                    date: date,
                                    time: time,
                                    amount: p.amount,
                                    cumulative: p.cumulative,
                                    type: isWithdraw ? 'Rút tiền' : 'Nạp tiền',
                                    isWithdraw: isWithdraw
                                  }
                                });
                              }
                            }}
                            onMouseMove={(e) => {
                              const chartRect = e.currentTarget.closest('.fund-growth-chart')?.getBoundingClientRect();
                              if (chartRect) {
                                setChartTooltip(prev => ({
                                  ...prev,
                                  x: e.clientX - chartRect.left,
                                  y: e.clientY - chartRect.top
                                }));
                              }
                            }}
                            onMouseLeave={() => {
                              setChartTooltip({ show: false, x: 0, y: 0, data: null });
                            }}
                          />
                          {/* Visible data point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            fill={isWithdraw ? "#ef4444" : "#0d6efd"}
                            stroke="#ffffff"
                            strokeWidth="2"
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Tooltip */}
                  {chartTooltip.show && chartTooltip.data && (
                    <div 
                      className="fund-growth-tooltip"
                      style={{
                        position: 'absolute',
                        left: `${chartTooltip.x + 15}px`,
                        top: `${chartTooltip.y - 15}px`,
                        transform: 'translateY(-100%)',
                        pointerEvents: 'none',
                        zIndex: 1000
                      }}
                    >
                      <div className="fund-growth-tooltip__content">
                        <div className="fund-growth-tooltip__header">
                          <span className={`fund-growth-tooltip__type ${chartTooltip.data.isWithdraw ? 'fund-growth-tooltip__type--withdraw' : 'fund-growth-tooltip__type--deposit'}`}>
                            {chartTooltip.data.type}
                          </span>
                        </div>
                        <div className="fund-growth-tooltip__date">
                          <i className="bi bi-calendar3 me-1"></i>
                          {chartTooltip.data.date} {chartTooltip.data.time && `• ${chartTooltip.data.time}`}
                        </div>
                        <div className="fund-growth-tooltip__amount">
                          <span className="fund-growth-tooltip__label">Số tiền:</span>
                          <span className={`fund-growth-tooltip__value ${chartTooltip.data.isWithdraw ? 'fund-growth-tooltip__value--withdraw' : 'fund-growth-tooltip__value--deposit'}`}>
                            {chartTooltip.data.isWithdraw ? '-' : '+'}{formatMoney(Math.abs(chartTooltip.data.amount), fund.currency)}
                          </span>
                        </div>
                        <div className="fund-growth-tooltip__cumulative">
                          <span className="fund-growth-tooltip__label">Tích lũy:</span>
                          <span className="fund-growth-tooltip__value">
                            {formatMoney(chartTooltip.data.cumulative, fund.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <div className="fund-growth-empty">
                    <i className="bi bi-graph-up"></i>
                    <p>Chưa có dữ liệu nạp tiền</p>
                  </div>
                )}
              </div>
              
              <div className="fund-growth-stats">
                <div className="fund-growth-stat">
                  <p>TỔNG TÍCH LŨY</p>
                  <strong>{formatMoney(growthChartData?.totalDeposited || 0, fund.currency)}</strong>
                  <span>{growthChartData?.totalTransactions || 0} lần nạp</span>
                </div>
                <div className="fund-growth-stat">
                  <p>TỔNG ĐÃ RÚT</p>
                  <strong style={{ color: growthChartData?.totalWithdrawn > 0 ? '#ef4444' : '#111827' }}>
                    {formatMoney(growthChartData?.totalWithdrawn || 0, fund.currency)}
                  </strong>
                  <span>{growthChartData?.totalWithdrawals || 0} lần rút</span>
                </div>
                <div className="fund-growth-stat">
                  <p>SỐ DƯ HIỆN TẠI</p>
                  <strong>{formatMoney(fund.current || 0, fund.currency)}</strong>
                  <span>Quỹ không thời hạn</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LỊCH SỬ GIAO DỊCH - Hiển thị bên dưới biểu đồ */}
        <div className="fund-history-card card border-0 shadow-sm" style={{ marginTop: '1.5rem' }}>
          <FundHistoryTab
            fund={fund}
            historyLoading={historyLoading}
            historyError={historyError}
            displayHistory={displayHistory}
          />
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Xác nhận xóa quỹ"
        message={`Bạn có chắc chắn muốn xóa quỹ "${fund.name}"?\n\nHành động này sẽ xóa vĩnh viễn quỹ và không thể hoàn tác!`}
        okText="Xóa quỹ"
        cancelText="Hủy"
        danger={true}
        onOk={confirmDeleteFund}
        onClose={() => setConfirmDeleteOpen(false)}
      />

      {/* CONFIRM SETTLE MODAL */}
      <ConfirmModal
        open={confirmSettleOpen}
        title="Xác nhận tất toán quỹ"
        message={`Bạn có chắc chắn muốn tất toán quỹ "${fund.name}"?\n\nSố tiền ${formatMoney(fund.current, fund.currency)} sẽ được rút toàn bộ về ví nguồn và quỹ sẽ bị xóa sau khi tất toán thành công.\n\nHành động này không thể hoàn tác!`}
        okText="Tất toán"
        cancelText="Hủy"
        danger={false}
        onOk={confirmSettle}
        onClose={() => setConfirmSettleOpen(false)}
      />
    </div>
  );
}