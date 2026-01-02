import React from "react";
import "../../styles/components/dashboard/ExchangeRateWidget.css";

export default function ExchangeRateWidget() {
  return (
    <div className="exchange-rate-widget">
      <div className="exchange-rate-widget__header">
        <div className="exchange-rate-widget__title">
          <i className="bi bi-currency-exchange me-2" />
          <span>Tỉ giá hối đoái</span>
        </div>
      </div>

      <div className="exchange-rate-widget__main">
        <p className="mb-1 fw-semibold">Ứng dụng hiện chỉ sử dụng VND.</p>
        <p className="text-muted mb-0">
          Tính năng quy đổi tiền tệ không còn khả dụng trên giao diện.
        </p>
      </div>
    </div>
  );
}

