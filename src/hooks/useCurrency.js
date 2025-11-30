import { useState, useEffect, useCallback } from "react";
import { getMoneyFormatSettings } from "../utils/moneyFormatSettings";

// Tỉ giá cố định
const USD_TO_VND = 25000;

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
    formatted = value
      .toFixed(decimalDigits)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
    // Replace decimal point if needed
    if (decimal !== ".") {
      const parts = formatted.split(".");
      if (parts.length === 2) {
        formatted = parts[0] + decimal + parts[1];
      }
    }
    // Add currency symbol
    if (cur === "USD") {
      // Place symbol in front for USD (common format)
      return "$" + formatted;
    }
    return formatted + " ₫";
  }, [currency, moneyFormatVersion]);

  return { currency, formatCurrency };
}
