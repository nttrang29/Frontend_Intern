// src/components/funds/GroupNoTermForm.jsx
import React, { useMemo, useState } from "react";
import WalletSourceField from "./WalletSourceField";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";

export default function GroupNoTermForm({ wallets }) {
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

  const [reminderOn, setReminderOn] = useState(false);
  const [autoTopupOn, setAutoTopupOn] = useState(false);
  const [freq, setFreq] = useState("month");

  const handleSave = () => {
    if (!selectedWallet) {
      alert("Vui lòng chọn ví nguồn trước khi lưu quỹ nhóm.");
      return;
    }
    console.log("Lưu quỹ nhóm không thời hạn", {
      srcWalletId,
      freq,
    });
  };

  return (
    <div className="funds-grid">
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Thông tin quỹ nhóm</div>

        <div className="funds-field">
          <label>
            Tên quỹ nhóm <span className="req">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            placeholder="Ví dụ: Quỹ sinh hoạt nhóm"
          />
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
            <label>Ngày bắt đầu</label>
            <input type="date" />
          </div>
        </div>
      </div>

      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Tần suất gửi (tuỳ chọn)</div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Tần suất gửi quỹ</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="day">Theo ngày</option>
              <option value="week">Theo tuần</option>
              <option value="month">Theo tháng</option>
              <option value="year">Theo năm</option>
            </select>
          </div>
          <div>
            <label>Số tiền gửi mỗi kỳ</label>
            <input type="number" min={0} placeholder="Tuỳ chọn" />
          </div>
        </div>
      </div>

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

      <div className="funds-fieldset funds-fieldset--full">
        <div className="funds-field">
          <label>Ghi chú</label>
          <textarea rows={3} placeholder="Ghi chú cho quỹ nhóm" />
        </div>

        <div className="funds-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              console.log("Hủy tạo quỹ nhóm không thời hạn")
            }
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
          >
            Lưu quỹ nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
