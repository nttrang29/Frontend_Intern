// src/components/common/Modal/Modal.jsx
import React from "react";
import { createPortal } from "react-dom";
import "./SuccessModal.css"; // đang dùng cho modal__backdrop / modal__wrapper

const Modal = ({ open, onClose, width = 480, children }) => {
  if (!open) return null;

  const resolvedWidth = typeof width === "number" ? `${width}px` : width;

  const content = (
    <div
      className="modal__backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal__wrapper"
        style={{
          width: resolvedWidth,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // 🔥 Quan trọng: render thẳng ra document.body
  return createPortal(content, document.body);
};

export default Modal;
