// src/components/funds/AutoTopupBlock.jsx
import React, { useEffect, useState, useRef } from "react";
import { getMoneyValue, formatMoneyInput } from "../../utils/formatMoneyInput";
import "../../styles/components/funds/FundForms.css";

// Map week day string to number (1-7) - MOVE RA NGOÀI để tránh re-create mỗi lần render
const WEEK_DAY_MAP = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "1": 1
};

export default function AutoTopupBlock({
  autoTopupOn,
  setAutoTopupOn,
  freq = "MONTHLY",
  onDataChange,
  periodAmount = null, // số tiền gửi mỗi kỳ (nếu có) — dùng để tính tự động nạp
  lockMode = false, // nếu true: không cho thay đổi chế độ auto/manual, chỉ hiển thị
  initialValues = null,
  baseStartDate = null,
  hideToggle = false, // nếu true: ẩn nút bật/tắt, luôn hiển thị nội dung
  disableStartDate = false, // nếu true: disable trường ngày bắt đầu áp dụng
  hasTodayAutoDeposit = false,
  nextAutoDepositDate = null,
}) {
  // Lazy initialization - chỉ chạy một lần khi component mount
  const getInitialTime = () => {
    if (initialValues?.autoDepositTime) {
      const timeStr = initialValues.autoDepositTime;
      return timeStr.includes(':') ? timeStr.slice(0, 5) : timeStr;
    }
    return "";
  };
  
  const getInitialWeekDay = () => {
    return initialValues?.autoDepositDayOfWeek ? String(initialValues.autoDepositDayOfWeek) : "2";
  };
  
  const getInitialMonthDay = () => {
    return initialValues?.autoDepositDayOfMonth ? String(initialValues.autoDepositDayOfMonth) : "";
  };
  
  const getInitialStartAt = () => {
    if (initialValues?.autoDepositStartAt) {
      const startAtStr = initialValues.autoDepositStartAt;
      return startAtStr.includes('T') ? startAtStr.slice(0, 16) : startAtStr;
    }
    return "";
  };
  
  const [autoTime, setAutoTime] = useState(getInitialTime);
  const [autoWeekDay, setAutoWeekDay] = useState(getInitialWeekDay);
  const [autoMonthDay, setAutoMonthDay] = useState(getInitialMonthDay);
  const [autoStartAt, setAutoStartAt] = useState(getInitialStartAt);
  const inputsDisabled = lockMode;
  
  // Dùng useRef để lưu onDataChange - tránh re-create function mỗi lần render
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  useEffect(() => {
    if (!autoStartAt && baseStartDate && autoTime) {
      setAutoStartAt(`${baseStartDate}T${autoTime}`);
    }
  }, [autoStartAt, baseStartDate, autoTime]);

  useEffect(() => {
    // Sử dụng ref để gọi callback mới nhất mà không gây re-run effect
    if (!onDataChangeRef.current) {
      return;
    }

    const effectiveOn = hideToggle ? true : autoTopupOn;
    if (!effectiveOn) {
      onDataChangeRef.current(null);
      return;
    }

    // Nếu có periodAmount (số tiền gửi mỗi kỳ), sử dụng giá trị đó làm số tiền tự nạp.
    const computedAmount = periodAmount ? getMoneyValue(periodAmount) : null;

    const autoTopupData = {
      autoDepositType: freq,
      autoDepositScheduleType: freq,
      autoDepositAmount: computedAmount,
      autoDepositTime: autoTime ? `${autoTime}:00` : null,
      autoDepositStartAt: autoStartAt ? `${autoStartAt}:00` : null,
    };

    if (freq === "WEEKLY") {
      autoTopupData.autoDepositDayOfWeek = WEEK_DAY_MAP[autoWeekDay];
    } else if (freq === "MONTHLY") {
      autoTopupData.autoDepositDayOfMonth = autoMonthDay ? Number(autoMonthDay) : null;
    }

    onDataChangeRef.current(autoTopupData);
  }, [autoTopupOn, freq, autoTime, autoWeekDay, autoMonthDay, autoStartAt, periodAmount, hideToggle]);

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
      const timeHintText = hasTodayAutoDeposit
        ? `Thời gian mới sẽ áp dụng cho lần nạp tiếp theo vào ngày ${nextAutoDepositDate || 'kỳ tới'}.`
        : "Thời gian mới sẽ áp dụng cho lần nạp tới.";
      return (
        <div className="funds-field">
          <label>Giờ tự động nạp (hàng ngày)</label>
          <input
            type="time"
            value={autoTime || ""}
            onChange={(e) => setAutoTime(e.target.value)}
            disabled={inputsDisabled}
          />
          <div className="funds-hint">
            Hệ thống sẽ tự động nạp tiền mỗi ngày vào giờ đã chọn.
          </div>
          <div className="funds-hint" style={{ marginTop: '0.35rem', color: '#92400e' }}>
            {timeHintText}
          </div>
        </div>
      );
    }

    if (freq === "WEEKLY") {
      const timeHintText = hasTodayAutoDeposit
        ? `Thời gian mới sẽ áp dụng cho lần nạp tiếp theo vào ngày ${nextAutoDepositDate || 'kỳ tới'}.`
        : "Thời gian mới sẽ áp dụng cho lần nạp tới.";
      return (
        <div className="funds-field funds-field--inline">
          <div>
            <label>Ngày trong tuần</label>
            <select
              value={autoWeekDay}
              onChange={(e) => setAutoWeekDay(e.target.value)}
              disabled={inputsDisabled}
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
              value={autoTime || ""}
              onChange={(e) => setAutoTime(e.target.value)}
              disabled={inputsDisabled}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: Thứ 7 lúc 20:00 hệ thống sẽ tự động nạp tiền vào quỹ.
          </div>
          <div className="funds-hint" style={{ marginTop: '0.35rem', color: '#92400e' }}>
            {timeHintText}
          </div>
        </div>
      );
    }

    if (freq === "MONTHLY") {
      const timeHintText = hasTodayAutoDeposit
        ? `Thời gian mới sẽ áp dụng cho lần nạp tiếp theo vào ngày ${nextAutoDepositDate || 'kỳ tới'}.`
        : "Thời gian mới sẽ áp dụng cho lần nạp tới.";
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
              disabled={inputsDisabled}
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
              value={autoTime || ""}
              onChange={(e) => setAutoTime(e.target.value)}
              disabled={inputsDisabled}
            />
            <div className="funds-hint">
              Ví dụ: Ngày 5 hàng tháng lúc 20:00 hệ thống sẽ tự động nạp tiền.
            </div>
            <div className="funds-hint" style={{ marginTop: '0.35rem', color: '#92400e' }}>
              {timeHintText}
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

      {/* Nếu lockMode: chỉ hiển thị chế độ hiện tại, không cho toggle */}
      {!hideToggle && !lockMode && (
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
      )}

      {!hideToggle && lockMode && (
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Chế độ nạp:</strong> {autoTopupOn ? 'Nạp tự động' : 'Nạp thủ công'}
        </div>
      )}

      {!hideToggle && !autoTopupOn && (
        <div className="funds-hint">
          Khi bật, hệ thống sẽ tự động nạp tiền vào quỹ theo tần xuất gửi quỹ.
        </div>
      )}

      {(hideToggle || autoTopupOn) && (
        <>
          <div className="funds-hint">
            Hệ thống sẽ tự động nạp tiền theo tần xuất gửi quỹ ({freqLabel}). Chọn giờ/ngày cụ thể.
          </div>

          {renderAutoDepositForm()}

          <div className="funds-field">
            <label>Ngày bắt đầu áp dụng</label>
            <input
              type="datetime-local"
              step="60"
              value={autoStartAt}
              onChange={(e) => setAutoStartAt(e.target.value)}
              disabled={inputsDisabled || disableStartDate}
              style={disableStartDate ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            />
            <div className="funds-hint">
              {disableStartDate 
                ? "Ngày bắt đầu không thể thay đổi sau khi tạo quỹ."
                : "Hệ thống chỉ thực hiện nạp tự động kể từ thời điểm này trở đi."}
            </div>
          </div>

          <div className="funds-field">
            <label>Số tiền tự nạp mỗi lần</label>
            <input 
              type="text"
              placeholder={periodAmount ? formatMoneyInput(periodAmount) : "Sẽ lấy theo Số tiền gửi mỗi kỳ"}
              value={periodAmount ? formatMoneyInput(periodAmount) : ""}
              disabled
            />
            <div className="funds-hint">
              Số tiền tự động nạp sẽ được lấy theo "Số tiền gửi mỗi kỳ" của quỹ. Người dùng không thể chỉnh trực tiếp ở đây.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
