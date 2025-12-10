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
  // for USD và VND: hiển thị tối đa 8 chữ số thập phân, nhưng chỉ hiển thị số thực tế có
  let maxDigits = 8;
  if (typeof digitsOverride === 'number') {
    maxDigits = digitsOverride;
  } else if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'VND') {
    maxDigits = decimalDigits;
  }

  // USD và VND luôn hiển thị theo kiểu Việt: dấu chấm ngăn nghìn, dấu phẩy thập phân
  const thousandSep = (normalizedCurrency === "USD" || normalizedCurrency === "VND") ? "." : thousand;
  const decimalSep = (normalizedCurrency === "USD" || normalizedCurrency === "VND") ? "," : decimal;

  if (maxDigits === 0 && normalizedCurrency !== "USD" && normalizedCurrency !== "VND") {
    value = Math.trunc(value);
  }

  // Dùng toLocaleString với maximumFractionDigits để tự động loại bỏ số 0 ở cuối
  let formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits
  });
  
  // Thay thế dấu ngăn nghìn và dấu thập phân theo format Việt
  formatted = formatted.replace(/,/g, "THOUSAND_SEP").replace(/\./g, "DECIMAL_SEP");
  formatted = formatted.replace(/THOUSAND_SEP/g, thousandSep).replace(/DECIMAL_SEP/g, decimalSep);
  
  if (isNegative && !formatted.startsWith("-")) {
    formatted = "-" + formatted;
  }

  if (normalizedCurrency === "USD") {
    return `$${formatted}`;
  }

  if (normalizedCurrency === "VND") {
    return `${formatted} VND`;
  }

  return `${formatted} ${normalizedCurrency}`;
}

