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
  // initialValue can be a string (name) or object { name, description, isSystem }
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  
  // State quản lý checkbox System
  const [isSystemState, setIsSystemState] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialValue && typeof initialValue === "object") {
        setName(initialValue.name || "");
        setDescription(initialValue.description || "");
        // Nếu đang edit, lấy trạng thái cũ. Nếu tạo mới, mặc định là false
        setIsSystemState(initialValue.isSystem || false);
      } else {
        // Trường hợp initialValue là string (legacy) hoặc rỗng
        setName(typeof initialValue === "string" ? initialValue : "");
        setDescription("");
        setIsSystemState(false);
      }
      setError("");
    }
  }, [open, initialValue]);

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
        // Logic mới: Nếu là Admin thì lấy theo checkbox, User thường thì luôn là false
        isSystem: isAdmin ? isSystemState : false,
      });
  };

  if (!open) return null;

  const title =
    mode === "edit"
      ? `Sửa danh mục ${typeLabel}`
      : `Thêm danh mục ${typeLabel}`;

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="category-modal">
        <h5 className="category-modal__title mb-3">{title}</h5>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
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
            />
            {error && <div className="invalid-feedback">{error}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label">Mô tả (tùy chọn)</label>
            <textarea
              className="form-control"
              placeholder="Mô tả ngắn cho danh mục..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              rows={3}
            />
          </div>

          {/* Thay thế Alert bằng Checkbox */}
          {isAdmin && (
            <div className="mb-3 form-check">
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
                Đặt làm <strong>Danh mục hệ thống</strong> (hiển thị cho tất cả user)
              </label>
              
              {!isSystemState && (
                <div className="form-text text-muted small mt-1">
                  <i className="bi bi-person me-1"></i>
                  Danh mục này sẽ chỉ hiển thị cho riêng bạn.
                </div>
              )}
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "edit" ? "Lưu thay đổi" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}