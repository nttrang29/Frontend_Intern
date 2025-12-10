// src/components/funds/PersonalTermForm.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useToast } from "../common/Toast/ToastContext";
import { calcEstimateDate } from "./utils/fundUtils";
import { formatVietnamDate } from "../../utils/dateFormat";
import { formatMoney } from "../../utils/formatMoney";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import "../../styles/components/funds/FundForms.css";

export default function PersonalTermForm({ wallets, onSuccess }) {
  const { createFund } = useFundData();
  const { showToast } = useToast();
  
  const [fundName, setFundName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [targetAmount, setTargetAmount] = useState("");
  const [targetError, setTargetError] = useState("");
  
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
      setStartDateError("Ngày bắt đầu phải từ hôm nay trở đi.");
      setStartDate(today); // Reset về hôm nay nếu chọn ngày quá khứ
      showToast("Không thể chọn ngày trong quá khứ!", "error");
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
  const targetMin = selectedCurrency === "USD" ? 1 : 1000;

  // Validate target money
  useEffect(() => {
    if (!targetAmount) {
      setTargetError("");
      return;
    }

    const t = Number(targetAmount);
    if (Number.isNaN(t) || t <= 0) {
      setTargetError("Vui lòng nhập số tiền mục tiêu hợp lệ.");
      return;
    }

    if (t < targetMin) {
      const minLabel = targetMin.toLocaleString("en-US");
      setTargetError(
        `Số tiền mục tiêu phải lớn hơn hoặc bằng ${minLabel}${selectedCurrency ? " " + selectedCurrency : ""}.`
      );
      return;
    }

    setTargetError("");
  }, [targetAmount, targetMin]);

  // Tính ngày kết thúc tự động
  useEffect(() => {
    const t = Number(targetAmount);
    const p = Number(periodAmount);

    if (
      !targetAmount ||
      !periodAmount ||
      Number.isNaN(t) ||
      Number.isNaN(p) ||
      p <= 0 ||
      t < targetMin
    ) {
      setCalculatedEndDate("");
      setEstimateText("");
      return;
    }

    // Tính từ 0đ lên mục tiêu
    const periods = Math.ceil(t / p);
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

  // Khi đổi loại tiền tệ, reset lỗi/ước tính cũ để tránh hiển thị thông báo sai currency
  useEffect(() => {
    setTargetError("");
    setCalculatedEndDate("");
    setEstimateText("");
  }, [selectedCurrency]);

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
    if (!targetAmount) {
      showToast("Vui lòng nhập số tiền mục tiêu quỹ.", "error");
      return;
    }
    if (targetError) {
      showToast("Số tiền mục tiêu chưa hợp lệ, vui lòng kiểm tra lại.", "error");
      return;
    }
    if (!startDate) {
      showToast("Vui lòng chọn ngày bắt đầu.", "error");
      return;
    }
    
    // Validate lại ngày bắt đầu trước khi submit
    const today = getToday();
    if (startDate < today) {
      setStartDateError("Ngày bắt đầu phải từ hôm nay trở đi.");
      setStartDate(today);
      showToast("Ngày bắt đầu không thể là ngày trong quá khứ!", "error");
      return;
    }
    
    if (startDateError) {
      showToast(startDateError, "error");
      return;
    }
    
    if (!periodAmount || Number(periodAmount) <= 0) {
      showToast("Vui lòng nhập số tiền gửi mỗi kỳ để tính ngày kết thúc.", "error");
      return;
    }
    if (!calculatedEndDate) {
      showToast("Không thể tính ngày kết thúc. Vui lòng kiểm tra các thông tin đã nhập.", "error");
      return;
    }
    
    // Validate reminder nếu chế độ manual
    if (depositMode === "manual") {
      if (!reminderData) {
        showToast("Vui lòng cấu hình nhắc nhở.", "error");
        return;
      }
      if (!reminderData.reminderTime) {
        showToast("Vui lòng chọn giờ nhắc nhở.", "error");
        return;
      }
      if ((reminderData.reminderType === "WEEKLY" || freq === "WEEKLY") && !reminderData.reminderDayOfWeek) {
        showToast("Vui lòng chọn ngày trong tuần cho nhắc nhở.", "error");
        return;
      }
      if ((reminderData.reminderType === "MONTHLY" || freq === "MONTHLY") && !reminderData.reminderDayOfMonth) {
        showToast("Vui lòng chọn ngày trong tháng cho nhắc nhở.", "error");
        return;
      }
    }
    
    // Validate auto topup nếu chế độ auto
    if (depositMode === "auto") {
      if (!autoTopupData) {
        showToast("Vui lòng cấu hình lịch tự động nạp.", "error");
        return;
      }
      if (!autoTopupData.autoDepositTime) {
        showToast("Vui lòng chọn giờ tự động nạp.", "error");
        return;
      }
      if (autoTopupData.autoDepositScheduleType === "WEEKLY" && !autoTopupData.autoDepositDayOfWeek) {
        showToast("Vui lòng chọn ngày trong tuần cho tự động nạp.", "error");
        return;
      }
      if (autoTopupData.autoDepositScheduleType === "MONTHLY" && !autoTopupData.autoDepositDayOfMonth) {
        showToast("Vui lòng chọn ngày trong tháng cho tự động nạp.", "error");
        return;
      }
      if (!autoTopupData.autoDepositStartAt) {
        showToast("Vui lòng chọn thời điểm bắt đầu nạp tự động.", "error");
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
        targetAmount: Number(targetAmount),
        frequency: freq,
        amountPerPeriod: periodAmount ? Number(periodAmount) : null,
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
              placeholder="Ví dụ: Quỹ mua xe máy"
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

      {/* MỤC TIÊU + TẦN SUẤT */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Mục tiêu & tần suất gửi</div>

        <div className="funds-field">
          <label>
            Số tiền mục tiêu {selectedCurrency && `(${selectedCurrency})`} <span className="req">*</span>
          </label>
          <input
            type="number"
            min={targetMin}
            placeholder={`Nhập số tiền mục tiêu (tối thiểu ${targetMin.toLocaleString("en-US")}${selectedCurrency ? ' ' + selectedCurrency : ''})`}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          <div className="funds-hint">
            Số tiền bạn muốn đạt được, tối thiểu {targetMin.toLocaleString("en-US")}.
            Quỹ bắt đầu từ 0.
          </div>
          {targetError && <div className="funds-error">{targetError}</div>}
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Tần suất gửi</label>
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
              // Nếu ví là USD thì tối thiểu 1 USD, các loại tiền khác giữ 0
              min={selectedCurrency === "USD" ? 1 : 0}
              placeholder="Nhập số tiền mỗi kỳ"
              value={periodAmount}
              onChange={(e) => setPeriodAmount(e.target.value)}
            />
            <div className="funds-hint">
              Dùng để gợi ý thời gian hoàn thành.
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
            <label>Ngày bắt đầu <span className="req">*</span></label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              onBlur={(e) => {
                // Double check khi blur
                const today = getToday();
                if (e.target.value && e.target.value < today) {
                  setStartDate(today);
                  setStartDateError("Ngày bắt đầu phải từ hôm nay trở đi.");
                  showToast("Không thể chọn ngày trong quá khứ!", "error");
                }
              }}
              min={getToday()}
              style={startDateError ? { borderColor: '#ef4444', boxShadow: '0 0 0 0.2rem rgba(239, 68, 68, 0.25)' } : {}}
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              Chỉ được chọn từ ngày hôm nay ({formatVietnamDate(new Date())}) trở đi. Không thể chọn ngày quá khứ.
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
            <label>Ngày kết thúc (tự động tính)</label>
            <input
              type="text"
              value={calculatedEndDate ? formatVietnamDate(calculatedEndDate) : "Nhập đủ thông tin để tính toán"}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <div className="funds-hint" style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem' }}>
              Tự động tính dựa trên số tiền mục tiêu và số tiền gửi mỗi kỳ.
            </div>
          </div>
        </div>

        {/* Chế độ nạp tiền */}
        <div className="funds-field">
          <label>Chế độ nạp tiền</label>
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
              Thủ công (nhắc nhở)
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
              Tự động
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
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !!startDateError || !!targetError}
          >
            {saving ? "Đang lưu..." : "Lưu quỹ"}
          </button>
        </div>
      </div>
    </div>
  );
}

