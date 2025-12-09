/**
 * Exchange Rate Service - Lấy tỉ giá VND/USD từ API
 */

// Use backend API as primary source. Backend exposes /api/exchange?from=USD&to=VND
const BACKEND_EXCHANGE_API = "http://localhost:8080/api/exchange";
// Historical endpoint (exchangerate.host supports date-based queries)
const EXCHANGE_HISTORICAL_API = "https://api.exchangerate.host/"; // append YYYY-MM-DD when used
const FALLBACK_RATE = 24500; // Tỉ giá fallback

/**
 * Lấy tỉ giá VND/USD từ API
 */
export async function getExchangeRate() {
  // Kiểm tra cache trước
  const cached = getCachedRate();
  if (cached) {
    return cached;
  }

  // Nếu người dùng cấu hình nguồn tỉ giá tuỳ chỉnh (ví dụ: Google Finance),
  // thử fetch và parse trước khi dùng API mặc định.
  try {
    const custom = localStorage.getItem("exchange_rate_custom_source");
    if (custom) {
      try {
        const parsed = await fetchCustomSourceRate(custom);
        if (parsed && parsed.vndToUsd) {
          cacheRate(parsed);
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to fetch custom exchange source:", e);
        // fallthrough to default API
      }
    }
  } catch (e) {
    // ignore localStorage access problems
  }

  try {
    // Call backend API
    const resp = await fetch(`${BACKEND_EXCHANGE_API}?from=USD&to=VND`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (resp && resp.ok) {
      const body = await resp.json();
      const rate = Number(body.rate);
      if (rate && !Number.isNaN(rate)) {
        const vndToUsd = Math.round(rate);
        const usdToVnd = 1 / rate;

        const oldCached = localStorage.getItem("exchange_rate_previous");
        let change = 0;
        let changePercent = 0;
        if (oldCached) {
          try {
            const oldData = JSON.parse(oldCached);
            const oldRate = oldData.vndToUsd || vndToUsd;
            change = vndToUsd - oldRate;
            changePercent = (change / oldRate) * 100;
          } catch (e) {
            // ignore
          }
        }

        localStorage.setItem("exchange_rate_previous", JSON.stringify({ vndToUsd, lastUpdate: new Date().toISOString() }));

        const rateData = {
          vndToUsd,
          usdToVnd,
          change,
          changePercent,
          lastUpdate: new Date().toISOString(),
          source: 'server'
        };

        cacheRate(rateData);
        return rateData;
      }
    }

    // If backend failed, fallback to existing logic (try custom source or exchangerate)
  } catch (e) {
    console.warn("Backend exchange fetch failed, falling back to client logic:", e);
  }

  // Fallback: try custom source or external APIs as before
  try {
    // If person configured custom source, try that
    const custom = localStorage.getItem("exchange_rate_custom_source");
    if (custom) {
      try {
        const parsed = await fetchCustomSourceRate(custom);
        if (parsed && parsed.vndToUsd) {
          cacheRate(parsed);
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to fetch custom exchange source:", e);
      }
    }

    // Fall back to exchangerate.host
    const response = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=VND", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      const vndRate = data.rates?.VND || FALLBACK_RATE;
      const vndToUsd = Math.round(vndRate);
      const usdToVnd = 1 / vndRate;
      const oldCached = localStorage.getItem("exchange_rate_previous");
      let change = 0;
      let changePercent = 0;
      if (oldCached) {
        try {
          const oldData = JSON.parse(oldCached);
          const oldRate = oldData.vndToUsd || vndToUsd;
          change = vndToUsd - oldRate;
          changePercent = (change / oldRate) * 100;
        } catch (e) {}
      }
      localStorage.setItem("exchange_rate_previous", JSON.stringify({ vndToUsd, lastUpdate: new Date().toISOString() }));
      const rateData = { vndToUsd, usdToVnd, change, changePercent, lastUpdate: new Date().toISOString(), source: 'external' };
      cacheRate(rateData);
      return rateData;
    }
  } catch (error) {
    console.error("Error fetching exchange rate fallback:", error);
  }

  // Final fallback
  if (cached) return cached;
  return { vndToUsd: FALLBACK_RATE, usdToVnd: 1 / FALLBACK_RATE, change: 0, changePercent: 0, lastUpdate: new Date().toISOString(), source: 'fallback' };
}

/**
 * Lấy tỉ giá từ localStorage (nếu đã lưu)
 */
export function getCachedRate() {
  try {
    const cached = localStorage.getItem("exchange_rate_cache");
    if (cached) {
      const data = JSON.parse(cached);
      const cacheTime = new Date(data.lastUpdate);
      const now = new Date();
      
      // Nếu cache còn hiệu lực (dưới 5 phút)
      if (now - cacheTime < 5 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error("Error reading cached rate:", error);
  }
  return null;
}

/**
 * Lưu tỉ giá vào localStorage
 */
export function cacheRate(rateData) {
  try {
    localStorage.setItem("exchange_rate_cache", JSON.stringify(rateData));
    
    // Lưu vào lịch sử
    saveRateToHistory(rateData.vndToUsd);
  } catch (error) {
    console.error("Error caching rate:", error);
  }
}

/**
 * Lưu tỉ giá vào lịch sử (tối đa 30 ngày)
 */
export function saveRateToHistory(vndToUsd) {
  try {
    let history = [];
    try {
      const stored = localStorage.getItem("exchange_rate_history");
      if (stored) {
        history = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading history:", e);
    }
    
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentTime = now.toISOString();
    
    // Thêm điểm dữ liệu mới với timestamp
    history.push({
      date: currentTime,
      value: vndToUsd,
      day: today, // Để nhóm theo ngày
    });
    
    // Loại bỏ trùng lặp và sắp xếp
    const unique = history.filter((item, index, self) => 
      index === self.findIndex((t) => t.date === item.date)
    );
    unique.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Giữ tối đa 30 ngày
    const maxDays = 30;
    if (unique.length > maxDays * 10) { // Giữ nhiều điểm trong ngày
      unique.splice(0, unique.length - maxDays * 10);
    }
    
    localStorage.setItem("exchange_rate_history", JSON.stringify(unique));
  } catch (error) {
    console.error("Error saving rate history:", error);
  }
}

/**
 * Lấy lịch sử tỉ giá từ API (7 ngày gần nhất) - sử dụng exchangerate.host
 */
export async function fetchRateHistory() {
  try {
    // Lấy dữ liệu từ localStorage trước (dữ liệu thật đã lưu)
    const cached = getRateHistory();
    if (cached && cached.length >= 7) {
      return cached; // Đã có đủ dữ liệu
    }
    
    const history = [];
    const today = new Date();
    
    // Thử lấy từ exchangerate.host (miễn phí, có historical)
    try {
      // Lấy dữ liệu 7 ngày gần nhất
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
        
        // Thử exchangerate.host
        try {
          const response = await fetch(
            `https://api.exchangerate.host/${dateStr}?base=USD&symbols=VND`,
            {
              method: "GET",
              headers: {
                "Accept": "application/json",
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const vndRate = data.rates?.VND || null;
            
            if (vndRate) {
              history.push({
                date: date.toISOString(),
                value: Math.round(vndRate),
              });
              continue;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch from exchangerate.host for ${dateStr}:`, e);
        }
        
        // Nếu không lấy được, dùng dữ liệu từ localStorage
        const cachedForDate = getCachedHistoryForDate(dateStr);
        if (cachedForDate) {
          history.push(cachedForDate);
        }
      }
      
      // Nếu vẫn chưa đủ, lấy từ localStorage và fill gaps
      if (history.length < 7) {
        const allCached = getAllCachedHistory();
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          
          // Tìm trong cached
          const found = allCached.find((d) => d.day === dateStr || d.date.startsWith(dateStr));
          if (found) {
            last7Days.push({
              date: found.date,
              value: found.value,
            });
          } else if (history.length > 0) {
            // Dùng giá trị gần nhất
            const lastValue = history[history.length - 1].value;
            last7Days.push({
              date: date.toISOString(),
              value: lastValue,
            });
          } else if (allCached.length > 0) {
            // Dùng giá trị từ cache
            const lastCached = allCached[allCached.length - 1];
            last7Days.push({
              date: date.toISOString(),
              value: lastCached.value,
            });
          } else {
            // Fallback cuối cùng
            last7Days.push({
              date: date.toISOString(),
              value: FALLBACK_RATE,
            });
          }
        }
        return last7Days;
      }
      
      return history;
    } catch (error) {
      console.error("Error fetching rate history from API:", error);
      return getRateHistory(); // Fallback về localStorage
    }
  } catch (error) {
    console.error("Error fetching rate history:", error);
    return getRateHistory();
  }
}

/**
 * Lấy tất cả lịch sử từ localStorage
 */

// Helper: parse HTML of Google Finance (or similar) to extract VND per USD.
// Google Finance tends to put the numeric price inside an element with class
// name that includes "YMlKec" (e.g. <div class="YMlKec fxKbKc">24,500</div>).
function parseVndFromGoogleFinance(html) {
  if (!html || typeof html !== 'string') return null;
  try {
    // Try common Google Finance class
    const classMatch = html.match(/class="([^"]*YMlKec[^"]*)"[^>]*>([^<]+)</i);
    if (classMatch && classMatch[2]) {
      const txt = classMatch[2].replace(/[^0-9.,]/g, '').trim();
      const normalized = txt.replace(/,/g, '');
      const n = Number(normalized);
      if (!Number.isNaN(n) && n > 0) return n;
    }

    // Fallback: search for a pattern like "VND" nearby a number
    const fallbackMatch = html.match(/([0-9\.,]{3,})\s*VND/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const normalized = fallbackMatch[1].replace(/,/g, '');
      const n = Number(normalized);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function fetchCustomSourceRate(url) {
  if (!url) throw new Error('No custom exchange source URL provided');
  // Try to fetch the HTML page and parse the VND rate
  const resp = await fetch(url, { method: 'GET', headers: { Accept: 'text/html' } });
  if (!resp.ok) throw new Error(`Custom source fetch failed: ${resp.status}`);
  const html = await resp.text();
  const vndRate = parseVndFromGoogleFinance(html);
  if (!vndRate) throw new Error('Unable to parse VND rate from custom source HTML');

  // Build rate data in the same shape as the rest of the service
  const vndToUsd = Math.round(vndRate);
  const usdToVnd = 1 / vndRate;

  // Compute change relative to previous cached value if any
  let change = 0;
  let changePercent = 0;
  try {
    const oldCached = localStorage.getItem('exchange_rate_previous');
    if (oldCached) {
      const oldData = JSON.parse(oldCached);
      const oldRate = oldData.vndToUsd || vndToUsd;
      change = vndToUsd - oldRate;
      changePercent = (change / oldRate) * 100;
    }
  } catch (e) {
    // ignore
  }

  // Save previous snapshot
  try {
    localStorage.setItem('exchange_rate_previous', JSON.stringify({ vndToUsd, lastUpdate: new Date().toISOString() }));
  } catch (e) {}

  return {
    vndToUsd,
    usdToVnd,
    change,
    changePercent,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Cho phép lưu URL nguồn tỉ giá tuỳ chỉnh (ví dụ Google Finance) vào localStorage.
 * Frontend có thể gọi `setCustomExchangeSource(url)` để thiết lập.
 */
export function setCustomExchangeSource(url) {
  try {
    if (!url) {
      localStorage.removeItem('exchange_rate_custom_source');
    } else {
      localStorage.setItem('exchange_rate_custom_source', String(url));
    }
    return true;
  } catch (e) {
    console.error('Error setting custom exchange source:', e);
    return false;
  }
}

function getAllCachedHistory() {
  try {
    const history = localStorage.getItem("exchange_rate_history");
    if (history) {
      const data = JSON.parse(history);
      return data.map((item) => ({
        ...item,
        day: item.day || item.date.split("T")[0],
      }));
    }
  } catch (error) {
    console.error("Error reading all cached history:", error);
  }
  return [];
}

/**
 * Lấy lịch sử tỉ giá từ localStorage (7 ngày gần nhất, mỗi ngày 1 điểm)
 */
export function getRateHistory() {
  try {
    const allHistory = getAllCachedHistory();
    
    if (allHistory.length === 0) {
      return [];
    }
    
    // Sắp xếp theo ngày
    allHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Nhóm theo ngày và lấy giá trị cuối cùng của mỗi ngày
    const byDay = {};
    allHistory.forEach((item) => {
      const day = item.day || item.date.split("T")[0];
      if (!byDay[day] || new Date(item.date) > new Date(byDay[day].date)) {
        byDay[day] = item;
      }
    });
    
    // Chuyển thành array và sắp xếp
    const dailyData = Object.values(byDay).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Lấy 7 ngày gần nhất
    const last7Days = dailyData.slice(-7);
    
    // Đảm bảo có đủ 7 ngày (fill gaps nếu cần)
    if (last7Days.length < 7) {
      const today = new Date();
      const filled = [];
      const lastValue = last7Days.length > 0 ? last7Days[last7Days.length - 1].value : FALLBACK_RATE;
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const existing = last7Days.find((d) => {
          const dDay = d.day || d.date.split("T")[0];
          return dDay === dateStr;
        });
        
        if (existing) {
          filled.push({
            date: existing.date,
            value: existing.value,
          });
        } else {
          // Dùng giá trị gần nhất
          filled.push({
            date: date.toISOString(),
            value: lastValue,
          });
        }
      }
      return filled;
    }
    
    // Format lại để đảm bảo có date và value
    return last7Days.map((item) => ({
      date: item.date,
      value: item.value,
    }));
  } catch (error) {
    console.error("Error reading rate history:", error);
    return [];
  }
}

/**
 * Lấy tỉ giá từ localStorage cho một ngày cụ thể
 */
function getCachedHistoryForDate(dateStr) {
  try {
    const allHistory = getAllCachedHistory();
    const dayData = allHistory.filter((d) => {
      const dDay = d.day || d.date.split("T")[0];
      return dDay === dateStr;
    });
    
    if (dayData.length > 0) {
      // Lấy giá trị cuối cùng trong ngày
      dayData.sort((a, b) => new Date(b.date) - new Date(a.date));
      return {
        date: dayData[0].date,
        value: dayData[0].value,
      };
    }
  } catch (error) {
    console.error("Error reading cached history:", error);
  }
  return null;
}

