import React from "react";
import { formatVietnamDate } from "../../../utils/dateFormat";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function DetailViewTab({
  wallet,
  sharedEmails,
  sharedMembers = [],
  sharedMembersLoading = false,
  sharedMembersError = "",
  canManageSharedMembers = false,
  canInviteMembers = false,
  onQuickShareEmail,
  quickShareLoading = false,
  sharedFilter,
  demoTransactions,
  isLoadingTransactions = false,
}) {
  const { t } = useLanguage();
  
  // Quick-share UI removed: we only display existing shared members.

  const fallbackEmails = Array.isArray(sharedEmails) ? sharedEmails : [];
  const displayMembers = sharedMembers.length
    ? sharedMembers
    : fallbackEmails.map((email) => ({ email }));

  const emptyShareMessage = canManageSharedMembers
    ? t('wallets.detail.empty_share_owner')
    : sharedFilter === "sharedWithMe"
    ? t('wallets.detail.empty_share_viewer')
    : t('wallets.detail.empty_share_member');

  const renderShareSection = () => {
    if (sharedMembersLoading) {
      return (
        <p className="wallets-detail__share-empty">Đang tải danh sách chia sẻ...</p>
      );
    }
    if (sharedMembersError) {
      return (
        <p className="wallets-detail__share-error">{sharedMembersError}</p>
      );
    }
    if (!displayMembers.length) {
      return (
        <p className="wallets-detail__share-empty">{emptyShareMessage}</p>
      );
    }

    return (
      <div className="wallet-share-list">
        {displayMembers.map((member) => {
          const key = member.memberId || member.userId || member.email || member.fullName;
          const name = member.fullName || member.name || member.email || "Không rõ tên";
          const memberRoleRaw = (member.role || member.userRole || member.accessRole || member.permission || member.roleName || "").toString();
          let roleUpper = memberRoleRaw ? memberRoleRaw.toUpperCase() : "";
          // If this wallet is personal, non-owner members should be shown as VIEW (viewer)
          if (wallet && !wallet.isShared) {
            // detect owner by role or by matching owner fields
            const isOwnerRole = ["OWNER","MASTER","ADMIN"].includes(roleUpper);
            const memberId = member.userId ?? member.memberUserId ?? member.memberId;
            const memberEmail = (member.email || "").toString().trim().toLowerCase();
            const ownerIds = [wallet?.ownerUserId, wallet?.ownerId, wallet?.ownerUser].filter(Boolean).map(String);
            const ownerEmails = [wallet?.ownerEmail, wallet?.ownerContact, wallet?.owner].filter(Boolean).map(e => String(e).toLowerCase());
            const isMemberOwner = isOwnerRole || (memberId && ownerIds.includes(String(memberId))) || (memberEmail && ownerEmails.includes(memberEmail));
            if (!isMemberOwner) {
              roleUpper = "VIEW";
            }
          }
          const getRoleLabel = (r) => {
            if (!r) return "";
            if (["OWNER","MASTER","ADMIN"].includes(r)) return "Chủ ví";
            if (["MEMBER","USER"].includes(r)) return "Thành viên";
            if (["VIEW","VIEWER"].includes(r)) return "Người xem";
            return r;
          };
          const roleLabel = getRoleLabel(roleUpper);
          const emailDisplay = member.email && member.email !== name ? member.email : "";
          const pillClass = "wallet-share-pill wallet-share-pill--readonly";
          return (
            <span key={key || name} className={pillClass}>
              <span className="wallet-share-pill__info">
                {name}
                {emailDisplay && <small>{emailDisplay}</small>}
                {roleLabel && <small>{roleLabel}</small>}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="wallets-section wallets-section--view">
      <div className="wallets-section__header">
        <h3>{t('wallets.detail.title')}</h3>
        <span>{t('wallets.detail.subtitle')}</span>
      </div>

      <div className="wallets-detail-view">
        <div className="wallets-detail-view__col">
          <div className="wallets-detail-view__card">
            <div className="wallets-detail-view__card-header">
              <span>{t('wallets.detail.info_section')}</span>
            </div>

            <div className="wallet-detail-grid">
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">{t('wallets.detail.type_label')}</span>
                <span className="wallet-detail-item__value">
                  {wallet.isShared ? t('wallets.type.group') : t('wallets.type.personal')}
                </span>
              </div>
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">{t('wallets.detail.currency_label')}</span>
                <span className="wallet-detail-item__value">
                  {wallet.currency || "VND"}
                </span>
              </div>
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">{t('wallets.detail.created_at_label')}</span>
                <span className="wallet-detail-item__value">
                  {wallet.createdAt ? formatVietnamDate(wallet.createdAt) : "—"}
                </span>
              </div>
              <div className="wallet-detail-item wallet-detail-item--full">
                <span className="wallet-detail-item__label">{t('wallets.inspector.note')}</span>
                <span className="wallet-detail-item__value">
                  {wallet.note || t('wallets.detail.no_note')}
                </span>
              </div>
            </div>

            <div className="wallets-detail__share">
              <div className="wallets-detail__share-header">
                <h4>{t('wallets.detail.share_section')}</h4>
              </div>
              {/* quick share form removed; only display existing shared members */}
              {renderShareSection()}
            </div>
          </div>
        </div>

        <div className="wallets-detail-view__col wallets-detail-view__col--history">
          <div className="wallets-detail-view__card">
            <div className="wallets-detail-view__card-header">
              <span>{t('wallets.detail.transaction_history')}</span>
              <span className="wallets-detail-view__counter">
                {isLoadingTransactions ? t('common.loading') : t('wallets.detail.transaction_count', { count: demoTransactions.length })}
              </span>
            </div>

            <div className="wallets-detail__history-summary">
              <div className="wallet-detail-item wallet-detail-item--inline">
                <span className="wallet-detail-item__label">
                  Số giao dịch
                </span>
                <span className="wallet-detail-item__value">
                  {isLoadingTransactions ? "..." : demoTransactions.length}
                </span>
              </div>
            </div>

            <div className="wallets-detail__history">
              {isLoadingTransactions ? (
                <p className="wallets-detail__history-empty">
                  Đang tải lịch sử giao dịch...
                </p>
              ) : demoTransactions.length === 0 ? (
                <p className="wallets-detail__history-empty">
                  {t('wallets.detail.no_transactions')}
                </p>
              ) : (
                <ul className="wallets-detail__history-list">
                  {demoTransactions.map((tx) => {
                    // FIXED: Luôn dùng currency của wallet (không dùng currency của transaction)
                    // Vì transaction.amount đã được chuyển đổi sang currency của wallet rồi
                    const walletCurrency = wallet?.currency || "VND";
                    const absAmount = Math.abs(tx.amount);
                    
                    // Format số tiền theo currency của wallet với độ chính xác cao
                    const formattedAmount = absAmount.toLocaleString("vi-VN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    });
                    
                    return (
                      <li key={tx.id} className="wallets-detail__history-item">
                        <div className="wallets-detail__history-main">
                          <span className="wallets-detail__history-title">
                            {tx.title}
                          </span>
                          <span
                            className={
                              tx.amount >= 0
                                ? "wallets-detail__history-amount wallets-detail__history-amount--pos"
                                : "wallets-detail__history-amount wallets-detail__history-amount--neg"
                            }
                          >
                            {tx.amount >= 0 ? "+" : "-"}
                          {`${formattedAmount} ${walletCurrency}`}
                          </span>
                        </div>

                        <div className="wallets-detail__history-meta">
                          <span className="wallets-detail__history-category">
                            {tx.categoryName || "Danh mục khác"}
                          </span>
                          {tx.creatorName ? (
                            <span className="wallets-detail__history-actor">{tx.creatorName}</span>
                          ) : null}
                          <span>{tx.timeLabel}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
