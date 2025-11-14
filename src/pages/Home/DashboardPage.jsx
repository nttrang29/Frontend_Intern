import React, { useMemo, useState } from "react";
import "../../styles/home/DashboardPage.css";


/**
 * Dashboard tổng quan tài chính – dùng dữ liệu ảo, đổi theo:
 *  - Tuần này
 *  - Tháng này
 *  - Năm nay
 *
 * =================== NƠI GẮN API SAU NÀY ===================
 * TODO: Khi có backend, thay các object mock*ByPeriod bằng
 *       dữ liệu thật lấy từ API.
 *  Ví dụ:
 *    useEffect(() => {
 *      fetch(`/api/dashboard?period=${period}`)
 *        .then(res => res.json())
 *        .then(setData);
 *    }, [period]);
 * ===========================================================
 */

// Loại giao dịch theo kỳ
const transactionTypeByPeriod = {
  tuan: [
    { id: "chi_tieu", label: "Chi tiêu", value: 52, color: "#2D99AE" },
    { id: "tiet_kiem", label: "Tiết kiệm", value: 24, color: "#0C5776" },
    { id: "hoa_don", label: "Hóa đơn", value: 14, color: "#BCFEFE" },
    { id: "khac", label: "Khác", value: 10, color: "#F8DAD0" },
  ],
  thang: [
    { id: "chi_tieu", label: "Chi tiêu", value: 58, color: "#2D99AE" },
    { id: "tiet_kiem", label: "Tiết kiệm", value: 20, color: "#0C5776" },
    { id: "hoa_don", label: "Hóa đơn", value: 12, color: "#BCFEFE" },
    { id: "khac", label: "Khác", value: 10, color: "#F8DAD0" },
  ],
  nam: [
    { id: "chi_tieu", label: "Chi tiêu", value: 61, color: "#2D99AE" },
    { id: "tiet_kiem", label: "Tiết kiệm", value: 18, color: "#0C5776" },
    { id: "hoa_don", label: "Hóa đơn", value: 11, color: "#BCFEFE" },
    { id: "khac", label: "Khác", value: 10, color: "#F8DAD0" },
  ],
};

// Tổng chi tiêu theo kỳ (line chart)
const spendingTrendByPeriod = {
  tuan: [
    { label: "T2", value: 10 },
    { label: "T3", value: 14 },
    { label: "T4", value: 16 },
    { label: "T5", value: 18 },
    { label: "T6", value: 20 },
    { label: "T7", value: 22 },
    { label: "CN", value: 24 },
  ],
  thang: [
    { label: "20/11", value: 12 },
    { label: "22/11", value: 16 },
    { label: "24/11", value: 14 },
    { label: "26/11", value: 18 },
    { label: "28/11", value: 21 },
    { label: "30/11", value: 25 },
  ],
  nam: [
    { label: "Q1", value: 40 },
    { label: "Q2", value: 45 },
    { label: "Q3", value: 50 },
    { label: "Q4", value: 55 },
  ],
};

// Mức độ chi tiêu (bar chart)
const spendingLevelWeek = [
  { label: "T2", value: 30 },
  { label: "T3", value: 45 },
  { label: "T4", value: 38 },
  { label: "T5", value: 50 },
  { label: "T6", value: 42 },
  { label: "T7", value: 60 },
  { label: "CN", value: 55 },
];

const spendingLevelMonth = [
  { label: "Tuần 1", value: 60 },
  { label: "Tuần 2", value: 70 },
  { label: "Tuần 3", value: 65 },
  { label: "Tuần 4", value: 80 },
];

const spendingLevelYear = [
  { label: "T1", value: 40 },
  { label: "T2", value: 45 },
  { label: "T3", value: 50 },
  { label: "T4", value: 48 },
  { label: "T5", value: 55 },
  { label: "T6", value: 60 },
  { label: "T7", value: 62 },
  { label: "T8", value: 58 },
  { label: "T9", value: 64 },
  { label: "T10", value: 70 },
  { label: "T11", value: 72 },
  { label: "T12", value: 68 },
];

const spendingLevelByPeriod = {
  tuan: spendingLevelWeek,
  thang: spendingLevelMonth,
  nam: spendingLevelYear,
};

// Biến động số dư (2 line: thu vào / chi ra)
const balanceByPeriod = {
  tuan: [
    { label: "T2", income: 18, spending: 14 },
    { label: "T3", income: 20, spending: 16 },
    { label: "T4", income: 19, spending: 17 },
    { label: "T5", income: 21, spending: 18 },
    { label: "T6", income: 23, spending: 19 },
    { label: "T7", income: 24, spending: 20 },
    { label: "CN", income: 25, spending: 22 },
  ],
  thang: [
    { label: "Tuần 1", income: 22, spending: 18 },
    { label: "Tuần 2", income: 24, spending: 20 },
    { label: "Tuần 3", income: 26, spending: 21 },
    { label: "Tuần 4", income: 27, spending: 23 },
  ],
  nam: [
    { label: "Q1", income: 60, spending: 52 },
    { label: "Q2", income: 65, spending: 58 },
    { label: "Q3", income: 70, spending: 62 },
    { label: "Q4", income: 74, spending: 66 },
  ],
};

// Lịch sử giao dịch theo kỳ
const historyByPeriod = {
  tuan: [
    {
      id: 1,
      title: "Ăn uống",
      description: "Thanh toán ShopeeFood",
      amount: -120000,
      time: "Hôm nay • 11:20",
    },
    {
      id: 2,
      title: "Xăng xe",
      description: "Đổ xăng",
      amount: -150000,
      time: "Hôm nay • 08:05",
    },
    {
      id: 3,
      title: "Lương tuần",
      description: "Công việc part-time",
      amount: 1500000,
      time: "Hôm qua • 20:15",
    },
  ],
  thang: [
    {
      id: 1,
      title: "Ăn uống",
      description: "Thanh toán ShopeeFood",
      amount: -120000,
      time: "Hôm nay • 11:20",
    },
    {
      id: 2,
      title: "Lương tháng 11",
      description: "Công ty CMC Global",
      amount: 12000000,
      time: "Hôm qua • 17:30",
    },
    {
      id: 3,
      title: "Tiền phòng",
      description: "Chuyển khoản cho chủ nhà",
      amount: -3500000,
      time: "03/11 • 08:05",
    },
    {
      id: 4,
      title: "Gửi tiết kiệm",
      description: "Tích lũy mục tiêu 2025",
      amount: -2000000,
      time: "01/11 • 09:15",
    },
  ],
  nam: [
    {
      id: 1,
      title: "Lương năm",
      description: "Tổng lương năm",
      amount: 145000000,
      time: "31/12 • 18:00",
    },
    {
      id: 2,
      title: "Du lịch",
      description: "Chi phí nghỉ mát",
      amount: -15000000,
      time: "10/08 • 09:30",
    },
    {
      id: 3,
      title: "Mua laptop",
      description: "Trang bị làm việc",
      amount: -25000000,
      time: "05/05 • 14:10",
    },
  ],
};

const periodLabelFull = {
  tuan: "Tuần này",
  thang: "Tháng này",
  nam: "Năm nay",
};

const spendingLevelTagLabel = {
  tuan: "Theo tuần",
  thang: "Theo tháng",
  nam: "Theo năm",
};

export default function DashboardPage() {
  const [period, setPeriod] = useState("tuan");

  const currentTransactionType = transactionTypeByPeriod[period];
  const currentSpendingTrend = spendingTrendByPeriod[period];
  const currentSpendingLevel = spendingLevelByPeriod[period];
  const currentBalance = balanceByPeriod[period];
  const currentHistory = historyByPeriod[period];

  const totalSpending = useMemo(
    () => currentSpendingTrend.reduce((sum, item) => sum + item.value, 0),
    [currentSpendingTrend]
  );

  const mainDonutValue = currentTransactionType.find(
    (t) => t.id === "tiet_kiem"
  );

  return (
    <div className="dashboard-page">
      {/* Ô bọc trắng cho phần tiêu đề */}
      <div className="dashboard-page__header-box">
        <div className="dashboard-page__header">
          <div>
            <h2 className="dashboard-page__title">Tổng quan tài chính</h2>
            <p className="dashboard-page__subtitle">
              Xem nhanh tình hình thu chi, biến động số dư và giao dịch gần
              đây.
            </p>
          </div>
          <div className="dashboard-page__period">
            <button
              className={
                "db-btn db-btn--ghost " +
                (period === "tuan" ? "db-btn--active" : "")
              }
              onClick={() => setPeriod("tuan")}
            >
              Tuần này
            </button>
            <button
              className={
                "db-btn db-btn--ghost " +
                (period === "thang" ? "db-btn--active" : "")
              }
              onClick={() => setPeriod("thang")}
            >
              Tháng này
            </button>
            <button
              className={
                "db-btn db-btn--ghost " +
                (period === "nam" ? "db-btn--active" : "")
              }
              onClick={() => setPeriod("nam")}
            >
              Năm nay
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Cột trái */}
        <section className="dashboard-main">
          <div className="db-card-grid">
            {/* Loại giao dịch */}
            <div className="db-card">
              <div className="db-card__header">
                <h3>Loại giao dịch</h3>
              </div>
              <div className="db-card__body db-card__body--horizontal">
                <div className="db-donut">
                  <div className="db-donut__ring" />
                  <div className="db-donut__center">
                    <span className="db-donut__value">
                      {mainDonutValue?.value || 0}%
                    </span>
                    <span className="db-donut__label">Tiết kiệm</span>
                  </div>
                </div>
                <ul className="db-legend">
                  {currentTransactionType.map((item) => (
                    <li key={item.id} className="db-legend__item">
                      <span
                        className="db-legend__dot"
                        style={{ backgroundColor: item.color }}
                      />
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

            {/* Tổng chi tiêu */}
            <div className="db-card">
              <div className="db-card__header">
                <h3>Tổng chi tiêu</h3>
                <span className="db-card__tag">
                  {periodLabelFull[period] || ""}
                </span>
              </div>
              <div className="db-card__body">
                <div className="db-card__kpi">
                  <div>
                    <p className="db-kpi__label">Tổng chi</p>
                    <p className="db-kpi__value">
                      {totalSpending.toLocaleString("vi-VN")}K
                    </p>
                  </div>
                  <div className="db-kpi__trend db-kpi__trend--up">
                    <i className="bi bi-arrow-up-right" />
                    <span>+12,3% so với kỳ trước</span>
                  </div>
                </div>
                <div className="db-line-chart">
                  <svg viewBox="0 0 100 40" className="db-line-chart__svg">
                    <polyline
                      className="db-line-chart__line db-line-chart__line--primary"
                      points={currentSpendingTrend
                        .map((item, index) => {
                          const xStep =
                            currentSpendingTrend.length > 1
                              ? 100 /
                                (currentSpendingTrend.length - 1)
                              : 0;
                          const x = index * xStep;
                          const max = Math.max(
                            ...currentSpendingTrend.map((p) => p.value)
                          );
                          const min = Math.min(
                            ...currentSpendingTrend.map((p) => p.value)
                          );
                          const range = max - min || 1;
                          const normalized =
                            30 - ((item.value - min) / range) * 20;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                    <polyline
                      className="db-line-chart__line db-line-chart__line--muted"
                      points="0,34 20,32 40,30 60,28 80,26 100,24"
                    />
                  </svg>
                  <div className="db-line-chart__labels">
                    {currentSpendingTrend.map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mức độ chi tiêu */}
            <div className="db-card">
              <div className="db-card__header">
                <h3>Mức độ chi tiêu</h3>
                <span className="db-card__tag">
                  {spendingLevelTagLabel[period]}
                </span>
              </div>
              <div className="db-card__body">
                <p className="db-card__subtitle">
                  Mức chi ở từng mốc thời gian.
                </p>
                <div className="db-bar-chart db-bar-chart--dense">
                  {currentSpendingLevel.map((item) => (
                    <div key={item.label} className="db-bar-chart__item">
                      <div className="db-bar-chart__bar-wrap">
                        <div
                          className="db-bar-chart__bar db-bar-chart__bar--spending"
                          style={{ height: `${item.value * 1.2}px` }}
                        />
                      </div>
                      <span className="db-bar-chart__label">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Biến động số dư */}
            <div className="db-card">
              <div className="db-card__header">
                <h3>Biến động số dư</h3>
                <span className="db-card__tag">Số dư ví</span>
              </div>
              <div className="db-card__body">
                <div className="db-balance-chart">
                  <svg viewBox="0 0 100 40" className="db-line-chart__svg">
                    {/* Thu vào */}
                    <polyline
                      className="db-line-chart__line db-line-chart__line--primary"
                      points={currentBalance
                        .map((item, index) => {
                          const xStep =
                            currentBalance.length > 1
                              ? 100 / (currentBalance.length - 1)
                              : 0;
                          const x = index * xStep;
                          const max = Math.max(
                            ...currentBalance.map((p) => p.income)
                          );
                          const min = Math.min(
                            ...currentBalance.map((p) => p.income)
                          );
                          const range = max - min || 1;
                          const normalized =
                            26 - ((item.income - min) / range) * 18;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                    {/* Chi ra */}
                    <polyline
                      className="db-line-chart__line db-line-chart__line--secondary"
                      points={currentBalance
                        .map((item, index) => {
                          const xStep =
                            currentBalance.length > 1
                              ? 100 / (currentBalance.length - 1)
                              : 0;
                          const x = index * xStep;
                          const max = Math.max(
                            ...currentBalance.map((p) => p.spending)
                          );
                          const min = Math.min(
                            ...currentBalance.map((p) => p.spending)
                          );
                          const range = max - min || 1;
                          const normalized =
                            30 - ((item.spending - min) / range) * 16;
                          return `${x},${normalized}`;
                        })
                        .join(" ")}
                    />
                  </svg>
                  <div className="db-line-chart__labels">
                    {currentBalance.map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                  </div>
                  <div className="db-balance-legend">
                    <span className="db-balance-legend__item">
                      <span className="dot dot--primary" /> Thu vào
                    </span>
                    <span className="db-balance-legend__item">
                      <span className="dot dot--secondary" /> Chi ra
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cột phải: lịch sử giao dịch */}
        <aside className="dashboard-side">
          <div className="db-card db-card--side">
            <div className="db-card__header db-card__header--side">
              <div>
                <h3>Lịch sử giao dịch</h3>
                <p className="db-card__subtitle">Các giao dịch mới nhất.</p>
              </div>
              <span className="db-card__tag">
                {periodLabelFull[period] || ""}
              </span>
            </div>
            <div className="db-side__search">
              <span className="db-side__search-icon">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm giao dịch..."
                className="db-side__search-input"
              />
            </div>
            <ul className="db-history-list">
              {currentHistory.map((item) => (
                <li key={item.id} className="db-history-item">
                  <div className="db-history-item__icon">
                    <i className="bi bi-credit-card-2-front" />
                  </div>
                  <div className="db-history-item__main">
                    <div className="db-history-item__row">
                      <span className="db-history-item__title">
                        {item.title}
                      </span>
                      <span
                        className={
                          "db-history-item__amount " +
                          (item.amount >= 0
                            ? "db-history-item__amount--positive"
                            : "db-history-item__amount--negative")
                        }
                      >
                        {item.amount >= 0 ? "+" : "-"}
                        {Math.abs(item.amount).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <p className="db-history-item__desc">
                      {item.description}
                    </p>
                    <span className="db-history-item__time">
                      {item.time}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}