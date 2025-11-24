import React from "react";
import "./SuccessModal.css";

const Modal = ({ open, onClose, width = 480, children }) => {
  if (!open) return null;

  const resolvedWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div className="modal__backdrop" onClick={onClose}>
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
};

export default Modal;
