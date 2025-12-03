// src/components/funds/AutoTopupBlock.jsx
import React, { useEffect, useState } from "react";
import "../../styles/components/funds/FundForms.css";

export default function AutoTopupBlock({
  autoTopupOn,
  setAutoTopupOn,
  freq = "MONTHLY",
  onDataChange,
}) {
  const [autoTime, setAutoTime] = useState("");
  const [autoWeekDay, setAutoWeekDay] = useState("2");
  const [autoMonthDay, setAutoMonthDay] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  
  // Map week day string to number (1-7)
  const weekDayMap = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "1": 1
  };
  
  // Export data when anything changes
  useEffect(() => {
    if (!autoTopupOn || !onDataChange) return;
    
    const autoTopupData = {
      autoDepositType: freq,
      autoDepositScheduleType: freq,
      autoDepositAmount: autoAmount ? Number(autoAmount) : null,
      autoDepositTime: autoTime ? `${autoTime}:00` : null,
    };
    
    if (freq === "WEEKLY") {
      autoTopupData.autoDepositDayOfWeek = weekDayMap[autoWeekDay];
    } else if (freq === "MONTHLY") {
      autoTopupData.autoDepositDayOfMonth = autoMonthDay;
    }
    
    onDataChange(autoTopupData);
  }, [autoTopupOn, freq, autoTime, autoWeekDay, autoMonthDay, autoAmount, onDataChange]);

  const freqLabel = {
    DAILY: "Theo ngày",
    WEEKLY: "Theo tuần",
    MONTHLY: "Theo tháng",
  }[freq] || "Theo tháng";

  const weekOptions = [
    { value: "2", label: "Thứ 2" },
    { value: "3", label: "Thứ 3" },
    { value: "4", label: "Thứ 4" },
    { value: "5", label: "Thứ 5" },
    { value: "6", label: "Thứ 6" },
    { value: "7", label: "Thứ 7" },
    { value: "1", label: "Chủ nhật" },
  ];

  const renderAutoDepositForm = () => {
    if (freq === "DAILY") {
      return (
        <div className="funds-field">
          <label>Giờ tự động nạp (hàng ngày)</label>
          <input
            type="time"
            value={autoTime}
            onChange={(e) => setAutoTime(e.target.value)}
          />
          <div className="funds-hint">
            Hệ thống sẽ tự động nạp tiền mỗi ngày vào giờ đã chọn.
          </div>
        </div>
      );
    }

    if (freq === "WEEKLY") {
      return (
        <div className="funds-field funds-field--inline">
          <div>
            <label>Ngày trong tuần</label>
            <select
              value={autoWeekDay}
              onChange={(e) => setAutoWeekDay(e.target.value)}
            >
              {weekOptions.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Giờ tự động nạp</label>
            <input
              type="time"
              value={autoTime}
              onChange={(e) => setAutoTime(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: Thứ 7 lúc 20:00 hệ thống sẽ tự động nạp tiền vào quỹ.
          </div>
        </div>
      );
    }

    if (freq === "MONTHLY") {
      return (
        <>
          <div className="funds-field">
            <label>Ngày trong tháng <span className="req">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={autoMonthDay}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d+$/.test(value)) {
                  if (value === "") {
                    setAutoMonthDay("");
                  } else {
                    const num = Number(value);
                    if (num >= 1 && num <= 31) {
                      setAutoMonthDay(num);
                    }
                  }
                }
              }}
              placeholder="Nhập ngày (1-31)"
              required
            />
            {autoMonthDay > 28 && (
              <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                  Lưu ý ngày cuối tháng:
                </div>
                {autoMonthDay === 31 && (
                  <div>
                    • Tháng 30 ngày → nạp ngày 30<br/>
                    • Tháng 2 → nạp ngày 28/29
                  </div>
                )}
                {autoMonthDay === 30 && (
                  <div>
                    • Tháng 2 → nạp ngày 28/29
                  </div>
                )}
                {autoMonthDay === 29 && (
                  <div>
                    • Tháng 2 thường → nạp ngày 28
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="funds-field">
            <label>Giờ tự động nạp</label>
            <input
              type="time"
              value={autoTime}
              onChange={(e) => setAutoTime(e.target.value)}
            />
            <div className="funds-hint">
              Ví dụ: Ngày 5 hàng tháng lúc 20:00 hệ thống sẽ tự động nạp tiền.
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="funds-fieldset">
      <div className="funds-fieldset__legend">Tự động nạp tiền</div>

      <div className="funds-toggle-line">
        <span>Bật tự động nạp tiền vào quỹ</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={autoTopupOn}
            onChange={(e) => setAutoTopupOn(e.target.checked)}
          />
          <span className="switch__slider" />
        </label>
      </div>

      {!autoTopupOn && (
        <div className="funds-hint">
          Khi bật, hệ thống sẽ tự động nạp tiền vào quỹ theo tần xuất gửi quỹ.
        </div>
      )}

      {autoTopupOn && (
        <>
          <div className="funds-hint">
            Hệ thống sẽ tự động nạp tiền theo tần xuất gửi quỹ ({freqLabel}). Chọn giờ/ngày cụ thể.
          </div>
          
          {renderAutoDepositForm()}
          
          <div className="funds-field">
            <label>Số tiền tự nạp mỗi lần</label>
            <input 
              type="number"
              min={0}
              placeholder="Nhập số tiền"
              value={autoAmount}
              onChange={(e) => setAutoAmount(e.target.value)}
            />
            <div className="funds-hint">
              Số tiền này sẽ tự động chuyển từ ví nguồn vào quỹ theo lịch đã thiết lập.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
