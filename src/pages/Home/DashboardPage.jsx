import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useLanguage } from "../../contexts/LanguageContext";

import "../../styles/pages/DashboardPage.css";
import { transactionAPI } from "../../services/transaction.service";
import CalendarWidget from "../../components/dashboard/CalendarWidget";
import WeatherWidget from "../../components/dashboard/WeatherWidget";

const DONUT_COLORS = [
  "#0C5776", // navy
  "#2D99AE", // teal
  "#58D3F7", // light blue
  "#FF9F1C", // orange
  "#F9D648", // yellow
  "#9B8B9B", // muted violet/gray
];
const DONUT_OTHER_COLOR = "#9B8B9B";



// translations moved to central LanguageContext

const parseAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

// Tokens để nhận diện loại giao dịch
const EXPENSE_TOKENS = ["EXPENSE", "CHI", "OUTFLOW", "DEBIT", "PAY", "SPEND", "WITHDRAW"];
const INCOME_TOKENS = ["INCOME", "THU", "INFLOW", "CREDIT", "TOPUP", "DEPOSIT", "RECEIVE", "SALARY", "EARN"];

const normalizeDirectionToken = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toUpperCase();
};

const matchesToken = (value, candidates) => {
  if (!value) return false;
  return candidates.some((token) => value.includes(token));
};

const normalizeTransaction = (tx) => {
  if (!tx) return null;
  const rawDate = tx.date || tx.createdAt || tx.transactionDate || tx.transaction_date;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  // Xác định loại giao dịch từ nhiều nguồn (giống TransactionsPage)
  let type = "expense"; // default
  let foundType = false;
  
  // Kiểm tra các flag boolean trước
  if (tx.isExpense === true || tx.isDebit === true) {
    type = "expense";
    foundType = true;
  } else if (tx.isIncome === true || tx.isCredit === true) {
    type = "income";
    foundType = true;
  }

  // Nếu chưa xác định được, kiểm tra transactionType.typeName (field chính từ backend)
  if (!foundType) {
    const typeName = tx.transactionType?.typeName || tx.transactionTypeName;
    if (typeName) {
      const normalizedTypeName = String(typeName).toLowerCase().trim();
      if (normalizedTypeName.includes("thu") || normalizedTypeName.includes("income")) {
        type = "income";
        foundType = true;
      } else if (normalizedTypeName.includes("chi") || normalizedTypeName.includes("expense")) {
        type = "expense";
        foundType = true;
      }
    }
  }

  // Nếu vẫn chưa xác định được, kiểm tra các field khác
  if (!foundType) {
    const directionCandidates = [
      tx.transactionType,
      tx.transactionType?.type,
      tx.transactionType?.typeKey,
      tx.transactionType?.code,
      tx.transactionType?.direction,
      tx.transactionTypeLabel,
      tx.type,
      tx.typeName,
      tx.typeCode,
      tx.transactionKind,
      tx.transactionFlow,
      tx.direction,
      tx.flow,
      tx.category?.type,
      tx.category?.categoryType,
      tx.category?.transactionType,
      tx.category?.typeName,
      tx.categoryType,
    ];

    for (const candidate of directionCandidates) {
      if (candidate === undefined || candidate === null) continue;
      const normalized = normalizeDirectionToken(candidate);
      if (!normalized) continue;
      if (matchesToken(normalized, INCOME_TOKENS)) {
        type = "income";
        foundType = true;
        break;
      }
      if (matchesToken(normalized, EXPENSE_TOKENS)) {
        type = "expense";
        foundType = true;
        break;
      }
    }
  }

  // Nếu vẫn chưa xác định được, kiểm tra dấu của amount (fallback)
  if (!foundType) {
    const rawAmount = parseAmount(
      tx.amount ?? tx.money ?? tx.transactionAmount ?? tx.value ?? tx.amountMoney ?? 0
    );
    // Nếu amount có dấu, dùng dấu để xác định (số dương = thu nhập, số âm = chi tiêu)
    // Nhưng chỉ dùng fallback này nếu không tìm thấy từ các field khác
    if (rawAmount < 0) {
      type = "expense";
    } else if (rawAmount > 0) {
      // Không thể chắc chắn số dương là thu nhập vì backend có thể trả về số dương cho cả hai
      // Nên vẫn giữ default là expense
    }
  }

  // Parse amount - đảm bảo luôn là số dương
  const rawAmount = parseAmount(
    tx.amount ?? tx.money ?? tx.transactionAmount ?? tx.value ?? tx.amountMoney ?? 0
  );
  const amount = Math.abs(rawAmount); // Luôn lấy giá trị tuyệt đối

  const walletName = tx.wallet?.walletName || tx.walletName || "";
  const note = tx.note || tx.description || "";
  const category = tx.category?.categoryName || tx.categoryName || tx.category || "";

  return {
    id: tx.id || tx.transactionId || tx.transaction_id || `${category}-${date.getTime()}`,
    type,
    amount,
    category,
    walletName,
    note,
    date,
  };
};

const getPeriodRange = (period) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "tuan") {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === "thang") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};




export default function DashboardPage() {
  const { formatCurrency } = useCurrency();
  
  // Hàm format số tiền dạng compact cho các bảng thống kê
  // Khi quá 10 triệu sẽ hiển thị dạng compact (10M, 100M, 1B, etc.)
  const formatCompactCurrency = (amount) => {
    const value = Number(amount) || 0;
    
    // Nếu < 10 triệu, format bình thường
    if (value < 10_000_000) {
      const formatted = value.toLocaleString("vi-VN");
      return `${formatted} VND`;
    }
    
    // >= 10 triệu: format dạng compact
    if (value >= 1_000_000_000) {
      // >= 1 tỷ: hiển thị dạng B (tỷ)
      const billions = value / 1_000_000_000;
      return `${billions.toFixed(billions >= 10 ? 0 : 1)}B VND`;
    } else if (value >= 10_000_000) {
      // >= 10 triệu: hiển thị dạng M (triệu)
      const millions = value / 1_000_000;
      return `${millions.toFixed(millions >= 10 ? 0 : 1)}M VND`;
    }
    
    // Fallback
    const formatted = value.toLocaleString("vi-VN");
    return `${formatted} VND`;
  };
  const { t } = useLanguage();
  const [period, setPeriod] = useState("tuan");
  const [apiTransactions, setApiTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeSlice, setActiveSlice] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, label: "", value: 0, amount: 0 });
  const donutRef = useRef(null);
  const [barTooltip, setBarTooltip] = useState({ show: false, x: 0, y: 0, type: "", amount: 0, label: "" });
  const barChartRef = useRef(null);

  const periodLabelFull = {
    tuan: t("dashboard.period.week"),
    thang: t("dashboard.period.month"),
    nam: t("dashboard.period.year"),
  };

  const spendingLevelTagLabel = {
    tuan: t("dashboard.by_week"),
    thang: t("dashboard.by_month"),
    nam: t("dashboard.by_year"),
  };

  useEffect(() => {
    let cancelled = false;
    const fetchTransactions = async () => {
      setLoading(true);
      setLoadError("");
      // Reset state trước khi fetch để tránh hiển thị dữ liệu cũ
      if (!cancelled) {
        setApiTransactions([]);
      }
      
      try {
        console.log("DashboardPage: Đang gọi API getAllTransactions...");
        const response = await transactionAPI.getAllTransactions();
        console.log("DashboardPage: API response:", response);
        
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.transactions)
          ? response.transactions
          : Array.isArray(response?.data?.transactions)
          ? response.data.transactions
          : Array.isArray(response?.data)
          ? response.data
          : [];
        
        console.log("DashboardPage: Số lượng giao dịch nhận được:", list.length);
        console.log("DashboardPage: Mẫu giao dịch:", list.slice(0, 2));
        
        if (!cancelled) {
          setApiTransactions(list);
          console.log("DashboardPage: Đã cập nhật apiTransactions với", list.length, "giao dịch");
        }
      } catch (err) {
        console.error("DashboardPage: Lỗi khi gọi API fetchTransactions", err);
        if (!cancelled) {
          setApiTransactions([]);
          setLoadError(t("common.error") || "Không thể tải giao dịch");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const handleLogout = () => {
      // Reset state khi logout
      setApiTransactions([]);
      setLoading(false);
      setLoadError("");
    };

    fetchTransactions();
    window.addEventListener("user:loggedout", handleLogout);
    
    return () => {
      cancelled = true;
      window.removeEventListener("user:loggedout", handleLogout);
    };
  }, [t]);

  // CHỈ dùng dữ liệu từ API, KHÔNG fallback về context
  // Điều này đảm bảo khi API trả về rỗng (database rỗng), UI sẽ hiển thị empty state
  // KHÔNG hiển thị dữ liệu cũ từ cache
  const transactions = apiTransactions;

  const normalizedTransactions = useMemo(() => {
    console.log("DashboardPage: Đang normalize", transactions.length, "giao dịch");
    console.log("DashboardPage: Nguồn dữ liệu: API");
    const normalized = transactions.map(normalizeTransaction).filter(Boolean);
    console.log("DashboardPage: Sau khi normalize:", normalized.length, "giao dịch hợp lệ");
    if (normalized.length > 0) {
      console.log("DashboardPage: Mẫu giao dịch đã normalize:", normalized.slice(0, 2));
    }
    
    // Log thống kê
    const incomeCount = normalized.filter(tx => tx.type === "income").length;
    const expenseCount = normalized.filter(tx => tx.type === "expense").length;
    console.log("DashboardPage: Thu nhập:", incomeCount, "| Chi tiêu:", expenseCount);
    
    return normalized;
  }, [transactions]);

  const currentTransactions = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    const filtered = normalizedTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });
    console.log(`DashboardPage: Giao dịch trong kỳ ${period}:`, filtered.length);
    console.log("DashboardPage: Khoảng thời gian:", start.toLocaleDateString("vi-VN"), "-", end.toLocaleDateString("vi-VN"));
    const incomeInPeriod = filtered.filter(tx => tx.type === "income").length;
    const expenseInPeriod = filtered.filter(tx => tx.type === "expense").length;
    console.log("DashboardPage: Trong kỳ - Thu nhập:", incomeInPeriod, "| Chi tiêu:", expenseInPeriod);
    return filtered;
  }, [normalizedTransactions, period]);

  const totalSpending = useMemo(() => {
    return currentTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [currentTransactions]);

  const totalIncome = useMemo(() => {
    return currentTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [currentTransactions]);

  const transactionTypeData = useMemo(() => {
    console.log("DashboardPage: Tính transactionTypeData từ", currentTransactions.length, "giao dịch");
    const expenseTxs = currentTransactions.filter((tx) => tx.type === "expense");
    console.log("DashboardPage: Số giao dịch chi tiêu:", expenseTxs.length);
    
    const map = {};
    let total = 0;

    expenseTxs.forEach((tx) => {
      const label = tx.category || t("dashboard.other");
      map[label] = (map[label] || 0) + tx.amount;
      total += tx.amount;
    });

    console.log("DashboardPage: Danh mục chi tiêu:", Object.keys(map));
    console.log("DashboardPage: Tổng chi tiêu:", total);

    const sortedEntries = Object.entries(map)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topCategories = sortedEntries.slice(0, 5);
    const otherCategories = sortedEntries.slice(5);
    const otherAmount = otherCategories.reduce((sum, item) => sum + item.amount, 0);

    const result = topCategories.map((item, index) => ({
      id: item.label,
      label: item.label,
      amount: item.amount,
      value: total ? Math.round((item.amount / total) * 100) : 0,
      color: DONUT_COLORS[index] || DONUT_COLORS[DONUT_COLORS.length - 1],
    }));

    if (otherAmount > 0) {
      result.push({
        id: "others",
        label: t("dashboard.other"),
        amount: otherAmount,
        value: total ? Math.round((otherAmount / total) * 100) : 0,
        color: DONUT_COLORS[5] || DONUT_OTHER_COLOR,
      });
    }

    if (result.length === 0) {
      console.warn("DashboardPage: Không có dữ liệu chi tiêu, trả về empty");
      return [{ id: "empty", label: t("dashboard.no_data"), value: 0, amount: 0, color: "#eee" }];
    }

    console.log("DashboardPage: transactionTypeData có", result.length, "danh mục");
    return result;
  }, [currentTransactions, t]);

  const chartData = useMemo(() => {
    const { start } = getPeriodRange(period);
    const data = [];

    if (period === "tuan") {
      const dayLabels = [
        t("common.day.mon"),
        t("common.day.tue"),
        t("common.day.wed"),
        t("common.day.thu"),
        t("common.day.fri"),
        t("common.day.sat"),
        t("common.day.sun"),
      ];

      for (let i = 0; i < 7; i += 1) {
        const dayStart = new Date(start);
        dayStart.setDate(start.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const spending = currentTransactions
          .filter((tx) => tx.type === "expense")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= dayStart && d <= dayEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        const income = currentTransactions
          .filter((tx) => tx.type === "income")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= dayStart && d <= dayEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        data.push({ label: dayLabels[i], value: spending, income, spending });
      }
    } else if (period === "thang") {
      for (let i = 1; i <= 4; i += 1) {
        const label = `${t("dashboard.chart.week_prefix")} ${i}`;
        const weekStart = new Date(start);
        weekStart.setDate((i - 1) * 7 + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(start);
        if (i === 4) {
          weekEnd.setMonth(weekEnd.getMonth() + 1, 0);
        } else {
          weekEnd.setDate(i * 7);
        }
        weekEnd.setHours(23, 59, 59, 999);

        const spending = currentTransactions
          .filter((tx) => tx.type === "expense")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= weekStart && d <= weekEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        const income = currentTransactions
          .filter((tx) => tx.type === "income")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= weekStart && d <= weekEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        data.push({ label, value: spending, income, spending });
      }
    } else {
      const year = start.getFullYear();
      for (let i = 0; i < 12; i += 1) {
        const label = `${t("dashboard.chart.month_prefix")}${i + 1}`;
        const monthStart = new Date(year, i, 1);
        const monthEnd = new Date(year, i + 1, 0, 23, 59, 59, 999);

        const spending = currentTransactions
          .filter((tx) => tx.type === "expense")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        const income = currentTransactions
          .filter((tx) => tx.type === "income")
          .filter((tx) => {
            const d = new Date(tx.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        data.push({ label, value: spending, income, spending });
      }
    }

    return data;
  }, [currentTransactions, period, t]);

  const donutGradient = useMemo(() => {
    if (!transactionTypeData.length) {
      return "conic-gradient(#eee 0% 100%)";
    }

    const parts = [];
    let currentPercent = 0;

    transactionTypeData.forEach((item) => {
      const start = currentPercent;
      const end = currentPercent + item.value;
      parts.push(`${item.color} ${start}% ${end}%`);
      currentPercent = end;
    });

    if (currentPercent < 100) {
      parts.push(`${transactionTypeData.at(-1).color} ${currentPercent}% 100%`);
    }

    return `conic-gradient(${parts.join(", ")})`;
  }, [transactionTypeData]);

  const totalAmount = useMemo(
    () => transactionTypeData.reduce((sum, item) => sum + item.amount, 0),
    [transactionTypeData]
  );

  const donutSlices = useMemo(() => {
    if (!transactionTypeData.length) return [];
    const amountTotal = totalAmount || 1;
    let currentAngle = -90; // start at top
    const slices = transactionTypeData.map((item, index) => {
      const angle = (item.amount / amountTotal) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;
      currentAngle = end;
      return {
        ...item,
        start,
        end,
        index,
        percent: Math.round((item.amount / amountTotal) * 100),
      };
    });
    return slices;
  }, [transactionTypeData, totalAmount]);

  return (
    <div className="dashboard-page tx-page container-fluid py-4">
      <div className="tx-page-inner">
        <div className="wallet-header">
          <div className="wallet-header-left">
            <div className="wallet-header-icon">
              <i className="bi bi-speedometer2" />
            </div>
            <div>
              <h2 className="wallet-header-title">{t("dashboard.title")}</h2>
              <p className="wallet-header-subtitle">{t("dashboard.subtitle")}</p>
            </div>
          </div>
          <div className="dashboard-page__period">
            <button
              className={"db-btn db-btn--ghost " + (period === "tuan" ? "db-btn--active" : "")}
              onClick={() => setPeriod("tuan")}
            >
              {t("dashboard.period.week")}
            </button>
            <button
              className={"db-btn db-btn--ghost " + (period === "thang" ? "db-btn--active" : "")}
              onClick={() => setPeriod("thang")}
            >
              {t("dashboard.period.month")}
            </button>
            <button
              className={"db-btn db-btn--ghost " + (period === "nam" ? "db-btn--active" : "")}
              onClick={() => setPeriod("nam")}
            >
              {t("dashboard.period.year")}
            </button>
          </div>
        </div>

        <div className="dashboard-grid-compact">
          <div className="dashboard-charts">
            <div className="db-card">
              <div className="db-card__header">
              <h3>{t("dashboard.spending_by_category")}</h3>
              </div>
              <div className="db-card__body db-card__body--horizontal db-card__body--donut">
                <div className="db-donut" ref={donutRef}>
                  <svg
                    className="db-donut__svg"
                    viewBox="-110 -110 220 220"
                    role="img"
                    aria-label="Biểu đồ mức chi từng loại"
                    onMouseLeave={() => {
                      setActiveSlice(null);
                      setTooltip((prev) => ({ ...prev, show: false }));
                    }}
                  >
                    {donutSlices.map((slice) => {
                      const rad = (deg) => (Math.PI / 180) * deg;
                      const polarToCartesian = (r, angleDeg) => ({
                        x: r * Math.cos(rad(angleDeg)),
                        y: r * Math.sin(rad(angleDeg)),
                      });
                      const largeArc = slice.end - slice.start > 180 ? 1 : 0;
                      const outerR = activeSlice === slice.index ? 88 : 84;
                      const innerR = 35; // tăng độ dày vòng (inner nhỏ hơn)
                      const startOuter = polarToCartesian(outerR, slice.start);
                      const endOuter = polarToCartesian(outerR, slice.end);
                      const startInner = polarToCartesian(innerR, slice.end);
                      const endInner = polarToCartesian(innerR, slice.start);
                      const d = `
                        M ${startOuter.x} ${startOuter.y}
                        A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}
                        L ${startInner.x} ${startInner.y}
                        A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}
                        Z
                      `;
                      const handleEnter = () => {
                        setActiveSlice(slice.index);
                        setTooltip({
                          show: true,
                          x: 0,
                          y: 0,
                          label: slice.label,
                          value: slice.percent,
                          amount: slice.amount,
                        });
                      };
                      const handleMove = (e) => {
                        const rect = donutRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        setTooltip((prev) => ({
                          ...prev,
                          show: true,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        }));
                      };
                      return (
                        <path
                          key={slice.id}
                          d={d}
                          fill={slice.color}
                          className="db-donut__slice"
                          onMouseEnter={handleEnter}
                          onMouseMove={handleMove}
                          onMouseLeave={() => {
                            setActiveSlice(null);
                            setTooltip((prev) => ({ ...prev, show: false }));
                          }}
                        />
                      );
                    })}
                  </svg>
                  {tooltip.show && (
                    <div
                      className="db-donut__tooltip"
                      style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
                    >
                      <div className="db-donut__tooltip-label">{tooltip.label}</div>
                      <div className="db-donut__tooltip-value">
                        {tooltip.value}% · {formatCompactCurrency(tooltip.amount)}
                      </div>
                    </div>
                  )}
                  <div className="db-donut__center" aria-hidden="true" />
                </div>
                <ul className="db-legend">
                  {transactionTypeData.map((item, idx) => (
                    <li
                      key={item.id}
                      className="db-legend__item"
                      onMouseEnter={(e) => {
                        setActiveSlice(idx);
                        const rect = donutRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltip({
                            show: true,
                            x: (rect.width / 2),
                            y: 10,
                            label: item.label,
                            value: Math.round((item.amount / (totalAmount || 1)) * 100),
                            amount: item.amount,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setActiveSlice(null);
                        setTooltip((prev) => ({ ...prev, show: false }));
                      }}
                    >
                      <span className="db-legend__dot" style={{ backgroundColor: item.color }} />
                      <span className="db-legend__label">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card__header">
                <h3>{t("dashboard.total_spending")}</h3>
                <span className="db-card__tag">{periodLabelFull[period] || ""}</span>
              </div>
              <div className="db-card__body">
                <div className="db-card__kpi db-card__kpi--dual">
                  <div>
                    <p className="db-kpi__label">{t("dashboard.income")}</p>
                    <p className="db-kpi__value db-kpi__value--income">{formatCompactCurrency(totalIncome)}</p>
                  </div>
                  <div>
                    <p className="db-kpi__label">{t("dashboard.total_expense")}</p>
                    <p className="db-kpi__value db-kpi__value--expense">{formatCompactCurrency(totalSpending)}</p>
                  </div>
                </div>
                <div className="db-line-chart-container">
                  {(() => {
                    // Tính max từ tổng thu chi hoặc chart data
                    const maxFromTotals = Math.max(totalIncome, totalSpending);
                    const maxFromChart = Math.max(
                      ...chartData.flatMap((point) => [point.value || point.spending || 0, point.income || 0]),
                      1
                    );
                    const max = Math.max(maxFromTotals, maxFromChart);
                    
                    // Làm tròn max lên giá trị đẹp
                    const roundUpToNiceValue = (value) => {
                      if (value === 0) return 100000;
                      const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
                      const normalized = value / magnitude;
                      let rounded;
                      if (normalized <= 1) rounded = 1;
                      else if (normalized <= 2) rounded = 2;
                      else if (normalized <= 5) rounded = 5;
                      else rounded = 10;
                      return rounded * magnitude;
                    };
                    
                    const niceMax = roundUpToNiceValue(max);
                    const baseHeight = 120;
                    
                    // Tính y-axis values
                    const yAxisSteps = 5;
                    const stepValue = niceMax / yAxisSteps;
                    const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) => 
                      Math.round((i * stepValue) / 1000) * 1000
                    );
                    
                    return (
                      <>
                        {/* Y-axis labels */}
                        <div className="db-line-chart__y-axis">
                          {yAxisValues.map((value, index) => (
                            <div
                              key={index}
                              className="db-line-chart__y-axis-label"
                              style={{
                                bottom: `${(index / yAxisSteps) * baseHeight}px`,
                              }}
                            >
                              {formatCompactCurrency(value)}
                            </div>
                          ))}
                        </div>
                        
                        {/* Chart area */}
                        <div className="db-line-chart">
                          {/* Grid lines */}
                          <div className="db-line-chart__grid">
                            {yAxisValues.map((_, index) => (
                              <div
                                key={index}
                                className="db-line-chart__grid-line"
                                style={{
                                  bottom: `${(index / yAxisSteps) * baseHeight}px`,
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* SVG for lines */}
                          <svg viewBox="0 0 100 120" className="db-line-chart__svg" preserveAspectRatio="none">
                            {(() => {
                              // Hàm tạo đường cong mượt từ các điểm sử dụng Catmull-Rom spline
                              const createSmoothPath = (points) => {
                                if (points.length < 2) return "";
                                if (points.length === 2) {
                                  return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
                                }

                                let path = `M ${points[0].x},${points[0].y}`;
                                
                                // Sử dụng thuật toán đơn giản hơn: tính control points dựa trên điểm trước và sau
                                for (let i = 0; i < points.length - 1; i++) {
                                  const p0 = i > 0 ? points[i - 1] : points[i];
                                  const p1 = points[i];
                                  const p2 = points[i + 1];
                                  const p3 = i < points.length - 2 ? points[i + 2] : p2;
                                  
                                  // Tính control points cho cubic bezier
                                  // Sử dụng công thức Catmull-Rom để tính control points
                                  const tension = 0.5; // Điều chỉnh độ mượt (0-1)
                                  
                                  const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
                                  const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
                                  const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
                                  const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
                                  
                                  path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                                }
                                
                                return path;
                              };

                              // Tạo points cho income line
                              const incomePoints = chartData.map((item, index) => {
                                const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 0;
                                const x = index * xStep;
                                const normalized = baseHeight - (item.income / niceMax) * baseHeight;
                                return { x, y: normalized };
                              });

                              // Tạo points cho expense line
                              const expensePoints = chartData.map((item, index) => {
                                const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 0;
                                const x = index * xStep;
                                const normalized = baseHeight - ((item.value || item.spending || 0) / niceMax) * baseHeight;
                                return { x, y: normalized };
                              });

                              return (
                                <>
                                  {/* Income line - smooth curve */}
                                  <path
                                    className="db-line-chart__line db-line-chart__line--income"
                                    d={createSmoothPath(incomePoints)}
                                    fill="none"
                                  />
                                  {/* Expense line - smooth curve */}
                                  <path
                                    className="db-line-chart__line db-line-chart__line--expense"
                                    d={createSmoothPath(expensePoints)}
                                    fill="none"
                                  />
                                </>
                              );
                            })()}
                          </svg>
                          
                          {/* X-axis labels */}
                          <div className="db-line-chart__labels">
                            {chartData.map((item) => (
                              <span key={item.label}>{item.label}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="db-card db-card--full-width">
              <div className="db-card__header">
                <h3>{t("dashboard.balance_fluctuation")}</h3>
                <span className="db-card__tag">{spendingLevelTagLabel[period]}</span>
              </div>
              <div className="db-card__body">
                <div className="db-bar-chart-container">
                  {(() => {
                    // Sử dụng totalIncome và totalExpense đã tính sẵn ở ngoài
                    // Lấy max của tổng thu và tổng chi hiện có (không dùng chart data)
                    const max = Math.max(totalIncome, totalSpending, 1);
                    
                    // Làm tròn max lên một giá trị đẹp hơn (làm tròn lên hàng trăm nghìn hoặc triệu)
                    const roundUpToNiceValue = (value) => {
                      if (value === 0) return 100000;
                      const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
                      const normalized = value / magnitude;
                      let rounded;
                      if (normalized <= 1) rounded = 1;
                      else if (normalized <= 2) rounded = 2;
                      else if (normalized <= 5) rounded = 5;
                      else rounded = 10;
                      return rounded * magnitude;
                    };
                    
                    const niceMax = roundUpToNiceValue(max);
                    
                    // Tính các giá trị cho y-axis (5 mức) dựa trên niceMax
                    // 0 ở dưới cùng, max ở trên cùng
                    const yAxisSteps = 5;
                    const stepValue = niceMax / yAxisSteps;
                    const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) => 
                      Math.round((i * stepValue) / 1000) * 1000
                    ); // 0 ở index 0 (dưới cùng), max ở index cuối (trên cùng)
                    const baseHeight = 166;
                    
                    return (
                      <>
                        {/* Y-axis labels */}
                        <div className="db-bar-chart__y-axis">
                          {yAxisValues.map((value, index) => (
                            <div
                              key={index}
                              className="db-bar-chart__y-axis-label"
                              style={{
                                bottom: `${(index / yAxisSteps) * baseHeight}px`,
                              }}
                            >
                              {formatCompactCurrency(value)}
                            </div>
                          ))}
                        </div>
                        
                        {/* Chart area with grid lines */}
                        <div className={`db-bar-chart db-bar-chart--dense db-bar-chart--${period}`} ref={barChartRef}>
                          {/* Grid lines */}
                          <div className="db-bar-chart__grid">
                            {yAxisValues.map((_, index) => (
                              <div
                                key={index}
                                className="db-bar-chart__grid-line"
                                style={{
                                  bottom: `${(index / yAxisSteps) * baseHeight}px`,
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* Bars */}
                          {chartData.map((item) => {
                            const heightExpense = ((item.value || item.spending || 0) / niceMax) * baseHeight;
                            const heightIncome = ((item.income || 0) / niceMax) * baseHeight;
                            const incomeAmount = item.income || 0;
                            const expenseAmount = item.value || item.spending || 0;
                            
                            return (
                              <div key={item.label} className="db-bar-chart__item">
                                <div className="db-bar-chart__bars-pair">
                                  <div
                                    className="db-bar-chart__bar db-bar-chart__bar--income"
                                    style={{ height: `${heightIncome}px` }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const containerRect = barChartRef.current?.getBoundingClientRect();
                                      if (containerRect) {
                                        setBarTooltip({
                                          show: true,
                                          x: rect.left - containerRect.left + rect.width / 2,
                                          y: rect.top - containerRect.top - 10,
                                          type: t("dashboard.income"),
                                          amount: incomeAmount,
                                          label: item.label,
                                        });
                                      }
                                    }}
                                    onMouseMove={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const containerRect = barChartRef.current?.getBoundingClientRect();
                                      if (containerRect) {
                                        setBarTooltip((prev) => ({
                                          ...prev,
                                          x: rect.left - containerRect.left + rect.width / 2,
                                          y: rect.top - containerRect.top - 10,
                                        }));
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      setBarTooltip((prev) => ({ ...prev, show: false }));
                                    }}
                                  />
                                  <div
                                    className="db-bar-chart__bar db-bar-chart__bar--spending"
                                    style={{ height: `${heightExpense}px` }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const containerRect = barChartRef.current?.getBoundingClientRect();
                                      if (containerRect) {
                                        setBarTooltip({
                                          show: true,
                                          x: rect.left - containerRect.left + rect.width / 2,
                                          y: rect.top - containerRect.top - 10,
                                          type: t("dashboard.expense"),
                                          amount: expenseAmount,
                                          label: item.label,
                                        });
                                      }
                                    }}
                                    onMouseMove={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const containerRect = barChartRef.current?.getBoundingClientRect();
                                      if (containerRect) {
                                        setBarTooltip((prev) => ({
                                          ...prev,
                                          x: rect.left - containerRect.left + rect.width / 2,
                                          y: rect.top - containerRect.top - 10,
                                        }));
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      setBarTooltip((prev) => ({ ...prev, show: false }));
                                    }}
                                  />
                                </div>
                                <span className="db-bar-chart__label">{item.label}</span>
                              </div>
                            );
                          })}
                          {/* Tooltip for bars */}
                          {barTooltip.show && (
                            <div
                              className="db-bar-chart__tooltip"
                              style={{
                                left: `${barTooltip.x + 12}px`,
                                top: `${barTooltip.y - 12}px`,
                              }}
                            >
                              <div className="db-bar-chart__tooltip-label">{barTooltip.type}</div>
                              <div className="db-bar-chart__tooltip-value">{formatCompactCurrency(barTooltip.amount)}</div>
                              <div className="db-bar-chart__tooltip-period">{barTooltip.label}</div>
                            </div>
                          )}
                          {chartData.length === 0 && (
                            <span className="db-card__subtitle">{t("dashboard.no_data")}</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="db-bar-chart__legend">
                  <span className="db-bar-chart__legend-item">
                    <span className="dot dot--primary" /> {t("dashboard.income")}
                  </span>
                  <span className="db-bar-chart__legend-item">
                    <span className="dot dot--secondary" /> {t("dashboard.expense")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-widgets-stack">
            <div className="db-card db-card--widget">
              <CalendarWidget compact />
            </div>
            <div className="db-card db-card--widget">
              <WeatherWidget compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
