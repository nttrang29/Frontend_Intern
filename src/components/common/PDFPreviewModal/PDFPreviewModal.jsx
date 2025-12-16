import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./PDFPreviewModal.css";

export default function PDFPreviewModal({ open, pdfBlob, fileName, onConfirm, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !pdfBlob) {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    // Tạo URL từ blob để hiển thị trong iframe
    const url = window.URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
    setLoading(false);

    // Cleanup khi đóng modal
    return () => {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    };
  }, [open, pdfBlob]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !pdfBlob) return null;

  const handleConfirm = () => {
    if (onConfirm && pdfBlob) {
      onConfirm(pdfBlob, fileName);
    }
    onClose?.();
  };

  return createPortal(
    <>
      <style>{`
        .pdf-preview-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2500;
          animation: pdfFadeIn 0.15s ease-out;
        }
        @keyframes pdfFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pdf-preview-modal {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 90vw;
          max-width: 1200px;
          height: 90vh;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          animation: pdfSlideIn 0.2s ease-out;
        }
        @keyframes pdfSlideIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .pdf-preview-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
          border-radius: 12px 12px 0 0;
        }

        .pdf-preview-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .pdf-preview-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }

        .pdf-preview-close:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .pdf-preview-body {
          flex: 1;
          overflow: hidden;
          position: relative;
          background: #f3f4f6;
        }

        .pdf-preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #ffffff;
        }

        .pdf-preview-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          color: #6b7280;
          font-size: 1rem;
        }

        .pdf-preview-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          background: #ffffff;
          border-radius: 0 0 12px 12px;
        }

        .pdf-preview-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pdf-preview-btn-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .pdf-preview-btn-cancel:hover {
          background: #e5e7eb;
        }

        .pdf-preview-btn-confirm {
          background: #2d99ae;
          color: #ffffff;
        }

        .pdf-preview-btn-confirm:hover {
          background: #238a9e;
        }

        .pdf-preview-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="pdf-preview-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="pdf-preview-header">
            <h3 className="pdf-preview-title">Xem trước PDF</h3>
            <button
              className="pdf-preview-close"
              onClick={onClose}
              aria-label="Đóng"
              type="button"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Body - PDF Preview */}
          <div className="pdf-preview-body">
            {loading && (
              <div className="pdf-preview-loading">
                <i className="bi bi-hourglass-split" style={{ marginRight: "8px" }}></i>
                Đang tải PDF...
              </div>
            )}
            {pdfUrl && (
              <iframe
                className="pdf-preview-iframe"
                src={pdfUrl}
                title="PDF Preview"
                onLoad={() => setLoading(false)}
              />
            )}
          </div>

          {/* Footer - Actions */}
          <div className="pdf-preview-footer">
            <button
              className="pdf-preview-btn pdf-preview-btn-cancel"
              onClick={onClose}
              type="button"
            >
              <i className="bi bi-x-circle"></i>
              Hủy
            </button>
            <button
              className="pdf-preview-btn pdf-preview-btn-confirm"
              onClick={handleConfirm}
              type="button"
            >
              <i className="bi bi-download"></i>
              Xác nhận và Tải xuống
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

