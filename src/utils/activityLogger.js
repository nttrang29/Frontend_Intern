export function logActivity(entry) {
  try {
    const now = new Date().toISOString();
    const base = { timestamp: now };
    const toStore = { ...base, ...(entry || {}) };
    const raw = localStorage.getItem("activity_log");
    let arr = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed;
      } catch (e) {
        arr = [];
      }
    }
    arr.unshift(toStore);
    // keep only recent 500 events to avoid runaway storage
    if (arr.length > 500) arr = arr.slice(0, 500);
    localStorage.setItem("activity_log", JSON.stringify(arr));
    try {
      // dispatch a cross-window event so pages in the same window can react
      const evt = new CustomEvent("activity:updated", { detail: toStore });
      window.dispatchEvent(evt);
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // silent fail
    // eslint-disable-next-line no-console
    console.error("Failed to log activity", e);
  }
}

export function clearActivity() {
  try {
    localStorage.removeItem("activity_log");
  } catch (e) {}
}
