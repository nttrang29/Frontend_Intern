/**
 * Utility functions để format số tiền trong input
 * Format: thêm dấu chấm (.) mỗi 3 chữ số từ bên phải cho phần nguyên
 * Hỗ trợ số thập phân (dấu chấm hoặc dấu phẩy)
 * Ví dụ: 1000 -> 1.000, 1000000 -> 1.000.000, 20.5 -> 20.5, 0.000041 -> 0.000041
 */

/**
 * Format số tiền để hiển thị trong input (thêm dấu chấm mỗi 3 số cho phần nguyên)
 * Hỗ trợ số thập phân
 * @param {string|number} value - Giá trị số tiền
 * @param {string} currency - Currency của ví (hiện dùng VND)
 * @returns {string} - Chuỗi đã format với dấu chấm
 */
export function formatMoneyInput(value, currency = "VND") {
  if (!value && value !== 0) return "";
  
  const str = String(value);
  
  // Format kiểu Việt Nam:
  // - Dấu chấm (.) mỗi 3 số từ bên phải cho phần nguyên (VD: 1.000.000)
  // - Dấu phẩy (,) là dấu thập phân (VD: 1.000.000,5)
  // Khi người dùng nhập, nếu có dấu chấm làm dấu thập phân (chuẩn quốc tế), 
  // chuyển thành dấu phẩy để nhất quán với format Việt Nam
  
  // Loại bỏ ký tự không hợp lệ, giữ số, dấu chấm và dấu phẩy
  let cleaned = str.replace(/[^\d.,]/g, "");
  
  // Xác định dấu thập phân: ưu tiên dấu phẩy
  const commaIndex = cleaned.indexOf(",");
  const lastCommaIndex = cleaned.lastIndexOf(",");
  const lastDotIndex = cleaned.lastIndexOf(".");
  
  let integerPart = "";
  let decimalPart = "";
  
  if (commaIndex !== -1) {
    // Có dấu phẩy (dấu thập phân theo chuẩn Việt Nam)
    // Phần trước dấu phẩy đầu tiên là phần nguyên
    integerPart = cleaned.substring(0, commaIndex);
    // Phần sau dấu phẩy cuối cùng là phần thập phân
    decimalPart = cleaned.substring(lastCommaIndex + 1);
    // Loại bỏ tất cả dấu chấm trong phần nguyên (sẽ format lại sau)
    integerPart = integerPart.replace(/\./g, "");
  } else if (lastDotIndex !== -1) {
    // Không có dấu phẩy, nhưng có dấu chấm
    // Kiểm tra xem dấu chấm cuối cùng có phải là dấu thập phân không
    // Chỉ coi là dấu thập phân nếu:
    // 1. Có ít hơn 3 chữ số sau dấu chấm (không phải dấu nghìn)
    // 2. VÀ không có dấu chấm nào khác trước đó (để tránh nhầm với "1.000.5")
    const beforeLastDot = cleaned.substring(0, lastDotIndex);
    const afterLastDot = cleaned.substring(lastDotIndex + 1);
    const hasOtherDots = beforeLastDot.indexOf(".") !== -1;
    
    if (!hasOtherDots && afterLastDot.length > 0 && afterLastDot.length < 3 && /^\d+$/.test(afterLastDot)) {
      // Dấu chấm cuối là dấu thập phân (chỉ có 1 dấu chấm và < 3 chữ số sau)
      integerPart = beforeLastDot;
      decimalPart = afterLastDot;
    } else {
      // Tất cả dấu chấm đều là dấu nghìn
      integerPart = cleaned.replace(/\./g, "");
      decimalPart = "";
    }
  } else {
    // Không có dấu phẩy và dấu chấm, toàn bộ là phần nguyên
    integerPart = cleaned;
    decimalPart = "";
  }
  
  if (!integerPart && !decimalPart) return "";
  
  // Format phần nguyên với dấu chấm mỗi 3 số từ bên phải
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Kết hợp lại: phần nguyên + dấu phẩy + phần thập phân
  if (decimalPart) {
    return `${formattedInteger},${decimalPart}`;
  }
  return formattedInteger;
}

/**
 * Parse số tiền từ format có dấu chấm về số (hỗ trợ số thập phân)
 * @param {string} formattedValue - Chuỗi đã format (có dấu chấm/phẩy)
 * @returns {string} - Chuỗi số (có thể có dấu chấm thập phân)
 */
export function parseMoneyInput(formattedValue) {
  if (!formattedValue) return "";
  
  const str = String(formattedValue);
  
  // Format kiểu Việt Nam:
  // - Dấu chấm (.) là dấu nghìn (loại bỏ)
  // - Dấu phẩy (,) là dấu thập phân (chuyển thành dấu chấm)
  // Lưu ý: Khi đã format với dấu chấm làm dấu nghìn, TẤT CẢ dấu chấm đều là dấu nghìn
  
  // Tách phần nguyên và phần thập phân
  const commaIndex = str.indexOf(",");
  
  let integerPart = "";
  let decimalPart = "";
  
  if (commaIndex !== -1) {
    // Có dấu phẩy (dấu thập phân theo chuẩn Việt Nam)
    integerPart = str.substring(0, commaIndex).replace(/\./g, ""); // Loại bỏ tất cả dấu chấm (dấu nghìn)
    decimalPart = str.substring(commaIndex + 1);
  } else {
    // Không có dấu phẩy, tất cả dấu chấm đều là dấu nghìn
    integerPart = str.replace(/\./g, ""); // Loại bỏ tất cả dấu chấm
    decimalPart = "";
  }
  
  // Kết hợp lại với dấu chấm làm dấu thập phân (để parse thành số)
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
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
 * @returns {number} - Số (có thể là số thập phân)
 */
export function getMoneyValue(formattedValue) {
  const parsed = parseMoneyInput(formattedValue);
  return parsed ? Number(parsed) : 0;
}

