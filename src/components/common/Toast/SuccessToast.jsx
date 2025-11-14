import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function SuccessToast({
  open,
  message,
  duration = 2500,
  onClose,
  // Topbar: đổi selector nếu topbar của bạn khác class
  topbarSelector = ".home__topbar, .home-topbar, header.home__topbar",
  // Khu vực nội dung để canh mép phải
  anchorSelector = ".home__main, main.home__main",
  offset = { top: 10, right: 16 },
}) {
  const [pos, setPos] = useState({ top: 0, right: 16 });
  const timerRef = useRef(null);

  // Auto close
  useEffect(() => {
    if (!open) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timerRef.current);
  }, [open, duration, onClose]);

  // TÍNH VỊ TRÍ: top = bottom của TOPBAR + offset.top
  // right = khoảng trống từ mép phải viewport tới mép phải .home__main + offset.right
  useLayoutEffect(() => {
    if (!open) return;

    const calc = () => {
      const topbar = document.querySelector(topbarSelector);
      const anchor = document.querySelector(anchorSelector) || document.body;

      const topbarRect = topbar?.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();

      const top = (topbarRect ? topbarRect.bottom : 0) + offset.top;
      const right =
        Math.max(window.innerWidth - (anchorRect.left + anchorRect.width), 0) +
        offset.right;

      setPos({ top, right });
    };

    calc();
    const ro = new ResizeObserver(calc);
    topbarSelector && document.querySelectorAll(topbarSelector).forEach(el => ro.observe(el));
    const onScroll = () => calc();
    const onResize = () => calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const mo = new MutationObserver(calc);
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["class", "style"] });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
    };
  }, [open, topbarSelector, anchorSelector, offset.top, offset.right]);

  if (!open) return null;

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
        <div className="toastx" role="status" aria-live="polite">
          <span className="toastx__icon">✓</span>
          <span className="toastx__text">{message}</span>
          <span className="toastx__progress" style={{ animationDuration: `${duration}ms` }} />
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
  color: #1b8e5f; background: rgba(27,142,95,.12);
  box-shadow: 0 0 0 3px rgba(27,142,95,.08) inset;
}
.toastx__text{ flex:1 1 auto; color:#0f172a; }
.toastx__progress{
  content:""; position:absolute; left:0; bottom:0; height:3px; width:100%;
  background: linear-gradient(90deg, #22c55e, #16a34a, #22c55e);
  transform-origin: left; animation: toastx-progress linear forwards;
}
@keyframes toastx-in{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
@keyframes toastx-progress{ from{transform:scaleX(1)} to{transform:scaleX(0)} }
.toastx:hover{ transform: translateY(-2px); transition: transform .18s ease; }
`;