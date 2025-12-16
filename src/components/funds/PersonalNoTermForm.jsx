// src/components/funds/PersonalNoTermForm.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useToast } from "../common/Toast/ToastContext";
import { formatMoney } from "../../utils/formatMoney";
import { formatMoneyInput, parseMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/components/funds/FundForms.css";

export default function PersonalNoTermForm({ wallets, onSuccess }) {
  const { t } = useLanguage();
  const { createFund } = useFundData();
  const { showToast } = useToast();
  
  const [fundName, setFundName] = useState("");
  const [selectedCurrency] = useState("VND");
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [note, setNote] = useState("");
  // Default start date to today (local date, not UTC) so user can adjust if needed
  const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [startDate, setStartDate] = useState(getTodayLocal());
  const [periodAmount, setPeriodAmount] = useState("");
  const [saving, setSaving] = useState(false);
  
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

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderData, setReminderData] = useState(null);
  
  const [autoTopupOn, setAutoTopupOn] = useState(false);
  const [autoTopupData, setAutoTopupData] = useState(null);
  const [depositMode, setDepositMode] = useState("manual"); // manual | auto
  const pillColor = "rgba(45, 153, 174, 0.9)";
  const pillBg = "rgba(45, 153, 174, 0.1)";
  
  const [freq, setFreq] = useState("MONTHLY");

  const handleSave = async () => {
    // Validation
    if (!fundName.trim()) {
      showToast(t("funds.form.error.name_required"), "error");
      return;
    }
    if (!sourceWalletId) {
      showToast(t('funds.form.error.source_wallet_required'), "error");
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

    // Validate startDate không được là ngày quá khứ (dùng local date)
    if (startDate) {
      const today = getTodayLocal();
      if (startDate < today) {
        showToast(t('funds.form.error.start_date_past'), "error");
        setStartDate(today); // Reset về hôm nay
        return;
      }
    }

    setSaving(true);

    try {
      // Chuẩn bị data
      const fundData = {
        fundName: fundName.trim(),
        sourceWalletId: Number(sourceWalletId),
        fundType: "PERSONAL",
        hasDeadline: false,
        frequency: freq,
        amountPerPeriod: periodAmount ? getMoneyValue(periodAmount) : null,
        startDate: startDate || null,
        // Không gửi endDate cho quỹ không thời hạn
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

        fundData.autoDepositScheduleType = autoTopupData.autoDepositScheduleType || autoTopupData.autoDepositType || null;
        fundData.autoDepositTime = autoTopupData.autoDepositTime || null;
        if (autoTopupData.autoDepositStartAt) {
          fundData.autoDepositStartAt = autoTopupData.autoDepositStartAt;
        }
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
        fundData.reminderEnabled = false;
      } else {
        fundData.reminderEnabled = false;
        fundData.autoDepositEnabled = false;
      }

      console.log("Creating fund (no term) with data:", fundData);

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
              placeholder={t('funds.form.name_placeholder_no_term')}
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

      {/* TẦN SUẤT GỬI (TÙY CHỌN) */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">{t('funds.form.section.frequency_optional')}</div>

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
              placeholder={t('funds.form.period_amount_optional')}
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
            disabled={saving}
          >
            {saving ? t('funds.form.saving') : t('funds.form.save_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

