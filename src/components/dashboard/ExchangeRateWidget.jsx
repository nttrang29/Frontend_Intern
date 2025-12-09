import React, { useState, useEffect, useMemo } from "react";
import "../../styles/components/dashboard/ExchangeRateWidget.css";
import { getExchangeRate, getRateHistory, fetchRateHistory, setCustomExchangeSource } from "../../services/exchange-rate.service";

export default function ExchangeRateWidget() {
  const [rate, setRate] = useState({
    vndToUsd: 24500,
    usdToVnd: 0.000041,
    change: 0,
    changePercent: 0,
    lastUpdate: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [showCustomSourceModal, setShowCustomSourceModal] = useState(false);
  const [customSourceInput, setCustomSourceInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('exchange_rate_custom_source') || '';
    }
    return '';
  });

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExchangeRate();
      setRate(data);
    } catch (err) {
      console.error("Error fetching exchange rate:", err);
      setError("Không thể tải tỉ giá");
      // Giữ giá trị cũ nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    
    // Refresh mỗi 5 phút
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveCustomSource = () => {
    const trimmed = customSourceInput.trim();
    if (!trimmed) {
      // Clear custom source
      setCustomExchangeSource(null);
      setShowCustomSourceModal(false);
      return;
    }
    // Validate basic URL format
    try {
      new URL(trimmed);
    } catch (e) {
      alert('URL không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://...)');
      return;
    }
    // Save to localStorage via the service function
    setCustomExchangeSource(trimmed);
    setShowCustomSourceModal(false);
    // Re-fetch to apply the new source
    fetchExchangeRate();
  };

  const handleClearCustomSource = () => {
    setCustomExchangeSource(null);
    setCustomSourceInput('');
    setShowCustomSourceModal(false);
    // Re-fetch with default source
    fetchExchangeRate();
  };

  useEffect(() => {
    if (showChart) {
      // Lấy dữ liệu từ localStorage trước
      const cachedHistory = getRateHistory();
      setChartData(cachedHistory);
      
      // Sau đó fetch dữ liệu mới từ API
      fetchRateHistory().then((history) => {
        if (history && history.length > 0) {
          setChartData(history);
        }
      });
    }
  }, [showChart]);

  const formatTime = (date) => {
    if (!date) return "N/A";
    
    // Đảm bảo date là Date object hợp lệ
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Kiểm tra nếu date không hợp lệ
    if (isNaN(dateObj.getTime())) {
      return "N/A";
    }
    
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(dateObj);
  };

  const isPositive = rate.change >= 0;

  // Tính toán biểu đồ
  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return "";
    const maxValue = Math.max(...chartData.map((d) => d.value), rate.vndToUsd);
    const minValue = Math.min(...chartData.map((d) => d.value), rate.vndToUsd);
    const range = maxValue - minValue || 1;
    const width = 100;
    const height = 40;

    return chartData
      .map((item, index) => {
        const x = chartData.length > 1 ? (index / (chartData.length - 1)) * width : 0;
        const normalized = height - ((item.value - minValue) / range) * (height - 4) - 2;
        return `${x},${normalized}`;
      })
      .join(" ");
  }, [chartData, rate.vndToUsd]);

  const chartAreaPath = useMemo(() => {
    if (chartData.length === 0) return "";
    const maxValue = Math.max(...chartData.map((d) => d.value), rate.vndToUsd);
    const minValue = Math.min(...chartData.map((d) => d.value), rate.vndToUsd);
    const range = maxValue - minValue || 1;
    const width = 100;
    const height = 40;

    const points = chartData
      .map((item, index) => {
        const x = chartData.length > 1 ? (index / (chartData.length - 1)) * width : 0;
        const normalized = height - ((item.value - minValue) / range) * (height - 4) - 2;
        return `${x},${normalized}`;
      })
      .join(" ");

    const firstX = chartData.length > 1 ? 0 : 0;
    const lastX = chartData.length > 1 ? width : 0;
    const bottomY = height;

    return `M ${firstX},${bottomY} L ${points} L ${lastX},${bottomY} Z`;
  }, [chartData, rate.vndToUsd]);

  return (
    <div className="exchange-rate-widget">
      <div className="exchange-rate-widget__header">
        <div className="exchange-rate-widget__title">
          <i className="bi bi-currency-exchange me-2" />
          <span>Tỉ giá hối đoái</span>
        </div>
        <div className="exchange-rate-widget__header-actions">
          <button
            className="exchange-rate-widget__chart-btn"
            onClick={() => setShowChart(!showChart)}
            title={showChart ? "Ẩn biểu đồ" : "Xem biểu đồ"}
          >
            <i className={`bi ${showChart ? "bi-graph-up-arrow" : "bi-graph-up"}`} />
          </button>
          <button
            className="exchange-rate-widget__settings-btn"
            onClick={() => setShowCustomSourceModal(true)}
            title="Thiết lập nguồn tỉ giá tuỳ chỉnh"
          >
            <i className="bi bi-gear" />
          </button>
          <button
            className="exchange-rate-widget__refresh"
            onClick={fetchExchangeRate}
            disabled={loading}
            title="Làm mới"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? "exchange-rate-widget__refresh--spinning" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !rate.vndToUsd ? (
        <div className="exchange-rate-widget__loading">
          <i className="bi bi-arrow-repeat exchange-rate-widget__spinner" />
          <span>Đang tải...</span>
        </div>
      ) : error && !rate.vndToUsd ? (
        <div className="exchange-rate-widget__error">
          <i className="bi bi-exclamation-triangle" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="exchange-rate-widget__main">
            <div className="exchange-rate-widget__rate-item">
              <div className="exchange-rate-widget__currency">
                <span className="exchange-rate-widget__currency-code">VND</span>
                <i className="bi bi-arrow-right mx-2" />
                <span className="exchange-rate-widget__currency-code">USD</span>
              </div>
              <div className="exchange-rate-widget__rate-value">
                <span className="exchange-rate-widget__rate-number">
                  {rate.vndToUsd.toLocaleString("vi-VN")}
                </span>
                <span className="exchange-rate-widget__rate-unit">VND</span>
              </div>
            </div>

            <div className="exchange-rate-widget__rate-item">
              <div className="exchange-rate-widget__currency">
                <span className="exchange-rate-widget__currency-code">USD</span>
                <i className="bi bi-arrow-right mx-2" />
                <span className="exchange-rate-widget__currency-code">VND</span>
              </div>
              <div className="exchange-rate-widget__rate-value">
                <span className="exchange-rate-widget__rate-number">
                  {rate.usdToVnd.toLocaleString("vi-VN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 8,
                  })}
                </span>
                <span className="exchange-rate-widget__rate-unit">USD</span>
              </div>
            </div>
          </div>

          <div className="exchange-rate-widget__change">
            <div className={`exchange-rate-widget__change-indicator ${isPositive ? "positive" : "negative"}`}>
              <i className={`bi ${isPositive ? "bi-arrow-up" : "bi-arrow-down"}`} />
              <span>
                {isPositive ? "+" : ""}
                {rate.change.toLocaleString("vi-VN")} VND
              </span>
              <span className="exchange-rate-widget__change-percent">
                ({isPositive ? "+" : ""}
                {rate.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="exchange-rate-widget__update-time">
              <i className="bi bi-clock me-1" />
              <span>Cập nhật: {formatTime(rate.lastUpdate)}</span>
              <small style={{marginLeft: 8, color: '#6c757d'}}>Nguồn: {rate.source ? (rate.source === 'server' ? 'Server' : (rate.source === 'external' ? 'Public API' : (rate.source === 'custom' ? 'Tùy chỉnh' : 'Fallback'))) : 'Client'}</small>
            </div>
          </div>

          {/* Biểu đồ tỉ giá */}
          {showChart && (
            <div className="exchange-rate-widget__chart">
              <div className="exchange-rate-widget__chart-header">
                <h4>Biểu đồ tỉ giá VND/USD</h4>
                <span className="exchange-rate-widget__chart-period">7 ngày qua</span>
              </div>
              {chartData.length === 0 ? (
                <div className="exchange-rate-widget__chart-empty">
                  <i className="bi bi-graph-up" />
                  <p>Chưa có dữ liệu lịch sử</p>
                  <small>Dữ liệu sẽ được lưu tự động khi cập nhật tỉ giá</small>
                </div>
              ) : (
                <div className="exchange-rate-widget__chart-container">
                  <svg
                    viewBox="0 0 100 40"
                    className="exchange-rate-widget__chart-svg"
                    preserveAspectRatio="none"
                  >
                    {/* Area fill */}
                    <path
                      d={chartAreaPath}
                      className="exchange-rate-widget__chart-area"
                      fill="url(#exchangeRateGradient)"
                    />
                    {/* Line */}
                    <polyline
                      points={chartPoints}
                      className="exchange-rate-widget__chart-line"
                      fill="none"
                      strokeWidth="2"
                    />
                    {/* Gradient definition */}
                    <defs>
                      <linearGradient id="exchangeRateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(45, 153, 174, 0.3)" />
                        <stop offset="100%" stopColor="rgba(45, 153, 174, 0.05)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="exchange-rate-widget__chart-labels">
                    {chartData.map((item, index) => {
                      const date = new Date(item.date);
                      return (
                        <span key={index} className="exchange-rate-widget__chart-label">
                          {date.getDate()}/{date.getMonth() + 1}
                        </span>
                      );
                    })}
                  </div>
                  <div className="exchange-rate-widget__chart-values">
                    {chartData.length > 0 && (
                      <>
                        <span className="exchange-rate-widget__chart-min">
                          Min: {Math.min(...chartData.map((d) => d.value)).toLocaleString("vi-VN")} VND
                        </span>
                        <span className="exchange-rate-widget__chart-max">
                          Max: {Math.max(...chartData.map((d) => d.value)).toLocaleString("vi-VN")} VND
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal for setting custom exchange rate source */}
      {showCustomSourceModal && (
        <div className="exchange-rate-widget__modal-overlay">
          <div className="exchange-rate-widget__modal">
            <div className="exchange-rate-widget__modal-header">
              <h3>Thiết lập nguồn tỉ giá tuỳ chỉnh</h3>
              <button
                className="exchange-rate-widget__modal-close"
                onClick={() => setShowCustomSourceModal(false)}
              >
                <i className="bi bi-x" />
              </button>
            </div>
            <div className="exchange-rate-widget__modal-body">
              <p className="exchange-rate-widget__modal-hint">
                Nhập URL nguồn tỉ giá (ví dụ: Google Finance, hoặc API JSON).
                Để sử dụng nguồn mặc định, để trống và nhấn "Xoá".
              </p>
              <input
                type="text"
                className="exchange-rate-widget__modal-input"
                placeholder="https://www.google.com/finance/quote/USD-VND..."
                value={customSourceInput}
                onChange={(e) => setCustomSourceInput(e.target.value)}
              />
              <div className="exchange-rate-widget__modal-actions">
                <button
                  className="exchange-rate-widget__modal-btn exchange-rate-widget__modal-btn--save"
                  onClick={handleSaveCustomSource}
                >
                  Lưu
                </button>
                <button
                  className="exchange-rate-widget__modal-btn exchange-rate-widget__modal-btn--clear"
                  onClick={handleClearCustomSource}
                >
                  Xoá / Dùng mặc định
                </button>
                <button
                  className="exchange-rate-widget__modal-btn exchange-rate-widget__modal-btn--cancel"
                  onClick={() => setShowCustomSourceModal(false)}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

