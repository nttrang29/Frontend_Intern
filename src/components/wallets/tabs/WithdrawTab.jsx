import React from "react";
import { formatMoneyInput, getMoneyValue } from "../../../utils/formatMoneyInput";
import { formatMoney } from "../../../utils/formatMoney";

export default function WithdrawTab({
  wallet,
  expenseCategories = [],
  withdrawAmount,
  setWithdrawAmount,
  withdrawNote,
  setWithdrawNote,
  withdrawCategoryId,
  setWithdrawCategoryId,
  onSubmitWithdraw,
}) {

  const currentBalance = Number(wallet?.balance || 0);
  const walletCurrency = wallet?.currency || "VND";

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Rút tiền từ ví</h3>
        <span>Rút tiền và chọn danh mục phù hợp.</span>
      </div>
      <form
        className="wallet-form"
        onSubmit={onSubmitWithdraw}
        autoComplete="off"
      >
        <div className="wallet-form__row">
          <label>
            Danh mục <span style={{ color: "#ef4444" }}>*</span>
            <select
              value={withdrawCategoryId}
              onChange={(e) => setWithdrawCategoryId(e.target.value)}
              required
            >
              <option value="">Chọn danh mục</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số tiền rút
            <input
              type="text"
              value={withdrawAmount || ""}
              onChange={(e) => {
                // Format kiểu Việt Nam:
                // - Dấu chấm (.) mỗi 3 số từ bên phải cho phần nguyên
                // - Dấu phẩy (,) là dấu thập phân (phần sau không format)
                const inputValue = e.target.value;
                // Chỉ lưu giá trị hợp lệ (số, dấu chấm và dấu phẩy)
                let cleaned = inputValue.replace(/[^\d.,]/g, "");
                
                // Chỉ cho phép một dấu phẩy (dấu thập phân)
                const commaIndex = cleaned.indexOf(",");
                const lastCommaIndex = cleaned.lastIndexOf(",");
                
                if (commaIndex !== -1) {
                  // Có dấu phẩy (dấu thập phân)
                  // Chỉ cho phép một dấu phẩy
                  if (commaIndex !== lastCommaIndex) {
                    // Nếu có nhiều dấu phẩy, chỉ giữ dấu phẩy đầu tiên
                    cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, "");
                  }
                  
                  // Tách phần nguyên và phần thập phân
                  const integerPart = cleaned.substring(0, commaIndex).replace(/\./g, ""); // Loại bỏ dấu chấm cũ
                  const decimalPart = cleaned.substring(commaIndex + 1);
                  
                  // Format phần nguyên với dấu chấm mỗi 3 số
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  
                  // Kết hợp: phần nguyên đã format + dấu phẩy + phần thập phân (không format)
                  setWithdrawAmount(`${formattedInteger},${decimalPart}`);
                } else {
                  // Không có dấu phẩy, chỉ format phần nguyên
                  const integerPart = cleaned.replace(/\./g, ""); // Loại bỏ dấu chấm cũ
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setWithdrawAmount(formattedInteger);
                }
              }}
              onBlur={(e) => {
                // Khi blur, giữ nguyên format (đã format rồi)
                // Không cần làm gì thêm
              }}
              placeholder="Nhập số tiền (VD: 1.000.000,5 hoặc 20,5)"
              inputMode="decimal"
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư hiện tại:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, walletCurrency)}
              </strong>
            </div>
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              placeholder="Nhập ghi chú (tùy chọn)"
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền không hợp lệ */}
        {withdrawAmount && (
          <div className="wallet-form__row">
            {!withdrawCategoryId && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Vui lòng chọn danh mục.
              </div>
            )}
            {withdrawCategoryId && getMoneyValue(withdrawAmount) > currentBalance && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Số tiền không hợp lệ hoặc vượt quá số dư.
              </div>
            )}
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!withdrawAmount || !withdrawCategoryId || getMoneyValue(withdrawAmount) > currentBalance || getMoneyValue(withdrawAmount) <= 0}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            Xác nhận rút
          </button>
        </div>
      </form>
    </div>
  );
}

