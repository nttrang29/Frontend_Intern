import React, { useMemo, useState } from "react";
import "../../styles/components/dashboard/CalendarWidget.css";
import { useLanguage } from "../../contexts/LanguageContext";

export default function CalendarWidget({ compact = false }) {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Tên tháng và năm
  const monthNames = useMemo(() => [
    t("calendar.month.1"), t("calendar.month.2"), t("calendar.month.3"), t("calendar.month.4"),
    t("calendar.month.5"), t("calendar.month.6"), t("calendar.month.7"), t("calendar.month.8"),
    t("calendar.month.9"), t("calendar.month.10"), t("calendar.month.11"), t("calendar.month.12")
  ], [t]);

  const dayNames = useMemo(() => [
    t("calendar.day_short.0"), t("calendar.day_short.1"), t("calendar.day_short.2"), t("calendar.day_short.3"),
    t("calendar.day_short.4"), t("calendar.day_short.5"), t("calendar.day_short.6")
  ], [t]);
  
  const dayNamesFull = useMemo(() => [
    t("calendar.day.0"), t("calendar.day.1"), t("calendar.day.2"), t("calendar.day.3"),
    t("calendar.day.4"), t("calendar.day.5"), t("calendar.day.6")
  ], [t]);

  const today = useMemo(() => new Date(), []);
  const weekdayLabel = dayNamesFull[today.getDay()];
  const dayNumber = today.getDate();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (compact) {
    return (
      <div className="calendar-widget calendar-widget--compact">
        <div className="calendar-widget__compact-header">
          <p className="calendar-widget__compact-month">
            {monthNames[today.getMonth()]} {today.getFullYear()}
          </p>
          <button className="calendar-widget__today-btn calendar-widget__today-btn--ghost" onClick={goToToday}>
            <i className="bi bi-calendar-check me-1" />
            {t("calendar.today")}
          </button>
        </div>
        <div className="calendar-widget__compact-date">
          <span className="calendar-widget__compact-day">
            {weekdayLabel}/{t("calendar.day_label")} {dayNumber}
          </span>
        </div>
      </div>
    );
  }

  // Lấy ngày đầu tiên của tháng và số ngày trong tháng
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Tạo mảng các ngày trong tháng
  const days = [];
  // Thêm các ô trống cho ngày đầu tháng
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  // Thêm các ngày trong tháng
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="calendar-widget">
      <div className="calendar-widget__header">
        <button
          className="calendar-widget__nav-btn"
          onClick={goToPreviousMonth}
          title={t("calendar.prev_month")}
        >
          <i className="bi bi-chevron-left" />
        </button>
        <div className="calendar-widget__month-year">
          <h4>{monthNames[month]}</h4>
          <span>{year}</span>
        </div>
        <button
          className="calendar-widget__nav-btn"
          onClick={goToNextMonth}
          title={t("calendar.next_month")}
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="calendar-widget__body">
        <div className="calendar-widget__weekdays">
          {dayNames.map((day) => (
            <div key={day} className="calendar-widget__weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-widget__days">
          {days.map((day, index) => (
            <div
              key={index}
              className={`calendar-widget__day ${
                day === null ? "calendar-widget__day--empty" : ""
              } ${isToday(day) ? "calendar-widget__day--today" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-widget__footer">
        <button
          className="calendar-widget__today-btn"
          onClick={goToToday}
        >
          <i className="bi bi-calendar-check me-1" />
          {t("calendar.today")}
        </button>
      </div>
    </div>
  );
}

