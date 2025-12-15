import React from "react";
import { formatMoneyInput, getMoneyValue } from "../../../utils/formatMoneyInput";
import { formatMoney } from "../../../utils/formatMoney";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function TopupTab({
  wallet,
  incomeCategories = [],
  topupAmount,
  setTopupAmount,
  topupNote,
  setTopupNote,
  topupCategoryId,
  setTopupCategoryId,
  onSubmitTopup,
}) {
  const { t } = useLanguage();
  const currentBalance = Number(wallet?.balance || 0);
  const walletCurrency = wallet?.currency || "VND";

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>{t('wallets.topup.title')}</h3>
        <span>{t('wallets.topup.subtitle')}</span>
      </div>
      <form className="wallet-form" onSubmit={onSubmitTopup} autoComplete="off">
        <div className="wallet-form__row">
          <label>
            {t('wallets.topup.category_label')} <span style={{ color: "#ef4444" }}>*</span>
            <select
              value={topupCategoryId}
              onChange={(e) => setTopupCategoryId(e.target.value)}
              required
            >
              <option value="">{t('wallets.topup.category_placeholder')}</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('wallets.topup.amount_label')}
            <input
              type="text"
              value={topupAmount || ""}
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
                  setTopupAmount(`${formattedInteger},${decimalPart}`);
                } else {
                  // Không có dấu phẩy, chỉ format phần nguyên
                  const integerPart = cleaned.replace(/\./g, ""); // Loại bỏ dấu chấm cũ
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setTopupAmount(formattedInteger);
                }
              }}
              onBlur={(e) => {
                // Khi blur, giữ nguyên format (đã format rồi)
                // Không cần làm gì thêm
              }}
              placeholder={t('wallets.topup.amount_placeholder')}
              inputMode="decimal"
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              {t('wallets.topup.current_balance')}:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, walletCurrency)}
              </strong>
            </div>
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            {t('wallets.modal.note_label')}
            <textarea
              rows={2}
              value={topupNote}
              onChange={(e) => setTopupNote(e.target.value)}
              placeholder={t('wallets.topup.note_placeholder')}
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền hoặc danh mục không hợp lệ */}
        {topupAmount && (
          <div className="wallet-form__row">
            {!topupCategoryId && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                {t('wallets.topup.error.category_required')}
              </div>
            )}
            {topupCategoryId && (!topupAmount || getMoneyValue(topupAmount) <= 0) && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                {t('wallets.topup.error.invalid_amount')}
              </div>
            )}
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!topupAmount || !topupCategoryId || getMoneyValue(topupAmount) <= 0}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            {t('wallets.topup.confirm_button')}
          </button>
        </div>
      </form>
    </div>
  );
}

