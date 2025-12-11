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
import { formatVietnamDate } from "../../utils/dateFormat";
import { getFundTransactions } from "../../services/fund.service";
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
  const progress =
    fund.target && fund.target > 0
      ? Math.min(100, Math.round((fund.current / fund.target) * 100))
      : null;
  const progressValue = progress ?? 0;
  const fundPacing = useMemo(() => {
    const currentAmount = Number(fund.current ?? fund.currentAmount ?? 0) || 0;
    const targetAmount = Number(fund.target ?? fund.targetAmount ?? 0) || 0;
    const hasTarget = targetAmount > 0;

    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const startDate = parseDate(fund.startDate);
    const endDate = parseDate(fund.endDate);

    let totalDays = null;
    let elapsedDays = null;
    let expectedPct = null;
    let expectedAmount = null;

    if (startDate && endDate && endDate.getTime() > startDate.getTime()) {
      totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
      const today = new Date();
      const clamped = Math.min(endDate.getTime(), Math.max(startDate.getTime(), today.getTime()));
      elapsedDays = Math.max(0, Math.round((clamped - startDate.getTime()) / MS_PER_DAY));
      expectedPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      if (hasTarget) {
        expectedAmount = (expectedPct / 100) * targetAmount;
      }
    }

    let paceStatus = "unknown";
    if (expectedPct == null) {
      if (hasTarget && progressValue >= 100) {
        paceStatus = "ahead";
      }
    } else {
      const diff = progressValue - expectedPct;
      if (diff >= 7) paceStatus = "ahead";
      else if (diff >= -4) paceStatus = "on_track";
      else if (diff >= -15) paceStatus = "behind";
      else paceStatus = "critical";
    }

    const diffPct = expectedPct == null ? null : Math.round(progressValue - expectedPct);
    const pctPerDay = totalDays ? 100 / totalDays : null;
    const diffDays = diffPct != null && pctPerDay ? Math.round(diffPct / pctPerDay) : null;

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
  }, [fund.current, fund.currentAmount, fund.target, fund.targetAmount, fund.startDate, fund.endDate, progressValue]);

  const paceStatusLabel = PACE_STATUS_LABELS[fundPacing.paceStatus] || PACE_STATUS_LABELS.unknown;
  const paceStatusDescription = useMemo(() => {
    if (fundPacing.diffPct == null) {
      return "Chưa có thời hạn để so sánh với kế hoạch.";
    }
    if (fundPacing.diffPct === 0) {
      return "Đang đúng với kế hoạch đề ra.";
    }
    const absPct = Math.abs(fundPacing.diffPct);
    const dayHint = fundPacing.diffDays && fundPacing.diffDays !== 0
      ? ` (~${Math.abs(fundPacing.diffDays)} ngày ${fundPacing.diffDays > 0 ? "sớm" : "trễ"})`
      : "";
    if (fundPacing.diffPct > 0) {
      return `Vượt kế hoạch ${absPct}%${dayHint}.`;
    }
    return `Chậm hơn kế hoạch ${absPct}%${dayHint}.`;
  }, [fundPacing.diffPct, fundPacing.diffDays]);

  const actualPct = Math.max(0, Math.min(progressValue, 100));
  const expectedPctValue = fundPacing.expectedPct != null ? Math.max(0, Math.min(fundPacing.expectedPct, 100)) : null;
  const actualAmountLabel = formatMoney(fundPacing.currentAmount, fund.currency);
  const planAmountLabel = fundPacing.expectedAmount != null ? formatMoney(fundPacing.expectedAmount, fund.currency) : "—";
  const shortageLabel = fundPacing.shortage != null ? formatMoney(fundPacing.shortage, fund.currency) : "—";
  const expectedPercentLabel = expectedPctValue != null ? `${Math.round(expectedPctValue)}%` : "--";
  const diffPercentLabel = fundPacing.diffPct != null ? `${fundPacing.diffPct > 0 ? "+" : ""}${fundPacing.diffPct}%` : "--";
  const remainingDaysLabel = (() => {
    if (fundPacing.totalDays == null || fundPacing.elapsedDays == null) return "Chưa có thời hạn";
    const remaining = Math.max(0, fundPacing.totalDays - fundPacing.elapsedDays);
    return remaining === 0 ? "Đến hạn hôm nay" : `${remaining} ngày còn lại`;
  })();
  const shortagePct = useMemo(() => {
    if (!fundPacing.targetAmount || fundPacing.targetAmount <= 0 || fundPacing.shortage == null) return null;
    return Math.min(100, Math.max(0, (fundPacing.shortage / fundPacing.targetAmount) * 100));
  }, [fundPacing.shortage, fundPacing.targetAmount]);
  const hasShortage = fundPacing.shortage != null && fundPacing.shortage > 0;
  const actualTrackHeight = Math.max(0, Math.min(100, actualPct));
  const shortageTrackHeight = hasShortage && shortagePct != null ? Math.max(0, Math.min(100, shortagePct)) : 0;
  const shortagePercentLabel = shortagePct != null ? `${Math.round(shortagePct)}%` : fundPacing.shortage === 0 ? "0%" : "--";
  const targetAmountLabel = fundPacing.targetAmount ? formatMoney(fundPacing.targetAmount, fund.currency) : "—";
  const actualPercentLabel = `${Math.round(actualPct)}%`;

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
        amountPerPeriod: form.amountPerPeriod ? Number(form.amountPerPeriod) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      // Thêm target nếu có kỳ hạn
      if (fund.hasTerm && form.target) {
        updateData.targetAmount = Number(form.target);
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

  // Transaction history for chart (from historyItems)
  const transactionHistory = useMemo(() => {
    if (!historyItems || historyItems.length === 0) return [];
    
    // Sort by date descending, then map to chart format
    return historyItems
      .filter(tx => tx.status === 'SUCCESS' && (tx.type === 'DEPOSIT' || tx.type === 'AUTO_DEPOSIT' || tx.type === 'AUTO_DEPOSIT_RECOVERY'))
      .sort((a, b) => new Date(b.createdAt || b.transactionDate) - new Date(a.createdAt || a.transactionDate))
      .map(tx => ({
        date: tx.createdAt || tx.transactionDate,
        amount: Number(tx.amount || 0)
      }));
  }, [historyItems]);

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
      const totalDeposited = todayDeposits.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
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

  // Tính toán trạng thái nạp tiền tự động hôm nay
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
    const pendingAmount = Number(fund.pendingAutoTopupAmount || 0);
    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
    const sourceWalletBalance = Number(sourceWallet?.balance || 0);
    const autoDepositAmount = Number(fund.autoDepositAmount || fund.amountPerPeriod || 0);
    
    if (todayDeposits.length > 0) {
      // Đã nạp hôm nay
      const totalDeposited = todayDeposits.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
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
  
  // Map historyItems to display format
  const displayHistory = useMemo(() => {
    return historyItems.map(tx => {
      const isSuccess = tx.status === 'SUCCESS';
      const txType = tx.type || 'DEPOSIT';
      const isAuto = txType === 'AUTO_DEPOSIT' || txType === 'AUTO_DEPOSIT_RECOVERY';
      const isRecovery = txType === 'AUTO_DEPOSIT_RECOVERY';
      
      return {
        id: tx.id || tx.transactionId,
        type: isAuto ? 'auto' : 'manual',
        typeLabel: isRecovery ? 'Nạp bù tự động' : (isAuto ? 'Nạp tự động' : 'Nạp thủ công'),
        amount: Number(tx.amount || 0),
        status: isSuccess ? 'success' : 'failed',
        date: tx.createdAt || tx.transactionDate || tx.transactionAt,
        message: tx.message || (isRecovery ? 'Nạp bù tự động thành công' : (isAuto ? 'Nạp tự động thành công' : 'Nạp tiền thành công')),
        walletBalance: tx.walletBalance
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [historyItems]);

  const handleDeposit = async (e) => {
    e.preventDefault();

    // Chặn nạp nếu quỹ không còn ACTIVE (đã đóng hoặc hoàn thành)
    if (!isFundActive) {
      showToast("Quỹ đã đóng hoặc hoàn thành mục tiêu, không thể nạp thêm.", "error");
      return;
    }
    const amount = Number(depositAmount);
    
    // Validation cơ bản
    if (!amount || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ.", "error");
      return;
    }

    if (amount < 1000) {
      showToast("Số tiền nạp tối thiểu là 1,000.", "error");
      return;
    }

    // Kiểm tra số tiền phải >= số tiền theo tần suất
    if (fund.amountPerPeriod && amount < fund.amountPerPeriod) {
      showToast(
        `Số tiền nạp phải lớn hơn hoặc bằng số tiền theo tần suất: ${formatMoney(fund.amountPerPeriod, fund.currency)}.`,
        "error"
      );
      return;
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
    
    // Rút toàn bộ số dư quỹ
    const amount = fund.current;
    
    if (!amount || amount <= 0) {
      showToast("Quỹ không có số dư để rút.", "error");
      return;
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
        showToast(`🎉 Hoàn thành quỹ! Rút toàn bộ ${formatMoney(amount, fund.currency)} về ví nguồn thành công!`, "success");
        // Reload history after successful withdraw
        await loadHistory();
        
        // Xóa quỹ sau khi rút tiền thành công
        await deleteFund(fund.id);
        
        // Reload wallets so UI shows updated balances
        try {
          if (loadWallets) await loadWallets();
        } catch (e) {
          console.warn('Unable to reload wallets after withdraw', e);
        }
        // Let parent refresh funds list if provided
        if (onUpdateFund) await onUpdateFund();

        // Delay một chút để user đọc toast
        setTimeout(() => {
          // Quay về danh sách quỹ
          if (onBack) {
            onBack();
          }
        }, 1000);
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
        showToast(`✅ Tất toán quỹ thành công! Đã rút toàn bộ ${formatMoney(fund.current, fund.currency)} về ví nguồn.`, "success");
        await loadHistory();
        
        // Xóa quỹ sau khi tất toán thành công
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

        {/* TABS NAVIGATION - Segment Control Style */}
        <div className="mb-4" style={{ 
          display: 'flex', 
          gap: '0',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          padding: '0.375rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setActiveTab("info")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "info" ? '#fff' : 'transparent',
              color: activeTab === "info" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "info" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "info" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-info-circle" style={{ fontSize: '1rem' }}></i>
            <span>Thông tin quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("edit")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "edit" ? '#fff' : 'transparent',
              color: activeTab === "edit" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "edit" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "edit" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-pencil-square" style={{ fontSize: '1rem' }}></i>
            <span>Sửa quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("deposit")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "deposit" ? '#fff' : 'transparent',
              color: activeTab === "deposit" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "deposit" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "deposit" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-plus-circle-fill" style={{ fontSize: '1rem' }}></i>
            <span>Nạp tiền</span>
          </button>
          
          <button
            onClick={() => setActiveTab("withdraw")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "withdraw" ? '#fff' : 'transparent',
              color: activeTab === "withdraw" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "withdraw" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "withdraw" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-dash-circle-fill" style={{ fontSize: '1rem' }}></i>
            <span>Rút tiền</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "history" ? '#fff' : 'transparent',
              color: activeTab === "history" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "history" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "history" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-clock-history" style={{ fontSize: '1rem' }}></i>
            <span>Lịch sử</span>
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
            />
          )}

          {activeTab === "withdraw" && (
            <FundWithdrawTab
              fund={fund}
              wallets={wallets}
              progress={progress}
              saving={saving}
              withdrawProgress={withdrawProgress}
              handleWithdraw={handleWithdraw}
              handleSettle={handleSettle}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "history" && (
            <FundHistoryTab
              fund={fund}
              historyLoading={historyLoading}
              historyError={historyError}
              displayHistory={displayHistory}
            />
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BIỂU ĐỒ TRẠNG THÁI MỚI */}
      <div className="fund-detail-summary">
        <div className="fund-progress-card card border-0 shadow-sm">
          <div className="fund-progress-modern">
            <div className="fund-progress-visual">
              <div className="fund-progress-unified">
                <div className="fund-progress-unified-track">
                  {hasShortage && shortageTrackHeight > 0 && (
                    <span className="fund-progress-unified-gap" style={{ height: `${shortageTrackHeight}%` }} />
                  )}
                  <span className="fund-progress-unified-fill" style={{ height: `${actualTrackHeight}%` }} />
                  {expectedPctValue != null && (
                    <span className="fund-progress-unified-plan" style={{ bottom: `${Math.max(0, Math.min(100, expectedPctValue))}%` }} />
                  )}
                  <div className="fund-progress-unified-scale">
                    <span>100%</span>
                    <span>50%</span>
                    <span>0%</span>
                  </div>
                </div>
                <div className="fund-progress-unified-cards">
                  <div className="fund-progress-unified-card is-actual">
                    <p>Thực tế</p>
                    <strong>{actualAmountLabel}</strong>
                    <span>{actualPercentLabel}</span>
                  </div>
                  <div className="fund-progress-unified-card is-plan">
                    <p>Kế hoạch</p>
                    <strong>{planAmountLabel}</strong>
                    <span>{expectedPercentLabel}</span>
                  </div>
                  <div className="fund-progress-unified-card is-target">
                    <p>Mục tiêu</p>
                    <strong>{targetAmountLabel}</strong>
                    <span>100%</span>
                  </div>
                  <div className="fund-progress-unified-card is-gap">
                    <p>Còn thiếu</p>
                    <strong>{shortageLabel}</strong>
                    <span>{shortagePercentLabel}</span>
                  </div>
                </div>
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
                  <p>Theo kế hoạch</p>
                  <strong>{planAmountLabel}</strong>
                  <span>{expectedPctValue != null ? `Lẽ ra đạt ${expectedPercentLabel}` : "Chưa có lịch trình"}</span>
                </div>
                <div className="fund-progress-stat">
                  <p>Còn thiếu</p>
                  <strong>{shortageLabel}</strong>
                  <span>{fundPacing.shortage === 0 ? "Đã chạm mục tiêu" : remainingDaysLabel}</span>
                </div>
              </div>
              <div className="fund-progress-meter">
                <div className="fund-progress-meter-track">
                  <span className="fund-progress-meter-fill" style={{ width: `${actualPct}%` }} />
                  {expectedPctValue != null && (
                    <span className="fund-progress-meter-plan" style={{ left: `${expectedPctValue}%` }} />
                  )}
                </div>
                <div className="fund-progress-meter-legend">
                  <span>
                    <span className="legend-dot actual" /> Thực tế
                  </span>
                  {expectedPctValue != null && (
                    <span>
                      <span className="legend-dot plan" /> Kế hoạch
                    </span>
                  )}
                </div>
              </div>
              <div className="fund-progress-pill-row">
                {PACE_STATUS_DEFINITIONS.map((status) => (
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
