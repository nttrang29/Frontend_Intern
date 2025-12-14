/**
 * Utility functions cho wallet components
 * Frontend chỉ dùng VND, không còn chức năng chuyển đổi tiền tệ.
 */

export function getRate(from, to) {
  // Luôn trả về 1 vì chỉ dùng VND, không cần chuyển đổi
  return 1;
}

// Format số dư - chỉ hỗ trợ VND
export function formatConvertedBalance(amount = 0, currency = "VND") {
  const numAmount = Number(amount) || 0;
  // Chỉ format VND
  let formatted = numAmount.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  return `${formatted} VND`;
}

// Format tỷ giá - không còn sử dụng, giữ lại để tránh break code
export function formatExchangeRate(rate = 0, toCurrency = "VND") {
  return "1";
}

