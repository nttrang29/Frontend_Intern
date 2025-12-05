import React, { useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { formatVietnamDate, formatVietnamTime } from "../../utils/dateFormat";
import { useLanguage } from "../../contexts/LanguageContext";

import "../../styles/pages/DashboardPage.css";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import CalendarWidget from "../../components/dashboard/CalendarWidget";
import WeatherWidget from "../../components/dashboard/WeatherWidget";
import ExchangeRateWidget from "../../components/dashboard/ExchangeRateWidget";

const STORAGE_EXTERNAL = "app_external_transactions_v1";
const DONUT_COLORS = ["#0C5776", "#2D99AE", "#58D3F7", "#BCFEFE"];
const DONUT_OTHER_COLOR = "#F8DAD0";



// translations moved to central LanguageContext

const parseAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9-]/g, "");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeTransaction = (tx) => {
  if (!tx) return null;
  const rawDate = tx.date || tx.createdAt || tx.transactionDate;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  const typeSource = (
    tx.type ||
    tx.transactionType ||
    tx.transactionTypeName ||
    tx.transactionTypeLabel ||
    ""
  )
    .toString()
    .toLowerCase();
  const type = typeSource.includes("thu") || typeSource.includes("income") ? "income" : "expense";
  const walletName = tx.wallet?.walletName || tx.walletName || "";
  const note = tx.note || tx.description || "";
  const category = tx.category?.categoryName || tx.categoryName || tx.category || "";
  const amount = tx.amount || 0;

  return {
    id: tx.id || tx.transactionId || `${category}-${date.getTime()}`,
    type,
    amount,
    category,
    walletName,
    note,
    date,
  };
};

const createMockData = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  return [
    {
      id: 1,
      code: "TX-0001",
      type: "expense",
      walletName: "Tiền mặt",
      amount: 50000,
      currency: "VND",
      date: new Date(currentYear, currentMonth, currentDay, 12, 0).toISOString(),
      category: "Ăn uống",
      note: "Bữa trưa",
    },
    {
      id: 2,
      code: "TX-0002",
      type: "income",
      walletName: "Ngân hàng A",
      amount: 15000000,
      currency: "VND",
      date: new Date(currentYear, currentMonth, currentDay - 1, 9, 0).toISOString(),
      category: "Lương",
      note: "Lương tháng",
    },
    {
      id: 3,
      code: "TX-0003",
      type: "expense",
      walletName: "Momo",
      amount: 120000,
      currency: "VND",
      date: new Date(currentYear, currentMonth, currentDay - 2, 18, 30).toISOString(),
      category: "Giải trí",
      note: "Xem phim",
    },
    {
      id: 4,
      code: "TX-0004",
      type: "expense",
      walletName: "Tiền mặt",
      amount: 3500000,
      currency: "VND",
      date: new Date(currentYear, currentMonth, 3, 8, 0).toISOString(),
      category: "Hóa đơn",
      note: "Tiền phòng",
    },
    {
      id: 5,
      code: "TX-0005",
      type: "expense",
      walletName: "Techcombank",
      amount: 2000000,
      currency: "VND",
      date: new Date(currentYear, currentMonth, 1, 9, 0).toISOString(),
      category: "Tiết kiệm",
      note: "Gửi tiết kiệm",
    },
  ];
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
  const { t } = useLanguage();
  const { externalTransactionsList = [] } = useBudgetData();
  const [period, setPeriod] = useState("tuan");
  const [localTransactions, setLocalTransactions] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

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
    const loadData = () => {
      try {
        const raw = localStorage.getItem(STORAGE_EXTERNAL);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setLocalTransactions(parsed);
            return;
          }
        }
        setLocalTransactions(createMockData());
      } catch (err) {
        console.error("DashboardPage: loadData", err);
        setLocalTransactions(createMockData());
      }
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const transactions = externalTransactionsList.length
    ? externalTransactionsList
    : localTransactions;

  const normalizedTransactions = useMemo(
    () => transactions.map(normalizeTransaction).filter(Boolean),
    [transactions]
  );

  const currentTransactions = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return normalizedTransactions.filter((tx) => tx.date >= start && tx.date <= end);
  }, [normalizedTransactions, period]);

  const totalSpending = useMemo(() => {
    return currentTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [currentTransactions]);

  const transactionTypeData = useMemo(() => {
    const expenseTxs = currentTransactions.filter((tx) => tx.type === "expense");
    const map = {};
    let total = 0;

    expenseTxs.forEach((tx) => {
      const label = tx.category || t("dashboard.other");
      map[label] = (map[label] || 0) + tx.amount;
      total += tx.amount;
    });

    const sortedEntries = Object.entries(map)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topCategories = sortedEntries.slice(0, 4);
    const otherCategories = sortedEntries.slice(4);
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
        color: DONUT_OTHER_COLOR,
      });
    }

    if (result.length === 0) {
      return [{ id: "empty", label: t("dashboard.no_data"), value: 0, amount: 0, color: "#eee" }];
    }

    return result;
  }, [currentTransactions]);

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

  const historyList = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLowerCase();
    return currentTransactions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((tx) => {
        if (historyFilter !== "all" && tx.category !== historyFilter) {
          return false;
        }
        if (!normalizedSearch) return true;
        const combined = `${tx.category} ${tx.note || ""} ${tx.walletName || ""}`.toLowerCase();
        return combined.includes(normalizedSearch);
      })
      .slice(0, 10)
      .map((tx) => ({
        id: tx.id,
        title: tx.category,
        description: tx.note || tx.walletName,
        amount: tx.type === "expense" ? -tx.amount : tx.amount,
        time: `${formatVietnamDate(tx.date)} • ${formatVietnamTime(tx.date)}`,
      }));
  }, [currentTransactions, historySearch, historyFilter]);

  const historyCategories = useMemo(() => {
    const categories = new Set();
    currentTransactions.forEach((tx) => {
      if (tx.category) categories.add(tx.category);
    });
    return Array.from(categories).sort();
  }, [currentTransactions]);

  useEffect(() => {
    if (historyFilter !== "all" && !historyCategories.includes(historyFilter)) {
      setHistoryFilter("all");
    }
  }, [historyCategories, historyFilter]);

  const mainDonutValue = transactionTypeData[0] || { value: 0, label: t("dashboard.no_data") };

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

      {/* Exchange Rate Widget - Dưới header */}
      <div className="dashboard-exchange-rate">
        <ExchangeRateWidget />
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="db-card-grid">
            <div className="db-card">
              <div className="db-card__header">
                <h3>{t("dashboard.transaction_type")}</h3>
              </div>
              <div className="db-card__body db-card__body--horizontal">
                <div className="db-donut">
                  <div className="db-donut__ring" style={{ background: donutGradient }} />
                  <div className="db-donut__center">
                    <span className="db-donut__value">{mainDonutValue.value}%</span>
                    <span className="db-donut__label">{mainDonutValue.label}</span>
                  </div>
                </div>
                <ul className="db-legend">
                  {transactionTypeData.map((item) => (
                    <li key={item.id} className="db-legend__item">
                      <span className="db-legend__dot" style={{ backgroundColor: item.color }} />
                      <span className="db-legend__label">{item.label}</span>
                      <span className="db-legend__value">
                        {item.value}
                        <span className="db-legend__unit">%</span>
                      </span>
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
                <div className="db-card__kpi">
                  <div>
                    <p className="db-kpi__label">{t("dashboard.total_expense")}</p>
                    <p className="db-kpi__value">{formatCurrency(totalSpending)}</p>
                  </div>
                </div>
                <div className="db-line-chart">
                  <svg viewBox="0 0 100 40" className="db-line-chart__svg" preserveAspectRatio="none">
                    <polyline
                      className="db-line-chart__line db-line-chart__line--primary"
                      points={chartData
                        .map((item, index) => {
                          const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 0;
                          const x = index * xStep;
                          const values = chartData.map((point) => point.value);
                          const max = Math.max(...values, 1);
                          const normalized = 40 - (item.value / max) * 32 - 4;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                  </svg>
                  <div className="db-line-chart__labels">
                    {chartData.map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card__header">
                <h3>{t("dashboard.spending_level")}</h3>
                <span className="db-card__tag">{spendingLevelTagLabel[period]}</span>
              </div>
              <div className="db-card__body">
                <p className="db-card__subtitle">{t("dashboard.spending_level_subtitle")}</p>
                <div className="db-bar-chart db-bar-chart--dense">
                  {chartData.map((item) => {
                    const max = Math.max(...chartData.map((point) => point.value), 1);
                    const height = (item.value / max) * 100;
                    return (
                      <div key={item.label} className="db-bar-chart__item">
                        <div className="db-bar-chart__bar-wrap">
                          <div
                            className="db-bar-chart__bar db-bar-chart__bar--spending"
                            style={{ height: `${height}px` }}
                            title={formatCurrency(item.value)}
                          />
                        </div>
                        <span className="db-bar-chart__label">{item.label}</span>
                      </div>
                    );
                  })}
                  {chartData.length === 0 && (
                    <span className="db-card__subtitle">{t("dashboard.no_data")}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card__header">
                <h3>{t("dashboard.balance_fluctuation")}</h3>
                <span className="db-card__tag">{t("dashboard.income_expense")}</span>
              </div>
              <div className="db-card__body">
                <div className="db-balance-chart">
                  <svg viewBox="0 0 100 40" className="db-line-chart__svg" preserveAspectRatio="none">
                    <polyline
                      className="db-line-chart__line db-line-chart__line--primary"
                      points={chartData
                        .map((item, index) => {
                          const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 0;
                          const x = index * xStep;
                          const values = chartData.flatMap((point) => [point.income, point.spending]);
                          const max = Math.max(...values, 1);
                          const normalized = 40 - (item.income / max) * 32 - 4;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                    <polyline
                      className="db-line-chart__line db-line-chart__line--secondary"
                      points={chartData
                        .map((item, index) => {
                          const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 0;
                          const x = index * xStep;
                          const values = chartData.flatMap((point) => [point.income, point.spending]);
                          const max = Math.max(...values, 1);
                          const normalized = 40 - (item.spending / max) * 32 - 4;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                  </svg>
                  <div className="db-line-chart__labels">
                    {chartData.map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                  </div>
                  <div className="db-balance-legend">
                    <span className="db-balance-legend__item">
                      <span className="dot dot--primary" /> {t("dashboard.income")}
                    </span>
                    <span className="db-balance-legend__item">
                      <span className="dot dot--secondary" /> {t("dashboard.expense")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="dashboard-side">
          <div className="db-card db-card--side">
            <div className="db-card__header db-card__header--side">
              <div>
                <h3>{t("dashboard.transaction_history")}</h3>
                <p className="db-card__subtitle">{t("dashboard.recent_transactions")}</p>
              </div>
              <span className="db-card__tag">{periodLabelFull[period] || ""}</span>
            </div>
            <div className="db-side__search">
              <span className="db-side__search-icon">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                placeholder={t("dashboard.search_placeholder")}
                className="db-side__search-input"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
              />
            </div>
            <div className="db-side__filters">
              <select
                className="db-side__select"
                value={historyFilter}
                onChange={(event) => setHistoryFilter(event.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {historyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <ul className="db-history-list">
              {historyList.length === 0 ? (
                <li className="text-center text-muted py-3">{t("dashboard.no_transactions")}</li>
              ) : (
                historyList.map((item) => (
                  <li key={item.id} className="db-history-item">
                    <div className="db-history-item__icon">
                      <i className="bi bi-credit-card-2-front" />
                    </div>
                    <div className="db-history-item__main">
                      <div className="db-history-item__row">
                        <span className="db-history-item__title">{item.title}</span>
                        <span
                          className={
                            "db-history-item__amount " +
                            (item.amount >= 0
                              ? "db-history-item__amount--positive"
                              : "db-history-item__amount--negative")
                          }
                        >
                          {item.amount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(item.amount))}
                        </span>
                      </div>
                      <p className="db-history-item__desc">{item.description}</p>
                      <span className="db-history-item__time">{item.time}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* Calendar and Weather Widgets */}
      <div className="dashboard-widgets-row">
        <div className="dashboard-widgets-col">
          <CalendarWidget />
        </div>
        <div className="dashboard-widgets-col">
          <WeatherWidget />
        </div>
      </div>
      </div>
    </div>
  );
}
