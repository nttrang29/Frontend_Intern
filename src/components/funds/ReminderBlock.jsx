// src/components/funds/ReminderBlock.jsx
import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/components/funds/FundForms.css";

export default function ReminderBlock({ 
  reminderOn, 
  setReminderOn, 
  freq = "MONTHLY", 
  onDataChange, 
  hideToggle = false, 
  initialValues = null,
  hasTodayReminder = false,
  nextReminderDate = null,
}) {
  const { t } = useLanguage();
  // Map week day string to number (1-7)
  const weekDayMap = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "1": 1
  };
  
  // Lazy initialization - chỉ chạy một lần khi component mount
  const getInitialTime = () => {
    if (initialValues?.reminderTime) {
      const timeStr = initialValues.reminderTime;
      return timeStr.includes(':') ? timeStr.slice(0, 5) : timeStr;
    }
    return "";
  };
  
  const getInitialWeekDay = () => {
    return initialValues?.reminderDayOfWeek ? String(initialValues.reminderDayOfWeek) : "2";
  };
  
  const getInitialMonthDay = () => {
    return initialValues?.reminderDayOfMonth ? String(initialValues.reminderDayOfMonth) : "";
  };
  
  const [followTime, setFollowTime] = useState(getInitialTime);
  const [followWeekDay, setFollowWeekDay] = useState(getInitialWeekDay);
  const [followMonthDay, setFollowMonthDay] = useState(getInitialMonthDay);
  
  // Dùng useRef để lưu onDataChange - tránh re-create function mỗi lần render gây infinite loop
  const onDataChangeRef = React.useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Export data when anything changes
  useEffect(() => {
    const effectiveOn = hideToggle ? true : reminderOn;
    if (!effectiveOn || !onDataChangeRef.current) return;
    
    const reminderData = {};
    
    // Follow frequency (only mode available)
    reminderData.reminderType = freq;
    reminderData.reminderTime = followTime ? `${followTime}:00` : null;
    
    if (freq === "WEEKLY") {
      reminderData.reminderDayOfWeek = weekDayMap[followWeekDay];
    } else if (freq === "MONTHLY" || freq === "YEARLY") {
      reminderData.reminderDayOfMonth = followMonthDay;
    }
    
    onDataChangeRef.current(reminderData);
  }, [reminderOn, freq, followTime, followWeekDay, followMonthDay, hideToggle]);

  const freqLabel =
    {
      DAILY: t('funds.form.freq_day'),
      WEEKLY: t('funds.form.freq_week'),
      MONTHLY: t('funds.form.freq_month'),
    }[freq] || t('funds.form.freq_month');

  const weekOptions = [
    { value: "2", label: t('common.day.mon') },
    { value: "3", label: t('common.day.tue') },
    { value: "4", label: t('common.day.wed') },
    { value: "5", label: t('common.day.thu') },
    { value: "6", label: t('common.day.fri') },
    { value: "7", label: t('common.day.sat') },
    { value: "1", label: t('common.day.sun') },
  ];

  const renderFollowContent = () => {
    if (freq === "DAILY") {
      return (
        <div className="funds-field">
          <label>{t('funds.form.reminder_time_label')}</label>
            <input
              type="time"
              value={followTime || ""}
              onChange={(e) => setFollowTime(e.target.value)}
            />
          <div className="funds-hint">
            {t('funds.form.reminder_time_hint_daily')}
          </div>
        </div>
      );
    }

    if (freq === "WEEKLY") {
      return (
        <div className="funds-field funds-field--inline">
          <div>
            <label>{t('funds.form.reminder_weekday_label')}</label>
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
            <label>{t('funds.form.reminder_time_label')}</label>
            <input
              type="time"
              value={followTime || ""}
              onChange={(e) => setFollowTime(e.target.value)}
            />
          </div>
          <div className="funds-hint">
            {t('funds.form.reminder_time_hint_weekly')}
            {followTime && (
              <div style={{ marginTop: '0.5rem', color: '#f59e0b', fontWeight: '600' }}>
                {hasTodayReminder
                  ? t('funds.form.reminder_time_apply_next', { date: nextReminderDate || t('funds.form.next_week') })
                  : t('funds.form.reminder_time_apply_next_generic')}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="funds-field funds-field--inline">
          <div>
            <label>{t('funds.form.reminder_monthday_label')} <span className="req">*</span></label>
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
              placeholder={t('funds.form.reminder_monthday_placeholder')}
              required
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {t('funds.form.reminder_monthday_hint')}
            </div>
            {followMonthDay > 28 && (
              <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                  {t('funds.form.reminder_monthday_warning_title')}
                </div>
                {followMonthDay === 31 && (
                  <div>
                    {t('funds.form.reminder_monthday_warning_31')}
                  </div>
                )}
                {followMonthDay === 30 && (
                  <div>
                    {t('funds.form.reminder_monthday_warning_30')}
                  </div>
                )}
                {followMonthDay === 29 && (
                  <div>
                    {t('funds.form.reminder_monthday_warning_29')}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label>{t('funds.form.reminder_time_label')}</label>
            <input
              type="time"
              value={followTime || ""}
              onChange={(e) => setFollowTime(e.target.value)}
            />
          </div>
        </div>
        <div className="funds-hint">
          {t('funds.form.reminder_time_hint_monthly')}
          {followTime && (
            <div style={{ marginTop: '0.5rem', color: '#f59e0b', fontWeight: '600' }}>
              {hasTodayReminder
                ? t('funds.form.reminder_time_apply_next', { date: nextReminderDate || t('funds.form.next_month') })
                : t('funds.form.reminder_time_apply_next_generic')}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="funds-fieldset">
      <div className="funds-fieldset__legend">{t('funds.form.reminder_legend')}</div>

      {!hideToggle && (
        <div className="funds-toggle-line">
          <span>{t('funds.form.reminder_toggle')}</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={reminderOn}
              onChange={(e) => setReminderOn(e.target.checked)}
            />
            <span className="switch__slider" />
          </label>
        </div>
      )}

      {!hideToggle && !reminderOn && (
        <div className="funds-hint">
          {t('funds.form.reminder_toggle_hint')}
        </div>
      )}

      {(hideToggle || reminderOn) && (
        <>
          <div className="funds-hint">
            {t('funds.form.reminder_hint', { freq: freqLabel })}
          </div>
          {renderFollowContent()}
        </>
      )}
    </div>
  );
}
