// src/components/common/Modal/ConfirmModal.jsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({
  open,
  title,
  message,
  okText = "Xác nhận",
  cancelText = "Hủy",
  onOk,
  onClose,
  danger = true,
}) {
  // ✅ Hook luôn được gọi — không nằm trong if
  useEffect(() => {
    if (!open) return; // chỉ chạy khi mở
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        .cm-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(4px);
          display: grid; place-items: center;
          z-index: 2200;
          animation: cmFade .12s ease-out;
        }
        @keyframes cmFade { from { opacity: 0 } to { opacity: 1 } }

        .cm-box {
          background: #fff; color: #111827;
          min-width: 340px; max-width: 92vw;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,.25);
          padding: 18px 20px;
          animation: cmPop .12s ease-out;
        }
        @keyframes cmPop {
          from { transform: scale(.98); opacity: .95; }
          to   { transform: scale(1); opacity: 1; }
        }

        .cm-title { margin: 0 0 6px; font-size: 1.05rem; font-weight: 700; }
        .cm-msg   { margin: 0 0 16px; font-size: .95rem; color: #374151; }

        .cm-actions { display: flex; gap: 10px; justify-content: flex-end; }

        .cm-btn {
          border-radius: 999px; padding: 8px 14px;
          font-weight: 600; cursor: pointer;
          transition: background .15s ease, box-shadow .15s ease, transform .02s;
          border: 1px solid transparent;
        }
        .cm-btn:active { transform: translateY(1px); }

        .cm-btn-cancel {
          background: #f3f4f6; color: #111827; border-color: #d1d5db;
        }
        .cm-btn-cancel:hover { background: #e5e7eb; }

        .cm-btn-ok {
          background: ${danger ? "#dc2626" : "#2563eb"};
          color: #fff;
        }
        .cm-btn-ok:hover {
          background: ${danger ? "#b91c1c" : "#1d4ed8"};
          box-shadow: 0 4px 14px rgba(0,0,0,.12);
        }
      `}</style>

      <div className="cm-backdrop" onClick={onClose}>
        <div
          className="cm-box"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h5 className="cm-title">{title}</h5>
          <p className="cm-msg">{message}</p>

          <div className="cm-actions">
            <button className="cm-btn cm-btn-cancel" onClick={onClose}>
              {cancelText}
            </button>
            <button className="cm-btn cm-btn-ok" onClick={onOk}>
              {okText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
