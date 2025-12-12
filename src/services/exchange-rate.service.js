// Exchange rate service: frontend chỉ dùng VND, không cần chuyển đổi tiền tệ.
// Service này được giữ lại để tránh break các import hiện có, nhưng không còn chức năng chuyển đổi.

export async function getExchangeRate() {
  return {
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

