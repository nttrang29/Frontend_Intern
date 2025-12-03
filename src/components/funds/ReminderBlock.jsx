// src/components/funds/ReminderBlock.jsx
import React, { useState, useEffect } from "react";
import "../../styles/components/funds/FundForms.css";

export default function ReminderBlock({ reminderOn, setReminderOn, freq = "MONTHLY", onDataChange }) {
  const [followTime, setFollowTime] = useState("");
  const [followWeekDay, setFollowWeekDay] = useState("2");
  const [followMonthDay, setFollowMonthDay] = useState("");
  
  // Map week day string to number (1-7)
  const weekDayMap = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "1": 1
  };
  
  // Export data when anything changes
  useEffect(() => {
    if (!reminderOn || !onDataChange) return;
    
    const reminderData = {};
    
    // Follow frequency (only mode available)
    reminderData.reminderType = freq;
    reminderData.reminderTime = followTime ? `${followTime}:00` : null;
    
    if (freq === "WEEKLY") {
      reminderData.reminderDayOfWeek = weekDayMap[followWeekDay];
    } else if (freq === "MONTHLY" || freq === "YEARLY") {
      reminderData.reminderDayOfMonth = followMonthDay;
    }
    
    onDataChange(reminderData);
  }, [reminderOn, freq, followTime, followWeekDay, followMonthDay, onDataChange]);

  const freqLabel =
    {
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

  const renderFollowContent = () => {
    if (freq === "DAILY") {
      return (
        <div className="funds-field">
          <label>Giờ nhắc trong ngày</label>
          <input
            type="time"
            value={followTime}
            onChange={(e) => setFollowTime(e.target.value)}
          />
          <div className="funds-hint">
            Ví dụ: 08:00 mỗi ngày sẽ nhắc bạn gửi tiền vào quỹ.
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
              value={followWeekDay}
              onChange={(e) => setFollowWeekDay(e.target.value)}
            >
              {weekOptions.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Giờ nhắc trong ngày</label>
            <input
              type="time"
              value={followTime}
              onChange={(e) => setFollowTime(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: Thứ 6 lúc 21:00 sẽ nhắc bạn gửi tiền mỗi tuần.
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="funds-field funds-field--inline">
          <div>
            <label>Ngày nhắc trong tháng <span className="req">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={followMonthDay}
              onChange={(e) => {
                const value = e.target.value;
                // Chỉ cho phép số
                if (value === "" || /^\d+$/.test(value)) {
                  if (value === "") {
                    setFollowMonthDay("");
                  } else {
                    const num = Number(value);
                    if (num >= 1 && num <= 31) {
                      setFollowMonthDay(num);
                    }
                  }
                }
              }}
              placeholder="Nhập ngày (1-31)"
              required
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              Chọn ngày từ 1-31. Ví dụ: ngày 5
            </div>
            {followMonthDay > 28 && (
              <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                  Lưu ý ngày cuối tháng:
                </div>
                {followMonthDay === 31 && (
                  <div>
                    • Tháng 30 ngày (4,6,9,11): nhắc ngày 30<br/>
                    • Tháng 2: nhắc ngày 28 (hoặc 29 năm nhuận)
                  </div>
                )}
                {followMonthDay === 30 && (
                  <div>
                    • Tháng 2: nhắc ngày 28 (hoặc 29 năm nhuận)
                  </div>
                )}
                {followMonthDay === 29 && (
                  <div>
                    • Tháng 2 thường: nhắc ngày 28
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label>Giờ nhắc trong ngày</label>
            <input
              type="time"
              value={followTime}
              onChange={(e) => setFollowTime(e.target.value)}
            />
          </div>
        </div>
        <div className="funds-hint">
          Ví dụ: ngày 5 hàng tháng lúc 09:00 sẽ nhắc bạn gửi tiền vào quỹ.
        </div>
      </>
    );
  };

  return (
    <div className="funds-fieldset">
      <div className="funds-fieldset__legend">Nhắc nhở</div>

      <div className="funds-toggle-line">
        <span>Bật nhắc nhở cho quỹ này</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={reminderOn}
            onChange={(e) => setReminderOn(e.target.checked)}
          />
          <span className="switch__slider" />
        </label>
      </div>

      {!reminderOn && (
        <div className="funds-hint">
          Khi cần, bạn có thể bật lại để hệ thống nhắc theo tần suất mong muốn.
        </div>
      )}

      {reminderOn && (
        <>
          <div className="funds-hint">
            Hệ thống sẽ nhắc nhở theo tần suất gửi quỹ ({freqLabel}). 
            Bạn chỉ cần chọn giờ / ngày cụ thể.
          </div>
          {renderFollowContent()}
        </>
      )}
    </div>
  );
}
