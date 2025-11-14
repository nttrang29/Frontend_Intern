// src/components/funds/AutoTopupBlock.jsx
import React, { useEffect, useState } from "react";

export default function AutoTopupBlock({
  autoTopupOn,
  setAutoTopupOn,
  dependsOnReminder,
  reminderFreq = "day",
}) {
  const [mode, setMode] = useState(dependsOnReminder ? "follow" : "custom");
  const [customType, setCustomType] = useState("day");

  const [customTime, setCustomTime] = useState("");
  const [customWeekDay, setCustomWeekDay] = useState("mon");
  const [customMonthDay, setCustomMonthDay] = useState(1);
  const [customAmount, setCustomAmount] = useState("");

  const canFollowReminder = dependsOnReminder;

  const freqLabel =
    {
      day: "Theo ngày",
      week: "Theo tuần",
      month: "Theo tháng",
      year: "Theo năm",
    }[reminderFreq] || "Theo ngày";

  const weekOptions = [
    { value: "mon", label: "Thứ 2" },
    { value: "tue", label: "Thứ 3" },
    { value: "wed", label: "Thứ 4" },
    { value: "thu", label: "Thứ 5" },
    { value: "fri", label: "Thứ 6" },
    { value: "sat", label: "Thứ 7" },
    { value: "sun", label: "Chủ nhật" },
  ];

  useEffect(() => {
    if (!canFollowReminder && mode === "follow") {
      setMode("custom");
    }
  }, [canFollowReminder, mode]);

  const renderCustomContent = () => {
    if (customType === "day") {
      return (
        <div className="funds-field">
          <label>Thời gian & số tiền nạp (hàng ngày)</label>
          <div className="funds-field--inline">
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
            <input
              type="number"
              min={0}
              placeholder="Số tiền tự nạp mỗi ngày"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: 08:00 – 100.000 VND, hệ thống sẽ tự nạp mỗi ngày.
          </div>
        </div>
      );
    }

    if (customType === "week") {
      return (
        <div className="funds-field">
          <label>Thời gian & số tiền nạp (hàng tuần)</label>
          <div className="funds-field--inline">
            <div>
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
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
          </div>
          <div className="funds-field">
            <input
              type="number"
              min={0}
              placeholder="Số tiền tự nạp mỗi tuần"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            Ví dụ: Thứ 6 lúc 21:00 – 200.000 VND, hệ thống sẽ tự nạp mỗi tuần.
          </div>
        </div>
      );
    }

    return (
      <div className="funds-field">
        <label>Thời gian & số tiền nạp (hàng tháng)</label>
        <div className="funds-field--inline">
          <div>
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
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </div>
        </div>
        <div className="funds-field">
          <input
            type="number"
            min={0}
            placeholder="Số tiền tự nạp mỗi tháng"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
        </div>
        <div className="funds-hint">
          Ví dụ: ngày 10 hàng tháng lúc 09:00 – 500.000 VND, hệ thống sẽ tự nạp.
        </div>
      </div>
    );
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
          Khi bật, hệ thống có thể tự nạp tiền vào quỹ theo lịch bạn cấu hình.
        </div>
      )}

      {autoTopupOn && (
        <>
          <div className="funds-reminder-mode">
            <button
              type="button"
              className={
                "funds-pill-toggle" +
                (mode === "follow" ? " funds-pill-toggle--active" : "")
              }
              onClick={() => canFollowReminder && setMode("follow")}
              disabled={!canFollowReminder}
            >
              Nạp theo lịch nhắc nhở
            </button>
            <button
              type="button"
              className={
                "funds-pill-toggle" +
                (mode === "custom" ? " funds-pill-toggle--active" : "")
              }
              onClick={() => setMode("custom")}
            >
              Tự thiết lập lịch nạp
            </button>
          </div>

          {!canFollowReminder && (
            <div className="funds-hint">
              Để dùng chế độ <strong>nạp theo lịch nhắc nhở</strong>, hãy bật và
              cấu hình nhắc nhở ở phần trên.
            </div>
          )}

          {mode === "follow" && canFollowReminder && (
            <div className="funds-field">
              <label>Chế độ nạp theo lịch nhắc nhở</label>
              <div className="funds-hint">
                Hệ thống sẽ tự nạp tiền theo <strong>cùng lịch</strong> với{" "}
                <strong>tần suất gửi quỹ</strong> ({freqLabel}) và thời gian
                bạn đã chọn trong phần <strong>Nhắc nhở</strong>.
              </div>
            </div>
          )}

          {mode === "custom" && (
            <>
              <div className="funds-field">
                <label>Kiểu lịch tự nạp</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                >
                  <option value="day">Tự nạp theo ngày</option>
                  <option value="week">Tự nạp theo tuần</option>
                  <option value="month">Tự nạp theo tháng</option>
                </select>
                <div className="funds-hint">
                  Lịch tự nạp này <strong>không phụ thuộc</strong> vào tần suất
                  gửi quỹ hay lịch nhắc nhở.
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
