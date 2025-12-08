import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useCurrency } from "../../hooks/useCurrency";

import { useLocation } from "react-router-dom";
import "../../styles/pages/TransactionsPage.css";
import TransactionViewModal from "../../components/transactions/TransactionViewModal";
import TransactionFormModal from "../../components/transactions/TransactionFormModal";
import TransactionForm from "../../components/transactions/TransactionForm";
import TransactionList from "../../components/transactions/TransactionList";
import ScheduledTransactionModal from "../../components/transactions/ScheduledTransactionModal";
import ScheduledTransactionDrawer from "../../components/transactions/ScheduledTransactionDrawer";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import BudgetWarningModal from "../../components/budgets/BudgetWarningModal";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services/wallet.service";
import { API_BASE_URL } from "../../services/api-client";
import { formatVietnamDateTime } from "../../utils/dateFormat";

// ===== REMOVED MOCK DATA - Now using API =====

const TABS = {
  EXTERNAL: "external",
  INTERNAL: "internal",
  SCHEDULE: "schedule",
};

const EXPENSE_TOKENS = [
  "EXPENSE",
  "CHI",
  "SPEND",
  "OUTFLOW",
  "DEBIT",
  "PAYMENT",
  "WITHDRAW",
];

const INCOME_TOKENS = [
  "INCOME",
  "THU",
  "INFLOW",
  "CREDIT",
  "TOPUP",
  "DEPOSIT",
  "RECEIVE",
  "SALARY",
  "EARN",
];

const ensureIsoDateWithTimezone = (rawValue) => {
  if (!rawValue) return rawValue;
  if (typeof rawValue !== "string") {
    return rawValue;
  }

  let value = rawValue.trim();
  if (!value) return value;

  if (value.includes(" ")) {
    value = value.replace(" ", "T");
  }

  const hasTimePart = /T\d{2}:\d{2}/.test(value);
  if (!hasTimePart) {
    return value;
  }

  const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(value);
  if (!hasSeconds) {
    value = value.replace(/T(\d{2}:\d{2})(?!:)/, "T$1:00");
  }

  const hasTimezone = /(Z|z|[+\-]\d{2}:?\d{2})$/.test(value);
  if (!hasTimezone) {
    value = `${value}Z`;
  }

  return value;
};

const normalizeDirectionToken = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toUpperCase();
};

const matchesToken = (value, candidates) => {
  if (!value) return false;
  return candidates.some((token) => value.includes(token));
};

const resolveTransactionDirection = (tx) => {
  if (!tx) return "expense";
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
    tx.transactionTypeName,
    tx.transactionTypeLabel,
    tx.type,
    tx.typeName,
    tx.typeCode,
    tx.transactionKind,
    tx.transactionFlow,
    tx.direction,
    tx.flow,
    tx.category?.type,
    tx.category?.categoryType,
    tx.category?.transactionType,
    tx.category?.typeName,
    tx.categoryType,
    tx.transactionCategory?.type,
    tx.transactionCategory?.direction,
  ];

  for (const candidate of directionCandidates) {
    const normalized = normalizeDirectionToken(candidate);
    if (!normalized) continue;
    if (matchesToken(normalized, EXPENSE_TOKENS)) return "expense";
    if (matchesToken(normalized, INCOME_TOKENS)) return "income";
  }

  const amount = Number(tx.amount ?? tx.transactionAmount);
  if (!Number.isNaN(amount) && amount !== 0) {
    return amount < 0 ? "expense" : "income";
  }

  return "expense";
};

const PAGE_SIZE = 10;
const VIEWER_ROLES = new Set(["VIEW", "VIEWER"]);

const ATTACHMENT_KEYS = [
  "imageUrl",
  "imageURL",
  "imageUri",
  "image_uri",
  "imagePath",
  "image_path",
  "imageLocation",
  "imageLink",
  "imageSrc",
  "attachmentUrl",
  "attachmentURL",
  "attachmentUri",
  "attachment_uri",
  "attachmentPath",
  "attachment_path",
  "fileUrl",
  "fileURL",
  "fileUri",
  "file_uri",
  "filePath",
  "file_path",
  "documentUrl",
  "documentURL",
  "documentUri",
  "document_uri",
  "photoUrl",
  "photoURL",
  "photoUri",
  "photo_uri",
  "mediaUrl",
  "mediaURL",
  "mediaUri",
  "media_uri",
  "receiptUrl",
  "receiptURL",
  "receiptImage",
  "receiptImageUrl",
  "receiptImageURL",
  "proofUrl",
  "proofURL",
  "proofImage",
  "transactionImage",
  "transactionImageUrl",
  "transactionImageURL",
  "downloadUrl",
  "downloadURL",
  "fileDownloadUrl",
  "fileDownloadURL",
  "contentUrl",
  "contentURL",
  "signedUrl",
  "signedURL",
  "blobUrl",
  "blobURL",
  "previewUrl",
  "previewURL",
  "image",
  "attachment",
  "file",
  "media",
  "photo",
  "picture",
];

const ATTACHMENT_HINTS = [
  "image",
  "attachment",
  "receipt",
  "invoice",
  "proof",
  "document",
  "file",
  "photo",
  "picture",
  "media",
  "evidence",
];

const MEDIA_EXTENSION_PATTERN = /\.(png|jpe?g|gif|bmp|webp|svg|heic|heif|tiff?|pdf|jpeg)(?:$|[?#])/i;
const BASE64_BODY_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

const looksLikeBase64Payload = (value) => {
  if (!value) return false;
  const normalized = value.replace(/^base64,/i, "").replace(/\s+/g, "");
  return normalized.length > 80 && BASE64_BODY_PATTERN.test(normalized);
};

const convertBase64ToDataUrl = (value) => {
  if (!value) return "";
  if (/^data:/i.test(value)) return value;
  const body = value.replace(/^base64,/i, "").trim();
  if (!body) return "";
  return `data:image/jpeg;base64,${body}`;
};

const looksLikeRelativeMediaPath = (value) => {
  if (!value) return false;
  if (/^[.]{0,2}\//.test(value)) return true;
  if (value.startsWith("/")) return true;
  if (value.includes("/") || value.includes("\\")) return true;
  if (MEDIA_EXTENSION_PATTERN.test(value)) return true;
  if (/^uploads/i.test(value) || /^files/i.test(value) || /^images/i.test(value)) return true;
  if (value.includes("?")) return true;
  return false;
};

const formatAttachmentUrl = (value) => {
  if (!value) return "";
  let trimmed = String(value).trim();
  if (!trimmed) return "";
  trimmed = trimmed.replace(/\\/g, "/");

  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  if (looksLikeBase64Payload(trimmed)) {
    return convertBase64ToDataUrl(trimmed);
  }

  if (!looksLikeRelativeMediaPath(trimmed)) {
    return "";
  }

  const base = (API_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`.replace(/\/+/g, "/");
  }

  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`.replace(/([^:]\/)\/+/g, "$1");
  }
  return `${base}/${trimmed}`.replace(/([^:]\/)\/+/g, "$1");
};

const extractAttachmentValue = (value, depth = 0) => {
  if (!value || depth > 4) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractAttachmentValue(item, depth + 1);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof value === "object") {
    const candidateKeys = [
      "url",
      "href",
      "link",
      "path",
      "location",
      "value",
      "source",
      "src",
      "downloadUrl",
      "downloadURL",
      "fileDownloadUrl",
      "fileDownloadURL",
      "contentUrl",
      "contentURL",
      "signedUrl",
      "signedURL",
      "previewUrl",
      "previewURL",
    ];
    for (const key of candidateKeys) {
      if (key in value) {
        const nested = extractAttachmentValue(value[key], depth + 1);
        if (nested) return nested;
      }
    }
  }
  return "";
};

const normalizeAttachmentCandidate = (value) => {
  const resolved = extractAttachmentValue(value);
  if (!resolved) return "";
  return formatAttachmentUrl(resolved);
};

const resolveAttachmentFromTransaction = (tx) => {
  if (!tx) return "";
  for (const key of ATTACHMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(tx, key)) {
      const normalized = normalizeAttachmentCandidate(tx[key]);
      if (normalized) return normalized;
    }
  }
  const fallbackSources = [tx.media, tx.attachments, tx.files, tx.images];
  for (const source of fallbackSources) {
    const normalized = normalizeAttachmentCandidate(source);
    if (normalized) return normalized;
  }

  const scanObjectForHints = (obj, depth = 0) => {
    if (!obj || depth > 5) return "";
    if (typeof obj === "string") {
      return formatAttachmentUrl(obj);
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resolved = scanObjectForHints(item, depth + 1);
        if (resolved) return resolved;
      }
      return "";
    }
    if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        const lower = key.toLowerCase();
        if (ATTACHMENT_HINTS.some((hint) => lower.includes(hint))) {
          const normalized = normalizeAttachmentCandidate(obj[key]);
          if (normalized) return normalized;
        }
        const nested = scanObjectForHints(obj[key], depth + 1);
        if (nested) return nested;
      }
    }
    return "";
  };

  return scanObjectForHints(tx);
};

const extractListFromResponse = (payload, preferredKey) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (preferredKey && Array.isArray(payload[preferredKey])) return payload[preferredKey];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const getWalletRoleLabel = (wallet) => {
  if (!wallet) return "";
  return ((wallet.walletRole || wallet.sharedRole || wallet.role || "") + "").toUpperCase();
};

const isViewerOnlyWallet = (wallet) => {
  const role = getWalletRoleLabel(wallet);
  return !!role && VIEWER_ROLES.has(role);
};

function toDateObj(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}


/**
 * Format số tiền với độ chính xác cao (tối đa 8 chữ số thập phân)
 * Để hiển thị chính xác số tiền nhỏ khi chuyển đổi tiền tệ
 */



export default function TransactionsPage() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [externalTransactions, setExternalTransactions] = useState([]);
  const [internalTransactions, setInternalTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.EXTERNAL);

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all"); // "all" | "VND" | "USD"

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [expandedPanel, setExpandedPanel] = useState(null); // "form" | "history" | null

  const [currentPage, setCurrentPage] = useState(1);

  const [scheduledTransactions, setScheduledTransactions] = useState(MOCK_SCHEDULES);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Get shared data from contexts
  const { budgets, getSpentAmount, getSpentForBudget, updateTransactionsByCategory, updateAllExternalTransactions } = useBudgetData();
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets, loadWallets } = useWalletData();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [appliedFocusParam, setAppliedFocusParam] = useState("");
  
  // Budget warning state
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  const currentUserIdentifiers = useMemo(() => {
    if (!currentUser) {
      return { id: null, email: "" };
    }
    const idCandidates = [
      currentUser.userId,
      currentUser.id,
      currentUser.accountId,
      currentUser.userID,
      currentUser.accountID,
    ];
    const chosenId = idCandidates.find((val) => val !== null && val !== undefined) ?? null;
    const emailCandidate =
      (currentUser.email ||
        currentUser.userEmail ||
        currentUser.username ||
        currentUser.login ||
        currentUser.accountEmail ||
        "") + "";
    return {
      id: chosenId !== null ? String(chosenId) : null,
      email: emailCandidate.trim().toLowerCase(),
    };
  }, [currentUser]);

  const matchesCurrentUser = useCallback(
    (entity) => {
      if (!entity) return false;
      const { id: userId, email: userEmail } = currentUserIdentifiers;
      if (!userId && !userEmail) return true;

      const toIdString = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "object") {
          const nestedId =
            value.userId ??
            value.id ??
            value.accountId ??
            value.ownerId ??
            value.createdBy ??
            null;
          return nestedId === null || nestedId === undefined ? null : String(nestedId);
        }
        return String(value);
      };

      const toEmailString = (value) => {
        if (!value) return null;
        return String(value).trim().toLowerCase();
      };

      const candidateIds = [
        entity.userId,
        entity.user_id,
        entity.createdBy,
        entity.createdById,
        entity.creatorId,
        entity.ownerId,
        entity.createdByUserId,
        entity.user?.userId,
        entity.user?.id,
        entity.user?.accountId,
        entity.owner?.id,
        entity.creator?.id,
        entity.createdBy?.id,
        entity.createdBy?.userId,
        entity.actor?.id,
      ]
        .map((val) => toIdString(val))
        .filter(Boolean);

      if (userId && candidateIds.includes(userId)) {
        return true;
      }

      const candidateEmails = [
        entity.userEmail,
        entity.createdByEmail,
        entity.ownerEmail,
        entity.creatorEmail,
        entity.actorEmail,
        entity.user?.email,
        entity.user?.userEmail,
        entity.owner?.email,
        entity.creator?.email,
        entity.createdBy?.email,
        entity.actor?.email,
      ]
        .map((val) => toEmailString(val))
        .filter(Boolean);

      if (userEmail && candidateEmails.includes(userEmail)) {
        return true;
      }

      return false;
    },
    [currentUserIdentifiers]
  );

  const showViewerRestrictionToast = useCallback(() => {
    setToast({ open: true, message: t("transactions.error.viewer_wallet_restricted"), type: "error" });
  }, [t, setToast]);

  const actionableWallets = useMemo(() => {
    if (!Array.isArray(wallets)) return [];
    return wallets.filter((wallet) => !isViewerOnlyWallet(wallet));
  }, [wallets]);

  const findWalletByDisplayName = useCallback(
    (walletName) => {
      if (!walletName || !Array.isArray(wallets)) return null;
      const normalized = walletName.trim().toLowerCase();
      return (
        wallets.find((wallet) => {
          const candidates = [wallet.name, wallet.walletName]
            .filter(Boolean)
            .map((label) => label.trim().toLowerCase());
          return candidates.includes(normalized);
        }) || null
      );
    },
    [wallets]
  );

  const findWalletById = useCallback(
    (walletId) => {
      if (!walletId || !Array.isArray(wallets)) return null;
      return (
        wallets.find(
          (wallet) => String(wallet.walletId || wallet.id) === String(walletId)
        ) || null
      );
    },
    [wallets]
  );

  // Helper function to map Transaction entity to frontend format
  const mapTransactionToFrontend = useCallback((tx) => {
    if (!tx) return null;
    const walletName =
          wallets.find((w) => w.walletId === tx.wallet?.walletId)?.walletName ||
          tx.wallet?.walletName ||
          tx.wallet?.name ||
          tx.walletName ||
          "Unknown";
    const categoryName =
      tx.category?.categoryName ||
      tx.category?.name ||
      tx.categoryName ||
      tx.category ||
      "Unknown";
    const type = resolveTransactionDirection(tx);

    const rawDateValue =
      tx.transactionDate ||
      tx.transaction_date ||
      tx.date ||
      tx.createdAt ||
      tx.created_at ||
      new Date().toISOString();

    const dateValue = ensureIsoDateWithTimezone(rawDateValue);

    // Sử dụng amount đã chuyển đổi (nếu có) hoặc amount gốc
    // Backend trả về amount đã được chuyển đổi theo currency của wallet hiện tại
    const displayAmount = parseFloat(tx.amount || 0);
    
    // Currency hiện tại của wallet (sau khi merge)
    const currentCurrency = tx.wallet?.currencyCode || tx.currencyCode || "VND";

    return {
      id: tx.transactionId,
      code: `TX-${String(tx.transactionId).padStart(4, "0")}`,
      type,
      walletName,
      amount: displayAmount,
      currency: currentCurrency,
      date: dateValue,
      category: categoryName,
      note: tx.note || "",
      creatorCode: `USR${String(tx.user?.userId || 0).padStart(3, "0")}`,
      attachment: resolveAttachmentFromTransaction(tx),
      // Lưu thông tin gốc để hiển thị nếu cần
      originalAmount: tx.originalAmount ? parseFloat(tx.originalAmount) : null,
      originalCurrency: tx.originalCurrency || null,
      exchangeRate: tx.exchangeRate ? parseFloat(tx.exchangeRate) : null,
    };
  }, [wallets]);

  const mapTransferToFrontend = useCallback((transfer) => {
    if (!transfer) return null;
    const sourceWalletName =
      wallets.find((w) => w.walletId === transfer.fromWallet?.walletId)?.walletName ||
      transfer.fromWallet?.walletName ||
      "Unknown";
    const targetWalletName =
      wallets.find((w) => w.walletId === transfer.toWallet?.walletId)?.walletName ||
      transfer.toWallet?.walletName ||
      "Unknown";

    const rawDateValue =
      transfer.transferDate ||
      transfer.transfer_date ||
      transfer.date ||
      transfer.createdAt ||
      transfer.created_at ||
      new Date().toISOString();

    const dateValue = ensureIsoDateWithTimezone(rawDateValue);

    return {
      id: transfer.transferId,
      code: `TR-${String(transfer.transferId).padStart(4, "0")}`,
      type: "transfer",
      sourceWallet: sourceWalletName,
      targetWallet: targetWalletName,
      amount: parseFloat(transfer.amount || 0),
      currency: transfer.currencyCode || "VND",
      date: dateValue,
      category: "Chuyển tiền giữa các ví",
      note: transfer.note || "",
      creatorCode: `USR${String(transfer.user?.userId || 0).padStart(3, "0")}`,
      attachment: "",
    };
  }, [wallets]);

  const refreshTransactionsData = useCallback(async () => {
    const walletIds = Array.from(
      new Set(
        (wallets || [])
          .map((wallet) => wallet?.walletId ?? wallet?.id)
          .filter((id) => id !== undefined && id !== null)
      )
    );

    const fetchScopedHistory = async () => {
      if (!walletIds.length) {
        return { external: [], internal: [] };
      }
      if (!transactionAPI.getWalletTransactions || !walletAPI.getWalletTransfers) {
        throw new Error("Scoped history APIs are unavailable");
      }

      const scopedTransactions = await Promise.all(
        walletIds.map(async (walletId) => {
          const response = await transactionAPI.getWalletTransactions(walletId);
          const list = extractListFromResponse(response, "transactions");
          return list.map((tx) => {
            if (!tx.wallet && !tx.walletId) {
              return { ...tx, wallet: { walletId } };
            }
            return tx;
          });
        })
      );

      const scopedTransfers = await Promise.all(
        walletIds.map(async (walletId) => {
          const response = await walletAPI.getWalletTransfers(walletId);
          return extractListFromResponse(response, "transfers");
        })
      );

      const transferMap = new Map();
      scopedTransfers.forEach((list) => {
        (list || []).forEach((transfer) => {
          const key = transfer?.transferId ?? transfer?.id;
          if (key === undefined || key === null) return;
          if (!transferMap.has(key)) {
            transferMap.set(key, transfer);
          }
        });
      });

      return {
        external: scopedTransactions.flat(),
        internal: Array.from(transferMap.values()),
      };
    };

    const fetchLegacyHistory = async () => {
      const [txResponse, transferResponse] = await Promise.all([
        transactionAPI.getAllTransactions(),
        walletAPI.getAllTransfers(),
      ]);
      return {
        external: extractListFromResponse(txResponse, "transactions"),
        internal: extractListFromResponse(transferResponse, "transfers"),
      };
    };

    try {
      const scoped = await fetchScopedHistory();
      const filteredScopedExternal = scoped.external.filter(matchesCurrentUser);
      const filteredScopedInternal = scoped.internal.filter(matchesCurrentUser);
      setExternalTransactions(filteredScopedExternal.map(mapTransactionToFrontend));
      setInternalTransactions(filteredScopedInternal.map(mapTransferToFrontend));
    } catch (scopedError) {
      console.warn("TransactionsPage: scoped history fetch failed, using legacy APIs", scopedError);
      const legacy = await fetchLegacyHistory();
      const filteredLegacyExternal = legacy.external.filter(matchesCurrentUser);
      const filteredLegacyInternal = legacy.internal.filter(matchesCurrentUser);
      setExternalTransactions(filteredLegacyExternal.map(mapTransactionToFrontend));
      setInternalTransactions(filteredLegacyInternal.map(mapTransferToFrontend));
    }
  }, [wallets, mapTransactionToFrontend, mapTransferToFrontend, matchesCurrentUser]);

  const runInitialLoad = useCallback(async () => {
    setLoading(true);
    try {
      await refreshTransactionsData();
    } finally {
      setLoading(false);
    }
  }, [refreshTransactionsData]);

  useEffect(() => {
    runInitialLoad();

    const handleUserChange = () => {
      runInitialLoad();
    };
    window.addEventListener("userChanged", handleUserChange);

    const handleStorageChange = (e) => {
      if (e.key === "accessToken" || e.key === "user" || e.key === "auth_user") {
        runInitialLoad();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Refresh transactions sau khi merge wallet
    const handleWalletMerged = () => {
      // Delay một chút để đảm bảo backend đã hoàn tất merge
      setTimeout(() => {
        runInitialLoad();
      }, 500);
    };
    window.addEventListener("walletMerged", handleWalletMerged);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletMerged", handleWalletMerged);
    };
  }, [runInitialLoad]);

  // Apply wallet filter when navigated with ?focus=<walletId|walletName>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusParam = params.get("focus");

    if (!focusParam) {
      if (appliedFocusParam) {
        setAppliedFocusParam("");
      }
      return;
    }

    if (!wallets || wallets.length === 0 || focusParam === appliedFocusParam) {
      return;
    }

    const normalizedFocus = focusParam.trim();
    const focusLower = normalizedFocus.toLowerCase();

    let walletNameToApply = normalizedFocus;

    const walletById = wallets.find(
      (wallet) => String(wallet.id) === normalizedFocus || String(wallet.walletId) === normalizedFocus
    );

    if (walletById) {
      walletNameToApply = walletById.name || walletById.walletName || walletNameToApply;
    } else {
      const walletByName = wallets.find(
        (wallet) => (wallet.name || wallet.walletName || "").toLowerCase() === focusLower
      );
      if (walletByName) {
        walletNameToApply = walletByName.name || walletByName.walletName || walletNameToApply;
      }
    }

    if (activeTab !== TABS.EXTERNAL) {
      setActiveTab(TABS.EXTERNAL);
    }

    setFilterWallet(walletNameToApply);
    setCurrentPage(1);
    setAppliedFocusParam(normalizedFocus);
  }, [location.search, wallets, activeTab, appliedFocusParam]);

  const handleTabChange = (e) => {
    const value = e.target.value;
    setActiveTab(value);
    setSearchText("");
  };

  const evaluateBudgetWarning = useCallback((payload, walletEntity) => {
    if (!payload || !walletEntity) return null;
    if (!budgets || budgets.length === 0) return null;
    const normalizedCategory = normalizeBudgetCategoryKey(payload.category);
    if (!normalizedCategory) return null;

    const txDate = (() => {
      if (payload.date) {
        const parsed = new Date(payload.date);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date();
    })();

    const orderedBudgets = [...budgets].sort((a, b) => {
      const aGlobal = a?.walletId === null || a?.walletId === undefined;
      const bGlobal = b?.walletId === null || b?.walletId === undefined;
      if (aGlobal === bGlobal) return 0;
      return aGlobal ? 1 : -1;
    });

    let alertCandidate = null;

    for (const budget of orderedBudgets) {
      if (!budget) continue;
      if ((budget.categoryType || "expense").toLowerCase() !== "expense") continue;
      const budgetCategory = normalizeBudgetCategoryKey(budget.categoryName);
      if (!budgetCategory || budgetCategory !== normalizedCategory) continue;
      if (!isTransactionWithinBudgetPeriod(budget, txDate)) continue;
      if (!doesBudgetMatchWallet(budget, walletEntity, payload.walletName)) continue;

      const limit = Number(budget.limitAmount || budget.amountLimit || 0);
      const amount = Number(payload.amount || 0);
      if (!limit || !amount) continue;

      const spent = Number(getSpentForBudget(budget) || 0);
      const totalAfterTx = spent + amount;
      const warnPercent = Number(budget.alertPercentage ?? budget.warningThreshold ?? 80);
      const warningAmount = limit * (warnPercent / 100);
      const isExceeding = totalAfterTx > limit;
      const crossesWarning = !isExceeding && spent < warningAmount && totalAfterTx >= warningAmount;

      if (isExceeding || crossesWarning) {
        const snapshot = {
          categoryName: budget.categoryName,
          walletName: budget.walletName || payload.walletName,
          budgetLimit: limit,
          spent,
          transactionAmount: amount,
          totalAfterTx,
          isExceeding,
        };

        if (isExceeding) {
          return snapshot;
        }

        if (!alertCandidate) {
          alertCandidate = snapshot;
        }
      }
    }

    return alertCandidate;
  }, [budgets, getSpentForBudget]);
  
  const handleCreate = async (payload, options = {}) => {
    const skipBudgetCheck = options.skipBudgetCheck === true;
    try {
        if (activeTab === TABS.EXTERNAL) {
        // Find walletId and categoryId
        const wallet = findWalletByDisplayName(payload.walletName);
        if (!wallet) {
          setToast({ open: true, message: t("transactions.error.wallet_not_found").replace("{wallet}", payload.walletName), type: "error" });
          return;
        }

        if (isViewerOnlyWallet(wallet)) {
          showViewerRestrictionToast();
          return;
        }

        // Tìm category trong đúng danh sách dựa trên loại giao dịch
        // Tránh tìm nhầm category cùng tên nhưng khác loại
        const categoryList = payload.type === "income" 
          ? (incomeCategories || [])
          : (expenseCategories || []);
        
        const category = categoryList.find(
          c => c.name === payload.category || 
               c.categoryName === payload.category ||
               (c.name && c.name.trim() === payload.category?.trim()) ||
               (c.categoryName && c.categoryName.trim() === payload.category?.trim())
        );
        
        if (!category) {
          setToast({ 
            open: true, 
            message: `Không tìm thấy danh mục "${payload.category}" trong loại ${payload.type === "income" ? "thu nhập" : "chi tiêu"}.`,
            type: "error"
          });
          return;
        }

        const walletId = wallet.walletId || wallet.id;
        const categoryId = category.categoryId || category.id;
        
        if (!categoryId) {
          setToast({ open: true, message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.", type: "error" });
          return;
        }
        
        if (payload.type === "expense" && !skipBudgetCheck) {
          const warningData = evaluateBudgetWarning(payload, wallet);
          if (warningData) {
            setPendingTransaction({ ...payload });
            setBudgetWarning(warningData);
            return;
          }
        }

        const transactionDate = payload.date ? new Date(payload.date).toISOString() : new Date().toISOString();

        // Call API
        if (payload.type === "expense") {
          await transactionAPI.addExpense(
            payload.amount,
            transactionDate,
            walletId,
            categoryId,
            payload.note || "",
            payload.attachment || null
          );
    } else {
          await transactionAPI.addIncome(
            payload.amount,
            transactionDate,
            walletId,
            categoryId,
            payload.note || "",
            payload.attachment || null
          );
        }

        setToast({ open: true, message: t("transactions.toast.add_success") });
      } else {
        // Internal transfer
        const sourceWallet = findWalletByDisplayName(payload.sourceWallet);
        const targetWallet = findWalletByDisplayName(payload.targetWallet);
        
        if (!sourceWallet || !targetWallet) {
          setToast({ open: true, message: t("transactions.error.wallet_not_found_pair"), type: "error" });
          return;
        }

        if (isViewerOnlyWallet(sourceWallet) || isViewerOnlyWallet(targetWallet)) {
          showViewerRestrictionToast();
          return;
        }

        const fromWalletId = sourceWallet.walletId || sourceWallet.id;
        const toWalletId = targetWallet.walletId || targetWallet.id;

        await walletAPI.transferMoney(
          fromWalletId,
          toWalletId,
          payload.amount,
          payload.note || ""
        );

        setToast({ open: true, message: t("transactions.toast.add_success") });
      }

      // Reload wallets để cập nhật số dư sau khi tạo giao dịch
      // Điều này đảm bảo trang ví tiền tự động cập nhật mà không cần reload
      await loadWallets();
      await refreshTransactionsData();

      setCurrentPage(1);
    } catch (error) {
      console.error("Error creating transaction:", error);
      setToast({ open: true, message: t("transactions.error.create_failed") + (error?.message ? `: ${error.message}` : ""), type: "error" });
    }
  };

  // Handle budget warning confirmation (user wants to continue)
  const handleBudgetWarningConfirm = async () => {
    if (!pendingTransaction) return;

    // Create the transaction anyway by calling handleCreate
    await handleCreate(pendingTransaction, { skipBudgetCheck: true });

    setBudgetWarning(null);
    setPendingTransaction(null);
  };

  // Handle budget warning cancellation
  const handleBudgetWarningCancel = () => {
    setBudgetWarning(null);
    setPendingTransaction(null);
    // Form luôn hiển thị, không cần set lại
  };

  const handleUpdate = async (payload) => {
    if (!editing) {
      console.error("handleUpdate: editing is null");
      return;
    }

    if (!editing.id) {
      console.error("handleUpdate: editing.id is missing", editing);
      setToast({ open: true, message: t("transactions.error.id_not_found"), type: "error" });
      return;
    }

    try {
      // Xử lý giao dịch chuyển tiền (transfer)
      if (editing.type === "transfer") {
        const sourceWalletEntity = findWalletByDisplayName(editing.sourceWallet || "");
        const targetWalletEntity = findWalletByDisplayName(editing.targetWallet || "");
        if (isViewerOnlyWallet(sourceWalletEntity) || isViewerOnlyWallet(targetWalletEntity)) {
          showViewerRestrictionToast();
          return;
        }

        console.log("Updating transfer:", {
          transferId: editing.id,
          note: payload.note || "",
        });
        
        const response = await walletAPI.updateTransfer(
          editing.id,
          payload.note || ""
        );
        
        console.log("Update transfer response:", response);

        await refreshTransactionsData();

        setEditing(null);
        setToast({ open: true, message: t("transactions.toast.update_success"), type: "success" });
        return;
      }

      // Xử lý giao dịch thu nhập/chi tiêu (external transactions)
      const editingWallet = findWalletByDisplayName(editing.walletName || "");
      if (isViewerOnlyWallet(editingWallet)) {
        showViewerRestrictionToast();
        return;
      }

      // Tìm categoryId từ category name
      const categoryList = editing.type === "income" 
        ? (incomeCategories || [])
        : (expenseCategories || []);
      
      const category = categoryList.find(
        c => c.name === payload.category || 
             c.categoryName === payload.category ||
             (c.name && c.name.trim() === payload.category?.trim()) ||
             (c.categoryName && c.categoryName.trim() === payload.category?.trim())
      );
      
      if (!category) {
        setToast({ 
          open: true, 
          message: `Không tìm thấy danh mục "${payload.category}" trong loại ${editing.type === "income" ? "thu nhập" : "chi tiêu"}.`,
          type: "error",
        });
        return;
      }

      const categoryId = category.categoryId || category.id;
      if (!categoryId) {
        setToast({ open: true, message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.", type: "error" });
        return;
      }

      // Gọi API update
      console.log("Updating transaction:", {
        transactionId: editing.id,
        categoryId,
        note: payload.note || "",
        attachment: payload.attachment || null
      });
      
      const response = await transactionAPI.updateTransaction(
        editing.id,
        categoryId,
        payload.note || "",
        payload.attachment || null
      );
      
      console.log("Update transaction response:", response);

      await refreshTransactionsData();

      setEditing(null);
      setToast({ open: true, message: t("transactions.toast.update_success"), type: "success" });
    } catch (error) {
      console.error("Error updating transaction/transfer:", error);
      const errorMessage = error.message || "Lỗi không xác định";
      if (editing.type === "transfer") {
        setToast({ open: true, message: t("transactions.error.update_failed") + ": " + errorMessage, type: "error" });
      } else {
        setToast({ open: true, message: t("transactions.error.update_failed") + ": " + errorMessage, type: "error" });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;

    const item = confirmDel;

    if (item.type === "transfer") {
      const sourceWalletEntity = findWalletByDisplayName(item.sourceWallet || "");
      const targetWalletEntity = findWalletByDisplayName(item.targetWallet || "");
      if (isViewerOnlyWallet(sourceWalletEntity) || isViewerOnlyWallet(targetWalletEntity)) {
        showViewerRestrictionToast();
        setConfirmDel(null);
        return;
      }
    } else {
      const deletingWallet = findWalletByDisplayName(item.walletName || "");
      if (isViewerOnlyWallet(deletingWallet)) {
        showViewerRestrictionToast();
        setConfirmDel(null);
        return;
      }
    }

    setConfirmDel(null); // Đóng modal

    try {
      // Xử lý xóa giao dịch chuyển tiền
      if (item.type === "transfer") {
        // Gọi API xóa transfer
        await walletAPI.deleteTransfer(item.id);

        // Reload wallets để cập nhật số dư
        await loadWallets();
        await refreshTransactionsData();

        setToast({ open: true, message: t("transactions.toast.delete_success"), type: "success" });
        return;
      }

      // Xử lý xóa giao dịch thu nhập/chi tiêu
      // Gọi API xóa
      await transactionAPI.deleteTransaction(item.id);

      // Reload wallets để cập nhật số dư
      await loadWallets();
      await refreshTransactionsData();

      setToast({ open: true, message: t("transactions.toast.delete_success"), type: "success" });
    } catch (error) {
      console.error("Error deleting transaction/transfer:", error);
      // Kiểm tra nếu lỗi là về ví âm tiền
      const errorMessage = error.message || "Lỗi không xác định";
      if (errorMessage.includes("Không thể xóa giao dịch vì ví không được âm tiền") || 
          errorMessage.includes("ví không được âm tiền") || 
          errorMessage.includes("ví âm tiền") ||
          errorMessage.includes("âm tiền")) {
        setToast({ open: true, message: t("transactions.error.delete_wallet_negative"), type: "error" });
      } else {
        if (item.type === "transfer") {
          setToast({ open: true, message: t("transactions.error.delete_failed") + ": " + errorMessage, type: "error" });
        } else {
          setToast({ open: true, message: t("transactions.error.delete_failed") + ": " + errorMessage, type: "error" });
        }
      }
    }
  };

  const handleTransactionEditRequest = useCallback(
    (tx) => {
      if (!tx) return;

      if (tx.type === "transfer") {
        const sourceWalletEntity = findWalletByDisplayName(tx.sourceWallet || "");
        const targetWalletEntity = findWalletByDisplayName(tx.targetWallet || "");
        if (isViewerOnlyWallet(sourceWalletEntity) || isViewerOnlyWallet(targetWalletEntity)) {
          showViewerRestrictionToast();
          return;
        }
      } else {
        const walletEntity = findWalletByDisplayName(tx.walletName || "");
        if (isViewerOnlyWallet(walletEntity)) {
          showViewerRestrictionToast();
          return;
        }
      }

      setEditing(tx);
    },
    [findWalletByDisplayName, showViewerRestrictionToast, setEditing]
  );

  const handleTransactionDeleteRequest = useCallback(
    (tx) => {
      if (!tx) return;

      if (tx.type === "transfer") {
        const sourceWalletEntity = findWalletByDisplayName(tx.sourceWallet || "");
        const targetWalletEntity = findWalletByDisplayName(tx.targetWallet || "");
        if (isViewerOnlyWallet(sourceWalletEntity) || isViewerOnlyWallet(targetWalletEntity)) {
          showViewerRestrictionToast();
          return;
        }
      } else {
        const walletEntity = findWalletByDisplayName(tx.walletName || "");
        if (isViewerOnlyWallet(walletEntity)) {
          showViewerRestrictionToast();
          return;
        }
      }

      setConfirmDel(tx);
    },
    [findWalletByDisplayName, showViewerRestrictionToast, setConfirmDel]
  );

  // Update budget data when transactions change
  useEffect(() => {
    // Build transaction map keyed by category:wallet and category:all
    // category:walletName = spent for transactions of that category in that specific wallet
    // category:all = sum of all wallets for that category (for "apply to all wallets" budgets)
    const categoryMap = {};
    const categoryAllTotals = {}; // Temp to sum by category

    externalTransactions.forEach((t) => {
      if (t.type === "expense" && t.category && t.walletName) {
        // Add to specific wallet key
        const walletKey = `${t.category}:${t.walletName}`;
        categoryMap[walletKey] = (categoryMap[walletKey] || 0) + t.amount;

        // Track total for category:all calculation
        categoryAllTotals[t.category] = (categoryAllTotals[t.category] || 0) + t.amount;
      }
    });

    // Add category:all totals to map
    Object.entries(categoryAllTotals).forEach(([category, total]) => {
      categoryMap[`${category}:all`] = total;
    });

    updateTransactionsByCategory(categoryMap);
    // also provide the full transactions list to budget context for period-based calculations
    updateAllExternalTransactions(externalTransactions);
  }, [externalTransactions, updateTransactionsByCategory, updateAllExternalTransactions]);

  const currentTransactions = useMemo(
    () =>
      activeTab === TABS.EXTERNAL
        ? externalTransactions
        : internalTransactions,
    [activeTab, externalTransactions, internalTransactions]
  );

  const allCategories = useMemo(() => {
    const s = new Set(currentTransactions.map((t) => t.category).filter(Boolean));
    return Array.from(s);
  }, [currentTransactions]);

  const allWallets = useMemo(() => {
    if (activeTab === TABS.EXTERNAL) {
      const s = new Set(
        externalTransactions.map((t) => t.walletName).filter(Boolean)
      );
      return Array.from(s);
    }
    const s = new Set();
    internalTransactions.forEach((t) => {
      if (t.sourceWallet) s.add(t.sourceWallet);
      if (t.targetWallet) s.add(t.targetWallet);
    });
    return Array.from(s);
  }, [activeTab, externalTransactions, internalTransactions]);

  const scheduleCounts = useMemo(() => {
    const counts = { all: scheduledTransactions.length, pending: 0, recurring: 0 };
    scheduledTransactions.forEach((item) => {
      if (item.status === "PENDING" || item.status === "RUNNING") counts.pending += 1;
      if (item.scheduleType !== "ONE_TIME") counts.recurring += 1;
    });
    return counts;
  }, [scheduledTransactions]);

  const filteredSchedules = useMemo(() => {
    return scheduledTransactions.filter((item) => {
      if (scheduleFilter === "pending") {
        return item.status === "PENDING" || item.status === "RUNNING";
      }
      if (scheduleFilter === "recurring") {
        return item.scheduleType !== "ONE_TIME";
      }
      return true;
    });
  }, [scheduledTransactions, scheduleFilter]);

  const isScheduleView = activeTab === TABS.SCHEDULE;

  const filteredSorted = useMemo(() => {
    let list = currentTransactions.slice();

    list = list.filter((t) => {
      // Filter theo loại giao dịch (chỉ áp dụng cho external transactions)
      // "all" = hiển thị tổng hợp cả thu nhập và chi tiêu
      if (activeTab === TABS.EXTERNAL) {
        if (filterType !== "all" && t.type !== filterType) return false;
      }

      if (filterCategory !== "all" && t.category !== filterCategory) return false;

      if (filterWallet !== "all") {
        if (activeTab === TABS.EXTERNAL) {
          if (t.walletName !== filterWallet) return false;
        } else {
          if (
            t.sourceWallet !== filterWallet &&
            t.targetWallet !== filterWallet
          )
            return false;
        }
      }

      const d = toDateObj(t.date);
      if (!d) return false;

      if (fromDateTime) {
        const from = toDateObj(fromDateTime);
        if (from && d < from) return false;
      }

      if (toDateTime) {
        const to = toDateObj(toDateTime);
        if (to && d > to) return false;
      }

      if (currencyFilter !== "all") {
        if (t.currency !== currencyFilter) return false;
      }

      if (searchText) {
        const keyword = searchText.toLowerCase();
        const joined =
          activeTab === TABS.EXTERNAL
            ? [
                t.code,
                t.walletName,
                t.category,
                t.note,
                t.amount?.toString(),
              ]
                .join(" ")
                .toLowerCase()
            : [
                t.code,
                t.sourceWallet,
                t.targetWallet,
                t.category,
                t.note,
                t.amount?.toString(),
              ]
                .join(" ")
                .toLowerCase();
        if (!joined.includes(keyword)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const da = toDateObj(a.date)?.getTime() || 0;
      const db = toDateObj(b.date)?.getTime() || 0;
      return db - da;
    });

    return list;
  }, [
    currentTransactions,
    activeTab,
    filterType,
    filterCategory,
    filterWallet,
    fromDateTime,
    toDateTime,
    currencyFilter,
    searchText,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  const paginationRange = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (startPage > 2) pages.push("left-ellipsis");

    for (let p = startPage; p <= endPage; p += 1) {
      pages.push(p);
    }

    if (endPage < totalPages - 1) pages.push("right-ellipsis");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, currentPage]);

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchText("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterWallet("all");
    setToDateTime("");
    setCurrentPage(1);
  };

  const handleScheduleSubmit = (payload) => {
    const scheduleWallet = findWalletById(payload.walletId);
    if (scheduleWallet && isViewerOnlyWallet(scheduleWallet)) {
      showViewerRestrictionToast();
      return;
    }

    const scheduleId = Date.now();
    const totalRuns = estimateScheduleRuns(payload.firstRun, payload.endDate, payload.scheduleType);
    const newSchedule = {
      id: scheduleId,
      walletId: payload.walletId,
      walletName: payload.walletName,
      categoryName: payload.categoryName,
      transactionType: payload.transactionType,
      amount: payload.amount,
      currency: "VND",
      scheduleType: payload.scheduleType,
      scheduleTypeLabel: SCHEDULE_TYPE_LABELS[payload.scheduleType] || payload.scheduleType,
      status: "PENDING",
      firstRun: payload.firstRun,
      nextRun: payload.firstRun,
      endDate: payload.endDate,
      successRuns: 0,
      totalRuns,
      warning: null,
      logs: [],
    };

    setScheduledTransactions((prev) => [newSchedule, ...prev]);
    setScheduleModalOpen(false);
    setToast({ open: true, message: t("transactions.toast.schedule_created"), type: "success" });
  };

  const handleScheduleCancel = (scheduleId) => {
    setScheduledTransactions((prev) =>
      prev.map((item) => {
        if (item.id !== scheduleId) return item;
        return {
          ...item,
          status: "CANCELLED",
          warning: null,
          logs: [
            {
              id: Date.now(),
              time: new Date().toISOString(),
              status: "FAILED",
              message: "Người dùng đã hủy lịch.",
            },
            ...item.logs,
          ],
        };
      })
    );

    setSelectedSchedule((prev) => (prev?.id === scheduleId ? null : prev));
    setToast({ open: true, message: t("transactions.toast.schedule_cancelled"), type: "success" });
  };

  return (
    <div className="tx-page container-fluid py-4">
      <div className="tx-page-inner">
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-header-icon">
            <i className="bi bi-cash-stack" />
          </div>
          <div>
            <h2 className="wallet-header-title">{t("transactions.page.title")}</h2>
            <p className="wallet-header-subtitle">{t("transactions.page.subtitle")}</p>
          </div>
        </div>

        <div className="wallet-header-center d-flex justify-content-end">
          <div className="funds-tabs">
            <button
              type="button"
              className={`funds-tab ${activeTab === TABS.EXTERNAL ? "funds-tab--active" : ""}`}
              onClick={() => handleTabChange({ target: { value: TABS.EXTERNAL } })}
            >
              {t("transactions.tab.external")}
            </button>
            <button
              type="button"
              className={`funds-tab ${activeTab === TABS.INTERNAL ? "funds-tab--active" : ""}`}
              onClick={() => handleTabChange({ target: { value: TABS.INTERNAL } })}
            >
              {t("transactions.tab.internal")}
            </button>
            <button
              type="button"
              className={`funds-tab ${activeTab === TABS.SCHEDULE ? "funds-tab--active" : ""}`}
              onClick={() => handleTabChange({ target: { value: TABS.SCHEDULE } })}
            >
              {t("transactions.tab.schedule")}
            </button>
          </div>
        </div>

        <div className="wallet-header-right d-flex align-items-center justify-content-end gap-2">
          {/* Không cần nút toggle form nữa vì form luôn hiển thị */}
        </div>
      </div>


      {isScheduleView ? (
        <div className="scheduled-section card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h5 className="mb-1">{t("transactions.schedule.title")}</h5>
                <p className="text-muted mb-0">{t("transactions.schedule.desc")}</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => setScheduleModalOpen(true)}>
                <i className="bi bi-plus-lg me-2" />{t("transactions.schedule.create_btn")}
              </button>
            </div>

            <div className="schedule-tabs mb-3">
              {SCHEDULE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`schedule-tab ${scheduleFilter === tab.value ? "active" : ""}`}
                  onClick={() => setScheduleFilter(tab.value)}
                >
                  {t(`transactions.schedule.tab.${tab.value}`)}
                  <span className="badge rounded-pill bg-light text-dark ms-2">
                    {scheduleCounts[tab.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="text-center text-muted py-4">
                Chưa có lịch nào phù hợp.
              </div>
            ) : (
              <div className="schedule-list">
                {filteredSchedules.map((schedule) => {
                  const meta = SCHEDULE_STATUS_META[schedule.status] || SCHEDULE_STATUS_META.PENDING;
                  const progress = schedule.totalRuns > 0 ? Math.min(100, Math.round((schedule.successRuns / schedule.totalRuns) * 100)) : 0;
                  return (
                    <div className="scheduled-card" key={schedule.id}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="mb-1">
                            {schedule.walletName} • {schedule.transactionType === "income" ? t("transactions.type.income") : t("transactions.type.expense")}
                          </h6>
                          <p className="mb-1 text-muted">
                            {schedule.categoryName} · {schedule.scheduleTypeLabel}
                          </p>
                        </div>
                        <span className={meta.className}>{t(`transactions.schedule.status.${String(schedule.status).toLowerCase()}`)}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-3 mb-2 small text-muted">
                        <span>{t("transactions.schedule.amount")} {formatCurrency(schedule.amount)}</span>
                        <span>{t("transactions.schedule.next_run")} {formatVietnamDateTime(schedule.nextRun)}</span>
                        <span>
                          {t("transactions.schedule.completed_runs")} {schedule.successRuns}/{schedule.totalRuns || "∞"}
                        </span>
                      </div>
                      <div className="progress schedule-progress">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                      </div>
                      {schedule.warning && (
                        <div className="schedule-warning">
                          <i className="bi bi-exclamation-triangle-fill me-1" />
                          {schedule.warning}
                        </div>
                      )}
                      <div className="scheduled-card-actions">
                        <button type="button" className="btn btn-link px-0" onClick={() => setSelectedSchedule(schedule)}>
                          {t("transactions.schedule.view_history")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-link px-0 text-danger"
                          disabled={schedule.status === "CANCELLED"}
                          onClick={() => handleScheduleCancel(schedule.id)}
                        >
                          {t("transactions.schedule.cancel")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`transactions-layout ${expandedPanel ? "transactions-layout--expanded" : "transactions-layout--with-history"}`}>
          {/* LEFT: Create Transaction Form */}
          {(!expandedPanel || expandedPanel === "form") && (
            <div className={`transactions-form-panel ${expandedPanel === "form" ? "expanded" : ""}`}>
              <TransactionForm
                mode="create"
                variant={activeTab === TABS.INTERNAL ? "internal" : "external"}
                onSubmit={handleCreate}
                onReset={() => {
                  // Reset form sau khi submit
                }}
                expanded={expandedPanel === "form"}
                onToggleExpand={() => setExpandedPanel(expandedPanel === "form" ? null : "form")}
                availableWallets={actionableWallets}
              />
            </div>
          )}

          {/* RIGHT: Transaction History */}
          {(!expandedPanel || expandedPanel === "history") && (
            <div className={`transactions-history-panel ${expandedPanel === "history" ? "expanded" : ""}`}>
              <TransactionList
                transactions={filteredSorted}
                activeTab={activeTab}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                paginationRange={paginationRange}
                onPageChange={handlePageChange}
                onView={setViewing}
                onEdit={handleTransactionEditRequest}
                onDelete={handleTransactionDeleteRequest}
                filterType={filterType}
                onFilterTypeChange={(value) => {
                  setFilterType(value);
                  setCurrentPage(1);
                }}
                searchText={searchText}
                onSearchChange={(value) => {
                  setSearchText(value);
                  setCurrentPage(1);
                }}
                fromDateTime={fromDateTime}
                onFromDateTimeChange={(value) => {
                  setFromDateTime(value);
                  setCurrentPage(1);
                }}
                toDateTime={toDateTime}
                onToDateTimeChange={(value) => {
                  setToDateTime(value);
                  setCurrentPage(1);
                }}
                currencyFilter={currencyFilter}
                onCurrencyFilterChange={(value) => {
                  setCurrencyFilter(value);
                  setCurrentPage(1);
                }}
                expanded={expandedPanel === "history"}
                onToggleExpand={() => setExpandedPanel(expandedPanel === "history" ? null : "history")}
              />
            </div>
          )}
        </div>
      )}

      <ScheduledTransactionModal
        open={scheduleModalOpen}
        wallets={actionableWallets}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onSubmit={handleScheduleSubmit}
        onClose={() => setScheduleModalOpen(false)}
      />

      <ScheduledTransactionDrawer
        open={!!selectedSchedule}
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onCancel={handleScheduleCancel}
      />

      <TransactionViewModal
        open={!!viewing}
        tx={viewing}
        onClose={() => setViewing(null)}
      />

      <TransactionFormModal
        open={!!editing}
        mode="edit"
        variant={editing && editing.sourceWallet ? "internal" : "external"}
        initialData={editing}
        onSubmit={handleUpdate}
        onClose={() => setEditing(null)}
        availableWallets={actionableWallets}
      />

      <ConfirmModal
        open={!!confirmDel}
        title={t("transactions.confirm.delete_title")}
        message={
          confirmDel ? t("transactions.confirm.delete_message").replace("{code}", confirmDel.code) : ""
        }
        okText={t("transactions.confirm.delete_ok")}
        cancelText={t("transactions.confirm.delete_cancel")}
        onOk={handleDelete}
        onClose={() => setConfirmDel(null)}
      />

      <BudgetWarningModal
        open={!!budgetWarning}
        categoryName={budgetWarning?.categoryName}
        walletName={budgetWarning?.walletName}
        budgetLimit={budgetWarning?.budgetLimit || 0}
        spent={budgetWarning?.spent || 0}
        transactionAmount={budgetWarning?.transactionAmount || 0}
        totalAfterTx={budgetWarning?.totalAfterTx || 0}
        isExceeding={budgetWarning?.isExceeding || false}
        onConfirm={handleBudgetWarningConfirm}
        onCancel={handleBudgetWarningCancel}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={2200}
        onClose={() => setToast({ open: false, message: "", type: "success" })}
      />
      </div>
    </div>
  );
}

function estimateScheduleRuns(startValue, endValue, scheduleType) {
  if (scheduleType === "ONE_TIME") return 1;
  if (!startValue || !endValue) return 0;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  switch (scheduleType) {
    case "DAILY":
      return diffDays + 1;
    case "WEEKLY":
      return Math.floor(diffDays / 7) + 1;
    case "MONTHLY":
      return Math.max(1, Math.round(diffDays / 30));
    case "YEARLY":
      return Math.max(1, Math.round(diffDays / 365));
    default:
      return 0;
  }
}

function normalizeBudgetCategoryKey(value) {
  if (!value && value !== 0) return "";
  return String(value).trim().toLowerCase();
}

function parseBudgetBoundaryDate(value, isEnd = false) {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [year, month, day] = (datePart || "").split("-");
  const y = Number(year);
  const m = Number(month) - 1;
  const d = Number(day);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const hours = isEnd ? 23 : 0;
  const minutes = isEnd ? 59 : 0;
  const seconds = isEnd ? 59 : 0;
  const ms = isEnd ? 999 : 0;
  return new Date(y, m, d, hours, minutes, seconds, ms);
}

function isTransactionWithinBudgetPeriod(budget, txDate) {
  if (!budget) return false;
  if (!budget.startDate && !budget.endDate) return true;
  if (!txDate || Number.isNaN(txDate.getTime())) return false;
  const start = parseBudgetBoundaryDate(budget.startDate, false);
  const end = parseBudgetBoundaryDate(budget.endDate, true);
  if (start && txDate < start) return false;
  if (end && txDate > end) return false;
  return true;
}

function doesBudgetMatchWallet(budget, walletEntity, fallbackWalletName) {
  if (!budget) return false;
  if (budget.walletId === null || budget.walletId === undefined) {
    return true;
  }
  const walletId = walletEntity ? (walletEntity.walletId ?? walletEntity.id) : null;
  if (walletId !== null && walletId !== undefined) {
    if (Number(budget.walletId) === Number(walletId)) {
      return true;
    }
  }
  const budgetWalletName = normalizeBudgetCategoryKey(budget.walletName);
  const walletName = normalizeBudgetCategoryKey(
    walletEntity?.name || walletEntity?.walletName || fallbackWalletName
  );
  return !!budgetWalletName && budgetWalletName === walletName;
}

const SCHEDULE_TYPE_LABELS = {
  ONE_TIME: "Một lần",
  DAILY: "Hằng ngày",
  WEEKLY: "Hằng tuần",
  MONTHLY: "Hằng tháng",
  YEARLY: "Hằng năm",
};

const SCHEDULE_STATUS_META = {
  PENDING: { label: "Chờ chạy", className: "schedule-status schedule-status--pending" },
  RUNNING: { label: "Đang chạy", className: "schedule-status schedule-status--running" },
  COMPLETED: { label: "Hoàn tất", className: "schedule-status schedule-status--success" },
  FAILED: { label: "Thất bại", className: "schedule-status schedule-status--failed" },
  CANCELLED: { label: "Đã hủy", className: "schedule-status schedule-status--muted" },
};

const SCHEDULE_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ chạy" },
  { value: "recurring", label: "Định kỳ" },
];

const MOCK_SCHEDULES = [
  {
    id: 101,
    walletId: "wallet-main",
    walletName: "Ví chính",
    categoryName: "Hóa đơn",
    transactionType: "expense",
    amount: 2500000,
    currency: "VND",
    scheduleType: "MONTHLY",
    scheduleTypeLabel: SCHEDULE_TYPE_LABELS.MONTHLY,
    status: "PENDING",
    firstRun: "2025-01-05T08:00",
    nextRun: "2025-03-05T08:00",
    endDate: "2025-12-31",
    successRuns: 1,
    totalRuns: 12,
    warning: null,
    logs: [
      { id: 1, time: "2025-02-05T08:00", status: "FAILED", message: "Không đủ số dư" },
      { id: 2, time: "2025-01-05T08:00", status: "COMPLETED", message: "Thành công" },
    ],
  },
  {
    id: 102,
    walletId: "wallet-travel",
    walletName: "Ví du lịch",
    categoryName: "Tiền lãi",
    transactionType: "income",
    amount: 1000000,
    currency: "VND",
    scheduleType: "DAILY",
    scheduleTypeLabel: SCHEDULE_TYPE_LABELS.DAILY,
    status: "FAILED",
    firstRun: "2025-02-01T09:00",
    nextRun: "2025-02-22T09:00",
    endDate: null,
    successRuns: 3,
    totalRuns: 5,
    warning: "Không đủ số dư ở lần gần nhất",
    logs: [
      { id: 3, time: "2025-02-10T09:00", status: "FAILED", message: "Không đủ số dư ví du lịch" },
      { id: 4, time: "2025-02-09T09:00", status: "COMPLETED", message: "Thành công" },
    ],
  },
];