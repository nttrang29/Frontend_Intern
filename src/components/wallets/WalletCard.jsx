// src/components/wallets/WalletCard.jsx
import React, { useEffect, useRef } from "react";
import { Dropdown } from "bootstrap";

export default function WalletCard({ wallet, onToggleOverall, onToggleSection }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current) {
      try { new Dropdown(btnRef.current); } catch {}
    }
  }, []);

  const fmtMoney = (n, c = "VND") =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: c,
      maximumFractionDigits: c === "VND" ? 0 : 2,
    }).format(Number(n || 0));

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

  const overallOn = wallet.includeOverall !== false;
  const sectionOn = wallet.isShared
    ? wallet.includeGroup !== false
    : wallet.includePersonal !== false;
  const sectionLabel = wallet.isShared ? "Tính vào Tổng nhóm" : "Tính vào Tổng cá nhân";

  const stop = (e) => e.stopPropagation();

  // Màu nền (phủ full thẻ)
  const bg = wallet.color
    ? `linear-gradient(145deg, ${wallet.color}, ${wallet.color}CC)`
    : `linear-gradient(145deg, #7bbac7, #7bbac7CC)`;

  return (
    <div
      className={`wallet-card card wc--flat ${wallet.isDefault ? "wallet-card--default" : ""}`}
      style={{
        // truyền màu qua CSS var để các rule bên dưới dùng
        "--wc-bg": bg,
        background: bg,               // nền full
        borderRadius: 16,
        border: "none",
        boxShadow: "0 6px 16px rgba(0,0,0,.25)",
        color: "#111",
      }}
    >
      <style>{`
        .wallet-card{ position:relative; overflow:visible; }

        /* KHÔNG set background nữa để không xóa màu inline */
        .wallet-card.wc--flat{
          border: none !important;
          border-radius: 16px;
          overflow: visible;
        }

        /* Phòng trường hợp CSS ngoài cùng lại set nền, ép dùng var */
        .wallet-grid__item .wallet-card{
          background: var(--wc-bg) !important;
        }

        .wallet-card .card-body{
          padding: 44px 16px 16px;
          background: transparent !important; /* để màu của thẻ lộ ra */
          color:#111;
        }

        /* Nút 3 chấm */
        .wallet-card .wc-dots{
          position:absolute; top:8px; right:10px; z-index:6000;
        }
        .wallet-card .wc-dots > .dropdown > .btn{
          width:32px; height:32px; border-radius:50%;
          background: rgba(255,255,255,.9) !important; color:#000; border:none;
          display:flex; align-items:center; justify-content:center;
          transition: transform .2s;
        }
        .wallet-card .wc-dots > .dropdown > .btn:hover{ transform:scale(1.08); }

        /* Menu */
        .wallet-card .wc-dots .dropdown-menu{
          position:absolute !important; top:calc(100% + 6px) !important; right:0 !important;
          transform:none !important; z-index:9999 !important;
          min-width:220px; background:#fff; border-radius:10px !important;
          border:1px solid rgba(0,0,0,.15); box-shadow:0 4px 20px rgba(0,0,0,.12);
          padding:0; overflow:hidden;
        }
        .wallet-card .dropdown-menu .form-check{
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding:10px 16px; margin:0; background:#fff; color:#111;
          font-weight:500; transition: background .2s;
        }
        .wallet-card .dropdown-menu .form-check + .form-check{
          border-top:1px solid rgba(0,0,0,.08);
        }
        .wallet-card .dropdown-menu .form-check:hover{ background:#f7f7f7; }

        /* Text trên nền màu */
        .wallet-card .wallet-name{ font-weight:700; color:#fff; }
        .wallet-card .badge{ background:rgba(0,0,0,.85) !important; border:none; font-size:.75rem; }
        .wallet-card .wc-row{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
        .wallet-card .wc-label{ color:#f1f1f1; font-size:.9rem; }
        .wallet-card .wc-value{ color:#fff; font-weight:600; }
        .wallet-card .wc-value.text-primary{ color:#fff !important; }

        /* Invert selection visual: by default cards keep their gradient (from --wc-bg)
           and the IS-SELECTED item becomes white with dark text (so click -> white)
        */
        .wallet-grid__item.is-selected .wallet-card{
          /* selected card: use darker gray for better visibility */
          background: #d1d5db !important;
          color: #111 !important;
          box-shadow: 0 6px 14px rgba(17,24,39,0.06) !important;
        }
        .wallet-grid__item.is-selected .wallet-card .wallet-name,
        .wallet-grid__item.is-selected .wallet-card .wc-label,
        .wallet-grid__item.is-selected .wallet-card .wc-value{
          color: #111 !important;
        }
        .wallet-grid__item.is-selected .wallet-card .badge{
          background: rgba(17,24,39,0.06) !important; color:#111 !important; border:none;
        }
        .wallet-grid__item.is-selected .wallet-card .wc-dots > .dropdown > .btn{
          background: rgba(17,24,39,0.06) !important; color:#111 !important;
        }

        /* Cho dropdown không bị cắt */
        .wallet-grid, .wallet-grid__item, .wallet-section, .wallet-section .card-body{ overflow:visible !important; }
      `}</style>

      {/* Nút 3 chấm */}
      <div className="wc-dots" onClick={stop} onMouseDown={stop}>
        <div className="dropdown">
          <button
            ref={btnRef}
            type="button"
            className="btn btn-sm"
            data-bs-toggle="dropdown"
            data-bs-display="static"
            data-bs-auto-close="outside"
            aria-expanded="false"
            onClick={stop}
          >
            <i className="bi bi-three-dots-vertical" />
          </button>

          <div className="dropdown-menu dropdown-menu-end" onClick={stop}>
            <div className="form-check form-switch">
              <input
                id={`overall-${wallet.id}`}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={overallOn}
                onChange={(e)=>onToggleOverall?.(wallet, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={`overall-${wallet.id}`}>
                Tính vào Tổng số dư
              </label>
            </div>

            <div className="form-check form-switch">
              <input
                id={`section-${wallet.id}`}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={sectionOn}
                onChange={(e)=>onToggleSection?.(wallet, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={`section-${wallet.id}`}>
                {sectionLabel}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung */}
      <div className="card-body" onClick={stop}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="wallet-name mb-0">
            {wallet.name}
            {wallet.isDefault && <span className="badge ms-2">Mặc định</span>}
          </h6>
        </div>

        <div className="wc-body">
          <div className="wc-row">
            <span className="wc-label">Số dư</span>
            <span className="wc-value text-primary">{fmtMoney(wallet.balance, wallet.currency)}</span>
          </div>
          <div className="wc-row mt-1">
            <span className="wc-label">Tạo ngày</span>
            <span className="wc-value">{fmtDate(wallet.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
