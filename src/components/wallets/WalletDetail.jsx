import React, { useState, useEffect, useMemo } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { formatMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import { formatMoney } from "../../utils/formatMoney";
import { walletAPI } from "../../services/api-client";
import { useLanguage } from "../../contexts/LanguageContext";
import DetailViewTab from "./tabs/DetailViewTab";
import ManageMembersTab from "./tabs/ManageMembersTab";
import TopupTab from "./tabs/TopupTab";
import WithdrawTab from "./tabs/WithdrawTab";
import TransferTab from "./tabs/TransferTab";
import EditTab from "./tabs/EditTab";
import MergeTab from "./tabs/MergeTab";
import ConvertTab from "./tabs/ConvertTab";
import "../../styles/components/wallets/WalletDetail.css";
import "../../styles/components/wallets/WalletForms.css";
import "../../styles/components/wallets/WalletMerge.css";
import "../../styles/components/wallets/WalletTransfer.css";

export default function WalletDetail(props) {
  const {
    wallet,
    walletTabType = "personal",
    sharedFilter = "sharedByMe",
    sharedEmailsOverride,
    forceLoadSharedMembers = false,
    canInviteMembers = false,
    onQuickShareEmail,
    quickShareLoading = false,
    currencies,
    incomeCategories,
    expenseCategories,
    showCreate,
    setShowCreate,
    activeDetailTab,
    setActiveDetailTab,
    demoTransactions,
    loadingTransactions = false,
    allWallets,
    topupCategoryId,
    setTopupCategoryId,
    sharedWithMeOwners = [],
    selectedSharedOwnerId,
    selectedSharedOwnerWalletId,
    onSelectSharedOwnerWallet,
    onSharedWalletDemoView,
    onSharedWalletDemoCancel,

    // create
    createForm,
    onCreateFieldChange,
    createShareEnabled,
    setCreateShareEnabled,
    createShareEmail,
    setCreateShareEmail,
    onAddCreateShareEmail,
    onRemoveCreateShareEmail,
    onSubmitCreate,

    // edit
    editForm,
    onEditFieldChange,
    editShareEmail,
    setEditShareEmail,
    onAddEditShareEmail,
    onRemoveEditShareEmail,
    shareWalletLoading,
    onSubmitEdit,

    // merge
    mergeTargetId,
    setMergeTargetId,
    onSubmitMerge,

    // topup
    topupAmount,
    setTopupAmount,
    topupNote,
    setTopupNote,
    onSubmitTopup,

    // withdraw
    withdrawAmount,
    setWithdrawAmount,
    withdrawNote,
    setWithdrawNote,
    withdrawCategoryId,
    setWithdrawCategoryId,
    onSubmitWithdraw,

    // transfer
    transferTargetId,
    setTransferTargetId,
    transferAmount,
    setTransferAmount,
    transferNote,
    setTransferNote,
    onSubmitTransfer,

    // convert
    onConvertToGroup,

    // callback để thay đổi ví đang chọn ở cột trái
    onChangeSelectedWallet,
    onDeleteWallet,
  } = props;

  // Extract loadingTransactions với default value
  const isLoadingTransactions = loadingTransactions || false;

  const sharedEmails = useMemo(() => {
    const base = Array.isArray(wallet?.sharedEmails)
      ? wallet.sharedEmails
      : [];
    return sharedEmailsOverride !== undefined ? sharedEmailsOverride : base;
  }, [wallet?.sharedEmails, sharedEmailsOverride]);

  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  const balance = useMemo(() => {
    return Number(wallet?.balance ?? wallet?.current ?? 0) || 0;
  }, [wallet]);

  // Lấy currency từ wallet, fallback về "VND" nếu không có
  const walletCurrency = useMemo(() => {
    return wallet?.currency || wallet?.currencyCode || "VND";
  }, [wallet]);

  // ======= SHARED WITH ME MODE =======
  const isSharedWithMeMode = walletTabType === "sharedWithMe";
  const safeSharedWithMeOwners = Array.isArray(sharedWithMeOwners)
    ? sharedWithMeOwners
    : [];
  const selectedSharedOwnerGroup = useMemo(() => {
    if (!selectedSharedOwnerId || !safeSharedWithMeOwners.length) return null;
    return (
      safeSharedWithMeOwners.find(
        (g) => String(g.id || g.userId) === String(selectedSharedOwnerId)
      ) || null
    );
  }, [selectedSharedOwnerId, safeSharedWithMeOwners]);

  // ======= SHARED MEMBERS MANAGEMENT =======
  const [sharedMembers, setSharedMembers] = useState([]);
  const [sharedMembersLoading, setSharedMembersLoading] = useState(false);
  const [sharedMembersError, setSharedMembersError] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const canManageSharedMembers = useMemo(() => {
    if (!wallet) return false;
    // Nếu là ví nhóm và có quyền quản lý
    return !!wallet.isShared;
  }, [wallet]);

  useEffect(() => {
    if (!wallet || !forceLoadSharedMembers) return;
    if (!canManageSharedMembers) {
      setSharedMembers([]);
      setSharedMembersLoading(false);
      return;
    }

    const loadSharedMembers = async () => {
      setSharedMembersLoading(true);
      setSharedMembersError("");
      try {
        const response = await walletAPI.getSharedMembers(wallet.id);
        if (response?.data) {
          setSharedMembers(Array.isArray(response.data) ? response.data : []);
        } else {
          setSharedMembers([]);
        }
      } catch (error) {
        setSharedMembersError(
          error.message || "Không thể tải danh sách thành viên."
        );
        setSharedMembers([]);
      } finally {
        setSharedMembersLoading(false);
      }
    };

    loadSharedMembers();
  }, [wallet?.id, forceLoadSharedMembers, canManageSharedMembers]);

  const handleRemoveSharedMember = async (member) => {
    if (!wallet || !member) return;
    const targetId =
      member.userId ?? member.memberUserId ?? member.memberId;
    if (!targetId) return;

    setRemovingMemberId(targetId);
    try {
      await walletAPI.removeSharedMember(wallet.id, targetId);
      setSharedMembers((prev) =>
        prev.filter((m) => (m.userId ?? m.memberUserId ?? m.memberId) !== targetId)
      );
    } catch (error) {
      setSharedMembersError(error.message || "Không thể xóa thành viên khỏi ví.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  // ======= VIEW: CREATE NEW WALLET =======
  if (showCreate) {
    return (
      <div className="wallets-detail-panel">
        <div className="wallets-section wallets-section--inline">
          <div className="wallets-section__header">
            <h3>{t("wallets.create_new")}</h3>
            <span>{t("wallets.create_desc") || "Nhập thông tin để tạo ví"}</span>
          </div>
          <form
            className="wallet-form"
            onSubmit={onSubmitCreate}
            autoComplete="off"
          >
            <div className="wallet-form__row">
              <label>
                Tên ví
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) =>
                    onCreateFieldChange("name", e.target.value)
                  }
                  placeholder="Ví tiền mặt, Ví ngân hàng..."
                />
              </label>
              <label>
                Tiền tệ
                <select
                  value={createForm.currency}
                  onChange={(e) =>
                    onCreateFieldChange("currency", e.target.value)
                  }
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wallet-form__row">
              <label className="wallet-form__full">
                Ghi chú
                <textarea
                  rows={2}
                  value={createForm.note}
                  onChange={(e) =>
                    onCreateFieldChange("note", e.target.value)
                  }
                  placeholder="Mục đích sử dụng ví này..."
                />
              </label>
            </div>

            {/* bật/tắt chia sẻ */}
            <div className="wallet-form__row">
              <label className="wallet-form__checkbox">
                <input
                  type="checkbox"
                  checked={createShareEnabled}
                  onChange={(e) => setCreateShareEnabled(e.target.checked)}
                />
                <span>Chia sẻ ví này với người khác</span>
              </label>
            </div>

            {createShareEnabled && (
              <div className="wallet-form__share-block">
                <label className="wallet-form__full">
                  Email người được chia sẻ
                  <div className="wallet-form__share-row">
                    <input
                      type="email"
                      value={createShareEmail}
                      onChange={(e) => setCreateShareEmail(e.target.value)}
                      placeholder="example@gmail.com"
                    />
                    <button
                      type="button"
                      className="wallets-btn wallets-btn--ghost"
                      onClick={onAddCreateShareEmail}
                    >
                      Thêm
                    </button>
                  </div>
                </label>

                {createForm.sharedEmails.length > 0 && (
                  <div className="wallet-share-list">
                    {createForm.sharedEmails.map((email) => (
                      <span key={email} className="wallet-share-pill">
                        {email}
                        <button
                          type="button"
                          onClick={() => onRemoveCreateShareEmail(email)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="wallet-form__footer">
              <label className="wallet-form__checkbox">
                <input
                  type="checkbox"
                  checked={createForm.isDefault}
                  onChange={(e) =>
                    onCreateFieldChange("isDefault", e.target.checked)
                  }
                />
                <span>Đặt làm ví mặc định</span>
              </label>
              <div className="wallet-form__actions">
                <button
                  type="button"
                  className="wallets-btn wallets-btn--ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="wallets-btn wallets-btn--primary"
                >
                  Lưu ví cá nhân
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ======= KHÔNG CÓ VÍ ĐANG CHỌN → PLACEHOLDER THEO TỪNG TAB =======
  if (!wallet) {
    if (isSharedWithMeMode) {
      const hasOwners = safeSharedWithMeOwners.length > 0;
      const ownerWallets = selectedSharedOwnerGroup?.wallets || [];
      const ownerName = selectedSharedOwnerGroup?.displayName || "Chưa chọn người chia sẻ";

      return (
        <div className="wallets-detail-panel wallets-detail-panel--shared-with-me">
          <div className="wallets-shared-detail__header">
            <h2>{t("wallets.tab.shared")}</h2>
            <p>{t("wallets.inspector.select_hint")}</p>
          </div>

          {!hasOwners ? (
            <div className="wallets-shared-detail__empty">
              Hiện chưa có ví nào được người khác chia sẻ cho bạn.
            </div>
          ) : !selectedSharedOwnerGroup ? (
            <div className="wallets-shared-detail__empty">
              Hãy chọn một người chia sẻ để xem danh sách ví.
            </div>
          ) : ownerWallets.length === 0 ? (
            <div className="wallets-shared-detail__empty">
              Không có ví nào khớp với tìm kiếm hiện tại.
            </div>
          ) : (
            <>
              <div className="wallets-shared-detail__owner-card">
                <div>
                  <p className="wallets-shared-detail__owner-label">Người chia sẻ</p>
                  <h3 className="wallets-shared-detail__owner-name">{ownerName}</h3>
                  {selectedSharedOwnerGroup?.email && (
                    <p className="wallets-shared-detail__owner-email">
                      {selectedSharedOwnerGroup.email}
                    </p>
                  )}
                </div>
                <div className="wallets-shared-detail__owner-meta">
                  <span>{ownerWallets.length} ví</span>
                  <small>Chọn người khác ở cột trái để xem ví khác.</small>
                </div>
              </div>

              <div className="wallets-shared-owner-wallets wallets-shared-owner-wallets--detail">
                {ownerWallets.map((sharedWallet) => {
                  const balance =
                    Number(sharedWallet.balance ?? sharedWallet.current ?? 0) || 0;
                  const isSelected =
                    selectedSharedOwnerWalletId &&
                    String(selectedSharedOwnerWalletId) ===
                      String(sharedWallet.id);

                  return (
                    <div
                      key={sharedWallet.id}
                      className={
                        isSelected
                          ? "wallets-shared-owner-wallet wallets-shared-owner-wallet--selected"
                          : "wallets-shared-owner-wallet"
                      }
                      onClick={() => onSelectSharedOwnerWallet?.(sharedWallet.id)}
                    >
                      <div className="wallets-shared-owner-wallet__header">
                        <div className="wallets-shared-owner-wallet__title">
                          <span className="wallets-shared-owner-wallet__name">
                            {sharedWallet.name || "Chưa đặt tên"}
                          </span>
                          {sharedWallet.isDemoShared && (
                            <span className="wallets-shared-demo-tag">Demo</span>
                          )}
                        </div>
                        <span className="wallets-shared-owner-wallet__balance">
                          {formatMoney(
                            Number(sharedWallet.balance ?? sharedWallet.current ?? 0) || 0,
                            sharedWallet.currency || sharedWallet.currencyCode || "VND"
                          )}
                        </span>
                      </div>
                      {sharedWallet.note && (
                        <p className="wallets-shared-owner-wallet__note">
                          {sharedWallet.note}
                        </p>
                      )}
                      <div className="wallets-shared-owner-wallet__meta">
                        <span>{sharedWallet.ownerName}</span>
                        {sharedWallet.ownerEmail && <span>{sharedWallet.ownerEmail}</span>}
                      </div>
                      {isSelected && (
                        <div className="wallets-shared-wallet-actions">
                          <button
                            type="button"
                            className="wallets-shared-wallet-actions__btn wallets-shared-wallet-actions__btn--primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSharedWalletDemoView?.(sharedWallet);
                            }}
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            className="wallets-shared-wallet-actions__btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSharedWalletDemoCancel?.();
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    const isGroupTab = walletTabType === "group";

    return (
      <div className="wallets-detail-panel wallets-detail-panel--empty">
        <div className="wallets-detail-empty">
          {isGroupTab ? (
            <>
              <h2 className="wallets-detail-empty__title">
                {t("wallets.tab.group")}
              </h2>
              <p className="wallets-detail-empty__text">
                {t("wallets.empty.group_desc") || "Bạn chưa có ví nhóm trong mục này."}
              </p>
            </>
          ) : (
            <>
              <h2 className="wallets-detail-empty__title">
                {t("wallets.inspector.no_wallet_selected")}
              </h2>
              <p className="wallets-detail-empty__text">
                {t("wallets.inspector.select_hint")}
              </p>
              <p className="wallets-detail-empty__hint">
                {t("wallets.create_hint") ||
                  "Hoặc dùng nút \"Tạo ví cá nhân\" ở góc trên bên phải để tạo ví mới."}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ======= DETAIL PANEL =======
  return (
    <div className="wallets-detail-panel">
      {/* HEADER */}
      <div className="wallets-detail__header">
          <div>
          <h2 className="wallets-detail__name">
            {wallet.name || t("wallets.unnamed") || "Chưa đặt tên"}
          </h2>
          <div className="wallets-detail__tags">
            <span className="wallet-tag">
              {wallet.isShared ? t("wallets.group_wallet") : t("wallets.personal_wallet")}
            </span>
            {!wallet.isShared && wallet.isDefault && (
              <span className="wallet-tag wallet-tag--outline">
                {t("wallets.card.default")}
              </span>
            )}
          </div>
        </div>
        <div className="wallets-detail__balance">
          <div className="wallets-detail__balance-label">{t("wallets.card.balance")}</div>
          <div className="wallets-detail__balance-value">
            {formatMoney(balance, walletCurrency)}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="wallets-detail__tabs">
        <button
          className={
            activeDetailTab === "view"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("view")}
        >
          {t("wallets.inspector.tab.details")}
        </button>
        <button
          className={
            activeDetailTab === "topup"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("topup")}
        >
          {t("wallets.inspector.tab.topup") || "Nạp ví"}
        </button>
        <button
          className={
            activeDetailTab === "withdraw"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("withdraw")}
        >
          {t("wallets.inspector.tab.withdraw")}
        </button>
        <button
          className={
            activeDetailTab === "transfer"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("transfer")}
        >
          {t("wallets.inspector.tab.transfer")}
        </button>
        <button
          className={
            activeDetailTab === "edit"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("edit")}
        >
          {t("wallets.inspector.tab.edit") || "Sửa ví"}
        </button>
        <button
          className={
            activeDetailTab === "merge"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("merge")}
        >
          {t("wallets.inspector.tab.merge")}
        </button>

        {/* Chỉ hiển thị tab chuyển thành ví nhóm cho ví cá nhân */}
        {!wallet.isShared && walletTabType === "personal" && (
          <button
            className={
              activeDetailTab === "convert"
                ? "wallets-detail-tab wallets-detail-tab--active"
                : "wallets-detail-tab"
            }
            onClick={() => setActiveDetailTab("convert")}
          >
            Chuyển thành ví nhóm
          </button>
        )}

        {canManageSharedMembers && (
          <button
            className={
              activeDetailTab === "manageMembers"
                ? "wallets-detail-tab wallets-detail-tab--active"
                : "wallets-detail-tab"
            }
            onClick={() => setActiveDetailTab("manageMembers")}
          >
            Quản lý người dùng
          </button>
        )}
      </div>

      {/* NỘI DUNG THEO TAB */}
      {activeDetailTab === "view" && (
        <DetailViewTab
          wallet={wallet}
          sharedEmails={sharedEmails}
          sharedMembers={sharedMembers}
          sharedMembersLoading={sharedMembersLoading}
          sharedMembersError={sharedMembersError}
          canManageSharedMembers={canManageSharedMembers}
          canInviteMembers={canInviteMembers}
          removingMemberId={removingMemberId}
          onRemoveSharedMember={handleRemoveSharedMember}
          onQuickShareEmail={onQuickShareEmail}
          quickShareLoading={quickShareLoading}
          sharedFilter={sharedFilter}
          demoTransactions={demoTransactions}
          isLoadingTransactions={isLoadingTransactions}
        />
      )}

      {activeDetailTab === "manageMembers" && canManageSharedMembers && (
        <ManageMembersTab
          wallet={wallet}
          sharedMembers={sharedMembers}
          sharedMembersLoading={sharedMembersLoading}
          sharedMembersError={sharedMembersError}
          onRemoveSharedMember={handleRemoveSharedMember}
          removingMemberId={removingMemberId}
        />
      )}

      {activeDetailTab === "topup" && (
        <TopupTab
          wallet={wallet}
          incomeCategories={incomeCategories}
          topupAmount={topupAmount}
          setTopupAmount={setTopupAmount}
          topupNote={topupNote}
          setTopupNote={setTopupNote}
          topupCategoryId={topupCategoryId}
          setTopupCategoryId={setTopupCategoryId}
          onSubmitTopup={onSubmitTopup}
        />
      )}

      {activeDetailTab === "withdraw" && (
        <WithdrawTab
          wallet={wallet}
          expenseCategories={expenseCategories}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          withdrawNote={withdrawNote}
          setWithdrawNote={setWithdrawNote}
          withdrawCategoryId={withdrawCategoryId}
          setWithdrawCategoryId={setWithdrawCategoryId}
          onSubmitWithdraw={onSubmitWithdraw}
        />
      )}

      {activeDetailTab === "transfer" && (
        <TransferTab
          wallet={wallet}
          allWallets={allWallets}
          transferTargetId={transferTargetId}
          setTransferTargetId={setTransferTargetId}
          transferAmount={transferAmount}
          setTransferAmount={setTransferAmount}
          transferNote={transferNote}
          setTransferNote={setTransferNote}
          onSubmitTransfer={onSubmitTransfer}
        />
      )}

      {activeDetailTab === "edit" && (
        <EditTab
          wallet={wallet}
          currencies={currencies}
          editForm={editForm}
          onEditFieldChange={onEditFieldChange}
          editShareEmail={editShareEmail}
          setEditShareEmail={setEditShareEmail}
          onAddEditShareEmail={onAddEditShareEmail}
          onRemoveEditShareEmail={onRemoveEditShareEmail}
          shareWalletLoading={shareWalletLoading}
          onSubmitEdit={onSubmitEdit}
          onDeleteWallet={onDeleteWallet}
        />
      )}

      {activeDetailTab === "merge" && (
        <MergeTab
          wallet={wallet}
          allWallets={allWallets}
          mergeTargetId={mergeTargetId}
          setMergeTargetId={setMergeTargetId}
          onSubmitMerge={onSubmitMerge}
          onChangeSelectedWallet={onChangeSelectedWallet}
        />
      )}

      {activeDetailTab === "convert" && !wallet.isShared && (
        <ConvertTab
          wallet={wallet}
          allWallets={allWallets}
          onConvertToGroup={onConvertToGroup}
          onChangeSelectedWallet={onChangeSelectedWallet}
        />
      )}
    </div>
  );
}
