// src/components/wallets/WalletCreateChooser.jsx
import React, { useEffect, useRef } from "react";
import "../../styles/home/WalletCreateChooser.css";

export default function WalletCreateChooser({
  open,
  anchorRef,           // ref của nút "Tạo ví mới"
  onChoosePersonal,
  onChooseGroup,
  onClose,
}) {
  const menuRef = useRef(null);

  // Đóng khi click ra ngoài
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

  // Đóng khi nhấn ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="wallet-chooser-dropdown shadow-sm"
      role="menu"
      aria-labelledby="create-wallet-button"
    >
      <button className="dropdown-item" onClick={onChoosePersonal}>
        🧑‍💼 <span>Tạo ví cá nhân</span>
      </button>
      <button className="dropdown-item" onClick={onChooseGroup}>
        👥 <span>Tạo ví nhóm (ngân sách nhóm)</span>
      </button>
    </div>
  );
}
