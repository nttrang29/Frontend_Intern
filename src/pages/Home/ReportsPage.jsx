import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { formatVietnamTime } from "../../utils/dateFormat";

import "../../styles/pages/ReportsPage.css";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useFundData } from "../../contexts/FundDataContext";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

const RANGE_OPTIONS = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

const INCOME_COLOR = "#0B63F6";
const EXPENSE_COLOR = "#00C2FF";
const PAGE_SIZE = 10;

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
      alert(t("reports.export_pdf_error") || "Không thể mở cửa sổ in. Vui lòng kiểm tra trình chặn popup.");
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

  const fundSummary = useMemo(() => {
    if (!Array.isArray(funds) || funds.length === 0) {
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
    const activeFunds = funds.filter((fund) => (fund.status || "").toUpperCase() !== "CLOSED");
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
      const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 30 && diffDays >= 0) return count + 1;
      return count;
    }, 0);
    const completed = activeFunds.filter((fund) => {
      const target = Number(fund.targetAmount ?? fund.target ?? 0) || 0;
      if (!target) return false;
      const currentValue = Number(fund.currentAmount ?? fund.current ?? 0) || 0;
      return currentValue >= target;
    }).length;
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
  }, [funds]);

  const fundProgressList = useMemo(() => {
    if (!Array.isArray(funds) || funds.length === 0) return [];
    return funds
      .filter((fund) => (fund.status || "").toUpperCase() !== "CLOSED")
      .map((fund) => {
        const currentValue = Number(fund.currentAmount ?? fund.current ?? 0) || 0;
        const targetValue = Number(fund.targetAmount ?? fund.target ?? 0) || 0;
        const progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : null;
        return {
          id: fund.id ?? fund.fundId ?? `${fund.fundName || "fund"}-${fund.targetWalletId || "0"}`,
          name: fund.fundName || fund.name || t("sidebar.funds"),
          currentValue,
          targetValue,
          progress,
          hasDeadline: !!(fund.hasDeadline || fund.hasTerm),
          endDate: fund.endDate || null,
        };
      })
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 4);
  }, [funds, t]);

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
                            {wallet.isDefault && <span className="badge rounded-pill text-bg-primary">Mặc định</span>}
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
          <div className="reports-single-card card border-0 shadow-sm">
            <div className="card-body">
              <div className="reports-section-header">
                <div>
                  <h5 className="mb-1">{t("reports.funds.section_title")}</h5>
                  <p className="text-muted mb-0 small">{t("reports.funds.section_subtitle")}</p>
                </div>
              </div>
              <div className="reports-section-summary">
                <div>
                  <p className="reports-section-label">{t("reports.funds.total_label")}</p>
                  <h4 className="mb-0">{fundSummary.total}</h4>
                </div>
                <div>
                  <p className="reports-section-label">{t("reports.funds.raised")}</p>
                  <h4 className="mb-0">{formatCurrency(fundSummary.totalCurrent)}</h4>
                </div>
                <div>
                  <p className="reports-section-label">{t("reports.funds.target")}</p>
                  <h4 className="mb-0">{formatCurrency(fundSummary.totalTarget)}</h4>
                </div>
              </div>
              <div className="reports-section-progress">
                <div className="reports-progress-header">
                  <span className="text-muted small">{t("reports.funds.progress_to_target")}</span>
                  <strong>{Math.round(fundSummary.progressPct)}%</strong>
                </div>
                <div className="reports-section-progress-bar">
                  <span style={{ width: `${Math.min(fundSummary.progressPct, 100)}%` }} />
                </div>
              </div>
              <div className="reports-status-tags">
                <span className="reports-status-chip">
                  {t("reports.funds.term_funds")}: <strong>{fundSummary.termCount}</strong>
                </span>
                <span className="reports-status-chip warning">
                  {t("reports.funds.near_deadline")}: <strong>{fundSummary.nearingDeadline}</strong>
                </span>
                <span className="reports-status-chip success">
                  {t("reports.funds.completed")}: <strong>{fundSummary.completed}</strong>
                </span>
              </div>
              <div className="reports-section-list">
                {fundsLoading ? (
                  <div className="text-center text-muted small py-3">{t("reports.funds.loading")}</div>
                ) : fundProgressList.length === 0 ? (
                  <div className="text-center text-muted small py-3">{t("reports.funds.no_data")}</div>
                ) : (
                  fundProgressList.map((fund) => {
                    const deadlineLabel = fund.hasDeadline ? formatDateSafe(fund.endDate) : null;
                    return (
                      <div className="reports-mini-row" key={fund.id}>
                        <div className="reports-mini-title">
                          <div>
                            <p className="mb-0">{fund.name}</p>
                            <span className="reports-mini-subtitle">
                              {fund.targetValue
                                ? `${formatCurrency(fund.currentValue)} / ${formatCurrency(fund.targetValue)}`
                                : formatCurrency(fund.currentValue)}
                            </span>
                          </div>
                          <span className="reports-status-badge status-ok">
                            {fund.targetValue
                              ? `${Math.round(fund.progress ?? 0)}%`
                              : t("reports.funds.no_target")}
                          </span>
                        </div>
                        {fund.targetValue ? (
                          <div className="reports-mini-progress">
                            <div className="reports-mini-progress-bar">
                              <span
                                className="progress-fill"
                                style={{ width: `${Math.min(fund.progress ?? 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        {deadlineLabel && (
                          <div className="reports-mini-meta">
                            {t("reports.funds.deadline")}: {deadlineLabel}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        {activeReportTab === "budgets" && (
          <div className="reports-single-card card border-0 shadow-sm">
            <div className="card-body">
              <div className="reports-section-header">
                <div>
                  <h5 className="mb-1">{t("reports.budgets.section_title")}</h5>
                  <p className="text-muted mb-0 small">{t("reports.budgets.section_subtitle")}</p>
                </div>
                <span className="badge rounded-pill text-bg-light">{budgetSummary.total}</span>
              </div>
              <div className="reports-section-summary">
                <div>
                  <p className="reports-section-label">{t("reports.budgets.total_limit")}</p>
                  <h4 className="mb-0">{formatCurrency(budgetSummary.totalLimit)}</h4>
                </div>
                <div>
                  <p className="reports-section-label">{t("reports.budgets.total_spent")}</p>
                  <h4 className="mb-0">{formatCurrency(budgetSummary.totalSpent)}</h4>
                </div>
                <div>
                  <p className="reports-section-label">{t("reports.budgets.utilization")}</p>
                  <h4 className="mb-0">{Math.round(budgetSummary.utilization)}%</h4>
                </div>
              </div>
              <div className="reports-status-tags">
                <span className="reports-status-chip success">
                  {t("reports.budgets.status.ok")}: <strong>{budgetSummary.okCount}</strong>
                </span>
                <span className="reports-status-chip warning">
                  {t("reports.budgets.status.warning")}: <strong>{budgetSummary.warningCount}</strong>
                </span>
                <span className="reports-status-chip danger">
                  {t("reports.budgets.status.exceeded")}: <strong>{budgetSummary.exceededCount}</strong>
                </span>
              </div>
              <div className="reports-section-list">
                {budgetsLoading ? (
                  <div className="text-center text-muted small py-3">{t("reports.budgets.loading")}</div>
                ) : topBudgetUsage.length === 0 ? (
                  <div className="text-center text-muted small py-3">{t("reports.budgets.no_data")}</div>
                ) : (
                  topBudgetUsage.map((budget) => {
                    const periodStart = formatDateSafe(budget.startDate);
                    const periodEnd = formatDateSafe(budget.endDate);
                    return (
                      <div className="reports-mini-row" key={budget.id}>
                        <div className="reports-mini-title">
                          <div>
                            <p className="mb-0">{budget.categoryName}</p>
                            {budget.walletName && (
                              <span className="reports-mini-subtitle">{budget.walletName}</span>
                            )}
                          </div>
                          <span className={`reports-status-badge status-${budget.status}`}>
                            {t(`reports.budgets.status.${budget.status}`)}
                          </span>
                        </div>
                        <div className="reports-mini-progress">
                          <div className="reports-mini-progress-bar">
                            <span
                              className={`progress-fill status-${budget.status}`}
                              style={{ width: `${Math.min(budget.usage, 100)}%` }}
                            />
                          </div>
                          <div className="reports-mini-stats">
                            <span>{formatCurrency(budget.spent)}</span>
                            <span>{formatCurrency(budget.limit)}</span>
                          </div>
                        </div>
                        {periodStart && periodEnd && (
                          <div className="reports-mini-meta">
                            {t("reports.budgets.period")}: {periodStart} - {periodEnd}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}


