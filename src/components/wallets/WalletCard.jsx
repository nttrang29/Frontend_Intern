import React, { useEffect, useRef } from "react";
import { Dropdown } from "bootstrap";

export default function WalletCard({ wallet, onView, onEdit, onDelete }) {
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

  // Định dạng tiền và ngày
  const fmtMoney = (n, c = "VND") =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const fmtDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div
      className={`wallet-card card border-0 shadow-sm ${
        wallet.isDefault ? "wallet-card--default" : ""
      }`}
    >
      <div className="card-body">

        {/* ==== Header ==== */}
        <div className="wc-head d-flex justify-content-between align-items-center mb-2">
          <h6 className="wallet-name fw-bold mb-0">
            {wallet.name}
            {wallet.isDefault && (
              <span className="badge bg-primary ms-2">Mặc định</span>
            )}
          </h6>

          <div className="dropdown">
            <button
              ref={btnRef}
              type="button"
              className="btn btn-sm btn-light"
              data-bs-toggle="dropdown" 
              data-bs-auto-close="outside"
              data-bs-offset="0,10"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <i className="bi bi-three-dots-vertical"></i>
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow-lg wallet-dd">
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { hideDropdown(); onView?.(wallet); }}
                >
                  <i className="bi bi-eye me-2" /> Xem chi tiết
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { hideDropdown(); onEdit?.(wallet); }}
                >
                  <i className="bi bi-pencil-square me-2" /> Sửa
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => { hideDropdown(); onDelete?.(wallet); }}
                >
                  <i className="bi bi-trash me-2" /> Xóa
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* ==== Body: chỉ số dư + ngày tạo ==== */}
        <div className="wc-body">
          <div className="wc-row">
            <span className="wc-label text-muted">Số dư</span>
            <span className="wc-value text-primary fw-semibold">
              {fmtMoney(wallet.balance, wallet.currency)}
            </span>
          </div>

          <div className="wc-row mt-1">
            <span className="wc-label text-muted">Tạo ngày</span>
            <span className="wc-value text-muted">
              {fmtDate(wallet.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
