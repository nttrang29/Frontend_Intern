/**
 * Parse amount từ API (có thể là string từ BigDecimal hoặc number)
 * Đảm bảo không mất precision khi convert
 * @param {string|number|null|undefined} value - Giá trị cần parse
 * @param {number} defaultValue - Giá trị mặc định nếu không hợp lệ
 * @returns {number} - Số tiền đã parse
 */
export function parseAmount(value, defaultValue = 0) {
  // Nếu là null hoặc undefined, trả về giá trị mặc định
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Nếu đã là number, kiểm tra hợp lệ
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }

  // Nếu là string, parse cẩn thận
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return defaultValue;
    }

    // Parse string thành number
    // Dùng parseFloat để giữ lại phần thập phân
    const parsed = parseFloat(trimmed);
    
    // Kiểm tra hợp lệ
    if (isNaN(parsed)) {
      console.warn(`parseAmount: Invalid number string: "${value}", using default: ${defaultValue}`);
      return defaultValue;
    }

    return parsed;
  }

  // Các kiểu khác, thử convert
  const converted = Number(value);
  return isNaN(converted) ? defaultValue : converted;
}

/**
 * Parse amount và đảm bảo không âm
 * @param {string|number|null|undefined} value - Giá trị cần parse
 * @param {number} defaultValue - Giá trị mặc định nếu không hợp lệ
 * @returns {number} - Số tiền đã parse (>= 0)
 */
export function parseAmountNonNegative(value, defaultValue = 0) {
  const parsed = parseAmount(value, defaultValue);
  return Math.max(0, parsed);
}




