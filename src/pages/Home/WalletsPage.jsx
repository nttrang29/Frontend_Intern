// src/pages/Home/WalletsPage.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { logActivity } from "../../utils/activityLogger";
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
import { formatVietnamDateTime } from "../../utils/dateFormat";
import { getExchangeRate } from "../../services/exchange-rate.service";

import "../../styles/pages/WalletsPage.css";
import "../../styles/components/wallets/WalletList.css";
import "../../styles/components/wallets/WalletHeader.css";

const CURRENCIES = ["VND", "USD"];
const NOTE_MAX_LENGTH = 60;
const MERGE_PERSONAL_ONLY_ERROR = "WALLET_MERGE_PERSONAL_ONLY";

const extractListFromResponse = (payload, preferredKey) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (preferredKey && Array.isArray(payload[preferredKey])) return payload[preferredKey];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const resolveWalletIdFromTransaction = (tx) => {
  if (!tx) return null;
  const walletRef = tx.wallet || tx.walletInfo || tx.walletDto || tx.walletDtoResponse || {};
  return (
    walletRef.walletId ??
    walletRef.id ??
    walletRef.wallet_id ??
    tx.walletId ??
    tx.wallet_id ??
    tx.walletID ??
    null
  );
};

const transactionBelongsToWallet = (tx, walletId, walletAltId) => {
  const txWalletId = resolveWalletIdFromTransaction(tx);
  if (!txWalletId) return true; // scoped API responses might omit id, assume already filtered
  return (
    String(txWalletId) === String(walletId) ||
    String(txWalletId) === String(walletAltId)
  );
};

const transferTouchesWallet = (transfer, walletId, walletAltId) => {
  if (!transfer) return false;
  const fromWid =
    transfer.fromWallet?.walletId ??
    transfer.fromWallet?.id ??
    transfer.sourceWalletId ??
    transfer.sourceWalletID ??
    null;
  const toWid =
    transfer.toWallet?.walletId ??
    transfer.toWallet?.id ??
    transfer.targetWalletId ??
    transfer.targetWalletID ??
    null;

  if (!fromWid && !toWid) return true;
  return [fromWid, toWid].some((wid) => {
    if (!wid) return false;
    return String(wid) === String(walletId) || String(wid) === String(walletAltId);
  });
};

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
    // Nếu cùng priority, ưu tiên ví mới hơn lên trước (createdAt desc)
    const getCreatedTime = (w) => {
      if (!w) return 0;
      const raw = w.createdAt || w.created_at || w.created || w.timestamp || 0;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return 0;
      return d.getTime();
    };

    const ta = getCreatedTime(a);
    const tb = getCreatedTime(b);
    if (ta !== tb) return tb - ta; // newer first

    // Fallback: sort by name
    const nameA = (a?.name || "").toLowerCase();
    const nameB = (b?.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
  return arr;
};

/**
 * Format time label cho giao dịch (ngày giờ chính xác)
 */
function normalizeTransactionDate(rawInput) {
  if (!rawInput && rawInput !== 0) {
    return getVietnamDateTime();
  }

  if (rawInput instanceof Date) {
    if (!Number.isNaN(rawInput.getTime())) {
      return rawInput.toISOString();
    }
    return getVietnamDateTime();
  }

  if (typeof rawInput === "number") {
    const fromNumber = new Date(rawInput);
    if (!Number.isNaN(fromNumber.getTime())) {
      return fromNumber.toISOString();
    }
  }

  const rawString = String(rawInput).trim();
  if (!rawString) {
    return getVietnamDateTime();
  }

  const isoWithoutZonePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?)?$/;
  const hasExplicitZone = /(Z|z|[+\-]\d{2}:?\d{2})$/.test(rawString);
  if (isoWithoutZonePattern.test(rawString) && !hasExplicitZone) {
    const isoLike = rawString.includes("T") ? rawString : rawString.replace(" ", "T");
    const appended = `${isoLike}Z`;
    const utcDate = new Date(appended);
    if (!Number.isNaN(utcDate.getTime())) {
      return utcDate.toISOString();
    }
  }

  const isoAttempt = new Date(rawString);
  if (!Number.isNaN(isoAttempt.getTime())) {
    return isoAttempt.toISOString();
  }

  const vietnamPattern = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/;
  const match = rawString.match(vietnamPattern);
  if (match) {
    const [, dayStr, monthStr, yearStr, hourStr = "0", minuteStr = "0", secondStr = "0"] = match;
    const day = Number(dayStr);
    const month = Number(monthStr) - 1;
    const year = Number(yearStr);
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    const second = Number(secondStr);
    const date = new Date(year, month, day, hour, minute, second);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return getVietnamDateTime();
}

function formatTimeLabel(dateString) {
  if (!dateString) return "";
  const normalized = normalizeTransactionDate(dateString);
  return formatVietnamDateTime(normalized);
}

const getVietnamDateTime = () => {
  const now = new Date();
  const vietnamTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  return vietnamTime.toISOString();
};

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Retry helper: enforce VIEW role for new member by email
  const enforceViewerRoleForEmail = async (walletId, email, attempts = 6, intervalMs = 500) => {
    if (!walletAPI.getWalletMembers || !walletAPI.updateMemberRole) return false;
    const normalized = (email || "").toString().trim().toLowerCase();

    const extractMemberList = (resp) => {
      if (!resp) return [];
      if (Array.isArray(resp)) return resp;
      if (Array.isArray(resp.data)) return resp.data;
      if (Array.isArray(resp.members)) return resp.members;
      if (resp.result && Array.isArray(resp.result.data)) return resp.result.data;
      return [];
    };

    for (let i = 0; i < attempts; i++) {
      try {
        const resp = await walletAPI.getWalletMembers(walletId);
        const list = extractMemberList(resp);

        const found = (list || []).find((m) => {
          if (!m) return false;
          const e = (m.email || m.userEmail || (m.user && (m.user.email || m.userEmail)) || m.memberEmail || "").toString().trim().toLowerCase();
          return e === normalized;
        });

        if (found) {
          // Try multiple candidate identifiers in order of likelihood
          const candidates = [
            found.userId,
            found.memberUserId,
            found.memberId,
            found.id,
            (found.user && (found.user.id || found.user.userId)),
            found.membershipId,
            found.membership?.id,
          ].filter(Boolean);

          for (const candidateId of candidates) {
            try {
              await walletAPI.updateMemberRole(walletId, candidateId, "VIEW");
              // verify it stuck
              const verifyResp = await walletAPI.getWalletMembers(walletId);
              const verifyList = extractMemberList(verifyResp);
              const verifyFound = (verifyList || []).find((m) => {
                const e = (m.email || m.userEmail || (m.user && (m.user.email || m.userEmail)) || m.memberEmail || "").toString().trim().toLowerCase();
                return e === normalized;
              });
              const newRole = (verifyFound && (verifyFound.role || verifyFound.membershipRole || verifyFound.walletRole || (verifyFound.membership && verifyFound.membership.role))) || null;
              if (newRole && String(newRole).toUpperCase().includes("VIEW")) {
                return true;
              }
            } catch (err) {
              // try next candidate
              // eslint-disable-next-line no-console
              console.debug("updateMemberRole attempt failed for candidateId", candidateId, err?.message || err);
            }
          }
        }
      } catch (err) {
        // ignore and retry
        // eslint-disable-next-line no-console
        console.debug("enforceViewerRoleForEmail error", err?.message || err);
      }
      // wait before next attempt
      // eslint-disable-next-line no-await-in-loop
      await sleep(intervalMs);
    }
    return false;
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
    // Ensure we have a recent exchange rate cached for conversions
    // so transfer/merge UIs show consistent rates even if the dashboard widget
    // is not mounted on this page.
    (async () => {
      try {
        await getExchangeRate();
      } catch (e) {
        // ignore errors - we'll fall back to cached/static rates
      }
    })();

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

        // If verified, best-effort: attempt to enforce viewer-only for new shares
        // (applies to both personal and group wallets). We call markLocalShared
        // to keep optimistic UI in sync and then try to set the member role to VIEW
        // on the server by polling and calling updateMemberRole when possible.
        try {
          markLocalShared(walletIdToUse, [email]);
        } catch (e) {
          // ignore local mark failures
        }
        try {
          const enforced = await enforceViewerRoleForEmail(walletIdToUse, email, 8, 500);
          if (enforced) {
            const successMsg = t('wallets.toast.enforce_view_success') || `Đã đặt quyền Người xem cho ${email}`;
            showToast(successMsg, 'success');
          } else {
            const warnMsg = t('wallets.toast.enforce_view_failed') || `Không thể ép quyền Người xem cho ${email} (server có thể đặt Member).`;
            showToast(warnMsg, 'warning');
          }
        } catch (err) {
          // ignore enforcement failures (best-effort)
          // eslint-disable-next-line no-console
          console.debug('enforce viewer role failure', err?.message || err);
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
        try {
          logActivity({
            type: "wallet.share",
            message: `Chia sẻ ví ${walletIdToUse} với ${email}`,
            data: { walletId: walletIdToUse, email },
          });
        } catch (e) {}
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

  // Ensure default wallet always appears first and the most-recently-created
  // non-default wallet appears directly after it (position 1).
  const finalWallets = useMemo(() => {
    const arr = Array.isArray(sortedWallets) ? [...sortedWallets] : [];

    // When user selects an explicit sort mode, respect that order fully
    if (sortBy !== "default") {
      return arr;
    }
    const getCreatedTime = (w) => {
      if (!w) return 0;
      const raw = w.createdAt || w.created_at || w.created || w.timestamp || 0;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return 0;
      return d.getTime();
    };

    // Move first default wallet to front
    const defaultIdx = arr.findIndex((w) => !!w.isDefault);
    if (defaultIdx > 0) {
      const [d] = arr.splice(defaultIdx, 1);
      arr.unshift(d);
    }

    // Find newest non-default wallet and move it to index 1
    let newestIdx = -1;
    let newestTime = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (i === 0) continue; // skip default (or whatever is at front)
      const w = arr[i];
      if (!w) continue;
      if (w.isDefault) continue;
      const t = getCreatedTime(w) || 0;
      if (t > newestTime) {
        newestTime = t;
        newestIdx = i;
      }
    }
    if (newestIdx > 1) {
      const [n] = arr.splice(newestIdx, 1);
      arr.splice(1, 0, n);
    }

    return arr;
  }, [sortedWallets, sortBy]);

  // Debug: log counts to help diagnose empty shared list (placed after sortedWallets)
  // (debug logging removed)

  useEffect(() => {
    setEditForm(buildWalletForm(selectedWallet));
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
    // Prefer using cached exchange rate if available to keep
    // all conversions consistent with the dashboard cache.
    try {
      const cachedRaw = typeof window !== 'undefined' ? localStorage.getItem('exchange_rate_cache') : null;
      const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
      // Cache structure: vndToUsd = how many VND per 1 USD (e.g., 24390)
      const vndToUsd = cached && cached.vndToUsd ? Number(cached.vndToUsd) : null;
      const usdToVnd = cached && cached.usdToVnd ? Number(cached.usdToVnd) : null;
      
      if ((vndToUsd || usdToVnd) && !Number.isNaN(vndToUsd || usdToVnd)) {
        if (from === 'USD' && to === 'VND') return vndToUsd || 24390;
        if (from === 'VND' && to === 'USD') return usdToVnd || (1 / (vndToUsd || 24390));
        // If neither side is USD, fall through to fallback rates below
      }
    } catch (e) {
      // ignore parse errors and fall back to built-in rates
    }

    // Fallback static rates (used only if cache not available)
    const rates = {
      VND: 1,
      USD: 0.000041, // 1 VND = 0.000041 USD (inverse of 1 USD = 24390 VND)
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


  // Tổng số dư: we'll compute the total in VND (used by the total card toggle)
  // Helper: normalized role string
  const getWalletRole = useCallback((wallet) => {
    if (!wallet) return "";
    return (
      (wallet.walletRole || wallet.sharedRole || wallet.role || "") + ""
    ).toUpperCase();
  }, []);

  const isViewerRole = useCallback((wallet) => {
    const role = getWalletRole(wallet);
    return ["VIEW", "VIEWER"].includes(role);
  }, [getWalletRole]);

  const isOwnerRole = useCallback((wallet) => {
    const role = getWalletRole(wallet);
    return ["OWNER", "MASTER", "ADMIN"].includes(role);
  }, [getWalletRole]);

  // Tổng số dư (theo quy tắc mới): mọi ví của mình (cá nhân + ví nhóm mình sở hữu + ví chia sẻ mà mình có quyền edit/member).
  // Loại trừ các ví mà mình chỉ có quyền VIEW/VIEWER.
  const totalInVND = useMemo(() => {
    return wallets
      .filter((w) => w.includeOverall !== false)
      .filter((w) => {
        const shared = !!w.isShared || !!(w.walletRole || w.sharedRole || w.role) || w.hasSharedMembers;
        if (!shared) return true;
        if (isOwnerRole(w)) return true;
        const role = getWalletRole(w);
        if (["MEMBER", "USER", "USE"].includes(role)) return true;
        return false;
      })
      .reduce((sum, w) => {
        const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
        return sum + balanceInVND;
      }, 0);
  }, [wallets, getWalletRole, isOwnerRole]);

  // Toggle for the total card only: remember choice in localStorage
  const [totalCurrency, setTotalCurrency] = useState(() => localStorage.getItem("wallets_total_currency") || "VND");
  useEffect(() => {
    localStorage.setItem("wallets_total_currency", totalCurrency);
  }, [totalCurrency]);
  const toggleTotalCurrency = () => setTotalCurrency((c) => (c === "VND" ? "USD" : "VND"));

  // Value to display on the total card (uses cached dashboard rate if USD selected)
  const totalDisplayedValue = useMemo(() => {
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
    if (totalCurrency === "USD") {
      return totalInVND / vndToUsd;
    }
    return totalInVND;
  }, [totalInVND, totalCurrency]);

  // Keep legacy totalBalance for other parts (uses displayCurrency)
  const totalBalance = useMemo(() => {
    return convertFromVND(totalInVND, displayCurrency);
  }, [totalInVND, displayCurrency]);

  // All metric cards follow the `totalCurrency` toggle now.

  // Số dư ví cá nhân: tổng số dư các ví cá nhân của mình (không tính ví được chia sẻ và ví nhóm)
  const personalBalance = useMemo(() => {
    const totalInVND = personalWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
    return convertFromVND(totalInVND, displayCurrency);
  }, [personalWallets, displayCurrency]);

  // Per-card displayed values (based on selected per-card currency)
  const personalInVND = useMemo(() => {
    return personalWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
  }, [personalWallets]);

  const personalDisplayedValue = useMemo(() => {
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
    return totalCurrency === "USD" ? personalInVND / vndToUsd : personalInVND;
  }, [personalInVND, totalCurrency]);

  // Số dư ví nhóm: tổng số dư các ví nhóm mà bản thân sở hữu (bao gồm ví nhóm đã chia sẻ đi)
  const groupBalance = useMemo(() => {
    const totalInVND = groupWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
    return convertFromVND(totalInVND, displayCurrency);
  }, [groupWallets, displayCurrency]);

  const groupInVND = useMemo(() => {
    return groupWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
  }, [groupWallets]);

  const groupDisplayedValue = useMemo(() => {
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
    return totalCurrency === "USD" ? groupInVND / vndToUsd : groupInVND;
  }, [groupInVND, totalCurrency]);

  // Số dư các ví được chia sẻ với tôi (sharedWithMe): bao gồm các ví sharedWithMe nhưng KHÔNG tính những ví nơi tôi chỉ ở quyền VIEW/VIEWER
  const sharedWithMeBalance = useMemo(() => {
    const totalInVND = sharedWithMeDisplayWallets
      .filter((w) => !isViewerRole(w))
      .reduce((sum, w) => {
        const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
        return sum + balanceInVND;
      }, 0);
    return convertFromVND(totalInVND, displayCurrency);
  }, [sharedWithMeDisplayWallets, displayCurrency, isViewerRole]);

  const sharedWithMeInVND = useMemo(() => {
    return sharedWithMeDisplayWallets
      .filter((w) => !isViewerRole(w))
      .reduce((sum, w) => {
        const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
        return sum + balanceInVND;
      }, 0);
  }, [sharedWithMeDisplayWallets, isViewerRole]);

  const sharedWithMeDisplayedValue = useMemo(() => {
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
    return totalCurrency === "USD" ? sharedWithMeInVND / vndToUsd : sharedWithMeInVND;
  }, [sharedWithMeInVND, totalCurrency]);

  // Số dư các ví tôi đã chia sẻ cho người khác (sharedByMe)
  const sharedByMeBalance = useMemo(() => {
    const totalInVND = sharedByMeWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
    return convertFromVND(totalInVND, displayCurrency);
  }, [sharedByMeWallets, displayCurrency]);

  const sharedByMeInVND = useMemo(() => {
    return sharedByMeWallets.reduce((sum, w) => {
      const balanceInVND = convertToVND(w.balance ?? w.current ?? 0, w.currency || "VND");
      return sum + balanceInVND;
    }, 0);
  }, [sharedByMeWallets]);

  const sharedByMeDisplayedValue = useMemo(() => {
    const cached = (typeof window !== 'undefined') ? (localStorage.getItem('exchange_rate_cache') ? JSON.parse(localStorage.getItem('exchange_rate_cache')) : null) : null;
    const vndToUsd = (cached && Number(cached.vndToUsd)) ? Number(cached.vndToUsd) : 24500;
    return totalCurrency === "USD" ? sharedByMeInVND / vndToUsd : sharedByMeInVND;
  }, [sharedByMeInVND, totalCurrency]);

  const handleSelectWallet = (id) => {
    setSelectedId(id);
    setActiveDetailTab("view");
  };

  const handleChangeSelectedWallet = (idOrNull) => {
    setSelectedId(idOrNull);
    setActiveDetailTab("view");
  };

  const handleCreateFieldChange = (field, value) => {
    const nextValue =
      field === "note"
        ? String(value || "").slice(0, NOTE_MAX_LENGTH)
        : value;
    setCreateForm((prev) => ({ ...prev, [field]: nextValue }));
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
        note: (createForm.note || "").trim().slice(0, NOTE_MAX_LENGTH),
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
    const nextValue =
      field === "note"
        ? String(value || "").slice(0, NOTE_MAX_LENGTH)
        : value;
    setEditForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedWallet || !updateWallet) return;
    try {
      await updateWallet({
        id: selectedWallet.id,
        name: editForm.name.trim(),
        note: (editForm.note || "").trim().slice(0, NOTE_MAX_LENGTH),
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

  const purgeWalletTransactions = async (wallet) => {
    if (!wallet) return 0;

    const walletId = wallet.id;
    const walletAltId = wallet.walletId || walletId;

    try {
      let txListRaw = [];
      let shouldFallbackTx = true;
      if (transactionAPI.getWalletTransactions) {
        try {
          const scopedTx = await transactionAPI.getWalletTransactions(walletId);
          txListRaw = extractListFromResponse(scopedTx, "transactions");
          shouldFallbackTx = false;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("WalletsPage: purge scoped transaction fetch failed", error);
        }
      }

      if (shouldFallbackTx && transactionAPI.getAllTransactions) {
        const fallbackTx = await transactionAPI.getAllTransactions();
        txListRaw = extractListFromResponse(fallbackTx, "transactions");
      }

      const relatedTransactions = (Array.isArray(txListRaw) ? txListRaw : []).filter((tx) =>
        transactionBelongsToWallet(tx, walletId, walletAltId)
      );

      let deletedCount = 0;
      for (const tx of relatedTransactions) {
        const txIdRaw =
          tx.transactionId ??
          tx.id ??
          tx.txId ??
          tx.transactionID ??
          tx.transaction_id ??
          null;
        const txId = Number(txIdRaw);
        if (!txId || Number.isNaN(txId)) continue;
        if (!transactionAPI.deleteTransaction) continue;
        await transactionAPI.deleteTransaction(txId);
        deletedCount += 1;
      }

      return deletedCount;
    } catch (error) {
      throw new Error(error?.message || t('wallets.toast.delete_transactions_failed'));
    }
  };

  const handleDeleteWallet = async (walletId) => {
    if (!walletId || !deleteWallet) return;
    try {
      const wallet = wallets.find((w) => Number(w.id) === Number(walletId));
      if (!wallet) return;

      const walletName = wallet?.name || "ví";
      const walletBalance = Number(wallet.balance ?? wallet.current ?? 0) || 0;
      if (Math.abs(walletBalance) > 0.000001) {
        showToast(t('wallets.toast.delete_requires_zero_balance'), "error");
        return;
      }

      const deletedTransactions = await purgeWalletTransactions(wallet);

      await deleteWallet(walletId);
      await loadWallets();
      refreshTransactions();

      if (String(walletId) === String(selectedId)) {
        setSelectedId(null);
        setActiveDetailTab("view");
      }

      if (deletedTransactions > 0) {
        showToast(
          `${t('wallets.toast.deleted_with_transactions', { count: deletedTransactions })} "${walletName}"`
        );
      } else {
        showToast(`${t('wallets.toast.deleted')} "${walletName}"`);
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
      // Get the target wallet to know its currency for proper conversion tracking
      const targetWallet = wallets.find(
        (w) => Number(w.id) === Number(transferTargetId)
      );
      const sourceCurrency = selectedWallet.currency || "VND";
      const targetCurrency = targetWallet?.currency || "VND";

      await transferMoney({
        sourceId: selectedWallet.id,
        targetId: Number(transferTargetId),
        amount: amountNum,
        note: transferNote || "",
        targetCurrencyCode: targetCurrency, // Pass target currency to backend/service
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
      const sourceWasDefault = !!sourceWallet?.isDefault;

      await mergeWallets({
        sourceId,
        targetId,
        keepCurrency,
        targetCurrency,
      });

      let defaultAction = null;
      let defaultError = null;

      if (payload.setTargetAsDefault) {
        let setSucceeded = false;
        if (setDefaultWallet) {
          try {
            await setDefaultWallet(targetId);
            setSucceeded = true;
            defaultAction = "set";
          } catch (err) {
            defaultError = err;
          }
        }
        if (!setSucceeded && updateWallet) {
          try {
            await updateWallet({ id: targetId, isDefault: true });
            setSucceeded = true;
            defaultAction = "set";
            defaultError = null;
          } catch (err) {
            defaultError = err;
          }
        }
      } else if (sourceWasDefault && updateWallet) {
        try {
          await updateWallet({ id: targetId, isDefault: false });
          defaultAction = "cleared";
        } catch (err) {
          defaultError = err;
        }
      }

      await loadWallets();
      refreshTransactions();

      if (defaultError) {
        showToast(defaultError.message || t('wallets.toast.merge_default_error'), "warning");
      } else if (defaultAction === "set") {
        showToast(t('wallets.toast.merge_set_default'));
      } else if (defaultAction === "cleared") {
        showToast(t('wallets.toast.merge_cleared_default'));
      } else {
        showToast(t('wallets.toast.merged'));
      }
      setSelectedId(targetId);
      setActiveDetailTab("view");
    } catch (error) {
      if (
        error?.code === MERGE_PERSONAL_ONLY_ERROR ||
        error?.message === MERGE_PERSONAL_ONLY_ERROR
      ) {
        showToast(t('wallets.error.merge_personal_only'), "error");
      } else {
        showToast(error.message || "Không thể gộp ví", "error");
      }
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
    const resolveActorName = useCallback((tx) => {
      const extractFromObject = (obj) => {
        if (!obj || typeof obj !== "object") return "";
        return (
          obj.fullName ||
          obj.displayName ||
          obj.name ||
          obj.username ||
          obj.email ||
          (obj.firstName && obj.lastName && `${obj.firstName} ${obj.lastName}`) ||
          obj.firstName ||
          obj.lastName ||
          ""
        );
      };

      const candidates = [
        tx.actorName,
        tx.createdByName,
        tx.creatorName,
        tx.createdBy,
        tx.creator,
        tx.updatedByName,
        tx.performedBy,
        tx.executorName,
        tx.userFullName,
        tx.userName,
        tx.username,
        extractFromObject(tx.createdByUser),
        extractFromObject(tx.creatorUser),
        extractFromObject(tx.user),
      ];

      for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed.length) return trimmed;
        } else if (typeof candidate === "object") {
          const extracted = extractFromObject(candidate);
          if (extracted.trim().length) return extracted.trim();
        }
      }

      return "";
    }, []);

    const detectTransactionDirection = useCallback((tx) => {
      const normalize = (value) => {
        if (value === undefined || value === null) return "";
        if (typeof value === "string") return value.trim().toUpperCase();
        if (typeof value === "number") return String(value).trim().toUpperCase();
        if (typeof value === "object") {
          const nested =
            value.type ||
            value.typeName ||
            value.code ||
            value.key ||
            value.name ||
            value.value ||
            value.direction;
          return normalize(nested);
        }
        return "";
      };

      const expenseTokens = [
        "EXPENSE",
        "CHI",
        "OUT",
        "OUTFLOW",
        "DEBIT",
        "WITHDRAW",
        "SPEND",
        "PAYMENT",
      ];
      const incomeTokens = [
        "INCOME",
        "THU",
        "IN",
        "INFLOW",
        "CREDIT",
        "TOPUP",
        "DEPOSIT",
        "RECEIVE",
        "SALARY",
      ];

      const checkTokens = (value, tokens) => {
        if (!value) return false;
        return tokens.some((token) => value.includes(token));
      };

      if (tx.isExpense === true || tx.isDebit === true) return "expense";
      if (tx.isIncome === true || tx.isCredit === true) return "income";

      const directionCandidates = [
        tx.transactionType,
        tx.transactionType?.type,
        tx.transactionType?.typeName,
        tx.transactionType?.typeKey,
        tx.transactionType?.code,
        tx.transactionType?.direction,
        tx.transactionType?.categoryType,
        tx.type,
        tx.typeName,
        tx.typeCode,
        tx.transactionKind,
        tx.direction,
        tx.flow,
        tx.transactionFlow,
        tx.category?.type,
        tx.category?.categoryType,
        tx.category?.transactionType,
        tx.category?.typeName,
        tx.categoryType,
        tx.transactionCategory?.type,
        tx.transactionCategory?.direction,
      ];

      for (const candidate of directionCandidates) {
        const normalized = normalize(candidate);
        if (!normalized) continue;
        if (checkTokens(normalized, expenseTokens)) return "expense";
        if (checkTokens(normalized, incomeTokens)) return "income";
      }

      if (typeof tx.amount === "number") {
        if (tx.amount < 0) return "expense";
        if (tx.amount > 0) return "income";
      }

      return "income";
    }, []);

    const mapTransactionForWallet = useCallback((tx, walletId, walletRef = null) => {
      const direction = detectTransactionDirection(tx);
      const isExpense = direction === "expense";
      const amount = parseFloat(tx.amount || 0);

      const categoryName = tx.category?.categoryName || tx.categoryName || "Khác";
      const note = tx.note || "";
      let title = categoryName;
      if (note) {
        title = `${categoryName}${note ? ` - ${note}` : ""}`;
      }

      const displayAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);

    const rawDateValue =
      tx.createdAt ||
      tx.transactionDate ||
      tx.transaction_at ||
      tx.transactionDateTime ||
      tx.date ||
      tx.time ||
      tx.createdTime;
    const dateValue = normalizeTransactionDate(rawDateValue);
    const timeLabel = formatTimeLabel(dateValue);

      const creatorName = resolveActorName(tx);

    const walletInfo = tx.wallet || {};
    const fallbackWalletName =
      walletRef?.name || walletRef?.walletName || walletRef?.title || "";
    const walletName =
      walletInfo.walletName ||
      walletInfo.name ||
      tx.walletName ||
      fallbackWalletName ||
      "";

    const currencyCandidates = [
      tx.originalCurrency,
      tx.originalCurrencyCode,
      tx.currencyCode,
      tx.currency,
      tx.transactionCurrency,
      walletInfo.currencyCode,
      walletInfo.currency,
    ];
    const resolvedCurrency = currencyCandidates.find((curr) => {
      if (curr === undefined || curr === null) return false;
      const normalized = String(curr).trim();
      return normalized.length > 0;
    });
    const currency = resolvedCurrency
      ? String(resolvedCurrency).toUpperCase()
      : "VND";

    const txId =
      tx.transactionId ??
      tx.id ??
      tx.txId ??
      tx.transactionID ??
      tx.transaction_id ??
      `${walletId || "wallet"}-${dateValue}`;

    return {
      id: txId,
      title,
      amount: displayAmount,
      timeLabel,
      categoryName,
      currency,
      date: dateValue,
      creatorName,
      note,
      walletName,
      type: isExpense ? "expense" : "income",
      originalAmount: tx.originalAmount ?? null,
      originalCurrency: tx.originalCurrency || null,
      exchangeRate: tx.exchangeRate ?? tx.appliedExchangeRate ?? null,
    };
  }, [detectTransactionDirection, resolveActorName]);

  // Map transfer từ API sang format cho WalletDetail
  const mapTransferForWallet = useCallback((transfer, walletId, walletAltId = null) => {
    const normalizedWalletIds = [walletId, walletAltId].filter((id) => id !== undefined && id !== null).map((id) => String(id));
    const fromWalletResolved =
      transfer.fromWallet?.walletId ??
      transfer.fromWallet?.id ??
      transfer.sourceWalletId ??
      transfer.sourceWalletID ??
      null;
    const toWalletResolved =
      transfer.toWallet?.walletId ??
      transfer.toWallet?.id ??
      transfer.targetWalletId ??
      transfer.targetWalletID ??
      null;
    const isFromWallet = normalizedWalletIds.includes(String(fromWalletResolved));
    const amount = parseFloat(transfer.amount || 0);

    const sourceName =
      transfer.fromWallet?.walletName ||
      transfer.sourceWalletName ||
      "Ví nguồn";
    const targetName =
      transfer.toWallet?.walletName ||
      transfer.targetWalletName ||
      "Ví đích";
    const title = isFromWallet
      ? `Chuyển đến ${targetName}`
      : `Nhận từ ${sourceName}`;

    const displayAmount = isFromWallet ? -Math.abs(amount) : Math.abs(amount);

    const rawDateValue =
      transfer.createdAt ||
      transfer.transferDate ||
      transfer.executedAt ||
      transfer.date ||
      transfer.time;
    const dateValue = normalizeTransactionDate(rawDateValue);
    const timeLabel = formatTimeLabel(dateValue);

    const actorName =
      resolveActorName(transfer) ||
      transfer.user?.fullName ||
      transfer.user?.name ||
      transfer.user?.email ||
      transfer.createdByName ||
      transfer.creatorName ||
      "";
    const transferId = transfer.transferId ?? transfer.id ?? `${walletId || "wallet"}-${dateValue}`;

    const currencyCandidates = [
      transfer.originalCurrency,
      transfer.currencyCode,
      transfer.currency,
      transfer.fromWallet?.currencyCode,
      transfer.toWallet?.currencyCode,
      transfer.fromWallet?.currency,
      transfer.toWallet?.currency,
    ];
    const resolvedCurrency = currencyCandidates.find((curr) => {
      if (curr === undefined || curr === null) return false;
      const normalized = String(curr).trim();
      return normalized.length > 0;
    });
    const currency = resolvedCurrency
      ? String(resolvedCurrency).toUpperCase()
      : "VND";

    return {
      id: `transfer-${transferId}`,
      title: title,
      amount: displayAmount,
      timeLabel: timeLabel,
      categoryName: "Chuyển tiền giữa các ví",
      currency,
      date: dateValue,
      creatorName: actorName,
      note: transfer.note || "",
      sourceWallet: sourceName,
      targetWallet: targetName,
      type: "transfer",
    };
  }, [resolveActorName]);

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

        let txListRaw = [];
        let shouldFallbackTx = true;
        if (transactionAPI.getWalletTransactions) {
          try {
            const scopedTx = await transactionAPI.getWalletTransactions(walletId);
            txListRaw = extractListFromResponse(scopedTx, "transactions");
            shouldFallbackTx = false;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("WalletsPage: scoped transaction fetch failed", error);
          }
        }

        if (shouldFallbackTx && transactionAPI.getAllTransactions) {
          const fallbackTx = await transactionAPI.getAllTransactions();
          txListRaw = extractListFromResponse(fallbackTx, "transactions");
        }

        const externalTxs = (Array.isArray(txListRaw) ? txListRaw : [])
          .filter((tx) => transactionBelongsToWallet(tx, walletId, walletAltId))
          .map((tx) => {
            if (!tx.wallet && !tx.walletId) {
              return { ...tx, wallet: { walletId } };
            }
            return tx;
          })
          .map((tx) => mapTransactionForWallet(tx, walletId, selectedWallet));

        let transferListRaw = [];
        let shouldFallbackTransfers = true;
        if (walletAPI.getWalletTransfers) {
          try {
            const scopedTransfers = await walletAPI.getWalletTransfers(walletId);
            transferListRaw = extractListFromResponse(scopedTransfers, "transfers");
            shouldFallbackTransfers = false;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("WalletsPage: scoped transfer fetch failed", error);
          }
        }

        if (shouldFallbackTransfers) {
          const transferResponse = await walletAPI.getAllTransfers();
          transferListRaw = extractListFromResponse(transferResponse, "transfers");
        }

        const transfers = (Array.isArray(transferListRaw) ? transferListRaw : [])
          .filter((transfer) => transferTouchesWallet(transfer, walletId, walletAltId))
          .map((transfer) => mapTransferForWallet(transfer, walletId, walletAltId));

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
        <div className="budget-metric-card budget-metric-card--has-toggle" tabIndex={0} aria-describedby="tooltip-total">
          <div className="budget-metric-label">
            {t('wallets.total_balance')}
            <button
              type="button"
              className="budget-metric-toggle"
              title={totalCurrency === 'VND' ? 'Chuyển sang USD' : 'Chuyển sang VND'}
              onClick={(e) => { e.stopPropagation(); toggleTotalCurrency(); }}
              aria-pressed={totalCurrency === 'USD'}
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
          </div>
          <div className="budget-metric-value">{formatMoney(totalDisplayedValue, totalCurrency || "VND", totalCurrency === 'USD' ? 8 : undefined)}</div>
          <div id="tooltip-total" role="tooltip" className="budget-metric-tooltip">
            <strong>Tổng số dư</strong>
            <div className="budget-metric-tooltip__body">
              Tổng số dư của tất cả ví của bạn (không bao gồm các ví bạn chỉ có quyền xem). Giá trị đã được quy đổi về tiền hiển thị để dễ so sánh.
            </div>
            <div className="budget-metric-tooltip__meta">Ví tính: {wallets.length} • Cập nhật gần nhất: ngay bây giờ</div>
          </div>
        </div>

        <div className="budget-metric-card budget-metric-card--personal" tabIndex={0} aria-describedby="tooltip-personal">
          <div className="budget-metric-label">{t('wallets.metric.personal_balance')}</div>
          <div className="budget-metric-value">{formatMoney(personalDisplayedValue, totalCurrency || "VND", totalCurrency === 'USD' ? 8 : undefined)}</div>
          <div id="tooltip-personal" role="tooltip" className="budget-metric-tooltip">
            <strong>Ví cá nhân</strong>
            <div className="budget-metric-tooltip__body">Tổng số dư của các ví cá nhân (ví thuộc sở hữu và quản lý trực tiếp bởi bạn).</div>
            <div className="budget-metric-tooltip__meta">Số ví: {personalWallets.length}</div>
          </div>
        </div>

        <div className="budget-metric-card budget-metric-card--group" tabIndex={0} aria-describedby="tooltip-group">
          <div className="budget-metric-label">{t('wallets.metric.group_balance')}</div>
          <div className="budget-metric-value">{formatMoney(groupDisplayedValue, totalCurrency || "VND", totalCurrency === 'USD' ? 8 : undefined)}</div>
          <div id="tooltip-group" role="tooltip" className="budget-metric-tooltip">
            <strong>Ví nhóm</strong>
            <div className="budget-metric-tooltip__body">Tổng số dư của các ví nhóm mà bạn sở hữu hoặc tham gia quản lý. Bao gồm các ví bạn đã chia sẻ cho nhóm.</div>
            <div className="budget-metric-tooltip__meta">Số ví nhóm: {groupWallets.length}</div>
          </div>
        </div>

        <div className="budget-metric-card budget-metric-card--shared-with-me" tabIndex={0} aria-describedby="tooltip-shared-with-me">
          <div className="budget-metric-label">{t('wallets.metric.shared_with_me_balance')}</div>
          <div className="budget-metric-value">{formatMoney(sharedWithMeDisplayedValue, totalCurrency || "VND", totalCurrency === 'USD' ? 8 : undefined)}</div>
          <div id="tooltip-shared-with-me" role="tooltip" className="budget-metric-tooltip">
            <strong>Được chia sẻ cho tôi</strong>
            <div className="budget-metric-tooltip__body">Tổng số dư các ví mà người khác chia sẻ cho bạn — bạn có thể xem hoặc thao tác theo quyền được cấp.</div>
            <div className="budget-metric-tooltip__meta">Số ví: {sharedWithMeDisplayWallets.length}</div>
          </div>
        </div>

        {/* Removed 'Số dư các ví đã chia sẻ' metric per request */}
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
          wallets={finalWallets.map((w) => {
            const ownedByMe = isWalletOwnedByMe(w);
            const displayIsDefault = !!w.isDefault && ownedByMe && !w.isShared;
            return {
              ...w,
              isDefault: displayIsDefault,
              displayIsDefault,
              // Merge sharedEmails từ localSharedMap nếu có
              sharedEmails: [
                ...(Array.isArray(w.sharedEmails) ? w.sharedEmails : []),
                ...(Array.isArray(localSharedMap[w.id]) ? localSharedMap[w.id] : [])
              ].filter((email, index, self) =>
                email && typeof email === "string" && email.trim() &&
                self.indexOf(email) === index
              )
            };
          })}
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