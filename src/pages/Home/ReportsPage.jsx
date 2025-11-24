import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/home/ReportsPage.css";
import { useWalletData } from "../../home/store/WalletDataContext";
import { transactionAPI } from "../../services/api-client";

const RANGE_OPTIONS = [
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

const INCOME_COLOR = "#0B63F6";
const EXPENSE_COLOR = "#00C2FF";

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
    case "month":
      return buildMonthlyData(transactions);
    case "year":
      return buildYearlyData(transactions);
    case "week":
    default:
      return buildWeeklyData(transactions);
  }
};

const formatCurrency = (value = 0, currency = "VND") => {
  try {
    return value.toLocaleString("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch (error) {
    return `${value.toLocaleString("vi-VN")} ${currency}`;
  }
};

const formatCompactNumber = (value) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

export default function ReportsPage() {
  const { wallets, loading: walletsLoading } = useWalletData();
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [range, setRange] = useState("week");
  const [walletSearch, setWalletSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState("");
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState(null);
  const navigate = useNavigate();

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
        const response = await transactionAPI.getAllTransactions();
        const normalized = (response.transactions || [])
          .map(normalizeTransaction)
          .filter(Boolean);
        if (mounted) {
          setTransactions(normalized);
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

  const filteredWallets = useMemo(() => {
    const keyword = walletSearch.trim().toLowerCase();
    if (!keyword) return wallets;
    return wallets.filter((wallet) => (wallet.name || "").toLowerCase().includes(keyword));
  }, [wallets, walletSearch]);

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId),
    [wallets, selectedWalletId]
  );

  const walletTransactions = useMemo(() => {
    if (!selectedWalletId) return [];
    return transactions.filter((tx) => tx.walletId === Number(selectedWalletId));
  }, [transactions, selectedWalletId]);

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

  const handleViewHistory = useCallback(() => {
    if (!selectedWalletId) return;
    const params = new URLSearchParams({ focus: String(selectedWalletId) });
    navigate(`/home/transactions?${params.toString()}`);
  }, [navigate, selectedWalletId]);

  return (
    <div className="reports-page container py-4">
      <div
        className="reports-header card border-0 mb-4"
        style={{
          borderRadius: 18,
          background: "linear-gradient(90deg, #0b5aa5 0%, #0c7fb0 60%, #0ab5c0 100%)",
          color: "#ffffff",
        }}
      >
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 className="mb-1" style={{ color: "#fff" }}>
              Báo cáo Tài chính
            </h2>
            <p className="mb-0" style={{ color: "rgba(255,255,255,0.85)" }}>
              Theo dõi chi tiết dòng tiền vào/ra theo từng ví để ra quyết định chính xác hơn.
            </p>
          </div>
          <div className="reports-header-pill">
            <i className="bi bi-graph-up" /> Tổng quan realtime
          </div>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-wallet-card card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">Danh sách ví</h5>
                <p className="text-muted mb-0 small">Chọn một ví để xem biểu đồ dòng tiền.</p>
              </div>
              <span className="badge rounded-pill text-bg-light">{wallets.length} ví</span>
            </div>
            <div className="reports-wallet-search mb-3">
              <i className="bi bi-search" />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm ví..."
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
              />
            </div>
            <div className="reports-wallet-list">
              {walletsLoading ? (
                <div className="text-center py-4 text-muted small">Đang tải ví...</div>
              ) : filteredWallets.length === 0 ? (
                <div className="text-center py-4 text-muted small">Không tìm thấy ví phù hợp.</div>
              ) : (
                filteredWallets.map((wallet) => (
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
                        {wallet.isShared && <span className="badge rounded-pill text-bg-info">Ví nhóm</span>}
                      </div>
                    </div>
                    <div className="wallet-balance text-end">
                      <p className="mb-0 fw-semibold">{formatCurrency(Number(wallet.balance) || 0, wallet.currency || "VND")}</p>
                      <small className="text-muted">{wallet.currency || "VND"}</small>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="reports-chart-card card border-0 shadow-sm">
          <div className="card-body">
            <div className="reports-chart-header-card">
              <div className="reports-chart-header">
                <div>
                  <p className="text-muted mb-1">Ví được chọn</p>
                  <h4 className="mb-1">{selectedWallet?.name || "Chưa có ví"}</h4>
                  <div className="reports-summary-row">
                    <div>
                      <span className="summary-dot" style={{ background: INCOME_COLOR }} />
                      Thu vào: <strong>{formatCurrency(summary.income, currency)}</strong>
                    </div>
                    <div>
                      <span className="summary-dot" style={{ background: EXPENSE_COLOR }} />
                      Chi ra: <strong>{formatCurrency(summary.expense, currency)}</strong>
                    </div>
                    <div>
                      <span className="summary-dot" style={{ background: net >= 0 ? "#16a34a" : "#dc2626" }} />
                      Còn lại: <strong>{formatCurrency(net, currency)}</strong>
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
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="reports-history-btn"
                    onClick={handleViewHistory}
                    disabled={!selectedWalletId}
                  >
                    <i className="bi bi-clock-history" /> Lịch sử giao dịch
                  </button>
                </div>
              </div>
            </div>

            <div className="reports-chart-area">
              {loadingTransactions ? (
                <div className="reports-chart-empty text-center text-muted py-5">
                  <div className="spinner-border text-primary mb-3" role="status" />
                  <p className="mb-0">Đang tải dữ liệu giao dịch...</p>
                </div>
              ) : !selectedWallet ? (
                <div className="reports-chart-empty text-center text-muted py-5">
                  Hãy chọn một ví để xem báo cáo.
                </div>
              ) : error ? (
                <div className="reports-chart-empty text-center text-danger py-5">
                  {error}
                </div>
              ) : chartData.length === 0 ? (
                <div className="reports-chart-empty text-center text-muted py-5">
                  Chưa có giao dịch nào cho giai đoạn này.
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
                        range === "week"
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
          </div>
        </div>
      </div>
    </div>
  );
}
