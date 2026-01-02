import { useState, useEffect, useCallback } from "react";
import { getMoneyFormatSettings } from "../utils/moneyFormatSettings";

export function useCurrency() {
  // Frontend hiện chỉ hỗ trợ VND, giữ state để không phá vỡ API nhưng luôn là "VND"
  const [currency] = useState("VND");
  const [moneyFormatVersion, setMoneyFormatVersion] = useState(0);

  useEffect(() => {
    // Listen for money format changes
    const moneyFormatHandler = () => setMoneyFormatVersion(v => v + 1);
    window.addEventListener("moneyFormatChanged", moneyFormatHandler);
    return () => {
      window.removeEventListener("moneyFormatChanged", moneyFormatHandler);
    };
  }, []);

  // Quy đổi và format số tiền
  // Accepts optional `targetCurrency` to format for a specific currency (e.g., wallet currency)
  const formatCurrency = useCallback((amount, targetCurrency) => {
    const { thousand, decimal, decimalDigits } = getMoneyFormatSettings();
    const hasTarget = typeof targetCurrency === "string" && targetCurrency.trim() !== "";
    const cur = (hasTarget ? targetCurrency : currency || "").toString().toUpperCase();
    // VND: hiển thị kiểu Việt (dấu chấm ngăn nghìn, dấu phẩy thập phân)
    const thousandSep = ".";
    const decimalSep = ",";
    let value = Number(amount);
    let formatted = "";
    // Format number with custom thousand/decimal separators
    // Sử dụng toLocaleString để chỉ hiển thị số thập phân thực tế (không ép số 0)
    let maxDigits = cur === "VND" ? 8 : decimalDigits;
    if (maxDigits === 0 && cur !== "VND") {
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
    return formatted + " ₫";
  }, [currency, moneyFormatVersion]);

  return { currency, formatCurrency };
}
