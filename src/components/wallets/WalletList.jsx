import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/components/wallets/WalletList.css";

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
  const { t } = useLanguage();
  const showSharedWithMeOwners =
    activeTab === "shared" && sharedFilter === "sharedWithMe";

  const renderWalletCard = (w) => {
    const isActive = selectedId && String(selectedId) === String(w.id);
    const balance = Number(w.balance ?? w.current ?? 0) || 0;
    const isGroupWallet = !!w.isShared;
    const roleRaw = (w.walletRole || w.sharedRole || w.role || "").toString().toUpperCase();
    const isViewerRole = ["VIEW", "VIEWER"].includes(roleRaw);
    const isEditableRole = ["MEMBER", "USER", "USE", "OWNER", "MASTER", "ADMIN"].includes(roleRaw);
    const sharedEmailsFromWallet = Array.isArray(w.sharedEmails)
      ? w.sharedEmails.filter((email) => email && typeof email === "string" && email.trim())
      : [];
    const memberEmails = Array.isArray(w.members)
      ? w.members.map((m) => m.email || m.userEmail || m.memberEmail).filter(Boolean)
      : [];
    const hasMembers = (w.membersCount > 1) || (w.hasSharedMembers === true);
    const allEmails = [...new Set([...sharedEmailsFromWallet, ...memberEmails])].filter(Boolean);
    // Show members block for any wallet (personal or group) when we have member info
    const shouldShowMembers = (allEmails.length > 0 || hasMembers);

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
            {w.name || t('wallets.no_name')}
          </span>
            <div className="wallets-list-item__pill-row">
              {/* Wallet type with member count inline (matches group wallet display) */}
              <span className="wallets-list-item__type-pill">
                {w.isShared ? t('wallets.type.group', 'Nhóm') : t('wallets.type.personal', 'Cá nhân')}
              </span>

              {/* Role for shared wallets (viewer / member) */}
              {w.isShared && (
                <span className="wallets-list-item__role-pill">
                  {isViewerRole
                    ? t('wallets.role.viewer', 'viewer')
                    : t('wallets.role.member', 'member')}
                </span>
              )}

              {/* Default badge */}
              {w.isDefault && (
                <span className="wallets-list-item__default-pill">{t('wallets.card.default') || 'Mặc định'}</span>
              )}
            </div>
        </div>
        <div className="wallets-list-item__balance">
          {formatWalletBalance(balance, w.currency || "VND")}
        </div>
        {w.note && (
          <div className="wallets-list-item__desc">{w.note}</div>
        )}
        {shouldShowMembers && (
          <div className="wallets-list-item__members">
            <div className="wallets-list-item__members-label">
              <i className="bi bi-people" style={{ marginRight: "4px" }} />
              {t('wallets.members') || 'Thành viên'}:
            </div>
            {allEmails.length > 0 ? (
              <div className="wallets-list-item__members-emails">
                {allEmails.slice(0, 3).map((email, idx) => (
                  <span key={idx} className="wallets-list-item__member-email" title={email}>
                    {String(email).trim()}
                  </span>
                ))}
                {allEmails.length > 3 && (
                  <span className="wallets-list-item__member-more">
                    +{allEmails.length - 3} {t('wallets.more') || 'khác'}
                  </span>
                )}
              </div>
            ) : (
              <div className="wallets-list-item__members-emails">
                <span className="wallets-list-item__member-more" style={{ fontStyle: "normal" }}>
                  {w.membersCount > 1 ? `${w.membersCount} thành viên` : "Chưa có thành viên"}
                </span>
              </div>
            )}
          </div>
        )}
      </button>
    );
  };

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
          {t('wallets.tab.personal')}
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
          {t('wallets.tab.group')}
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
          {t('wallets.tab.shared')}
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
            placeholder={t('wallets.search_placeholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="wallets-list-panel__sort">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="default">{t('wallets.sort.default')}</option>
            <option value="name_asc">{t('wallets.sort.name_az')}</option>
            <option value="balance_desc">{t('wallets.sort.balance_desc_label')}</option>
            <option value="balance_asc">{t('wallets.sort.balance_asc_label')}</option>
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
      {activeTab === 'shared' && sharedFilter === 'sharedByMe' ? (
        /* Shared - "Ví đã chia sẻ": two-column split (left personal, right group) */
        <div className="wallets-shared-split">
            {/* Debug panel removed */}
          <div className="wallets-shared-column wallets-shared-column--personal">
            <div className="wallets-shared-column__title">{t('wallets.type.personal')}</div>
            {wallets.filter((w) => !w.isShared).length === 0 && (
              <div className="wallets-list__empty">{t('wallets.empty_list')}</div>
            )}
            {wallets.filter((w) => !w.isShared).map((w) => renderWalletCard(w))}
          </div>

          <div className="wallets-shared-divider" aria-hidden="true" />

          <div className="wallets-shared-column wallets-shared-column--group">
            <div className="wallets-shared-column__title">{t('wallets.type.group')}</div>
            {wallets.filter((w) => w.isShared).length === 0 && (
              <div className="wallets-list__empty">{t('wallets.empty_list')}</div>
            )}
            {wallets.filter((w) => w.isShared).map((w) => renderWalletCard(w))}
          </div>
        </div>
      ) : showSharedWithMeOwners ? (
        <div className="wallets-shared-owner-wrapper">
          {sharedWithMeOwners.length === 0 ? (
            <div className="wallets-list__empty">{t('wallets.no_shared_with_me')}</div>
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

              <p className="wallets-shared-owner-hint">{t('wallets.shared_owner_hint')}</p>

              {/* If an owner is selected, show their wallets split into personal/group */}
              {selectedSharedOwnerId ? (
                (() => {
                  const owner = sharedWithMeOwners.find((o) => o.id === selectedSharedOwnerId);
                  if (!owner) return (
                    <div className="wallets-list__empty">{t('wallets.no_shared_with_me')}</div>
                  );
                  // Split owner's wallets into ones where the current user has edit/member rights
                  // and ones where the current user only has view rights.
                  const memberRoles = ["OWNER", "MASTER", "ADMIN", "MEMBER", "USER", "USE"];
                  const viewerRoles = ["VIEW", "VIEWER"];
                  const ownerMember = (owner.wallets || []).filter((w) => {
                    const role = (w.walletRole || w.sharedRole || w.role || "").toString().toUpperCase();
                    return memberRoles.includes(role);
                  });
                  const ownerViewer = (owner.wallets || []).filter((w) => {
                    const role = (w.walletRole || w.sharedRole || w.role || "").toString().toUpperCase();
                    // Treat explicit viewer roles or unknown/empty role as viewer-only
                    return viewerRoles.includes(role) || !role;
                  });

                  return (
                    <div className="wallets-shared-split wallets-shared-split--owner">
                      <div className="wallets-shared-column wallets-shared-column--personal">
                        <div className="wallets-shared-column__title">{t('wallets.role.member','member')}</div>
                        {ownerMember.length === 0 ? (
                          <div className="wallets-list__empty">{t('wallets.empty_list')}</div>
                        ) : (
                          ownerMember.map((w) => renderWalletCard(w))
                        )}
                      </div>

                      <div className="wallets-shared-divider" aria-hidden="true" />

                      <div className="wallets-shared-column wallets-shared-column--group">
                        <div className="wallets-shared-column__title">{t('wallets.role.viewer','viewer')}</div>
                        {ownerViewer.length === 0 ? (
                          <div className="wallets-list__empty">{t('wallets.empty_list')}</div>
                        ) : (
                          ownerViewer.map((w) => renderWalletCard(w))
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </>
          )}
        </div>
      ) : (
        /* Default single-column list for personal/group or other views */
        <div className="wallets-list-panel__list">
          {wallets.length === 0 && (
            <div className="wallets-list__empty">{t('wallets.empty_list')}</div>
          )}

          {wallets.map((w) => renderWalletCard(w))}
        </div>
      )}
    </div>
  );
}
