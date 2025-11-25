// src/components/funds/PersonalTermForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import WalletSourceField from "./WalletSourceField";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import { calcEstimateDate } from "./fundUtils";

export default function PersonalTermForm({ wallets }) {
  const [srcWalletId, setSrcWalletId] = useState(null);
  const selectedWallet = useMemo(
    () => wallets.find((w) => String(w.id) === String(srcWalletId)) || null,
    [wallets, srcWalletId]
  );

  const currentBalance = Number(selectedWallet?.balance || 0);
  const currency = selectedWallet?.currency || "";

  const currentBalanceText = selectedWallet
    ? `${currentBalance.toLocaleString("vi-VN")} ${currency}`
    : "";

  const [targetAmount, setTargetAmount] = useState("");
  const [targetError, setTargetError] = useState("");

  const [freq, setFreq] = useState("month");
  const [periodAmount, setPeriodAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimateText, setEstimateText] = useState("");

  const [reminderOn, setReminderOn] = useState(false);
  const [autoTopupOn, setAutoTopupOn] = useState(false);

  // Validate target money
  useEffect(() => {
    if (!selectedWallet || !targetAmount) {
      setTargetError("");
      return;
    }

    const t = Number(targetAmount);
    if (Number.isNaN(t) || t <= 0) {
      setTargetError("Vui lòng nhập số tiền mục tiêu hợp lệ.");
      return;
    }

    if (t <= currentBalance) {
      setTargetError(
        `Số tiền mục tiêu phải lớn hơn số dư hiện tại của ví (${currentBalance.toLocaleString(
          "vi-VN"
        )} ${currency}).`
      );
      return;
    }

    setTargetError("");
  }, [targetAmount, selectedWallet, currentBalance, currency]);

  // Tính ngày dự kiến hoàn thành
  useEffect(() => {
    if (!selectedWallet) {
      setEstimateText("");
      return;
    }

    const t = Number(targetAmount);
    const p = Number(periodAmount);

    if (
      !targetAmount ||
      !periodAmount ||
      Number.isNaN(t) ||
      Number.isNaN(p) ||
      p <= 0
    ) {
      setEstimateText("");
      return;
    }
    if (t <= currentBalance) {
      setEstimateText("");
      return;
    }

    const need = t - currentBalance;
    const periods = Math.ceil(need / p);
    if (!periods || periods <= 0) {
      setEstimateText("");
      return;
    }

    const base = startDate || new Date().toISOString().slice(0, 10);
    const doneDate = calcEstimateDate(base, freq, periods);
    if (!doneDate) {
      setEstimateText("");
      return;
    }

    const dateStr = doneDate.toLocaleDateString("vi-VN");

    const unitText =
      freq === "day"
        ? `${periods} ngày`
        : freq === "week"
        ? `${periods} tuần`
        : freq === "month"
        ? `${periods} tháng`
        : `${periods} năm`;

    setEstimateText(
      `Dự kiến hoàn thành sau khoảng ${unitText}, vào khoảng ngày ${dateStr}.`
    );
  }, [selectedWallet, targetAmount, periodAmount, freq, startDate, currentBalance]);

  const handleSave = () => {
    if (!selectedWallet) {
      alert("Vui lòng chọn ví nguồn trước khi lưu quỹ.");
      return;
    }
    if (!targetAmount) {
      alert("Vui lòng nhập số tiền mục tiêu quỹ.");
      return;
    }
    if (targetError) {
      alert("Số tiền mục tiêu chưa hợp lệ, vui lòng kiểm tra lại.");
      return;
    }

    console.log("Lưu quỹ có thời hạn", {
      srcWalletId,
      targetAmount,
      freq,
      periodAmount,
      startDate,
      endDate,
    });
  };

  return (
    <div className="funds-grid">
      {/* THÔNG TIN QUỸ */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Thông tin quỹ</div>

        <div className="funds-field">
          <label>
            Tên quỹ <span className="req">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            placeholder="Ví dụ: Quỹ mua xe máy"
          />
          <div className="funds-hint">Tối đa 50 ký tự.</div>
        </div>

        <WalletSourceField
          required
          wallets={wallets}
          value={srcWalletId}
          onChange={setSrcWalletId}
        />

        <div className="funds-field funds-field--inline">
          <div>
            <label>Số dư hiện tại của ví</label>
            <input
              type="text"
              disabled
              placeholder="Tự động hiển thị sau khi chọn ví"
              value={currentBalanceText}
            />
          </div>
          <div>
            <label>Ngày tạo quỹ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* MỤC TIÊU + TẦN SUẤT */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Mục tiêu & tần suất gửi</div>

        <div className="funds-field">
          <label>
            Số tiền mục tiêu{" "}
            {currency && <span>({currency})</span>} <span className="req">*</span>
          </label>
          <input
            type="number"
            min={0}
            placeholder="Nhập số tiền mục tiêu"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          <div className="funds-hint">
            Phải lớn hơn số dư ví nguồn. Đơn vị tiền tệ của quỹ sẽ giống ví nguồn.
          </div>
          {targetError && <div className="funds-error">{targetError}</div>}
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Tần suất gửi</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="day">Theo ngày</option>
              <option value="week">Theo tuần</option>
              <option value="month">Theo tháng</option>
              <option value="year">Theo năm</option>
            </select>
          </div>
          <div>
            <label>Số tiền gửi mỗi kỳ</label>
            <input
              type="number"
              min={0}
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
            <label>Ngày bắt đầu</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>Ngày kết thúc (tùy chọn)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* NHẮC NHỞ & TỰ ĐỘNG NẠP */}
      <ReminderBlock
        reminderOn={reminderOn}
        setReminderOn={setReminderOn}
        freq={freq}
      />

      <AutoTopupBlock
        autoTopupOn={autoTopupOn}
        setAutoTopupOn={setAutoTopupOn}
        dependsOnReminder={reminderOn}
        reminderFreq={freq}
      />

      {/* GHI CHÚ + ACTION */}
      <div className="funds-fieldset funds-fieldset--full">
        <div className="funds-field">
          <label>Ghi chú</label>
          <textarea rows={3} placeholder="Ghi chú cho quỹ này (không bắt buộc)" />
        </div>

        <div className="funds-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => console.log("Hủy tạo quỹ")}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
          >
            Lưu quỹ
          </button>
        </div>
      </div>
    </div>
  );
}
