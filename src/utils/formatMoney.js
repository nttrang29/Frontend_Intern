import { getMoneyFormatSettings } from "./moneyFormatSettings";

/**
 * Format số tiền dựa trên cấu hình hệ thống
 * @param {number|string} amount - Số tiền cần format
 * @param {string} currency - Mã tiền tệ (VND, USD, ...)
 * @returns {string}
 */
export function formatMoney(amount = 0, currency = "VND") {
  const { thousand, decimal, decimalDigits } = getMoneyFormatSettings();
  const normalizedCurrency = (currency || "VND").toUpperCase();
  let digits = decimalDigits;
  if (normalizedCurrency === "USD") {
    digits = 2; // USD luôn hiển thị tối đa 2 chữ số thập phân
  }

  const numericAmount = Number(amount) || 0;
  const isNegative = numericAmount < 0;
  let value = Math.abs(numericAmount);

  if (digits === 0 && normalizedCurrency !== "USD") {
    value = Math.trunc(value);
  }

  const fixed = value.toFixed(digits);
  let [integerPart, decimalPart] = fixed.split(".");
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
  if (isNegative) {
    integerPart = `-${integerPart}`;
  }

  let formatted = integerPart;
  if (digits > 0 && decimalPart) {
    formatted += decimal + decimalPart;
  }

  if (normalizedCurrency === "USD") {
    return `$${formatted}`;
  }

  if (normalizedCurrency === "VND") {
    return `${formatted} VND`;
  }

  return `${formatted} ${normalizedCurrency}`;
}

