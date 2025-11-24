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
  // initialValue can be a string (name) or object { name, description }
  const [name, setName] = useState(
    initialValue && typeof initialValue === "object"
      ? initialValue.name
      : initialValue
  );
  const [description, setDescription] = useState(
    initialValue && typeof initialValue === "object"
      ? initialValue.description || ""
      : ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(
        initialValue && typeof initialValue === "object"
          ? initialValue.name || ""
          : initialValue || ""
      );
      setDescription(
        initialValue && typeof initialValue === "object"
          ? initialValue.description || ""
          : ""
      );
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
        isSystem: !!isAdmin,
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

          {isAdmin && (
            <div className="alert alert-info py-2 small mb-3">
              <i className="bi bi-info-circle me-1"></i>
              Danh mục này sẽ là <strong>Danh mục hệ thống</strong> (hiển thị
              cho tất cả user).
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
