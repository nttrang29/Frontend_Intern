// src/components/funds/ReminderBlock.jsx
import React, { useState } from "react";

export default function ReminderBlock({ reminderOn, setReminderOn, freq = "day" }) {
  const [mode, setMode] = useState("follow"); // follow | custom
  const [customType, setCustomType] = useState("day");

  const [followTime, setFollowTime] = useState("");
  const [followWeekDay, setFollowWeekDay] = useState("mon");
  const [followMonthDay, setFollowMonthDay] = useState(1);

  const [customTime, setCustomTime] = useState("");
  const [customWeekDay, setCustomWeekDay] = useState("mon");
  const [customMonthDay, setCustomMonthDay] = useState(1);

  const freqLabel =
    {
      day: "Theo ngày",
      week: "Theo tuần",
      month: "Theo tháng",
      year: "Theo năm",
    }[freq] || "Theo ngày";

  const weekOptions = [
    { value: "mon", label: "Thứ 2" },
    { value: "tue", label: "Thứ 3" },
    { value: "wed", label: "Thứ 4" },
    { value: "thu", label: "Thứ 5" },
    { value: "fri", label: "Thứ 6" },
    { value: "sat", label: "Thứ 7" },
    { value: "sun", label: "Chủ nhật" },
  ];

  const renderFollowContent = () => {
    if (freq === "day") {
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

    if (freq === "week") {
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
      <div className="funds-field funds-field--inline">
        <div>
          <label>Ngày nhắc trong tháng</label>
          <input
            type="number"
            min={1}
            max={31}
            value={followMonthDay}
            onChange={(e) =>
              setFollowMonthDay(
                Math.max(1, Math.min(31, Number(e.target.value) || 1))
              )
            }
          />
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
          Ví dụ: ngày 5 hàng tháng lúc 09:00 sẽ nhắc bạn gửi tiền vào quỹ.
        </div>
      </div>
    );
  };

  const renderCustomContent = () => {
    if (customType === "day") {
      return (
        <div className="funds-field">
          <label>Giờ nhắc (hàng ngày)</label>
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
          />
          <div className="funds-hint">
            Hệ thống sẽ nhắc bạn mỗi ngày vào giờ đã chọn.
          </div>
        </div>
      );
    }

    if (customType === "week") {
      return (
        <div className="funds-field funds-field--inline">
          <div>
            <label>Ngày trong tuần</label>
            <select
              value={customWeekDay}
              onChange={(e) => setCustomWeekDay(e.target.value)}
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
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: Thứ 7 lúc 20:30 sẽ nhắc bạn, dù tần suất gửi quỹ đang là gì.
          </div>
        </div>
      );
    }

    return (
      <div className="funds-field funds-field--inline">
        <div>
          <label>Ngày trong tháng</label>
          <input
            type="number"
            min={1}
            max={31}
            value={customMonthDay}
            onChange={(e) =>
              setCustomMonthDay(
                Math.max(1, Math.min(31, Number(e.target.value) || 1))
              )
            }
          />
        </div>
        <div>
          <label>Giờ nhắc trong ngày</label>
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
          />
        </div>
        <div className="funds-hint">
          Ví dụ: ngày 25 hàng tháng lúc 19:00 sẽ nhắc bạn.
        </div>
      </div>
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
          <div className="funds-reminder-mode">
            <button
              type="button"
              className={
                "funds-pill-toggle" +
                (mode === "follow" ? " funds-pill-toggle--active" : "")
              }
              onClick={() => setMode("follow")}
            >
              Theo tần suất gửi quỹ ({freqLabel})
            </button>
            <button
              type="button"
              className={
                "funds-pill-toggle" +
                (mode === "custom" ? " funds-pill-toggle--active" : "")
              }
              onClick={() => setMode("custom")}
            >
              Tự tạo lịch nhắc riêng
            </button>
          </div>

          {mode === "follow" && (
            <>
              <div className="funds-hint">
                Hệ thống sẽ dùng cùng tần suất với phần{" "}
                <strong>Số tiền gửi mỗi kỳ</strong>. Bạn chỉ cần chọn giờ / ngày
                cụ thể.
              </div>
              {renderFollowContent()}
            </>
          )}

          {mode === "custom" && (
            <>
              <div className="funds-field">
                <label>Kiểu nhắc nhở</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                >
                  <option value="day">Nhắc theo ngày</option>
                  <option value="week">Nhắc theo tuần</option>
                  <option value="month">Nhắc theo tháng</option>
                </select>
                <div className="funds-hint">
                  Bạn có thể chọn nhắc hàng ngày / hàng tuần / hàng tháng,
                  không phụ thuộc tần suất gửi quỹ.
                </div>
              </div>

              {renderCustomContent()}
            </>
          )}
        </>
      )}
    </div>
  );
}
