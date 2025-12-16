import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { formatMoneyInput, getMoneyValue } from "../../utils/formatMoneyInput";
import { walletAPI } from "../../services/wallet.service";
import { useLanguage } from "../../contexts/LanguageContext";
import Toast from "../common/Toast/Toast";
import { logActivity } from "../../utils/activityLogger";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useFundData } from "../../contexts/FundDataContext";
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
  const { loadNotifications, notifications: allNotifications } = useNotifications() || {};
  const { funds = [] } = useFundData() || {};

  // Sử dụng ref để lưu reference mới nhất, tránh stale closure
  const loadWalletsRef = useRef(loadWallets);
  const walletContextRef = useRef(walletContext);
  
  useEffect(() => {
    loadWalletsRef.current = loadWallets;
    walletContextRef.current = walletContext;
  }, [loadWallets, walletContext]);

  // Extract loadingTransactions với default value
  const isLoadingTransactions = loadingTransactions || false;

  // Kiểm tra xem wallet có phải là ví quỹ không (dùng field isFundWallet từ backend)
  const isFundWallet = useMemo(() => {
    if (!wallet) return false;
    // Ưu tiên kiểm tra field isFundWallet từ backend (đã được lưu trong database)
    if (wallet.isFundWallet === true) return true;
    
    // Fallback: Kiểm tra qua danh sách funds (cho tương thích với dữ liệu cũ)
    if (!funds || funds.length === 0) return false;
    const walletIdStr = String(wallet.id);
    return funds.some(f => {
      const targetWalletId = f.targetWalletId || 
                             f.walletId || 
                             f.targetWallet?.walletId || 
                             f.targetWallet?.id ||
                             (f.targetWallet && (f.targetWallet.id || f.targetWallet.walletId));
      return targetWalletId && String(targetWalletId) === walletIdStr;
    });
  }, [wallet?.id, wallet?.isFundWallet, funds]);

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

  // Ref để track wallet.id đang được load, tránh race condition
  const loadingWalletIdRef = useRef(null);

  useEffect(() => {
    if (!wallet || !forceLoadSharedMembers) return;
    if (!canManageSharedMembers) {
      setSharedMembers([]);
      setSharedMembersLoading(false);
      loadingWalletIdRef.current = null;
      return;
    }

    // Clear members ngay khi wallet.id thay đổi để tránh hiển thị data cũ
    setSharedMembers([]);
    setSharedMembersLoading(true);
    setSharedMembersError("");
    
    // Lưu wallet.id hiện tại vào ref
    const currentWalletId = wallet.id;
    loadingWalletIdRef.current = currentWalletId;

    const loadSharedMembers = async () => {
      try {
        const resp = await walletAPI.getWalletMembers(currentWalletId);
        
        // QUAN TRỌNG: Chỉ set state nếu wallet.id vẫn khớp với wallet đang được load
        // Tránh race condition khi user chuyển ví nhanh
        if (loadingWalletIdRef.current !== currentWalletId) {
          return; // Wallet đã thay đổi, bỏ qua kết quả này
        }
        
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        else list = [];
        setSharedMembers(normalizeMembersList(list));
        setSharedMembersError("");
      } catch (error) {
        // Chỉ set error nếu wallet vẫn là wallet đang được load
        if (loadingWalletIdRef.current === currentWalletId) {
          setSharedMembersError(
            error.message || "Không thể tải danh sách thành viên."
          );
          setSharedMembers([]);
        }
      } finally {
        // Chỉ set loading false nếu wallet vẫn là wallet đang được load
        if (loadingWalletIdRef.current === currentWalletId) {
          setSharedMembersLoading(false);
        }
      }
    };

    loadSharedMembers();
    
    // Cleanup: reset ref nếu wallet thay đổi trước khi request hoàn thành
    return () => {
      if (loadingWalletIdRef.current === currentWalletId) {
        loadingWalletIdRef.current = null;
      }
    };
  }, [wallet?.id, forceLoadSharedMembers, canManageSharedMembers]);

  // Lắng nghe event khi có thành viên rời khỏi ví để reload members
  useEffect(() => {
    if (typeof window === "undefined" || !wallet?.id) return;
    
    const currentWalletId = String(wallet.id);
    
    const handleMemberLeft = async (event) => {
      const { walletIds, notifications } = event.detail || {};
      
      // Nếu có notification WALLET_MEMBER_REMOVED, user đã bị xóa khỏi ví
      // Cần reload wallets để xóa ví khỏi danh sách
      const removedNotif = notifications?.find(n => n.type === "WALLET_MEMBER_REMOVED");
      if (removedNotif) {
        const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
        if (reloadWallets && typeof reloadWallets === "function") {
          try {
            await reloadWallets();
            // Clear wallet selection nếu có
            if (typeof onChangeSelectedWallet === "function") {
              onChangeSelectedWallet(null);
            }
          } catch (e) {
            console.error("Failed to reload wallets after being removed:", e);
          }
        }
        return; // Không cần reload members vì user đã không còn trong ví
      }
      
      // Nếu ví hiện tại có trong danh sách ví có thành viên rời, reload members và wallets
      if (currentWalletId && walletIds && Array.isArray(walletIds) && walletIds.length > 0) {
        const isMatch = walletIds.some(id => String(id) === currentWalletId);
        
        if (isMatch) {
          // Reload wallets trước để cập nhật số thành viên
          // Sử dụng ref để tránh stale closure
          const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
          if (reloadWallets && typeof reloadWallets === "function") {
            try {
              await reloadWallets();
              // Đợi một chút để wallet prop được cập nhật từ context
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
              console.error("Failed to reload wallets after member left:", e);
            }
          }
        
          // Reload members để cập nhật danh sách - QUAN TRỌNG cho chủ ví khi có thành viên rời
          // Sử dụng currentWalletId thay vì wallet.id để tránh stale closure
          try {
            setSharedMembersLoading(true);
            setSharedMembersError(""); // Clear error
            // Đợi đủ lâu để đảm bảo backend đã xử lý xong việc xóa member
            await new Promise(resolve => setTimeout(resolve, 600));
            const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
            let list = [];
            if (!resp) list = [];
            else if (Array.isArray(resp)) list = resp;
            else if (Array.isArray(resp.data)) list = resp.data;
            else if (Array.isArray(resp.members)) list = resp.members;
            else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
            const normalized = normalizeMembersList(list);
            // Force update state để đảm bảo UI được cập nhật
            setSharedMembers(normalized);
            
            // Dispatch event để trigger reload wallets nếu cần
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
                detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
              }));
            }
          } catch (error) {
            console.error("Failed to reload members after member left:", error);
            setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
          } finally {
            setSharedMembersLoading(false);
          }
        }
      }
    };
    
    window.addEventListener("walletMemberLeft", handleMemberLeft);
    return () => {
      window.removeEventListener("walletMemberLeft", handleMemberLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.id]); // Chỉ phụ thuộc vào wallet.id để listener ổn định

  // QUAN TRỌNG: Listener riêng cho WALLET_ROLE_UPDATED để đảm bảo reload members ngay lập tức
  useEffect(() => {
    if (typeof window === "undefined" || !wallet?.id) return;
    
    const currentWalletId = String(wallet.id);
    
    const handleRoleUpdated = async (event) => {
      const { walletId, notifications } = event.detail || {};
      
      // Kiểm tra xem có phải wallet hiện tại không
      if (!walletId || String(walletId) !== currentWalletId) return;
      
      // Reload members ngay lập tức để cập nhật role
      try {
        setSharedMembersLoading(true);
        setSharedMembersError("");
        
        // Đợi một chút để đảm bảo backend đã xử lý xong
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        
        const normalized = normalizeMembersList(list);
        
        // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
        setSharedMembers(normalized);
        
        // Dispatch event để trigger reload wallets nếu cần
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
            detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
          }));
        }
      } catch (error) {
        console.error("Failed to reload members after WALLET_ROLE_UPDATED event:", error);
        setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
      } finally {
        setSharedMembersLoading(false);
      }
    };
    
    window.addEventListener("walletRoleUpdated", handleRoleUpdated);
    return () => {
      window.removeEventListener("walletRoleUpdated", handleRoleUpdated);
    };
  }, [wallet?.id]);

  // Lắng nghe event walletNotificationReceived để force reload khi có notification mới
  useEffect(() => {
    if (typeof window === "undefined" || !wallet?.id) return;
    
    const currentWalletId = String(wallet.id);
    
    const handleNotificationReceived = async (event) => {
      const { notifications } = event.detail || {};
      if (!notifications || !Array.isArray(notifications)) {
        return;
      }
      
      // QUAN TRỌNG: Xử lý WALLET_ROLE_UPDATED để reload members và wallets khi role thay đổi
      // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào trong ví, không chỉ user hiện tại
      const roleUpdatedNotifs = notifications.filter(n => {
        if (n.type !== "WALLET_ROLE_UPDATED") return false;
        const notifWalletId = n.referenceId || n.walletId || n.reference_id;
        return notifWalletId && String(notifWalletId) === currentWalletId;
      });
      
      if (roleUpdatedNotifs.length > 0) {
        
        // QUAN TRỌNG: Reload members ngay lập tức, không đợi event khác
        try {
          setSharedMembersLoading(true);
          setSharedMembersError("");
          
          // Đợi một chút để đảm bảo backend đã xử lý xong
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
          let list = [];
          if (!resp) list = [];
          else if (Array.isArray(resp)) list = resp;
          else if (Array.isArray(resp.data)) list = resp.data;
          else if (Array.isArray(resp.members)) list = resp.members;
          else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
          
          const normalized = normalizeMembersList(list);
          
          // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
          setSharedMembers(normalized);
        } catch (error) {
          console.error("Failed to reload members after WALLET_ROLE_UPDATED in handleNotificationReceived:", error);
          setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
        } finally {
          setSharedMembersLoading(false);
        }
        
        // Dispatch event riêng để listener ở trên xử lý (backup)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("walletRoleUpdated", {
            detail: { 
              walletId: Number(currentWalletId),
              notifications: roleUpdatedNotifs
            }
          }));
        }
        
        // Cũng reload wallets để đảm bảo wallet prop được cập nhật
        const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
        if (reloadWallets && typeof reloadWallets === "function") {
          try {
            await reloadWallets();
          } catch (e) {
            console.error("Failed to reload wallets after role update:", e);
          }
        }
      }
      
      // QUAN TRỌNG: Xử lý WALLET_INVITED để reload members và wallets khi có thành viên mới được thêm vào
      // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào trong ví, không chỉ người được mời
      const invitedNotifs = notifications.filter(n => {
        if (n.type !== "WALLET_INVITED") return false;
        const notifWalletId = n.referenceId || n.walletId || n.reference_id;
        return notifWalletId && String(notifWalletId) === currentWalletId;
      });
      
      if (invitedNotifs.length > 0) {
        
        // Reload wallets trước để cập nhật membersCount
        const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
        if (reloadWallets && typeof reloadWallets === "function") {
          try {
            await reloadWallets();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.error("Failed to reload wallets after WALLET_INVITED:", e);
          }
        }
        
        // Reload members để cập nhật danh sách thành viên
        try {
          setSharedMembersLoading(true);
          setSharedMembersError("");
          // Đợi một chút để đảm bảo backend đã xử lý xong
          await new Promise(resolve => setTimeout(resolve, 800));
          const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
          let list = [];
          if (!resp) list = [];
          else if (Array.isArray(resp)) list = resp;
          else if (Array.isArray(resp.data)) list = resp.data;
          else if (Array.isArray(resp.members)) list = resp.members;
          else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
          const normalized = normalizeMembersList(list);
          // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
          setSharedMembers(normalized);
          
          // Dispatch event để trigger reload wallets nếu cần
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
              detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
            }));
          }
        } catch (error) {
          console.error("Failed to reload members after WALLET_INVITED:", error);
          setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
        } finally {
          setSharedMembersLoading(false);
        }
      }
      
      // Kiểm tra xem có notification WALLET_MEMBER_LEFT hoặc WALLET_MEMBER_REMOVED cho wallet hiện tại không
      const memberLeftNotifs = notifications.filter(n => {
        if (n.type !== "WALLET_MEMBER_LEFT" && n.type !== "WALLET_MEMBER_REMOVED") return false;
        const notifWalletId = n.referenceId || n.walletId || n.reference_id;
        return notifWalletId && String(notifWalletId) === currentWalletId;
      });
      
      // Nếu có notification WALLET_MEMBER_REMOVED, user đã bị xóa khỏi ví
      // Cần reload wallets để xóa ví khỏi danh sách và clear selection
      const removedNotif = memberLeftNotifs.find(n => n.type === "WALLET_MEMBER_REMOVED");
      if (removedNotif) {
        const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
        if (reloadWallets && typeof reloadWallets === "function") {
          try {
            await reloadWallets();
            // Clear wallet selection nếu có
            if (typeof onChangeSelectedWallet === "function") {
              onChangeSelectedWallet(null);
            }
          } catch (e) {
            console.error("❌ Failed to reload wallets after being removed:", e);
          }
        }
        return; // Không cần reload members vì user đã không còn trong ví
      }
      
      if (memberLeftNotifs.length > 0) {
        
        // Force reload wallets và members
        // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào rời đi hoặc bị xóa, không chỉ user hiện tại
        const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
        if (reloadWallets && typeof reloadWallets === "function") {
          try {
            await reloadWallets();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.error("Failed to reload wallets after notification:", e);
          }
        }
        
        // Reload members - QUAN TRỌNG: Luôn reload để cập nhật danh sách cho chủ ví
        // QUAN TRỌNG: Reload ngay lập tức khi có thành viên rời đi hoặc bị xóa
        try {
          setSharedMembersLoading(true);
          setSharedMembersError(""); // Clear error
          // Đợi đủ lâu để đảm bảo backend đã xử lý xong việc xóa member
          await new Promise(resolve => setTimeout(resolve, 800));
          const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
          let list = [];
          if (!resp) list = [];
          else if (Array.isArray(resp)) list = resp;
          else if (Array.isArray(resp.data)) list = resp.data;
          else if (Array.isArray(resp.members)) list = resp.members;
          else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
          const normalized = normalizeMembersList(list);
          // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
          setSharedMembers(normalized);
          
          // Dispatch event để trigger reload wallets nếu cần
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
              detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
            }));
          }
        } catch (error) {
          console.error("Failed to reload members after WALLET_MEMBER_LEFT notification:", error);
          setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
        } finally {
          setSharedMembersLoading(false);
        }
      }
    };
    
    window.addEventListener("walletNotificationReceived", handleNotificationReceived);
    return () => {
      window.removeEventListener("walletNotificationReceived", handleNotificationReceived);
    };
  }, [wallet?.id]);

  // Kiểm tra và reload khi component mount hoặc notifications thay đổi nếu có notification WALLET_MEMBER_LEFT hoặc WALLET_ROLE_UPDATED cho wallet hiện tại
  // QUAN TRỌNG: Reload members ngay khi có notification, không quan tâm đến việc đã đọc hay chưa
  const processedNotificationIdsRef = useRef(new Set());
  const lastProcessedNotificationTimeRef = useRef(new Map()); // Track thời gian xử lý để tránh reload quá nhiều lần
  
  useEffect(() => {
    if (!wallet?.id || !allNotifications || !Array.isArray(allNotifications)) return;
    
    const currentWalletId = String(wallet.id);
    
    // QUAN TRỌNG: Xử lý WALLET_ROLE_UPDATED để reload members và wallets khi role thay đổi
    // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào trong ví, không chỉ user hiện tại
    const roleUpdatedNotifs = allNotifications.filter(n => {
      if (n.type !== "WALLET_ROLE_UPDATED") return false;
      const notifWalletId = n.referenceId || n.walletId || n.reference_id;
      return notifWalletId && String(notifWalletId) === currentWalletId;
    });
    
    if (roleUpdatedNotifs.length > 0) {
      const now = Date.now();
      // QUAN TRỌNG: Luôn reload nếu có notification WALLET_ROLE_UPDATED mới (chưa xử lý)
      // Không quan tâm đến việc đã đọc hay chưa, miễn là notification mới
      const notificationsToProcess = roleUpdatedNotifs.filter(n => {
        const lastProcessedTime = lastProcessedNotificationTimeRef.current.get(n.id);
        // Nếu đã xử lý trong vòng 5 giây gần đây, bỏ qua (tránh reload quá nhiều lần) - TĂNG từ 2 lên 5
        if (lastProcessedTime && (now - lastProcessedTime) < 5000) {
          return false;
        }
        
        // LUÔN reload nếu chưa đọc
        if (!n.read) {
          return true;
        }
        
        // Nếu đã đọc, vẫn reload nếu được tạo trong 30 phút gần đây (tăng từ 20 lên 30)
        if (n.createdAt) {
          const created = new Date(n.createdAt);
          const diffMs = now - created.getTime();
          const diffMins = diffMs / 60000;
          return diffMins < 30; // Trong vòng 30 phút
        }
        
        // Nếu không có createdAt, vẫn reload nếu chưa đọc
        return !n.read;
      });
      
      if (notificationsToProcess.length > 0) {
        
        // Đánh dấu đã xử lý với timestamp
        notificationsToProcess.forEach(n => {
          processedNotificationIdsRef.current.add(n.id);
          lastProcessedNotificationTimeRef.current.set(n.id, now);
        });
        
        // Force reload members và wallets - QUAN TRỌNG để cập nhật role của BẤT KỲ thành viên nào
        const reloadMembers = async () => {
          try {
            setSharedMembersLoading(true);
            setSharedMembersError("");
            
            // Đợi một chút để đảm bảo backend đã xử lý xong
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
            let list = [];
            if (!resp) list = [];
            else if (Array.isArray(resp)) list = resp;
            else if (Array.isArray(resp.data)) list = resp.data;
            else if (Array.isArray(resp.members)) list = resp.members;
            else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
            
            const normalized = normalizeMembersList(list);
            
            // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
            setSharedMembers(normalized);
            
            // Reload wallets để cập nhật role
            const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
            if (reloadWallets && typeof reloadWallets === "function") {
              try {
                await reloadWallets();
              } catch (e) {
                console.error("Failed to reload wallets after role update:", e);
              }
            }
            
            // Dispatch event để trigger reload ở các component khác
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
                detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
              }));
              
              window.dispatchEvent(new CustomEvent("walletUpdated", {
                detail: { walletId: Number(currentWalletId), action: "roleUpdated" }
              }));
            }
          } catch (error) {
            console.error("Failed to force reload members after WALLET_ROLE_UPDATED notification:", error);
            setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
          } finally {
            setSharedMembersLoading(false);
          }
        };
        
        // Reload ngay lập tức
        reloadMembers();
      }
    }
    
    const memberLeftNotifs = allNotifications.filter(n => {
      const isMemberLeftType = n.type === "WALLET_MEMBER_LEFT" || n.type === "WALLET_MEMBER_REMOVED";
      if (!isMemberLeftType) return false;
      
      const notifWalletId = n.referenceId || n.walletId || n.reference_id;
      return notifWalletId && String(notifWalletId) === currentWalletId;
    });
    
      if (memberLeftNotifs.length > 0) {
        // QUAN TRỌNG: Reload nếu có notification WALLET_MEMBER_LEFT hoặc WALLET_MEMBER_REMOVED (dù đã đọc hay chưa)
        // QUAN TRỌNG: Reload cho BẤT KỲ thành viên nào rời đi hoặc bị xóa, không chỉ user hiện tại
        // Chỉ bỏ qua nếu đã xử lý trong vòng 2 giây gần đây (để tránh reload quá nhiều lần)
        const now = Date.now();
        const notificationsToProcess = memberLeftNotifs.filter(n => {
          const lastProcessedTime = lastProcessedNotificationTimeRef.current.get(n.id);
          // Nếu đã xử lý trong vòng 5 giây gần đây, bỏ qua - TĂNG từ 2 lên 5 để tránh reload quá nhiều lần
          if (lastProcessedTime && (now - lastProcessedTime) < 5000) {
            return false;
          }
          
          // LUÔN reload nếu chưa đọc
          if (!n.read) {
            return true;
          }
          
          // Nếu đã đọc, vẫn reload nếu được tạo trong 30 phút gần đây (tăng từ 20 lên 30)
          if (n.createdAt) {
            const created = new Date(n.createdAt);
            const diffMs = now - created.getTime();
            const diffMins = diffMs / 60000;
            return diffMins < 30; // Trong vòng 30 phút
          }
          
          // Nếu không có createdAt, vẫn reload nếu chưa đọc
          return !n.read;
        });
      
      if (notificationsToProcess.length > 0) {
        // Đánh dấu đã xử lý với timestamp
        notificationsToProcess.forEach(n => {
          processedNotificationIdsRef.current.add(n.id);
          lastProcessedNotificationTimeRef.current.set(n.id, now);
        });
        
        // Force reload members trực tiếp - QUAN TRỌNG cho chủ ví
        const reloadMembers = async () => {
          try {
            setSharedMembersLoading(true);
            setSharedMembersError("");
            
            // Đợi một chút để đảm bảo backend đã xử lý xong
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const resp = await walletAPI.getWalletMembers(Number(currentWalletId));
            let list = [];
            if (!resp) list = [];
            else if (Array.isArray(resp)) list = resp;
            else if (Array.isArray(resp.data)) list = resp.data;
            else if (Array.isArray(resp.members)) list = resp.members;
            else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
            
            const normalized = normalizeMembersList(list);
            
            // QUAN TRỌNG: Force update state
            setSharedMembers(normalized);
            
            // Reload wallets để cập nhật membersCount
            const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
            if (reloadWallets && typeof reloadWallets === "function") {
              try {
                await reloadWallets();
              } catch (e) {
                console.error("Failed to reload wallets:", e);
              }
            }
            
            // Dispatch event để trigger reload ở các component khác
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
                detail: { walletId: Number(currentWalletId), memberCount: normalized.length }
              }));
            }
          } catch (error) {
            console.error("Failed to force reload members after WALLET_MEMBER_LEFT notification:", error);
            setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
          } finally {
            setSharedMembersLoading(false);
          }
        };
        
        // Reload ngay lập tức
        reloadMembers();
        
        // Cũng dispatch event để đảm bảo các component khác cũng reload
        if (typeof window !== "undefined") {
          const walletIds = [currentWalletId];
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("walletMemberLeft", {
              detail: { 
                notifications: notificationsToProcess,
                walletIds: walletIds
              }
            }));
          }, 100);
        }
      }
    }
  }, [wallet?.id, allNotifications]);

  // TẮT polling - chỉ reload notifications khi có event hoặc thay đổi thực sự
  // NotificationContext đã có polling riêng, không cần polling thêm ở đây
  // useEffect(() => {
  //   if (!wallet?.id || !loadNotifications) return;
  //   
  //   // Kiểm tra xem có accessToken không (đảm bảo user đã đăng nhập)
  //   const checkToken = () => {
  //     const token = localStorage.getItem("accessToken");
  //     return Boolean(token);
  //   };
  //   
  //   // Polling mỗi 5 giây để phát hiện notification mới nhanh hơn
  //   // Chỉ khi có wallet đang mở (để tránh quá tải)
  //   const interval = setInterval(() => {
  //     // Chỉ poll nếu có token (user đã đăng nhập)
  //     if (!checkToken()) {
  //       return;
  //     }
  //     
  //     if (typeof loadNotifications === "function") {
  //       loadNotifications().catch(err => {
  //         console.debug("Failed to poll notifications:", err);
  //       });
  //     }
  //   }, 5000); // 5 giây
  //   
  //   return () => clearInterval(interval);
  // }, [wallet?.id, loadNotifications]);

  // QUAN TRỌNG: Polling để tự động reload members khi đang xem tab "Quản lý người dùng"
  // Đây là giải pháp cuối cùng để đảm bảo UI được cập nhật khi thành viên rời ví
  // TẮT polling để tránh reload liên tục - dựa vào notifications và membersCount thay đổi thay vì polling
  // useEffect(() => {
  //   if (!wallet?.id || activeDetailTab !== "members") return;
  //   
  //   // Polling mỗi 3 giây để reload members khi đang xem tab quản lý người dùng
  //   const interval = setInterval(async () => {
  //     try {
  //       setSharedMembersLoading(true);
  //       
  //       const resp = await walletAPI.getWalletMembers(wallet.id);
  //       let list = [];
  //       if (!resp) list = [];
  //       else if (Array.isArray(resp)) list = resp;
  //       else if (Array.isArray(resp.data)) list = resp.data;
  //       else if (Array.isArray(resp.members)) list = resp.members;
  //       else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
  //       
  //       const normalized = normalizeMembersList(list);
  //       
  //       // Force update state
  //       setSharedMembers(normalized);
  //       
  //       // Reload wallets để cập nhật membersCount
  //       const reloadWallets = loadWalletsRef.current || (walletContextRef.current && walletContextRef.current.loadWallets);
  //       if (reloadWallets && typeof reloadWallets === "function") {
  //         try {
  //           await reloadWallets();
  //         } catch (e) {
  //           console.debug("Failed to reload wallets in polling:", e);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Failed to reload members:", error);
  //     } finally {
  //       setSharedMembersLoading(false);
  //     }
  //   }, 3000); // 3 giây
  //   
  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [wallet?.id, activeDetailTab]);

  // Reload members khi membersCount thay đổi (khi có thành viên rời hoặc thêm vào)
  // QUAN TRỌNG: Đây là cách chính để reload khi thành viên rời ví, không phụ thuộc vào notification
  // Sử dụng useRef để track membersCount cũ và chỉ reload khi thực sự thay đổi
  const prevMembersCountRef = useRef(null);
  const lastMembersCountReloadTimeRef = useRef(null);
  
  useEffect(() => {
    if (!wallet?.id) {
      prevMembersCountRef.current = null;
      return;
    }
    
    const currentMembersCount = Number(wallet.membersCount || 0);
    const prevMembersCount = prevMembersCountRef.current;
    
    // Chỉ reload nếu membersCount thực sự thay đổi
    if (prevMembersCount !== null && prevMembersCount === currentMembersCount) {
      return; // Không thay đổi, không cần reload
    }
    
    // Cập nhật ref
    prevMembersCountRef.current = currentMembersCount;
    
    // Chỉ reload nếu membersCount thay đổi (không phải lần đầu mount)
    if (prevMembersCount === null) {
      // Lần đầu mount, không reload (đã có useEffect khác xử lý)
      return;
    }
    
    // QUAN TRỌNG: Phát hiện khi membersCount TĂNG (có thành viên mới được thêm vào)
    const membersCountIncreased = currentMembersCount > prevMembersCount;
    
    // QUAN TRỌNG: Với ví cá nhân, vẫn cần reload khi membersCount thay đổi
    // (ví dụ: từ 2 thành viên xuống 1 thành viên khi có người rời, hoặc từ 2 lên 3 khi có người mới)
    // Chỉ clear danh sách nếu membersCount = 0 hoặc không có shared info
    const hasSharedEmails = Array.isArray(wallet.sharedEmails) && wallet.sharedEmails.length > 0;
    const hasMultipleMembers = currentMembersCount > 1;
    const isSharedFlag = !!wallet.isShared;
    const hasShared = isSharedFlag || hasSharedEmails || hasMultipleMembers;
    
    // Nếu không có shared members và membersCount = 0, clear danh sách
    if (!hasShared && currentMembersCount === 0) {
      setSharedMembers([]);
      return;
    }
    
    // Tránh reload quá nhiều lần trong thời gian ngắn (debounce) - TĂNG thời gian để tránh loop
    const now = Date.now();
    if (lastMembersCountReloadTimeRef.current && (now - lastMembersCountReloadTimeRef.current) < 5000) {
      // Tăng từ 2 giây lên 5 giây để tránh reload quá nhiều lần
      return;
    }
    
    // QUAN TRỌNG: Nếu membersCount tăng (có thành viên mới), reload ngay lập tức với delay ngắn hơn
    const delay = membersCountIncreased ? 500 : 800;
    
    // Debounce để tránh reload quá nhiều lần - TĂNG delay để tránh loop
    const timeoutId = setTimeout(async () => {
      try {
        lastMembersCountReloadTimeRef.current = Date.now();
        setSharedMembersLoading(true);
        setSharedMembersError(""); // Clear error
        
        // Đợi một chút để đảm bảo backend đã xử lý xong
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const resp = await walletAPI.getWalletMembers(wallet.id);
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        const normalized = normalizeMembersList(list);
        
        // QUAN TRỌNG: Force update state để đảm bảo UI được cập nhật
        setSharedMembers(normalized);
      } catch (error) {
        console.error("Failed to reload members after membersCount change:", error);
        setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
        // Nếu không có quyền xem members, clear danh sách
        setSharedMembers([]);
      } finally {
        setSharedMembersLoading(false);
      }
    }, 1000); // Tăng từ 300ms lên 1000ms để tránh reload quá nhanh
    
    return () => clearTimeout(timeoutId);
  }, [wallet?.id, wallet?.membersCount]);

  // Ensure sharedMembers state is consistent when wallet changes.
  // If the newly selected wallet has no shared info, clear previous members to avoid stale UI.
  // Cũng reload members khi wallet prop thay đổi (đặc biệt là membersCount hoặc role)
  const prevWalletIdRef = useRef(null);
  const prevMembersCountRef2 = useRef(null);
  const prevWalletRoleRef = useRef(null);
  
  useEffect(() => {
    if (!wallet) {
      setSharedMembers([]);
      setSharedMembersError("");
      setSharedMembersLoading(false);
      prevWalletIdRef.current = null;
      prevMembersCountRef2.current = null;
      prevWalletRoleRef.current = null;
      return;
    }

    const currentWalletId = wallet.id;
    const currentMembersCount = Number(wallet.membersCount || 0);
    const currentWalletRole = getRoleFromWallet(wallet);
    const prevWalletId = prevWalletIdRef.current;
    const prevMembersCount = prevMembersCountRef2.current;
    const prevWalletRole = prevWalletRoleRef.current;
    
    // QUAN TRỌNG: Nếu wallet thay đổi, clear members ngay để tránh hiển thị data cũ
    // Đặc biệt quan trọng với ví nhóm vì hasShared luôn là true
    if (prevWalletId !== null && prevWalletId !== currentWalletId) {
      setSharedMembers([]);
      setSharedMembersError("");
      // Không set loading false ở đây vì useEffect chính sẽ handle loading
    }
    
    // Nếu wallet thay đổi, reset refs
    if (prevWalletId !== currentWalletId) {
      prevWalletIdRef.current = currentWalletId;
      prevMembersCountRef2.current = currentMembersCount;
      prevWalletRoleRef.current = currentWalletRole;
    }

    // QUAN TRỌNG: Nếu role thay đổi (ví dụ: từ MEMBER xuống VIEWER), reload members để cập nhật role trong danh sách
    // Đây là trường hợp quan trọng khi user bị downgrade quyền
    if (prevWalletRole !== null && prevWalletRole !== currentWalletRole && prevWalletId === currentWalletId) {
      prevWalletRoleRef.current = currentWalletRole;
      
      // Reload members từ server để cập nhật role
      const reloadMembers = async () => {
        try {
          setSharedMembersLoading(true);
          setSharedMembersError("");
          // Đợi một chút để đảm bảo backend đã xử lý xong
          await new Promise(resolve => setTimeout(resolve, 500));
          const resp = await walletAPI.getWalletMembers(wallet.id);
          let list = [];
          if (!resp) list = [];
          else if (Array.isArray(resp)) list = resp;
          else if (Array.isArray(resp.data)) list = resp.data;
          else if (Array.isArray(resp.members)) list = resp.members;
          else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
          const normalized = normalizeMembersList(list);
          setSharedMembers(normalized);
          
          // Dispatch event để trigger reload wallets nếu cần
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
              detail: { walletId: wallet.id, memberCount: normalized.length }
            }));
          }
        } catch (error) {
          console.error("Failed to reload members after wallet role change:", error);
          setSharedMembersError(error.message || "Không thể tải danh sách thành viên.");
        } finally {
          setSharedMembersLoading(false);
        }
      };
      
      reloadMembers();
      return;
    }

    // QUAN TRỌNG: Không reload members ở đây khi membersCount thay đổi
    // Vì đã có useEffect riêng ở trên (dòng 967) xử lý membersCount thay đổi
    // Tránh reload trùng lặp gây ra loop
    // Chỉ cập nhật ref để track
    if (prevMembersCount !== null && prevMembersCount !== currentMembersCount && prevWalletId === currentWalletId) {
      prevMembersCountRef2.current = currentMembersCount;
      // Không reload ở đây, để useEffect ở trên xử lý
    }

    const hasSharedEmails = Array.isArray(wallet.sharedEmails) && wallet.sharedEmails.length > 0;
    const hasMultipleMembers = currentMembersCount > 1;
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
    // QUAN TRỌNG: Chỉ derive nếu wallet không phải là ví nhóm (vì ví nhóm sẽ load từ API)
    // Và chỉ khi đây là ví cá nhân mới được tạo (có sharedEmails nhưng chưa có members từ API)
    if (hasSharedEmails && prevWalletId !== currentWalletId && !isSharedFlag) {
      // Chỉ derive cho ví cá nhân, ví nhóm sẽ được load từ API trong useEffect chính (dòng 282)
      const derived = (wallet.sharedEmails || []).map((email, idx) => ({
        memberId: `email-${idx}`,
        userId: null,
        email,
        name: email,
        role: "VIEW",
      }));
      setSharedMembers(normalizeMembersList(derived));
      setSharedMembersError("");
      setSharedMembersLoading(false);
    }
  }, [wallet?.id, wallet?.membersCount, wallet?.walletRole, wallet?.sharedRole, wallet?.role]);

  // If the `sharedEmails` prop (possibly overridden by parent via `sharedEmailsOverride`) changes,
  // derive simple member entries so the UI shows newly-added emails immediately without waiting
  // for a full server-side members load. This keeps the inspector responsive after quick-shares.
  // We always derive from `sharedEmails` so the UI can show optimistic results; a later
  // server members fetch will replace the list with authoritative data.
  useEffect(() => {
    if (!wallet) return;
    const hasSharedEmails = Array.isArray(sharedEmails) && sharedEmails.length > 0;
    if (!hasSharedEmails) return;

    const currentWalletId = wallet.id;

    const derived = (sharedEmails || []).map((email, idx) => ({
      memberId: `email-override-${idx}`,
      userId: null,
      email,
      name: email,
      role: wallet && !wallet.isShared ? "VIEW" : "MEMBER",
    }));

    // Show optimistic derived members immediately
    const derivedNormalized = normalizeMembersList(derived);
    
    // Chỉ set optimistic members nếu wallet vẫn là wallet hiện tại
    if (wallet?.id === currentWalletId) {
      setSharedMembers(derivedNormalized);
      setSharedMembersError("");
      setSharedMembersLoading(false);
    }

    // In background, fetch authoritative server members and merge them with derived ones.
    // Server entries take precedence (especially if they include a userId),
    // but keep derived entries for emails not yet present on server so optimistic UI stays useful.
    (async () => {
      try {
        // Chỉ set loading nếu wallet vẫn là wallet hiện tại
        if (wallet?.id === currentWalletId) {
          setSharedMembersLoading(true);
        }
        
        const resp = await walletAPI.getWalletMembers(currentWalletId);
        
        // QUAN TRỌNG: Chỉ set state nếu wallet.id vẫn khớp với wallet đang được xử lý
        // Tránh race condition khi user chuyển ví nhanh
        if (wallet?.id !== currentWalletId || loadingWalletIdRef.current !== currentWalletId) {
          return; // Wallet đã thay đổi, bỏ qua kết quả này
        }
        
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
        // Chỉ set error nếu wallet vẫn là wallet hiện tại
        if (wallet?.id === currentWalletId && loadingWalletIdRef.current === currentWalletId) {
          // Keep optimistic derived list on error, but record error for troubleshooting
          setSharedMembersError(err?.message || "Không thể tải danh sách thành viên.");
        }
      } finally {
        // Chỉ set loading false nếu wallet vẫn là wallet hiện tại
        if (wallet?.id === currentWalletId) {
          setSharedMembersLoading(false);
        }
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
      // Optimistically update UI ngay lập tức
      setSharedMembers((prev) =>
        prev.filter((m) => (m.userId ?? m.memberUserId ?? m.memberId) !== targetId)
      );
      setSharedMembersError("");

      const successKey = "wallets.toast.member_removed_success";
      const successTemplate = t(successKey, { member: removedLabel, wallet: walletLabel });
      const successMessage =
        successTemplate && successTemplate !== successKey
          ? successTemplate
          : `Đã xóa ${removedLabel} khỏi ${walletLabel}.`;
      setToast({ open: true, message: successMessage, type: "success" });

      // Reload wallets trước để cập nhật membersCount
      if (typeof loadWallets === "function") {
        try {
          await loadWallets();
          // Đợi một chút để wallet prop được cập nhật từ context
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (reloadErr) {
          console.error("❌ loadWallets failed after member removal", reloadErr);
        }
      }

      // Reload members từ server để đảm bảo dữ liệu chính xác
      try {
        setSharedMembersLoading(true);
        // Đợi một chút để đảm bảo backend đã xử lý xong
        await new Promise(resolve => setTimeout(resolve, 200));
        const resp = await walletAPI.getWalletMembers(wallet.id);
        let list = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.data)) list = resp.data;
        else if (Array.isArray(resp.members)) list = resp.members;
        else if (resp.result && Array.isArray(resp.result.data)) list = resp.result.data;
        const normalized = normalizeMembersList(list);
        // Force update state
        setSharedMembers(normalized);
      } catch (fetchErr) {
        console.error("❌ Failed to reload members after removal", fetchErr);
        // Nếu reload fail, vẫn giữ optimistic update
      } finally {
        setSharedMembersLoading(false);
      }

      // Dispatch event để trigger reload ở các component khác
      if (typeof window !== "undefined" && wallet?.id) {
        const removedEmail = member.email || member.userEmail || member.memberEmail;
        window.dispatchEvent(new CustomEvent("walletMemberLeft", {
          detail: { 
            walletIds: [String(wallet.id)],
            notifications: [{
              type: "WALLET_MEMBER_LEFT",
              walletId: wallet.id,
              referenceId: wallet.id
            }],
            removedEmail: removedEmail // Thêm email bị xóa để WalletsPage có thể cập nhật localSharedMap
          }
        }));
        
        // Cũng dispatch walletMembersUpdated để đảm bảo
        window.dispatchEvent(new CustomEvent("walletMembersUpdated", {
          detail: { walletId: wallet.id, removedEmail: removedEmail }
        }));
        
        // Dispatch walletUpdated để WalletsPage reload và cập nhật UI (bao gồm WalletList)
        window.dispatchEvent(new CustomEvent("walletUpdated", {
          detail: { walletId: wallet.id, removedEmail: removedEmail }
        }));
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

  const handleLeaveWallet = async () => {
    if (!wallet) return { success: false };
    const walletLabel = wallet.name || `#${wallet.id}`;
    const walletId = wallet.id;

    try {
      const response = await walletAPI.leaveWallet(walletId);
      
      // Kiểm tra response có thành công không
      // Response có thể là { data: {...}, response: { ok: true } } hoặc { error: "..." }
      if (response && response.response && !response.response.ok) {
        const errorMsg = response.data?.error || response.data?.message || "Không thể rời khỏi ví.";
        throw new Error(errorMsg);
      }
      if (response && response.error) {
        throw new Error(response.error);
      }

      // Clear selection trước để đóng detail panel ngay lập tức
      if (typeof onChangeSelectedWallet === "function") {
        onChangeSelectedWallet(null);
      }

      setToast({
        open: true,
        message: `Bạn đã rời khỏi ví "${walletLabel}".`,
        type: "success",
      });

      // Reload danh sách ví để cập nhật UI
      if (typeof loadWallets === "function") {
        try {
          // Đợi một chút để đảm bảo backend đã xử lý xong
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadWallets();
        } catch (reloadErr) {
          console.error("loadWallets failed after leaving wallet", reloadErr);
          // Vẫn hiển thị thông báo thành công dù reload fail
        }
      }

      // Force reload từ WalletDataContext nếu có
      if (walletContext && typeof walletContext.loadWallets === "function") {
        try {
          await walletContext.loadWallets();
        } catch (e) {
          console.debug("WalletContext loadWallets failed", e);
        }
      }

      // Dispatch event để trigger reload wallets và members ngay lập tức
      // Không cần đợi notification polling (30s)
      // Đợi một chút để đảm bảo backend đã xử lý xong việc xóa member
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (typeof window !== "undefined" && walletId) {
        // Dispatch event ngay để chủ ví có thể reload members
        window.dispatchEvent(new CustomEvent("walletMemberLeft", {
          detail: { 
            walletIds: [String(walletId)],
            notifications: [{
              type: "WALLET_MEMBER_LEFT",
              walletId: walletId,
              referenceId: walletId
            }]
          }
        }));
        
        // Cũng dispatch walletUpdated để đảm bảo
        window.dispatchEvent(new CustomEvent("walletUpdated", {
          detail: { walletId: walletId }
        }));
      }

      // Refresh notifications để hiển thị thông báo mới ngay lập tức (cho chủ ví)
      if (loadNotifications && typeof loadNotifications === "function") {
        try {
          // Đợi một chút để backend đã tạo notification xong
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadNotifications();
        } catch (e) {
          console.debug("loadNotifications failed after leaving wallet", e);
        }
      }

      try {
        logActivity({
          type: "wallet.leave",
          message: `Đã rời khỏi ví ${walletLabel}`,
          data: { walletId: wallet.id, walletName: wallet.name },
        });
      } catch (e) {}

      return { success: true };
    } catch (error) {
      const errorMessage = error.message || error?.data?.error || t("wallets.error.leave_failed") || "Không thể rời khỏi ví.";
      setToast({
        open: true,
        message: errorMessage,
        type: "error",
      });
      return { success: false, message: errorMessage };
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
      
      // Force reload từ WalletDataContext trước (quan trọng để cập nhật role)
      if (walletContext && typeof walletContext.loadWallets === "function") {
        try {
          // Đợi một chút để đảm bảo backend đã xử lý xong
          await new Promise(resolve => setTimeout(resolve, 500));
          // Force reload để đảm bảo role mới được cập nhật
          await walletContext.loadWallets();
        } catch (e) {
          console.error("WalletContext loadWallets failed after updating role", e);
        }
      }
      
      // Reload wallets từ prop nếu có (cho WalletsPage)
      if (typeof loadWallets === "function") {
        try {
          // Đợi thêm một chút để WalletDataContext đã reload xong
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadWallets();
        } catch (reloadErr) {
          console.error("loadWallets failed after updating role", reloadErr);
        }
      }
      
      // Refresh notifications để người được nâng quyền nhận thông báo ngay
      if (loadNotifications && typeof loadNotifications === "function") {
        try {
          // Đợi một chút để backend đã tạo notification xong
          await new Promise(resolve => setTimeout(resolve, 500));
          await loadNotifications();
        } catch (e) {
          console.debug("loadNotifications failed after updating role", e);
        }
      }
      
      // Dispatch event để trigger reload wallets ở các component khác
      // Dispatch sau khi đã reload để đảm bảo data mới nhất
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("walletUpdated", {
            detail: { walletId: wallet.id, action: "roleUpdated" }
          }));
        }, 100);
      }
      
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

            {/* Currency fixed to VND */}
            <div className="wallet-form__row">
              <label>
                Đơn vị tiền tệ
                <input type="text" value="VND" disabled className="form-control" />
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
            {/* Ẩn tab gộp ví nếu là ví quỹ */}
            {!wallet.isShared && !effectiveIsMember && !isFundWallet && (
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

            {/* Chỉ hiển thị tab chuyển thành ví nhóm cho ví cá nhân, ẩn nếu là ví quỹ */}
            {!wallet.isShared && walletTabType === "personal" && !isFundWallet && (
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

            {/* Ẩn tab quản lý người dùng nếu là ví quỹ */}
            {effectiveIsOwner && !isFundWallet && (
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
          effectiveIsOwner={effectiveIsOwner}
          effectiveIsMember={effectiveIsMember}
          effectiveIsViewer={effectiveIsViewer}
          onLeaveWallet={handleLeaveWallet}
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
          effectiveIsOwner={effectiveIsOwner}
          onLeaveWallet={handleLeaveWallet}
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