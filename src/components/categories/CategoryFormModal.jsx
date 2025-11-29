import React, { useEffect, useState } from "react";
import Modal from "../common/Modal/Modal";

// Danh sách 40 icon đẹp cho category
const CATEGORY_ICONS = [
  "bi-cash-coin", "bi-wallet2", "bi-credit-card", "bi-piggy-bank",
  "bi-graph-up-arrow", "bi-graph-down-arrow", "bi-cart", "bi-bag",
  "bi-cup-hot", "bi-egg-fried", "bi-basket", "bi-shop",
  "bi-house", "bi-building", "bi-car-front", "bi-bus-front",
  "bi-airplane", "bi-train-front", "bi-bicycle", "bi-fuel-pump",
  "bi-hospital", "bi-heart-pulse", "bi-capsule", "bi-clipboard-pulse",
  "bi-book", "bi-mortarboard", "bi-laptop", "bi-phone",
  "bi-tv", "bi-camera", "bi-headphones", "bi-controller",
  "bi-gift", "bi-balloon", "bi-flower1", "bi-tree",
  "bi-droplet", "bi-lightning", "bi-wifi", "bi-gear",
  "bi-star", "bi-heart", "bi-trophy", "bi-award"
];

export default function CategoryFormModal({
  open,
  mode = "create", // "create" | "edit"
  initialValue = "",
  typeLabel = "chi phí",
  onSubmit,
  onClose,
  isAdmin,
  activeTab = "expense", // "expense" | "income" | "system"
  selectedType, // "expense" | "income" - chỉ dùng khi activeTab === "system"
  onTypeChange, // callback khi chọn type ở tab system
}) {
  // initialValue: string (name) hoặc object { name, description, isSystem, icon }
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("bi-tags");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [error, setError] = useState("");

  // trạng thái "danh mục hệ thống"
  const [isSystemState, setIsSystemState] = useState(false);
  
  // Khi ở tab system, luôn set isSystem = true
  const isSystemTab = activeTab === "system";

  // Khi mở modal → fill form
  useEffect(() => {
    if (!open) return;

    if (initialValue && typeof initialValue === "object") {
      setName(initialValue.name || "");
      setDescription(initialValue.description || "");
      setSelectedIcon(initialValue.icon || "bi-tags");
      setIsSystemState(isSystemTab || !!initialValue.isSystem);
    } else {
      setName(typeof initialValue === "string" ? initialValue : "");
      setDescription("");
      setSelectedIcon("bi-tags");
      setIsSystemState(isSystemTab);
    }
    setShowIconPicker(false);
    setError("");
  }, [open, initialValue, isSystemTab]);

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

    // Nếu ở tab system, luôn set isSystem = true
    const finalIsSystem = isSystemTab ? true : (isAdmin ? isSystemState : false);
    
    onSubmit &&
      onSubmit({
        name: trimmed,
        description: (description || "").trim(),
        icon: selectedIcon,
        isSystem: finalIsSystem,
        // Thêm transactionType nếu ở tab system
        transactionType: isSystemTab && selectedType ? selectedType : null,
      });
  };

  if (!open) return null;

  const title = isSystemTab
    ? mode === "edit"
      ? `Sửa danh mục hệ thống`
      : `Thêm danh mục hệ thống`
    : mode === "edit"
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

          /* NỀN MỜ – giống modal Thêm hạn mức */
          .modal__backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
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

          .category-icon-picker {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 8px;
            max-height: 280px;
            overflow-y: auto;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #f9fafb;
          }

          .category-icon-item {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 2px solid transparent;
            background: #ffffff;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 1.2rem;
            color: #2d99ae;
          }

          .category-icon-item:hover {
            border-color: #2d99ae;
            background: rgba(45, 153, 174, 0.1);
            transform: scale(1.1);
          }

          .category-icon-item.selected {
            border-color: #2d99ae;
            background: rgba(45, 153, 174, 0.15);
            box-shadow: 0 2px 8px rgba(45, 153, 174, 0.2);
          }

          .category-icon-preview {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(45, 153, 174, 0.1);
            font-size: 1.5rem;
            color: #2d99ae;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .category-icon-preview:hover {
            background: rgba(45, 153, 174, 0.2);
            transform: scale(1.05);
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
              {/* Icon Picker */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Icon <span className="text-muted small">(tùy chọn)</span>
                </label>
                <div className="d-flex align-items-center gap-3">
                  <div 
                    className="category-icon-preview"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    title="Chọn icon"
                  >
                    <i className={`bi ${selectedIcon}`} />
                  </div>
                  <div className="flex-grow-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                      {showIconPicker ? "Ẩn icon" : "Chọn icon"}
                    </button>
                  </div>
                </div>
                {showIconPicker && (
                  <div className="mt-2">
                    <div className="category-icon-picker">
                      {CATEGORY_ICONS.map((icon) => (
                        <div
                          key={icon}
                          className={`category-icon-item ${
                            selectedIcon === icon ? "selected" : ""
                          }`}
                          onClick={() => {
                            setSelectedIcon(icon);
                            setShowIconPicker(false);
                          }}
                          title={icon.replace("bi-", "")}
                        >
                          <i className={`bi ${icon}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chọn loại danh mục khi ở tab system */}
              {isSystemTab && mode === "create" && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Loại danh mục <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={selectedType || "expense"}
                    onChange={(e) => onTypeChange && onTypeChange(e.target.value)}
                    required
                  >
                    <option value="expense">Chi phí</option>
                    <option value="income">Thu nhập</option>
                  </select>
                  <div className="form-text text-muted small">
                    Chọn loại danh mục bạn muốn tạo.
                  </div>
                </div>
              )}

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

              {/* Checkbox danh mục hệ thống – chỉ Admin thấy, không ở tab system, và chỉ khi tạo mới */}
              {isAdmin && !isSystemTab && mode === "create" && (
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
