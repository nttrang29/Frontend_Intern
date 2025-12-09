import { getMoneyFormatSettings } from "./moneyFormatSettings";

/**
 * Format số tiền dựa trên cấu hình hệ thống
 * @param {number|string} amount - Số tiền cần format
 * @param {string} currency - Mã tiền tệ (VND, USD, ...)
 * @returns {string}
 */
export function formatMoney(amount = 0, currency = "VND", digitsOverride) {
  const { thousand, decimal, decimalDigits } = getMoneyFormatSettings();
  const normalizedCurrency = (currency || "VND").toUpperCase();

  // Normalize incoming amount as string to detect original fractional precision
  const rawAmountStr = typeof amount === 'number' ? String(amount) : (amount || '0');
  const numericAmount = Number(amount) || 0;
  const isNegative = numericAmount < 0;
  let value = Math.abs(numericAmount);

  // Determine digits: explicit override -> use it; otherwise
  // for USD: default to 8 decimals (can be overridden by digitsOverride)
  let digits;
  if (typeof digitsOverride === 'number') {
    digits = digitsOverride;
  } else if (normalizedCurrency === 'USD') {
    digits = 8;
  } else {
    digits = decimalDigits;
  }

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

