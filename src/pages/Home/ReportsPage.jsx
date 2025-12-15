import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { formatVietnamTime, formatVietnamDate } from "../../utils/dateFormat";
import { formatMoney } from "../../utils/formatMoney";
import { parseAmountNonNegative } from "../../utils/parseAmount";

import "../../styles/pages/ReportsPage.css";
import "../../styles/components/funds/FundDetail.css";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useFundData } from "../../contexts/FundDataContext";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services";
import { getFundTransactions } from "../../services/fund.service";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import BudgetDetailModal from "../../components/budgets/BudgetDetailModal";

const RANGE_OPTIONS = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

const INCOME_COLOR = "#0B63F6";
const EXPENSE_COLOR = "#00C2FF";
const PAGE_SIZE = 10;

const FUND_FILTERS = [
  { value: "all", labelKey: "reports.funds.filters.all" },
  { value: "flexible", labelKey: "reports.funds.filters.non_term" },
  { value: "term", labelKey: "reports.funds.filters.term" },
];

const FUND_FREQUENCY_LABELS = {
  DAILY: "reports.funds.frequency.daily",
  WEEKLY: "reports.funds.frequency.weekly",
  MONTHLY: "reports.funds.frequency.monthly",
  YEARLY: "reports.funds.frequency.yearly",
  CUSTOM: "reports.funds.frequency.custom",
};

const FUND_HISTORY_LIMIT = 6;

const FUND_HISTORY_TYPE_META = {
  DEPOSIT: { labelKey: "reports.funds.detail.history.type.manual", direction: "in" },
  MANUAL_DEPOSIT: { labelKey: "reports.funds.detail.history.type.manual", direction: "in" },
  AUTO_DEPOSIT: { labelKey: "reports.funds.detail.history.type.auto", direction: "in" },
  AUTO_DEPOSIT_RECOVERY: { labelKey: "reports.funds.detail.history.type.recovery", direction: "in" },
  WITHDRAW: { labelKey: "reports.funds.detail.history.type.withdraw", direction: "out" },
  AUTO_WITHDRAW: { labelKey: "reports.funds.detail.history.type.withdraw", direction: "out" },
  ADJUSTMENT: { labelKey: "reports.funds.detail.history.type.adjustment", direction: "in" },
  DEFAULT: { labelKey: "reports.funds.detail.history.type.unknown", direction: "in" },
};

const getFundHistoryTypeMeta = (type) => {
  const normalized = (type || "").toUpperCase();
  return FUND_HISTORY_TYPE_META[normalized] || FUND_HISTORY_TYPE_META.DEFAULT;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const isFundCompleted = (fund) => {
  if (!fund) return false;
  const targetValue = Number(fund?.targetAmount ?? fund?.target ?? 0) || 0;
  if (!targetValue) return false;
  const currentValue = Number(fund?.currentAmount ?? fund?.current ?? 0) || 0;
  return currentValue >= targetValue;
};

const normalizeTransaction = (raw) => {
  if (!raw) return null;
  const walletId = raw.wallet?.walletId || raw.walletId || raw.walletID;
  if (!walletId) return null;

  const amount = Math.abs(Number(raw.amount) || 0);
  const typeName = (raw.transactionType?.typeName || raw.type || "").toLowerCase();
  const type = typeName.includes("thu") || typeName.includes("income") ? "income" : "expense";
  const dateSource = raw.createdAt || raw.transactionDate || raw.date;
  const dateObj = dateSource ? new Date(dateSource) : null;
  if (!dateObj || Number.isNaN(dateObj.getTime())) return null;

  return {
    id: raw.transactionId || raw.id,
    walletId: Number(walletId),
    amount,
    type,
    date: dateObj,
    note: raw.note || raw.description || "",
    currency: raw.wallet?.currencyCode || raw.currencyCode || raw.currency || "VND",
    createdBy: raw.createdBy || raw.userId || raw.user?.userId || raw.user?.id,
    createdByEmail: raw.createdByEmail || raw.userEmail || raw.user?.email,
  };
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const sumInRange = (list, start, end) => {
  const totals = { income: 0, expense: 0 };
  list.forEach((tx) => {
    if (!tx.date) return;
    if (tx.date >= start && tx.date <= end) {
      if (tx.type === "income") totals.income += tx.amount;
      else totals.expense += tx.amount;
    }
  });
  return totals;
};

const buildDailyData = (transactions) => {
  const now = new Date();
  const periods = Array.from({ length: 24 }, (_, hour) => {
    const start = new Date(now);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(now);
    end.setHours(hour, 59, 59, 999);
    return {
      label: `${hour.toString().padStart(2, "0")}:00`,
      start,
      end,
    };
  });

  return periods.map((period) => ({
    label: period.label,
    ...sumInRange(transactions, period.start, period.end),
  }));
};

const buildWeeklyData = (transactions) => {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // 1..7 (Mon..Sun)
  const monday = addDays(now, 1 - dayOfWeek);
  const periods = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, index) => {
    const start = addDays(monday, index);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 0);
    end.setHours(23, 59, 59, 999);
    return { label, start, end };
  });

  return periods.map((period) => ({
    label: period.label,
    ...sumInRange(transactions, period.start, period.end),
  }));
};

const buildMonthlyData = (transactions) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const periods = [
    { label: "Tuần 1", startDay: 1, endDay: 7 },
    { label: "Tuần 2", startDay: 8, endDay: 14 },
    { label: "Tuần 3", startDay: 15, endDay: 21 },
    { label: "Tuần 4", startDay: 22, endDay: 31 },
  ];

  return periods.map(({ label, startDay, endDay }) => {
    const start = new Date(year, month, startDay, 0, 0, 0);
    const end = new Date(year, month, endDay, 23, 59, 59);
    return { label, ...sumInRange(transactions, start, end) };
  });
};

const buildYearlyData = (transactions) => {
  const now = new Date();
  const year = now.getFullYear();
  const periods = Array.from({ length: 12 }, (_, idx) => ({
    label: `Th ${idx + 1}`,
    month: idx,
  }));

  return periods.map(({ label, month }) => {
    const start = new Date(year, month, 1, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    return { label, ...sumInRange(transactions, start, end) };
  });
};

const buildChartData = (transactions, range) => {
  if (!transactions.length) return [];
  switch (range) {
    case "day":
      return buildDailyData(transactions);
    case "month":
      return buildMonthlyData(transactions);
    case "year":
      return buildYearlyData(transactions);
    case "week":
    default:
      return buildWeeklyData(transactions);
  }
};

const sortWalletsByMode = (walletList = [], sortMode = "default") => {
  const arr = [...walletList];
  arr.sort((a, b) => {
    // Nếu không phải default sort, dùng logic cũ
    if (sortMode !== "default") {
      const nameA = (a?.name || "").toLowerCase();
      const nameB = (b?.name || "").toLowerCase();
      const balA = Number(a?.balance ?? a?.current ?? 0) || 0;
      const balB = Number(b?.balance ?? b?.current ?? 0) || 0;

      switch (sortMode) {
        case "name_asc":
          return nameA.localeCompare(nameB);
        case "balance_desc":
          return balB - balA;
        case "balance_asc":
          return balA - balB;
        default:
          return 0;
      }
    }

    // Default sort: Sắp xếp theo thứ tự ưu tiên
    // 1. Ví mặc định cá nhân (isDefault = true, không phải shared)
    // 2. Ví cá nhân khác (isDefault = false, không phải shared)
    // 3. Ví nhóm (isShared = true, owner)
    // 4. Ví tham gia - Sử dụng (shared, role = USE/MEMBER)
    // 5. Ví tham gia - Xem (shared, role = VIEW/VIEWER)

    const aIsDefault = !!a?.isDefault;
    const bIsDefault = !!b?.isDefault;
    const aIsShared = !!a?.isShared || !!(a?.walletRole || a?.sharedRole || a?.role);
    const bIsShared = !!b?.isShared || !!(b?.walletRole || b?.sharedRole || b?.role);
    
    // Lấy role của ví
    const getWalletRole = (wallet) => {
      if (!wallet) return "";
      const role = (wallet?.walletRole || wallet?.sharedRole || wallet?.role || "").toUpperCase();
      return role;
    };
    
    const aRole = getWalletRole(a);
    const bRole = getWalletRole(b);
    
    // Kiểm tra xem có phải owner không (ví nhóm)
    const isOwner = (wallet) => {
      if (!wallet) return false;
      const role = getWalletRole(wallet);
      return ["OWNER", "MASTER", "ADMIN"].includes(role);
    };
    
    const aIsOwner = isOwner(a);
    const bIsOwner = isOwner(b);
    
    // Lấy priority để so sánh (số nhỏ hơn = ưu tiên cao hơn)
    const getPriority = (wallet) => {
      const isDefault = !!wallet?.isDefault;
      const isShared = !!wallet?.isShared || !!(wallet?.walletRole || wallet?.sharedRole || wallet?.role);
      const role = getWalletRole(wallet);
      const isOwnerRole = isOwner(wallet);
      
      // 1. Ví mặc định cá nhân
      if (isDefault && !isShared) return 1;
      
      // 2. Ví cá nhân khác
      if (!isShared) return 2;
      
      // 3. Ví nhóm (owner)
      if (isShared && isOwnerRole) return 3;
      
      // 4. Ví tham gia - Sử dụng
      if (["MEMBER", "USER", "USE"].includes(role)) return 4;
      
      // 5. Ví tham gia - Xem
      if (["VIEW", "VIEWER"].includes(role)) return 5;
      
      // Mặc định
      return 6;
    };
    
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Nếu cùng priority, giữ nguyên thứ tự
    return 0;
  });
  return arr;
};

const getFundIdentity = (fund) => {
  if (!fund) return "";
  return String(
    fund.id ??
      fund.fundId ??
      fund.fundID ??
      fund.code ??
      fund.targetWalletId ??
      ""
  );
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildFundGoalStats = (fund) => {
  if (!fund) return null;

  const currentValue = Number(fund.currentAmount ?? fund.current ?? 0) || 0;
  const targetValue = Number(fund.targetAmount ?? fund.target ?? 0) || 0;
  const progressPct = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
  const startDate = normalizeDate(fund.startDate);
  const endDate = normalizeDate(fund.endDate);
  const hasDeadline = !!(fund.hasDeadline || fund.hasTerm);

  let totalDays = null;
  let elapsedDays = null;
  let remainingDays = null;
  let expectedPct = null;
  let expectedAmount = null;

  if (startDate && endDate && endDate.getTime() > startDate.getTime()) {
    totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clampedToday = Math.min(endDate.getTime(), Math.max(startDate.getTime(), today.getTime()));
    elapsedDays = Math.max(0, Math.round((clampedToday - startDate.getTime()) / MS_PER_DAY));
    remainingDays = Math.max(0, totalDays - elapsedDays);

    if (targetValue > 0) {
      const expectedRatio = elapsedDays / totalDays;
      expectedPct = Math.min(100, expectedRatio * 100);
      expectedAmount = Math.min(targetValue, expectedRatio * targetValue);
    }
  }

  const shortage = targetValue > 0 ? Math.max(0, targetValue - currentValue) : 0;
  const neededPerDay = remainingDays && shortage > 0 ? shortage / Math.max(1, remainingDays) : 0;
  const rawAmountPerPeriod = Number(fund.amountPerPeriod ?? 0) || 0;
  const amountPerPeriodValue = rawAmountPerPeriod > 0 ? rawAmountPerPeriod : null;

  let paceStatus = "unknown";
  if (expectedAmount == null) {
    paceStatus = targetValue > 0 ? (progressPct >= 100 ? "ahead" : "on_track") : "unknown";
  } else if (currentValue >= expectedAmount * 1.05) {
    paceStatus = "ahead";
  } else if (currentValue >= expectedAmount * 0.9) {
    paceStatus = "on_track";
  } else if (currentValue >= expectedAmount * 0.6) {
    paceStatus = "behind";
  } else {
    paceStatus = "critical";
  }

  return {
    currentValue,
    targetValue,
    progressPct,
    shortage,
    startDate,
    endDate,
    hasDeadline,
    totalDays,
    elapsedDays,
    remainingDays,
    expectedPct,
    expectedAmount,
    neededPerDay,
    paceStatus,
    amountPerPeriodValue,
    frequency: fund.frequency || null,
  };
};

const FundProgressDonut = ({ progress = 0 }) => {
  const normalized = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;
  const gradientId = useMemo(
    () => `fundProgressGradient-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <svg
      className="fund-progress-donut"
      width={radius * 2}
      height={radius * 2}
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      role="img"
      aria-label={`Goal progress ${Math.round(normalized)}%`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b63f6" />
          <stop offset="100%" stopColor="#00c2ff" />
        </linearGradient>
      </defs>
      <circle
        className="fund-donut-track"
        strokeWidth={stroke}
        fill="transparent"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        className="fund-donut-progress"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        stroke={`url(#${gradientId})`}
        fill="transparent"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text className="fund-donut-text" x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
        {`${Math.round(normalized)}%`}
      </text>
    </svg>
  );
};

// Budget Status Donut Chart Component
const BudgetStatusDonut = ({ data = [] }) => {
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="budget-status-donut-empty">
        <p className="text-muted">Chưa có dữ liệu</p>
      </div>
    );
  }
  
  let currentAngle = -90; // Start at top
  const slices = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    
    const startAngleRad = (start * Math.PI) / 180;
    const endAngleRad = (end * Math.PI) / 180;
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const x1 = radius + normalizedRadius * Math.cos(startAngleRad);
    const y1 = radius + normalizedRadius * Math.sin(startAngleRad);
    const x2 = radius + normalizedRadius * Math.cos(endAngleRad);
    const y2 = radius + normalizedRadius * Math.sin(endAngleRad);
    
    const pathData = [
      `M ${radius} ${radius}`,
      `L ${x1} ${y1}`,
      `A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return {
      ...item,
      pathData,
      percentage: (item.value / total) * 100
    };
  });
  
  return (
    <div className="budget-status-donut">
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className="budget-status-donut-svg"
      >
        {slices.map((slice, index) => (
          <path
            key={index}
            d={slice.pathData}
            fill={slice.color}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius - stroke}
          fill="#fff"
        />
        <text
          x={radius}
          y={radius - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="budget-status-donut-total"
          fontSize="20"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x={radius}
          y={radius + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="budget-status-donut-label"
          fontSize="12"
          fill="#64748b"
        >
          ngân sách
        </text>
      </svg>
      <div className="budget-status-donut-legend">
        {data.map((item, index) => (
          <div key={index} className="budget-status-donut-legend-item">
            <span
              className="budget-status-donut-legend-color"
              style={{ backgroundColor: item.color }}
            />
            <span className="budget-status-donut-legend-label">{item.label}</span>
            <span className="budget-status-donut-legend-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


export default function ReportsPage() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const { wallets, loading: walletsLoading } = useWalletData();
  const { funds = [], loading: fundsLoading } = useFundData();
  const {
    budgets = [],
    budgetsLoading,
    getSpentForBudget,
  } = useBudgetData();
  const { currentUser } = useAuth();
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [range, setRange] = useState("week");
  const [walletSearch, setWalletSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState("");
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReportTab, setActiveReportTab] = useState("wallets");
  const [fundSearch, setFundSearch] = useState("");
  const [fundFilter, setFundFilter] = useState("all");
  const [fundCompletionFilter, setFundCompletionFilter] = useState("active");
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [fundHistoryItems, setFundHistoryItems] = useState([]);
  const [fundHistoryLoading, setFundHistoryLoading] = useState(false);
  const [fundHistoryError, setFundHistoryError] = useState(false);
  const [chartTooltip, setChartTooltip] = useState({ show: false, x: 0, y: 0, data: null });
  // Budget filters
  const [budgetWalletFilter, setBudgetWalletFilter] = useState("all");
  const [budgetTimeFilter, setBudgetTimeFilter] = useState("this_month");
  const [budgetStatusFilter, setBudgetStatusFilter] = useState("all");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [showBudgetDetailModal, setShowBudgetDetailModal] = useState(false);

  const formatDateSafe = useCallback(
    (value) => {
      if (!value) return null;
      const dateValue = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dateValue.getTime())) return null;
      return formatDate(dateValue);
    },
    [formatDate]
  );
  
  // Lấy email và userId của user hiện tại
  const currentUserEmail = useMemo(() => {
    if (currentUser?.email) return currentUser.email;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.email || null;
      }
      const authUserStr = localStorage.getItem("auth_user");
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        return authUser.email || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [currentUser]);
  
  const currentUserId = useMemo(() => {
    if (currentUser?.id) return currentUser.id;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || user.id || null;
      }
      const authUserStr = localStorage.getItem("auth_user");
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        return authUser.id || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [currentUser]);

  useEffect(() => {
    if (!walletsLoading && wallets.length && !selectedWalletId) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [walletsLoading, wallets, selectedWalletId]);

  useEffect(() => {
    let mounted = true;
    const loadTransactions = async () => {
      try {
        setLoadingTransactions(true);
        const [txResponse, transferResponse] = await Promise.all([
          transactionAPI.getAllTransactions(),
          walletAPI.getAllTransfers(),
        ]);
        const normalized = (txResponse.transactions || [])
          .map(normalizeTransaction)
          .filter(Boolean);
            const normalizedTransfers = (transferResponse.transfers || [])
              .map((transfer) => {
                const amount = parseFloat(transfer.amount || 0);
                const dateValue = transfer.createdAt || transfer.transferDate || new Date().toISOString();
                const dateObj = dateValue ? new Date(dateValue) : null;
                if (!dateObj || Number.isNaN(dateObj.getTime())) return null;

                return {
                  id: `transfer-${transfer.transferId}`,
                  fromWalletId: transfer.fromWallet?.walletId,
                  toWalletId: transfer.toWallet?.walletId,
                  amount,
                  type: "transfer",
                  date: dateObj,
                  sourceWallet: transfer.fromWallet?.walletName || "Ví nguồn",
                  targetWallet: transfer.toWallet?.walletName || "Ví đích",
                  note: transfer.note || "",
                  currency: transfer.currencyCode || "VND",
                  createdBy: transfer.createdBy || transfer.userId || transfer.user?.userId || transfer.user?.id,
                  createdByEmail: transfer.createdByEmail || transfer.userEmail || transfer.user?.email,
                };
              })
              .filter(Boolean);
        
        if (mounted) {
          setTransactions(normalized);
          setTransfers(normalizedTransfers);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Không thể tải dữ liệu báo cáo.");
        }
      } finally {
        if (mounted) {
          setLoadingTransactions(false);
        }
      }
    };
    loadTransactions();
    return () => {
      mounted = false;
    };
  }, []);

  const formatCompactNumber = (value) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const filteredWallets = useMemo(() => {
    const keyword = walletSearch.trim().toLowerCase();
    const filtered = keyword
      ? wallets.filter((wallet) => (wallet.name || "").toLowerCase().includes(keyword))
      : wallets;
    // Sắp xếp theo thứ tự ưu tiên
    return sortWalletsByMode(filtered, "default");
  }, [wallets, walletSearch]);

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId),
    [wallets, selectedWalletId]
  );
  const walletTransactions = useMemo(() => {
    if (!selectedWalletId) return [];
    const walletId = Number(selectedWalletId);
    const externalTxs = transactions.filter((tx) => tx.walletId === walletId);
    const walletTransfers = transfers.filter((tf) => 
      tf.fromWalletId === walletId || tf.toWalletId === walletId
    );
    const all = [...externalTxs, ...walletTransfers].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB - dateA;
    });
    return all;
  }, [transactions, transfers, selectedWalletId]);

  // Pagination logic
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(walletTransactions.length / PAGE_SIZE));
  }, [walletTransactions.length]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return walletTransactions.slice(start, start + PAGE_SIZE);
  }, [walletTransactions, currentPage]);

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

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Reset page when wallet changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWalletId]);

  // Export PDF function
  const handleExportPDF = () => {
    if (!selectedWallet || walletTransactions.length === 0) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(t("reports.export_pdf_error"));
      return;
    }

    const walletName = selectedWallet.name || "Ví";
    const dateRange = range === "day" ? "Ngày" : range === "week" ? "Tuần" : range === "month" ? "Tháng" : "Năm";
    const currentDate = formatDate(new Date());

    // Build HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Báo cáo giao dịch - ${walletName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #2d99ae;
              margin-bottom: 10px;
            }
            .report-info {
              margin-bottom: 20px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #2d99ae;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .text-end {
              text-align: right;
            }
            .badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 0.85rem;
            }
            .badge-income {
              background-color: #d1fae5;
              color: #059669;
            }
            .badge-expense {
              background-color: #fee2e2;
              color: #dc2626;
            }
            .badge-transfer {
              background-color: #dbeafe;
              color: #0ea5e9;
            }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Báo cáo giao dịch</h1>
          <div class="report-info">
            <p><strong>Ví:</strong> ${walletName}</p>
            <p><strong>Kỳ báo cáo:</strong> ${dateRange}</p>
            <p><strong>Ngày xuất:</strong> ${currentDate}</p>
            <p><strong>Tổng số giao dịch:</strong> ${walletTransactions.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Ghi chú</th>
                <th class="text-end">Số tiền</th>
                <th>Tiền tệ</th>
                ${selectedWallet?.isShared ? '<th>Thành viên</th>' : ''}
              </tr>
            </thead>
            <tbody>
    `;

    walletTransactions.forEach((tx, index) => {
      const dateObj = tx.date instanceof Date ? tx.date : new Date(tx.date);
      const dateTimeStr = `${formatDate(dateObj)} ${formatVietnamTime(dateObj)}`.trim();

      const formatAmountOnly = (amount) => {
        const numAmount = Number(amount) || 0;
        return numAmount.toLocaleString("vi-VN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
      };

      let typeBadge = "";
      let amountDisplay = "";
      if (tx.type === "transfer") {
        typeBadge = '<span class="badge badge-transfer">Chuyển khoản</span>';
        amountDisplay = formatAmountOnly(tx.amount);
      } else if (tx.type === "income") {
        typeBadge = '<span class="badge badge-income">Thu nhập</span>';
        amountDisplay = "+" + formatAmountOnly(tx.amount);
      } else {
        typeBadge = '<span class="badge badge-expense">Chi tiêu</span>';
        amountDisplay = "-" + formatAmountOnly(tx.amount);
      }

      const txCreatedBy = tx.createdBy || tx.userId;
      const isCreatedByCurrentUser = currentUserId && txCreatedBy && (
        String(txCreatedBy) === String(currentUserId) ||
        String(txCreatedBy) === String(currentUser?.id)
      );
      
      const displayEmail = isCreatedByCurrentUser && currentUserEmail
        ? currentUserEmail
        : (tx.createdByEmail || null);
      
      const walletMemberEmails = selectedWallet?.isShared && Array.isArray(selectedWallet.sharedEmails)
        ? selectedWallet.sharedEmails.filter(email => email && typeof email === 'string' && email.trim())
        : [];

      let memberCell = "";
      if (selectedWallet?.isShared) {
        if (displayEmail) {
          memberCell = `<td>${displayEmail}</td>`;
        } else if (walletMemberEmails.length > 0) {
          memberCell = `<td>${walletMemberEmails.slice(0, 2).join(", ")}${walletMemberEmails.length > 2 ? ` +${walletMemberEmails.length - 2}` : ""}</td>`;
        } else {
          memberCell = "<td>-</td>";
        }
      }

      htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td>${dateTimeStr}</td>
          <td>${typeBadge}</td>
          <td>${tx.note || "-"}</td>
          <td class="text-end">${amountDisplay}</td>
          <td>${tx.currency || "VND"}</td>
          ${memberCell}
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const chartData = useMemo(() => buildChartData(walletTransactions, range), [walletTransactions, range]);
  const chartMaxValue = chartData.reduce((max, item) => Math.max(max, item.income, item.expense), 0);
  const yAxisTicks = useMemo(() => {
    if (!chartMaxValue) return [0];
    const divisions = 5;
    const step = Math.max(1, Math.ceil(chartMaxValue / divisions));
    const ticks = [];
    for (let i = divisions; i >= 0; i -= 1) {
      ticks.push(step * i);
    }
    return ticks;
  }, [chartMaxValue]);
  const chartSummary = useMemo(() => {
    return chartData.reduce(
      (acc, item) => {
        acc.income += item.income;
        acc.expense += item.expense;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [chartData]);
  const chartNet = chartSummary.income - chartSummary.expense;

  const summary = useMemo(() => {
    return walletTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "income") acc.income += tx.amount;
        else acc.expense += tx.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [walletTransactions]);

  const currency = selectedWallet?.currency || "VND";
  const net = summary.income - summary.expense;

  const safeFunds = useMemo(() => (Array.isArray(funds) ? funds : []), [funds]);

  const fundSummary = useMemo(() => {
    if (!safeFunds.length) {
      return {
        total: 0,
        totalCurrent: 0,
        totalTarget: 0,
        progressPct: 0,
        termCount: 0,
        nearingDeadline: 0,
        completed: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeFunds = safeFunds.filter((fund) => (fund.status || "").toUpperCase() !== "CLOSED");
    const totalCurrent = activeFunds.reduce(
      (sum, fund) => sum + (Number(fund.currentAmount ?? fund.current ?? 0) || 0),
      0
    );
    const totalTarget = activeFunds.reduce(
      (sum, fund) => sum + (Number(fund.targetAmount ?? fund.target ?? 0) || 0),
      0
    );
    const termFunds = activeFunds.filter((fund) => fund.hasDeadline || fund.hasTerm);
    const nearingDeadline = termFunds.reduce((count, fund) => {
      if (!fund.endDate) return count;
      const endDate = new Date(fund.endDate);
      if (Number.isNaN(endDate.getTime())) return count;
      const diffDays = (endDate.getTime() - today.getTime()) / MS_PER_DAY;
      if (diffDays <= 30 && diffDays >= 0) return count + 1;
      return count;
    }, 0);
    const completed = activeFunds.filter(isFundCompleted).length;
    const progressPct = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

    return {
      total: activeFunds.length,
      totalCurrent,
      totalTarget,
      progressPct,
      termCount: termFunds.length,
      nearingDeadline,
      completed,
    };
  }, [safeFunds]);

  const fundFilterCounts = useMemo(() => {
    const counts = {
      all: safeFunds.length,
      flexible: 0,
      term: 0,
    };

    safeFunds.forEach((fund) => {
      if (fund.hasDeadline || fund.hasTerm) counts.term += 1;
      else counts.flexible += 1;
    });

    return counts;
  }, [safeFunds]);

  const fundCompletionCounts = useMemo(() => {
    return safeFunds.reduce(
      (acc, fund) => {
        if (isFundCompleted(fund)) acc.completed += 1;
        else acc.active += 1;
        return acc;
      },
      { active: 0, completed: 0 }
    );
  }, [safeFunds]);

  const fundFilterOptions = useMemo(
    () => FUND_FILTERS.map((filter) => ({ ...filter, label: t(filter.labelKey) })),
    [t]
  );

  const fundCompletionOptions = useMemo(
    () => [
      {
        value: "active",
        label: t("reports.funds.completion.active"),
        count: fundCompletionCounts.active,
      },
      {
        value: "completed",
        label: t("reports.funds.completion.completed"),
        count: fundCompletionCounts.completed,
      },
    ],
    [fundCompletionCounts, t]
  );

  const filteredFundsList = useMemo(() => {
    if (!safeFunds.length) return [];
    const keyword = fundSearch.trim().toLowerCase();

    const matchesFilter = (fund) => {
      switch (fundFilter) {
        case "flexible":
          return !(fund.hasDeadline || fund.hasTerm);
        case "term":
          return !!(fund.hasDeadline || fund.hasTerm);
        default:
          return true;
      }
    };

    const matchesCompletion = (fund) => {
      const completed = isFundCompleted(fund);
      if (fundCompletionFilter === "completed") return completed;
      return !completed;
    };

    const matchesSearch = (fund) => {
      if (!keyword) return true;
      const name = (fund.fundName || fund.name || "").toLowerCase();
      const note = (fund.note || "").toLowerCase();
      return name.includes(keyword) || note.includes(keyword);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const computeDaysRemaining = (fund) => {
      const endDate = normalizeDate(fund.endDate);
      if (!endDate) return null;
      return Math.ceil((endDate.getTime() - today.getTime()) / MS_PER_DAY);
    };

    return safeFunds
      .filter((fund) => matchesFilter(fund) && matchesCompletion(fund) && matchesSearch(fund))
      .map((fund) => {
        const fundId = getFundIdentity(fund);
        const targetValue = Number(fund.targetAmount ?? fund.target ?? 0) || 0;
        const currentValue = Number(fund.currentAmount ?? fund.current ?? 0) || 0;
        const progressPct = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
        const daysRemaining = computeDaysRemaining(fund);
        return {
          fund,
          progressPct,
          daysRemaining,
          hasDeadline: !!(fund.hasDeadline || fund.hasTerm),
        };
      })
      .sort((a, b) => {
        const aHasDeadline = a.hasDeadline && a.daysRemaining !== null;
        const bHasDeadline = b.hasDeadline && b.daysRemaining !== null;
        if (aHasDeadline && bHasDeadline && a.daysRemaining !== b.daysRemaining) {
          return a.daysRemaining - b.daysRemaining;
        }
        if (aHasDeadline !== bHasDeadline) {
          return aHasDeadline ? -1 : 1;
        }

        return a.progressPct - b.progressPct;
      })
      .map((item) => item.fund);
  }, [safeFunds, fundFilter, fundSearch, fundCompletionFilter]);

  useEffect(() => {
    if (!filteredFundsList.length) {
      if (selectedFundId !== null) {
        setSelectedFundId(null);
      }
      return;
    }

    const exists = filteredFundsList.some((fund) => getFundIdentity(fund) === selectedFundId);
    if (!exists) {
      setSelectedFundId(getFundIdentity(filteredFundsList[0]));
    }
  }, [filteredFundsList, selectedFundId]);

  const selectedFund = useMemo(() => {
    if (!filteredFundsList.length) return null;
    if (selectedFundId) {
      const match = filteredFundsList.find((fund) => getFundIdentity(fund) === selectedFundId);
      if (match) return match;
    }
    return filteredFundsList[0] || null;
  }, [filteredFundsList, selectedFundId]);

  const selectedFundIdentity = useMemo(() => getFundIdentity(selectedFund), [selectedFund]);

  useEffect(() => {
    if (activeReportTab !== "funds") {
      setFundHistoryLoading(false);
      return;
    }
    if (!selectedFund || !selectedFundIdentity) {
      setFundHistoryItems([]);
      setFundHistoryError(false);
      setFundHistoryLoading(false);
      return;
    }

    let cancelled = false;
    const numericId = Number(selectedFund?.fundId ?? selectedFund?.id ?? selectedFundIdentity);
    if (!numericId || Number.isNaN(numericId)) {
      setFundHistoryItems([]);
      setFundHistoryError(false);
      setFundHistoryLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setFundHistoryLoading(true);
      setFundHistoryError(false);
      try {
        const result = await getFundTransactions(numericId, 20);
        if (cancelled) return;
        if (result?.response?.ok && result?.data) {
          const list = Array.isArray(result.data)
            ? result.data
            : result.data.transactions || [];
          setFundHistoryItems(list);
        } else {
          setFundHistoryItems([]);
          setFundHistoryError(true);
        }
      } catch (err) {
        if (!cancelled) {
          setFundHistoryItems([]);
          setFundHistoryError(true);
        }
      } finally {
        if (!cancelled) {
          setFundHistoryLoading(false);
        }
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [activeReportTab, selectedFund, selectedFundIdentity]);

  const selectedFundGoal = useMemo(() => buildFundGoalStats(selectedFund), [selectedFund]);

  const selectedFundFrequencyLabel = useMemo(() => {
    if (!selectedFund) return null;
    const freqKey = selectedFund.frequency ? String(selectedFund.frequency).toUpperCase() : null;
    if (!freqKey) return null;
    const translationKey = FUND_FREQUENCY_LABELS[freqKey] || FUND_FREQUENCY_LABELS.CUSTOM;
    return t(translationKey);
  }, [selectedFund, t]);

  const describeRemainingDays = useCallback(
    (days) => {
      if (days == null) return t("reports.funds.detail.no_deadline");
      if (days > 0) return t("reports.funds.days_left", { count: days });
      if (days === 0) return t("reports.funds.deadline_today");
      return t("reports.funds.days_overdue", { count: Math.abs(days) });
    },
    [t]
  );

  const hasSelectedFundTarget = (selectedFundGoal?.targetValue ?? 0) > 0;
  const selectedFundProgressPct = selectedFundGoal?.progressPct ?? 0;
  const selectedFundExpectedPct = selectedFundGoal?.expectedPct ?? null;
  const paceStatus = selectedFundGoal?.paceStatus || "unknown";
  const fundPaceLabel = paceStatus !== "unknown"
    ? t(`reports.funds.detail.pace.${paceStatus}`)
    : t("reports.funds.detail.pace.unknown");
  const selectedFundRemainingLabel = describeRemainingDays(selectedFundGoal?.remainingDays ?? null);
  const selectedFundCurrentLabel = formatCurrency(selectedFundGoal?.currentValue ?? 0);
  const selectedFundTargetLabel = hasSelectedFundTarget
    ? formatCurrency(selectedFundGoal?.targetValue ?? 0)
    : t("reports.funds.detail.no_target");
  const selectedFundShortageLabel = hasSelectedFundTarget
    ? formatCurrency(selectedFundGoal?.shortage ?? 0)
    : "--";
  const selectedFundDailyNeeded = selectedFundGoal?.neededPerDay && selectedFundGoal.neededPerDay > 0
    ? formatCurrency(selectedFundGoal.neededPerDay)
    : null;
  const selectedFundPeriodContribution = selectedFundGoal?.amountPerPeriodValue || null;
  const selectedFundStartLabel = selectedFundGoal?.startDate
    ? formatDateSafe(selectedFundGoal.startDate)
    : "-";
  const selectedFundEndLabel = selectedFundGoal?.endDate
    ? formatDateSafe(selectedFundGoal.endDate)
    : t("reports.funds.detail.no_deadline");
  const selectedFundCurrency = selectedFund?.currency || "VND";
  
  // Transaction history for growth chart (for non-term funds)
  const selectedFundTransactionHistory = useMemo(() => {
    if (!fundHistoryItems || fundHistoryItems.length === 0) return [];
    
    return fundHistoryItems
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
          ? -parseAmountNonNegative(tx.amount, 0)
          : parseAmountNonNegative(tx.amount, 0),
        type: tx.type
      }));
  }, [fundHistoryItems]);

  // Growth chart data for non-term funds
  const selectedFundGrowthChartData = useMemo(() => {
    if (!selectedFund || (selectedFund.hasDeadline || selectedFund.hasTerm)) return null;
    
    if (!selectedFundTransactionHistory || selectedFundTransactionHistory.length === 0) {
      return { points: [], cumulative: 0, max: 0, totalDeposited: 0, totalWithdrawn: 0, totalTransactions: 0, totalWithdrawals: 0 };
    }
    
    const sorted = [...selectedFundTransactionHistory].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    let cumulative = 0;
    const points = sorted.map((tx) => {
      cumulative += tx.amount;
      return {
        date: tx.date,
        amount: tx.amount,
        cumulative: Math.max(0, cumulative),
        type: tx.type
      };
    });
    
    const maxCumulative = Math.max(...points.map(p => p.cumulative), 1);
    const totalWithdrawn = points
      .filter(p => p.type === 'WITHDRAW')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);
    const totalDeposited = points
      .filter(p => p.type !== 'WITHDRAW')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      points: points,
      cumulative: cumulative,
      max: maxCumulative,
      totalTransactions: points.filter(p => p.type !== 'WITHDRAW').length,
      totalWithdrawals: points.filter(p => p.type === 'WITHDRAW').length,
      totalWithdrawn: totalWithdrawn,
      totalDeposited: totalDeposited
    };
  }, [selectedFund, selectedFundTransactionHistory]);

  const selectedFundHistoryEntries = useMemo(() => {
    if (!fundHistoryItems.length) return [];
    const fallbackDate = t("reports.funds.detail.history_no_date");
    return [...fundHistoryItems]
      .sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.transactionDate || a?.transactionAt || 0);
        const bDate = new Date(b?.createdAt || b?.transactionDate || b?.transactionAt || 0);
        return bDate - aDate;
      })
      .slice(0, FUND_HISTORY_LIMIT)
      .map((tx, index) => {
        const meta = getFundHistoryTypeMeta(tx?.type);
        const amountValue = Math.abs(Number(tx?.amount) || 0);
        const rawDate = tx?.createdAt || tx?.transactionDate || tx?.transactionAt || tx?.date;
        let dateLabel = fallbackDate;
        if (rawDate) {
          const dateObj = new Date(rawDate);
          if (!Number.isNaN(dateObj.getTime())) {
            const datePart = formatDate(dateObj);
            const timePart = formatVietnamTime(dateObj);
            dateLabel = `${datePart} ${timePart}`.trim();
          }
        }
        const note = (tx?.note || tx?.description || tx?.message || tx?.remark || "").trim();
        const normalizedStatus = (tx?.status || "").toUpperCase();
        const isSuccess = normalizedStatus === "SUCCESS";
        return {
          id: tx?.transactionId || tx?.id || `${rawDate || "history"}-${index}`,
          typeLabel: t(meta.labelKey),
          direction: meta.direction,
          amountLabel: `${meta.direction === "out" ? "-" : "+"}${formatCurrency(amountValue)}`,
          statusLabel: isSuccess
            ? t("reports.funds.detail.history_success")
            : t("reports.funds.detail.history_failed"),
          status: isSuccess ? "success" : "failed",
          dateLabel,
          note,
        };
      });
  }, [fundHistoryItems, formatCurrency, formatDate, t]);

  const budgetUsageList = useMemo(() => {
    if (!Array.isArray(budgets) || budgets.length === 0) return [];
    return budgets
      .map((budget) => {
        const limit = Number(budget.amountLimit ?? budget.limitAmount ?? 0) || 0;
        let spent = Number(budget.spentAmount ?? 0) || 0;
        if (budget.startDate && budget.endDate) {
          const computedSpent = getSpentForBudget(budget);
          if (typeof computedSpent === "number" && computedSpent > spent) {
            spent = computedSpent;
          }
        }
        const usageRaw = limit > 0 ? (spent / limit) * 100 : 0;
        const warningThreshold = Number(budget.warningThreshold ?? budget.alertPercentage ?? 80) || 80;
        let status = "ok";
        if (usageRaw >= 100) status = "exceeded";
        else if (usageRaw >= warningThreshold) status = "warning";

        return {
          id: budget.id ?? budget.budgetId ?? `${budget.categoryName}-${budget.walletId ?? "all"}`,
          categoryName: budget.categoryName || "Budget",
          walletName:
            budget.walletName ||
            (budget.walletId === null || budget.walletId === undefined ? t("wallets.all") ?? "Tất cả ví" : ""),
          limit,
          spent,
          usage: Math.min(Math.max(usageRaw, 0), 200),
          status,
          startDate: budget.startDate,
          endDate: budget.endDate,
        };
      })
      .sort((a, b) => b.usage - a.usage);
  }, [budgets, getSpentForBudget, t]);

  const topBudgetUsage = useMemo(() => budgetUsageList.slice(0, 4), [budgetUsageList]);

  const budgetSummary = useMemo(() => {
    const total = budgets.length;
    if (budgetUsageList.length === 0) {
      return {
        total,
        totalLimit: 0,
        totalSpent: 0,
        utilization: 0,
        warningCount: 0,
        exceededCount: 0,
        okCount: total,
      };
    }

    const totalLimit = budgetUsageList.reduce((sum, item) => sum + item.limit, 0);
    const totalSpent = budgetUsageList.reduce((sum, item) => sum + item.spent, 0);
    const warningCount = budgetUsageList.filter((item) => item.status === "warning").length;
    const exceededCount = budgetUsageList.filter((item) => item.status === "exceeded").length;
    const okCount = Math.max(total - warningCount - exceededCount, 0);
    const utilization = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 150) : 0;

    return {
      total,
      totalLimit,
      totalSpent,
      utilization,
      warningCount,
      exceededCount,
      okCount,
    };
  }, [budgetUsageList, budgets.length]);

  // Filter budgets based on filters
  const filteredBudgetUsageList = useMemo(() => {
    let filtered = [...budgetUsageList];
    
    // Filter by wallet
    if (budgetWalletFilter !== "all") {
      filtered = filtered.filter((budget) => {
        const walletName = budget.walletName || "";
        const allWalletsLabel = t("wallets.all") || "Tất cả ví";
        if (budgetWalletFilter === "all_wallets" || walletName === allWalletsLabel || walletName === "Tất cả ví") {
          return walletName === allWalletsLabel || walletName === "Tất cả ví";
        }
        return String(walletName) === String(budgetWalletFilter);
      });
    }
    
    // Filter by status
    if (budgetStatusFilter !== "all") {
      filtered = filtered.filter((budget) => budget.status === budgetStatusFilter);
    }
    
    // Filter by category
    if (budgetCategoryFilter !== "all") {
      filtered = filtered.filter((budget) => budget.categoryName === budgetCategoryFilter);
    }
    
    return filtered;
  }, [budgetUsageList, budgetWalletFilter, budgetStatusFilter, budgetCategoryFilter, t]);

  // Budget status distribution for donut chart
  const budgetStatusDistribution = useMemo(() => {
    const okCount = filteredBudgetUsageList.filter((b) => b.status === "ok").length;
    const warningCount = filteredBudgetUsageList.filter((b) => b.status === "warning").length;
    const exceededCount = filteredBudgetUsageList.filter((b) => b.status === "exceeded").length;
    
    return [
      { label: t("reports.budgets.status.ok"), value: okCount, color: "#10b981" },
      { label: t("reports.budgets.status.warning"), value: warningCount, color: "#f59e0b" },
      { label: t("reports.budgets.status.exceeded"), value: exceededCount, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [filteredBudgetUsageList, t]);

  // Top 3 dangerous budgets
  const topDangerousBudgets = useMemo(() => {
    return filteredBudgetUsageList
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3)
      .map((budget) => ({
        ...budget,
        remaining: Math.max(0, budget.limit - budget.spent),
        exceeded: Math.max(0, budget.spent - budget.limit),
      }));
  }, [filteredBudgetUsageList]);

  // Time comparison data (this period vs last period)
  const timeComparisonData = useMemo(() => {
    const now = new Date();
    let thisPeriodStart, thisPeriodEnd, lastPeriodStart, lastPeriodEnd;
    
    if (budgetTimeFilter === "this_month" || budgetTimeFilter === "last_month") {
      const year = now.getFullYear();
      const month = now.getMonth();
      
      if (budgetTimeFilter === "this_month") {
        thisPeriodStart = new Date(year, month, 1);
        thisPeriodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        lastPeriodStart = new Date(year, month - 1, 1);
        lastPeriodEnd = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        thisPeriodStart = new Date(year, month - 1, 1);
        thisPeriodEnd = new Date(year, month, 0, 23, 59, 59, 999);
        lastPeriodStart = new Date(year, month - 2, 1);
        lastPeriodEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
      }
    } else {
      // Week comparison
      const dayOfWeek = now.getDay() || 7;
      const monday = addDays(now, 1 - dayOfWeek);
      
      if (budgetTimeFilter === "this_week") {
        thisPeriodStart = new Date(monday);
        thisPeriodEnd = addDays(monday, 6);
        thisPeriodEnd.setHours(23, 59, 59, 999);
        lastPeriodStart = addDays(monday, -7);
        lastPeriodEnd = addDays(monday, -1);
        lastPeriodEnd.setHours(23, 59, 59, 999);
      } else {
        thisPeriodStart = addDays(monday, -7);
        thisPeriodEnd = addDays(monday, -1);
        thisPeriodEnd.setHours(23, 59, 59, 999);
        lastPeriodStart = addDays(monday, -14);
        lastPeriodEnd = addDays(monday, -8);
        lastPeriodEnd.setHours(23, 59, 59, 999);
      }
    }
    
    // Calculate spending for each budget in both periods
    const thisPeriodSpent = filteredBudgetUsageList.reduce((sum, budget) => {
      // Filter transactions for this period
      const spent = getSpentForBudget({
        ...budget,
        startDate: thisPeriodStart.toISOString().split('T')[0],
        endDate: thisPeriodEnd.toISOString().split('T')[0],
      });
      return sum + spent;
    }, 0);
    
    const lastPeriodSpent = filteredBudgetUsageList.reduce((sum, budget) => {
      const spent = getSpentForBudget({
        ...budget,
        startDate: lastPeriodStart.toISOString().split('T')[0],
        endDate: lastPeriodEnd.toISOString().split('T')[0],
      });
      return sum + spent;
    }, 0);
    
    const percentChange = lastPeriodSpent > 0 
      ? ((thisPeriodSpent - lastPeriodSpent) / lastPeriodSpent) * 100 
      : 0;
    
    return {
      thisPeriod: thisPeriodSpent,
      lastPeriod: lastPeriodSpent,
      percentChange,
      thisPeriodStart,
      thisPeriodEnd,
      lastPeriodStart,
      lastPeriodEnd,
    };
  }, [filteredBudgetUsageList, budgetTimeFilter, getSpentForBudget]);

  // Smart suggestions
  const budgetSuggestions = useMemo(() => {
    const suggestions = [];
    
    // Check for budgets that are frequently exceeded at end of period
    const exceededBudgets = filteredBudgetUsageList.filter((b) => b.status === "exceeded");
    if (exceededBudgets.length > 0) {
      const exceededPercent = (exceededBudgets.length / filteredBudgetUsageList.length) * 100;
      if (exceededPercent >= 70) {
        suggestions.push({
          type: "end_period",
          message: t("reports.budgets.suggestions.end_period", { percent: Math.round(exceededPercent) }),
        });
      }
    }
    
    // Check for budgets that need limit increase
    const warningBudgets = filteredBudgetUsageList.filter((b) => b.status === "warning");
    warningBudgets.forEach((budget) => {
      if (budget.usage >= 95) {
        const suggestedIncrease = Math.round((budget.spent / budget.limit) * 100) - 100 + 10;
        suggestions.push({
          type: "increase_limit",
          message: t("reports.budgets.suggestions.increase_limit", {
            category: budget.categoryName,
            percent: suggestedIncrease,
          }),
        });
      }
    });
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }, [filteredBudgetUsageList, t]);

  const handleViewHistory = useCallback(() => {
    if (!selectedWalletId) return;
    setShowHistory((prev) => !prev);
  }, [selectedWalletId]);

  const reportTabs = useMemo(
    () => [
      { key: "wallets", label: t("reports.tabs.wallets"), icon: "bi-wallet2" },
      { key: "funds", label: t("reports.tabs.funds"), icon: "bi-piggy-bank" },
      { key: "budgets", label: t("reports.tabs.budgets"), icon: "bi-pie-chart" },
    ],
    [t]
  );

  return (
    <div className="reports-page container-fluid tx-page py-4">
      <div className="tx-page-inner">
        <div className="wallet-header">
          <div className="wallet-header-left">
            <div className="wallet-header-icon">
              <i className="bi bi-graph-up" />
            </div>
            <div>
              <h2 className="wallet-header-title">{t("reports.title")}</h2>
              <p className="wallet-header-subtitle">{t("reports.subtitle")}</p>
            </div>
          </div>
          <div className="wallet-header-right">
            <div className="reports-tab-toggle">
              {reportTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`reports-tab-btn ${activeReportTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveReportTab(tab.key)}
                >
                  <i className={`bi ${tab.icon}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="reports-content">
        {activeReportTab === "wallets" && (
          <div className="reports-layout">
          <div className="reports-wallet-card card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">{t("reports.wallets.title")}</h5>
                  <p className="text-muted mb-0 small">{t("reports.wallets.desc")}</p>
                </div>
                <span className="badge rounded-pill text-bg-light">{wallets.length} {t("wallets.count_unit")}</span>
              </div>
              <div className="reports-wallet-search mb-3">
                <i className="bi bi-search" />
                <input
                  type="text"
                  className="form-control"
                  placeholder={t("wallets.search_placeholder")}
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                />
              </div>
              <div className="reports-wallet-list">
                {walletsLoading ? (
                  <div className="text-center py-4 text-muted small">{t("common.loading")}</div>
                ) : filteredWallets.length === 0 ? (
                  <div className="text-center py-4 text-muted small">{t("reports.wallets.not_found")}</div>
                ) : (
                  filteredWallets.map((wallet) => {
                    const isPersonal = !wallet.isShared && !(wallet.walletRole || wallet.sharedRole || wallet.role);
                    const ownerId = wallet.ownerUserId || wallet.ownerId || wallet.createdBy || wallet.userId;
                    const isOwnedByCurrentUser = ownerId && currentUserId
                      ? String(ownerId) === String(currentUserId)
                      : !wallet.isShared;
                    const showDefaultBadge = wallet.isDefault && isOwnedByCurrentUser;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        className={`reports-wallet-item ${selectedWalletId === wallet.id ? "active" : ""}`}
                        onClick={() => setSelectedWalletId(wallet.id)}
                      >
                        <div>
                          <p className="wallet-name mb-1">{wallet.name}</p>
                          <div className="wallet-tags">
                            {showDefaultBadge && <span className="badge rounded-pill text-bg-primary">Mặc định</span>}
                            {isPersonal && <span className="badge rounded-pill text-bg-secondary">Ví cá nhân</span>}
                            {wallet.isShared && <span className="badge rounded-pill text-bg-info">Ví nhóm</span>}
                          </div>
                        </div>
                        <div className="wallet-balance text-end">
                          <p className="mb-0 fw-semibold">{formatCurrency(Number(wallet.balance) || 0)}</p>
                          <small className="text-muted">{wallet.currency || "VND"}</small>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="reports-chart-card card border-0 shadow-sm">
            <div className="card-body">
              <div className="reports-chart-header-card">
                <div className="reports-chart-header">
                  <div>
                    <p className="text-muted mb-1">{t("reports.selected_wallet_label")}</p>
                    <h4 className="mb-1">{selectedWallet?.name || t("reports.no_wallet")}</h4>
                    <div className="reports-summary-row">
                      <div>
                        <span className="summary-dot" style={{ background: INCOME_COLOR }} />
                        {t("dashboard.income")}: <strong>{formatCurrency(summary.income)}</strong>
                      </div>
                      <div>
                        <span className="summary-dot" style={{ background: EXPENSE_COLOR }} />
                        {t("dashboard.expense")}: <strong>{formatCurrency(summary.expense)}</strong>
                      </div>
                      <div>
                        <span className="summary-dot" style={{ background: net >= 0 ? "#16a34a" : "#dc2626" }} />
                        {t("reports.remaining")}: <strong>{formatCurrency(net)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="reports-header-actions">
                    <div className="reports-range-toggle">
                      {RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`reports-range-btn ${range === option.value ? "active" : ""}`}
                          onClick={() => setRange(option.value)}
                        >
                          {t(`reports.range.${option.value}`)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`reports-history-btn ${showHistory ? "active" : ""}`}
                      onClick={handleViewHistory}
                      disabled={!selectedWalletId}
                    >
                      <i className={`bi ${showHistory ? "bi-graph-up" : "bi-clock-history"}`} /> 
                      {showHistory ? t("reports.view_chart") : t("reports.view_history")}
                    </button>
                  </div>
                </div>
              </div>

              {!showHistory ? (
                <div className="reports-chart-area">
                  {loadingTransactions ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      <div className="spinner-border text-primary mb-3" role="status" />
                      <p className="mb-0">{t("transactions.loading.list")}</p>
                    </div>
                  ) : !selectedWallet ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      {t("reports.select_wallet_prompt")}
                    </div>
                  ) : error ? (
                    <div className="reports-chart-empty text-center text-danger py-5">
                      {error}
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      {t("reports.no_transactions_in_period")}
                    </div>
                  ) : (
                    <div className="reports-chart-viewport">
                      <div className="reports-chart-axis">
                        {yAxisTicks.map((value) => (
                          <div key={`tick-${value}`} className="axis-row">
                            <span className="axis-value">{formatCompactNumber(value)}</span>
                            <span className="axis-guide" />
                          </div>
                        ))}
                      </div>
                    <div
                      className="reports-chart-grid"
                      style={{
                        gridTemplateColumns:
                          range === "day"
                            ? `repeat(${chartData.length}, minmax(32px, 1fr))`
                            : range === "week"
                              ? `repeat(${chartData.length}, minmax(48px, 1fr))`
                              : range === "month"
                                ? `repeat(${chartData.length}, minmax(60px, 1fr))`
                                : `repeat(${chartData.length}, minmax(36px, 1fr))`,
                      }}
                    >
                        {chartData.map((period, index) => {
                          const scale = chartMaxValue || 1;
                          const incomeHeight = Math.round((period.income / scale) * 100);
                          const expenseHeight = Math.round((period.expense / scale) * 100);
                          return (
                            <div
                              key={period.label}
                              className="reports-chart-column"
                              onMouseEnter={() => setHoveredColumnIndex(index)}
                              onMouseLeave={() => setHoveredColumnIndex(null)}
                              onFocus={() => setHoveredColumnIndex(index)}
                              onBlur={() => setHoveredColumnIndex(null)}
                              tabIndex={0}
                            >
                              {hoveredColumnIndex === index && (
                                <div className="reports-chart-tooltip">
                                  <div>
                                    <span className="summary-dot" style={{ background: INCOME_COLOR }} />
                                    {formatCompactNumber(period.income)}
                                  </div>
                                  <div>
                                    <span className="summary-dot" style={{ background: EXPENSE_COLOR }} />
                                    {formatCompactNumber(period.expense)}
                                  </div>
                                </div>
                              )}
                              <div className="reports-chart-bars">
                                <div className="reports-chart-bar-wrapper">
                                  <div
                                    className="reports-chart-bar income"
                                    style={{ height: `${incomeHeight}%`, background: INCOME_COLOR }}
                                  />
                                </div>
                                <div className="reports-chart-bar-wrapper">
                                  <div
                                    className="reports-chart-bar expense"
                                    style={{ height: `${expenseHeight}%`, background: EXPENSE_COLOR }}
                                  />
                                </div>
                              </div>
                              <p className="reports-chart-label">{period.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="reports-history-area">
                  {loadingTransactions ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      <div className="spinner-border text-primary mb-3" role="status" />
                      <p className="mb-0">{t("transactions.loading.list")}</p>
                    </div>
                  ) : !selectedWallet ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      {t("reports.select_wallet_prompt")}
                    </div>
                  ) : error ? (
                    <div className="reports-chart-empty text-center text-danger py-5">
                      {error}
                    </div>
                  ) : walletTransactions.length === 0 ? (
                    <div className="reports-chart-empty text-center text-muted py-5">
                      {t("reports.no_transactions_in_period")}
                    </div>
                  ) : (
                    <div className="reports-history-list">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th style={{ width: "60px" }}>{t("transactions.table.no")}</th>
                            <th>{t("transactions.table.time")}</th>
                            <th>{t("transactions.table.type")}</th>
                            <th>{t("transactions.table.note")}</th>
                            <th className="text-end">{t("transactions.table.amount")}</th>
                            <th>{t("transactions.table.currency")}</th>
                            {selectedWallet?.isShared && (
                              <th>{t("transactions.table.member") || "Thành viên"}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTransactions.map((tx, index) => {
                            const dateObj = tx.date instanceof Date ? tx.date : new Date(tx.date);
                            const dateTimeStr = `${formatDate(dateObj)} ${formatVietnamTime(dateObj)}`.trim();
                            const formatAmountOnly = (amount) => {
                              const numAmount = Number(amount) || 0;
                              return numAmount.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              });
                            };
                            
                            // Kiểm tra xem giao dịch có được tạo bởi user hiện tại không
                            const txCreatedBy = tx.createdBy || tx.userId;
                            const isCreatedByCurrentUser = currentUserId && txCreatedBy && (
                              String(txCreatedBy) === String(currentUserId) ||
                              String(txCreatedBy) === String(currentUser?.id)
                            );
                            
                            // Nếu là người tạo giao dịch, hiển thị email của chính mình
                            // Nếu không, hiển thị email của người tạo (nếu có) hoặc danh sách thành viên
                            const displayEmail = isCreatedByCurrentUser && currentUserEmail
                              ? currentUserEmail
                              : (tx.createdByEmail || null);
                            
                            // Lấy danh sách email thành viên từ wallet (nếu không phải người tạo)
                            const walletMemberEmails = selectedWallet?.isShared && Array.isArray(selectedWallet.sharedEmails)
                              ? selectedWallet.sharedEmails.filter(email => email && typeof email === 'string' && email.trim())
                              : [];

                            return (
                              <tr key={tx.id}>
                                <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                <td className="fw-medium">{dateTimeStr}</td>
                                <td>
                                  {tx.type === "transfer" ? (
                                    <span className="badge bg-info-subtle text-info" style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "6px" }}>
                                      {t("transactions.type.transfer")}
                                    </span>
                                  ) : (
                                    <span
                                      className={`badge ${tx.type === "income" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        backgroundColor: tx.type === "income" ? "#d1fae5" : "#fee2e2",
                                        color: tx.type === "income" ? "#059669" : "#dc2626",
                                      }}
                                    >
                                      {tx.type === "income" ? t("transactions.type.income") : t("transactions.type.expense")}
                                    </span>
                                  )}
                                </td>
                                <td className="tx-note-cell" title={tx.note || "-"}>{tx.note || "-"}</td>
                                <td className="text-end">
                                  {tx.type === "transfer" ? (
                                    <span
                                      style={{
                                        color: "#0ea5e9",
                                        fontWeight: "600",
                                        fontSize: "0.95rem",
                                      }}
                                    >
                                      {formatAmountOnly(tx.amount)}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: tx.type === "expense" ? "#dc2626" : "#16a34a",
                                        fontWeight: "600",
                                        fontSize: "0.95rem",
                                      }}
                                    >
                                      {tx.type === "expense" ? "-" : "+"}{formatAmountOnly(tx.amount)}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark" style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "6px", fontWeight: "500" }}>
                                    {tx.currency || "VND"}
                                  </span>
                                </td>
                                {selectedWallet?.isShared && (
                                  <td>
                                    {displayEmail ? (
                                      <span 
                                        className="badge bg-primary-subtle text-primary" 
                                        style={{ 
                                          fontSize: "0.7rem", 
                                          padding: "3px 6px", 
                                          borderRadius: "4px",
                                          maxWidth: "150px",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          fontWeight: isCreatedByCurrentUser ? "600" : "500"
                                        }}
                                        title={displayEmail}
                                      >
                                        {displayEmail}
                                      </span>
                                    ) : walletMemberEmails.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                        {walletMemberEmails.slice(0, 2).map((email, idx) => (
                                          <span 
                                            key={idx} 
                                            className="badge bg-secondary-subtle text-secondary" 
                                            style={{ 
                                              fontSize: "0.7rem", 
                                              padding: "3px 6px", 
                                              borderRadius: "4px",
                                              maxWidth: "120px",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap"
                                            }}
                                            title={email}
                                          >
                                            {email}
                                          </span>
                                        ))}
                                        {walletMemberEmails.length > 2 && (
                                          <span 
                                            className="badge bg-light text-muted" 
                                            style={{ fontSize: "0.7rem", padding: "3px 6px", borderRadius: "4px" }}
                                            title={walletMemberEmails.slice(2).join(", ")}
                                          >
                                            +{walletMemberEmails.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>-</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="reports-pagination-wrapper">
                          <div className="reports-pagination">
                            <span className="text-muted small">
                              {t('common.pagination.page', { current: currentPage, total: totalPages })}
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
                                    key={`reports-page-${item}`}
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

                      {/* Export PDF Button */}
                      {walletTransactions.length > 0 && (
                        <div className="reports-export-pdf-wrapper">
                          <button
                            type="button"
                            className="btn btn-primary reports-export-pdf-btn"
                            onClick={() => handleExportPDF()}
                          >
                            <i className="bi bi-file-earmark-pdf me-2" />
                            {t("reports.export_pdf") || "Xuất PDF"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
        {activeReportTab === "funds" && (
          <div className="reports-layout reports-layout--funds">
            <div className="funds-panel-card card border-0 shadow-sm">
              <div className="card-body">
                <div className="funds-panel-head">
                  <div>
                    <h5 className="mb-1">{t("reports.funds.section_title")}</h5>
                    <p className="text-muted mb-0 small">{t("reports.funds.section_subtitle")}</p>
                  </div>
                  <span className="badge rounded-pill text-bg-light">{fundSummary.total}</span>
                </div>
                <div className="funds-panel-metrics">
                  <div className="funds-metric">
                    <p className="funds-metric-label">{t("reports.funds.raised")}</p>
                    <strong className="funds-metric-value">{formatCurrency(fundSummary.totalCurrent)}</strong>
                  </div>
                  <div className="funds-metric">
                    <p className="funds-metric-label">{t("reports.funds.target")}</p>
                    <strong className="funds-metric-value">{formatCurrency(fundSummary.totalTarget)}</strong>
                  </div>
                  <div className="funds-metric">
                    <p className="funds-metric-label">{t("reports.funds.completed")}</p>
                    <strong className="funds-metric-value">{fundSummary.completed}</strong>
                  </div>
                </div>
                <div className="funds-panel-progress">
                  <div className="funds-panel-progress-header">
                    <span>{t("reports.funds.progress_to_target")}</span>
                    <strong>{Math.round(fundSummary.progressPct)}%</strong>
                  </div>
                  <div className="funds-panel-progress-bar">
                    <span style={{ width: `${Math.min(fundSummary.progressPct, 100)}%` }} />
                  </div>
                </div>
                <div className="funds-completion-toggle" role="group" aria-label={t("reports.funds.completion.aria_label")}>
                  {fundCompletionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`funds-completion-btn ${fundCompletionFilter === option.value ? "active" : ""}`}
                      onClick={() => setFundCompletionFilter(option.value)}
                    >
                      {option.label}
                      <span className="funds-completion-count">{option.count}</span>
                    </button>
                  ))}
                </div>
                <div className="funds-search-row">
                  <div className="funds-search">
                    <i className="bi bi-search" />
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t("reports.funds.search_placeholder")}
                      value={fundSearch}
                      onChange={(e) => setFundSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="funds-filter-chips">
                  {fundFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`funds-filter-btn ${fundFilter === option.value ? "active" : ""}`}
                      onClick={() => setFundFilter(option.value)}
                    >
                      {option.label}
                      <span className="funds-filter-count">{fundFilterCounts[option.value] ?? 0}</span>
                    </button>
                  ))}
                </div>
                <div className="funds-list">
                  {fundsLoading ? (
                    <div className="text-center text-muted small py-4">{t("reports.funds.loading")}</div>
                  ) : filteredFundsList.length === 0 ? (
                    <div className="text-center text-muted small py-4">{t("reports.funds.list.empty")}</div>
                  ) : (
                    filteredFundsList.map((fund, idx) => {
                      const fundId = getFundIdentity(fund);
                      const isActive = fundId === selectedFundId;
                      const displayName = fund.fundName || fund.name || t("reports.funds.untitled");
                      const targetValue = Number(fund.targetAmount ?? fund.target ?? 0) || 0;
                      const currentValue = Number(fund.currentAmount ?? fund.current ?? 0) || 0;
                      const progressPct = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
                      const deadlineDate = normalizeDate(fund.endDate);
                      let daysRemaining = null;
                      if (deadlineDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / MS_PER_DAY);
                      }
                      const deadlineLabel = fund.hasDeadline || fund.hasTerm
                        ? describeRemainingDays(daysRemaining)
                        : t("reports.funds.detail.no_deadline");

                      return (
                        <button
                          key={fundId || `${displayName}-${idx}`}
                          type="button"
                          className={`funds-list-item ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedFundId(fundId)}
                        >
                          <div className="funds-list-top">
                            <div>
                              <p className="funds-list-name mb-0">{displayName}</p>
                              <div className="funds-list-tags">
                                <span className="fund-tag">
                                  {(fund.fundType || fund.type || "").toLowerCase() === "group"
                                    ? t("reports.funds.filters.group")
                                    : t("reports.funds.filters.personal")}
                                </span>
                                <span className="fund-tag">
                                  {fund.hasDeadline || fund.hasTerm
                                    ? t("reports.funds.filters.term")
                                    : t("reports.funds.filters.flexible")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="funds-list-progress">
                            {targetValue > 0 ? (
                              <>
                                <div className="funds-progress-bar">
                                  <span style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="funds-progress-values">
                                  <span>{formatCurrency(currentValue)}</span>
                                  <span>{formatCurrency(targetValue)}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-muted small mb-0">{t("reports.funds.detail.no_target")}</p>
                            )}
                          </div>
                          <div className="funds-list-meta">
                            <span>{deadlineLabel}</span>
                            {(fund.targetWalletName || fund.sourceWalletName) && (
                              <span className="text-muted">
                                {fund.targetWalletName || fund.sourceWalletName}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="funds-detail-card card border-0 shadow-sm">
              <div className="card-body">
                <div className="fund-detail-header">
                  <div>
                    <p className="text-muted mb-1">{t("reports.funds.detail.selected_label")}</p>
                    <h4 className="mb-2">{selectedFund?.fundName || selectedFund?.name || t("reports.funds.detail.no_selection_short")}</h4>
                    {selectedFund && (
                      <div className="fund-detail-tags">
                        <span className="fund-tag">
                          {(selectedFund.fundType || selectedFund.type || "").toLowerCase() === "group"
                            ? t("reports.funds.filters.group")
                            : t("reports.funds.filters.personal")}
                        </span>
                        <span className={`fund-tag ${selectedFund.hasDeadline || selectedFund.hasTerm ? "fund-tag--term" : ""}`}>
                          {selectedFund.hasDeadline || selectedFund.hasTerm
                            ? t("reports.funds.filters.term")
                            : t("reports.funds.filters.flexible")}
                        </span>
                        <span className="fund-tag">{selectedFundCurrency}</span>
                        <span className={`fund-tag ${selectedFund.autoDepositEnabled ? "fund-tag--success" : "fund-tag--muted"}`}>
                          {selectedFund.autoDepositEnabled
                            ? t("reports.funds.auto_topup_on")
                            : t("reports.funds.auto_topup_off")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedFund ? (
                  <>
                    {/* Hiển thị biểu đồ tăng trưởng cho quỹ không thời hạn, biểu đồ donut và pace cho quỹ có thời hạn */}
                    {selectedFundGrowthChartData ? (
                      /* QUỸ KHÔNG THỜI HẠN: Biểu đồ tăng trưởng */
                      <div className="fund-growth-modern" style={{ marginBottom: '1.5rem' }}>
                        <div className="fund-growth-header">
                          <div>
                            <p>Tăng trưởng quỹ</p>
                            <h5>Tổng tích lũy</h5>
                          </div>
                          <div className="fund-growth-badge">
                            <i className="bi bi-graph-up-arrow"></i>
                            <span>{selectedFundGrowthChartData?.totalTransactions || 0} lần nạp{selectedFundGrowthChartData?.totalWithdrawals > 0 ? `, ${selectedFundGrowthChartData.totalWithdrawals} lần rút` : ''}</span>
                          </div>
                        </div>
                        
                        <div className="fund-growth-chart" style={{ position: 'relative' }}>
                          {selectedFundGrowthChartData && selectedFundGrowthChartData.points.length > 0 ? (
                            <>
                            <svg width="100%" height="240" viewBox="0 0 400 240" className="fund-growth-svg" style={{ overflow: 'visible' }}>
                              <defs>
                                <linearGradient id={`growthGradient-report-${selectedFund?.fundId || selectedFund?.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.05" />
                                </linearGradient>
                              </defs>
                              
                              {/* Y-axis labels */}
                              {[0, 25, 50, 75, 100].map((pct) => {
                                const value = (pct / 100) * selectedFundGrowthChartData.max;
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
                                      {formatMoney(value, selectedFundCurrency, 0)}
                                    </text>
                                  </g>
                                );
                              })}
                              
                              {/* X-axis labels */}
                              {selectedFundGrowthChartData.points.map((p, idx) => {
                                if (selectedFundGrowthChartData.points.length > 10 && idx % Math.ceil(selectedFundGrowthChartData.points.length / 5) !== 0 && idx !== selectedFundGrowthChartData.points.length - 1) {
                                  return null;
                                }
                                const x = (idx / Math.max(selectedFundGrowthChartData.points.length - 1, 1)) * 400;
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
                                d={`M 0,200 ${selectedFundGrowthChartData.points.map((p, idx) => {
                                  const x = (idx / Math.max(selectedFundGrowthChartData.points.length - 1, 1)) * 400;
                                  const y = 200 - (p.cumulative / selectedFundGrowthChartData.max) * 180;
                                  return `L ${x},${y}`;
                                }).join(' ')} L 400,200 Z`}
                                fill={`url(#growthGradient-report-${selectedFund?.fundId || selectedFund?.id})`}
                              />
                              
                              {/* Line chart */}
                              <polyline
                                points={selectedFundGrowthChartData.points.map((p, idx) => {
                                  const x = (idx / Math.max(selectedFundGrowthChartData.points.length - 1, 1)) * 400;
                                  const y = 200 - (p.cumulative / selectedFundGrowthChartData.max) * 180;
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
                              {selectedFundGrowthChartData.points.map((p, idx) => {
                                const x = (idx / Math.max(selectedFundGrowthChartData.points.length - 1, 1)) * 400;
                                const y = 200 - (p.cumulative / selectedFundGrowthChartData.max) * 180;
                                const isWithdraw = p.type === 'WITHDRAW';
                                const date = p.date ? formatVietnamDate(p.date) : '';
                                const time = p.date ? formatVietnamTime(p.date) : '';
                                
                                return (
                                  <g key={idx}>
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
                                      {chartTooltip.data.isWithdraw ? '-' : '+'}{formatMoney(Math.abs(chartTooltip.data.amount), selectedFundCurrency)}
                                    </span>
                                  </div>
                                  <div className="fund-growth-tooltip__cumulative">
                                    <span className="fund-growth-tooltip__label">Tích lũy:</span>
                                    <span className="fund-growth-tooltip__value">
                                      {formatMoney(chartTooltip.data.cumulative, selectedFundCurrency)}
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
                            <strong>{formatMoney(selectedFundGrowthChartData?.totalDeposited || 0, selectedFundCurrency)}</strong>
                            <span>{selectedFundGrowthChartData?.totalTransactions || 0} lần nạp</span>
                          </div>
                          <div className="fund-growth-stat">
                            <p>TỔNG ĐÃ RÚT</p>
                            <strong style={{ color: selectedFundGrowthChartData?.totalWithdrawn > 0 ? '#ef4444' : '#111827' }}>
                              {formatMoney(selectedFundGrowthChartData?.totalWithdrawn || 0, selectedFundCurrency)}
                            </strong>
                            <span>{selectedFundGrowthChartData?.totalWithdrawals || 0} lần rút</span>
                          </div>
                          <div className="fund-growth-stat">
                            <p>SỐ DƯ HIỆN TẠI</p>
                            <strong>{formatMoney(Number(selectedFund?.currentAmount ?? selectedFund?.current ?? 0), selectedFundCurrency)}</strong>
                            <span>Quỹ không thời hạn</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* QUỸ CÓ THỜI HẠN: Biểu đồ donut và pace */
                      <>
                        <div className="fund-detail-goal">
                          <div className="fund-progress-widget">
                            <FundProgressDonut progress={selectedFundProgressPct} />
                            <p className="fund-progress-caption">{t("reports.funds.detail.goal_focus")}</p>
                          </div>
                          <div className="fund-goal-stats">
                            <div className="fund-goal-stat fund-goal-stat--current">
                              <p>{t("reports.funds.detail.current")}</p>
                              <strong>{selectedFundCurrentLabel}</strong>
                            </div>
                            <div className="fund-goal-stat fund-goal-stat--target">
                              <p>{t("reports.funds.detail.target")}</p>
                              <strong>{selectedFundTargetLabel}</strong>
                            </div>
                            <div className="fund-goal-stat fund-goal-stat--shortage">
                              <p>{t("reports.funds.detail.shortage")}</p>
                              <strong>{selectedFundShortageLabel}</strong>
                            </div>
                            {selectedFundDailyNeeded && (
                              <div className="fund-goal-stat fund-goal-stat--daily">
                                <p>{t("reports.funds.detail.daily_needed")}</p>
                                <strong>{selectedFundDailyNeeded}</strong>
                              </div>
                            )}
                            {selectedFundPeriodContribution && (
                              <div className="fund-goal-stat fund-goal-stat--period">
                                <p>{t("reports.funds.detail.need_per_period")}</p>
                                <strong>{formatCurrency(selectedFundPeriodContribution)}</strong>
                                {selectedFundFrequencyLabel && <small>{selectedFundFrequencyLabel}</small>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="fund-pace-card">
                          <div className="fund-pace-header">
                            <div>
                              <p className="text-muted mb-1">{t("reports.funds.detail.pace_label")}</p>
                              <h5 className={`fund-pace-status fund-pace-status--${paceStatus}`}>
                                {fundPaceLabel}
                              </h5>
                            </div>
                            <span className="fund-pace-days">{selectedFundRemainingLabel}</span>
                          </div>
                          {hasSelectedFundTarget ? (
                            <>
                              <div className="fund-pace-track">
                                <span
                                  className="fund-pace-marker fund-pace-marker--actual"
                                  style={{ width: `${Math.min(selectedFundProgressPct, 100)}%` }}
                                />
                                {selectedFundExpectedPct != null && (
                                  <span
                                    className="fund-pace-marker fund-pace-marker--expected"
                                    style={{ width: `${Math.min(selectedFundExpectedPct, 100)}%` }}
                                  />
                                )}
                              </div>
                              <div className="fund-pace-legend">
                                <span>
                                  <span className="legend-dot legend-dot--actual" />
                                  {t("reports.funds.detail.actual_progress")}
                                </span>
                                {selectedFundExpectedPct != null && (
                                  <span>
                                    <span className="legend-dot legend-dot--expected" />
                                    {t("reports.funds.detail.expected_progress")}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-muted small mb-0">{t("reports.funds.detail.no_target")}</p>
                          )}
                        </div>
                      </>
                    )}
                    <div className="fund-detail-meta-grid">
                      <div>
                        <p>{t("reports.funds.detail.start_date")}</p>
                        <strong>{selectedFundStartLabel}</strong>
                      </div>
                      <div>
                        <p>{t("reports.funds.detail.deadline")}</p>
                        <strong>{selectedFundEndLabel}</strong>
                      </div>
                      <div>
                        <p>{t("reports.funds.detail.currency")}</p>
                        <strong>{selectedFundCurrency}</strong>
                      </div>
                      {selectedFundFrequencyLabel && (
                        <div>
                          <p>{t("reports.funds.detail.frequency")}</p>
                          <strong>{selectedFundFrequencyLabel}</strong>
                        </div>
                      )}
                    </div>
                    <div className="fund-history-card">
                      <div className="fund-history-header">
                        <div>
                          <p className="fund-history-title">{t("reports.funds.detail.history_title")}</p>
                          <span className="fund-history-subtitle">{t("reports.funds.detail.history_subtitle")}</span>
                        </div>
                        {fundHistoryLoading ? (
                          <span className="fund-history-pill">{t("reports.funds.detail.history_loading")}</span>
                        ) : selectedFundHistoryEntries.length > 0 ? (
                          <span className="fund-history-pill">
                            {t("reports.funds.detail.history_count", { count: selectedFundHistoryEntries.length })}
                          </span>
                        ) : null}
                      </div>
                      {fundHistoryError ? (
                        <div className="fund-history-state fund-history-state--error">
                          {t("reports.funds.detail.history_error")}
                        </div>
                      ) : fundHistoryLoading ? (
                        <div className="fund-history-state">
                          {t("reports.funds.detail.history_loading")}
                        </div>
                      ) : selectedFundHistoryEntries.length === 0 ? (
                        <div className="fund-history-state">
                          {t("reports.funds.detail.history_empty")}
                        </div>
                      ) : (
                        <ul className="fund-history-timeline">
                          {selectedFundHistoryEntries.map((entry) => (
                            <li key={entry.id} className="fund-history-item">
                              <div className="fund-history-line">
                                <span className={`fund-history-dot fund-history-dot--${entry.direction}`} />
                              </div>
                              <div className="fund-history-item-content">
                                <div className="fund-history-row">
                                  <span className="fund-history-type">{entry.typeLabel}</span>
                                  <span
                                    className={`fund-history-amount ${entry.direction === "out" ? "is-negative" : ""}`}
                                  >
                                    {entry.amountLabel}
                                  </span>
                                </div>
                                <div className="fund-history-meta">
                                  <span>{entry.dateLabel}</span>
                                  <span className={`fund-history-status fund-history-status--${entry.status}`}>
                                    {entry.statusLabel}
                                  </span>
                                </div>
                                {entry.note && <p className="fund-history-note">{entry.note}</p>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="funds-detail-empty">
                    <p className="text-muted mb-0">{t("reports.funds.detail.no_selection")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeReportTab === "budgets" && (
          <div className="budget-reports-container">
            {/* Khối 1: Tổng quan ngân sách (mở rộng) - Đặt trên filters */}
            <div className="row g-3 mb-4">
              <div className="col-xl col-md-6 col-sm-6">
                <div className="card border-0 shadow-sm budget-overview-card budget-overview-card--blue">
                  <div className="card-body">
                    <p className="budget-overview-label">{t("reports.budgets.overview.total_budgets")}</p>
                    <h3 className="budget-overview-value">{budgetSummary.total}</h3>
                    <small className="text-muted">{t("reports.budgets.total_limit")}: {formatCurrency(budgetSummary.totalLimit)}</small>
                  </div>
                </div>
              </div>
              <div className="col-xl col-md-6 col-sm-6">
                <div className="card border-0 shadow-sm budget-overview-card budget-overview-card--primary">
                  <div className="card-body">
                    <p className="budget-overview-label">{t("reports.budgets.overview.total_spent")}</p>
                    <h3 className="budget-overview-value">{formatCurrency(budgetSummary.totalSpent)}</h3>
                    <small className="text-muted">{t("reports.budgets.overview.usage_percent")}: {Math.round(budgetSummary.utilization)}%</small>
                  </div>
                </div>
              </div>
              <div className="col-xl col-md-6 col-sm-6">
                <div className="card border-0 shadow-sm budget-overview-card budget-overview-card--green">
                  <div className="card-body">
                    <p className="budget-overview-label">{t("reports.budgets.overview.safe_count")}</p>
                    <h3 className="budget-overview-value">{budgetSummary.okCount}</h3>
                    <small className="text-muted">&lt; 80%</small>
                  </div>
                </div>
              </div>
              <div className="col-xl col-md-6 col-sm-6">
                <div className="card border-0 shadow-sm budget-overview-card budget-overview-card--yellow">
                  <div className="card-body">
                    <p className="budget-overview-label">{t("reports.budgets.overview.warning_count")}</p>
                    <h3 className="budget-overview-value">{budgetSummary.warningCount}</h3>
                    <small className="text-muted">80-100%</small>
                  </div>
                </div>
              </div>
              <div className="col-xl col-md-6 col-sm-6">
                <div className="card border-0 shadow-sm budget-overview-card budget-overview-card--red">
                  <div className="card-body">
                    <p className="budget-overview-label">{t("reports.budgets.overview.exceeded_count")}</p>
                    <h3 className="budget-overview-value">{budgetSummary.exceededCount}</h3>
                    <small className="text-muted">&gt; 100%</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Khối 8: Filter & điều khiển - Bỏ tiêu đề */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={budgetWalletFilter}
                      onChange={(e) => setBudgetWalletFilter(e.target.value)}
                    >
                      <option value="all">{t("reports.budgets.filters.all_wallets")}</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.name}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={budgetTimeFilter}
                      onChange={(e) => setBudgetTimeFilter(e.target.value)}
                    >
                      <option value="this_month">{t("reports.budgets.time_period.this_month")}</option>
                      <option value="last_month">{t("reports.budgets.time_period.last_month")}</option>
                      <option value="this_week">{t("reports.budgets.time_period.this_week")}</option>
                      <option value="last_week">{t("reports.budgets.time_period.last_week")}</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={budgetStatusFilter}
                      onChange={(e) => setBudgetStatusFilter(e.target.value)}
                    >
                      <option value="all">{t("reports.budgets.filters.all_status")}</option>
                      <option value="ok">{t("reports.budgets.status.ok")}</option>
                      <option value="warning">{t("reports.budgets.status.warning")}</option>
                      <option value="exceeded">{t("reports.budgets.status.exceeded")}</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={budgetCategoryFilter}
                      onChange={(e) => setBudgetCategoryFilter(e.target.value)}
                    >
                      <option value="all">{t("reports.budgets.filters.all_categories")}</option>
                      {Array.from(new Set(budgetUsageList.map((b) => b.categoryName))).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Khối 2: Phân tích trạng thái ngân sách */}
            <div className="row g-4 mb-4">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="mb-2">{t("reports.budgets.status_distribution.title")}</h5>
                    <p className="text-muted small mb-3">{t("reports.budgets.status_distribution.subtitle")}</p>
                    {budgetsLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status" />
                      </div>
                    ) : (
                      <BudgetStatusDonut data={budgetStatusDistribution} />
                    )}
                  </div>
                </div>
              </div>

              {/* Khối 5: Top ngân sách nguy hiểm */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="mb-2">{t("reports.budgets.top_dangerous.title")}</h5>
                    <p className="text-muted small mb-3">{t("reports.budgets.top_dangerous.subtitle")}</p>
                    {budgetsLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status" />
                      </div>
                    ) : topDangerousBudgets.length === 0 ? (
                      <div className="text-center text-muted py-4">{t("reports.budgets.no_data")}</div>
                    ) : (
                      <div className="budget-dangerous-list">
                        {topDangerousBudgets.map((budget, index) => (
                          <div key={budget.id} className="budget-dangerous-item">
                            <div className="budget-dangerous-rank">
                              {index === 0 ? "🔥" : index === 1 ? "⚠️" : "⚠️"}
                            </div>
                            <div className="budget-dangerous-info">
                              <div className="budget-dangerous-name">{budget.categoryName}</div>
                              <div className="budget-dangerous-stats">
                                <span className="budget-dangerous-percent">{Math.round(budget.usage)}%</span>
                                {budget.exceeded > 0 ? (
                                  <span className="budget-dangerous-exceeded text-danger">
                                    (+{formatCurrency(budget.exceeded)})
                                  </span>
                                ) : (
                                  <span className="budget-dangerous-remaining text-success">
                                    (còn {formatCurrency(budget.remaining)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Khối 4: So sánh theo thời gian */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="mb-3">{t("reports.budgets.time_comparison.title")}</h5>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="budget-time-comparison-card">
                      <p className="text-muted mb-1">{t("reports.budgets.time_comparison.this_period")}</p>
                      <h4 className="mb-0">{formatCurrency(timeComparisonData.thisPeriod)}</h4>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="budget-time-comparison-card">
                      <p className="text-muted mb-1">{t("reports.budgets.time_comparison.last_period")}</p>
                      <h4 className="mb-0">{formatCurrency(timeComparisonData.lastPeriod)}</h4>
                    </div>
                  </div>
                </div>
                {timeComparisonData.percentChange !== 0 && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <p className="mb-0">
                      {timeComparisonData.percentChange > 0
                        ? t("reports.budgets.time_comparison.insight_more", {
                            percent: Math.abs(Math.round(timeComparisonData.percentChange)),
                          })
                        : t("reports.budgets.time_comparison.insight_less", {
                            percent: Math.abs(Math.round(timeComparisonData.percentChange)),
                          })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Khối 3: Danh sách ngân sách chi tiết */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="mb-3">{t("reports.budgets.detail_list.title")}</h5>
                {budgetsLoading ? (
                  <div className="text-center text-muted py-4">
                    <div className="spinner-border text-primary" role="status" />
                  </div>
                ) : filteredBudgetUsageList.length === 0 ? (
                  <div className="text-center text-muted py-4">{t("reports.budgets.no_data")}</div>
                ) : (
                  <div className="budget-detail-list budget-detail-list--scrollable">
                    {filteredBudgetUsageList.map((budget) => {
                      const periodStart = formatDateSafe(budget.startDate);
                      const periodEnd = formatDateSafe(budget.endDate);
                      const remaining = Math.max(0, budget.limit - budget.spent);
                      const exceeded = Math.max(0, budget.spent - budget.limit);
                      const progressColor =
                        budget.status === "exceeded"
                          ? "#ef4444"
                          : budget.status === "warning"
                          ? "#f59e0b"
                          : "#10b981";

                      return (
                        <div key={budget.id} className="budget-detail-item">
                          <div className="budget-detail-header">
                            <div className="budget-detail-info">
                              <div className="budget-detail-category">
                                <i className="bi bi-folder me-2" />
                                {budget.categoryName}
                              </div>
                              <div className="budget-detail-wallet">
                                <i className="bi bi-wallet me-2" />
                                {budget.walletName || t("reports.budgets.filters.all_wallets")}
                              </div>
                              {periodStart && periodEnd && (
                                <div className="budget-detail-time">
                                  <i className="bi bi-calendar me-2" />
                                  {periodStart} - {periodEnd}
                                </div>
                              )}
                            </div>
                            <div className="budget-detail-actions">
                              <span className={`budget-status-badge budget-status-badge--${budget.status}`}>
                                {t(`reports.budgets.status.${budget.status}`)}
                              </span>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedBudgetId(budget.id);
                                  setShowBudgetDetailModal(true);
                                }}
                              >
                                {t("reports.budgets.detail_list.view_detail")}
                              </button>
                            </div>
                          </div>
                          <div className="budget-detail-progress">
                            <div className="budget-detail-progress-bar">
                              <div
                                className="budget-detail-progress-fill"
                                style={{
                                  width: `${Math.min(budget.usage, 100)}%`,
                                  backgroundColor: progressColor,
                                }}
                              />
                            </div>
                            <div className="budget-detail-stats">
                              <div className="budget-detail-stat">
                                <span className="budget-detail-stat-label">{t("reports.budgets.detail_list.limit")}</span>
                                <span className="budget-detail-stat-value">{formatCurrency(budget.limit)}</span>
                              </div>
                              <div className="budget-detail-stat">
                                <span className="budget-detail-stat-label">{t("reports.budgets.detail_list.spent")}</span>
                                <span className="budget-detail-stat-value">{formatCurrency(budget.spent)}</span>
                              </div>
                              {exceeded > 0 ? (
                                <div className="budget-detail-stat">
                                  <span className="budget-detail-stat-label">{t("reports.budgets.detail_list.exceeded")}</span>
                                  <span className="budget-detail-stat-value text-danger">+{formatCurrency(exceeded)}</span>
                                </div>
                              ) : (
                                <div className="budget-detail-stat">
                                  <span className="budget-detail-stat-label">{t("reports.budgets.detail_list.remaining")}</span>
                                  <span className="budget-detail-stat-value text-success">{formatCurrency(remaining)}</span>
                                </div>
                              )}
                              <div className="budget-detail-stat">
                                <span className="budget-detail-stat-label">{t("reports.budgets.utilization")}</span>
                                <span className="budget-detail-stat-value">{Math.round(budget.usage)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Khối 7: Gợi ý thông minh */}
            {budgetSuggestions.length > 0 && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="mb-3">
                    <i className="bi bi-lightbulb me-2" />
                    {t("reports.budgets.suggestions.title")}
                  </h5>
                  <div className="budget-suggestions-list">
                    {budgetSuggestions.map((suggestion, index) => (
                      <div key={index} className="budget-suggestion-item">
                        <i className="bi bi-info-circle me-2 text-primary" />
                        <span>{suggestion.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Budget Detail Modal for Reports Page */}
        {showBudgetDetailModal && selectedBudgetId && (() => {
          const selectedBudget = filteredBudgetUsageList.find((b) => b.id === selectedBudgetId);
          if (!selectedBudget) return null;
          
          // Find original budget from budgets list
          const originalBudget = budgets.find((b) => {
            const budgetId = b.id ?? b.budgetId;
            return String(budgetId) === String(selectedBudgetId);
          });
          
          if (!originalBudget) return null;
          
          // Calculate usage data
          const limit = selectedBudget.limit || 0;
          const spent = selectedBudget.spent || 0;
          const percent = selectedBudget.usage || 0;
          const remaining = Math.max(0, limit - spent);
          
          // Determine status
          const alertPercentage = originalBudget.alertPercentage ?? originalBudget.warningThreshold ?? 80;
          let status = "healthy";
          if (percent >= 100) {
            status = "over";
          } else if (percent >= alertPercentage) {
            status = "warning";
          }
          
          const usage = {
            percent,
            spent,
            remaining,
            status,
          };
          
          const budgetForModal = {
            ...originalBudget,
            limitAmount: limit,
            categoryName: selectedBudget.categoryName,
            walletName: selectedBudget.walletName,
            startDate: selectedBudget.startDate,
            endDate: selectedBudget.endDate,
            alertPercentage,
          };
          
          return (
            <BudgetDetailModal
              open={showBudgetDetailModal}
              budget={budgetForModal}
              usage={usage}
              onClose={() => {
                setShowBudgetDetailModal(false);
                setSelectedBudgetId(null);
              }}
              onEdit={() => {
                // Navigate to budgets page or handle edit
                setShowBudgetDetailModal(false);
                setSelectedBudgetId(null);
              }}
              onRemind={() => {
                // Handle remind
                setShowBudgetDetailModal(false);
                setSelectedBudgetId(null);
              }}
            />
          );
        })()}
        </div>
      </div>
    </div>
  );
}


