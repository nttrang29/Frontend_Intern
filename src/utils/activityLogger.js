const LEGACY_ACTIVITY_KEYS = ["activity_log", "activityLog", "activity-log"];
const DEFAULT_ACTIVITY_KEY = LEGACY_ACTIVITY_KEYS[0];
let cachedSessionId = null;

const safeParseArray = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const ensureSessionId = () => {
  if (cachedSessionId) return cachedSessionId;
  cachedSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return cachedSessionId;
};

const normalizeUserShape = (rawUser) => {
  if (!rawUser || typeof rawUser !== "object") return null;
  const flat = {
    ...rawUser,
    ...(rawUser.user || {}),
  };
  const id = flat.id ?? flat.userId ?? flat.user?.id ?? flat.user?.userId ?? null;
  const email =
    flat.email ??
    flat.userEmail ??
    flat.username ??
    flat.user?.email ??
    null;
  const nameCandidates = [flat.fullName, flat.name, flat.displayName, flat.user?.fullName, flat.user?.name];
  let fullName = nameCandidates.find((item) => typeof item === "string" && item.trim().length > 0) || null;
  if (!fullName) {
    const composed = [flat.firstName || flat.user?.firstName, flat.lastName || flat.user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    fullName = composed.length > 0 ? composed : null;
  }

  return {
    ...flat,
    id,
    userId: flat.userId ?? id,
    email,
    fullName,
  };
};

const readStoredUser = () => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const authRaw = window.localStorage.getItem("auth_user");
    if (authRaw) return normalizeUserShape(JSON.parse(authRaw));
  } catch (e) {
    // ignore parsing errors
  }
  try {
    const legacyRaw = window.localStorage.getItem("user");
    if (legacyRaw) return normalizeUserShape(JSON.parse(legacyRaw));
  } catch (e) {
    // ignore parsing errors
  }
  return null;
};

export const getLegacyActivityKeys = () => [...LEGACY_ACTIVITY_KEYS];

export function resolveActivityUser(userOverride) {
  if (userOverride) {
    const normalized = normalizeUserShape(userOverride);
    if (normalized) return normalized;
  }
  return readStoredUser();
}

export function getActivityStorageKey(userOverride) {
  const resolved = resolveActivityUser(userOverride);
  const userId = resolved?.id ?? resolved?.userId ?? null;
  if (userId != null) {
    return `${DEFAULT_ACTIVITY_KEY}:${String(userId)}`;
  }
  return `${DEFAULT_ACTIVITY_KEY}:session:${ensureSessionId()}`;
}

export function logActivity(entry, options = {}) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const targetKey = getActivityStorageKey(options.user);
    const userMeta = resolveActivityUser(options.user);
    const now = new Date().toISOString();
    const base = { timestamp: now };
    const toStore = { ...base, ...(entry || {}) };
    if (userMeta) {
      if (userMeta.userId != null && toStore.userId == null) {
        toStore.userId = userMeta.userId;
      } else if (userMeta.id != null && toStore.userId == null) {
        toStore.userId = userMeta.id;
      }
      if (!toStore.userEmail && userMeta.email) {
        toStore.userEmail = userMeta.email;
      }
      if (!toStore.userName && userMeta.fullName) {
        toStore.userName = userMeta.fullName;
      }
    }

    const raw = window.localStorage.getItem(targetKey);
    let arr = safeParseArray(raw);
    arr.unshift(toStore);
    if (arr.length > 500) arr = arr.slice(0, 500);
    window.localStorage.setItem(targetKey, JSON.stringify(arr));
    try {
      const evt = new CustomEvent("activity:updated", { detail: toStore });
      window.dispatchEvent(evt);
    } catch (e) {
      // ignore dispatch errors
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log activity", e);
  }
}

export function clearActivity(options = {}) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const key = getActivityStorageKey(options.user);
    window.localStorage.removeItem(key);
    if (options.includeLegacy) {
      LEGACY_ACTIVITY_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
    }
  } catch (e) {}
}
