/**
 * Utility functions để format số tiền trong input
 * Format: thêm dấu chấm (.) mỗi 3 chữ số từ bên phải
 * Ví dụ: 1000 -> 1.000, 1000000 -> 1.000.000
 */

/**
 * Format số tiền để hiển thị trong input (thêm dấu chấm mỗi 3 số)
 * @param {string|number} value - Giá trị số tiền
 * @returns {string} - Chuỗi đã format với dấu chấm
 */
export function formatMoneyInput(value) {
  if (!value && value !== 0) return "";
  
  // Chuyển sang string và loại bỏ tất cả ký tự không phải số
  const numStr = String(value).replace(/[^\d]/g, "");
  
  if (!numStr) return "";
  
  // Thêm dấu chấm mỗi 3 chữ số từ bên phải
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Parse số tiền từ format có dấu chấm về số nguyên
 * @param {string} formattedValue - Chuỗi đã format (có dấu chấm)
 * @returns {string} - Chuỗi số nguyên (không có dấu chấm)
 */
export function parseMoneyInput(formattedValue) {
  if (!formattedValue) return "";
  
  // Loại bỏ tất cả ký tự không phải số
  return String(formattedValue).replace(/[^\d]/g, "");
}

/**
 * Handler cho onChange event của input số tiền
 * Tự động format khi người dùng nhập
 * @param {Event} e - Event object từ input
 * @param {Function} setValue - Function để set giá trị
 */
export function handleMoneyInputChange(e, setValue) {
  const inputValue = e.target.value;
  
  // Nếu input rỗng, set rỗng
  if (!inputValue) {
    setValue("");
    return;
  }
  
  // Parse để lấy số nguyên
  const parsed = parseMoneyInput(inputValue);
  
  // Format lại với dấu chấm
  const formatted = formatMoneyInput(parsed);
  
  // Set giá trị đã format
  setValue(formatted);
}

/**
 * Lấy giá trị số từ input đã format
 * @param {string} formattedValue - Giá trị đã format
 * @returns {number} - Số nguyên
 */
export function getMoneyValue(formattedValue) {
  const parsed = parseMoneyInput(formattedValue);
  return parsed ? Number(parsed) : 0;
}

