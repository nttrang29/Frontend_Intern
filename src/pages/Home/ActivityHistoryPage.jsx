import React, { useEffect, useState, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/pages/HomeLayout.css";
import "../../styles/components/wallets/WalletHeader.css";
import "../../styles/pages/CategoriesPage.css";
import { formatMoney } from "../../utils/formatMoney";

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (e) {
    return ts;
  }
}

export default function ActivityHistoryPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  
  const [queryText, setQueryText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadEvents = useCallback(() => {
    try {
      const keys = ["activity_log", "activityLog", "activity-log"];
      let raw = null;
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) {
          raw = v;
          break;
        }
      }
      const parsed = raw ? JSON.parse(raw) : [];
      setEvents(Array.isArray(parsed) ? parsed : []);
      // eslint-disable-next-line no-console
      console.debug("ActivityHistory: loaded", (parsed && parsed.length) || 0);
    } catch (e) {
      setEvents([]);
      // eslint-disable-next-line no-console
      console.error("ActivityHistory: failed to load activity_log", e);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const onUpdated = () => loadEvents();
    window.addEventListener("activity:updated", onUpdated);
    return () => window.removeEventListener("activity:updated", onUpdated);
  }, [loadEvents]);

  // Apply filters
  const filteredEvents = events.filter((ev) => {
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

  function normalizeEvent(ev) {
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
    } else if (rawType.includes("share") || rawType.includes("add_member") || rawType.includes("add user") || rawType.includes("thêm")) {
      typeLabel = "Thêm người dùng";
      let who = pick(data, ["email", "sharedTo", "invitee", "inviteeEmail"]) || ev.email || ev.sharedTo;
      if (!who) who = deepFindName(data) || "(email)";
      const role = pick(data, ["role", "sharedRole", "membershipRole"]) || ev.role || "";
      const parts = [
        "Thêm ",
        { text: who, highlight: true },
      ];
      if (role) {
        parts.push(" với vai trò ", { text: role, highlight: true });
      }
      if (actorDisplay) parts.push(actorDisplay);
      const built = createDescription(parts);
      description = built.text;
      descriptionSegments = built.segments;
    } else if (rawType.includes("remove_member") || (rawType.includes("remove") && (rawType.includes("user") || rawType.includes("member")))) {
      typeLabel = "Xóa người dùng";
      let who = pick(data, ["email", "removedEmail", "memberEmail"]) || ev.email || ev.removedEmail;
      if (!who) who = deepFindName(data) || "(email)";
      const built = createDescription([
        "Xóa ",
        { text: who, highlight: true },
        " khỏi ví",
        actorDisplay,
      ]);
      description = built.text;
      descriptionSegments = built.segments;
    } else if (rawType.includes("budget") && (rawType.includes("create") || rawType.includes("tao") || rawType.includes("tạo"))) {
      typeLabel = "Tạo ngân sách";
      let name = pick(data, ["name", "budgetName", "title"]) || ev.name;
      if (!name) name = deepFindName(data) || "(tên ngân sách)";
      const cat = pick(data, ["categoryName", "category", "category_name"]) || data.categoryName || ev.categoryName;
      const walletName = pick(data, ["walletName", "wallet", "wallet_name"]) || data.walletName || ev.walletName;
      const parts = [
        "Tạo ngân sách ",
        { text: name, highlight: true },
      ];
      if (cat) {
        parts.push(" (", { text: cat, highlight: true }, ")");
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
      if (!name) name = deepFindName(data) || "(tên ngân sách)";
      const built = createDescription([
        "Xóa ngân sách ",
        { text: name, highlight: true },
        actorDisplay,
      ]);
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
  }

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

                      <button className="btn-chip btn-chip--ghost" type="button" onClick={() => { setQueryText(""); setDateFrom(""); setDateTo(""); }}>
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
                      filteredEvents.map((ev, idx) => {
                        const n = normalizeEvent(ev);
                        const ts = formatTimestamp(n.timestamp || ev.timestamp || ev.time || ev.createdAt);
                        return (
                          <tr key={idx}>
                            <td className="text-muted">{idx + 1}</td>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

