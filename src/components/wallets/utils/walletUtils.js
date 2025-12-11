/**
 * Utility functions cho wallet components
 */

export function getRate(from, to) {
  if (!from || !to || String(from).toUpperCase() === String(to).toUpperCase()) return 1;
  // Frontend chỉ dùng VND; quy đổi 1:1 để tránh sai lệch hiển thị.
  return 1;
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
  // Các currency khác (hiện không dùng): hiển thị dạng số thuần
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

