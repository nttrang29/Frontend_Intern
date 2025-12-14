import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useCurrency } from "../../hooks/useCurrency";

import { useLocation } from "react-router-dom";
import "../../styles/pages/TransactionsPage.css";
import TransactionViewModal from "../../components/transactions/TransactionViewModal";
import TransactionFormModal from "../../components/transactions/TransactionFormModal";
import TransactionForm from "../../components/transactions/TransactionForm";
import TransactionList from "../../components/transactions/TransactionList";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import BudgetWarningModal from "../../components/budgets/BudgetWarningModal";
import { useBudgetData } from "../../contexts/BudgetDataContext";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useFundData } from "../../contexts/FundDataContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services/wallet.service";
import { getFundTransactions } from "../../services/fund.service";
import { API_BASE_URL } from "../../services/api-client";
import { formatVietnamDateTime } from "../../utils/dateFormat";

// ===== REMOVED MOCK DATA - Now using API =====

const TABS = {
  EXTERNAL: "external",
  INTERNAL: "internal",
  FUND: "fund",
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
    // Backend lưu date theo GMT+7 (Asia/Ho_Chi_Minh), nên thêm +07:00 thay vì Z (UTC)
    value = `${value}+07:00`;
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
  
  // Ưu tiên các field trực tiếp của transaction (imageUrl, attachmentUrl, etc.)
  for (const key of ATTACHMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(tx, key)) {
      const value = tx[key];
      if (value) {
        const normalized = normalizeAttachmentCandidate(value);
        if (normalized) return normalized;
      }
    }
  }
  
  // Fallback sources trực tiếp
  const fallbackSources = [tx.media, tx.attachments, tx.files, tx.images];
  for (const source of fallbackSources) {
    if (source) {
      const normalized = normalizeAttachmentCandidate(source);
      if (normalized) return normalized;
    }
  }

  // Chỉ scan vào các object liên quan đến attachment, TRÁNH scan vào user/creator để không lấy avatar
  const scanObjectForHints = (obj, depth = 0, skipKeys = []) => {
    if (!obj || depth > 2) return ""; // Giảm depth để tránh scan quá sâu
    
    // Nếu là string, format và return
    if (typeof obj === "string") {
      const formatted = formatAttachmentUrl(obj);
      return formatted || "";
    }
    
    // Nếu là array, scan từng item
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resolved = scanObjectForHints(item, depth + 1, skipKeys);
        if (resolved) return resolved;
      }
      return "";
    }
    
    // Nếu là object
    if (typeof obj === "object") {
      // Bỏ qua các key không liên quan đến attachment (user, creator, owner, etc.)
      const excludedKeys = ['user', 'creator', 'owner', 'createdBy', 'updatedBy', 'performedBy', 'executor', 'actor', 'avatar'];
      
      for (const key of Object.keys(obj)) {
        const lower = key.toLowerCase();
        
        // Skip nếu key bị exclude hoặc trong skipKeys
        if (excludedKeys.includes(lower) || skipKeys.includes(lower)) {
          continue;
        }
        
        // Nếu key có hint về attachment, xử lý ngay
        if (ATTACHMENT_HINTS.some((hint) => lower.includes(hint))) {
          const normalized = normalizeAttachmentCandidate(obj[key]);
          if (normalized) return normalized;
        }
        
        // Chỉ scan nested nếu không phải là user/creator object và depth còn cho phép
        if (depth < 2 && !excludedKeys.includes(lower)) {
          const nested = scanObjectForHints(obj[key], depth + 1, [...skipKeys, ...excludedKeys]);
          if (nested) return nested;
        }
      }
    }
    return "";
  };

  // Scan transaction nhưng skip user và creator - chỉ scan depth 1
  // Tạo một object copy không có user/creator để scan
  const txWithoutUser = { ...tx };
  delete txWithoutUser.user;
  delete txWithoutUser.creator;
  delete txWithoutUser.owner;
  delete txWithoutUser.createdBy;
  delete txWithoutUser.updatedBy;
  
  return scanObjectForHints(txWithoutUser, 0, []);
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
  const [fundTransactions, setFundTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.EXTERNAL);

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [expandedPanel, setExpandedPanel] = useState(null); // "form" | "history" | null

  const [currentPage, setCurrentPage] = useState(1);


  // Get shared data from contexts
  const { budgets, getSpentAmount, getSpentForBudget, updateTransactionsByCategory, updateAllExternalTransactions } = useBudgetData();
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets, loadWallets } = useWalletData();
  const { funds } = useFundData();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [appliedFocusParam, setAppliedFocusParam] = useState("");
  
  // Budget warning state
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  // Memoize currentUser identifiers - chỉ thay đổi khi giá trị thực sự thay đổi
  const currentUserId = currentUser?.userId || currentUser?.id || currentUser?.accountId || currentUser?.userID || currentUser?.accountID || null;
  const currentUserEmail = (currentUser?.email || currentUser?.userEmail || currentUser?.username || currentUser?.login || currentUser?.accountEmail || "").trim().toLowerCase();
  
  const currentUserIdentifiers = useMemo(() => {
    return {
      id: currentUserId !== null ? String(currentUserId) : null,
      email: currentUserEmail,
    };
  }, [currentUserId, currentUserEmail]);

  // Memoize matchesCurrentUser - chỉ tạo lại khi identifiers thay đổi
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
    [currentUserIdentifiers.id, currentUserIdentifiers.email]
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

  // Memoize wallets map để tránh tìm kiếm lại mỗi lần
  const walletsMap = useMemo(() => {
    const map = new Map();
    (wallets || []).forEach(w => {
      const id = w.walletId || w.id;
      if (id) {
        map.set(id, w);
      }
    });
    return map;
  }, [wallets]);

  // Memoize wallets IDs string để so sánh thay đổi
  const walletsIds = useMemo(() => {
    return (wallets || []).map(w => w.walletId || w.id).filter(Boolean).sort().join(',');
  }, [wallets]);

  // Helper function to map Transaction entity to frontend format
  const mapTransactionToFrontend = useCallback((tx) => {
    if (!tx) return null;
    const walletId = tx.wallet?.walletId || tx.walletId;
    const wallet = walletId ? walletsMap.get(walletId) : null;
    let walletName =
          wallet?.walletName ||
          wallet?.name ||
          tx.wallet?.walletName ||
          tx.wallet?.name ||
          tx.walletName ||
          "Unknown";
    
    // Kiểm tra xem wallet có bị deleted không
    const isWalletDeleted = 
      tx.wallet?.deleted === true || 
      wallet?.deleted === true ||
      tx.wallet?.isDeleted === true ||
      wallet?.isDeleted === true;
    
    // Thêm "(đã xóa)" vào tên ví nếu wallet đã bị soft delete
    if (isWalletDeleted) {
      walletName = `${walletName} (đã xóa)`;
    }
    
    const categoryName =
      tx.category?.categoryName ||
      tx.category?.name ||
      tx.categoryName ||
      tx.category ||
      "Unknown";
    const type = resolveTransactionDirection(tx);

    // Ưu tiên createdAt/created_at cho cột thời gian trong lịch sử giao dịch
    const rawDateValue =
      tx.createdAt ||
      tx.created_at ||
      tx.transactionDate ||
      tx.transaction_date ||
      tx.date ||
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
      // Lưu trạng thái deleted của wallet để ẩn nút sửa/xóa
      isWalletDeleted: isWalletDeleted,
    };
  }, [walletsMap]);

  const mapTransferToFrontend = useCallback((transfer) => {
    if (!transfer) return null;
    const fromWalletId = transfer.fromWallet?.walletId;
    const toWalletId = transfer.toWallet?.walletId;
    const fromWallet = fromWalletId ? walletsMap.get(fromWalletId) : null;
    const toWallet = toWalletId ? walletsMap.get(toWalletId) : null;
    
    let sourceWalletName =
      fromWallet?.walletName ||
      fromWallet?.name ||
      transfer.fromWallet?.walletName ||
      "Unknown";
    
    // Kiểm tra xem fromWallet có bị deleted không
    const isFromWalletDeleted = 
      transfer.fromWallet?.deleted === true || 
      fromWallet?.deleted === true ||
      transfer.fromWallet?.isDeleted === true ||
      fromWallet?.isDeleted === true;
    
    if (isFromWalletDeleted) {
      sourceWalletName = `${sourceWalletName} (đã xóa)`;
    }
    
    let targetWalletName =
      toWallet?.walletName ||
      toWallet?.name ||
      transfer.toWallet?.walletName ||
      "Unknown";
    
    // Kiểm tra xem toWallet có bị deleted không
    const isToWalletDeleted = 
      transfer.toWallet?.deleted === true || 
      toWallet?.deleted === true ||
      transfer.toWallet?.isDeleted === true ||
      toWallet?.isDeleted === true;
    
    if (isToWalletDeleted) {
      targetWalletName = `${targetWalletName} (đã xóa)`;
    }

    // Nếu một trong hai wallet bị deleted, đánh dấu transfer không thể sửa/xóa
    const isWalletDeleted = isFromWalletDeleted || isToWalletDeleted;

    // Ưu tiên createdAt/created_at cho cột thời gian trong lịch sử giao dịch giữa các ví
    const rawDateValue =
      transfer.createdAt ||
      transfer.created_at ||
      transfer.transferDate ||
      transfer.transfer_date ||
      transfer.date ||
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
      // Lưu trạng thái deleted của wallet để ẩn nút sửa/xóa
      isWalletDeleted: isWalletDeleted,
    };
  }, [walletsMap]);

  // Map fund transaction to frontend format
  const mapFundTransactionToFrontend = useCallback((tx, fund) => {
    if (!tx || !fund) return null;
    
    const txType = tx.type || "";
    let category = "";
    let type = "expense";
    
    // Xác định loại giao dịch và category
    // Nạp tiền vào quỹ = Chi tiêu (tiền ra khỏi ví nguồn)
    // Rút tiền từ quỹ = Thu nhập (tiền về ví nguồn)
    if (txType === "DEPOSIT" || txType === "AUTO_DEPOSIT" || txType === "AUTO_DEPOSIT_RECOVERY") {
      type = "expense"; // Nạp tiền vào quỹ = Chi tiêu
      if (txType === "AUTO_DEPOSIT") {
        category = "Nạp tiền tự động";
      } else if (txType === "AUTO_DEPOSIT_RECOVERY") {
        category = "Nạp bù tự động";
      } else {
        category = "Nạp tiền vào quỹ";
      }
    } else if (txType === "WITHDRAW") {
      type = "income"; // Rút tiền từ quỹ = Thu nhập
      category = "Rút tiền từ quỹ";
    } else if (txType === "SETTLE") {
      type = "income"; // Tất toán quỹ = Thu nhập (tiền về ví nguồn)
      category = "Tất toán quỹ";
    } else {
      category = "Giao dịch quỹ";
    }
    
    // Lấy tên quỹ từ nhiều nguồn có thể - ưu tiên fundName, sau đó name
    const fundName = (fund && (fund.fundName || fund.name)) || "Unknown";
    
    // Debug log để kiểm tra
    if (!fundName || fundName === "Unknown") {
      console.warn("mapFundTransactionToFrontend: fundName is missing", {
        fund,
        fundName,
        txId: tx.id || tx.transactionId
      });
    }
    
    const sourceWalletName = fund.sourceWalletName || fund.sourceWallet?.name || "Ví nguồn";
    const targetWalletName = fund.targetWalletName || fund.targetWallet?.name || "Ví quỹ";
    
    // Ưu tiên createdAt/created_at cho cột thời gian
    const rawDateValue =
      tx.createdAt ||
      tx.created_at ||
      tx.transactionDate ||
      tx.transaction_date ||
      tx.date ||
      new Date().toISOString();

    const dateValue = ensureIsoDateWithTimezone(rawDateValue);
    
    const amount = parseFloat(tx.amount || 0);
    const currency = fund.currencyCode || fund.currency || "VND";
    
    // Xác định walletName dựa trên loại giao dịch:
    // - Nạp tiền vào quỹ (expense): tiền từ ví nguồn -> sourceWalletName
    // - Rút tiền từ quỹ (income): tiền về ví nguồn -> sourceWalletName
    // - Tất toán quỹ (income): tiền về ví nguồn -> sourceWalletName
    let walletName = sourceWalletName; // Mặc định là ví nguồn
    if (txType === "DEPOSIT" || txType === "AUTO_DEPOSIT" || txType === "AUTO_DEPOSIT_RECOVERY") {
      walletName = sourceWalletName; // Nạp tiền: từ ví nguồn
    } else if (txType === "WITHDRAW" || txType === "SETTLE") {
      walletName = sourceWalletName; // Rút/Tất toán: về ví nguồn
    }
    
    return {
      id: tx.transactionId || tx.id,
      code: `FT-${String(tx.transactionId || tx.id).padStart(4, "0")}`,
      type,
      walletName,
      fundName,
      amount,
      currency,
      date: dateValue,
      category,
      note: tx.message || tx.note || "",
      creatorCode: `USR${String(tx.performedBy?.userId || fund.ownerId || 0).padStart(3, "0")}`,
      attachment: "",
      // Giao dịch quỹ không thể sửa/xóa
      isFundTransaction: true,
      // Thông tin bổ sung
      transactionType: txType,
      sourceWallet: sourceWalletName,
      targetWallet: targetWalletName,
    };
  }, []);

  // Helper function to check if a transfer is related to a fund
  const isTransferRelatedToFund = useCallback((transfer) => {
    if (!transfer || !funds || funds.length === 0) return false;
    
    const fromWalletId = transfer.fromWallet?.walletId || transfer.fromWallet?.id || transfer.sourceWalletId || null;
    const toWalletId = transfer.toWallet?.walletId || transfer.toWallet?.id || transfer.targetWalletId || null;
    
    if (!fromWalletId && !toWalletId) return false;
    
    // Check if either wallet is a source wallet or target wallet of any fund
    return funds.some(fund => {
      const fundSourceWalletId = fund.sourceWalletId || fund.sourceWallet?.walletId || fund.sourceWallet?.id || null;
      const fundTargetWalletId = fund.targetWalletId || fund.targetWallet?.walletId || fund.targetWallet?.id || fund.walletId || null;
      
      const fromWalletIdStr = fromWalletId ? String(fromWalletId) : null;
      const toWalletIdStr = toWalletId ? String(toWalletId) : null;
      const fundSourceWalletIdStr = fundSourceWalletId ? String(fundSourceWalletId) : null;
      const fundTargetWalletIdStr = fundTargetWalletId ? String(fundTargetWalletId) : null;
      
      // Transfer is related to fund if fromWallet or toWallet matches sourceWallet or targetWallet
      return (fromWalletIdStr && (fromWalletIdStr === fundSourceWalletIdStr || fromWalletIdStr === fundTargetWalletIdStr)) ||
             (toWalletIdStr && (toWalletIdStr === fundSourceWalletIdStr || toWalletIdStr === fundTargetWalletIdStr));
    });
  }, [funds]);

  const refreshTransactionsData = useCallback(async () => {
    // Lấy walletIds từ walletsIds string
    const walletIds = walletsIds ? walletsIds.split(',').filter(Boolean) : [];

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

      // Lọc bỏ các giao dịch liên quan đến quỹ
      const allTransfers = Array.from(transferMap.values());
      const filteredTransfers = allTransfers.filter(transfer => !isTransferRelatedToFund(transfer));
      
      return {
        external: scopedTransactions.flat(),
        internal: filteredTransfers,
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
      // Luôn dùng fetchLegacyHistory để lấy TẤT CẢ transactions, kể cả của wallets đã bị soft delete
      // fetchScopedHistory chỉ query wallets trong walletIds (không bao gồm deleted wallets)
      const scoped = await fetchLegacyHistory();
      const filteredScopedExternal = scoped.external.filter(matchesCurrentUser);
      const filteredScopedInternal = scoped.internal.filter(matchesCurrentUser);
      // Lọc bỏ các giao dịch liên quan đến quỹ
      const filteredInternalWithoutFunds = filteredScopedInternal.filter(transfer => !isTransferRelatedToFund(transfer));
      const mappedExternal = filteredScopedExternal.map(mapTransactionToFrontend);
      const mappedInternal = filteredInternalWithoutFunds.map(mapTransferToFrontend);
      
      // Chỉ update state nếu dữ liệu thực sự thay đổi
      setExternalTransactions((prev) => {
        const prevIds = new Set(prev.map(t => t.id || t.transactionId || t.code));
        const newIds = new Set(mappedExternal.map(t => t.id || t.transactionId || t.code));
        if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
          // Kiểm tra xem có transaction nào thay đổi không (so sánh bằng amount, date, category, attachment)
          const hasChanged = mappedExternal.some(tx => {
            const prevTx = prev.find(p => (p.id || p.transactionId || p.code) === (tx.id || tx.transactionId || tx.code));
            if (!prevTx) return true;
            return prevTx.amount !== tx.amount || 
                   prevTx.date !== tx.date || 
                   prevTx.category !== tx.category ||
                   prevTx.attachment !== tx.attachment;
          });
          if (!hasChanged) {
            return prev; // Không thay đổi, giữ nguyên
          }
        }
        return mappedExternal;
      });
      
      setInternalTransactions((prev) => {
        const prevIds = new Set(prev.map(t => t.id || t.transferId || t.code));
        const newIds = new Set(mappedInternal.map(t => t.id || t.transferId || t.code));
        if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
          const hasChanged = mappedInternal.some(tx => {
            const prevTx = prev.find(p => (p.id || p.transferId || p.code) === (tx.id || tx.transferId || tx.code));
            if (!prevTx) return true;
            return prevTx.amount !== tx.amount || prevTx.date !== tx.date;
          });
          if (!hasChanged) {
            return prev; // Không thay đổi, giữ nguyên
          }
        }
        return mappedInternal;
      });
    } catch (scopedError) {
      console.warn("TransactionsPage: scoped history fetch failed, using legacy APIs", scopedError);
      const legacy = await fetchLegacyHistory();
      const filteredLegacyExternal = legacy.external.filter(matchesCurrentUser);
      const filteredLegacyInternal = legacy.internal.filter(matchesCurrentUser);
      // Lọc bỏ các giao dịch liên quan đến quỹ
      const filteredInternalWithoutFunds = filteredLegacyInternal.filter(transfer => !isTransferRelatedToFund(transfer));
      const mappedExternal = filteredLegacyExternal.map(mapTransactionToFrontend);
      const mappedInternal = filteredInternalWithoutFunds.map(mapTransferToFrontend);
      
      // Chỉ update state nếu dữ liệu thực sự thay đổi
      setExternalTransactions((prev) => {
        const prevIds = new Set(prev.map(t => t.id || t.transactionId || t.code));
        const newIds = new Set(mappedExternal.map(t => t.id || t.transactionId || t.code));
        if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
          const hasChanged = mappedExternal.some(tx => {
            const prevTx = prev.find(p => (p.id || p.transactionId || p.code) === (tx.id || tx.transactionId || tx.code));
            if (!prevTx) return true;
            return prevTx.amount !== tx.amount || 
                   prevTx.date !== tx.date || 
                   prevTx.category !== tx.category ||
                   prevTx.attachment !== tx.attachment;
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return mappedExternal;
      });
      
      setInternalTransactions((prev) => {
        const prevIds = new Set(prev.map(t => t.id || t.transferId || t.code));
        const newIds = new Set(mappedInternal.map(t => t.id || t.transferId || t.code));
        if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
          const hasChanged = mappedInternal.some(tx => {
            const prevTx = prev.find(p => (p.id || p.transferId || p.code) === (tx.id || tx.transferId || tx.code));
            if (!prevTx) return true;
            return prevTx.amount !== tx.amount || prevTx.date !== tx.date;
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return mappedInternal;
      });
    }
    
    // Lấy giao dịch quỹ
    try {
      if (funds && funds.length > 0) {
        const allFundTransactions = [];
        for (const fund of funds) {
          const fundId = fund.fundId || fund.id;
          if (!fundId) {
            console.warn("TransactionsPage: fund missing fundId", fund);
            continue;
          }
          
          // Đảm bảo fund có fundName
          const fundName = fund.fundName || fund.name;
          if (!fundName) {
            console.warn("TransactionsPage: fund missing fundName", { fundId, fund });
          }
          
          try {
            const result = await getFundTransactions(fundId, 200);
            if (result?.response?.ok && result?.data) {
              const list = Array.isArray(result.data)
                ? result.data
                : result.data.transactions || [];
              
              const mapped = list
                .map(tx => {
                  const mappedTx = mapFundTransactionToFrontend(tx, fund);
                  // Đảm bảo fundName được set
                  if (mappedTx && !mappedTx.fundName) {
                    mappedTx.fundName = fundName || "Unknown";
                  }
                  return mappedTx;
                })
                .filter(Boolean);
              
              allFundTransactions.push(...mapped);
            }
          } catch (err) {
            console.warn(`Failed to fetch transactions for fund ${fundId}:`, err);
          }
        }
        
        // Sắp xếp theo ngày giảm dần
        allFundTransactions.sort((a, b) => {
          const da = toDateObj(a.date)?.getTime() || 0;
          const db = toDateObj(b.date)?.getTime() || 0;
          return db - da;
        });
        
        setFundTransactions((prev) => {
          const prevIds = new Set(prev.map(t => t.id || t.code));
          const newIds = new Set(allFundTransactions.map(t => t.id || t.code));
          if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
            const hasChanged = allFundTransactions.some(tx => {
              const prevTx = prev.find(p => (p.id || p.code) === (tx.id || tx.code));
              if (!prevTx) return true;
              return prevTx.amount !== tx.amount || prevTx.date !== tx.date;
            });
            if (!hasChanged) {
              return prev;
            }
          }
          return allFundTransactions;
        });
      } else {
        setFundTransactions([]);
      }
    } catch (fundError) {
      console.warn("TransactionsPage: fund transactions fetch failed", fundError);
      setFundTransactions([]);
    }
  }, [walletsIds, mapTransactionToFrontend, mapTransferToFrontend, matchesCurrentUser, funds, mapFundTransactionToFrontend, isTransferRelatedToFund]);

  // Ref để track lần cuối cùng refresh
  const lastRefreshRef = useRef({ walletsIds: '', timestamp: 0 });
  const isRefreshingRef = useRef(false);

  const runInitialLoad = useCallback(async () => {
    // Tránh refresh nếu đang refresh hoặc wallets không thay đổi
    const currentWalletsIds = walletsIds;
    if (isRefreshingRef.current) {
      return;
    }
    
    // Chỉ refresh nếu wallets thực sự thay đổi hoặc chưa từng refresh
    if (lastRefreshRef.current.walletsIds === currentWalletsIds && lastRefreshRef.current.timestamp > 0) {
      return;
    }

    isRefreshingRef.current = true;
    setLoading(true);
    try {
      await refreshTransactionsData();
      lastRefreshRef.current = {
        walletsIds: currentWalletsIds,
        timestamp: Date.now()
      };
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [walletsIds, refreshTransactionsData]);

  useEffect(() => {
    runInitialLoad();

    const handleUserChange = () => {
      // Reset last refresh khi user thay đổi
      lastRefreshRef.current = { walletsIds: '', timestamp: 0 };
      runInitialLoad();
    };
    window.addEventListener("userChanged", handleUserChange);

    const handleStorageChange = (e) => {
      if (e.key === "accessToken" || e.key === "user" || e.key === "auth_user") {
        // Reset last refresh khi storage thay đổi
        lastRefreshRef.current = { walletsIds: '', timestamp: 0 };
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

  // Refresh fund transactions khi funds thay đổi
  useEffect(() => {
    if (funds && funds.length > 0) {
      refreshTransactionsData();
    }
  }, [funds, refreshTransactionsData]);

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
    // Reset expandedPanel khi chuyển sang tab FUND
    if (value === TABS.FUND) {
      setExpandedPanel(null);
    }
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

      // Force refresh bằng cách reset lastRefreshRef để đảm bảo refresh ngay lập tức
      lastRefreshRef.current = { walletsIds: '', timestamp: 0 };
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

  // Update budget data when transactions change - với debounce và so sánh dữ liệu
  const categoryMapRef = useRef({});
  const externalTransactionsRef = useRef([]);
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    // Clear timeout trước đó nếu có
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce để tránh update quá nhiều
    updateTimeoutRef.current = setTimeout(() => {
      // Build transaction map keyed by category:wallet and category:all
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

      // Chỉ update nếu categoryMap thực sự thay đổi
      const categoryMapStr = JSON.stringify(categoryMap);
      const prevCategoryMapStr = JSON.stringify(categoryMapRef.current);
      if (categoryMapStr !== prevCategoryMapStr) {
        categoryMapRef.current = categoryMap;
        updateTransactionsByCategory(categoryMap);
      }

      // Chỉ update external transactions list nếu thực sự thay đổi (so sánh bằng IDs)
      const currentIds = new Set(externalTransactions.map(t => t.id || t.transactionId || t.code));
      const prevIds = new Set(externalTransactionsRef.current.map(t => t.id || t.transactionId || t.code));
      if (currentIds.size !== prevIds.size || [...currentIds].some(id => !prevIds.has(id))) {
        externalTransactionsRef.current = externalTransactions;
        updateAllExternalTransactions(externalTransactions);
      }
    }, 200); // Debounce 200ms

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [externalTransactions, updateTransactionsByCategory, updateAllExternalTransactions]);

  const currentTransactions = useMemo(
    () => {
      if (activeTab === TABS.EXTERNAL) {
        return externalTransactions;
      } else if (activeTab === TABS.FUND) {
        return fundTransactions;
      } else {
        return internalTransactions;
      }
    },
    [activeTab, externalTransactions, internalTransactions, fundTransactions]
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
    } else if (activeTab === TABS.FUND) {
      const s = new Set();
      fundTransactions.forEach((t) => {
        if (t.fundName) s.add(t.fundName);
        if (t.walletName) s.add(t.walletName);
        if (t.sourceWallet) s.add(t.sourceWallet);
        if (t.targetWallet) s.add(t.targetWallet);
      });
      return Array.from(s);
    }
    const s = new Set();
    internalTransactions.forEach((t) => {
      if (t.sourceWallet) s.add(t.sourceWallet);
      if (t.targetWallet) s.add(t.targetWallet);
    });
    return Array.from(s);
  }, [activeTab, externalTransactions, internalTransactions, fundTransactions]);


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

      if (searchText) {
        const keyword = searchText.toLowerCase();
        let joined = "";
        if (activeTab === TABS.EXTERNAL) {
          joined = [
            t.code,
            t.walletName,
            t.category,
            t.note,
            t.amount?.toString(),
          ]
            .join(" ")
            .toLowerCase();
        } else if (activeTab === TABS.FUND) {
          joined = [
            t.code,
            t.fundName,
            t.walletName,
            t.sourceWallet,
            t.targetWallet,
            t.category,
            t.note,
            t.amount?.toString(),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        } else {
          joined = [
            t.code,
            t.sourceWallet,
            t.targetWallet,
            t.category,
            t.note,
            t.amount?.toString(),
          ]
            .join(" ")
            .toLowerCase();
        }
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
              className={`funds-tab ${activeTab === TABS.FUND ? "funds-tab--active" : ""}`}
              onClick={() => handleTabChange({ target: { value: TABS.FUND } })}
            >
              Giao dịch quỹ
            </button>
          </div>
        </div>

        <div className="wallet-header-right d-flex align-items-center justify-content-end gap-2">
          {/* Không cần nút toggle form nữa vì form luôn hiển thị */}
        </div>
      </div>

      <div className={`transactions-layout ${activeTab === TABS.FUND ? "transactions-layout--fund-only" : expandedPanel ? "transactions-layout--expanded" : "transactions-layout--with-history"}`}>
          {/* LEFT: Create Transaction Form - Ẩn khi ở tab FUND */}
          {activeTab !== TABS.FUND && (!expandedPanel || expandedPanel === "form") && (
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
          {(!expandedPanel || expandedPanel === "history" || activeTab === TABS.FUND) && (
            <div className={`transactions-history-panel ${activeTab === TABS.FUND ? "expanded" : expandedPanel === "history" ? "expanded" : ""}`}>
              <TransactionList
                transactions={filteredSorted}
                activeTab={activeTab}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                paginationRange={paginationRange}
                onPageChange={handlePageChange}
                onView={setViewing}
                onEdit={activeTab === TABS.FUND ? undefined : handleTransactionEditRequest}
                onDelete={activeTab === TABS.FUND ? undefined : handleTransactionDeleteRequest}
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
                expanded={activeTab === TABS.FUND ? true : expandedPanel === "history"}
                onToggleExpand={activeTab === TABS.FUND ? undefined : () => setExpandedPanel(expandedPanel === "history" ? null : "history")}
              />
            </div>
          )}
        </div>

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

