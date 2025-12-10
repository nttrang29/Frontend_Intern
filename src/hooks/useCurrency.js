import { useState, useEffect, useCallback } from "react";
import { getMoneyFormatSettings } from "../utils/moneyFormatSettings";

// Tỉ giá cố định (giống Backend - ExchangeRateServiceImpl.java)
// Backend: FALLBACK_RATES.put("USD", new BigDecimal("0.000041"))
// Tính: 1 USD = 1 / 0.000041 = 24390.243902439024 VND
const USD_TO_VND = 24390.243902439024;

export function useCurrency() {
  const [currency, setCurrency] = useState(() => localStorage.getItem("defaultCurrency") || "VND");
  const [moneyFormatVersion, setMoneyFormatVersion] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail && e.detail.currency) setCurrency(e.detail.currency);
    };
    window.addEventListener("currencySettingChanged", handler);
    // Listen for money format changes
    const moneyFormatHandler = () => setMoneyFormatVersion(v => v + 1);
    window.addEventListener("moneyFormatChanged", moneyFormatHandler);
    return () => {
      window.removeEventListener("currencySettingChanged", handler);
      window.removeEventListener("moneyFormatChanged", moneyFormatHandler);
    };
  }, []);

  // Quy đổi và format số tiền
  // Accepts optional `targetCurrency` to format for a specific currency (e.g., wallet currency)
  const formatCurrency = useCallback((amount, targetCurrency) => {
    const { thousand, decimal, decimalDigits } = getMoneyFormatSettings();
    // If caller passes a targetCurrency, we assume `amount` is already in that
    // currency and should NOT be converted. Only when no targetCurrency is
    // provided do we treat `amount` as stored in VND and convert to the app
    // display currency.
    const hasTarget = typeof targetCurrency === "string" && targetCurrency.trim() !== "";
    const cur = (hasTarget ? targetCurrency : currency || "").toString().toUpperCase();
    // USD và VND: luôn hiển thị kiểu Việt (dấu chấm ngăn nghìn, dấu phẩy thập phân)
    const thousandSep = (cur === "USD" || cur === "VND") ? "." : thousand;
    const decimalSep = (cur === "USD" || cur === "VND") ? "," : decimal;
    let value = Number(amount);
    let formatted = "";
    if (!hasTarget) {
      // Legacy behavior: when no targetCurrency provided, assume incoming
      // `amount` is in VND and convert to the app display currency if needed.
      if (cur === "USD") {
        value = value / USD_TO_VND;
      }
    }
    // Format number with custom thousand/decimal separators
    // Sử dụng toLocaleString để chỉ hiển thị số thập phân thực tế (không ép số 0)
    let maxDigits = decimalDigits;
    if (cur === "USD" || cur === "VND") {
      // USD và VND: hiển thị tối đa 8 chữ số thập phân, nhưng chỉ hiển thị số thực tế có
      maxDigits = 8;
    }
    if (maxDigits === 0 && cur !== "USD" && cur !== "VND") {
      value = Math.trunc(value);
    }
    
    // Dùng toLocaleString với maximumFractionDigits để tự động loại bỏ số 0 ở cuối
    formatted = value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits
    });
    
    // Thay thế dấu ngăn nghìn và dấu thập phân theo format Việt
    formatted = formatted.replace(/,/g, "THOUSAND_SEP").replace(/\./g, "DECIMAL_SEP");
    formatted = formatted.replace(/THOUSAND_SEP/g, thousandSep).replace(/DECIMAL_SEP/g, decimalSep);
    // Add currency symbol
    if (cur === "USD") {
      // Place symbol in front for USD (common format)
      return "$" + formatted;
    }
    return formatted + " ₫";
  }, [currency, moneyFormatVersion]);

  return { currency, formatCurrency };
}
