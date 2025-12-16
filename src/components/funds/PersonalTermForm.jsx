// src/components/funds/PersonalTermForm.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useToast } from "../common/Toast/ToastContext";
import { calcEstimateDate } from "./utils/fundUtils";
import { formatVietnamDate } from "../../utils/dateFormat";
import { formatMoney } from "../../utils/formatMoney";
import { formatMoneyInput, parseMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/components/funds/FundForms.css";

export default function PersonalTermForm({ wallets, onSuccess }) {
  const { t } = useLanguage();
  const { createFund } = useFundData();
  const { showToast } = useToast();
  
  const [fundName, setFundName] = useState("");
  const [selectedCurrency] = useState("VND");
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [targetAmount, setTargetAmount] = useState("");
  const [targetError, setTargetError] = useState("");
  
  // Chỉ dùng VND
  const availableCurrencies = ["VND"];
  
  // Filter wallets: chỉ VND, ví cá nhân, và chưa có thành viên
  const filteredWallets = useMemo(() => {
    return wallets.filter(w => {
      // Chỉ lấy ví VND
      if ((w.currency || "VND") !== "VND") return false;
      
      // Chỉ lấy ví cá nhân (không phải ví nhóm)
      if (w.isShared === true) return false;
      
      // Chỉ lấy ví chưa có thành viên (membersCount <= 1 và không có sharedEmails)
      const membersCount = Number(w.membersCount || 0);
      const sharedEmails = Array.isArray(w.sharedEmails) ? w.sharedEmails : [];
      if (membersCount > 1 || sharedEmails.length > 0) return false;
      
      return true;
    });
  }, [wallets]);
  
  // Lấy wallet đã chọn
  const selectedWallet = useMemo(() => {
    return filteredWallets.find(w => String(w.id) === String(sourceWalletId)) || null;
  }, [filteredWallets, sourceWalletId]);
  
  // Reset sourceWalletId khi danh sách ví thay đổi
  useEffect(() => {
    setSourceWalletId("");
  }, [wallets]);

  const [freq, setFreq] = useState("MONTHLY");
  const [periodAmount, setPeriodAmount] = useState("");
  // Default start date = today (ISO format yyyy-MM-dd) so input[type=date] shows today's date
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDateError, setStartDateError] = useState("");
  const [calculatedEndDate, setCalculatedEndDate] = useState("");
  const [estimateText, setEstimateText] = useState("");
  
  // Ngày hôm nay (ISO yyyy-MM-dd) - tính động mỗi lần render để đảm bảo luôn là ngày hiện tại
  const getToday = () => new Date().toISOString().split('T')[0];
  
  // Handler để validate startDate
  const handleStartDateChange = (e) => {
    const value = e.target.value;
    const today = getToday();
    
    if (value && value < today) {
      setStartDateError(t('funds.form.error.start_date_future'));
      setStartDate(today); // Reset về hôm nay nếu chọn ngày quá khứ
      showToast(t("funds.form.error.start_date_past"), "error");
    } else {
      setStartDate(value);
      setStartDateError("");
    }
  };

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderData, setReminderData] = useState(null);
  
  const [autoTopupOn, setAutoTopupOn] = useState(false);
  const [autoTopupData, setAutoTopupData] = useState(null);
  const [depositMode, setDepositMode] = useState("manual"); // manual | auto
  const pillColor = "rgba(45, 153, 174, 0.9)";
  const pillBg = "rgba(45, 153, 174, 0.1)";

  // Mức tối thiểu cho mục tiêu tùy theo loại tiền
  const targetMin = 1000;

  // Validate target money
  useEffect(() => {
    if (!targetAmount) {
      setTargetError("");
      return;
    }

    const targetNum = getMoneyValue(targetAmount);
    if (Number.isNaN(targetNum) || targetNum <= 0) {
      setTargetError(t('funds.form.error.target_invalid'));
      return;
    }

    if (targetNum < targetMin) {
      const minLabel = targetMin.toLocaleString("en-US");
      setTargetError(
        t('funds.form.error.target_min', { min: minLabel, currency: selectedCurrency ? " " + selectedCurrency : "" })
      );
      return;
    }

    setTargetError("");
  }, [targetAmount, targetMin, t, selectedCurrency]);

  // Tính ngày kết thúc tự động
  useEffect(() => {
    const targetNum = getMoneyValue(targetAmount);
    const periodNum = getMoneyValue(periodAmount);

    if (
      !targetAmount ||
      !periodAmount ||
      Number.isNaN(targetNum) ||
      Number.isNaN(periodNum) ||
      periodNum <= 0 ||
      targetNum < targetMin
    ) {
      setCalculatedEndDate("");
      setEstimateText("");
      return;
    }

    // Tính từ 0đ lên mục tiêu
    const periods = Math.ceil(targetNum / periodNum);
    if (!periods || periods <= 0) {
      setCalculatedEndDate("");
      setEstimateText("");
      return;
    }

    const base = startDate || new Date().toISOString().slice(0, 10);
    const freqMap = {
      DAILY: "day",
      WEEKLY: "week",
      MONTHLY: "month",
      YEARLY: "year"
    };
    const doneDate = calcEstimateDate(base, freqMap[freq] || "month", periods);
    if (!doneDate) {
      setCalculatedEndDate("");
      setEstimateText("");
      return;
    }

    // Set ngày kết thúc tự động
    setCalculatedEndDate(doneDate);

    const dateStr = formatVietnamDate(doneDate);

    const unitText =
      freq === "DAILY"
        ? `${periods} ngày`
        : freq === "WEEKLY"
        ? `${periods} tuần`
        : freq === "MONTHLY"
        ? `${periods} tháng`
        : `${periods} năm`;

    setEstimateText(
      `Dự kiến hoàn thành sau khoảng ${unitText}, vào ngày ${dateStr}.`
    );
  }, [targetAmount, periodAmount, freq, startDate, targetMin]);

  // Reset lỗi/ước tính khi khởi tạo
  useEffect(() => {
    setTargetError("");
    setCalculatedEndDate("");
    setEstimateText("");
  }, []);

  const handleSave = async () => {
    // Validation
    if (!fundName.trim()) {
      showToast(t('funds.form.error.name_required'), "error");
      return;
    }
    if (!sourceWalletId) {
      showToast(t('funds.form.error.source_wallet_required'), "error");
      return;
    }
    if (!targetAmount) {
      showToast(t('funds.form.error.target_required'), "error");
      return;
    }
    if (targetError) {
      showToast(t('funds.form.error.target_invalid'), "error");
      return;
    }
    if (!startDate) {
      showToast(t('funds.form.error.start_date_required'), "error");
      return;
    }
    
    // Validate lại ngày bắt đầu trước khi submit
    const today = getToday();
    if (startDate < today) {
      setStartDateError(t('funds.form.error.start_date_future'));
      setStartDate(today);
      showToast(t('funds.form.error.start_date_past'), "error");
      return;
    }
    
    if (startDateError) {
      showToast(startDateError, "error");
      return;
    }
    
    if (!periodAmount || getMoneyValue(periodAmount) <= 0) {
      showToast(t('funds.form.error.period_amount_required'), "error");
      return;
    }
    if (!calculatedEndDate) {
      showToast(t('funds.form.error.cannot_calculate_end_date'), "error");
      return;
    }
    
    // Validate reminder nếu chế độ manual
    if (depositMode === "manual") {
      if (!reminderData) {
        showToast(t('funds.form.error.reminder_config_required'), "error");
        return;
      }
      if (!reminderData.reminderTime) {
        showToast(t('funds.form.error.reminder_time_required'), "error");
        return;
      }
      if ((reminderData.reminderType === "WEEKLY" || freq === "WEEKLY") && !reminderData.reminderDayOfWeek) {
        showToast(t('funds.form.error.reminder_weekday_required'), "error");
        return;
      }
      if ((reminderData.reminderType === "MONTHLY" || freq === "MONTHLY") && !reminderData.reminderDayOfMonth) {
        showToast(t('funds.form.error.reminder_monthday_required'), "error");
        return;
      }
    }
    
    // Validate auto topup nếu chế độ auto
    if (depositMode === "auto") {
      if (!autoTopupData) {
        showToast(t('funds.form.error.auto_topup_config_required'), "error");
        return;
      }
      if (!autoTopupData.autoDepositTime) {
        showToast(t('funds.form.error.auto_topup_time_required'), "error");
        return;
      }
      if (autoTopupData.autoDepositScheduleType === "WEEKLY" && !autoTopupData.autoDepositDayOfWeek) {
        showToast(t('funds.form.error.auto_topup_weekday_required'), "error");
        return;
      }
      if (autoTopupData.autoDepositScheduleType === "MONTHLY" && !autoTopupData.autoDepositDayOfMonth) {
        showToast(t('funds.form.error.auto_topup_monthday_required'), "error");
        return;
      }
      if (!autoTopupData.autoDepositStartAt) {
        showToast(t('funds.form.error.auto_topup_start_date_required'), "error");
        return;
      }
    }

    setSaving(true);

    try {
      // Chuẩn bị data
      const fundData = {
        fundName: fundName.trim(),
        sourceWalletId: Number(sourceWalletId),
        // Backend có nơi dùng currencyCode, nơi dùng currency: gửi cả hai để đảm bảo
        currencyCode: selectedCurrency,
        currency: selectedCurrency,
        fundType: "PERSONAL",
        hasDeadline: true,
        targetAmount: getMoneyValue(targetAmount),
        frequency: freq,
        amountPerPeriod: periodAmount ? getMoneyValue(periodAmount) : null,
        startDate,
        endDate: calculatedEndDate, // Sử dụng ngày kết thúc tự động tính
        note: note.trim() || null,
      };

      // Thêm reminder data nếu chế độ manual
      if (depositMode === "manual" && reminderData) {
        fundData.reminderEnabled = true;
        fundData.reminderType = reminderData.reminderType;
        fundData.reminderTime = reminderData.reminderTime;
        if (reminderData.reminderDayOfWeek) {
          fundData.reminderDayOfWeek = reminderData.reminderDayOfWeek;
        }
        if (reminderData.reminderDayOfMonth) {
          fundData.reminderDayOfMonth = reminderData.reminderDayOfMonth;
        }
        if (reminderData.reminderMonth) {
          fundData.reminderMonth = reminderData.reminderMonth;
        }
        if (reminderData.reminderDay) {
          fundData.reminderDay = reminderData.reminderDay;
        }
        fundData.autoDepositEnabled = false;
      } else if (depositMode === "auto" && autoTopupData) {
        // Thêm auto deposit data nếu chế độ auto
        fundData.autoDepositEnabled = true;
        fundData.autoDepositScheduleType = autoTopupData.autoDepositScheduleType;
        fundData.autoDepositTime = autoTopupData.autoDepositTime;
        fundData.autoDepositAmount = autoTopupData.autoDepositAmount ? Number(autoTopupData.autoDepositAmount) : null;

        // Always set schedule type/time/day fields when provided by autoTopupData.
        fundData.autoDepositScheduleType = autoTopupData.autoDepositScheduleType || autoTopupData.autoDepositType || null;
        fundData.autoDepositTime = autoTopupData.autoDepositTime || null;
        if (autoTopupData.autoDepositDayOfWeek) {
          fundData.autoDepositDayOfWeek = autoTopupData.autoDepositDayOfWeek;
        }
        if (autoTopupData.autoDepositDayOfMonth) {
          fundData.autoDepositDayOfMonth = autoTopupData.autoDepositDayOfMonth;
        }
        if (autoTopupData.autoDepositMonth) {
          fundData.autoDepositMonth = autoTopupData.autoDepositMonth;
        }
        if (autoTopupData.autoDepositDay) {
          fundData.autoDepositDay = autoTopupData.autoDepositDay;
        }
        if (autoTopupData.autoDepositStartAt) {
          fundData.autoDepositStartAt = autoTopupData.autoDepositStartAt;
        }
        fundData.reminderEnabled = false;
      } else {
        fundData.reminderEnabled = false;
        fundData.autoDepositEnabled = false;
      }

      console.log("Creating fund with data:", fundData);

      // Gọi API
      const result = await createFund(fundData);

      if (result.success) {
        showToast(t('funds.form.success.created'), "success");
        
        // Dispatch event để trigger reload wallets ở các component khác (bao gồm WalletsPage)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("fundCreated", {
            detail: { fundId: result.data?.id || result.data?.fundId }
          }));
        }
        
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        showToast(t('funds.form.error.create_failed', { error: result.error }), "error");
      }
    } catch (error) {
      console.error("Error creating fund:", error);
      showToast(t('funds.form.error.create_generic'), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="funds-grid">
      {/* THÔNG TIN QUỸ */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">{t('funds.form.section.info')}</div>

        {/* Hàng 1: Tên quỹ + Loại tiền tệ */}
        <div className="funds-field funds-field--inline">
          <div>
            <label>
              {t('funds.form.name')} <span className="req">*</span>
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder={t('funds.form.name_placeholder_term')}
              value={fundName}
              onChange={(e) => setFundName(e.target.value)}
            />
            <div className="funds-hint">{t('funds.form.name_hint')}</div>
          </div>
          <div>
            <label>{t('funds.form.currency')}</label>
            <input type="text" value="VND" disabled className="form-control" />
            <div className="funds-hint">{t('funds.form.currency_hint')}</div>
          </div>
        </div>

        {/* Hàng 2: Ví nguồn + Ngày tạo */}
        <div className="funds-field funds-field--inline">
          <div>
            <label>
              {t('funds.form.source_wallet')} <span className="req">*</span>
            </label>
            <select
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
            >
              <option value="">
                {filteredWallets.length === 0
                  ? t('funds.form.no_wallet_available')
                  : t('funds.form.source_wallet_placeholder')
                }
              </option>
              {filteredWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="funds-hint">
              {t('funds.form.source_wallet_hint')}
            </div>
            
            {/* Hiển thị số dư ví đã chọn */}
            {selectedWallet && (
              <div style={{ marginTop: '0.5rem' }}>
                <label>{t('funds.form.source_wallet_balance')}</label>
                <input
                  type="text"
                  value={formatMoney(selectedWallet.balance, selectedWallet.currency)}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            )}
          </div>
          <div>
            <label>{t('funds.form.created_date')}</label>
            <input
              type="text"
              value={new Date().toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <div className="funds-hint">
              {t('funds.form.created_date_hint')}
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="funds-field">
          <label>{t('funds.form.note')}</label>
          <textarea 
            rows={3} 
            placeholder={t('funds.form.note_placeholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* MỤC TIÊU + TẦN SUẤT */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">{t('funds.form.section.goal_frequency')}</div>

        <div className="funds-field">
          <label>
            {t('funds.form.target_amount')} {selectedCurrency && `(${selectedCurrency})`} <span className="req">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('funds.form.target_placeholder', { min: targetMin.toLocaleString("en-US"), currency: selectedCurrency || '' })}
            value={targetAmount}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (!inputValue) {
                setTargetAmount("");
                return;
              }
              const parsed = parseMoneyInput(inputValue);
              const formatted = formatMoneyInput(parsed);
              setTargetAmount(formatted);
            }}
          />
          <div className="funds-hint">
            {t('funds.form.target_hint', { min: targetMin.toLocaleString("en-US") })}
          </div>
          {targetError && <div className="funds-error">{targetError}</div>}
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>{t('funds.form.frequency')}</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="DAILY">{t('funds.form.freq_day')}</option>
              <option value="WEEKLY">{t('funds.form.freq_week')}</option>
              <option value="MONTHLY">{t('funds.form.freq_month')}</option>
            </select>
          </div>
          <div>
            <label>{t('funds.form.period_amount')}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={t('funds.form.period_amount_placeholder')}
              value={periodAmount}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (!inputValue) {
                  setPeriodAmount("");
                  return;
                }
                const parsed = parseMoneyInput(inputValue);
                const formatted = formatMoneyInput(parsed);
                setPeriodAmount(formatted);
              }}
            />
            <div className="funds-hint">
              {t('funds.form.period_amount_hint')}
            </div>
            {estimateText && (
              <div className="funds-hint funds-hint--strong">
                {estimateText}
              </div>
            )}
          </div>
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>{t('funds.form.start_date')} <span className="req">*</span></label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              onBlur={(e) => {
                // Double check khi blur
                const today = getToday();
                if (e.target.value && e.target.value < today) {
                  setStartDate(today);
                  setStartDateError(t('funds.form.error.start_date_future'));
                  showToast(t('funds.form.error.start_date_past'), "error");
                }
              }}
              min={getToday()}
              style={startDateError ? { borderColor: '#ef4444', boxShadow: '0 0 0 0.2rem rgba(239, 68, 68, 0.25)' } : {}}
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {t('funds.form.start_date_hint', { today: formatVietnamDate(new Date()) })}
            </div>
            {startDateError && (
              <div style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="bi bi-exclamation-circle-fill"></i>
                <strong>{startDateError}</strong>
              </div>
            )}
          </div>
          <div>
            <label>{t('funds.form.end_date_auto')}</label>
            <input
              type="text"
              value={calculatedEndDate ? formatVietnamDate(calculatedEndDate) : t('funds.form.end_date_placeholder')}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {t('funds.form.end_date_hint')}
            </div>
          </div>
        </div>

        {/* Chế độ nạp tiền */}
        <div className="funds-field">
          <label>{t('funds.form.deposit_mode')}</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: pillBg,
              border: `1px solid ${pillColor}`,
              borderRadius: "999px",
              padding: "0.25rem",
              width: "fit-content",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDepositMode("manual");
                setReminderOn(true);
                setAutoTopupOn(false);
              }}
              style={{
                border: `1px solid ${pillColor}`,
                background: depositMode === "manual" ? pillColor : "#fff",
                color: depositMode === "manual" ? "#fff" : pillColor,
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t('funds.form.deposit_mode_manual')}
            </button>
            <button
              type="button"
              onClick={() => {
                setDepositMode("auto");
                setAutoTopupOn(true);
                setReminderOn(false);
              }}
              style={{
                border: `1px solid ${pillColor}`,
                background: depositMode === "auto" ? pillColor : "#fff",
                color: depositMode === "auto" ? "#fff" : pillColor,
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t('funds.form.deposit_mode_auto')}
            </button>
          </div>
        </div>
      </div>

      {/* NHẮC NHỞ & TỰ ĐỘNG NẠP */}
      {depositMode === "manual" && (
        <ReminderBlock
          reminderOn={reminderOn}
          setReminderOn={setReminderOn}
          freq={freq}
          onDataChange={setReminderData}
          hideToggle={true}
        />
      )}

      {depositMode === "auto" && (
        <AutoTopupBlock
          autoTopupOn={autoTopupOn}
          setAutoTopupOn={setAutoTopupOn}
          freq={freq}
          onDataChange={setAutoTopupData}
          periodAmount={periodAmount}
          baseStartDate={startDate}
          hideToggle={true}
        />
      )}

      {/* ACTIONS */}
      <div className="funds-fieldset funds-fieldset--full">
        <div className="funds-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onSuccess && onSuccess()}
            disabled={saving}
          >
            {t('funds.form.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !!startDateError || !!targetError}
          >
            {saving ? t('funds.form.saving') : t('funds.form.save_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

