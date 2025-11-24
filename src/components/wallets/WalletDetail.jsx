import React, { useState, useEffect, useMemo } from "react";
import ConfirmModal from "../common/Modal/ConfirmModal";
import { formatMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import { walletAPI } from "../../services/api-client";

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
    if (!sharedEmailsOverride || !sharedEmailsOverride.length) {
      return base;
    }
    const merged = new Set(
      base.filter((email) => typeof email === "string" && email.trim())
    );
    sharedEmailsOverride.forEach((email) => {
      if (typeof email === "string" && email.trim()) {
        merged.add(email.trim());
      }
    });
    return Array.from(merged);
  }, [wallet?.sharedEmails, sharedEmailsOverride]);
  const balance = Number(wallet?.balance ?? wallet?.current ?? 0) || 0;

  const [sharedMembers, setSharedMembers] = useState([]);
  const [sharedMembersLoading, setSharedMembersLoading] = useState(false);
  const [sharedMembersError, setSharedMembersError] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const isSharedTab = walletTabType === "shared";
  const canManageSharedMembers = isSharedTab && sharedFilter === "sharedByMe";
  const allowSharedMembersFetch = isSharedTab || forceLoadSharedMembers;
  const isSharedWithMeMode = isSharedTab && sharedFilter === "sharedWithMe";
  const safeSharedWithMeOwners = Array.isArray(sharedWithMeOwners)
    ? sharedWithMeOwners
    : [];
  const selectedSharedOwnerGroup = useMemo(() => {
    if (!safeSharedWithMeOwners.length) return null;
    if (selectedSharedOwnerId) {
      return (
        safeSharedWithMeOwners.find(
          (owner) => owner.id === selectedSharedOwnerId
        ) || null
      );
    }
    return safeSharedWithMeOwners[0];
  }, [safeSharedWithMeOwners, selectedSharedOwnerId]);

  // Format số dư để hiển thị (giống với WalletList.jsx)
  const formatBalance = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "USD") {
      // USD: hiển thị tối đa 8 chữ số thập phân để chính xác
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    if (currency === "VND") {
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    // Các currency khác: hiển thị tối đa 8 chữ số thập phân
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    }
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  };

  // Nếu ví đã là ví nhóm mà tab đang là "convert" -> tự về "view"
  useEffect(() => {
    if (wallet?.isShared && activeDetailTab === "convert") {
      setActiveDetailTab("view");
    }
  }, [wallet?.isShared, activeDetailTab, setActiveDetailTab]);

  useEffect(() => {
    let ignore = false;
    if (!wallet?.id || !allowSharedMembersFetch) {
      setSharedMembers([]);
      setSharedMembersError("");
      setSharedMembersLoading(false);
      return () => {};
    }

    const fetchMembers = async () => {
      setSharedMembersLoading(true);
      setSharedMembersError("");
      try {
        const data = await walletAPI.getWalletMembers(wallet.id);
        if (ignore) return;
        const members = Array.isArray(data?.members) ? data.members : [];
        setSharedMembers(members);
      } catch (error) {
        if (ignore) return;
        setSharedMembers([]);
        setSharedMembersError(error.message || "Không thể tải danh sách chia sẻ.");
      } finally {
        if (!ignore) {
          setSharedMembersLoading(false);
        }
      }
    };

    fetchMembers();

    return () => {
      ignore = true;
    };
  }, [wallet?.id, allowSharedMembersFetch]);

  const handleRemoveSharedMember = async (member) => {
    if (!canManageSharedMembers || !wallet?.id || !member) return;
    const targetId = member.userId ?? member.memberUserId ?? member.memberId;
    if (!targetId) return;
    const displayName = member.fullName || member.email || "thành viên";
    const confirmMessage = `Bạn chắc chắn muốn xóa ${displayName} khỏi ví?`;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }
    try {
      setRemovingMemberId(targetId);
      await walletAPI.removeMember(wallet.id, targetId);
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
            <h3>Tạo ví cá nhân</h3>
            <span>Nhập thông tin để tạo ví</span>
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
            <h2>Ví được chia sẻ cho bạn</h2>
            <p>
              Chọn một người chia sẻ ở danh sách bên trái để xem các ví mà họ đã cấp quyền sử dụng.
            </p>
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
                          {formatBalance(balance, sharedWallet.currency || "VND")}
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
                Chưa có ví nhóm nào
              </h2>
              <p className="wallets-detail-empty__text">
                Bạn chưa có ví nhóm trong mục này.
              </p>
              <p className="wallets-detail-empty__hint">
                Hãy tạo ví nhóm mới để bắt đầu quản lý chi tiêu chung với mọi
                người.
              </p>
            </>
          ) : (
            <>
              <h2 className="wallets-detail-empty__title">
                Chưa có ví nào được chọn
              </h2>
              <p className="wallets-detail-empty__text">
                Vui lòng chọn một ví ở danh sách bên trái để xem chi tiết.
              </p>
              <p className="wallets-detail-empty__hint">
                Hoặc dùng nút <strong>“Tạo ví cá nhân”</strong> ở góc trên bên
                phải để tạo ví mới.
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
            {wallet.name || "Chưa đặt tên"}
          </h2>
          <div className="wallets-detail__tags">
            <span className="wallet-tag">
              {wallet.isShared ? "Ví nhóm" : "Ví cá nhân"}
            </span>
            {!wallet.isShared && wallet.isDefault && (
              <span className="wallet-tag wallet-tag--outline">
                Ví mặc định
              </span>
            )}
          </div>
        </div>
        <div className="wallets-detail__balance">
          <div className="wallets-detail__balance-label">Số dư</div>
          <div className="wallets-detail__balance-value">
            {formatBalance(balance, wallet.currency || "VND")}
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
          Xem chi tiết
        </button>
        <button
          className={
            activeDetailTab === "topup"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("topup")}
        >
          Nạp ví
        </button>
        <button
          className={
            activeDetailTab === "withdraw"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("withdraw")}
        >
          Rút ví
        </button>
        <button
          className={
            activeDetailTab === "transfer"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("transfer")}
        >
          Chuyển tiền
        </button>
        <button
          className={
            activeDetailTab === "edit"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("edit")}
        >
          Sửa ví
        </button>
        <button
          className={
            activeDetailTab === "merge"
              ? "wallets-detail-tab wallets-detail-tab--active"
              : "wallets-detail-tab"
          }
          onClick={() => setActiveDetailTab("merge")}
        >
          Gộp ví
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

/* ====== HELPER FUNCTIONS ====== */

// Helper function để tính tỷ giá (dùng chung cho tất cả components)
function getRate(from, to) {
  if (!from || !to || from === to) return 1;
  
  // Tỷ giá cố định (theo ExchangeRateServiceImpl)
  // rates[currency] = tỷ giá 1 VND = ? currency
  const ratesToVND = {
    VND: 1,
    USD: 0.000041, // 1 VND = 0.000041 USD
    EUR: 0.000038,
    JPY: 0.0063,
    GBP: 0.000032,
    CNY: 0.00030,
  };
  
  // Tỷ giá ngược lại: 1 currency = ? VND (để tránh phép chia)
  const ratesFromVND = {
    VND: 1,
    USD: 24390.243902439024, // 1 USD = 24390.243902439024 VND (1/0.000041)
    EUR: 26315.78947368421, // 1 EUR = 26315.78947368421 VND (1/0.000038)
    JPY: 158.73015873015873, // 1 JPY = 158.73015873015873 VND (1/0.0063)
    GBP: 31250, // 1 GBP = 31250 VND (1/0.000032)
    CNY: 3333.3333333333335, // 1 CNY = 3333.3333333333335 VND (1/0.00030)
  };
  
  if (!ratesToVND[from] || !ratesToVND[to]) return 1;
  
  // Nếu from là VND, tỷ giá đơn giản là ratesToVND[to]
  if (from === "VND") {
    return ratesToVND[to];
  }
  // Nếu to là VND, tỷ giá là ratesFromVND[from] (tránh phép chia)
  if (to === "VND") {
    return ratesFromVND[from];
  }
  // Tính tỷ giá: from → VND → to
  // 1 from = ratesFromVND[from] VND
  // ratesFromVND[from] VND = ratesFromVND[from] * ratesToVND[to] to
  // VD: USD → EUR: 1 USD = 24390.243902439024 VND = 24390.243902439024 * 0.000038 EUR
  // Tỷ giá from → to = ratesFromVND[from] * ratesToVND[to]
  const rate = ratesFromVND[from] * ratesToVND[to];
  // Sử dụng toFixed(8) rồi parseFloat để giảm sai số tích lũy
  return parseFloat(rate.toFixed(8));
}

// Format số dư sau khi chuyển đổi với độ chính xác cao (8 chữ số thập phân)
function formatConvertedBalance(amount = 0, currency = "VND") {
  const numAmount = Number(amount) || 0;
  if (currency === "VND") {
    // VND: hiển thị với 8 chữ số thập phân để khớp với tỷ giá (không làm tròn về số nguyên)
    // Kiểm tra xem có phần thập phân không
    const hasDecimal = numAmount % 1 !== 0;
    if (hasDecimal) {
      const formatted = numAmount.toLocaleString("vi-VN", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 8 
      });
      return `${formatted} VND`;
    }
    // Nếu là số nguyên, hiển thị bình thường
    return `${numAmount.toLocaleString("vi-VN")} VND`;
  }
  if (currency === "USD") {
    // USD: hiển thị với 8 chữ số thập phân để khớp với tỷ giá
    const formatted = numAmount.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
    return `$${formatted}`;
  }
  // Các currency khác
  const formatted = numAmount.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 8 
  });
  return `${formatted} ${currency}`;
}

// Format tỷ giá với độ chính xác cao
function formatExchangeRate(rate = 0, toCurrency = "VND") {
  const numRate = Number(rate) || 0;
  if (toCurrency === "USD") {
    return numRate.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 8 
    });
  }
  return numRate.toLocaleString("vi-VN", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 8 
  });
}

/* ====== SUB TABS COMPONENTS ====== */

function DetailViewTab({
  wallet,
  sharedEmails,
  sharedMembers = [],
  sharedMembersLoading = false,
  sharedMembersError = "",
  canManageSharedMembers = false,
  canInviteMembers = false,
  removingMemberId = null,
  onRemoveSharedMember,
  onQuickShareEmail,
  quickShareLoading = false,
  sharedFilter,
  demoTransactions,
  isLoadingTransactions = false,
}) {
  const [showQuickShareForm, setShowQuickShareForm] = useState(false);
  const [quickShareEmail, setQuickShareEmail] = useState("");
  const [quickShareMessage, setQuickShareMessage] = useState("");

  const toggleQuickShareForm = () => {
    setShowQuickShareForm((prev) => !prev);
    setQuickShareMessage("");
    if (!showQuickShareForm) {
      setQuickShareEmail("");
    }
  };

  const handleQuickShareSubmit = async (event) => {
    event?.preventDefault?.();
    if (!onQuickShareEmail) return;
    setQuickShareMessage("");
    const result = await onQuickShareEmail(quickShareEmail);
    if (result?.success) {
      setQuickShareEmail("");
      setShowQuickShareForm(false);
      setQuickShareMessage("");
    } else if (result?.message) {
      setQuickShareMessage(result.message);
    }
  };

  const fallbackEmails = Array.isArray(sharedEmails) ? sharedEmails : [];
  const displayMembers = sharedMembers.length
    ? sharedMembers
    : fallbackEmails.map((email) => ({ email }));

  const emptyShareMessage = canManageSharedMembers
    ? "Bạn chưa chia sẻ ví này cho ai."
    : sharedFilter === "sharedWithMe"
    ? "Ví này đang được người khác chia sẻ cho bạn."
    : "Chưa có thành viên nào được chia sẻ.";

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
          const detail = member.email && member.email !== name
            ? member.email
            : member.role && member.role !== "OWNER"
              ? member.role
              : "";
          const memberId = member.userId ?? member.memberUserId ?? member.memberId;
          const allowRemove =
            canManageSharedMembers &&
            memberId &&
            (member.role || "").toUpperCase() !== "OWNER";
          const pillClass = allowRemove
            ? "wallet-share-pill"
            : "wallet-share-pill wallet-share-pill--readonly";
          const isRemoving = removingMemberId === memberId;
          return (
            <span key={key || name} className={pillClass}>
              <span className="wallet-share-pill__info">
                {name}
                {detail && <small>{detail}</small>}
              </span>
              {allowRemove && (
                <button
                  type="button"
                  onClick={() => onRemoveSharedMember?.(member)}
                  disabled={isRemoving}
                  aria-label={`Xóa ${name}`}
                >
                  {isRemoving ? "…" : "×"}
                </button>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="wallets-section wallets-section--view">
      <div className="wallets-section__header">
        <h3>Chi tiết ví</h3>
        <span>Thông tin cơ bản, chia sẻ và lịch sử giao dịch.</span>
      </div>

      <div className="wallets-detail-view">
        <div className="wallets-detail-view__col">
          <div className="wallets-detail-view__card">
            <div className="wallets-detail-view__card-header">
              <span>Thông tin &amp; chia sẻ</span>
            </div>

            <div className="wallet-detail-grid">
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">Loại ví</span>
                <span className="wallet-detail-item__value">
                  {wallet.isShared ? "Ví nhóm" : "Ví cá nhân"}
                </span>
              </div>
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">Tiền tệ</span>
                <span className="wallet-detail-item__value">
                  {wallet.currency || "VND"}
                </span>
              </div>
              <div className="wallet-detail-item">
                <span className="wallet-detail-item__label">Ngày tạo</span>
                <span className="wallet-detail-item__value">
                  {wallet.createdAt
                    ? new Date(wallet.createdAt).toLocaleDateString("vi-VN")
                    : "—"}
                </span>
              </div>
              <div className="wallet-detail-item wallet-detail-item--full">
                <span className="wallet-detail-item__label">Ghi chú</span>
                <span className="wallet-detail-item__value">
                  {wallet.note || "Chưa có ghi chú."}
                </span>
              </div>
            </div>

            <div className="wallets-detail__share">
              <div className="wallets-detail__share-header">
                <h4>Chia sẻ ví</h4>
                {canInviteMembers && (
                  <button
                    type="button"
                    className="wallet-share-add-btn"
                    onClick={toggleQuickShareForm}
                  >
                    {showQuickShareForm ? "-" : "+"}
                  </button>
                )}
              </div>
              {canInviteMembers && showQuickShareForm && (
                <form className="wallet-share-quick-form" onSubmit={handleQuickShareSubmit}>
                  <input
                    type="email"
                    value={quickShareEmail}
                    onChange={(e) => setQuickShareEmail(e.target.value)}
                    placeholder="example@gmail.com"
                  />
                  <button
                    type="submit"
                    disabled={!quickShareEmail.trim() || quickShareLoading}
                  >
                    {quickShareLoading ? "Đang chia sẻ..." : "Chia sẻ"}
                  </button>
                </form>
              )}
              {quickShareMessage && (
                <p className="wallet-share-quick-message">{quickShareMessage}</p>
              )}
              {renderShareSection()}
            </div>
          </div>
        </div>

        <div className="wallets-detail-view__col wallets-detail-view__col--history">
          <div className="wallets-detail-view__card">
            <div className="wallets-detail-view__card-header">
              <span>Lịch sử giao dịch</span>
              <span className="wallets-detail-view__counter">
                {isLoadingTransactions ? "Đang tải..." : `${demoTransactions.length} giao dịch`}
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
                  Chưa có giao dịch cho ví này.
                </p>
              ) : (
                <ul className="wallets-detail__history-list">
                  {demoTransactions.map((tx) => {
                    const txCurrency = tx.currency || wallet?.currency || "VND";
                    const absAmount = Math.abs(tx.amount);
                    
                    // Format số tiền theo currency
                    let formattedAmount = "";
                    if (txCurrency === "USD") {
                      formattedAmount = absAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      });
                    } else {
                      formattedAmount = absAmount.toLocaleString("vi-VN");
                    }
                    
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
                            {txCurrency === "USD" ? `$${formattedAmount}` : `${formattedAmount} ${txCurrency}`}
                          </span>
                        </div>

                        <div className="wallets-detail__history-meta">
                          <span className="wallets-detail__history-category">
                            {tx.categoryName || "Danh mục khác"}
                          </span>
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

function ManageMembersTab({
  wallet,
  sharedMembers = [],
  sharedMembersLoading = false,
  sharedMembersError = "",
  onRemoveSharedMember,
  removingMemberId,
}) {
  const ownerBadge = (role = "") => {
    const upper = role.toUpperCase();
    if (upper === "OWNER" || upper === "MASTER" || upper === "ADMIN") {
      return "Chủ ví";
    }
    if (upper === "USE" || upper === "USER") return "Được sử dụng";
    if (upper === "VIEW" || upper === "VIEWER") return "Chỉ xem";
    return role;
  };

  const safeMembers = Array.isArray(sharedMembers) ? sharedMembers : [];

  return (
    <div className="wallets-section wallets-section--manage">
      <div className="wallets-section__header">
        <h3>Quản lý người dùng</h3>
        <span>Kiểm soát danh sách người được chia sẻ ví "{wallet?.name}".</span>
      </div>

      <div className="wallets-manage-list">
        {sharedMembersLoading && (
          <div className="wallets-manage__state">Đang tải danh sách...</div>
        )}
        {!sharedMembersLoading && sharedMembersError && (
          <div className="wallets-manage__state wallets-manage__state--error">
            {sharedMembersError}
          </div>
        )}
        {!sharedMembersLoading && !sharedMembersError && safeMembers.length === 0 && (
          <div className="wallets-manage__state">
            Chưa có người dùng nào được chia sẻ.
          </div>
        )}

        {!sharedMembersLoading && !sharedMembersError && safeMembers.length > 0 && (
          <ul>
            {safeMembers.map((member) => {
              const memberId = member.userId ?? member.memberUserId ?? member.memberId;
              const role = member.role || "";
              const isOwner = ["OWNER", "MASTER", "ADMIN"].includes(role.toUpperCase());
              return (
                <li key={memberId || member.email || role}>
                  <div>
                    <div className="wallets-manage__name">{member.fullName || member.name || member.email}</div>
                    <div className="wallets-manage__meta">
                      {member.email && <span>{member.email}</span>}
                      {role && <span>{ownerBadge(role)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSharedMember?.(member)}
                    disabled={isOwner || removingMemberId === memberId}
                  >
                    {removingMemberId === memberId ? "Đang xóa..." : "Xóa"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TopupTab({
  wallet,
  incomeCategories = [],
  topupAmount,
  setTopupAmount,
  topupNote,
  setTopupNote,
  topupCategoryId,
  setTopupCategoryId,
  onSubmitTopup,
}) {
  // Format số tiền
  const formatMoney = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "USD") {
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    if (currency === "VND") {
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    }
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  };

  const currentBalance = Number(wallet?.balance || 0);
  const walletCurrency = wallet?.currency || "VND";

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Nạp tiền vào ví</h3>
        <span>Nạp thêm số dư cho ví hiện tại.</span>
      </div>
      <form className="wallet-form" onSubmit={onSubmitTopup} autoComplete="off">
        <div className="wallet-form__row">
          <label>
            Danh mục <span style={{ color: "#ef4444" }}>*</span>
            <select
              value={topupCategoryId}
              onChange={(e) => setTopupCategoryId(e.target.value)}
              required
            >
              <option value="">Chọn danh mục</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số tiền nạp
            <input
              type="text"
              value={formatMoneyInput(topupAmount)}
              onChange={(e) => {
                const parsed = getMoneyValue(e.target.value);
                setTopupAmount(parsed ? String(parsed) : "");
              }}
              placeholder="Nhập số tiền..."
              inputMode="numeric"
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư hiện tại:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, walletCurrency)}
              </strong>
            </div>
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={topupNote}
              onChange={(e) => setTopupNote(e.target.value)}
              placeholder="Nhập ghi chú (tùy chọn)"
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền hoặc danh mục không hợp lệ */}
        {topupAmount && (
          <div className="wallet-form__row">
            {!topupCategoryId && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Vui lòng chọn danh mục.
              </div>
            )}
            {topupCategoryId && (!topupAmount || Number(topupAmount) <= 0) && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Số tiền không hợp lệ.
              </div>
            )}
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!topupAmount || !topupCategoryId || Number(topupAmount) <= 0}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            Xác nhận nạp
          </button>
        </div>
      </form>
    </div>
  );
}

function WithdrawTab({
  wallet,
  expenseCategories = [],
  withdrawAmount,
  setWithdrawAmount,
  withdrawNote,
  setWithdrawNote,
  withdrawCategoryId,
  setWithdrawCategoryId,
  onSubmitWithdraw,
}) {
  // Format số tiền
  const formatMoney = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "USD") {
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    if (currency === "VND") {
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    }
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  };

  const currentBalance = Number(wallet?.balance || 0);
  const walletCurrency = wallet?.currency || "VND";

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Rút tiền từ ví</h3>
        <span>Rút tiền và chọn danh mục phù hợp.</span>
      </div>
      <form
        className="wallet-form"
        onSubmit={onSubmitWithdraw}
        autoComplete="off"
      >
        <div className="wallet-form__row">
          <label>
            Danh mục <span style={{ color: "#ef4444" }}>*</span>
            <select
              value={withdrawCategoryId}
              onChange={(e) => setWithdrawCategoryId(e.target.value)}
              required
            >
              <option value="">Chọn danh mục</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số tiền rút
            <input
              type="text"
              value={formatMoneyInput(withdrawAmount)}
              onChange={(e) => {
                const parsed = getMoneyValue(e.target.value);
                setWithdrawAmount(parsed ? String(parsed) : "");
              }}
              placeholder="Nhập số tiền..."
              inputMode="numeric"
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư hiện tại:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, walletCurrency)}
              </strong>
            </div>
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              placeholder="Nhập ghi chú (tùy chọn)"
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền không hợp lệ */}
        {withdrawAmount && (
          <div className="wallet-form__row">
            {!withdrawCategoryId && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Vui lòng chọn danh mục.
              </div>
            )}
            {withdrawCategoryId && Number(withdrawAmount) > currentBalance && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
                Số tiền không hợp lệ hoặc vượt quá số dư.
              </div>
            )}
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!withdrawAmount || !withdrawCategoryId || Number(withdrawAmount) > currentBalance}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            Xác nhận rút
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========= TRANSFER TAB ========= */
function TransferTab({
  wallet,
  allWallets,
  transferTargetId,
  setTransferTargetId,
  transferAmount,
  setTransferAmount,
  transferNote,
  setTransferNote,
  onSubmitTransfer,
}) {
  // Sử dụng hàm getRate đã được định nghĩa ở top level

  // Format số tiền (cho hiển thị thông thường)
  const formatMoney = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "USD") {
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    if (currency === "VND") {
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    }
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  };

  // Format số tiền chuyển đổi với độ chính xác cao (giống tỷ giá - 6 chữ số thập phân)
  const formatConvertedAmount = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "VND") {
      // VND: hiển thị với 6 chữ số thập phân để khớp với tỷ giá
      const formatted = numAmount.toLocaleString("vi-VN", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 6 
      });
      return `${formatted} VND`;
    }
    if (currency === "USD") {
      const formatted = numAmount.toLocaleString("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 8 
      });
      return `$${formatted}`;
    }
    // Các currency khác
    const formatted = numAmount.toLocaleString("vi-VN", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
    return `${formatted} ${currency}`;
  };

  const sourceCurrency = wallet.currency || "VND";
  const sourceBalance = Number(wallet?.balance || 0);
  const targetWallet =
    allWallets.find((w) => String(w.id) === String(transferTargetId)) || null;
  const targetCurrency = targetWallet?.currency || null;

  const currencyMismatch =
    !!targetWallet && !!targetCurrency && targetCurrency !== sourceCurrency;

  // Tính tỷ giá và số tiền chuyển đổi
  const exchangeRate = useMemo(() => {
    if (!currencyMismatch || !targetCurrency) return 1;
    return getRate(sourceCurrency, targetCurrency);
  }, [currencyMismatch, sourceCurrency, targetCurrency]);

  const transferAmountNum = Number(transferAmount || 0);
  const convertedAmount = useMemo(() => {
    if (!currencyMismatch || !transferAmountNum) return 0;
    // Không làm tròn để giữ đúng giá như tỷ giá (giữ 6 chữ số thập phân)
    const converted = transferAmountNum * exchangeRate;
    return converted;
  }, [transferAmountNum, exchangeRate, currencyMismatch, targetCurrency]);

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Chuyển tiền giữa các ví</h3>
        <span>
          Chuyển tiền từ ví hiện tại sang ví khác. Nếu khác loại tiền tệ, hệ
          thống sẽ tự động quy đổi theo tỷ giá.
        </span>
      </div>
      <form
        className="wallet-form"
        onSubmit={onSubmitTransfer}
        autoComplete="off"
      >
        <div className="wallet-form__row">
          <label>
            Ví nguồn
            <input
              type="text"
              value={`${wallet.name || "Ví hiện tại"} (${sourceCurrency})`}
              disabled
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư ví nguồn:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(sourceBalance, sourceCurrency)}
              </strong>
            </div>
          </label>
          <label>
            Ví đích
            <select
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
            >
              <option value="">-- Chọn ví đích --</option>
              {allWallets
                .filter((w) => w.id !== wallet.id)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || "Chưa đặt tên"}{" "}
                    {w.isShared ? "(Nhóm)" : "(Cá nhân)"} ·{" "}
                    {w.currency || "VND"}
                  </option>
                ))}
            </select>
            {targetWallet && (
              <div style={{ 
                fontSize: "0.875rem", 
                color: "#6b7280",
                marginTop: "4px"
              }}>
                Số dư ví đích:{" "}
                <strong style={{ color: "#111827" }}>
                  {formatMoney(Number(targetWallet?.balance || 0), targetCurrency || "VND")}
                </strong>
              </div>
            )}
          </label>
        </div>
        <div className="wallet-form__row">
          <label>
            Số tiền chuyển (theo {sourceCurrency})
            <input
              type="text"
              value={formatMoneyInput(transferAmount)}
              onChange={(e) => {
                const parsed = getMoneyValue(e.target.value);
                setTransferAmount(parsed ? String(parsed) : "");
              }}
              placeholder={`Nhập số tiền bằng ${sourceCurrency}`}
              inputMode="numeric"
            />
            {currencyMismatch && transferAmountNum > 0 && (
              <>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tiền chuyển đổi:{" "}
                  <strong style={{ color: "#059669" }}>
                    {formatConvertedAmount(convertedAmount, targetCurrency)}
                  </strong>
                </div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tỷ giá: 1 {sourceCurrency} = {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} {targetCurrency}
                </div>
              </>
            )}
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Ghi chú cho lần chuyển này..."
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền không hợp lệ */}
        {transferAmount && transferAmountNum > sourceBalance && (
          <div className="wallet-form__row">
            <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
              Số tiền không hợp lệ hoặc vượt quá số dư.
            </div>
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!transferTargetId || !transferAmount || transferAmountNum > sourceBalance || transferAmountNum <= 0}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            Xác nhận chuyển
          </button>
        </div>
      </form>
    </div>
  );
}

function EditTab({
  wallet,
  currencies,
  editForm,
  onEditFieldChange,
  editShareEmail,
  setEditShareEmail,
  onAddEditShareEmail,
  onRemoveEditShareEmail,
  shareWalletLoading = false,
  onSubmitEdit,
  onDeleteWallet,
}) {
  const isGroupWallet = !!wallet.isShared;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDeleteWallet?.(wallet.id);
  };

  // Sử dụng hàm getRate đã được định nghĩa ở top level

  // Format số tiền (cho hiển thị thông thường)
  const formatMoney = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    // Sử dụng tối đa 8 chữ số thập phân để hiển thị chính xác số tiền nhỏ
    if (currency === "USD") {
      // Nếu số tiền rất nhỏ (< 0.01), hiển thị nhiều chữ số thập phân hơn
      if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
        const formatted = numAmount.toLocaleString("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
        return `$${formatted}`;
      }
      const formatted = numAmount % 1 === 0 
        ? numAmount.toLocaleString("en-US")
        : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      return `$${formatted}`;
    }
    if (currency === "VND") {
      // VND: hiển thị số thập phân nếu có (khi chuyển đổi từ currency khác)
      const hasDecimal = numAmount % 1 !== 0;
      if (hasDecimal) {
        const formatted = numAmount.toLocaleString("vi-VN", { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 8 
        });
        return `${formatted} VND`;
      }
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    // Với các currency khác, cũng hiển thị tối đa 8 chữ số thập phân để chính xác
    if (Math.abs(numAmount) < 0.01 && numAmount !== 0) {
      return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
    }
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  };

  // Sử dụng các hàm formatConvertedBalance và formatExchangeRate đã được định nghĩa ở top level

  // Tính số dư mới khi currency thay đổi
  const oldCurrency = wallet?.currency || "VND";
  const newCurrency = editForm.currency;
  const currentBalance = Number(wallet?.balance || 0);
  const currencyChanged = oldCurrency !== newCurrency;
  
  const exchangeRate = useMemo(() => {
    if (!currencyChanged) return 1;
    return getRate(oldCurrency, newCurrency);
  }, [oldCurrency, newCurrency, currencyChanged]);

  const convertedBalance = useMemo(() => {
    if (!currencyChanged) return currentBalance;
    // Không làm tròn để giữ đúng giá như tỷ giá (giữ nhiều chữ số thập phân)
    const converted = currentBalance * exchangeRate;
    return converted;
  }, [currentBalance, exchangeRate, currencyChanged, newCurrency]);

  // Format thời gian tạo
  const createdAt = wallet?.createdAt
    ? new Date(wallet.createdAt).toLocaleString("vi-VN", {
        hour12: false,
      })
    : null;

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Sửa ví & chia sẻ</h3>
        <span>Chỉnh thông tin ví và quản lý người được chia sẻ.</span>
      </div>

      <form className="wallet-form" onSubmit={onSubmitEdit} autoComplete="off">
        <div className="wallet-form__row">
          <label>
            Tên ví
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => onEditFieldChange("name", e.target.value)}
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư hiện tại:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(currentBalance, oldCurrency)}
              </strong>
            </div>
          </label>
          <label>
            Tiền tệ
            <select
              value={editForm.currency}
              onChange={(e) =>
                onEditFieldChange("currency", e.target.value)
              }
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {/* Hiển thị tỷ giá và số dư sau khi chuyển đổi chỉ khi currency thay đổi */}
            {currencyChanged && wallet && (
              <>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tỷ giá: 1 {oldCurrency} = {newCurrency === "USD" 
                    ? exchangeRate.toLocaleString("en-US", { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 8 
                      })
                    : exchangeRate.toLocaleString("vi-VN", { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 8 
                      })
                  } {newCurrency}
                </div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#059669",
                  marginTop: "4px",
                  fontWeight: 600
                }}>
                  Số dư sau khi chuyển đổi:{" "}
                  <strong>
                    {formatConvertedBalance(convertedBalance, newCurrency)}
                  </strong>
                </div>
              </>
            )}
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={editForm.note}
              onChange={(e) => onEditFieldChange("note", e.target.value)}
            />
          </label>
        </div>

        <div className="wallet-form__share-block">
          <label className="wallet-form__full">
            Thêm email chia sẻ
            <div className="wallet-form__share-row">
              <input
                type="email"
                value={editShareEmail}
                onChange={(e) => setEditShareEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={onAddEditShareEmail}
                disabled={!editShareEmail?.trim() || shareWalletLoading}
              >
                {shareWalletLoading ? "Đang chia sẻ..." : "Thêm"}
              </button>
            </div>
          </label>

          {(editForm.sharedEmails || []).length > 0 && (
            <div className="wallet-share-list">
              {editForm.sharedEmails.map((email) => (
                <span key={email} className="wallet-share-pill">
                  {email}
                  <button
                    type="button"
                    onClick={() => onRemoveEditShareEmail(email)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hiển thị thời gian tạo */}
        {createdAt && (
          <div className="wallet-form__row" style={{ 
            padding: "10px 12px", 
            border: "1px dashed #d1d5db",
            borderRadius: "10px", 
            display: "flex", 
            justifyContent: "space-between",
            color: "#6b7280",
            marginBottom: "14px"
          }}>
            <span>Thời gian tạo</span>
            <strong style={{ color: "#111827" }}>{createdAt}</strong>
          </div>
        )}

        <div className="wallet-form__footer">
          {!isGroupWallet && (
            <label className="wallet-form__checkbox">
              <input
                type="checkbox"
                checked={editForm.isDefault}
                onChange={(e) =>
                  onEditFieldChange("isDefault", e.target.checked)
                }
              />
              <span>Đặt làm ví mặc định</span>
            </label>
          )}

          <div className="wallet-form__actions">
            {onDeleteWallet && (
              <button
                type="button"
                className="wallets-btn wallets-btn--danger-outline"
                onClick={handleOpenDelete}
              >
                Xóa ví này
              </button>
            )}
            <button type="submit" className="wallets-btn wallets-btn--primary">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Xác nhận xóa ví"
        message={`Bạn có chắc chắn muốn xóa ví "${
          wallet.name || "Không tên"
        }"? Hành động này không thể hoàn tác.`}
        okText="Xóa ví"
        cancelText="Hủy"
        danger={true}
        onOk={handleConfirmDelete}
        onClose={handleCloseDelete}
      />
    </div>
  );
}

/* ===================== MERGE TAB ===================== */
function MergeTab({
  wallet,
  allWallets,
  mergeTargetId,
  setMergeTargetId,
  onSubmitMerge,
  onChangeSelectedWallet,
}) {
  const [step, setStep] = useState(2);
  const [targetId, setTargetId] = useState(mergeTargetId || "");
  const [currencyMode, setCurrencyMode] = useState("keepTarget");
  const [agree, setAgree] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [direction, setDirection] = useState("this_into_other");
  const [searchTerm, setSearchTerm] = useState("");
  const [makeTargetDefault, setMakeTargetDefault] = useState(false);

  useEffect(() => {
    if (!processing) return;
    setProgress(0);
    let v = 0;
    const timer = setInterval(() => {
      v += 15;
      if (v >= 100) {
        v = 100;
        clearInterval(timer);
        setTimeout(() => setProcessing(false), 400);
      }
      setProgress(v);
    }, 260);
    return () => clearInterval(timer);
  }, [processing]);

  useEffect(() => {
    if (setMergeTargetId) setMergeTargetId(targetId);
  }, [targetId, setMergeTargetId]);

  useEffect(() => {
    setTargetId("");
    if (setMergeTargetId) setMergeTargetId("");
  }, [direction, setMergeTargetId]);

  useEffect(() => {
    setMakeTargetDefault(false);
  }, [targetId, direction]);

  // Tính toán tất cả các giá trị trước khi có early return (để hooks được gọi đúng thứ tự)
  const currentWallet = wallet;
  const thisName = currentWallet?.name || "Ví hiện tại";

  const selectableWallets = useMemo(() => {
    if (!currentWallet) return [];
    return (allWallets || []).filter((w) => w.id !== currentWallet.id);
  }, [allWallets, currentWallet]);

  const filteredWallets = useMemo(() => {
    return selectableWallets.filter((w) => {
      if (!searchTerm.trim()) return true;
      const name = (w.name || "").toLowerCase();
      return name.includes(searchTerm.trim().toLowerCase());
    });
  }, [selectableWallets, searchTerm]);

  const selectedWallet = useMemo(() => {
    return selectableWallets.find((w) => String(w.id) === String(targetId));
  }, [selectableWallets, targetId]);

  const isThisIntoOther = direction === "this_into_other";

  const sourceWallet = useMemo(() => {
    if (!currentWallet) return null;
    return direction === "this_into_other" ? currentWallet : selectedWallet || null;
  }, [currentWallet, direction, selectedWallet]);

  const targetWallet = useMemo(() => {
    if (!currentWallet) return null;
    return direction === "this_into_other" ? selectedWallet || null : currentWallet;
  }, [currentWallet, direction, selectedWallet]);

  const srcCurrency = sourceWallet?.currency || "VND";
  const srcName = sourceWallet?.name || "Ví nguồn";
  const srcBalance = useMemo(() => {
    return Number(sourceWallet?.balance ?? sourceWallet?.current ?? 0) || 0;
  }, [sourceWallet]);
  const srcTxCount = useMemo(() => {
    return sourceWallet?.txCount ?? sourceWallet?.transactionCount ?? 0;
  }, [sourceWallet]);

  const tgtCurrency = targetWallet?.currency || srcCurrency;
  const tgtName = targetWallet?.name || "Ví đích";
  const tgtBalance = useMemo(() => {
    return Number(targetWallet?.balance ?? targetWallet?.current ?? 0) || 0;
  }, [targetWallet]);
  const tgtTxCount = useMemo(() => {
    return targetWallet?.txCount ?? targetWallet?.transactionCount ?? 0;
  }, [targetWallet]);

  const currentIsDefault = !!currentWallet?.isDefault;
  const selectedIsDefault = !!selectedWallet?.isDefault;

  const sourceIsDefault = useMemo(() => {
    return (direction === "this_into_other" && currentIsDefault) ||
      (direction === "other_into_this" && selectedIsDefault);
  }, [direction, currentIsDefault, selectedIsDefault]);

  const targetIsDefault = useMemo(() => {
    return (direction === "this_into_other" && selectedIsDefault) ||
      (direction === "other_into_this" && currentIsDefault);
  }, [direction, selectedIsDefault, currentIsDefault]);

  const differentCurrency = useMemo(() => {
    return !!targetWallet && srcCurrency !== tgtCurrency;
  }, [targetWallet, srcCurrency, tgtCurrency]);
  
  // Tính tỷ giá thực tế (giống EditTab)
  const exchangeRate = useMemo(() => {
    if (!differentCurrency || !sourceWallet || !targetWallet) return 1;
    if (currencyMode === "keepTarget") {
      // Chuyển đổi từ srcCurrency sang tgtCurrency
      return getRate(srcCurrency, tgtCurrency);
    }
    // Chuyển đổi từ tgtCurrency sang srcCurrency
    return getRate(tgtCurrency, srcCurrency);
  }, [differentCurrency, srcCurrency, tgtCurrency, currencyMode, sourceWallet, targetWallet]);

  const convertedSourceAmount = useMemo(() => {
    if (!differentCurrency || !sourceWallet) return srcBalance;
    if (currencyMode === "keepTarget") {
      // Chuyển đổi số dư ví nguồn sang currency của ví đích
      const converted = srcBalance * getRate(srcCurrency, tgtCurrency);
      return converted; // Không làm tròn để giữ độ chính xác
    }
    return srcBalance;
  }, [differentCurrency, srcBalance, srcCurrency, tgtCurrency, currencyMode, sourceWallet]);

  const convertedTargetAmount = useMemo(() => {
    if (!differentCurrency || !targetWallet) return tgtBalance;
    if (currencyMode === "keepSource") {
      // Chuyển đổi số dư ví đích sang currency của ví nguồn
      const converted = tgtBalance * getRate(tgtCurrency, srcCurrency);
      return converted; // Không làm tròn để giữ độ chính xác
    }
    return tgtBalance;
  }, [differentCurrency, tgtBalance, srcCurrency, tgtCurrency, currencyMode, targetWallet]);

  const finalCurrency = useMemo(() => {
    if (!differentCurrency) return tgtCurrency;
    return currencyMode === "keepTarget" ? tgtCurrency : srcCurrency;
  }, [differentCurrency, tgtCurrency, currencyMode, srcCurrency]);

  const finalBalance = useMemo(() => {
    if (!targetWallet || !sourceWallet) return srcBalance;
    if (!differentCurrency) {
      return srcBalance + tgtBalance;
    }
    if (currencyMode === "keepSource") {
      return srcBalance + convertedTargetAmount;
    }
    return tgtBalance + convertedSourceAmount;
  }, [targetWallet, sourceWallet, srcBalance, tgtBalance, differentCurrency, currencyMode, convertedSourceAmount, convertedTargetAmount]);

  // Early return sau khi tất cả hooks đã được gọi
  if (!wallet) {
    return (
      <div className="wallets-section">
        <p>Hãy chọn một ví để gộp.</p>
      </div>
    );
  }

  const needDefaultConfirmation = (() => {
    if (!selectedWallet) return false;
    if (currentIsDefault && direction === "this_into_other") {
      return true;
    }

    if (
      !currentIsDefault &&
      direction === "other_into_this" &&
      selectedIsDefault
    ) {
      return true;
    }

    return false;
  })();

  const handleNextFromStep2 = () => {
    if (!targetId) return;
    if (needDefaultConfirmation) {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleConfirmMerge = () => {
    if (!targetWallet || !sourceWallet || !agree) return;
    if (!onSubmitMerge) return;

    const sourceId = sourceWallet.id;
    const targetIdFinal = targetWallet.id;
    if (!sourceId || !targetIdFinal) return;

    const payload = {
      sourceWalletId: sourceId,
      targetWalletId: targetIdFinal,
      currencyMode,
      direction,
      setTargetAsDefault: !!makeTargetDefault,
    };

    setStep(6);
    setProcessing(true);

    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      onSubmitMerge(fakeEvent, payload);

      if (onChangeSelectedWallet && targetIdFinal) {
        onChangeSelectedWallet(targetIdFinal);
      }
    }, 3000);
  };

  /* STEP 2 */
  const renderStep2 = () => {
    const currentBal =
      Number(currentWallet.balance ?? currentWallet.current ?? 0) || 0;
    const currentCur = currentWallet.currency || "VND";
    const currentTx = currentWallet?.txCount ?? currentWallet?.transactionCount ?? 0;

    const selectedBal =
      selectedWallet &&
      (Number(selectedWallet.balance ?? selectedWallet.current ?? 0) || 0);
    const selectedCur = selectedWallet?.currency || "VND";

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">Bước 2 – Chọn ví đích</div>
          <div className="wallet-merge__step-pill">Gộp ví · 5 bước</div>
        </div>

        <div className="wallet-merge__box">
          {selectedWallet && (
            <div className="wallet-merge__relation">
              {isThisIntoOther ? (
                <>
                  Gộp ví <strong>{thisName}</strong> vào{" "}
                  <strong>{selectedWallet.name || "Ví được chọn"}</strong>
                </>
              ) : (
                <>
                  Gộp ví{" "}
                  <strong>{selectedWallet.name || "Ví được chọn"}</strong> vào{" "}
                  <strong>{thisName}</strong>
                </>
              )}
            </div>
          )}

          <div className="wallet-merge__grid-2">
            <div className="wallet-merge__summary-wrapper">
              <div className="wallet-merge__summary-wrapper-header">
                <h4>Tóm tắt ví nguồn &amp; ví đích</h4>
                <span>Kiểm tra lại trước khi tiếp tục gộp ví.</span>
              </div>

              <div className="wallet-merge__summary-col">
                <div className="wallet-merge__summary-card wallet-merge__summary-card--source">
                  <div className="wallet-merge__summary-title">VÍ HIỆN TẠI</div>
                  <div className="wallet-merge__summary-name">{thisName}</div>

                  <div className="wallet-merge__summary-row">
                    <span>Tiền tệ</span>
                    <span>{currentCur}</span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Số dư</span>
                    <span>
                      {formatConvertedBalance(currentBal, currentCur)}
                    </span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Số giao dịch</span>
                    <span>{currentTx}</span>
                  </div>
                  {currentIsDefault && (
                    <div className="wallet-merge__target-warning">
                      Đây là ví mặc định hiện tại.
                    </div>
                  )}
                </div>

                <div className="wallet-merge__summary-card wallet-merge__summary-card--target">
                  <div className="wallet-merge__summary-title">
                    VÍ ĐÍCH ĐANG CHỌN
                  </div>
                  <div className="wallet-merge__summary-name">
                    {selectedWallet
                      ? selectedWallet.name || "Ví được chọn"
                      : "Chưa chọn ví đích"}
                  </div>

                  <div className="wallet-merge__summary-row">
                    <span>Tiền tệ</span>
                    <span>{selectedWallet ? selectedCur : "—"}</span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Số dư</span>
                    <span>
                      {selectedWallet
                        ? formatConvertedBalance(selectedBal, selectedCur)
                        : "—"}
                    </span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Loại ví</span>
                    <span>
                      {selectedWallet
                        ? selectedWallet.isShared
                          ? "Ví nhóm"
                          : "Ví cá nhân"
                        : "—"}
                    </span>
                  </div>
                  {selectedWallet?.isDefault && (
                    <div className="wallet-merge__target-warning">
                      Ví này đang là ví mặc định.
                    </div>
                  )}
                  {selectedWallet &&
                    (selectedWallet.currency || "VND") !== currentCur && (
                      <div className="wallet-merge__target-warning">
                        Khác loại tiền tệ với ví hiện tại
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="wallet-merge__right-wrapper">
              <div className="wallet-merge__right-header">
                <h4>Thiết lập gộp &amp; chọn ví</h4>
                <span>Chọn chiều gộp và ví đích muốn gộp.</span>
              </div>

              <div className="wallet-merge__right">
                <div className="wallet-merge__direction">
                  <button
                    type="button"
                    className={
                      isThisIntoOther
                        ? "wallet-merge__direction-btn wallet-merge__direction-btn--active"
                        : "wallet-merge__direction-btn"
                    }
                    onClick={() => setDirection("this_into_other")}
                  >
                    Gộp ví này vào ví khác
                  </button>
                  <button
                    type="button"
                    className={
                      !isThisIntoOther
                        ? "wallet-merge__direction-btn wallet-merge__direction-btn--active"
                        : "wallet-merge__direction-btn"
                    }
                    onClick={() => setDirection("other_into_this")}
                  >
                    Gộp ví khác vào ví này
                  </button>
                </div>
                <p className="wallet-merge__direction-note">
                  {isThisIntoOther
                    ? "Số dư và giao dịch của ví hiện tại sẽ chuyển sang ví bạn chọn."
                    : "Số dư và giao dịch của ví được chọn sẽ được gộp vào ví hiện tại."}
                </p>

                <div className="wallet-merge__section-title">
                  {isThisIntoOther
                    ? "Chọn ví đích để gộp vào"
                    : "Chọn ví cần gộp vào ví này"}
                </div>
                <p className="wallet-merge__hint">
                  Chỉ những ví khác với ví hiện tại mới được hiển thị.
                </p>

                <div className="wallet-merge__search">
                  <input
                    type="text"
                    placeholder="Tìm theo tên ví..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="wallet-merge__target-list">
                  {filteredWallets.length === 0 && (
                    <p className="wallet-merge__empty">
                      Không tìm thấy ví nào phù hợp. Hãy thử từ khóa khác.
                    </p>
                  )}

                  {filteredWallets.map((w) => {
                    const checked = String(targetId) === String(w.id);
                    const bal =
                      Number(w.balance ?? w.current ?? 0)?.toLocaleString(
                        "vi-VN"
                      ) || "0";
                    const isDiff =
                      (w.currency || "VND") !== currentCur;

                    return (
                      <label
                        key={w.id}
                        className={
                          checked
                            ? "wallet-merge__target wallet-merge__target--active"
                            : "wallet-merge__target"
                        }
                      >
                        <input
                          type="radio"
                          name="mergeTarget"
                          value={w.id}
                          checked={checked}
                          onChange={() => setTargetId(String(w.id))}
                        />
                        <div className="wallet-merge__target-main">
                          <div className="wallet-merge__target-top">
                            <span className="wallet-merge__target-name">
                              {w.name || "Ví không tên"}
                            </span>
                            <span className="wallet-merge__target-chip">
                              {w.isShared ? "Ví nhóm" : "Ví cá nhân"}
                            </span>
                          </div>
                          <div className="wallet-merge__target-row">
                            <span>Tiền tệ</span>
                            <span>{w.currency || "VND"}</span>
                          </div>
                          <div className="wallet-merge__target-row">
                            <span>Số dư</span>
                            <span>
                              {formatConvertedBalance(Number(w.balance ?? w.current ?? 0), w.currency || "VND")}
                            </span>
                          </div>
                          {w.isDefault && (
                            <div className="wallet-merge__target-warning">
                              Ví này đang là ví mặc định.
                            </div>
                          )}
                          {isDiff && (
                            <div className="wallet-merge__target-warning">
                              Khác loại tiền tệ với ví hiện tại
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="wallet-merge__actions">
                  <button
                    type="button"
                    className="wallets-btn wallets-btn--ghost"
                    onClick={() => setStep(2)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="wallets-btn wallets-btn--primary"
                    disabled={!targetId}
                    onClick={handleNextFromStep2}
                  >
                    Tiếp tục
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3DefaultHandling = () => {
    if (!selectedWallet || !sourceWallet || !targetWallet) return null;

    if (sourceIsDefault) {
      const defaultName = sourceWallet?.name || "Ví mặc định hiện tại";
      return (
        <div className="wallets-section wallet-merge__panel">
          <div className="wallet-merge__step-header">
            <div className="wallet-merge__step-label">
              Bước 3 – Xử lý ví mặc định
            </div>
            <div className="wallet-merge__step-pill">Cảnh báo quan trọng</div>
          </div>

          <div className="wallet-merge__box">
            <div className="wallet-merge__section-block wallet-merge__section-block--warning">
              <div className="wallet-merge__section-title">
                Bạn đang gộp một ví mặc định
              </div>
              <ul className="wallet-merge__list">
                <li>
                  <strong>{defaultName}</strong> hiện đang là ví mặc định của
                  hệ thống.
                </li>
                <li>
                  Sau khi gộp, ví <strong>{defaultName}</strong> sẽ bị xoá.
                </li>
                <li>
                  Bạn cần quyết định ví nào sẽ là ví mặc định mới sau khi gộp.
                </li>
              </ul>
            </div>

            <div className="wallet-merge__section-block">
              <div className="wallet-merge__section-title">
                Chọn cách xử lý ví mặc định
              </div>
              <p className="wallet-merge__hint">
                Ví đích hiện tại: <strong>{tgtName}</strong>
              </p>

              <div className="wallet-merge__options">
                <label className="wallet-merge__option">
                  <input
                    type="radio"
                    name="defaultHandling"
                    value="makeTargetDefault"
                    checked={makeTargetDefault === true}
                    onChange={() => setMakeTargetDefault(true)}
                  />
                  <div>
                    <div className="wallet-merge__option-title">
                      Đặt ví đích làm ví mặc định mới (khuyến nghị)
                    </div>
                    <div className="wallet-merge__option-desc">
                      Sau khi gộp, ví{" "}
                      <strong>{tgtName || "ví đích"}</strong> sẽ trở thành ví
                      mặc định.
                    </div>
                  </div>
                </label>

                <label className="wallet-merge__option">
                  <input
                    type="radio"
                    name="defaultHandling"
                    value="noDefault"
                    checked={makeTargetDefault === false}
                    onChange={() => setMakeTargetDefault(false)}
                  />
                  <div>
                    <div className="wallet-merge__option-title">
                      Không đặt ví mặc định sau khi gộp
                    </div>
                    <div className="wallet-merge__option-desc">
                      Hệ thống sẽ tạm thời không có ví mặc định. Bạn có thể
                      chọn lại sau trong phần quản lý ví.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(4)}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 3 – Xử lý ví mặc định
          </div>
          <div className="wallet-merge__step-pill">Thiết lập an toàn</div>
        </div>

        <div className="wallet-merge__box">
          <div className="wallet-merge__section-block wallet-merge__section-block--warning">
            <div className="wallet-merge__section-title">
              Bạn đang gộp một ví mặc định vào ví thường
            </div>
            <ul className="wallet-merge__list">
              <li>
                Ví <strong>{srcName}</strong> hiện đang là ví mặc định.
              </li>
              <li>
                Sau khi gộp, ví mặc định này sẽ bị xoá và chỉ còn ví{" "}
                <strong>{tgtName}</strong>.
              </li>
              <li>
                Bạn cần quyết định có đặt ví <strong>{tgtName}</strong> làm ví
                mặc định mới hay không.
              </li>
            </ul>
          </div>

          <div className="wallet-merge__section-block">
            <div className="wallet-merge__section-title">
              Cài đặt ví mặc định sau khi gộp
            </div>
            <div className="wallet-merge__options">
              <label className="wallet-merge__option">
                <input
                  type="radio"
                  name="defaultHandling2"
                  value="makeTargetDefault"
                  checked={makeTargetDefault === true}
                  onChange={() => setMakeTargetDefault(true)}
                />
                <div>
                  <div className="wallet-merge__option-title">
                    Đặt ví đích làm ví mặc định
                  </div>
                  <div className="wallet-merge__option-desc">
                    Sau khi gộp, ví <strong>{tgtName}</strong> sẽ được đặt làm
                    ví mặc định của hệ thống.
                  </div>
                </div>
              </label>

              <label className="wallet-merge__option">
                <input
                  type="radio"
                  name="defaultHandling2"
                  value="keepCurrent"
                  checked={makeTargetDefault === false}
                  onChange={() => setMakeTargetDefault(false)}
                />
                <div>
                  <div className="wallet-merge__option-title">
                    Không tự động thay đổi ví mặc định
                  </div>
                  <div className="wallet-merge__option-desc">
                    Bạn có thể tự chọn lại ví mặc định sau ở phần quản lý ví.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(2)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--primary"
              onClick={() => setStep(4)}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep4Currency = () => {
    if (!targetWallet) return null;

    if (!differentCurrency) {
      return (
        <div className="wallets-section wallet-merge__panel">
          <div className="wallet-merge__step-header">
            <div className="wallet-merge__step-label">
              Bước 4 – Chọn loại tiền đích
            </div>
            <div className="wallet-merge__step-pill">
              Hai ví cùng loại tiền
            </div>
          </div>

          <div className="wallet-merge__box">
            <p className="wallet-merge__hint">
              Cả hai ví đều sử dụng{" "}
              <strong>{tgtCurrency}</strong>. Hệ thống sẽ giữ nguyên loại tiền
              này cho ví sau khi gộp.
            </p>

            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(5)}
              >
                Xem trước kết quả
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 4 – Chọn loại tiền đích
          </div>
          <div className="wallet-merge__step-pill">
            Hai ví khác loại tiền
          </div>
        </div>

        <div className="wallet-merge__box">
          <div className="wallet-merge__grid-2 wallet-merge__grid-2--equal">
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ NGUỒN</div>
              <div className="wallet-merge__summary-name">{srcName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{srcCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(srcBalance, srcCurrency)}
                </span>
              </div>
            </div>
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ ĐÍCH</div>
              <div className="wallet-merge__summary-name">{tgtName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{tgtCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(tgtBalance, tgtCurrency)}
                </span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-title">
            Cách xử lý khác loại tiền
          </div>
          <p className="wallet-merge__hint">
            Chọn loại tiền sẽ được giữ lại sau khi gộp. Hệ thống sẽ tự động quy đổi theo tỷ giá hiện tại.
          </p>

          <div className="wallet-merge__options">
            <label className="wallet-merge__option">
              <input
                type="radio"
                name="currencyMode"
                value="keepTarget"
                checked={currencyMode === "keepTarget"}
                onChange={() => setCurrencyMode("keepTarget")}
              />
              <div>
                <div className="wallet-merge__option-title">
                  Giữ {tgtCurrency} (loại tiền của ví đích)
                </div>
                <div className="wallet-merge__option-desc">
                  Số dư ví nguồn sẽ được quy đổi:
                </div>
                <div className="wallet-merge__option-desc">
                  {formatConvertedBalance(srcBalance, srcCurrency)} →{" "}
                  {formatConvertedBalance(convertedSourceAmount, tgtCurrency)}
                </div>
                {differentCurrency && (
                  <div className="wallet-merge__option-foot">
                    Tỷ giá: 1 {srcCurrency} = {formatExchangeRate(getRate(srcCurrency, tgtCurrency), tgtCurrency)} {tgtCurrency}
                  </div>
                )}
              </div>
            </label>

            <label className="wallet-merge__option">
              <input
                type="radio"
                name="currencyMode"
                value="keepSource"
                checked={currencyMode === "keepSource"}
                onChange={() => setCurrencyMode("keepSource")}
              />
              <div>
                <div className="wallet-merge__option-title">
                  Giữ {srcCurrency} (loại tiền của ví nguồn)
                </div>
                <div className="wallet-merge__option-desc">
                  Số dư ví đích sẽ được quy đổi:
                </div>
                <div className="wallet-merge__option-desc">
                  {formatConvertedBalance(tgtBalance, tgtCurrency)} →{" "}
                  {formatConvertedBalance(convertedTargetAmount, srcCurrency)}
                </div>
                {differentCurrency && (
                  <div className="wallet-merge__option-foot">
                    Tỷ giá: 1 {tgtCurrency} = {formatExchangeRate(getRate(tgtCurrency, srcCurrency), srcCurrency)} {srcCurrency}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(2)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--primary"
              onClick={() => setStep(5)}
            >
              Xem trước kết quả
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep5Preview = () => {
    if (!targetWallet || !sourceWallet) return null;

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 5 – Xem trước kết quả
          </div>
          <div className="wallet-merge__step-pill">Kiểm tra lần cuối</div>
        </div>

        <div className="wallet-merge__box wallet-merge__box--preview">
          <div className="wallet-merge__grid-2 wallet-merge__grid-2--equal">
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ NGUỒN</div>
              <div className="wallet-merge__summary-name">{srcName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{srcCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(srcBalance, srcCurrency)}
                </span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Giao dịch</span>
                <span>{srcTxCount}</span>
              </div>
            </div>

            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ ĐÍCH</div>
              <div className="wallet-merge__summary-name">{tgtName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ hiện tại</span>
                <span>{tgtCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư hiện tại</span>
                <span>
                  {formatConvertedBalance(tgtBalance, tgtCurrency)}
                </span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Giao dịch hiện tại</span>
                <span>{tgtTxCount}</span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-divider" />

          <div className="wallet-merge__section-block">
            <div className="wallet-merge__section-title">
              Kết quả sau khi gộp
            </div>
            <div className="wallet-merge__result-grid">
              <div className="wallet-merge__result-row">
                <span>Ví đích</span>
                <span>{tgtName}</span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Loại tiền sau gộp</span>
                <span>{finalCurrency}</span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Số dư dự kiến</span>
                <span>
                  {formatConvertedBalance(finalBalance, finalCurrency)}
                </span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Tổng giao dịch</span>
                <span>{srcTxCount + tgtTxCount}</span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-block wallet-merge__section-block--warning">
            <div className="wallet-merge__section-title">Xác nhận</div>
            <ul className="wallet-merge__list">
              <li>Ví nguồn sẽ bị xoá sau khi gộp.</li>
              <li>
                Các giao dịch sẽ được chuyển sang ví đích theo loại tiền đã
                chọn.
              </li>
              <li>Hành động này không thể hoàn tác.</li>
            </ul>

            <label className="wallet-merge__agree">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>Tôi đã đọc và đồng ý với điều khoản gộp ví.</span>
            </label>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(4)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--danger"
              disabled={!agree}
              onClick={handleConfirmMerge}
            >
              Xác nhận gộp ví
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep6Processing = () => (
    <div className="wallets-section wallet-merge__panel">
      <div className="wallet-merge__step-header">
        <div className="wallet-merge__step-label">Xử lý và hoàn tất</div>
        <div className="wallet-merge__step-pill">Hoàn thành</div>
      </div>

      <div className="wallet-merge__box">
        {processing ? (
          <div className="wallet-merge__processing">
            <div className="wallet-merge__section-title">
              Hệ thống đang gộp ví
            </div>
            <p className="wallet-merge__hint">
              Đang chuyển số dư & giao dịch sang ví đích...
            </p>
            <div className="wallet-merge__progress-bar">
              <div
                className="wallet-merge__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="wallet-merge__progress-text">
              {progress}% hoàn thành
            </div>
          </div>
        ) : (
          <div className="wallet-merge__success">
            <div className="wallet-merge__section-title">
              Đã gộp ví thành công
            </div>
            <p className="wallet-merge__hint">
              Hệ thống đã cập nhật lại số dư & giao dịch theo thiết lập của
              bạn.
            </p>
            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(2)}
              >
                Quay lại danh sách ví
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (step === 2) return renderStep2();
  if (step === 3) return renderStep3DefaultHandling();
  if (step === 4) return renderStep4Currency();
  if (step === 5) return renderStep5Preview();
  return renderStep6Processing();
}

function ConvertTab({
  wallet,
  allWallets = [],
  onConvertToGroup,
  onChangeSelectedWallet,
}) {
  const isDefault = !!wallet.isDefault;
  const isShared = !!wallet.isShared;

  const personalWallets = (allWallets || []).filter((w) => !w.isShared);
  const candidateDefaults = personalWallets.filter((w) => w.id !== wallet.id);
  const hasCandidate = candidateDefaults.length > 0;

  const [defaultMode, setDefaultMode] = useState(
    hasCandidate ? "chooseOther" : "noDefault"
  );
  const [newDefaultId, setNewDefaultId] = useState(
    hasCandidate ? String(candidateDefaults[0].id) : ""
  );

  useEffect(() => {
    const newCandidates = (allWallets || []).filter(
      (w) => !w.isShared && w.id !== wallet.id
    );
    const hasCandidateNow = newCandidates.length > 0;

    setDefaultMode(hasCandidateNow ? "chooseOther" : "noDefault");
    setNewDefaultId(hasCandidateNow ? String(newCandidates[0].id) : "");
  }, [wallet.id, allWallets]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let options = null;

    if (isDefault && !isShared) {
      if (hasCandidate && defaultMode === "chooseOther" && newDefaultId) {
        options = {
          newDefaultWalletId: Number(newDefaultId),
          noDefault: false,
        };
      } else {
        options = {
          newDefaultWalletId: null,
          noDefault: true,
        };
      }
    }

    onConvertToGroup?.(e, options || null);

    if (onChangeSelectedWallet) {
      onChangeSelectedWallet(null);
    }
  };

  const isSubmitDisabled =
    wallet.isShared ||
    (isDefault &&
      !isShared &&
      defaultMode === "chooseOther" &&
      hasCandidate &&
      !newDefaultId);

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Chuyển thành ví nhóm</h3>
        <span>
          Sau khi chuyển, ví này sẽ trở thành ví nhóm. Bạn có thể thêm thành
          viên ở phần chia sẻ.
        </span>
      </div>

      <form className="wallet-form" onSubmit={handleSubmit}>
        <div className="wallet-form__row">
          <label className="wallet-form__full">
            <span className="wallet-detail-item__label">Tóm tắt ví</span>
            <div className="wallet-detail-item" style={{ marginTop: 4 }}>
              <div className="wallet-detail-item__value">
                <strong>Tên ví:</strong> {wallet.name}
              </div>
              <div className="wallet-detail-item__value">
                <strong>Trạng thái:</strong>{" "}
                {wallet.isShared ? "Đã là ví nhóm" : "Hiện là ví cá nhân"}
              </div>
              {isDefault && !wallet.isShared && (
                <div
                  className="wallet-detail-item__value"
                  style={{ marginTop: 4 }}
                >
                  <strong>Ghi chú:</strong> Ví này đang là ví mặc định.
                </div>
              )}
            </div>
          </label>
        </div>

        {isDefault && !wallet.isShared && (
          <>
            <div className="wallet-merge__section-block wallet-merge__section-block--warning">
              <div className="wallet-merge__section-title">
                Bạn đang chuyển một ví mặc định sang ví nhóm
              </div>
              <ul className="wallet-merge__list">
                <li>
                  <strong>{wallet.name}</strong> hiện đang là ví mặc định của hệ
                  thống.
                </li>
                <li>
                  Ví nhóm không được phép đặt làm ví mặc định, vì vậy cần chọn
                  cách xử lý ví mặc định hiện tại.
                </li>
              </ul>
            </div>

            <div className="wallet-merge__section-block">
              <div className="wallet-merge__section-title">
                Chọn cách xử lý ví mặc định
              </div>

              {hasCandidate ? (
                <div className="wallet-merge__options">
                  <label className="wallet-merge__option">
                    <input
                      type="radio"
                      name="defaultBehavior"
                      value="chooseOther"
                      checked={defaultMode === "chooseOther"}
                      onChange={() => setDefaultMode("chooseOther")}
                    />
                    <div>
                      <div className="wallet-merge__option-title">
                        Chọn một ví cá nhân khác làm ví mặc định mới
                      </div>
                      <div className="wallet-merge__option-desc">
                        Sau khi chuyển sang ví nhóm, ví được chọn dưới đây sẽ trở
                        thành ví mặc định.
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <select
                          value={newDefaultId}
                          disabled={defaultMode !== "chooseOther"}
                          onChange={(e) => setNewDefaultId(e.target.value)}
                        >
                          {candidateDefaults.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name || "Ví cá nhân khác"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>

                  <label className="wallet-merge__option">
                    <input
                      type="radio"
                      name="defaultBehavior"
                      value="noDefault"
                      checked={defaultMode === "noDefault"}
                      onChange={() => setDefaultMode("noDefault")}
                    />
                    <div>
                      <div className="wallet-merge__option-title">
                        Tạm thời không có ví mặc định
                      </div>
                      <div className="wallet-merge__option-desc">
                        Hệ thống sẽ tạm thời không có ví mặc định. Bạn có thể
                        đặt lại ví mặc định sau trong phần quản lý ví.
                      </div>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="wallet-merge__section-block">
                  <p className="wallet-merge__hint">
                    Hiện tại bạn không có ví cá nhân nào khác. Sau khi chuyển
                    ví này thành ví nhóm, hệ thống sẽ tạm thời không có ví mặc
                    định. Bạn có thể tạo ví cá nhân mới và đặt làm mặc định sau.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={isSubmitDisabled}
          >
            {wallet.isShared ? "Đã là ví nhóm" : "Chuyển sang ví nhóm"}
          </button>
        </div>
      </form>
    </div>
  );
}

