// src/components/wallets/WalletCard.jsx
import React, { useEffect, useRef } from "react";
import { Dropdown } from "bootstrap";

/**
 * Props:
 * - wallet: { id, name, balance, currency, createdAt, isDefault, isShared,
 *             includeOverall?, includePersonal?, includeGroup? }
 * - onToggleOverall(wallet, nextOn)
 * - onToggleSection(wallet, nextOn)  // personal -> includePersonal, group -> includeGroup
 */
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

  // switch values (default = true)
  const overallOn = wallet.includeOverall !== false;
  const sectionOn = wallet.isShared
    ? wallet.includeGroup !== false
    : wallet.includePersonal !== false;
  const sectionLabel = wallet.isShared ? "Tính vào Tổng nhóm" : "Tính vào Tổng cá nhân";

  const stop = (e) => e.stopPropagation();

  return (
    <div className={`wallet-card card wc--flat ${wallet.isDefault ? "wallet-card--default" : ""}`}>
      {/* ================= Scoped CSS ================= */}
      <style>{`
        /* Card làm mốc định vị */
        .wallet-card { position: relative; }
        .wallet-card.wc--flat{
          border: 1.5px solid #000 !important;
          border-radius: 16px;
          background:#fff;
          box-shadow:none !important;
          overflow: visible; /* cho dropdown tràn */
        }

        /* Nút 3 chấm dính góc phải trên của card (KHÔNG phụ thuộc body) */
        .wallet-card .wc-dots{
          position: absolute !important;
          top: 8px !important;
          right: 10px !important;
          z-index: 6000;
          margin: 0; padding: 0;
        }
        .wallet-card .wc-dots > .dropdown > .btn{
          width: 32px; height: 32px; padding: 0;
          border-radius: 50%;
          border: 1px solid #000 !important;
          background:#fff !important; color:#000;
          display:flex; align-items:center; justify-content:center;
          transition: transform .2s;
        }
        .wallet-card .wc-dots > .dropdown > .btn:hover{ transform: scale(1.06); }

        /* ======= MENU DROPDOWN ======= */
.wallet-card .wc-dots .dropdown-menu {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  right: 0 !important;
  left: auto !important;
  transform: none !important;
  z-index: 9999 !important;

  min-width: 220px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.6) !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 0;
  overflow: hidden;
}

/* Mỗi dòng công tắc */
.wallet-card .dropdown-menu .form-check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  margin: 0;
  background: #fff;
  color: #111;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

/* Gạch ngang giữa hai dòng */
.wallet-card .dropdown-menu .form-check + .form-check {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

/* Hover hiện xám nhẹ */
.wallet-card .dropdown-menu .form-check:hover {
  background: #f7f7f7;
}

/* Switch gọn hơn */
.wallet-card .dropdown-menu .form-check-input {
  transform: scale(1);
  cursor: pointer;
}

/* Nhãn chữ trái */
.wallet-card .dropdown-menu .form-check-label {
  flex: 1;
  text-align: left;
  user-select: none;
}


        /* Nâng card khi menu mở để không bị các card khác che */
        .wallet-card:has(.dropdown-menu.show),
        .wallet-card:has(.dropdown-toggle.show){ z-index: 7000; }

        /* Items */
        .wallet-card .dropdown-menu .form-check{
          display:flex; align-items:center; justify-content:space-between;
          gap: 12px;
          padding: 12px 16px; margin: 0;
          font-weight: 400; color:#111; background:#fff;
          transition: background .15s;
        }
        .wallet-card .dropdown-menu .form-check + .form-check{
          border-top: 1px solid rgba(0,0,0,.1);
        }
        .wallet-card .dropdown-menu .form-check:hover{ background:#f6f6f6; }
        .wallet-card .dropdown-menu .form-check-input{ cursor:pointer; }
        .wallet-card .dropdown-menu .form-check-label{
          cursor:pointer; user-select:none; flex:1; text-align:left;
        }

        /* Nội dung card */
        .wallet-card .card-body{ padding: 44px 16px 16px; } /* +top để tránh nút đè chữ */
        .wallet-card .wallet-name{ font-weight:700; color:#111; }
        .wallet-card .badge{
          border:1px solid #000; background:#000 !important; color:#fff;
        }
        .wallet-card .wc-body .wc-row{
          display:flex; align-items:baseline; justify-content:space-between; gap:12px;
        }
        .wallet-card .wc-label{ color:#6b7280; font-size:.9rem; }
        .wallet-card .wc-value{ color:#111; font-weight:600; }
        .wallet-card .wc-value.text-primary{ color:#0b3d91 !important; }

        /* Bảo đảm cha không cắt menu */
        .wallet-grid, .wallet-grid__item,
        .wallet-section, .wallet-section .card-body{ overflow: visible !important; }
      `}</style>

      {/* ========= Nút 3 chấm (đặt ngoài body để định vị tuyệt đối theo card) ========= */}
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
            aria-haspopup="true"
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
                onChange={(e) => onToggleOverall?.(wallet, e.target.checked)}
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
                onChange={(e) => onToggleSection?.(wallet, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={`section-${wallet.id}`}>
                {sectionLabel}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="card-body" onClick={stop /* tránh click body làm đóng menu khi thao tác */}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="wallet-name mb-0">
            {wallet.name}
            {wallet.isDefault && <span className="badge ms-2">Mặc định</span>}
          </h6>
        </div>

        <div className="wc-body">
          <div className="wc-row">
            <span className="wc-label">Số dư</span>
            <span className="wc-value text-primary">
              {fmtMoney(wallet.balance, wallet.currency)}
            </span>
          </div>

          <div className="wc-row mt-1">
            <span className="wc-label">Tạo ngày</span>
            <span className="wc-value" style={{ fontWeight: 600 }}>
              {fmtDate(wallet.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
