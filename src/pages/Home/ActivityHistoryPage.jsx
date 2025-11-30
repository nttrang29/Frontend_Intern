import React, { useEffect, useState, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/pages/HomeLayout.css";
import "../../styles/components/wallets/WalletHeader.css";

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
  const [showRaw, setShowRaw] = useState(false);

  const loadEvents = useCallback(() => {
    try {
      // try several key variants for robustness
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
      // also leave a quick diagnostic in console
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
          <button className="wallet-header-btn" type="button" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? "Hide raw" : "Show raw"}
          </button>
        </div>
      </div>

      <div className="page__body">
        {events.length === 0 ? (
          <div className="empty-state">{t("activity.no_data")}</div>
        ) : (
          <div>
            <div style={{ marginBottom: 8, color: "var(--muted-color, #666)" }}>
              {events.length} {events.length === 1 ? "event" : "events"}
            </div>
            <div className="activity-list">
              {events.map((ev, idx) => (
                <div className="activity-row" key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div className="activity-row__left">
                    <div className="activity-type" style={{ fontWeight: 600 }}>{ev.type || ev.event}</div>
                    <div className="activity-desc">{ev.message || ev.desc || ev.description}</div>
                  </div>
                  <div className="activity-row__right" style={{ color: "var(--muted-color, #666)", minWidth: 160, textAlign: "right" }}>{formatTimestamp(ev.timestamp || ev.time || ev.createdAt)}</div>
                </div>
              ))}
            </div>
            {showRaw && (
              <pre style={{ marginTop: 12, maxHeight: 240, overflow: "auto", background: "#fafafa", padding: 10 }}>
                {JSON.stringify(events, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
