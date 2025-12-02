import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function Toast({
  open,
  message,
  type = "success",
  duration = 2500,
  onClose,
  offset = { top: 20, right: 24 },
}) {
  const [pos, setPos] = useState({ top: offset.top, right: offset.right });
  const timerRef = useRef(null);

  // Auto close
  useEffect(() => {
    if (!open) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timerRef.current);
  }, [open, duration, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    setPos({ top: offset.top, right: offset.right });
  }, [open, offset.top, offset.right]);

  if (!open) return null;

  const isError = type === "error";
  const icon = isError ? "✕" : "✓";
  const iconClass = isError ? "toastx__icon--error" : "toastx__icon--success";
  const progressClass = isError ? "toastx__progress--error" : "toastx__progress--success";
  const toastClass = isError ? "toastx--error" : "toastx--success";

  return (
    <>
      <style>{css}</style>
      <div
        style={{
          position: "fixed",
          zIndex: 1100,
          top: pos.top,
          right: pos.right,
          pointerEvents: "none",
        }}
      >
        <div className={`toastx ${toastClass}`} role="status" aria-live={isError ? "assertive" : "polite"}>
          <span className={`toastx__icon ${iconClass}`}>{icon}</span>
          <span className="toastx__text">{message}</span>
          <span className={`toastx__progress ${progressClass}`} style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
    </>
  );
}

const css = `
.toastx{
  pointer-events:auto;
  display:flex; align-items:center; gap:12px;
  min-width: 280px; max-width: 420px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 8px 22px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.6) inset;
  backdrop-filter: saturate(160%) blur(6px);
  font-weight: 600;
  transform: translateY(-8px);
  opacity: 0;
  animation: toastx-in 260ms cubic-bezier(.22,.9,.32,1.2) forwards;
  position: relative; overflow: clip;
}
.toastx__icon{
  flex: 0 0 26px;
  width: 26px; height: 26px; border-radius: 50%;
  display:inline-flex; align-items:center; justify-content:center;
  font-size: 14px;
  font-weight: bold;
}
.toastx__icon--success{
  color: #1b8e5f; 
  background: rgba(27,142,95,.12);
  box-shadow: 0 0 0 3px rgba(27,142,95,.08) inset;
}
.toastx__icon--error{
  color: #dc2626; 
  background: rgba(220,38,38,.12);
  box-shadow: 0 0 0 3px rgba(220,38,38,.08) inset;
}
.toastx__text{ flex:1 1 auto; color:#0f172a; }
.toastx__progress{
  content:""; position:absolute; left:0; bottom:0; height:3px; width:100%;
  transform-origin: left; animation: toastx-progress linear forwards;
}
.toastx__progress--success{
  background: linear-gradient(90deg, #22c55e, #16a34a, #22c55e);
}
.toastx__progress--error{
  background: linear-gradient(90deg, #ef4444, #dc2626, #ef4444);
}
@keyframes toastx-in{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
@keyframes toastx-progress{ from{transform:scaleX(1)} to{transform:scaleX(0)} }
.toastx:hover{ transform: translateY(-2px); transition: transform .18s ease; }
`;

