// src/components/wallets/WalletCreateChooser.jsx
import React, { useEffect, useRef } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function WalletCreateChooser({
  open,
  anchorRef,
  onChoosePersonal,
  onChooseGroup,
  onClose,
}) {
  const menuRef = useRef(null);

  // ====== Đóng khi click ra ngoài ======
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!open) return;
      const inMenu = menuRef.current?.contains(e.target);
      const inAnchor = anchorRef?.current?.contains(e.target);
      if (!inMenu && !inAnchor) onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, anchorRef]);

  // ====== Đóng khi nhấn ESC ======
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* === CSS nội tuyến === */}
      <style>{`
        .wallet-chooser-dropdown {
          position: absolute;
          top: 110%;
          right: 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          padding: 6px;
          z-index: 1000;
          min-width: 230px;
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .wallet-chooser-dropdown .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          background: none;
          border: none;
          color: #111827;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.05s ease;
        }

        .wallet-chooser-dropdown .dropdown-item:hover {
          background: #f3f4f6;
        }

        .wallet-chooser-dropdown .dropdown-item:active {
          transform: scale(0.98);
        }

        .wallet-chooser-dropdown .dropdown-item i {
          width: 28px;
          height: 28px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
      `}</style>

      {/* === Dropdown === */}
      <div
        ref={menuRef}
        className="wallet-chooser-dropdown"
        role="menu"
        aria-labelledby="create-wallet-button"
      >
        <button className="dropdown-item" onClick={onChoosePersonal}>
          <i className="bi bi-person"></i>
          <span>Tạo ví cá nhân</span>
        </button>

        <button className="dropdown-item" onClick={onChooseGroup}>
          <i className="bi bi-people"></i>
          <span>Tạo ví nhóm (ngân sách nhóm)</span>
        </button>
      </div>
    </>
  );
}
