/**
 * Utility functions cho wallet components
 */

// Helper function để tính tỷ giá (dùng chung cho tất cả components)
export function getRate(from, to) {
  if (!from || !to || from === to) return 1;
  // Try to use cached exchange rate from Exchange Rate service (localStorage)
  // exchange-rate.service stores `{ vndToUsd: 1 USD = X VND, usdToVnd: 1 VND = X USD, lastUpdate, ... }`
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const cachedRaw = localStorage.getItem("exchange_rate_cache");
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          // Cache structure: vndToUsd = how many VND per 1 USD (e.g., 24390)
          // which means: 1 USD = 24390 VND, so 1 VND = 1/24390 USD
          const vndToUsd = parsed && parsed.vndToUsd ? Number(parsed.vndToUsd) : null;
          const usdToVnd = parsed && parsed.usdToVnd ? Number(parsed.usdToVnd) : null;
          
          if ((vndToUsd || usdToVnd) && !Number.isNaN(vndToUsd || usdToVnd) && (vndToUsd || usdToVnd) > 0) {
            const fromU = String(from).toUpperCase();
            const toU = String(to).toUpperCase();
            // Direct rates: USD <-> VND
            if (fromU === "USD" && toU === "VND") {
              // 1 USD = vndToUsd VND
              return vndToUsd || 24390;
            }
            if (fromU === "VND" && toU === "USD") {
              // 1 VND = usdToVnd USD (or 1 / vndToUsd)
              return usdToVnd || (1 / (vndToUsd || 24390));
            }
            // For other currency pairs, we would need more data; fallthrough to fallback
          }
        } catch (e) {
          // ignore parse errors and fall back
        }
      }
    }
  } catch (e) {
    // ignore localStorage access errors
  }

  // Fallback: Tỷ giá cố định (original implementation)
  const ratesToVND = {
    VND: 1,
    USD: 0.000041, // 1 VND = 0.000041 USD (inverse of 1 USD = 24390 VND)
    EUR: 0.000038,
    JPY: 0.0063,
    GBP: 0.000032,
    CNY: 0.00030,
  };

  const ratesFromVND = {
    VND: 1,
    USD: 24390.243902439024, // 1 USD = 24390 VND
    EUR: 26315.78947368421,
    JPY: 158.73015873015873,
    GBP: 31250,
    CNY: 3333.3333333333335,
  };

  const fromU = String(from).toUpperCase();
  const toU = String(to).toUpperCase();
  if (!ratesToVND[fromU] || !ratesToVND[toU]) return 1;
  if (fromU === "VND") return ratesToVND[toU];
  if (toU === "VND") return ratesFromVND[fromU];
  const rate = ratesFromVND[fromU] * ratesToVND[toU];
  return parseFloat(rate.toFixed(8));
}

// Format số dư sau khi chuyển đổi với độ chính xác cao (8 chữ số thập phân)
export function formatConvertedBalance(amount = 0, currency = "VND") {
  const numAmount = Number(amount) || 0;
  if (currency === "VND") {
    // VND: hiển thị với 8 chữ số thập phân để khớp với tỷ giá (không làm tròn về số nguyên)
    // Kiểm tra xem có phần thập phân không
    const hasDecimal = numAmount % 1 !== 0;
    if (hasDecimal) {
      const formatted = numAmount.toLocaleString("vi-VN", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 8 
      });
      return `${formatted} VND`;
    }
    // Nếu là số nguyên, hiển thị bình thường
    return `${numAmount.toLocaleString("vi-VN")} VND`;
  }
  if (currency === "USD") {
    // USD: hiển thị với 8 chữ số thập phân để khớp với tỷ giá
    const formatted = numAmount.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
    return `$${formatted}`;
  }
  // Các currency khác
  const formatted = numAmount.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 8 
  });
  return `${formatted} ${currency}`;
}

// Format tỷ giá với độ chính xác cao
export function formatExchangeRate(rate = 0, toCurrency = "VND") {
  const numRate = Number(rate) || 0;
  if (toCurrency === "USD") {
    return numRate.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
  }
  return numRate.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 8 
  });
}

