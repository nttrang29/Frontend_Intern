// src/pages/Home/WalletsPage.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import WalletList from "../../components/wallets/WalletList";
import WalletDetail from "../../components/wallets/WalletDetail";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services/wallet.service";
import Toast from "../../components/common/Toast/Toast";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatMoney } from "../../utils/formatMoney";

import "../../styles/pages/WalletsPage.css";
import "../../styles/components/wallets/WalletList.css";
import "../../styles/components/wallets/WalletHeader.css";

const CURRENCIES = ["VND", "USD"];

const getLocalUserId = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      return user.userId || user.id || null;
    }
  } catch (error) {
    console.error("Không thể đọc user từ localStorage:", error);
  }
  return null;
};

const DEMO_CATEGORIES = [
  { id: "cat-food", name: "Ăn uống" },
  { id: "cat-bill", name: "Hóa đơn & Tiện ích" },
  { id: "cat-transfer", name: "Chuyển khoản" },
  { id: "cat-saving", name: "Tiết kiệm" },
];

const buildWalletForm = (wallet) => ({
  name: wallet?.name || "",
  currency: wallet?.currency || "VND",
  note: wallet?.note || "",
  isDefault: !!wallet?.isDefault,
  sharedEmails: wallet?.sharedEmails || [],
});

const DEMO_SHARED_WITH_ME = [

];

const buildOwnerId = (wallet) => {
  if (wallet.ownerUserId) return `owner-${wallet.ownerUserId}`;
  if (wallet.ownerEmail) return `owner-${wallet.ownerEmail}`;
  if (wallet.ownerName)
    return `owner-${wallet.ownerName.replace(/\s+/g, "-").toLowerCase()}`;
  return `owner-${wallet.id}`;
};

const normalizeOwnerName = (wallet) =>
  wallet.ownerName ||
  wallet.ownerFullName ||
  wallet.ownerDisplayName ||
  wallet.ownerEmail ||
  "Người chia sẻ";

const normalizeOwnerEmail = (wallet) =>
  wallet.ownerEmail || wallet.ownerContact || "";

const sortWalletsByMode = (walletList = [], sortMode = "default") => {
  const arr = [...walletList];
  arr.sort((a, b) => {
    // Nếu không phải default sort, dùng logic cũ
    if (sortMode !== "default") {
      const nameA = (a?.name || "").toLowerCase();
      const nameB = (b?.name || "").toLowerCase();
      const balA = Number(a?.balance ?? a?.current ?? 0) || 0;
      const balB = Number(b?.balance ?? b?.current ?? 0) || 0;

      switch (sortMode) {
        case "name_asc":
          return nameA.localeCompare(nameB);
        case "balance_desc":
          return balB - balA;
        case "balance_asc":
          return balA - balB;
        default:
          return 0;
      }
    }

    // Default sort: Sắp xếp theo thứ tự ưu tiên
    // 1. Ví mặc định cá nhân (isDefault = true, không phải shared)
    // 2. Ví cá nhân khác (isDefault = false, không phải shared)
    // 3. Ví nhóm (isShared = true, owner)
    // 4. Ví tham gia - Sử dụng (shared, role = USE/MEMBER)
    // 5. Ví tham gia - Xem (shared, role = VIEW/VIEWER)

    const aIsDefault = !!a?.isDefault;
    const bIsDefault = !!b?.isDefault;
    const aIsShared = !!a?.isShared || !!(a?.walletRole || a?.sharedRole || a?.role);
    const bIsShared = !!b?.isShared || !!(b?.walletRole || b?.sharedRole || b?.role);
    
    // Lấy role của ví
    const getWalletRole = (wallet) => {
      if (!wallet) return "";
      const role = (wallet?.walletRole || wallet?.sharedRole || wallet?.role || "").toUpperCase();
      return role;
    };
    
    const aRole = getWalletRole(a);
    const bRole = getWalletRole(b);
    
    // Kiểm tra xem có phải owner không (ví nhóm)
    const isOwner = (wallet) => {
      if (!wallet) return false;
      const role = getWalletRole(wallet);
      return ["OWNER", "MASTER", "ADMIN"].includes(role);
    };
    
    const aIsOwner = isOwner(a);
    const bIsOwner = isOwner(b);
    
    // Lấy priority để so sánh (số nhỏ hơn = ưu tiên cao hơn)
    const getPriority = (wallet) => {
      const isDefault = !!wallet?.isDefault;
      const isShared = !!wallet?.isShared || !!(wallet?.walletRole || wallet?.sharedRole || wallet?.role);
      const role = getWalletRole(wallet);
      const isOwnerRole = isOwner(wallet);
      
      // 1. Ví mặc định cá nhân
      if (isDefault && !isShared) return 1;
      
      // 2. Ví cá nhân khác
      if (!isShared) return 2;
      
      // 3. Ví nhóm (owner)
      if (isShared && isOwnerRole) return 3;
      
      // 4. Ví tham gia - Sử dụng
      if (["MEMBER", "USER", "USE"].includes(role)) return 4;
      
      // 5. Ví tham gia - Xem
      if (["VIEW", "VIEWER"].includes(role)) return 5;
      
      // Mặc định
      return 6;
    };
    
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Nếu cùng priority, giữ nguyên thứ tự
    return 0;
  });
  return arr;
};

/**
 * Format ngày theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string} date - Date object hoặc date string (ISO format từ API)
 * @returns {string} - Format: "DD/MM/YYYY"
 */
function formatVietnamDate(date) {
  if (!date) return "";

  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    return "";
  }

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format giờ theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string} date - Date object hoặc date string (ISO format từ API)
 * @returns {string} - Format: "HH:mm"
 */
function formatVietnamTime(date) {
  if (!date) return "";

  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    return "";
  }

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format time label cho giao dịch (ngày giờ chính xác)
 */
function formatTimeLabel(dateString) {
  if (!dateString) return "";

  const transactionDate = new Date(dateString);
  if (Number.isNaN(transactionDate.getTime())) return "";

  const dateStr = formatVietnamDate(transactionDate);
  const timeStr = formatVietnamTime(transactionDate);

  return `${dateStr} ${timeStr}`;
}

const getVietnamDateTime = () => {
  const now = new Date();
  const vietnamTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  return vietnamTime.toISOString();
};

export default function WalletsPage() {
  const { t } = useLanguage();
  const {
    wallets = [],
    createWallet,
    updateWallet,
    deleteWallet,
    transferMoney,
    mergeWallets,
    convertToGroup,
    loadWallets,
    setDefaultWallet,
  } = useWalletData();
  const location = useLocation();

  const [currentUserId, setCurrentUserId] = useState(() => getLocalUserId());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUserChange = () => {
      setCurrentUserId(getLocalUserId());
    };
    window.addEventListener("userChanged", handleUserChange);
    window.addEventListener("storage", handleUserChange);
    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleUserChange);
    };
  }, []);

  const { expenseCategories = [], incomeCategories = [] } = useCategoryData();

  const incomeCategoryOptions = useMemo(
    () => (incomeCategories.length ? incomeCategories : DEMO_CATEGORIES),
    [incomeCategories]
  );

  const expenseCategoryOptions = useMemo(
    () => (expenseCategories.length ? expenseCategories : DEMO_CATEGORIES),
    [expenseCategories]
  );

  const [localSharedMap, setLocalSharedMap] = useState({});

  const walletHasSharedMembers = useCallback(
    (wallet) => {
      if (!wallet) return false;
      const localEmails = localSharedMap[wallet.id];
      if (localEmails && localEmails.length) return true;
      if (wallet.hasSharedMembers) return true;
      const sharedEmails = wallet.sharedEmails || [];
      if (sharedEmails.length > 0) return true;
      const memberCount = Number(wallet.membersCount || 0);
      if (memberCount > 1) return true;
      const role = (
        wallet.walletRole ||
        wallet.sharedRole ||
        wallet.role ||
        ""
      ).toUpperCase();
      if (role && !["", "OWNER", "MASTER", "ADMIN"].includes(role)) {
        return true;
      }
      return false;
    },
    [localSharedMap]
  );
    // Determine if the current user is the owner/administrator for a shared wallet
    const isWalletOwnedByMe = useCallback(
      (wallet) => {
        if (!wallet) return false;
        if (!(wallet.isShared || walletHasSharedMembers(wallet))) return false;
        const role = (
          wallet.walletRole ||
          wallet.sharedRole ||
          wallet.role ||
          ""
        ).toUpperCase();
        if (role) {
          if (["OWNER", "MASTER", "ADMIN"].includes(role)) return true;
          if (["MEMBER", "VIEW", "VIEWER", "USER", "USE"].includes(role))
            return false;
        }
        if (wallet.ownerUserId && currentUserId) {
          return String(wallet.ownerUserId) === String(currentUserId);
        }
        return true;
      },
      [currentUserId, walletHasSharedMembers]
    );

    // Personal wallets: include non-group wallets; if a personal wallet has shares,
    // include it here only when the current user is the owner (so recipients don't see it in Personal)
    const personalWallets = useMemo(() => {
      return wallets.filter((w) => {
        if (w.isShared) return false;
        if (walletHasSharedMembers(w)) return isWalletOwnedByMe(w);
        return true;
      });
    }, [wallets, walletHasSharedMembers, isWalletOwnedByMe]);

    // Group wallets: show group wallets that the current user owns
    const groupWallets = useMemo(
      () => wallets.filter((w) => w.isShared && isWalletOwnedByMe(w)),
      [wallets, isWalletOwnedByMe]
    );

  const sharedCandidates = useMemo(
    () => wallets.filter((w) => walletHasSharedMembers(w) || w.isShared),
    [wallets, walletHasSharedMembers]
  );
  const sharedByMeWallets = useMemo(
    () => sharedCandidates.filter((w) => isWalletOwnedByMe(w)),
    [sharedCandidates, isWalletOwnedByMe]
  );
  const sharedWithMeWallets = useMemo(
    () => sharedCandidates.filter((w) => !isWalletOwnedByMe(w)),
    [sharedCandidates, isWalletOwnedByMe]
  );

  const sharedWithMeDisplayWallets = useMemo(() => {
    const normalizedActual = sharedWithMeWallets.map((wallet) => ({
      ...wallet,
      ownerName: normalizeOwnerName(wallet),
      ownerEmail: normalizeOwnerEmail(wallet),
    }));
    const demoWallets = DEMO_SHARED_WITH_ME.map((wallet) => ({
      ...wallet,
      ownerName: normalizeOwnerName(wallet),
      ownerEmail: normalizeOwnerEmail(wallet),
    }));
    return [...normalizedActual, ...demoWallets];
  }, [sharedWithMeWallets]);

  const [sharedFilter, setSharedFilter] = useState("sharedByMe");
  const sharedWallets = useMemo(() => {
    return sharedFilter === "sharedWithMe"
      ? sharedWithMeWallets
      : sharedByMeWallets;
  }, [sharedFilter, sharedByMeWallets, sharedWithMeWallets]);

  const [activeTab, setActiveTab] = useState("personal");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const sharedWithMeOwnerGroups = useMemo(() => {
    const keyword = (search || "").trim().toLowerCase();
    const ownersMap = new Map();

    sharedWithMeDisplayWallets.forEach((wallet) => {
      const matchesKeyword = keyword
        ? [wallet.name, wallet.note, wallet.ownerName, wallet.ownerEmail]
            .filter(Boolean)
            .some((text) => text.toLowerCase().includes(keyword))
        : true;
      if (!matchesKeyword) return;

      const ownerId = buildOwnerId(wallet);
      if (!ownersMap.has(ownerId)) {
        ownersMap.set(ownerId, {
          id: ownerId,
          displayName: normalizeOwnerName(wallet),
          email: normalizeOwnerEmail(wallet),
          wallets: [],
        });
      }
      ownersMap.get(ownerId).wallets.push(wallet);
    });

    return Array.from(ownersMap.values()).map((owner) => ({
      ...owner,
      wallets: sortWalletsByMode(owner.wallets, sortBy),
    }));
  }, [sharedWithMeDisplayWallets, search, sortBy]);

  const [selectedId, setSelectedId] = useState(null);
  const focusWalletId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("focus");
  }, [location.search]);

  useEffect(() => {
    if (!focusWalletId || !wallets.length) return;
    const matched = wallets.find((w) => String(w.id) === String(focusWalletId));
    if (matched) {
      setSelectedId(matched.id);
    }
  }, [focusWalletId, wallets]);

  const selectedWallet = useMemo(
    () => wallets.find((w) => String(w.id) === String(selectedId)) || null,
    [wallets, selectedId]
  );

  const shouldForceLoadMembers = useMemo(() => {
    if (!selectedWallet) return false;
    return walletHasSharedMembers(selectedWallet);
  }, [selectedWallet, walletHasSharedMembers]);

  const [activeDetailTab, setActiveDetailTab] = useState("view");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(buildWalletForm());
  const [createShareEnabled, setCreateShareEnabled] = useState(false);
  const [createShareEmail, setCreateShareEmail] = useState("");

  const [editForm, setEditForm] = useState(buildWalletForm());
  const [editShareEmail, setEditShareEmail] = useState("");
  const [shareWalletLoading, setShareWalletLoading] = useState(false);
  const [selectedSharedOwnerId, setSelectedSharedOwnerId] = useState(null);
  const [selectedSharedOwnerWalletId, setSelectedSharedOwnerWalletId] =
    useState(null);

  const selectedWalletSharedEmails = useMemo(() => {
    if (!selectedWallet?.id) return [];
    const apiEmails = Array.isArray(selectedWallet.sharedEmails)
      ? selectedWallet.sharedEmails
      : [];
    const localEmails = localSharedMap[selectedWallet.id] || [];
    const editEmails = Array.isArray(editForm.sharedEmails)
      ? editForm.sharedEmails
      : [];
    const mergedSet = new Set(
      apiEmails.filter((email) => typeof email === "string" && email.trim())
    );
    [...localEmails, ...editEmails].forEach((email) => {
      if (typeof email === "string" && email.trim()) {
        mergedSet.add(email.trim());
      }
    });
    return Array.from(mergedSet);
  }, [
    selectedWallet?.id,
    selectedWallet?.sharedEmails,
    localSharedMap,
    editForm.sharedEmails,
  ]);

  const selectedWalletEmailSet = useMemo(() => {
    if (!selectedWallet?.id) return new Set();
    const combine = [];
    if (Array.isArray(selectedWallet.sharedEmails)) {
      combine.push(...selectedWallet.sharedEmails);
    }
    if (localSharedMap[selectedWallet.id]) {
      combine.push(...localSharedMap[selectedWallet.id]);
    }
    if (Array.isArray(editForm.sharedEmails)) {
      combine.push(...editForm.sharedEmails);
    }
    return new Set(
      combine
        .map((email) =>
          typeof email === "string" ? email.trim().toLowerCase() : ""
        )
        .filter(Boolean)
    );
  }, [
    selectedWallet?.id,
    selectedWallet?.sharedEmails,
    localSharedMap,
    editForm.sharedEmails,
  ]);

  const canInviteSelectedWallet = useMemo(() => {
    if (!selectedWallet) return false;
    if (!selectedWallet.isShared) return true;
    return isWalletOwnedByMe(selectedWallet);
  }, [selectedWallet, isWalletOwnedByMe]);

  const [mergeTargetId, setMergeTargetId] = useState("");

  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupCategoryId, setTopupCategoryId] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawCategoryId, setWithdrawCategoryId] = useState("");

  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const [demoNavigationState, setDemoNavigationState] = useState({
    visible: false,
    walletName: "",
  });
  const demoNavigationTimeoutRef = useRef(null);

  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);

  const showToast = (message, type = "success") =>
    setToast({ open: true, message, type });
  const closeToast = () =>
    setToast((prev) => ({ ...prev, open: false }));

  const markLocalShared = useCallback((walletId, emails = []) => {
    const cleanEmails = emails
      .map((email) => email?.trim())
      .filter((email) => !!email);
    if (!walletId || !cleanEmails.length) return;
    setLocalSharedMap((prev) => {
      const existing = prev[walletId] || [];
      const merged = Array.from(new Set([...existing, ...cleanEmails]));
      if (merged.length === existing.length) {
        return prev;
      }
      return { ...prev, [walletId]: merged };
    });
  }, []);

  const shareEmailForSelectedWallet = useCallback(
    async (rawEmail, overrideWalletId = null) => {
      const email = rawEmail?.trim();
      if (!email) {
        const message = t('wallets.error.email_invalid');
        showToast(message, "error");
        return { success: false, message };
      }

      const walletIdToUse = overrideWalletId ?? selectedWallet?.id;
      if (!walletIdToUse) {
        const message = t('wallets.error.select_wallet_first');
        showToast(message, "error");
        return { success: false, message };
      }

      const normalized = email.toLowerCase();
      // Prevent sharing to current user
      let currentUserEmail = null;
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          currentUserEmail = (u.email || u.userEmail || u.username || null)?.toLowerCase?.();
        }
      } catch (e) {
        // ignore
      }
      if (currentUserEmail && normalized === (currentUserEmail || "").toLowerCase()) {
        const key = 'wallets.error.cannot_share_self';
        const translated = t(key);
        const message = translated && translated !== key ? translated : "Không thể chia sẻ cho chính mình.";
        showToast(message, "error");
        return { success: false, message };
      }

      // Check local aggregated email set first (fast path) - only when operating on the currently selected wallet
      if (!overrideWalletId && selectedWalletEmailSet.has(normalized)) {
        const message = t('wallets.error.email_already_shared');
        showToast(message, "error");
        return { success: false, message };
      }

      // As a fallback, fetch actual wallet members from server and ensure the email isn't already a member
      try {
        if (walletAPI.getWalletMembers) {
          const resp = await walletAPI.getWalletMembers(walletIdToUse);
          let members = [];
          if (!resp) members = [];
          else if (Array.isArray(resp)) members = resp;
          else if (Array.isArray(resp.data)) members = resp.data;
          else if (Array.isArray(resp.members)) members = resp.members;
          else if (resp.result && Array.isArray(resp.result.data)) members = resp.result.data;

          const memberEmails = new Set();
          for (const m of members) {
            if (!m) continue;
            const e = (m.email || m.userEmail || (m.user && (m.user.email || m.userEmail)) || m.memberEmail || "")
              .toString()
              .trim()
              .toLowerCase();
            if (e) memberEmails.add(e);
          }
          if (memberEmails.has(normalized)) {
            const message = t('wallets.error.email_already_shared');
            showToast(message, "error");
            return { success: false, message };
          }
        }
      } catch (err) {
        // If member fetch fails, continue and rely on server response for duplicate handling
        // eslint-disable-next-line no-console
        console.debug("Could not verify existing members before share:", err);
      }

      try {
        setShareWalletLoading(true);
        await walletAPI.shareWallet(walletIdToUse, email);

        // Verify whether the email corresponds to an existing user linked to the wallet
        let verifiedAsExistingUser = false;
        try {
          if (walletAPI.getWalletMembers) {
            const resp2 = await walletAPI.getWalletMembers(walletIdToUse);
            let members2 = [];
            if (!resp2) members2 = [];
            else if (Array.isArray(resp2)) members2 = resp2;
            else if (Array.isArray(resp2.data)) members2 = resp2.data;
            else if (Array.isArray(resp2.members)) members2 = resp2.members;
            else if (resp2.result && Array.isArray(resp2.result.data)) members2 = resp2.result.data;

            const newMember = members2.find((m) => {
              if (!m) return false;
              const e = (m.email || m.userEmail || (m.user && (m.user.email || m.userEmail)) || m.memberEmail || "").toString().trim().toLowerCase();
              return e === normalized;
            });

            if (newMember) {
              // Consider existing user if member has a linked user id
              const memberUserId = newMember.userId ?? newMember.memberUserId ?? newMember.memberId ?? (newMember.user && (newMember.user.id || newMember.user.userId)) ?? null;
              if (memberUserId) {
                verifiedAsExistingUser = true;
              } else {
                // No user id => likely an invitation / non-existing account. Try to revert the share.
                try {
                  const memberIdToRemove = newMember.memberId ?? newMember.id ?? memberUserId ?? null;
                  if (memberIdToRemove && walletAPI.removeMember) {
                    await walletAPI.removeMember(walletIdToUse, memberIdToRemove);
                  }
                } catch (remErr) {
                  // ignore removal errors
                  // eslint-disable-next-line no-console
                  console.debug("Could not revert share for non-existing user:", remErr);
                }
              }
            }
          }
        } catch (verErr) {
          // If verification call failed, we'll rely on backend behavior and not block the share
          // eslint-disable-next-line no-console
          console.debug("Could not verify member after share:", verErr);
        }

        if (!verifiedAsExistingUser) {
          // Inform user that the email isn't a registered account and was not shared
          const key = 'wallets.error.user_not_found';
          const translated = t(key);
          const message = translated && translated !== key ? translated : "Tài khoản này chưa tồn tại trong hệ thống.";
          showToast(message, "error");
          return { success: false, message };
        }

        // If verified, update local state and reload wallets
        markLocalShared(walletIdToUse, [email]);
        setEditForm((prev) => {
          const list = prev.sharedEmails || [];
          if (list.includes(email)) return prev;
          return { ...prev, sharedEmails: [...list, email] };
        });
        showToast(`${t('wallets.share_success')} ${email}`);
        await loadWallets();
        return { success: true };
      } catch (error) {
        const message = error.message || t('wallets.toast.create_error');
        showToast(message, "error");
        return { success: false, message };
      } finally {
        setShareWalletLoading(false);
      }
    },
    [
      selectedWallet?.id,
      selectedWalletEmailSet,
      markLocalShared,
      loadWallets,
      showToast,
      setEditForm,
    ]
  );

  useEffect(() => {
    if (activeTab !== "shared" || sharedFilter !== "sharedWithMe") {
      setSelectedSharedOwnerId(null);
      setSelectedSharedOwnerWalletId(null);
      return;
    }
    if (!sharedWithMeOwnerGroups.length) {
      setSelectedSharedOwnerId(null);
      setSelectedSharedOwnerWalletId(null);
      return;
    }
    setSelectedSharedOwnerId((prev) => {
      if (prev && sharedWithMeOwnerGroups.some((owner) => owner.id === prev)) {
        return prev;
      }
      return sharedWithMeOwnerGroups[0]?.id || null;
    });
  }, [activeTab, sharedFilter, sharedWithMeOwnerGroups]);

  useEffect(() => {
    if (!selectedSharedOwnerId) {
      if (selectedSharedOwnerWalletId !== null) {
        setSelectedSharedOwnerWalletId(null);
      }
      return;
    }
    const owner = sharedWithMeOwnerGroups.find(
      (o) => o.id === selectedSharedOwnerId
    );
    if (!owner) {
      if (selectedSharedOwnerWalletId !== null) {
        setSelectedSharedOwnerWalletId(null);
      }
      return;
    }
    if (
      selectedSharedOwnerWalletId &&
      !owner.wallets.some(
        (wallet) =>
          String(wallet.id) === String(selectedSharedOwnerWalletId)
      )
    ) {
      setSelectedSharedOwnerWalletId(null);
    }
  }, [
    selectedSharedOwnerId,
    sharedWithMeOwnerGroups,
    selectedSharedOwnerWalletId,
  ]);

  const handleSelectSharedOwner = useCallback((ownerId) => {
    setSelectedSharedOwnerId(ownerId);
    setSelectedSharedOwnerWalletId(null);
  }, []);

  const handleSelectSharedOwnerWallet = useCallback((walletId) => {
    setSelectedSharedOwnerWalletId((prev) =>
      prev && String(prev) === String(walletId) ? null : walletId
    );
  }, []);

  const handleDemoViewWallet = useCallback((wallet) => {
    if (!wallet) return;
    if (demoNavigationTimeoutRef.current) {
      clearTimeout(demoNavigationTimeoutRef.current);
    }
    setDemoNavigationState({
      visible: true,
      walletName: wallet.name || "ví được chia sẻ",
    });
    demoNavigationTimeoutRef.current = setTimeout(() => {
      setDemoNavigationState({ visible: false, walletName: "" });
    }, 3000);
  }, []);

  const handleDemoCancelSelection = useCallback(() => {
    setSelectedSharedOwnerWalletId(null);
  }, []);

  useEffect(
    () => () => {
      if (demoNavigationTimeoutRef.current) {
        clearTimeout(demoNavigationTimeoutRef.current);
      }
    },
    []
  );

  const currentList = useMemo(() => {
    if (activeTab === "personal") return personalWallets;
    if (activeTab === "group") return groupWallets;
    if (activeTab === "shared") return sharedWallets;
    return personalWallets;
  }, [activeTab, personalWallets, groupWallets, sharedWallets]);

  const filteredWallets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return currentList;
    return currentList.filter((w) => {
      const name = (w.name || "").toLowerCase();
      const note = (w.note || "").toLowerCase();
      return name.includes(keyword) || note.includes(keyword);
    });
  }, [currentList, search]);

  const sortedWallets = useMemo(
    () => sortWalletsByMode(filteredWallets, sortBy),
    [filteredWallets, sortBy]
  );

  // Debug: log counts to help diagnose empty shared list (placed after sortedWallets)
  // (debug logging removed)

  useEffect(() => {
    setEditForm(buildWalletForm(selectedWallet));
    setEditShareEmail("");
    setMergeTargetId("");
    setTopupAmount("");
    setTopupNote("");
    setTopupCategoryId("");
    setWithdrawAmount("");
    setWithdrawNote("");
    setWithdrawCategoryId("");
    setTransferTargetId("");
    setTransferAmount("");
    setTransferNote("");
    setShowCreate(false);
    setActiveDetailTab("view");
  }, [selectedWallet?.id]);

  useEffect(() => {
    if (!selectedId) return;
    const isStillVisible = currentList.some(
      (item) => String(item.id) === String(selectedId)
    );
    if (!isStillVisible) {
      setSelectedId(null);
    }
  }, [currentList, selectedId]);

  // Helper function để tính tỷ giá
  const getRate = (from, to) => {
    if (!from || !to || from === to) return 1;
    const rates = {
      VND: 1,
      USD: 0.000041, // 1 VND = 0.000041 USD
      EUR: 0.000038,
      JPY: 0.0063,
      GBP: 0.000032,
      CNY: 0.0003,
    };
    if (!rates[from] || !rates[to]) return 1;
    const fromToVND = 1 / rates[from];
    const toToVND = 1 / rates[to];
    return fromToVND / toToVND;
  };

  // Helper function để chuyển đổi số tiền về VND
  const convertToVND = (amount, currency) => {
    const numericAmount = Number(amount) || 0;
    if (!currency || currency === "VND") return numericAmount;
    const rate = getRate(currency, "VND");
    return numericAmount * rate;
  };

  // Helper function để chuyển đổi từ VND sang currency khác
  const convertFromVND = (amountVND, targetCurrency) => {
    const base = Number(amountVND) || 0;
    if (!targetCurrency || targetCurrency === "VND") return base;
    const rate = getRate("VND", targetCurrency);
    const converted = base * rate;
    const decimals = targetCurrency === "VND" ? 0 : 8;
    return (
      Math.round(converted * Math.pow(10, decimals)) /
      Math.pow(10, decimals)
    );
  };

  // Lấy đơn vị tiền tệ mặc định từ localStorage
  const [displayCurrency, setDisplayCurrency] = useState(() => {
    return localStorage.getItem("defaultCurrency") || "VND";
  });

  // Lắng nghe sự kiện thay đổi currency setting
  useEffect(() => {
    const handleCurrencyChange = (e) => {
      setDisplayCurrency(e.detail.currency);
    };
    window.addEventListener("currencySettingChanged", handleCurrencyChange);
    return () => {
      window.removeEventListener(
        "currencySettingChanged",
        handleCurrencyChange
      );
    };
  }, []);

  useEffect(() => {
    setLocalSharedMap((prev) => {
      let changed = false;
      const next = { ...prev };
      wallets.forEach((wallet) => {
        const hasServerShare =
          wallet?.hasSharedMembers ||
          (wallet?.sharedEmails?.length > 0) ||
          wallet?.membersCount > 1;
        if (hasServerShare && next[wallet.id]) {
          delete next[wallet.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [wallets]);


  // Tổng số dư: chuyển đổi tất cả về VND, sau đó quy đổi sang displayCurrency
  const totalBalance = useMemo(
    () => {
      const totalInVND = wallets
        .filter((w) => w.includeOverall !== false)
        .reduce((sum, w) => {
          const balanceInVND = convertToVND(
            w.balance ?? w.current ?? 0,
            w.currency || "VND"
          );
          return sum + balanceInVND;
        }, 0);
      return convertFromVND(totalInVND, displayCurrency);
    },
    [wallets, displayCurrency]
  );

  const handleSelectWallet = (id) => {
    setSelectedId(id);
    setActiveDetailTab("view");
  };

  const handleChangeSelectedWallet = (idOrNull) => {
    setSelectedId(idOrNull);
    setActiveDetailTab("view");
  };

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCreateShareEmail = () => {
    const email = createShareEmail.trim();
    if (!email) return;
    const normalized = email.toLowerCase();

    // Prevent adding current user's email
    let currentUserEmail = null;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        currentUserEmail = (u.email || u.userEmail || u.username || null)?.toLowerCase?.();
      }
    } catch (e) {
      // ignore
    }
    if (currentUserEmail && normalized === (currentUserEmail || "").toLowerCase()) {
      const key = 'wallets.error.cannot_share_self';
      const translated = t(key);
      const message = translated && translated !== key ? translated : "Không thể chia sẻ cho chính mình.";
      showToast(message, "error");
      return;
    }

    setCreateForm((prev) => {
      const exists = (prev.sharedEmails || []).some((e) => (e || "").toLowerCase() === normalized);
      if (exists) {
        const key = 'wallets.error.email_already_shared';
        const translated = t(key);
        const message = translated && translated !== key ? translated : "Email đã được chia sẻ";
        showToast(message, "error");
        return prev;
      }
      return { ...prev, sharedEmails: [...(prev.sharedEmails || []), email] };
    });
    setCreateShareEmail("");
  };

  const handleRemoveCreateShareEmail = (email) => {
    setCreateForm((prev) => ({
      ...prev,
      sharedEmails: prev.sharedEmails.filter((e) => e !== email),
    }));
  };

  const shareWalletWithEmails = useCallback(
    async (walletId, emails = []) => {
      const results = { success: 0, failed: [], successEmails: [] };
      if (!walletId || !emails.length) {
        return results;
      }

      for (const rawEmail of emails) {
        const email = rawEmail?.trim();
        if (!email) continue;
        try {
          // Use central shareEmailForSelectedWallet validation flow when available
          if (typeof shareEmailForSelectedWallet === "function") {
            const res = await shareEmailForSelectedWallet(email, walletId);
            if (res?.success) {
              results.success += 1;
              results.successEmails.push(email);
            } else {
              results.failed.push({ email, message: res?.message || "Không thể chia sẻ ví" });
            }
          } else {
            await walletAPI.shareWallet(walletId, email);
            results.success += 1;
            results.successEmails.push(email);
          }
        } catch (error) {
          results.failed.push({
            email,
            message: error.message || "Không thể chia sẻ ví",
          });
        }
      }

      if (results.successEmails.length) {
        markLocalShared(walletId, results.successEmails);
      }

      return results;
    },
    [markLocalShared]
  );

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!createWallet) return;

    const shareEmails = createShareEnabled
      ? createForm.sharedEmails
          .map((email) => email.trim())
          .filter(Boolean)
      : [];

    try {
      const payload = {
        name: createForm.name.trim(),
        currency: createForm.currency,
        note: createForm.note?.trim() || "",
        isDefault: !!createForm.isDefault,
        isShared: false,
      };

      const created = await createWallet(payload);

      if (!created?.id) {
        throw new Error(t('wallets.error.no_created_info'));
      }

      let shareResult = { success: 0, failed: [] };
      if (shareEmails.length) {
        shareResult = await shareWalletWithEmails(created.id, shareEmails);
      }
      
      // Reload wallets để cập nhật danh sách ví sau khi tạo
      await loadWallets();

      const hasSuccessfulShare = shareResult.success > 0;
      const hasFailedShare = shareResult.failed.length > 0;

      if (shareEmails.length) {
        if (hasSuccessfulShare && !hasFailedShare) {
          showToast(
            `${t('wallets.toast.created_personal')} "${
              created.name || createForm.name
            }" ${t('wallets.toast.shared_count_suffix', { count: shareResult.success })}`
          );
        } else if (hasSuccessfulShare && hasFailedShare) {
          const failedEmails = shareResult.failed
            .map((item) => item.email)
            .join(", ");
          showToast(
              `${t('wallets.toast.created_personal')} ${t('wallets.toast.share_failed_for')}: ${failedEmails}`,
              "error"
            );
        } else {
          const failedEmails = shareEmails.join(", ");
          showToast(
              `${t('wallets.toast.share_failed_for')}: ${failedEmails}`,
              "error"
            );
        }
      } else {
        showToast(`${t('wallets.toast.created_personal')} "${created.name || createForm.name}"`);
      }

      setSelectedId(created.id);
      setActiveDetailTab("view");
      setActiveTab("personal");

      setCreateForm(buildWalletForm());
      setCreateShareEmail("");
      setCreateShareEnabled(false);
      setShowCreate(false);
    } catch (error) {
      showToast(error.message || t('wallets.toast.create_error'), "error");
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEditShareEmail = async () => {
    const result = await shareEmailForSelectedWallet(editShareEmail);
    if (result?.success) {
      setEditShareEmail("");
    }
  };

  const handleRemoveEditShareEmail = (email) => {
    setEditForm((prev) => ({
      ...prev,
      sharedEmails: (prev.sharedEmails || []).filter((e) => e !== email),
    }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedWallet || !updateWallet) return;
    try {
      await updateWallet({
        id: selectedWallet.id,
        name: editForm.name.trim(),
        note: editForm.note?.trim() || "",
        currency: editForm.currency,
        isDefault: !!editForm.isDefault,
      });
      // Immediately notify user and switch to detail view for this wallet
      showToast(t('wallets.toast.updated'));
      setSelectedId(selectedWallet.id);
      setActiveDetailTab("view");
      // Reload wallets in background to update data
      loadWallets().catch((err) => console.debug("loadWallets failed after edit:", err));
    } catch (error) {
      showToast(error.message || t('wallets.toast.update_error'), "error");
    }
  };

  const handleDeleteWallet = async (walletId) => {
    if (!walletId || !deleteWallet) return;
    try {
      const wallet = wallets.find((w) => Number(w.id) === Number(walletId));
      const walletName = wallet?.name || "ví";
      await deleteWallet(walletId);
      showToast(`${t('wallets.toast.deleted')} "${walletName}"`);
      if (String(walletId) === String(selectedId)) {
        setSelectedId(null);
        setActiveDetailTab("view");
      }
    } catch (error) {
      showToast(error.message || t('common.error'), "error");
    }
  };

  const handleSubmitTopup = async (e) => {
    e.preventDefault();
    if (!selectedWallet) return;
    const amountNum = Number(topupAmount);
    if (!amountNum || amountNum <= 0 || !topupCategoryId) {
      return;
    }
    try {
      const response = await transactionAPI.addIncome(
        amountNum,
        getVietnamDateTime(),
        selectedWallet.id,
        Number(topupCategoryId),
        topupNote || "",
        null
      );
      if (response?.transaction) {
        await loadWallets();
        refreshTransactions();
        showToast(t('wallets.toast.topup_success'));
      } else {
        throw new Error(response?.error || "Không thể tạo giao dịch");
      }
    } catch (error) {
      showToast(error.message || "Không thể nạp tiền", "error");
    } finally {
      setTopupAmount("");
      setTopupNote("");
      setTopupCategoryId("");
    }
  };

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (!selectedWallet) return;
    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum <= 0 || !withdrawCategoryId) {
      return;
    }
    try {
      const response = await transactionAPI.addExpense(
        amountNum,
        getVietnamDateTime(),
        selectedWallet.id,
        Number(withdrawCategoryId),
        withdrawNote || "",
        null
      );
        if (response?.transaction) {
        await loadWallets();
        refreshTransactions();
        showToast(t('wallets.toast.withdraw_success'));
      } else {
        throw new Error(response?.error || "Không thể tạo giao dịch");
      }
    } catch (error) {
      showToast(error.message || "Không thể rút tiền", "error");
    } finally {
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawCategoryId("");
    }
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!selectedWallet || !transferTargetId) return;
    const amountNum = Number(transferAmount);
    if (!amountNum || amountNum <= 0) {
      return;
    }
    try {
      await transferMoney({
        sourceId: selectedWallet.id,
        targetId: Number(transferTargetId),
        amount: amountNum,
        note: transferNote || "",
        mode: "this_to_other",
      });
      await loadWallets();
      refreshTransactions();
      showToast(t('wallets.toast.transfer_success'));
    } catch (error) {
      showToast(error.message || t('wallets.toast.create_error'), "error");
    } finally {
      setTransferTargetId("");
      setTransferAmount("");
      setTransferNote("");
    }
  };

  const handleSubmitMerge = async (e, options) => {
    e?.preventDefault?.();
    if (!mergeWallets) return;

    const payload = options || {
      sourceWalletId: selectedWallet?.id,
      targetWalletId: mergeTargetId ? Number(mergeTargetId) : null,
      currencyMode: "keepTarget",
      direction: "this_into_other",
      setTargetAsDefault: false,
    };

    const sourceId = payload?.sourceWalletId;
    const targetId = payload?.targetWalletId;
    if (!sourceId || !targetId) return;

    try {
      const keepCurrency =
        payload.currencyMode === "keepSource" ? "SOURCE" : "TARGET";
      const sourceWallet = wallets.find(
        (w) => Number(w.id) === Number(sourceId)
      );
      const targetWallet = wallets.find(
        (w) => Number(w.id) === Number(targetId)
      );
      const targetCurrency =
        keepCurrency === "SOURCE"
          ? sourceWallet?.currency || targetWallet?.currency || "VND"
          : targetWallet?.currency || sourceWallet?.currency || "VND";

      await mergeWallets({
        sourceId,
        targetId,
        keepCurrency,
        targetCurrency,
      });

      if (payload.setTargetAsDefault && updateWallet) {
        await updateWallet({ id: targetId, isDefault: true });
      }

      await loadWallets();
      refreshTransactions();

      showToast(t('wallets.toast.merged'));
      setSelectedId(targetId);
      setActiveDetailTab("view");
    } catch (error) {
      showToast(error.message || "Không thể gộp ví", "error");
    } finally {
      setMergeTargetId("");
    }
  };

  const handleConvertToGroup = async (e, options) => {
    e?.preventDefault?.();
    if (!selectedWallet || !convertToGroup) return;
    try {
      if (selectedWallet.isDefault && options) {
        if (options.newDefaultWalletId) {
          await setDefaultWallet?.(options.newDefaultWalletId);
        } else if (options.noDefault) {
          await updateWallet?.({
            id: selectedWallet.id,
            isDefault: false,
          });
        }
      }

      await convertToGroup(selectedWallet.id);
      showToast(t('wallets.toast.converted'));
      setSelectedId(null);
      setActiveTab("group");
      setActiveDetailTab("view");
    } catch (error) {
      const errorMessage =
        error.message ||
        "Không thể chuyển ví nhóm về ví cá nhân. Vui lòng xóa các thành viên trước.";
      showToast(errorMessage, "error");
    }
  };

  // Map transaction từ API sang format cho WalletDetail
  const mapTransactionForWallet = useCallback((tx, walletId) => {
    const typeName = tx.transactionType?.typeName || "";
    const isExpense = typeName === "Chi tiêu";
    const amount = parseFloat(tx.amount || 0);

    const categoryName = tx.category?.categoryName || "Khác";
    const note = tx.note || "";
    let title = categoryName;
    if (note) {
      title = `${categoryName}${note ? ` - ${note}` : ""}`;
    }

    const displayAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);

    const dateValue =
      tx.createdAt || tx.transactionDate || new Date().toISOString();
    const timeLabel = formatTimeLabel(dateValue);

    const creatorName = tx.user?.fullName || tx.user?.name || tx.user?.email || tx.createdByName || tx.creatorName || (tx.user && (tx.user.username || tx.user.displayName)) || "";

    return {
      id: tx.transactionId,
      title: title,
      amount: displayAmount,
      timeLabel: timeLabel,
      categoryName: categoryName,
      currency: tx.wallet?.currencyCode || "VND",
      date: dateValue,
      creatorName,
    };
  }, []);

  // Map transfer từ API sang format cho WalletDetail
  const mapTransferForWallet = useCallback((transfer, walletId) => {
    const isFromWallet = transfer.fromWallet?.walletId === walletId;
    const amount = parseFloat(transfer.amount || 0);

    const sourceName = transfer.fromWallet?.walletName || "Ví nguồn";
    const targetName = transfer.toWallet?.walletName || "Ví đích";
    const title = isFromWallet
      ? `Chuyển đến ${targetName}`
      : `Nhận từ ${sourceName}`;

    const displayAmount = isFromWallet ? -Math.abs(amount) : Math.abs(amount);

    const dateValue =
      transfer.createdAt || transfer.transferDate || new Date().toISOString();
    const timeLabel = formatTimeLabel(dateValue);

    const actorName = transfer.user?.fullName || transfer.user?.name || transfer.user?.email || transfer.createdByName || transfer.creatorName || "";

    return {
      id: `transfer-${transfer.transferId}`,
      title: title,
      amount: displayAmount,
      timeLabel: timeLabel,
      categoryName: "Chuyển tiền giữa các ví",
      currency: transfer.currencyCode || "VND",
      date: dateValue,
      creatorName: actorName,
    };
  }, []);

  // Fetch transactions cho wallet đang chọn
  useEffect(() => {
    const loadWalletTransactions = async () => {
      if (!selectedWallet?.id) {
        setWalletTransactions([]);
        return;
      }

      setLoadingTransactions(true);
      try {
        // Support multiple possible wallet id fields from API responses
        const walletId = selectedWallet.id;
        const walletAltId = selectedWallet.walletId || selectedWallet.id;

        // Try multiple wallet-scoped endpoints (some backends restrict /transactions to current user)
        let txResponse = null;
        try {
          if (transactionAPI.getWalletTransactions) {
            txResponse = await transactionAPI.getWalletTransactions(walletId);
          }
        } catch (err) {
          txResponse = null;
        }

        if (!txResponse) {
          try {
            if (transactionAPI.getTransactionsByWallet) {
              txResponse = await transactionAPI.getTransactionsByWallet(walletId);
            }
          } catch (err) {
            txResponse = null;
          }
        }

        if (!txResponse) {
          txResponse = await transactionAPI.getAllTransactions();
        }

        // DEBUG: log which response shape we received to help troubleshoot when only
        // the current user's transactions are returned by the backend.
        // Remove these logs in production.
        try {
          // eslint-disable-next-line no-console
          console.debug("Loaded transactions response for wallet", walletId, txResponse);
        } catch (e) {
          // ignore
        }

        // Normalize possible response shapes
        const txListRaw = txResponse?.transactions || txResponse?.data || txResponse || [];
        const externalTxs = (Array.isArray(txListRaw) ? txListRaw : [])
          .filter((tx) => {
            const w = tx.wallet || {};
            const wid = w.walletId ?? w.id ?? w.wallet_id ?? null;
            return String(wid) === String(walletId) || String(wid) === String(walletAltId);
          })
          .map((tx) => mapTransactionForWallet(tx, walletId));

        const transferResponse = await walletAPI.getAllTransfers();
        const transfers = (transferResponse.transfers || [])
          .filter((transfer) => {
            const fromWid = transfer.fromWallet?.walletId ?? transfer.fromWallet?.id ?? null;
            const toWid = transfer.toWallet?.walletId ?? transfer.toWallet?.id ?? null;
            return (
              String(fromWid) === String(walletId) ||
              String(fromWid) === String(walletAltId) ||
              String(toWid) === String(walletId) ||
              String(toWid) === String(walletAltId)
            );
          })
          .map((transfer) => mapTransferForWallet(transfer, walletId));

        const allTransactions = [...externalTxs, ...transfers].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA;
        });

        setWalletTransactions(allTransactions);
      } catch (error) {
        console.error("Error loading wallet transactions:", error);
        setWalletTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadWalletTransactions();
  }, [
    selectedWallet?.id,
    transactionsRefreshKey,
    mapTransactionForWallet,
    mapTransferForWallet,
    currentUserId, // reload when switching account
  ]);

  const refreshTransactions = () => {
    setTransactionsRefreshKey((prev) => prev + 1);
  };

  return (
  <div className="wallets-page tx-page container-fluid py-4">
    <div className="tx-page-inner">
    {/* HEADER RIÊNG CỦA VÍ */}
    <div className="wallet-header mb-3">
      <div className="wallet-header-left">
        <div className="wallet-header-icon">
          <i className="bi bi-wallet2" />
        </div>
        <div>
          <h2 className="wallet-header-title">{t('wallets.title')}</h2>
          <p className="wallet-header-subtitle">{t('wallets.header_subtitle')}</p>
        </div>
      </div>

      <button
        className="wallet-header-btn"
        onClick={() => setShowCreate((v) => !v)}
      >
        <i className="bi bi-plus-lg" />
        <span>{showCreate ? t('wallets.modal.cancel') : t('wallets.create_new')}</span>
      </button>
    </div>
    


      {/* STATS */}
      <div className="wallets-page__stats">
        <div className="budget-metric-card">
          <div className="budget-metric-label">{t('wallets.total_balance')}</div>
          <div className="budget-metric-value">{formatMoney(totalBalance, displayCurrency || "VND")}</div>
        </div>

        <div className="budget-metric-card">
          <div className="budget-metric-label">{t('wallets.tab.personal')}</div>
          <div className="budget-metric-value">{personalWallets.length}</div>
        </div>

        <div className="budget-metric-card">
          <div className="budget-metric-label">{t('wallets.tab.group')}</div>
          <div className="budget-metric-value">{groupWallets.length}</div>
        </div>

        <div className="budget-metric-card">
          <div className="budget-metric-label">{t('wallets.metric.shared_with_me')}</div>
          <div className="budget-metric-value">{sharedWithMeDisplayWallets.length}</div>
        </div>

        <div className="budget-metric-card">
          <div className="budget-metric-label">{t('wallets.metric.shared_by_me')}</div>
          <div className="budget-metric-value">{sharedByMeWallets.length}</div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="wallets-layout">
        <WalletList
          activeTab={activeTab}
          onTabChange={setActiveTab}
          personalCount={personalWallets.length}
          groupCount={groupWallets.length}
          sharedCount={
            sharedByMeWallets.length + sharedWithMeDisplayWallets.length
          }
          sharedFilter={sharedFilter}
          onSharedFilterChange={setSharedFilter}
          sharedByMeCount={sharedByMeWallets.length}
          sharedWithMeCount={sharedWithMeDisplayWallets.length}
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          wallets={sortedWallets.map(w => ({
            ...w,
            // Merge sharedEmails từ localSharedMap nếu có
            sharedEmails: [
              ...(Array.isArray(w.sharedEmails) ? w.sharedEmails : []),
              ...(Array.isArray(localSharedMap[w.id]) ? localSharedMap[w.id] : [])
            ].filter((email, index, self) => 
              email && typeof email === 'string' && email.trim() && 
              self.indexOf(email) === index
            )
          }))}
          selectedId={selectedId}
          onSelectWallet={handleSelectWallet}
          sharedWithMeOwners={sharedWithMeOwnerGroups}
          selectedSharedOwnerId={selectedSharedOwnerId}
          onSelectSharedOwner={handleSelectSharedOwner}
        />

        <WalletDetail
          wallet={selectedWallet}
          walletTabType={activeTab}
          sharedFilter={sharedFilter}
          sharedEmailsOverride={selectedWalletSharedEmails}
          forceLoadSharedMembers={shouldForceLoadMembers}
          canInviteMembers={canInviteSelectedWallet}
          onQuickShareEmail={shareEmailForSelectedWallet}
          quickShareLoading={shareWalletLoading}
          sharedWithMeOwners={sharedWithMeOwnerGroups}
          selectedSharedOwnerId={selectedSharedOwnerId}
          selectedSharedOwnerWalletId={selectedSharedOwnerWalletId}
          onSelectSharedOwnerWallet={handleSelectSharedOwnerWallet}
          onSharedWalletDemoView={handleDemoViewWallet}
          onSharedWalletDemoCancel={handleDemoCancelSelection}
          currencies={CURRENCIES}
          incomeCategories={incomeCategoryOptions}
          expenseCategories={expenseCategoryOptions}
          showCreate={showCreate}
          setShowCreate={setShowCreate}
          activeDetailTab={activeDetailTab}
          setActiveDetailTab={setActiveDetailTab}
          demoTransactions={walletTransactions}
          loadingTransactions={loadingTransactions}
          allWallets={wallets}
          createForm={createForm}
          onCreateFieldChange={handleCreateFieldChange}
          createShareEnabled={createShareEnabled}
          setCreateShareEnabled={setCreateShareEnabled}
          createShareEmail={createShareEmail}
          setCreateShareEmail={setCreateShareEmail}
          onAddCreateShareEmail={handleAddCreateShareEmail}
          onRemoveCreateShareEmail={handleRemoveCreateShareEmail}
          onSubmitCreate={handleSubmitCreate}
          editForm={editForm}
          onEditFieldChange={handleEditFieldChange}
          editShareEmail={editShareEmail}
          setEditShareEmail={setEditShareEmail}
          onAddEditShareEmail={handleAddEditShareEmail}
          shareWalletLoading={shareWalletLoading}
          onRemoveEditShareEmail={handleRemoveEditShareEmail}
          onSubmitEdit={handleSubmitEdit}
          mergeTargetId={mergeTargetId}
          setMergeTargetId={setMergeTargetId}
          onSubmitMerge={handleSubmitMerge}
          topupAmount={topupAmount}
          setTopupAmount={setTopupAmount}
          topupNote={topupNote}
          setTopupNote={setTopupNote}
          topupCategoryId={topupCategoryId}
          setTopupCategoryId={setTopupCategoryId}
          onSubmitTopup={handleSubmitTopup}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          withdrawNote={withdrawNote}
          setWithdrawNote={setWithdrawNote}
          withdrawCategoryId={withdrawCategoryId}
          setWithdrawCategoryId={setWithdrawCategoryId}
          onSubmitWithdraw={handleSubmitWithdraw}
          transferTargetId={transferTargetId}
          setTransferTargetId={setTransferTargetId}
          transferAmount={transferAmount}
          setTransferAmount={setTransferAmount}
          transferNote={transferNote}
          setTransferNote={setTransferNote}
          onSubmitTransfer={handleSubmitTransfer}
          onConvertToGroup={handleConvertToGroup}
          onDeleteWallet={handleDeleteWallet}
          onChangeSelectedWallet={handleChangeSelectedWallet}
        />
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={2500}
        onClose={closeToast}
      />

      {demoNavigationState.visible && (
        <div className="wallets-demo-overlay">
          <div className="wallets-demo-overlay__box">
            <p className="wallets-demo-overlay__title">{t('wallets.demo_navigating_title')}</p>
            {demoNavigationState.walletName && (
              <p className="wallets-demo-overlay__wallet">
                {demoNavigationState.walletName}
              </p>
            )}
            <span className="wallets-demo-overlay__hint">{t('wallets.demo_hint')}</span>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}