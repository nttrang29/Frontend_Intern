import React from "react";

export default function CategoryRow({ category, onEdit, onDelete }) {
  const initial = category.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="category-row">
      <div className="category-row__left">
        <div className="category-row__icon">
          <span>{initial}</span>
        </div>
        <div className="category-row__name">{category.name}</div>
      </div>

      <div className="category-row__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onEdit}
          title="Sửa danh mục"
        >
          <i className="bi bi-pencil-square" />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          title="Xóa danh mục"
        >
          <i className="bi bi-trash" />
        </button>
      </div>
    </div>
  );
}