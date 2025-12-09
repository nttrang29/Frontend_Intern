/**
 * Utility functions cho wallet components
 */

// Helper function để tính tỷ giá (dùng chung cho tất cả components)
// Sử dụng tỷ giá fix cứng: 24390.24 VND = 1 USD (giống Backend - ExchangeRateServiceImpl.java)
// Backend FALLBACK_RATES: USD = 0.000041 → 1 USD = 1/0.000041 = 24390.243902439024 VND
// KHÔNG còn đọc từ localStorage hoặc API nữa
export function getRate(from, to) {
  if (!from || !to || from === to) return 1;
  
  // Fixed exchange rate: 24390.24 VND = 1 USD (same as Backend ExchangeRateServiceImpl)
  // Backend: FALLBACK_RATES.put("USD", new BigDecimal("0.000041"))
  // Tính: 1 USD = 1 / 0.000041 = 24390.243902439024 VND
  // KHÔNG đọc từ localStorage exchange_rate_cache nữa
  const FIXED_VND_TO_USD = 24390.243902439024; // Giống Backend (1 / 0.000041)
  const FIXED_USD_TO_VND = 0.000041; // Chính xác: 1 VND = 0.000041 USD (giống Backend)
  
  const fromU = String(from).toUpperCase();
  const toU = String(to).toUpperCase();
  
  // Direct rates: USD <-> VND
  if (fromU === "USD" && toU === "VND") {
    return FIXED_VND_TO_USD;
  }
  if (fromU === "VND" && toU === "USD") {
    // Đảm bảo trả về đúng 0.000041 (giống Backend)
    return FIXED_USD_TO_VND; // 0.000041
  }

  // Fallback: Tỷ giá cố định cho các currency khác (giống Backend FALLBACK_RATES)
  const ratesToVND = {
    VND: 1,
    USD: FIXED_USD_TO_VND, // 1 VND = 0.000041 USD (giống Backend)
    EUR: 0.000038, // Giống Backend
    JPY: 0.0063, // Giống Backend
    GBP: 0.000032, // Giống Backend
    CNY: 0.00030, // Giống Backend
  };

  const ratesFromVND = {
    VND: 1,
    USD: FIXED_VND_TO_USD, // 1 USD = 24390.24 VND (giống Backend)
    EUR: 26315.78947368421,
    JPY: 158.73015873015873,
    GBP: 31250,
    CNY: 3333.3333333333335,
  };

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
    let formatted = numAmount.toLocaleString("vi-VN", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
    // Loại bỏ số 0 ở cuối phần thập phân
    formatted = formatted.replace(/,(\d*?)0+$/, (match, digits) => {
      return digits ? `,${digits}` : "";
    }).replace(/,$/, ""); // Loại bỏ dấu phẩy nếu không còn phần thập phân
    return `${formatted} VND`;
  }
  if (currency === "USD") {
    // USD: hiển thị với 8 chữ số thập phân để khớp với tỷ giá
    // Dùng kiểu Việt: dấu chấm ngăn nghìn, dấu phẩy thập phân
    let formatted = numAmount.toLocaleString("vi-VN", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
    // Loại bỏ số 0 ở cuối phần thập phân
    formatted = formatted.replace(/,(\d*?)0+$/, (match, digits) => {
      return digits ? `,${digits}` : "";
    }).replace(/,$/, ""); // Loại bỏ dấu phẩy nếu không còn phần thập phân
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
  // Tất cả currency đều format theo kiểu Việt (dấu chấm ngăn nghìn, dấu phẩy thập phân)
  return numRate.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 8 
  });
}

