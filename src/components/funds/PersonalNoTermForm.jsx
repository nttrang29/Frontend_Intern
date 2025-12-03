// src/components/funds/PersonalNoTermForm.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useToast } from "../common/Toast/ToastContext";
import { formatMoney } from "../../utils/formatMoney";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import "../../styles/components/funds/FundForms.css";

export default function PersonalNoTermForm({ wallets, onSuccess }) {
  const { createFund } = useFundData();
  const { showToast } = useToast();
  
  const [fundName, setFundName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [periodAmount, setPeriodAmount] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Lấy danh sách loại tiền tệ unique từ wallets
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(wallets.map(w => w.currency))];
    return currencies.sort();
  }, [wallets]);
  
  // Filter wallets theo currency đã chọn
  const filteredWallets = useMemo(() => {
    if (!selectedCurrency) return [];
    return wallets.filter(w => w.currency === selectedCurrency);
  }, [wallets, selectedCurrency]);
  
  // Lấy wallet đã chọn
  const selectedWallet = useMemo(() => {
    return filteredWallets.find(w => String(w.id) === String(sourceWalletId)) || null;
  }, [filteredWallets, sourceWalletId]);
  
  // Reset sourceWalletId khi đổi currency
  useEffect(() => {
    setSourceWalletId("");
  }, [selectedCurrency]);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderData, setReminderData] = useState(null);
  
  const [autoTopupOn, setAutoTopupOn] = useState(false);
  const [autoTopupData, setAutoTopupData] = useState(null);
  
  const [freq, setFreq] = useState("MONTHLY");

  const handleSave = async () => {
    // Validation
    if (!fundName.trim()) {
      showToast("Vui lòng nhập tên quỹ.", "error");
      return;
    }
    if (!selectedCurrency) {
      showToast("Vui lòng chọn loại tiền tệ.", "error");
      return;
    }
    if (!sourceWalletId) {
      showToast("Vui lòng chọn ví nguồn để nạp tiền vào quỹ.", "error");
      return;
    }
    
    // Validate auto topup nếu bật
    if (autoTopupOn && autoTopupData) {
      if (autoTopupData.autoDepositType === "FOLLOW_REMINDER" && !reminderOn) {
        showToast("Bạn phải bật nhắc nhở nếu dùng chế độ nạp theo lịch nhắc nhở.", "error");
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
        amountPerPeriod: periodAmount ? Number(periodAmount) : null,
        startDate: startDate || null,
        note: note.trim() || null,
      };

      // Thêm reminder data nếu bật
      if (reminderOn && reminderData) {
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
      } else {
        fundData.reminderEnabled = false;
      }

      // Thêm auto deposit data nếu bật
      if (autoTopupOn && autoTopupData) {
        fundData.autoDepositEnabled = true;
        fundData.autoDepositType = autoTopupData.autoDepositType;
        fundData.autoDepositAmount = autoTopupData.autoDepositAmount ? Number(autoTopupData.autoDepositAmount) : null;
        
        if (autoTopupData.autoDepositType === "CUSTOM_SCHEDULE") {
          fundData.autoDepositScheduleType = autoTopupData.autoDepositScheduleType;
          fundData.autoDepositTime = autoTopupData.autoDepositTime;
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
        }
      } else {
        fundData.autoDepositEnabled = false;
      }

      console.log("Creating fund (no term) with data:", fundData);

      // Gọi API
      const result = await createFund(fundData);

      if (result.success) {
        showToast("Tạo quỹ thành công!", "success");
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        showToast(`Không thể tạo quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error creating fund:", error);
      showToast("Đã xảy ra lỗi khi tạo quỹ. Vui lòng thử lại.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="funds-grid">
      {/* THÔNG TIN QUỸ */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Thông tin quỹ</div>

        {/* Hàng 1: Tên quỹ + Loại tiền tệ */}
        <div className="funds-field funds-field--inline">
          <div>
            <label>
              Tên quỹ <span className="req">*</span>
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="Ví dụ: Quỹ khẩn cấp"
              value={fundName}
              onChange={(e) => setFundName(e.target.value)}
            />
            <div className="funds-hint">Tối đa 50 ký tự. Ví quỹ sẽ được tự động tạo với số dư ban đầu là 0đ.</div>
          </div>
          <div>
            <label>
              Chọn loại tiền tệ <span className="req">*</span>
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="">-- Chọn loại tiền tệ --</option>
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <div className="funds-hint">
              Chọn loại tiền tệ cho quỹ của bạn.
            </div>
          </div>
        </div>

        {/* Hàng 2: Ví nguồn + Ngày tạo */}
        <div className="funds-field funds-field--inline">
          <div>
            <label>
              Chọn ví nguồn để nạp tiền vào quỹ <span className="req">*</span>
            </label>
            <select
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
              disabled={!selectedCurrency}
            >
              <option value="">
                {!selectedCurrency 
                  ? "-- Vui lòng chọn loại tiền tệ trước --"
                  : filteredWallets.length === 0
                  ? "-- Không có ví nào với loại tiền tệ này --"
                  : "-- Chọn ví nguồn --"
                }
              </option>
              {filteredWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="funds-hint">
              Tất cả giao dịch nạp tiền vào quỹ sẽ được thực hiện từ ví này.
            </div>
            
            {/* Hiển thị số dư ví đã chọn */}
            {selectedWallet && (
              <div style={{ marginTop: '0.5rem' }}>
                <label>Số dư ví nguồn</label>
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
            <label>Ngày tạo quỹ</label>
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
              Ngày và giờ tạo quỹ sẽ được tự động ghi nhận.
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="funds-field">
          <label>Ghi chú</label>
          <textarea 
            rows={3} 
            placeholder="Ghi chú cho quỹ này (không bắt buộc)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* TẦN SUẤT GỬI (TÙY CHỌN) */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Tần suất gửi (tuỳ chọn)</div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Tần suất gửi quỹ</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="DAILY">Theo ngày</option>
              <option value="WEEKLY">Theo tuần</option>
              <option value="MONTHLY">Theo tháng</option>
            </select>
          </div>
          <div>
            <label>Số tiền gửi mỗi kỳ</label>
            <input 
              type="number" 
              min={0} 
              placeholder="Tuỳ chọn"
              value={periodAmount}
              onChange={(e) => setPeriodAmount(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* NHẮC NHỞ & TỰ ĐỘNG NẠP */}
      <ReminderBlock
        reminderOn={reminderOn}
        setReminderOn={setReminderOn}
        freq={freq}
        onDataChange={setReminderData}
      />

      <AutoTopupBlock
        autoTopupOn={autoTopupOn}
        setAutoTopupOn={setAutoTopupOn}
        freq={freq}
        onDataChange={setAutoTopupData}
      />

      {/* ACTIONS */}
      <div className="funds-fieldset funds-fieldset--full">
        <div className="funds-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onSuccess && onSuccess()}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu quỹ"}
          </button>
        </div>
      </div>
    </div>
  );
}
