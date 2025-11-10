import React, { useEffect, useRef } from "react";
import { Dropdown } from "bootstrap";

export default function WalletGroupCard({ group, onView, onEdit, onDelete }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current) {
      try { new Dropdown(btnRef.current); } catch {}
    }
  }, []);

  const hideDropdown = () => {
    try {
      const inst = Dropdown.getOrCreateInstance(btnRef.current);
      inst?.hide();
    } catch {}
  };

  return (
    <div className="col-md-6 col-lg-4">
      <div className={`wallet-card card border-0 shadow-sm ${group.isDefault ? "wallet-card--default" : ""}`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="fw-bold mb-0">
              {group.name}{" "}
              {group.isDefault && <span className="badge bg-primary ms-2">Mặc định</span>}
            </h5>

            <div className="dropdown">
              <button
                ref={btnRef}
                type="button"
                className="btn btn-sm btn-light"
                data-bs-toggle="dropdown"
                data-bs-auto-close="outside"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <i className="bi bi-three-dots" />
              </button>

              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => { hideDropdown(); onView?.(group); }}
                  >
                    <i className="bi bi-eye me-2" /> Xem chi tiết
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => { hideDropdown(); onEdit?.(group); }}
                  >
                    <i className="bi bi-pencil-square me-2" /> Sửa
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={() => { hideDropdown(); onDelete?.(group); }}
                  >
                    <i className="bi bi-trash me-2" /> Xóa
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <p className="small text-muted mb-1">{group.description}</p>
          <p className="text-secondary small mb-0">
            Gồm: {group.wallets?.length ? group.wallets.join(", ") : "Chưa có ví nào"}
          </p>
          <div className="small text-muted mt-2">
            Tạo ngày: {new Date(group.createdAt).toLocaleDateString("vi-VN")}
          </div>
        </div>
      </div>
    </div>
  );
}
