import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDateFormat } from "../../hooks/useDateFormat";
import "../../styles/pages/HomeLayout.css";
import "../../styles/components/wallets/WalletHeader.css";
import "../../styles/pages/CategoriesPage.css";
import "../../styles/home/ActivityHistoryPage.css";
import { formatMoney } from "../../utils/formatMoney";
import {
  getActivityStorageKey,
  getLegacyActivityKeys,
  resolveActivityUser,
} from "../../utils/activityLogger";

const PAGE_SIZE = 10;

export default function ActivityHistoryPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const { budgets = [] } = useBudgetData();
  const { currentUser } = useAuth();
  const { formatDate: formatWithSetting } = useDateFormat();
  
  const [queryText, setQueryText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const legacyKeys = useMemo(() => getLegacyActivityKeys(), []);
  const userMeta = useMemo(() => resolveActivityUser(currentUser), [currentUser]);
  const activityKey = useMemo(() => getActivityStorageKey(currentUser), [currentUser]);

  const loadEvents = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        setEvents([]);
        return;
      }

      const keysToCheck = [];
      if (activityKey) keysToCheck.push(activityKey);
      legacyKeys.forEach((key) => {
        if (key && !keysToCheck.includes(key)) keysToCheck.push(key);
      });

      const allowedIds = new Set();
      const allowedEmails = new Set();

      const pushId = (val) => {
        if (val === undefined || val === null) return;
        allowedIds.add(String(val));
      };
      const pushEmail = (val) => {
        if (!val) return;
        allowedEmails.add(String(val).toLowerCase());
      };

      const candidates = [currentUser, currentUser?.user, userMeta];
      candidates.forEach((candidate) => {
        if (!candidate) return;
        pushId(candidate.id);
        pushId(candidate.userId);
        pushEmail(candidate.email);
      });

      const parseArray = (raw) => {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
          return [];
        }
      };

      const shouldInclude = (entry, isPrimaryKey) => {
        if (isPrimaryKey) return true;
        if (allowedIds.size === 0 && allowedEmails.size === 0) return false;
        const idCandidates = [
          entry?.userId,
          entry?.user_id,
          entry?.user?.id,
          entry?.user?.userId,
        ];
        if (
          idCandidates.some(
            (candidate) => candidate !== undefined && candidate !== null && allowedIds.has(String(candidate))
          )
        ) {
          return true;
        }
        const entryEmail = (entry?.userEmail || entry?.user?.email || "").toLowerCase();
        if (entryEmail && allowedEmails.has(entryEmail)) {
          return true;
        }
        return false;
      };

      const merged = [];
      const seen = new Set();

      keysToCheck.forEach((key) => {
        if (!key) return;
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        const items = parseArray(raw);
        const isPrimary = key === activityKey;
        items.forEach((item) => {
          if (!shouldInclude(item, isPrimary)) return;
          const ts = item?.timestamp || item?.time || item?.createdAt || item?.date || "";
          const dedupeKey = `${key}|${ts}|${item?.type || item?.event || item?.action || ""}|${item?.message || item?.desc || item?.description || ""}`;
          if (seen.has(dedupeKey)) return;
          seen.add(dedupeKey);
          merged.push(item);
        });
      });

      const toMillis = (value) => {
        if (!value) return 0;
        const ms = new Date(value).getTime();
        return Number.isNaN(ms) ? 0 : ms;
      };

      merged.sort((a, b) => {
        const aTs = a?.timestamp || a?.time || a?.createdAt || a?.date;
        const bTs = b?.timestamp || b?.time || b?.createdAt || b?.date;
        return toMillis(bTs) - toMillis(aTs);
      });

      setEvents(merged);
      // eslint-disable-next-line no-console
      console.debug("ActivityHistory: loaded", merged.length);
    } catch (e) {
      setEvents([]);
      // eslint-disable-next-line no-console
      console.error("ActivityHistory: failed to load activity_log", e);
    }
  }, [activityKey, legacyKeys, currentUser, userMeta]);

  const formatTimestamp = useCallback(
    (ts) => {
      if (!ts) return "--";
      try {
        const dateObj = new Date(ts);
        if (Number.isNaN(dateObj.getTime())) return ts;
        const datePart = formatWithSetting(dateObj);
        const timePart = dateObj.toLocaleTimeString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        return `${timePart} ${datePart}`.trim();
      } catch (_err) {
        return ts;
      }
    },
    [formatWithSetting]
  );

  useEffect(() => {
    loadEvents();
    const onUpdated = () => loadEvents();
    window.addEventListener("activity:updated", onUpdated);
    return () => window.removeEventListener("activity:updated", onUpdated);
  }, [loadEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      try {
        const q = (queryText || "").trim().toLowerCase();
        const fromDateObj = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const toDateObj = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
        const tsRaw = ev.timestamp || ev.time || ev.createdAt || ev.date || null;
        const evDate = tsRaw ? new Date(tsRaw) : null;
        if (fromDateObj && evDate && evDate < fromDateObj) return false;
        if (toDateObj && evDate && evDate > toDateObj) return false;

        if (!q) return true;
        const type = (ev.type || ev.event || ev.action || "").toString().toLowerCase();
        const desc = (ev.message || ev.desc || ev.description || ev.note || "").toString().toLowerCase();
        const actor = (ev.userEmail || (ev.user && ev.user.email) || ev.actor || ev.actorEmail || "").toString().toLowerCase();
        return type.includes(q) || desc.includes(q) || actor.includes(q);
      } catch (e) {
        return true;
      }
    });
  }, [events, queryText, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

  const paginationRange = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (startPage > 2) pages.push("start-ellipsis");

    for (let p = startPage; p <= endPage; p += 1) {
      pages.push(p);
    }

    if (endPage < totalPages - 1) pages.push("end-ellipsis");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) return totalPages;
      if (prev < 1) return 1;
      return prev;
    });
  }, [totalPages]);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, currentPage]);

  const handleChangePage = (direction) => {
    setCurrentPage((prev) => {
      if (direction === "first") return 1;
      if (direction === "last") return totalPages;
      if (direction === "prev") return Math.max(1, prev - 1);
      if (direction === "next") return Math.min(totalPages, prev + 1);
      if (typeof direction === "number") {
        const target = Math.min(Math.max(direction, 1), totalPages);
        return target;
      }
      return prev;
    });
  };

  const handleResetFilters = () => {
    setQueryText("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const budgetLookup = useMemo(() => {
    const map = new Map();
    (budgets || []).forEach((budget) => {
      const id = budget?.id ?? budget?.budgetId;
      if (id !== undefined && id !== null) {
        map.set(String(id), budget);
      }
    });
    return map;
  }, [budgets]);

  const normalizeEvent = useCallback((ev) => {
    const rawType = (ev.type || ev.event || ev.action || "").toString().toLowerCase();
    const msg = ev.message || ev.desc || ev.description || ev.note || "";
    const data = ev.data || ev.payload || ev.body || {};

    const actor = (ev.userEmail || (ev.user && (ev.user.email || ev.userEmail)) || ev.actor || ev.actorEmail || ev.performedBy || ev.createdBy || "").toString();

    const getAmount = (a) => {
      if (a == null) return null;
      const n = Number(a);
      return Number.isNaN(n) ? null : n;
    };

    const amount = getAmount(ev.amount || ev.value || data.amount || data.value);
    const currency = ev.currency || data.currency || "VND";

    const pick = (obj, keys) => {
      if (!obj) return null;
      for (const k of keys) {
        if (obj[k]) return obj[k];
      }
      for (const k of Object.keys(obj || {})) {
        const v = obj[k];
        if (v && typeof v === "object") {
          for (const kk of keys) {
            if (v[kk]) return v[kk];
          }
          if (v.name) return v.name;
          if (v.title) return v.title;
          if (v.walletName) return v.walletName;
          if (v.categoryName) return v.categoryName;
        }
      }
      return null;
    };

    const deepFindName = (obj, maxDepth = 6) => {
      if (!obj || maxDepth <= 0) return null;
      if (typeof obj === "string") return obj;
      if (typeof obj !== "object") return null;
      if (obj.name && typeof obj.name === "string") return obj.name;
      if (obj.walletName && typeof obj.walletName === "string") return obj.walletName;
      if (obj.title && typeof obj.title === "string") return obj.title;
      if (obj.categoryName && typeof obj.categoryName === "string") return obj.categoryName;
      for (const k of Object.keys(obj)) {
        if (/name|title|wallet/i.test(k) && typeof obj[k] === "string") return obj[k];
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === "object") {
          const found = deepFindName(v, maxDepth - 1);
          if (found) return found;
        }
        if (Array.isArray(v)) {
          for (const item of v) {
            const found = deepFindName(item, maxDepth - 1);
            if (found) return found;
          }
        }
      }
      return null;
    };

    const actorDisplay = actor ? ` — bởi ${actor}` : "";

    const stripActorTail = (text) => {
      if (!text) return "";
      const trimmed = text.trim();
      const idx = trimmed.indexOf(" — ");
      return idx === -1 ? trimmed : trimmed.slice(0, idx).trim();
    };

    const createDescription = (parts) => {
      const segments = [];
      parts.forEach((part) => {
        if (!part) return;
        if (typeof part === "string") {
          if (part.length) {
            segments.push({ text: part, highlight: false });
          }
        } else if (part.text) {
          segments.push({ text: part.text, highlight: !!part.highlight });
        }
      });
      return {
        text: segments.map((seg) => seg.text).join(""),
        segments,
      };
    };

    let typeLabel = rawType || "Sự kiện";
    let description = msg || "";
    let descriptionSegments = null;

    if (rawType.includes("merge") || rawType.includes("gộp") || rawType.includes("gop")) {
      typeLabel = "Gộp ví";
      let src = pick(data, ["sourceName", "source_wallet", "sourceWalletName", "from", "fromWallet", "source"]);
      let tgt = pick(data, ["targetName", "target_wallet", "targetWalletName", "to", "toWallet", "target"]);
      if (!src && data.source) src = pick(data.source, ["name", "walletName"]) || deepFindName(data.source);
      if (!tgt && data.target) tgt = pick(data.target, ["name", "walletName"]) || deepFindName(data.target);
      if (!src && data.sourceWallet) src = deepFindName(data.sourceWallet);
      if (!tgt && data.targetWallet) tgt = deepFindName(data.targetWallet);
      if ((!src || !tgt) && msg) {
        const cleaned = stripActorTail(msg);
        if (cleaned) {
          const lower = cleaned.toLowerCase();
          if (lower.startsWith("gộp")) {
            let remainder = cleaned.slice(3).trim();
            if (remainder.toLowerCase().startsWith("ví ")) {
              remainder = remainder.slice(3).trim();
            }
            const marker = " vào ";
            const markerIdx = remainder.toLowerCase().indexOf(marker);
            if (markerIdx !== -1) {
              let srcCandidate = remainder.slice(0, markerIdx).trim();
              let tgtCandidate = remainder.slice(markerIdx + marker.length).trim();
              if (srcCandidate.toLowerCase().startsWith("ví ")) {
                srcCandidate = srcCandidate.slice(3).trim();
              }
              if (tgtCandidate.toLowerCase().startsWith("ví ")) {
                tgtCandidate = tgtCandidate.slice(3).trim();
              }
              srcCandidate = stripActorTail(srcCandidate);
              tgtCandidate = stripActorTail(tgtCandidate);
              if (!src && srcCandidate) src = srcCandidate;
              if (!tgt && tgtCandidate) tgt = tgtCandidate;
            }
          }
        }
      }
      if (!src) src = deepFindName(data.source || data) || "(ví nguồn)";
      if (!tgt) tgt = deepFindName(data.target || data) || "(ví đích)";
      const built = createDescription([
        "Gộp ",
        { text: src, highlight: true },
        " vào ",
        { text: tgt, highlight: true },
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("delete") || rawType.includes("xóa") || rawType.includes("remove")) && (rawType.includes("wallet") || ev.walletId || ev.walletName)) {
      typeLabel = "Xóa ví";
      let name = pick(data, ["name", "walletName", "wallet_name"]) || ev.walletName || ev.name;
      if (!name) name = deepFindName(data) || "(tên ví)";
      const built = createDescription([
        "Xóa ví ",
        { text: name, highlight: true },
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("create") || rawType.includes("tao") || rawType.includes("tạo")) && (rawType.includes("wallet") || ev.walletId || ev.walletName || ev.name)) {
      typeLabel = "Tạo ví";
      let name = pick(data, ["name", "walletName", "wallet_name"]) || ev.walletName || ev.name;
      if (!name) name = deepFindName(data) || "(tên ví)";
      const built = createDescription([
        "Tạo ví ",
        { text: name, highlight: true },
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("edit") || rawType.includes("update") || rawType.includes("sửa")) && (rawType.includes("wallet") || ev.walletId || ev.walletName)) {
      typeLabel = "Sửa ví";
      let name = pick(data, ["name", "walletName", "wallet_name"]) || ev.walletName || ev.name;
      if (!name) name = deepFindName(data) || "(tên ví)";
      if (ev.changes) {
        const changes = Object.entries(ev.changes).map(([k, v]) => `${k}: ${v}`).join(", ");
        const built = createDescription([
          "Sửa ",
          { text: name, highlight: true },
          ` (${changes})`,
          actorDisplay,
        ]);
        description = built.text;
        descriptionSegments = built.segments;
      } else {
        const built = createDescription([
          "Cập nhật thông tin cho ",
          { text: name, highlight: true },
          actorDisplay,
        ]);
        description = built.text;
        descriptionSegments = built.segments;
      }
    } else if (rawType.includes("group") && rawType.includes("wallet")) {
      typeLabel = "Chuyển thành ví nhóm";
      let name = pick(data, ["name", "walletName"]) || ev.walletName || ev.name;
      if (!name) name = deepFindName(data) || "(tên ví)";
      const members = pick(data, ["membersCount", "count"]) || data.membersCount || data.count || "nhiều";
      const built = createDescription([
        "Chuyển ",
        { text: name, highlight: true },
        ` thành ví nhóm (${members} thành viên)`,
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if (
      (rawType.includes("remove_member") || rawType.includes("unshare") || (rawType.includes("remove") && (rawType.includes("user") || rawType.includes("member"))))) {
      typeLabel = "Xóa người dùng";
      let who = pick(data, ["email", "removedEmail", "memberEmail"]) || ev.email || ev.removedEmail;
      if (!who) who = deepFindName(data) || "(email)";
      let walletName =
        pick(data, ["walletName", "wallet_name", "wallet", "name"]) ||
        ev.walletName ||
        deepFindName(data) ||
        "(tên ví)";
      const built = createDescription([
        "Xóa ",
        { text: who, highlight: true },
        " khỏi ví ",
        { text: walletName, highlight: true },
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("share") && !rawType.includes("unshare")) || rawType.includes("add_member") || rawType.includes("add user") || rawType.includes("thêm")) {
      typeLabel = "Thêm người dùng";
      let who = pick(data, ["email", "sharedTo", "invitee", "inviteeEmail"]) || ev.email || ev.sharedTo;
      if (!who) who = deepFindName(data) || "(email)";
      const role = pick(data, ["role", "sharedRole", "membershipRole"]) || ev.role || "";
      let walletName =
        pick(data, ["walletName", "wallet_name", "wallet", "name"]) ||
        ev.walletName ||
        deepFindName(data) ||
        "(tên ví)";
      const parts = [
        "Thêm ",
        { text: who, highlight: true },
        " vào ví ",
        { text: walletName, highlight: true },
      ];
      if (role) {
        parts.push(" với vai trò ", { text: role, highlight: true });
      }
      if (actorDisplay) parts.push(actorDisplay);
      const built = createDescription(parts);
      description = built.text;
      descriptionSegments = built.segments;
    } else if (rawType.includes("budget") && (rawType.includes("create") || rawType.includes("tao") || rawType.includes("tạo"))) {
      typeLabel = "Tạo ngân sách";
      let name = pick(data, ["name", "budgetName", "title"]) || ev.name;
      let cat =
        pick(data, ["categoryName", "category", "category_name"]) ||
        data.category ||
        data.categoryName ||
        ev.categoryName;
      const budgetIdCandidate = data.budgetId || ev.budgetId || ev.id;
      if (!cat && budgetIdCandidate && budgetLookup.has(String(budgetIdCandidate))) {
        const found = budgetLookup.get(String(budgetIdCandidate));
        cat = found?.categoryName || found?.category?.name || cat;
        if (!name) name = found?.name || found?.title || name;
      }
      const walletName =
        pick(data, ["walletName", "wallet", "wallet_name"]) ||
        data.walletName ||
        ev.walletName;
      const hasValidName = !!(name && name !== "(tên ngân sách)");
      if (!name) name = deepFindName(data) || "(tên ngân sách)";

      const primaryLabel = hasValidName ? name : (cat || name);
      const parts = [
        hasValidName ? "Tạo ngân sách " : "Tạo ngân sách cho danh mục ",
        { text: primaryLabel || "(tên ngân sách)", highlight: true },
      ];

      if (hasValidName && cat) {
        parts.push(" — danh mục: ", { text: cat, highlight: true });
      }

      if (!hasValidName && !cat) {
        parts.push(" — chưa xác định danh mục");
      }

      if (walletName) {
        parts.push(" — ví: ", { text: walletName, highlight: true });
      }
      if (amount != null) {
        parts.push(` — ${formatMoney(amount, currency)}`);
      }
      if (actorDisplay) parts.push(actorDisplay);
      const built = createDescription(parts);
      description = built.text;
      descriptionSegments = built.segments;
    } else if (rawType.includes("budget") && (rawType.includes("delete") || rawType.includes("xóa"))) {
      typeLabel = "Xóa ngân sách";
      let name = pick(data, ["name", "budgetName", "title"]) || ev.name;
      let cat =
        pick(data, ["categoryName", "category", "category_name"]) ||
        data.category ||
        data.categoryName ||
        ev.categoryName;
      const budgetIdCandidate = data.budgetId || ev.budgetId || ev.id;
      if (!cat && budgetIdCandidate && budgetLookup.has(String(budgetIdCandidate))) {
        const found = budgetLookup.get(String(budgetIdCandidate));
        cat = found?.categoryName || found?.category?.name || cat;
        if (!name) name = found?.name || found?.title || name;
      }
      const hasValidName = !!(name && name !== "(tên ngân sách)");
      if (!name) name = deepFindName(data) || "(tên ngân sách)";

      const primaryLabel = hasValidName ? name : (cat || name);
      const parts = [
        hasValidName ? "Xóa ngân sách " : "Xóa ngân sách của danh mục ",
        { text: primaryLabel || "(tên ngân sách)", highlight: true },
      ];
      if (hasValidName && cat) {
        parts.push(" — danh mục: ", { text: cat, highlight: true });
      }
      if (!hasValidName && !cat) {
        parts.push(" — chưa xác định danh mục");
      }
      if (actorDisplay) parts.push(actorDisplay);
      const built = createDescription(parts);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("fund") || rawType.includes("quỹ")) && (rawType.includes("create") || rawType.includes("tao") || rawType.includes("tạo"))) {
      typeLabel = "Tạo quỹ";
      let name = pick(data, ["name", "fundName", "title"]) || ev.name;
      if (!name) name = deepFindName(data) || "(tên quỹ)";
      const parts = [
        "Tạo quỹ ",
        { text: name, highlight: true },
      ];
      if (amount != null) {
        parts.push(` — ${formatMoney(amount, currency)}`);
      }
      if (actorDisplay) parts.push(actorDisplay);
      const built = createDescription(parts);
      description = built.text;
      descriptionSegments = built.segments;
    } else if ((rawType.includes("fund") || rawType.includes("quỹ")) && (rawType.includes("delete") || rawType.includes("xóa"))) {
      typeLabel = "Xóa quỹ";
      let name = pick(data, ["name", "fundName", "title"]) || ev.name;
      if (!name) name = deepFindName(data) || "(tên quỹ)";
      const built = createDescription([
        "Xóa quỹ ",
        { text: name, highlight: true },
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else {
      typeLabel = ev.type || ev.event || ev.action || "Sự kiện";
      const base = msg || JSON.stringify(data || ev || {}).slice(0, 200);
      const built = createDescription([base, actorDisplay]);
      description = built.text;
      descriptionSegments = built.segments;
    }

    if (!descriptionSegments || descriptionSegments.length === 0) {
      const fallback = createDescription([description || actorDisplay]);
      description = fallback.text;
      descriptionSegments = fallback.segments;
    }

    return {
      timestamp: ev.timestamp || ev.time || ev.createdAt || ev.date || null,
      typeLabel,
      description,
      descriptionSegments,
      actor: actor || "-",
      raw: ev,
    };
  }, [budgetLookup]);

  return (
    <div className="page page-activity">
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-header-icon">
            <i className="bi bi-clock-history" />
          </div>
          <div>
            <div className="wallet-header-title">{t("activity.title")}</div>
            <div className="wallet-header-subtitle">{t("activity.subtitle")}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="wallet-header-btn" type="button" onClick={loadEvents}>
            <i className="bi bi-arrow-clockwise" /> {t("common.refresh") || "Refresh"}
          </button>
        </div>
      </div>

      <div className="page__body">
        {events.length === 0 ? (
          <div className="empty-state">{t("activity.no_data")}</div>
        ) : (
          <div>
            <div style={{ height: 8 }} />

            {/* Search / filters card */}
            <div style={{ marginBottom: 12 }}>
              <div className="cat-table-card search-card">
                <div className="card-body">
                  <div className="search-card-title">Tìm kiếm lịch sử giao dịch</div>
                  <div className="category-search-inline" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="category-search-select" style={{ flex: 1 }}>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="Tìm theo từ khóa (type, mô tả, email...)"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                      />
                      {queryText ? (
                        <button
                          type="button"
                          className="category-search-clear-btn"
                          aria-label="clear-search"
                          onClick={() => setQueryText("")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    <div className="category-search-actions" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <small style={{ color: "var(--muted-color, #666)" }}>Từ</small>
                        <input className="form-control date-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </label>
                      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <small style={{ color: "var(--muted-color, #666)" }}>Đến</small>
                        <input className="form-control date-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </label>

                      <button className="category-search-submit" type="button" onClick={() => loadEvents()}>
                        <i className="bi bi-search" style={{ marginRight: 8 }} /> Tìm
                      </button>

                      <button className="btn-chip btn-chip--ghost" type="button" onClick={handleResetFilters}>
                        Xóa lọc
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results table */}
            <div className="cat-table-card">
              <div className="card-body" style={{ paddingTop: 6 }}>
                <table className="table table-hover">
                  <thead>
                      <tr>
                        <th style={{ width: 60 }}>STT</th>
                        <th style={{ minWidth: 160 }}>Thời gian</th>
                        <th>Loại</th>
                        <th>Mô tả</th>
                      </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">Không có sự kiện nào khớp bộ lọc.</td>
                      </tr>
                    ) : (
                      paginatedEvents.map((ev, idx) => {
                        const n = normalizeEvent(ev);
                        const ts = formatTimestamp(n.timestamp || ev.timestamp || ev.time || ev.createdAt);
                        const absoluteIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                        return (
                          <tr key={idx}>
                            <td className="text-muted">{absoluteIndex}</td>
                            <td className="fw-medium">{ts}</td>
                            <td>{n.typeLabel}</td>
                            <td style={{ maxWidth: 520 }}>
                              {n.descriptionSegments && n.descriptionSegments.length > 0
                                ? n.descriptionSegments.map((segment, segIdx) => (
                                    <span
                                      key={`desc-${idx}-${segIdx}`}
                                      className={segment.highlight ? "activity-highlight" : undefined}
                                    >
                                      {segment.text}
                                    </span>
                                  ))
                                : n.description}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* raw JSON preview removed */}
              </div>
              {filteredEvents.length > 0 && (
                <div className="card-footer category-pagination-bar">
                  <span className="text-muted small">Trang {currentPage} / {totalPages}</span>
                  <div className="category-pagination">
                    <button
                      type="button"
                      className="page-arrow"
                      disabled={currentPage === 1}
                      onClick={() => handleChangePage("first")}
                    >
                      «
                    </button>
                    <button
                      type="button"
                      className="page-arrow"
                      disabled={currentPage === 1}
                      onClick={() => handleChangePage("prev")}
                    >
                      ‹
                    </button>
                    {paginationRange.map((item, idx) =>
                      typeof item === "string" && item.includes("ellipsis") ? (
                        <span key={`${item}-${idx}`} className="page-ellipsis">
                          …
                        </span>
                      ) : (
                        <button
                          key={`page-${item}`}
                          type="button"
                          className={`page-number ${currentPage === item ? "active" : ""}`}
                          onClick={() => handleChangePage(item)}
                        >
                          {item}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      className="page-arrow"
                      disabled={currentPage === totalPages}
                      onClick={() => handleChangePage("next")}
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="page-arrow"
                      disabled={currentPage === totalPages}
                      onClick={() => handleChangePage("last")}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

