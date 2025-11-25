import React, { useEffect, useState } from "react";
import Modal from "../common/Modal/Modal";

export default function CategoryFormModal({
  open,
  mode = "create", // "create" | "edit"
  initialValue = "",
  typeLabel = "chi phí",
  onSubmit,
  onClose,
  isAdmin,
}) {
  // initialValue: string (name) hoặc object { name, description, isSystem }
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // trạng thái "danh mục hệ thống"
  const [isSystemState, setIsSystemState] = useState(false);

  // Khi mở modal → fill form
  useEffect(() => {
    if (!open) return;

    if (initialValue && typeof initialValue === "object") {
      setName(initialValue.name || "");
      setDescription(initialValue.description || "");
      setIsSystemState(!!initialValue.isSystem);
    } else {
      setName(typeof initialValue === "string" ? initialValue : "");
      setDescription("");
      setIsSystemState(false);
    }
    setError("");
  }, [open, initialValue]);

  // submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = (name || "").trim();

    if (!trimmed) {
      setError("Vui lòng nhập tên danh mục");
      return;
    }
    if (trimmed.length > 40) {
      setError("Tên danh mục tối đa 40 ký tự");
      return;
    }

    onSubmit &&
      onSubmit({
        name: trimmed,
        description: (description || "").trim(),
        // Admin được phép bật/tắt, user thường luôn false
        isSystem: isAdmin ? isSystemState : false,
      });
  };

  if (!open) return null;

  const title =
    mode === "edit"
      ? `Sửa danh mục ${typeLabel}`
      : `Thêm danh mục ${typeLabel}`;

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <>
        {/* CSS riêng cho modal danh mục + làm mờ nền */}
        <style>{`
          @keyframes catModalFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* NỀN MỜ – dùng chung cho mọi Modal dùng Modal.jsx */
          .modal__backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
          }

          /* Hộp trắng bên trong */
          .modal__wrapper {
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 35px rgba(15, 23, 42, 0.28);
            animation: catModalFadeIn .18s ease-out;
          }

          .category-modal__icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 999px;
            background: rgba(45, 153, 174, 0.08);
            font-size: 1.1rem;
          }

          .category-modal .form-label {
            font-size: 0.9rem;
          }

          .category-modal .form-control {
            border-radius: 10px;
          }

          .category-modal .btn.btn-light {
            border-radius: 999px;
            padding-inline: 16px;
          }

          .category-modal .btn.btn-primary {
            border-radius: 999px;
            padding-inline: 18px;
          }
        `}</style>

        <div className="category-modal">
          {/* HEADER giống transaction modal */}
          <div
            className="modal-header border-0 pb-0"
            style={{ padding: "16px 22px 8px" }}
          >
            <div className="d-flex align-items-center gap-2">
              
              <div>
                <h5 className="modal-title fw-semibold mb-0">{title}</h5>
                <div className="text-muted small">
                  Danh mục giúp bạn phân loại thu chi rõ ràng hơn.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Đóng"
            />
          </div>

          <form onSubmit={handleSubmit}>
            {/* BODY */}
            <div className="modal-body" style={{ padding: "12px 22px 8px" }}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Tên danh mục <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  placeholder="Nhập tên danh mục..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={40}
                  autoFocus
                />
                {error && <div className="invalid-feedback">{error}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  className="form-control"
                  placeholder="Mô tả ngắn cho danh mục..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={120}
                  rows={3}
                />
                <div className="form-text text-muted small">
                  Bạn có thể ghi chú mục đích sử dụng của danh mục này.
                </div>
              </div>

              {/* Checkbox danh mục hệ thống – chỉ Admin thấy */}
              {isAdmin && (
                <>
                  <div className="mb-1 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isSystemCheck"
                      checked={isSystemState}
                      onChange={(e) => setIsSystemState(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label
                      className="form-check-label user-select-none"
                      htmlFor="isSystemCheck"
                      style={{ cursor: "pointer" }}
                    >
                      Đặt làm{" "}
                      <strong>Danh mục hệ thống</strong> (hiển thị cho tất cả
                      người dùng)
                    </label>
                  </div>

                  <div className="form-text text-muted small">
                    {isSystemState ? (
                      <>
                        <i className="bi bi-globe-asia-australia me-1" />
                        Danh mục sẽ xuất hiện trong phần{" "}
                        <strong>Mặc định</strong> và áp dụng cho mọi tài khoản.
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person me-1" />
                        Nếu không chọn, danh mục chỉ hiển thị cho riêng bạn.
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* FOOTER giống transaction modal */}
            <div
              className="modal-footer border-0 pt-0"
              style={{ padding: "8px 22px 16px" }}
            >
              <button
                type="button"
                className="btn btn-light"
                onClick={onClose}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                {mode === "edit" ? "Lưu thay đổi" : "Thêm mới"}
              </button>
            </div>
          </form>
        </div>
      </>
    </Modal>
  );
}
