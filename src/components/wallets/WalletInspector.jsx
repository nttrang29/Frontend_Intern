// src/components/wallets/WalletInspector.jsx
import React, { useMemo, useState } from "react";

/**
 * WalletInspector
 * Props:
 *  - wallet, wallets
 *  - masked, formatMoney, maskMoney
 *  - onEdit, onDelete, onWithdraw, onMerge, onConvert
 */
export default function WalletInspector({
  wallet,
  wallets = [],
  masked,
  formatMoney,
  maskMoney,
  onEdit,
  onDelete,
  onWithdraw,
  onMerge,
  onConvert,
}) {
  // ---- Hooks: luôn khai báo ở đầu, không conditional ----
  const [tab, setTab] = useState("details"); // details | withdraw | merge | convert
  const [wAmount, setWAmount] = useState(""); // withdraw
  const [mergeMode, setMergeMode] = useState("this_to_other"); // merge
  const [otherId, setOtherId] = useState(""); // merge

  const walletId = wallet?.id ?? null;
  const walletCurrency = wallet?.currency ?? "VND";

  // Danh sách ví có thể gộp (an toàn khi wallet null)
  const otherCandidates = useMemo(() => {
    if (!walletId) return [];
    return (wallets || []).filter(
      (w) =>
        w &&
        String(w.id) !== String(walletId) &&
        (w.currency || "VND") === walletCurrency
    );
  }, [walletId, walletCurrency, wallets]);

  const otherWallet = useMemo(
    () => otherCandidates.find((x) => String(x.id) === String(otherId)) || null,
    [otherId, otherCandidates]
  );

  const canWithdraw =
    !!wallet &&
    Number(wAmount) > 0 &&
    Number(wAmount) <= Number(wallet.balance || 0);

  // ---- UI ----
  return (
    <div className="inspector card border-0 shadow-sm">
      {/* Menubar */}
      <div className="inspector__tabs">
        <button
          className={`itab ${tab === "details" ? "active" : ""}`}
          onClick={() => setTab("details")}
        >
          <i className="bi bi-card-text me-1" /> Chi tiết ví
        </button>
        <button
          className={`itab ${tab === "withdraw" ? "active" : ""}`}
          onClick={() => setTab("withdraw")}
          disabled={!wallet}
        >
          <i className="bi bi-wallet2 me-1" /> Rút ví
        </button>
        <button
          className={`itab ${tab === "merge" ? "active" : ""}`}
          onClick={() => setTab("merge")}
          disabled={!wallet}
        >
          <i className="bi bi-intersect me-1" /> Gộp ví
        </button>
        <button
          className={`itab ${tab === "convert" ? "active" : ""}`}
          onClick={() => setTab("convert")}
          disabled={!wallet}
        >
          <i className="bi bi-arrow-left-right me-1" /> Chuyển đổi ví
        </button>
      </div>

      <div className="card-body">
        {/* Không có ví được chọn */}
        {!wallet && (
          <>
            <h6 className="mb-2">Chưa có ví được chọn</h6>
            <p className="text-muted mb-0">
              Nhấp vào một ví ở bên trái để xem nhanh thông tin.
            </p>
          </>
        )}

        {/* Chi tiết ví */}
        {wallet && tab === "details" && (
          <>
            <div className="inspector__hero mb-3 d-flex align-items-start justify-content-between gap-2">
              <div>
                <div className="inspector__title">{wallet.name}</div>
                <div className="inspector__desc">
                  Quản lý giao dịch và số dư của ví này.
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-light sort-dir-btn"
                  title="Chỉnh sửa"
                  onClick={() => onEdit?.(wallet)}
                >
                  <i className="bi bi-pencil" />
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  title="Xóa ví"
                  onClick={() => onDelete?.(wallet)}
                >
                  <i className="bi bi-trash3" />
                </button>
              </div>
            </div>

            <div className="info-row">
              <div className="label">Số dư</div>
              <div className="value">
                {maskMoney(wallet.balance, wallet.currency, masked)}
              </div>
            </div>
            <div className="info-row">
              <div className="label">Đã sử dụng</div>
              <div className="value">
                {maskMoney(Number(wallet.spent || 0), wallet.currency, masked)}
              </div>
            </div>
            <div className="info-row">
              <div className="label">Còn lại</div>
              <div className="value">
                {maskMoney(
                  Number(wallet.balance || 0) - Number(wallet.spent || 0),
                  wallet.currency,
                  masked
                )}
              </div>
            </div>
            <div className="info-row">
              <div className="label">Ghi chú</div>
              <div className="value">{wallet.note || "-"}</div>
            </div>
            <div className="info-row">
              <div className="label">Ngày tạo</div>
              <div className="value">
                {wallet.createdAt
                  ? new Date(wallet.createdAt).toLocaleString("vi-VN")
                  : "-"}
              </div>
            </div>
          </>
        )}

        {/* Rút ví */}
        {wallet && tab === "withdraw" && (
          <>
            <div className="mb-3">
              <label className="form-label">Số tiền rút</label>
              <input
                type="number"
                className="form-control"
                min={0}
                value={wAmount}
                onChange={(e) => setWAmount(e.target.value)}
                placeholder="Nhập số tiền cần rút"
              />
              <div className="form-text">
                Số dư hiện tại:{" "}
                <strong>
                  {formatMoney(wallet.balance, wallet.currency || "VND")}
                </strong>
              </div>
            </div>

            <button
              disabled={!canWithdraw}
              className="btn btn-primary"
              onClick={() => {
                if (!canWithdraw) return;
                onWithdraw?.(wallet, Number(wAmount));
                setWAmount("");
              }}
            >
              <i className="bi bi-check2-circle me-1" />
              Xác nhận rút
            </button>
          </>
        )}

        {/* Gộp ví */}
        {wallet && tab === "merge" && (
          <>
            <div className="mb-3">
              <label className="form-label">Chế độ gộp</label>
              <select
                className="form-select"
                value={mergeMode}
                onChange={(e) => setMergeMode(e.target.value)}
              >
                <option value="this_to_other">
                  Gộp <strong>ví này</strong> vào ví khác
                </option>
                <option value="other_to_this">
                  Gộp <strong>ví khác</strong> vào ví này
                </option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                {mergeMode === "this_to_other"
                  ? "Chọn ví đích"
                  : "Chọn ví nguồn"}
              </label>
              <select
                className="form-select"
                value={otherId}
                onChange={(e) => setOtherId(e.target.value)}
              >
                <option value="">-- Chọn ví --</option>
                {otherCandidates.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </option>
                ))}
              </select>
              <div className="form-text">
                Chỉ hiển thị các ví cùng loại tiền tệ để tránh lệch số dư.
              </div>
            </div>

            <button
              disabled={!otherWallet}
              className="btn btn-warning"
              onClick={() =>
                onMerge?.({
                  mode: mergeMode,
                  baseWallet: wallet,
                  otherWallet,
                })
              }
            >
              <i className="bi bi-intersect me-1" />
              Xác nhận gộp
            </button>
          </>
        )}

        {/* Chuyển đổi ví */}
        {wallet && tab === "convert" && (
          <>
            <div className="mb-3">
              Trạng thái hiện tại:{" "}
              <strong>{wallet.isShared ? "Ví nhóm" : "Ví cá nhân"}</strong>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onConvert?.(wallet, !wallet.isShared)}
            >
              <i className="bi bi-arrow-left-right me-1" />
              Chuyển sang {!wallet.isShared ? "Ví nhóm" : "Ví cá nhân"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}