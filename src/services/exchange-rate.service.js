// Exchange rate service stub: frontend hiện chỉ dùng VND, không cần gọi API.
// Trả về giá trị cố định 1:1 để tránh thay đổi hành vi ở các nơi đã import.

export async function getExchangeRate() {
  return {
    vndToUsd: 1,
    usdToVnd: 1,
    change: 0,
    changePercent: 0,
    lastUpdate: new Date().toISOString(),
    source: "static",
  };
}

export function getRateHistory() {
  return [];
}

export async function fetchRateHistory() {
  return [];
}

export function setCustomExchangeSource() {
  // no-op
}

