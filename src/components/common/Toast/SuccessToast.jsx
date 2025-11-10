import React, { useEffect } from "react";

export default function SuccessToast({ open, message, duration = 2500, onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div style={wrap}>
      <div style={toastBox} role="status" aria-live="polite">
        <span style={icon}>✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

const wrap = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 1100,
};
const toastBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,.15)",
  padding: "10px 14px",
  minWidth: 240,
  fontWeight: 500,
};
const icon = {
  display: "inline-flex",
  width: 22,
  height: 22,
  borderRadius: "50%",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(25,135,84,.12)",
  color: "#198754",
  fontSize: 14,
};
