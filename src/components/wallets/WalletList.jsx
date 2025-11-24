import React from "react";

const formatWalletBalance = (amount = 0, currency = "VND") => {
  const numAmount = Number(amount) || 0;
  if (currency === "USD") {
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      const formatted = numAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      });
      return `$${formatted}`;
    }
    const formatted =
      numAmount % 1 === 0
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
          });
    return `$${formatted}`;
  }
  if (currency === "VND") {
    return `${numAmount.toLocaleString("vi-VN")} VND`;
  }
  if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
    return `${numAmount.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })} ${currency}`;
  }
  return `${numAmount.toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })} ${currency}`;
};

export default function WalletList({
  activeTab,
  onTabChange,
  personalCount,
  groupCount,
  sharedCount,
  sharedFilter,
  onSharedFilterChange,
  sharedByMeCount = 0,
  sharedWithMeCount = 0,
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  wallets,
  selectedId,
  onSelectWallet,
  sharedWithMeOwners = [],
  selectedSharedOwnerId,
  onSelectSharedOwner,
}) {
  const showSharedWithMeOwners =
    activeTab === "shared" && sharedFilter === "sharedWithMe";

  return (
    <div className="wallets-list-panel">
      {/* Tabs */}
      <div className="wallets-list-panel__tabs">
        <button
          className={
            activeTab === "personal"
              ? "wallets-tab wallets-tab--active"
              : "wallets-tab"
          }
          onClick={() => onTabChange("personal")}
        >
          Ví cá nhân
          {personalCount > 0 && (
            <span className="wallets-tab__badge">{personalCount}</span>
          )}
        </button>
        <button
          className={
            activeTab === "group"
              ? "wallets-tab wallets-tab--active"
              : "wallets-tab"
          }
          onClick={() => onTabChange("group")}
        >
          Ví nhóm
          {groupCount > 0 && (
            <span className="wallets-tab__badge">{groupCount}</span>
          )}
        </button>
        <button
          className={
            activeTab === "shared"
              ? "wallets-tab wallets-tab--active"
              : "wallets-tab"
          }
          onClick={() => onTabChange("shared")}
        >
          Ví chia sẻ
          {sharedCount > 0 && (
            <span className="wallets-tab__badge">{sharedCount}</span>
          )}
        </button>
      </div>

      {/* Search + Sort */}
      <div className="wallets-list-panel__controls">
        <div className="wallets-list-panel__search">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc ghi chú ví…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="wallets-list-panel__sort">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="default">Sắp xếp: Mặc định</option>
            <option value="name_asc">Tên (A → Z)</option>
            <option value="balance_desc">Số dư (cao → thấp)</option>
            <option value="balance_asc">Số dư (thấp → cao)</option>
          </select>
        </div>
      </div>

      {activeTab === "shared" && (
        <>
          <div className="wallets-shared-toggle" role="tablist">
            <button
              type="button"
              className={
                sharedFilter === "sharedByMe"
                  ? "wallets-shared-toggle__btn wallets-shared-toggle__btn--active"
                  : "wallets-shared-toggle__btn"
              }
              onClick={() => onSharedFilterChange?.("sharedByMe")}
            >
              Ví đã chia sẻ
              {sharedByMeCount > 0 && (
                <span className="wallets-tab__badge">{sharedByMeCount}</span>
              )}
            </button>
            <button
              type="button"
              className={
                sharedFilter === "sharedWithMe"
                  ? "wallets-shared-toggle__btn wallets-shared-toggle__btn--active"
                  : "wallets-shared-toggle__btn"
              }
              onClick={() => onSharedFilterChange?.("sharedWithMe")}
            >
              Ví được chia sẻ
              {sharedWithMeCount > 0 && (
                <span className="wallets-tab__badge">{sharedWithMeCount}</span>
              )}
            </button>
          </div>
        </>
      )}

      {/* List */}
      {showSharedWithMeOwners ? (
        <div className="wallets-shared-owner-wrapper">
          {sharedWithMeOwners.length === 0 ? (
            <div className="wallets-list__empty">
              Không có ví nào được chia sẻ cho bạn.
            </div>
          ) : (
            <>
              <div className="wallets-shared-owner-chips">
                {sharedWithMeOwners.map((owner) => (
                  <button
                    type="button"
                    key={owner.id}
                    className={
                      owner.id === selectedSharedOwnerId
                        ? "wallets-owner-chip wallets-owner-chip--active"
                        : "wallets-owner-chip"
                    }
                    onClick={() => onSelectSharedOwner?.(owner.id)}
                  >
                    <span className="wallets-owner-chip__name">
                      {owner.displayName}
                    </span>
                    {owner.wallets?.length ? (
                      <small className="wallets-owner-chip__count">
                        {owner.wallets.length} ví
                      </small>
                    ) : null}
                  </button>
                ))}
              </div>
              <p className="wallets-shared-owner-hint">
                Chọn một người chia sẻ để xem các ví họ đã chia sẻ cho bạn ở ô chi tiết bên phải.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="wallets-list-panel__list">
          {wallets.length === 0 && (
            <div className="wallets-list__empty">
              Không có ví nào trong mục này.
            </div>
          )}

          {wallets.map((w) => {
            const isActive = selectedId && String(selectedId) === String(w.id);
            const balance = Number(w.balance ?? w.current ?? 0) || 0;

            return (
              <button
                key={w.id}
                className={
                  isActive
                    ? "wallets-list-item wallets-list-item--active"
                    : "wallets-list-item"
                }
                onClick={() => onSelectWallet(w.id)}
              >
                <div className="wallets-list-item__header">
                  <span className="wallets-list-item__name">
                    {w.name || "Chưa đặt tên"}
                  </span>
                  <div className="wallets-list-item__pill-row">
                    <span className="wallets-list-item__type">
                      {w.isShared ? "Nhóm" : "Cá nhân"}
                    </span>
                    {w.isDefault && (
                      <span className="wallets-list-item__default-pill">
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>
                <div className="wallets-list-item__balance">
                  {formatWalletBalance(balance, w.currency || "VND")}
                </div>
                {w.note && (
                  <div className="wallets-list-item__desc">{w.note}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

