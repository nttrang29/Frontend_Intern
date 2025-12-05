import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { formatMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import { walletAPI } from "../../services/wallet.service";
import { useLanguage } from "../../contexts/LanguageContext";
import Toast from "../common/Toast/Toast";
import { logActivity } from "../../utils/activityLogger";
import { useWalletData } from "../../contexts/WalletDataContext";
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

const NOTE_MAX_LENGTH = 60;

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

  const walletContext = useWalletData();
  const { loadWallets } = walletContext || {};

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
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const canManageSharedMembers = useMemo(() => {
    if (!wallet) return false;
    // Ví nhóm luôn có danh sách thành viên
    if (wallet.isShared) return true;
    // Ví cá nhân có thể có sharedEmails hoặc membersCount
    if (Array.isArray(wallet.sharedEmails) && wallet.sharedEmails.length > 0) return true;
    if (Number(wallet.membersCount || 0) > 1) return true;
    return false;
  }, [wallet]);
  

  // Robustly extract role from different possible API shapes
  const getRoleFromWallet = (w) => {
    if (!w) return "";
    const candidates = [
      w.walletRole,
      w.sharedRole,
      w.role,
      w.accessRole,
      w.currentUserRole,
      w.myRole,
      w.currentRole,
      w.roleName,
      w.membershipRole,
      w.userRole,
    ];
    for (const c of candidates) {
      if (!c && c !== 0) continue;
      if (typeof c === "string") return c.toUpperCase();
      if (typeof c === "number") return String(c).toUpperCase();
      if (typeof c === "object") {
        // Try common nested props
        if (typeof c.role === "string") return c.role.toUpperCase();
        if (typeof c.name === "string") return c.name.toUpperCase();
        if (typeof c.value === "string") return c.value.toUpperCase();
      }
    }
    return "";
  };

  const userRole = getRoleFromWallet(wallet);
  const isOwnerRole = !!userRole && ["OWNER", "MASTER", "ADMIN"].includes(userRole);
  const isMemberRole = !!userRole && ["MEMBER", "USER", "USE"].includes(userRole);
  const isViewerRole = !!userRole && ["VIEW", "VIEWER"].includes(userRole);

  

  // NOTE: backend now provides current user's role on wallet responses.
  // Removed temporary debug flag and the extra `checkAccess` fallback call.
  const effectiveRole = userRole;
  const effectiveIsOwner = !!effectiveRole && ["OWNER", "MASTER", "ADMIN"].includes(effectiveRole);
  const effectiveIsMember = !!effectiveRole && ["MEMBER", "USER", "USE"].includes(effectiveRole);
  const effectiveIsViewer = !!effectiveRole && ["VIEW", "VIEWER"].includes(effectiveRole);

  const displayIsDefault = useMemo(() => {
    if (!wallet) return false;
    if (wallet.isShared) return false;
    return !!wallet.isDefault && effectiveIsOwner;
  }, [wallet?.id, wallet?.isDefault, wallet?.isShared, effectiveIsOwner]);

  // Effective flags for managing/inviting members: only owners can manage/invite
  const effectiveCanManageSharedMembers = effectiveIsOwner ? canManageSharedMembers : false;
  const effectiveCanInviteMembers = effectiveIsOwner ? canInviteMembers : false;

  // Normalize member shape from various API formats so UI can reliably read `.role`, `.email`, `.userId` etc.
  const normalizeMember = (m) => {
    if (!m || typeof m !== 'object') return m;
    const email = m.email || m.userEmail || (m.user && m.user.email) || m.memberEmail || null;
    const userId = m.userId ?? m.memberUserId ?? m.memberId ?? (m.user && (m.user.userId || m.user.id)) ?? null;
    // Determine role from many possible fields
    const rawRole = m.role || m.membershipRole || m.sharedRole || m.walletRole || m.roleName || (m.membership && m.membership.role) || "";
    const role = rawRole ? String(rawRole).toUpperCase() : "MEMBER";
    const fullName = m.fullName || m.name || (m.user && (m.user.fullName || m.user.name)) || null;
    return {
      ...m,
      email,
      userId,
      memberId: m.memberId ?? m.memberUserId ?? m.userId ?? m.memberId ?? null,
      role,
      fullName,
    };
  };

  const normalizeMembersList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeMember);
  };

  // If this wallet is opened and the current user is only a viewer,
  // force the detail tab and keep only the detail view available.
  useEffect(() => {
    if (!wallet) return;
    if (effectiveIsViewer) {
      setActiveDetailTab?.("view");
    }
  }, [wallet?.id, effectiveIsViewer, setActiveDetailTab]);

  // Listen for merge events so we can update shared members immediately
  useEffect(() => {
    const onWalletMerged = (e) => {
      try {
        const detail = e?.detail || {};
        if (!wallet || !detail) return;
        if (String(detail.targetId) !== String(wallet.id)) return;
        const members = detail.finalMembers;
        if (Array.isArray(members)) {
          setSharedMembers(normalizeMembersList(members));
          setSharedMembersLoading(false);
          setSharedMembersError("");
        }
      } catch (err) {
        console.debug("onWalletMerged handler error", err);
      }
    };
    window.addEventListener("walletMerged", onWalletMerged);
    return () => {
      window.removeEventListener("walletMerged", onWalletMerged);
    };
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
        const resp = await walletAPI.getWalletMembers(wallet.id);
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        else list = [];
        setSharedMembers(normalizeMembersList(list));
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

  // Ensure sharedMembers state is consistent when wallet changes.
  // If the newly selected wallet has no shared info, clear previous members to avoid stale UI.
  useEffect(() => {
    if (!wallet) {
      setSharedMembers([]);
      setSharedMembersError("");
      setSharedMembersLoading(false);
      return;
    }

    const hasSharedEmails = Array.isArray(wallet.sharedEmails) && wallet.sharedEmails.length > 0;
    const hasMultipleMembers = Number(wallet.membersCount || 0) > 1;
    const isSharedFlag = !!wallet.isShared;

    const hasShared = isSharedFlag || hasSharedEmails || hasMultipleMembers;

    if (!hasShared) {
      // No shared info on this wallet — clear members
      setSharedMembers([]);
      setSharedMembersError("");
      setSharedMembersLoading(false);
      return;
    }

    // If wallet contains only sharedEmails (from create form) but we didn't load detailed members,
    // derive a simple members array from the emails so the UI shows the expected shared list.
    if (hasSharedEmails) {
      const derived = (wallet.sharedEmails || []).map((email, idx) => ({
        memberId: `email-${idx}`,
        userId: null,
        email,
        name: email,
        role: wallet && !wallet.isShared ? "VIEW" : "MEMBER",
      }));
      setSharedMembers(normalizeMembersList(derived));
      setSharedMembersError("");
      setSharedMembersLoading(false);
    }
  }, [wallet?.id]);

  // If the `sharedEmails` prop (possibly overridden by parent via `sharedEmailsOverride`) changes,
  // derive simple member entries so the UI shows newly-added emails immediately without waiting
  // for a full server-side members load. This keeps the inspector responsive after quick-shares.
  // We always derive from `sharedEmails` so the UI can show optimistic results; a later
  // server members fetch will replace the list with authoritative data.
  useEffect(() => {
    if (!wallet) return;
    const hasSharedEmails = Array.isArray(sharedEmails) && sharedEmails.length > 0;
    if (!hasSharedEmails) return;

    const derived = (sharedEmails || []).map((email, idx) => ({
      memberId: `email-override-${idx}`,
      userId: null,
      email,
      name: email,
      role: wallet && !wallet.isShared ? "VIEW" : "MEMBER",
    }));

    // Show optimistic derived members immediately
    const derivedNormalized = normalizeMembersList(derived);
    setSharedMembers(derivedNormalized);
    setSharedMembersError("");
    setSharedMembersLoading(false);

    // In background, fetch authoritative server members and merge them with derived ones.
    // Server entries take precedence (especially if they include a userId),
    // but keep derived entries for emails not yet present on server so optimistic UI stays useful.
    (async () => {
      try {
        setSharedMembersLoading(true);
        const resp = await walletAPI.getWalletMembers(wallet.id);
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        else list = [];

        const serverNormalized = normalizeMembersList(list || []);

        const keyFor = (m) => {
          if (!m) return null;
          if (m.email) return String(m.email).toLowerCase();
          if (m.userId) return `uid:${String(m.userId)}`;
          if (m.memberId) return `mid:${String(m.memberId)}`;
          return null;
        };

        const mergedMap = new Map();
        // Add server entries first (authoritative)
        serverNormalized.forEach((m) => {
          const k = keyFor(m) || `server-${Math.random()}`;
          mergedMap.set(k, m);
        });
        // Add derived entries if they don't conflict with server keys
        derivedNormalized.forEach((m) => {
          const k = keyFor(m);
          if (!k) {
            const fillKey = `derived-${Math.random()}`;
            mergedMap.set(fillKey, m);
          } else if (!mergedMap.has(k)) {
            mergedMap.set(k, m);
          }
        });

        const merged = Array.from(mergedMap.values());
        setSharedMembers(normalizeMembersList(merged));
        setSharedMembersError("");
      } catch (err) {
        // Keep optimistic derived list on error, but record error for troubleshooting
        setSharedMembersError(err?.message || "Không thể tải danh sách thành viên.");
      } finally {
        setSharedMembersLoading(false);
      }
    })();
  }, [sharedEmails, wallet]);

  const handleRemoveSharedMember = async (member) => {
    if (!wallet || !member) return;
    const targetId = member.userId ?? member.memberUserId ?? member.memberId;
    if (!targetId) return;

     const removedLabel =
      member.fullName ||
      member.name ||
      member.email ||
      `${t("wallets.members.unknown") || "Thành viên"} #${targetId}`;
    const walletLabel = wallet.name || `#${wallet.id}`;

    setRemovingMemberId(targetId);
    try {
      if (walletAPI.removeMember) {
        await walletAPI.removeMember(wallet.id, targetId);
      }
      setSharedMembers((prev) =>
        prev.filter((m) => (m.userId ?? m.memberUserId ?? m.memberId) !== targetId)
      );
      setSharedMembersError("");

      try {
        const resp = await walletAPI.getWalletMembers(wallet.id);
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        setSharedMembers(normalizeMembersList(list));
      } catch (fetchErr) {
        // keep filtered list if refresh fails
        console.debug("refresh members after removal failed", fetchErr);
      }

      const successKey = "wallets.toast.member_removed_success";
      const successTemplate = t(successKey, { member: removedLabel, wallet: walletLabel });
      const successMessage =
        successTemplate && successTemplate !== successKey
          ? successTemplate
          : `Đã xóa ${removedLabel} khỏi ${walletLabel}.`;
      setToast({ open: true, message: successMessage, type: "success" });

      if (typeof loadWallets === "function") {
        try {
          await loadWallets();
        } catch (reloadErr) {
          console.debug("loadWallets failed after member removal", reloadErr);
        }
      }

      try {
        logActivity({
          type: "wallet.remove_member",
          message: `Đã xóa ${removedLabel} khỏi ví ${walletLabel}`,
          data: { walletId: wallet.id, walletName: wallet.name, member },
        });
      } catch (e) {}
    } catch (error) {
      setSharedMembersError(error.message || "Không thể xóa thành viên khỏi ví.");
      setToast({
        open: true,
        message: error.message || t("wallets.error.remove_member_failed") || "Không thể xóa thành viên",
        type: "error",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleUpdateMemberRole = async (member, newRole) => {
    if (!wallet || !member) return { success: false };
    // Do not allow changing roles for personal wallets here — owner can only manage group wallets.
    if (!wallet.isShared) {
      const key = "wallets.error.cannot_change_role_personal";
      const translated = t(key);
      const message = translated && translated !== key ? translated : "Không thể thay đổi quyền trên ví cá nhân. Thành viên mặc định là Viewer.";
      setToast({ open: true, message, type: "error" });
      return { success: false, message };
    }
    const memberId = member.userId ?? member.memberUserId ?? member.memberId;
    if (!memberId) return { success: false };
    setUpdatingMemberId(memberId);
    try {
      if (walletAPI.updateMemberRole) {
        await walletAPI.updateMemberRole(wallet.id, memberId, newRole);
      }
      // reload members after change
      const resp = await walletAPI.getWalletMembers(wallet.id);
      let list = [];
      if (!resp) list = [];
      else if (Array.isArray(resp)) list = resp;
      else if (Array.isArray(resp.data)) list = resp.data;
      else if (Array.isArray(resp.members)) list = resp.members;
      else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
      setSharedMembers(normalizeMembersList(list));
      // Ensure translation fallback: if t() returns the key string, use Vietnamese fallback
      const successKey = "wallets.toast.role_update_success";
      const translated = t(successKey);
      const successMsg = translated && translated !== successKey ? translated : "Phân quyền thành công.";
      setToast({ open: true, message: successMsg, type: "success" });
      return { success: true };
    } catch (error) {
      // Log full error for debugging (includes error.data from api-client)
      // eslint-disable-next-line no-console
      console.error("updateMemberRole error:", error, error?.data);

      setSharedMembersError(error.message || "Không thể cập nhật quyền thành viên");
      const statusMsg = error.status ? ` (code ${error.status})` : "";
      const serverMsg = error?.data?.message || error?.data?.error || "";
      const userMsg = serverMsg || error.message || "Không thể cập nhật quyền thành viên.";
      setToast({ open: true, message: `${userMsg}${statusMsg}`, type: "error" });
      return { success: false, message: error.message };
    } finally {
      setUpdatingMemberId(null);
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

            </div>

            <div className="wallet-form__row">
              <label className="wallet-form__full">
                Ghi chú
                <input
                  type="text"
                  value={createForm.note}
                  onChange={(e) =>
                    onCreateFieldChange("note", e.target.value)
                  }
                  placeholder="Thêm ghi chú cho ví"
                  maxLength={NOTE_MAX_LENGTH}
                />
                <span className="wallet-form__char-hint">
                  {(createForm.note || "").length}/{NOTE_MAX_LENGTH} ký tự
                </span>
              </label>
            </div>

            {/* Currency selection (was hidden) */}
            <div className="wallet-form__row">
              <label>
                Đơn vị tiền tệ
                <select
                  value={createForm.currency || "VND"}
                  onChange={(e) => onCreateFieldChange("currency", e.target.value)}
                >
                  {(Array.isArray(currencies) ? currencies : ["VND"]).map((c) => (
                    <option key={c} value={c}>
                      {c === "VND" ? "VND" : c}
                    </option>
                  ))}
                </select>
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
                          {formatCurrency(sharedWallet.balance, sharedWallet.currency)}
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
                {(() => {
                  const key = "wallets.empty.group_desc";
                  const translated = t(key);
                  return translated === key ? "Bạn chưa có ví nhóm trong mục này." : translated;
                })()}
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
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        offset={{ top: 20, right: 24 }}
        topbarSelector={null}
        anchorSelector={null}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      />
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
            {displayIsDefault && (
              <span className="wallet-tag wallet-tag--outline">
                {t("wallets.card.default")}
              </span>
            )}
          </div>
        </div>
        <div className="wallets-detail__balance">
          <div className="wallets-detail__balance-label">{t("wallets.card.balance")}</div>
          <div className="wallets-detail__balance-value">
            {formatCurrency(balance, wallet?.currency)}
          </div>
        </div>
      </div>

      {/* If viewing as a readonly viewer, show a notice and hide management actions */}
      {effectiveIsViewer && (
        <div className="wallets-detail__viewer-notice">
          Bạn đang xem với quyền Viewer,một số hành động sẽ không thể thực hiện.hãy liên hệ chủ ví nếu muốn có thêm quyền thao tác ví này
        </div>
      )}

      {/* debug block removed */}

      {/* TABS */}
      <div className="wallets-detail__tabs">
        {/* If the user is a viewer for this wallet, only show the details tab */}
        {effectiveIsViewer ? (
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
        ) : (
          <>
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
            {effectiveIsOwner && (
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
            )}
            {!wallet.isShared && !effectiveIsMember && (
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
            )}

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

            {effectiveIsOwner && (
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
          </>
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
          canManageSharedMembers={effectiveCanManageSharedMembers}
          canInviteMembers={effectiveCanInviteMembers}
          onQuickShareEmail={onQuickShareEmail}
          quickShareLoading={quickShareLoading}
          sharedFilter={sharedFilter}
          demoTransactions={demoTransactions}
          isLoadingTransactions={isLoadingTransactions}
        />
      )}

      {activeDetailTab === "manageMembers" && effectiveIsOwner && (
        <ManageMembersTab
          wallet={wallet}
          sharedMembers={sharedMembers}
          sharedMembersLoading={sharedMembersLoading}
          sharedMembersError={sharedMembersError}
          onRemoveSharedMember={handleRemoveSharedMember}
          removingMemberId={removingMemberId}
          updatingMemberId={updatingMemberId}
          onUpdateMemberRole={handleUpdateMemberRole}
          onQuickShareEmail={onQuickShareEmail}
          quickShareLoading={quickShareLoading}
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

            {activeDetailTab === "edit" && effectiveIsOwner && (
        <EditTab
          wallet={wallet}
          currencies={currencies}
          editForm={editForm}
          onEditFieldChange={onEditFieldChange}
          onSubmitEdit={onSubmitEdit}
          onDeleteWallet={onDeleteWallet}
        />
      )}

      {activeDetailTab === "merge" && !wallet.isShared && !effectiveIsMember && !effectiveIsViewer && (
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