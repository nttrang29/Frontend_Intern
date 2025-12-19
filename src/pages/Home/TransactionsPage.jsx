import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
import { useNotifications } from "../../contexts/NotificationContext";
import { transactionAPI } from "../../services/transaction.service";
import { walletAPI } from "../../services/wallet.service";
import { scheduledTransactionAPI } from "../../services/scheduled-transaction.service";
import { getAllFunds, getFundTransactions } from "../../services/fund.service";
import { API_BASE_URL } from "../../services/api-client";
import { formatVietnamDateTime } from "../../utils/dateFormat";

// ===== REMOVED MOCK DATA - Now using API =====

const TABS = {
  EXTERNAL: "external",
  INTERNAL: "internal",
  GROUP_EXTERNAL: "group_external",
  FUND: "fund",
  SCHEDULE: "schedule",
};

// Schedule type labels for display
const SCHEDULE_TYPE_LABELS = {
  ONCE: "Một lần",
  ONE_TIME: "Một lần",
  DAILY: "Hằng ngày",
  WEEKLY: "Hằng tuần",
  MONTHLY: "Hằng tháng",
  YEARLY: "Hằng năm",
};

// Schedule status metadata
const SCHEDULE_STATUS_META = {
  PENDING: {
    label: "Chờ chạy",
    className: "schedule-status schedule-status--pending",
  },
  RUNNING: {
    label: "Đang chạy",
    className: "schedule-status schedule-status--running",
  },
  COMPLETED: {
    label: "Hoàn tất",
    className: "schedule-status schedule-status--success",
  },
  FAILED: {
    label: "Thất bại",
    className: "schedule-status schedule-status--failed",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "schedule-status schedule-status--muted",
  },
};

// Schedule filter tabs
const SCHEDULE_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ chạy" },
  { value: "active", label: "Đang hoạt động" },
  { value: "completed", label: "Hoàn tất" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

// Estimate total runs for a schedule
// startValue = nextExecutionDate (ngày tiếp theo)
// endValue = endDate (ngày kết thúc)
// completedCount = số lần đã hoàn thành
function estimateScheduleRuns(
  startValue,
  endValue,
  scheduleType,
  completedCount = 0
) {
  // ONE_TIME always runs exactly 1 time
  if (scheduleType === "ONCE" || scheduleType === "ONE_TIME") {
    return 1;
  }

  // No end date = unlimited runs, show ∞ symbol
  if (!endValue) return "∞";

  const start = new Date(startValue);
  const end = new Date(endValue);

  // If start date is invalid or after end date, no more runs
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return completedCount; // Only completed runs remain
  }

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let remainingRuns = 0;
  switch (scheduleType) {
    case "DAILY":
      remainingRuns = diffDays + 1; // Include both start and end days
      break;
    case "WEEKLY":
      remainingRuns = Math.floor(diffDays / 7) + 1;
      break;
    case "MONTHLY":
      // Calculate months between two dates more accurately
      const monthsDiff =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      remainingRuns = Math.max(1, monthsDiff + 1);
      break;
    case "YEARLY":
      const yearsDiff = end.getFullYear() - start.getFullYear();
      remainingRuns = Math.max(1, yearsDiff + 1);
      break;
    default:
      remainingRuns = 0;
  }

  // Total = completed + remaining
  return completedCount + remainingRuns;
}

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

const MEDIA_EXTENSION_PATTERN =
  /\.(png|jpe?g|gif|bmp|webp|svg|heic|heif|tiff?|pdf|jpeg)(?:$|[?#])/i;
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
  if (
    /^uploads/i.test(value) ||
    /^files/i.test(value) ||
    /^images/i.test(value)
  )
    return true;
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
    return trimmed.startsWith("/")
      ? trimmed
      : `/${trimmed}`.replace(/\/+/g, "/");
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
      const excludedKeys = [
        "user",
        "creator",
        "owner",
        "createdBy",
        "updatedBy",
        "performedBy",
        "executor",
        "actor",
        "avatar",
      ];

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
          const nested = scanObjectForHints(obj[key], depth + 1, [
            ...skipKeys,
            ...excludedKeys,
          ]);
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
  if (preferredKey && Array.isArray(payload[preferredKey]))
    return payload[preferredKey];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const getWalletRoleLabel = (wallet) => {
  if (!wallet) return "";
  return (
    (wallet.walletRole || wallet.sharedRole || wallet.role || "") + ""
  ).toUpperCase();
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
  const [groupExternalTransactions, setGroupExternalTransactions] = useState(
    []
  );
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
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [expandedPanel, setExpandedPanel] = useState(null); // "form" | "history" | null

  const [currentPage, setCurrentPage] = useState(1);

  const [scheduledTransactions, setScheduledTransactions] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Get shared data from contexts
  const {
    budgets,
    getSpentAmount,
    getSpentForBudget,
    updateTransactionsByCategory,
    updateAllExternalTransactions,
    refreshBudgets,
  } = useBudgetData();
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets, loadWallets, loading: walletsLoading } = useWalletData();
  const { loadNotifications, notifications: allNotifications } =
    useNotifications() || {};
  const { currentUser } = useAuth();
  const location = useLocation();
  const [appliedFocusParam, setAppliedFocusParam] = useState("");

  // Budget warning state
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  // Lưu danh sách walletIds mà user đã bị kick/rời ví
  // Khôi phục từ localStorage khi mount để persist qua F5
  const [leftWalletIds, setLeftWalletIds] = useState(() => {
    try {
      const saved = localStorage.getItem("leftWalletIds");
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error("Failed to load leftWalletIds from localStorage:", e);
    }
    return new Set();
  });

  // Lưu leftWalletIds vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      const idsArray = Array.from(leftWalletIds);
      if (idsArray.length > 0) {
        localStorage.setItem("leftWalletIds", JSON.stringify(idsArray));
      } else {
        localStorage.removeItem("leftWalletIds");
      }
    } catch (e) {
      console.error("Failed to save leftWalletIds to localStorage:", e);
    }
  }, [leftWalletIds]);

  // Ref để track leftWalletIds string để so sánh thay đổi
  const leftWalletIdsStrRef = useRef("");

  // Khôi phục leftWalletIds từ notifications khi component mount (khi F5)
  // Chạy khi notifications được load hoặc thay đổi
  useEffect(() => {
    if (!allNotifications || allNotifications.length === 0) {
      return;
    }

    // Tìm tất cả notifications WALLET_MEMBER_REMOVED hoặc WALLET_MEMBER_LEFT
    const memberLeftNotifs = allNotifications.filter(
      (n) =>
        n.type === "WALLET_MEMBER_REMOVED" || n.type === "WALLET_MEMBER_LEFT"
    );

    if (memberLeftNotifs.length > 0) {
      const removedWalletIds = new Set();
      memberLeftNotifs.forEach((n) => {
        const walletId = n.referenceId || n.walletId || n.reference_id;
        if (walletId) {
          removedWalletIds.add(String(walletId));
        }
      });

      if (removedWalletIds.size > 0) {
        setLeftWalletIds((prev) => {
          const newSet = new Set(prev);
          removedWalletIds.forEach((id) => newSet.add(id));
          return newSet;
        });
      }
    }
  }, [allNotifications]);

  // Cập nhật leftWalletIds khi wallets thay đổi (wallet bị xóa khỏi danh sách)
  // Tự động phát hiện wallet đã bị kick bằng cách kiểm tra wallets list và transactions
  // QUAN TRỌNG: Không xóa leftWalletIds nếu wallet không có trong wallets list
  // (vì có thể wallet đã bị kick nhưng transactions chưa được load)
  useEffect(() => {
    if (walletsLoading) {
      return;
    }

    // Nếu wallets chưa load xong, không làm gì
    if (!wallets || wallets.length === 0) {
      return;
    }

    // Lấy danh sách walletIds hiện tại (chỉ wallets không bị deleted)
    const currentWalletIds = new Set(
      wallets
        .filter((w) => !w.deleted && !w.isDeleted)
        .map((w) => String(w.id || w.walletId))
        .filter(Boolean)
    );

    // Tự động phát hiện wallet đã bị kick từ transactions (nếu đã load)
    const transactionWalletIds = new Set();

    // Từ external transactions
    if (externalTransactions && externalTransactions.length > 0) {
      externalTransactions.forEach((tx) => {
        if (tx.walletId) {
          transactionWalletIds.add(String(tx.walletId));
        }
      });
    }

    if (groupExternalTransactions && groupExternalTransactions.length > 0) {
      groupExternalTransactions.forEach((tx) => {
        if (tx.walletId) {
          transactionWalletIds.add(String(tx.walletId));
        }
      });
    }

    // Tìm các walletId có trong transactions nhưng không có trong wallets list
    const missingWalletIds = new Set();
    transactionWalletIds.forEach((walletId) => {
      if (!currentWalletIds.has(walletId)) {
        missingWalletIds.add(walletId);
      }
    });

    // Cập nhật leftWalletIds:
    // 1. QUAN TRỌNG: Giữ lại TẤT CẢ walletId đã có trong prev leftWalletIds (từ localStorage)
    //    Chỉ xóa nếu wallet thực sự quay lại trong wallets list
    // 2. Thêm những walletId mới phát hiện từ transactions (không có trong wallets list)
    setLeftWalletIds((prev) => {
      const newSet = new Set();

      // Giữ lại những walletId đã có trong prev
      // CHỈ xóa nếu wallet thực sự quay lại trong wallets list
      prev.forEach((walletId) => {
        // Nếu wallet không có trong wallets list, giữ nguyên (đã bị kick)
        // Nếu wallet có trong wallets list, xóa khỏi leftWalletIds (đã quay lại)
        if (!currentWalletIds.has(walletId)) {
          newSet.add(walletId);
        }
        // Nếu wallet đã quay lại, không thêm vào newSet (xóa khỏi leftWalletIds)
      });

      // Thêm những walletId mới phát hiện từ transactions
      missingWalletIds.forEach((walletId) => {
        // Chỉ thêm nếu chưa có trong newSet
        if (!newSet.has(walletId)) {
          newSet.add(walletId);
        }
      });

      return newSet;
    });
  }, [
    wallets,
    walletsLoading,
    externalTransactions,
    groupExternalTransactions,
  ]);

  // Memoize currentUser identifiers - chỉ thay đổi khi giá trị thực sự thay đổi
  const currentUserId =
    currentUser?.userId ||
    currentUser?.id ||
    currentUser?.accountId ||
    currentUser?.userID ||
    currentUser?.accountID ||
    null;
  const currentUserEmail = (
    currentUser?.email ||
    currentUser?.userEmail ||
    currentUser?.username ||
    currentUser?.login ||
    currentUser?.accountEmail ||
    ""
  )
    .trim()
    .toLowerCase();

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
          return nestedId === null || nestedId === undefined
            ? null
            : String(nestedId);
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
    setToast({
      open: true,
      message: t("transactions.error.viewer_wallet_restricted"),
      type: "error",
    });
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
    (wallets || []).forEach((w) => {
      const id = w.walletId || w.id;
      if (id) {
        map.set(id, w);
      }
    });
    return map;
  }, [wallets]);

  // Memoize wallets IDs string để so sánh thay đổi
  const walletsIds = useMemo(() => {
    return (wallets || [])
      .map((w) => w.walletId || w.id)
      .filter(Boolean)
      .sort()
      .join(",");
  }, [wallets]);

  // Helper function to map Transaction entity to frontend format
  const mapTransactionToFrontend = useCallback(
    (tx) => {
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
      let isWalletDeleted =
        tx.wallet?.deleted === true ||
        wallet?.deleted === true ||
        tx.wallet?.isDeleted === true ||
        wallet?.isDeleted === true;

      // Lấy walletType để phân biệt PERSONAL và GROUP
      // Ưu tiên lấy từ wallet trong walletsMap, sau đó từ tx.wallet
      let walletType = "";
      if (wallet) {
        walletType = (wallet.walletType || wallet.type || "")
          .toString()
          .toUpperCase();
      } else if (tx.wallet?.walletType) {
        walletType = String(tx.wallet.walletType).toUpperCase();
      }
      const isPersonalWallet = walletType !== "GROUP";

      // Nếu là ví cá nhân và không tìm thấy trong danh sách (và không phải đang loading), coi như đã xóa
      // Logic này giúp phát hiện ví cá nhân đã bị xóa nhưng chưa được đánh dấu deleted trong transaction
      const walletIdStr = walletId ? String(walletId) : null;
      const walletExistsInList =
        walletIdStr &&
        wallets.some(
          (w) =>
            String(w.id || w.walletId) === walletIdStr &&
            !w.deleted &&
            !w.isDeleted
        );

      if (
        !isWalletDeleted &&
        isPersonalWallet &&
        !wallet &&
        walletId &&
        !walletsLoading &&
        !walletExistsInList
      ) {
        isWalletDeleted = true;
      }

      // Thêm "(đã xóa)" vào tên ví nếu wallet đã bị soft delete
      if (isWalletDeleted) {
        walletName = `${walletName} (đã xóa)`;
      }

      // Đánh dấu giao dịch đã được chỉnh sửa (backend trả về isEdited)
      const isEdited =
        tx.isEdited === true ||
        tx.edited === true ||
        tx.is_updated === true ||
        tx.isUpdated === true;

      // Kiểm tra xem transaction có bị deleted không
      const isDeleted = tx.isDeleted === true || tx.deleted === true;

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
      const currentCurrency =
        tx.wallet?.currencyCode || tx.currencyCode || "VND";

      // Lấy ownerEmail từ wallet để hiển thị trong cột "Chủ ví" cho tab group_external
      // QUAN TRỌNG: Phải lấy từ nhiều nguồn để đảm bảo có thông tin ngay cả khi wallet đã rời hoặc bị xóa
      // Ưu tiên:
      // 1. wallet từ walletsMap (kể cả khi deleted - vì soft delete vẫn có trong list)
      // 2. tx.wallet từ transaction entity (luôn có ngay cả khi wallet đã rời/xóa)
      // 3. Tìm trong wallets list (kể cả deleted) nếu không có trong walletsMap
      // 4. tx.ownerEmail trực tiếp từ transaction entity (nếu có)
      let ownerEmail = "";

      // Ưu tiên 1: Lấy từ wallet trong walletsMap (kể cả khi deleted - soft delete vẫn có trong list)
      // Đây là nguồn đáng tin cậy nhất vì walletsMap được load từ API và có đầy đủ thông tin
      if (wallet) {
        ownerEmail = wallet.ownerEmail || wallet.ownerName || "";
      }

      // Ưu tiên 2: Nếu không có trong walletsMap, tìm trong wallets list (kể cả deleted)
      // Vì walletsMap chỉ chứa wallets không bị filter, nhưng wallets list có thể có deleted wallets
      if (!ownerEmail && walletId && wallets && wallets.length > 0) {
        const foundWallet = wallets.find(
          (w) => String(w.id || w.walletId) === String(walletId)
        );
        if (foundWallet) {
          ownerEmail = foundWallet.ownerEmail || foundWallet.ownerName || "";
        }
      }

      // Ưu tiên 3: Nếu không có, lấy từ tx.wallet (transaction entity luôn có thông tin này, kể cả khi soft deleted)
      if (!ownerEmail && tx.wallet) {
        // Thử nhiều cách lấy ownerEmail từ tx.wallet
        // Backend có thể trả về ownerEmail trực tiếp hoặc trong owner object
        // Kiểm tra tất cả các keys có thể có trong tx.wallet
        ownerEmail =
          tx.wallet.ownerEmail ||
          tx.wallet.owner?.email ||
          tx.wallet.owner?.userEmail ||
          tx.wallet.owner?.accountEmail ||
          tx.wallet.ownerName ||
          tx.wallet.ownerFullName ||
          tx.wallet.owner?.name ||
          tx.wallet.owner?.fullName ||
          "";

        // Nếu vẫn không có, thử scan tất cả các keys trong tx.wallet để tìm email
        if (!ownerEmail) {
          const txWalletKeys = Object.keys(tx.wallet || {});
          for (const key of txWalletKeys) {
            const value = tx.wallet[key];
            if (typeof value === "string" && value.includes("@")) {
              ownerEmail = value;
              break;
            }
            if (typeof value === "object" && value !== null) {
              // Scan nested object
              const nestedKeys = Object.keys(value);
              for (const nestedKey of nestedKeys) {
                const nestedValue = value[nestedKey];
                if (
                  typeof nestedValue === "string" &&
                  nestedValue.includes("@")
                ) {
                  ownerEmail = nestedValue;
                  break;
                }
              }
              if (ownerEmail) break;
            }
          }
        }
      }

      // Ưu tiên 4: Nếu vẫn không có, thử lấy trực tiếp từ transaction entity
      if (!ownerEmail) {
        ownerEmail =
          tx.ownerEmail ||
          tx.owner?.email ||
          tx.owner?.userEmail ||
          tx.ownerName ||
          tx.ownerFullName ||
          "";
      }

      // Kiểm tra xem user đã rời ví chưa
      // CHỈ đánh dấu "đã rời ví" nếu:
      // 1. WalletId có trong leftWalletIds (đã bị kick/rời ví - từ notification) - luôn đúng
      // 2. HOẶC wallets đã được load xong VÀ wallet không tìm thấy trong walletsMap VÀ không phải deleted
      // (Tránh false positive khi wallets chưa load xong sau khi F5)
      // Lưu ý: Kiểm tra cả wallets list để đảm bảo wallet thực sự không còn trong danh sách
      const isLeftWallet =
        (walletIdStr && leftWalletIds.has(walletIdStr)) ||
        (!walletsLoading &&
          !wallet &&
          walletId &&
          !isWalletDeleted &&
          !walletExistsInList);

      // Kiểm tra xem wallet có phải là VIEWER không
      // Nếu wallet không có trong walletsMap (đã rời ví), không thể kiểm tra role
      // Nếu wallet có trong walletsMap, kiểm tra role
      const isViewerWallet = wallet ? isViewerOnlyWallet(wallet) : false;

      // Thêm "(đã rời ví)" vào tên ví nếu user đã rời ví
      // Lưu ý:
      // - Nếu được mời lại với role VIEWER, vẫn không hiện "(đã rời ví)" nhưng vẫn ẩn hành động
      // - Nếu ví đã bị xóa (bất kể PERSONAL hay GROUP), chỉ hiển thị "(đã xóa)", KHÔNG hiển thị "(đã rời ví)"
      let displayWalletName = walletName;
      if (isLeftWallet) {
        // Nếu ví đã bị xóa, không thêm "(đã rời ví)" nữa (tránh chuỗi "(đã xóa)(đã rời ví)")
        if (isWalletDeleted) {
          // Đã có "(đã xóa)" rồi, không thêm gì nữa
          displayWalletName = walletName;
        } else {
          displayWalletName = `${walletName} (đã rời ví)`;
        }
      }

      return {
        id: tx.transactionId,
        code: `TX-${String(tx.transactionId).padStart(4, "0")}`,
        type,
        walletId: walletId ? Number(walletId) : null, // Thêm walletId để so sánh chính xác trong budget
        walletName: displayWalletName,
        ownerEmail: ownerEmail || "", // Thêm ownerEmail để hiển thị trong cột "Chủ ví" và modal chi tiết
        amount: displayAmount,
        currency: currentCurrency,
        date: dateValue,
        category: categoryName,
        note: tx.note || "",
        creatorCode: `USR${String(tx.user?.userId || 0).padStart(3, "0")}`,
        attachment: resolveAttachmentFromTransaction(tx),
        // Lưu thông tin gốc để hiển thị nếu cần
        originalAmount: tx.originalAmount
          ? parseFloat(tx.originalAmount)
          : null,
        originalCurrency: tx.originalCurrency || null,
        exchangeRate: tx.exchangeRate ? parseFloat(tx.exchangeRate) : null,
        // Lưu trạng thái deleted của wallet để ẩn nút sửa/xóa
        isWalletDeleted: isWalletDeleted,
        // Lưu trạng thái đã rời ví để ẩn nút sửa/xóa
        isLeftWallet: isLeftWallet,
        // Lưu trạng thái viewer wallet để ẩn nút sửa/xóa (ngay cả khi không còn trong leftWalletIds)
        isViewerWallet: isViewerWallet,
        // Đánh dấu giao dịch đã được chỉnh sửa (backend trả về isEdited)
        isEdited: isEdited,
        // Đánh dấu giao dịch đã bị xóa
        isDeleted: isDeleted,
      };
    },
    [walletsMap, leftWalletIds, walletsLoading, wallets]
  );

  const mapTransferToFrontend = useCallback(
    (transfer) => {
      if (!transfer) return null;
      // Cải thiện việc lấy ID ví để đảm bảo không bị undefined
      const fromWalletId =
        transfer.fromWallet?.walletId ||
        transfer.fromWallet?.id ||
        transfer.fromWalletId ||
        transfer.sourceWalletId;
      const toWalletId =
        transfer.toWallet?.walletId ||
        transfer.toWallet?.id ||
        transfer.toWalletId ||
        transfer.targetWalletId;

      const fromWallet = fromWalletId ? walletsMap.get(fromWalletId) : null;
      const toWallet = toWalletId ? walletsMap.get(toWalletId) : null;

      // Lấy walletType để phân biệt PERSONAL và GROUP cho cả sourceWallet và targetWallet
      // Ưu tiên lấy từ wallet trong walletsMap, sau đó từ transfer.fromWallet/toWallet
      let fromWalletType = "";
      if (fromWallet) {
        fromWalletType = (fromWallet.walletType || fromWallet.type || "")
          .toString()
          .toUpperCase();
      } else if (transfer.fromWallet?.walletType) {
        fromWalletType = String(transfer.fromWallet.walletType).toUpperCase();
      }
      const isFromPersonalWallet = fromWalletType !== "GROUP";

      let toWalletType = "";
      if (toWallet) {
        toWalletType = (toWallet.walletType || toWallet.type || "")
          .toString()
          .toUpperCase();
      } else if (transfer.toWallet?.walletType) {
        toWalletType = String(transfer.toWallet.walletType).toUpperCase();
      }
      const isToPersonalWallet = toWalletType !== "GROUP";

      // Kiểm tra xem wallet có tồn tại trong wallets list không
      const fromWalletIdStr = fromWalletId ? String(fromWalletId) : null;
      const toWalletIdStr = toWalletId ? String(toWalletId) : null;

      const fromWalletExistsInList =
        fromWalletIdStr &&
        wallets.some(
          (w) =>
            String(w.id || w.walletId) === fromWalletIdStr &&
            !w.deleted &&
            !w.isDeleted
        );
      const toWalletExistsInList =
        toWalletIdStr &&
        wallets.some(
          (w) =>
            String(w.id || w.walletId) === toWalletIdStr &&
            !w.deleted &&
            !w.isDeleted
        );

      let sourceWalletName =
        fromWallet?.walletName ||
        fromWallet?.name ||
        transfer.fromWallet?.walletName ||
        transfer.fromWallet?.name ||
        "Unknown";

      // Kiểm tra xem fromWallet có bị deleted không
      let isFromWalletDeleted =
        transfer.fromWallet?.deleted === true ||
        transfer.fromWallet?.isDeleted === true ||
        transfer.fromWallet?.is_deleted === true ||
        fromWallet?.deleted === true ||
        fromWallet?.isDeleted === true;

      // Nếu là ví cá nhân và không tìm thấy trong danh sách (và không phải đang loading), coi như đã xóa
      if (!isFromWalletDeleted && !walletsLoading && fromWalletId) {
        // Nếu không tìm thấy trong danh sách active wallets, và không phải là "Left Wallet" (đã rời ví), thì coi như đã xóa
        // Logic này áp dụng cho cả Personal và Group wallets
        if (!fromWalletExistsInList) {
          // Kiểm tra xem có phải là "Left Wallet" không
          const isLeft = leftWalletIds.has(String(fromWalletId));
          if (!isLeft) {
            isFromWalletDeleted = true;
          }
        }
      }

      // Thêm "(đã xóa)" vào tên ví nếu wallet đã bị soft delete
      if (isFromWalletDeleted) {
        sourceWalletName = `${sourceWalletName} (đã xóa)`;
      }

      let targetWalletName =
        toWallet?.walletName ||
        toWallet?.name ||
        transfer.toWallet?.walletName ||
        transfer.toWallet?.name ||
        "Unknown";

      // Kiểm tra xem toWallet có bị deleted không
      let isToWalletDeleted =
        transfer.toWallet?.deleted === true ||
        transfer.toWallet?.isDeleted === true ||
        transfer.toWallet?.is_deleted === true ||
        toWallet?.deleted === true ||
        toWallet?.isDeleted === true;

      // Nếu là ví cá nhân và không tìm thấy trong danh sách (và không phải đang loading), coi như đã xóa
      if (!isToWalletDeleted && !walletsLoading && toWalletId) {
        // Nếu không tìm thấy trong danh sách active wallets, và không phải là "Left Wallet" (đã rời ví), thì coi như đã xóa
        // Logic này áp dụng cho cả Personal và Group wallets
        if (!toWalletExistsInList) {
          // Kiểm tra xem có phải là "Left Wallet" không
          const isLeft = leftWalletIds.has(String(toWalletId));
          if (!isLeft) {
            isToWalletDeleted = true;
          }
        }
      }

      // Thêm "(đã xóa)" vào tên ví nếu wallet đã bị soft delete
      if (isToWalletDeleted) {
        targetWalletName = `${targetWalletName} (đã xóa)`;
      }

      // Nếu một trong hai wallet bị deleted, đánh dấu transfer không thể sửa/xóa
      const isWalletDeleted = isFromWalletDeleted || isToWalletDeleted;

      // Lấy ownerEmail cho sourceWallet và targetWallet (tương tự như mapTransactionToFrontend)
      // Helper function để lấy ownerEmail từ wallet
      const getOwnerEmailFromWallet = (wallet, walletId, transferWallet) => {
        let ownerEmail = "";

        // Ưu tiên 1: Lấy từ wallet trong walletsMap
        if (wallet) {
          ownerEmail =
            wallet.ownerEmail ||
            wallet.ownerContact ||
            wallet.owner?.email ||
            wallet.ownerUser?.email ||
            wallet.ownerName ||
            "";
        }

        // Ưu tiên 2: Nếu không có trong walletsMap, tìm trong wallets list
        if (!ownerEmail && walletId && wallets && wallets.length > 0) {
          const foundWallet = wallets.find(
            (w) => String(w.id || w.walletId) === String(walletId)
          );
          if (foundWallet) {
            ownerEmail =
              foundWallet.ownerEmail ||
              foundWallet.ownerContact ||
              foundWallet.owner?.email ||
              foundWallet.ownerUser?.email ||
              foundWallet.ownerName ||
              "";
          }
        }

        // Ưu tiên 3: Lấy từ transferWallet (transfer entity luôn có thông tin này)
        if (!ownerEmail && transferWallet) {
          ownerEmail =
            transferWallet.ownerEmail ||
            transferWallet.owner?.email ||
            transferWallet.owner?.userEmail ||
            transferWallet.owner?.accountEmail ||
            transferWallet.ownerName ||
            transferWallet.ownerFullName ||
            transferWallet.owner?.name ||
            transferWallet.owner?.fullName ||
            "";

          // Nếu vẫn không có, thử scan tất cả các keys trong transferWallet
          if (!ownerEmail) {
            const walletKeys = Object.keys(transferWallet || {});
            for (const key of walletKeys) {
              const value = transferWallet[key];
              if (typeof value === "string" && value.includes("@")) {
                ownerEmail = value;
                break;
              }
              if (typeof value === "object" && value !== null) {
                const nestedKeys = Object.keys(value);
                for (const nestedKey of nestedKeys) {
                  const nestedValue = value[nestedKey];
                  if (
                    typeof nestedValue === "string" &&
                    nestedValue.includes("@")
                  ) {
                    ownerEmail = nestedValue;
                    break;
                  }
                }
                if (ownerEmail) break;
              }
            }
          }
        }

        return ownerEmail;
      };

      const sourceWalletOwnerEmail = getOwnerEmailFromWallet(
        fromWallet,
        fromWalletId,
        transfer.fromWallet
      );
      const targetWalletOwnerEmail = getOwnerEmailFromWallet(
        toWallet,
        toWalletId,
        transfer.toWallet
      );

      // Ưu tiên createdAt/created_at cho cột thời gian trong lịch sử giao dịch giữa các ví
      const rawDateValue =
        transfer.createdAt ||
        transfer.created_at ||
        transfer.transferDate ||
        transfer.transfer_date ||
        transfer.date ||
        new Date().toISOString();

      const dateValue = ensureIsoDateWithTimezone(rawDateValue);

      // Kiểm tra xem user đã rời ví chưa (logic tương tự mapTransactionToFrontend)
      // CHỈ đánh dấu "đã rời ví" nếu:
      // 1. WalletId có trong leftWalletIds (đã bị kick/rời ví - từ notification) - luôn đúng
      // 2. HOẶC wallets đã được load xong VÀ wallet không tìm thấy trong walletsMap VÀ không phải deleted
      const isFromWalletLeft =
        (fromWalletIdStr && leftWalletIds.has(fromWalletIdStr)) ||
        (!walletsLoading &&
          !fromWallet &&
          fromWalletId &&
          !isFromWalletDeleted &&
          !fromWalletExistsInList);
      const isToWalletLeft =
        (toWalletIdStr && leftWalletIds.has(toWalletIdStr)) ||
        (!walletsLoading &&
          !toWallet &&
          toWalletId &&
          !isToWalletDeleted &&
          !toWalletExistsInList);
      const isLeftWallet = isFromWalletLeft || isToWalletLeft;

      // Kiểm tra xem wallet có phải là VIEWER không
      // Nếu wallet không có trong walletsMap (đã rời ví), không thể kiểm tra role
      // Nếu wallet có trong walletsMap, kiểm tra role
      const isFromWalletViewer = fromWallet
        ? isViewerOnlyWallet(fromWallet)
        : false;
      const isToWalletViewer = toWallet ? isViewerOnlyWallet(toWallet) : false;
      const isViewerWallet = isFromWalletViewer || isToWalletViewer;

      // Thêm "(đã rời ví)" vào tên ví nếu user đã rời ví
      // Lưu ý:
      // - Nếu được mời lại với role VIEWER, vẫn không hiện "(đã rời ví)" nhưng vẫn ẩn hành động
      // - Với ví cá nhân (PERSONAL), nếu đã bị xóa thì chỉ hiển thị "(đã xóa)", không hiển thị "(đã rời ví)"
      // - Với ví nhóm (GROUP), nếu đã bị xóa thì chỉ hiển thị "(đã xóa)", không hiển thị "(đã rời ví)"
      let displaySourceWalletName = sourceWalletName;
      let displayTargetWalletName = targetWalletName;
      if (isFromWalletLeft) {
        // Với ví cá nhân hoặc ví nhóm, nếu đã bị xóa thì không thêm "(đã rời ví)" nữa
        if (isFromWalletDeleted) {
          // Đã có "(đã xóa)" rồi, không thêm gì nữa
          displaySourceWalletName = sourceWalletName;
        } else {
          displaySourceWalletName = `${sourceWalletName} (đã rời ví)`;
        }
      }
      if (isToWalletLeft) {
        // Với ví cá nhân hoặc ví nhóm, nếu đã bị xóa thì không thêm "(đã rời ví)" nữa
        if (isToWalletDeleted) {
          // Đã có "(đã xóa)" rồi, không thêm gì nữa
          displayTargetWalletName = targetWalletName;
        } else {
          displayTargetWalletName = `${targetWalletName} (đã rời ví)`;
        }
      }

      // Lấy role và walletType cho sourceWallet và targetWallet để lưu vào transaction object
      // (giữ lại thông tin ban đầu kể cả khi wallet đã bị xóa/rời)
      const sourceWalletRole = fromWallet
        ? (
            fromWallet.walletRole ||
            fromWallet.sharedRole ||
            fromWallet.role ||
            ""
          )
            .toString()
            .toUpperCase()
        : (
            transfer.fromWallet?.walletRole ||
            transfer.fromWallet?.sharedRole ||
            transfer.fromWallet?.role ||
            ""
          )
            .toString()
            .toUpperCase();

      const targetWalletRole = toWallet
        ? (toWallet.walletRole || toWallet.sharedRole || toWallet.role || "")
            .toString()
            .toUpperCase()
        : (
            transfer.toWallet?.walletRole ||
            transfer.toWallet?.sharedRole ||
            transfer.toWallet?.role ||
            ""
          )
            .toString()
            .toUpperCase();

      // Đánh dấu giao dịch đã được chỉnh sửa (backend trả về isEdited)
      const isEdited =
        transfer.isEdited === true ||
        transfer.edited === true ||
        transfer.is_updated === true ||
        transfer.isUpdated === true;

      // Kiểm tra xem transaction có bị deleted không
      const isDeleted =
        transfer.isDeleted === true ||
        transfer.deleted === true ||
        transfer.is_deleted === true ||
        transfer.is_delete === true;

      return {
        id: transfer.transferId,
        code: `TR-${String(transfer.transferId).padStart(4, "0")}`,
        type: "transfer",
        sourceWallet: displaySourceWalletName,
        targetWallet: displayTargetWalletName,
        sourceWalletId: fromWalletId ? Number(fromWalletId) : null, // Thêm sourceWalletId để filter
        targetWalletId: toWalletId ? Number(toWalletId) : null, // Thêm targetWalletId để filter
        sourceWalletOwnerEmail: sourceWalletOwnerEmail || "", // Thêm ownerEmail cho sourceWallet
        targetWalletOwnerEmail: targetWalletOwnerEmail || "", // Thêm ownerEmail cho targetWallet
        sourceWalletRole: sourceWalletRole || "", // Lưu role của sourceWallet
        targetWalletRole: targetWalletRole || "", // Lưu role của targetWallet
        amount: parseFloat(transfer.amount || 0),
        currency: transfer.currencyCode || "VND",
        date: dateValue,
        category: "Chuyển tiền giữa các ví",
        note: transfer.note || "",
        creatorCode: `USR${String(transfer.user?.userId || 0).padStart(
          3,
          "0"
        )}`,
        attachment: "",
        // Lưu raw transfer để có thể lấy walletType sau này
        rawTransfer: transfer,
        // Lưu trạng thái deleted của wallet để ẩn nút sửa/xóa
        isWalletDeleted: isWalletDeleted,
        // Lưu trạng thái đã rời ví để ẩn nút sửa/xóa
        isLeftWallet: isLeftWallet,
        // Lưu trạng thái viewer wallet để ẩn nút sửa/xóa (ngay cả khi không còn trong leftWalletIds)
        isViewerWallet: isViewerWallet,
        // Đánh dấu giao dịch đã được chỉnh sửa
        isEdited: isEdited,
        // Đánh dấu giao dịch đã bị xóa
        isDeleted: isDeleted,
        // Lưu trạng thái deleted của từng wallet để xử lý hiển thị
        isFromWalletDeleted: isFromWalletDeleted,
        isToWalletDeleted: isToWalletDeleted,
      };
    },
    [walletsMap, leftWalletIds, walletsLoading, wallets]
  );

  // Helper function to map Fund Transaction to frontend format
  const mapFundTransactionToFrontend = useCallback((fundTx, fund) => {
    if (!fundTx || !fund) return null;

    const fundId = fund.id || fund.fundId;
    const fundName = fund.name || fund.fundName || "Unknown Fund";
    
    // Lấy ví nguồn (source wallet) - làm giống y hệt mapTransactionToFrontend
    // Khai báo các biến ở scope lớn hơn để dùng trong return
    let sourceWalletId = null;
    let isWalletDeleted = false;
    
    // Lấy sourceWalletId (tương ứng walletId trong mapTransactionToFrontend)
    sourceWalletId = fundTx.sourceWalletId || 
                    fund.sourceWalletId || 
                    fundTx.sourceWallet?.walletId || 
                    fundTx.sourceWallet?.id ||
                    fund.sourceWallet?.walletId ||
                    fund.sourceWallet?.id ||
                    fundTx.fromWalletId ||
                    null;
    
    // Lấy sourceWallet từ walletsMap (giống mapTransactionToFrontend: wallet = walletsMap.get(walletId))
    // Lưu ý: wallets list từ WalletDataContext đã filter deleted wallets, nhưng walletsMap vẫn có thể chứa
    const sourceWallet = sourceWalletId ? walletsMap.get(sourceWalletId) : null;
    
    // Lấy tên ví nguồn (giống mapTransactionToFrontend: walletName từ wallet hoặc tx.wallet)
    // Ưu tiên từ sourceWallet (từ walletsMap), sau đó từ fundTx.sourceWallet hoặc fund.sourceWallet
    let sourceWalletName = 
        sourceWallet?.walletName ||
        sourceWallet?.name ||
        fundTx.sourceWallet?.walletName ||
        fundTx.sourceWallet?.name ||
        fund.sourceWallet?.walletName ||
        fund.sourceWallet?.name ||
        fund.sourceWalletName ||
        fundTx.sourceWalletName ||
        "Ví nguồn";
    
    // Kiểm tra xem wallet có bị deleted không
    // Vì FundTransactionResponse không có sourceWallet object, chỉ có sourceWalletId và sourceWalletName
    // Nên cách kiểm tra là: nếu có sourceWalletId nhưng không tìm thấy trong walletsMap,
    // thì có thể wallet đã bị xóa (vì wallets list đã filter deleted wallets)
    // Tuy nhiên, cũng cần kiểm tra từ fundTx.sourceWallet và fund.sourceWallet nếu có
    
    const sourceWalletFromTx = fundTx.sourceWallet || null;
    const sourceWalletFromFund = fund.sourceWallet || null;
    
    // Kiểm tra deleted từ sourceWallet object nếu có (từ transaction/fund entity)
    const deletedFromEntity =
      sourceWalletFromTx?.deleted === true ||
      sourceWalletFromFund?.deleted === true ||
      sourceWalletFromTx?.isDeleted === true ||
      sourceWalletFromFund?.isDeleted === true;
    
    // Nếu không có trong walletsMap nhưng có sourceWalletId, có thể wallet đã bị xóa
    // (vì wallets list đã filter deleted wallets)
    // Chỉ áp dụng logic này nếu sourceWalletName không phải là "Ví nguồn" (default)
    // để tránh false positive khi sourceWalletId không hợp lệ
    const notFoundInWalletsMap = sourceWalletId && !sourceWallet && sourceWalletName !== "Ví nguồn";
    
    isWalletDeleted = deletedFromEntity || notFoundInWalletsMap;
    
    // Thêm "(đã xóa)" vào tên ví nếu wallet đã bị soft delete
    if (isWalletDeleted && !sourceWalletName.includes("(đã xóa)")) {
      sourceWalletName = `${sourceWalletName} (đã xóa)`;
    }
    
    // Ví nguồn sẽ dùng cho walletName (để hiển thị trong cột Ví của bảng)
    let walletName = sourceWalletName;
    
    // Ví quỹ hiển thị dạng "{fundName} - Ví Quỹ" theo TransactionFund
    let targetWalletName = fundName 
                          ? `${fundName} - Ví Quỹ`
                          : (fund.targetWalletName || 
                             fund.targetWallet?.name ||
                             fund.targetWallet?.walletName ||
                             "Ví quỹ");

    // Xác định type: DEPOSIT/WITHDRAW -> income/expense
    // Theo logic trong TransactionFund:
    // - Nạp tiền vào quỹ (DEPOSIT) = Chi tiêu (tiền ra khỏi ví nguồn) = expense
    // - Rút tiền từ quỹ (WITHDRAW) = Thu nhập (tiền về ví nguồn) = income
    // - Tất toán quỹ (SETTLE) = Thu nhập (tiền về ví nguồn) = income
    const txType = fundTx.type?.toUpperCase() || "";
    const isDeposit = txType === "DEPOSIT" || txType === "AUTO_DEPOSIT" || txType === "AUTO_DEPOSIT_RECOVERY" || txType === "MANUAL_DEPOSIT";
    const isWithdraw = txType === "WITHDRAW" || txType === "AUTO_WITHDRAW";
    const isSettle = txType === "SETTLE";
    const type = isDeposit ? "expense" : (isWithdraw || isSettle) ? "income" : "expense"; // Nạp = chi tiêu, Rút/Tất toán = thu nhập

    // Format date
    const rawDateValue = fundTx.createdAt || fundTx.transactionDate || fundTx.date || new Date().toISOString();
    const dateValue = ensureIsoDateWithTimezone(rawDateValue);

    // Amount
    const displayAmount = parseFloat(fundTx.amount || 0);
    const currency = fundTx.currencyCode || fund.currency || "VND";

    // Category label dựa trên type - theo TransactionFund
    let categoryName = "Giao dịch quỹ";
    if (txType === "DEPOSIT" || txType === "MANUAL_DEPOSIT") {
      categoryName = "Nạp tiền vào quỹ";
    } else if (txType === "AUTO_DEPOSIT") {
      categoryName = "Nạp tiền tự động";
    } else if (txType === "AUTO_DEPOSIT_RECOVERY") {
      categoryName = "Nạp bù tự động";
    } else if (txType === "WITHDRAW" || txType === "AUTO_WITHDRAW") {
      categoryName = "Rút tiền từ quỹ";
    } else if (txType === "SETTLE") {
      categoryName = "Tất toán quỹ";
    }

    // Status
    const status = fundTx.status?.toUpperCase() || "SUCCESS";
    const isSuccess = status === "SUCCESS";

    // Ghi chú mặc định dựa trên loại giao dịch
    let defaultNote = "";
    if (txType === "DEPOSIT" || txType === "MANUAL_DEPOSIT") {
      defaultNote = `Nạp tiền vào quỹ ${fundName}`;
    } else if (txType === "AUTO_DEPOSIT") {
      defaultNote = `Nạp tự động vào quỹ ${fundName}`;
    } else if (txType === "AUTO_DEPOSIT_RECOVERY") {
      defaultNote = `Nạp bù tự động vào quỹ ${fundName}`;
    } else if (txType === "WITHDRAW" || txType === "AUTO_WITHDRAW") {
      defaultNote = `Rút tiền từ quỹ ${fundName}`;
    } else if (txType === "SETTLE") {
      defaultNote = `Tất toán quỹ ${fundName}`;
    } else {
      defaultNote = `Giao dịch quỹ ${fundName}`;
    }

    // Nếu trạng thái là FAILED, thêm thông tin thất bại vào ghi chú
    if (!isSuccess && status === "FAILED") {
      defaultNote += " (Thất bại)";
      // Nếu có error message từ API, thêm vào ghi chú
      if (fundTx.errorMessage || fundTx.error || fundTx.message) {
        defaultNote += `: ${fundTx.errorMessage || fundTx.error || fundTx.message}`;
      }
    }

    // Transaction ID (unique cho fund transactions)
    const transactionId = fundTx.transactionId || fundTx.id || `FTX-${fundId}-${Date.now()}`;

    // Lấy thông tin thời hạn từ fund
    const hasDeadline = fund.hasDeadline ?? fund.hasTerm ?? false;

    return {
      id: transactionId,
      code: `FTX-${String(fundId).padStart(3, "0")}-${String(transactionId).padStart(4, "0")}`,
      type,
      walletId: sourceWalletId ? Number(sourceWalletId) : null,
      walletName: walletName, // Ví nguồn (source wallet)
      fundId: fundId ? Number(fundId) : null,
      fundName: fundName,
      fundHasDeadline: hasDeadline,
      amount: displayAmount,
      currency: currency,
      date: dateValue,
      category: categoryName,
      note: fundTx.note || defaultNote,
      creatorCode: `FUND-${String(fundId).padStart(3, "0")}`,
      attachment: "",
      // Flags để đánh dấu đây là fund transaction
      isFundTransaction: true,
      transactionType: txType, // Thêm transactionType để hiển thị trong modal
      fundTransactionType: txType,
      fundTransactionStatus: status,
      // Thông tin ví nguồn và ví quỹ để hiển thị trong modal
      sourceWallet: sourceWalletName,
      targetWallet: targetWalletName,
      // Lưu raw data
      rawFundTx: fundTx,
      rawFund: fund,
      // Wallet states (fund transactions không thể edit/delete như wallet transactions)
      isWalletDeleted: isWalletDeleted,
      isLeftWallet: false,
      isViewerWallet: false,
    };
  }, [walletsMap, wallets]);

  const refreshTransactionsData = useCallback(async () => {
    // Lấy walletIds từ walletsIds string
    const walletIds = walletsIds ? walletsIds.split(",").filter(Boolean) : [];

    const fetchScopedHistory = async () => {
      if (!walletIds.length) {
        return { external: [], internal: [] };
      }
      if (
        !transactionAPI.getWalletTransactions ||
        !walletAPI.getWalletTransfers
      ) {
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

    const fetchFundTransactions = async () => {
      try {
        // Lấy tất cả funds của user
        const fundsResponse = await getAllFunds();
        // getAllFunds trả về { response: { ok, status }, data: { funds: [...], total } }
        let fundsList = [];
        if (fundsResponse?.response?.ok && fundsResponse?.data) {
          fundsList = Array.isArray(fundsResponse.data) 
            ? fundsResponse.data 
            : fundsResponse.data?.funds || [];
        } else if (Array.isArray(fundsResponse)) {
          fundsList = fundsResponse;
        } else if (fundsResponse?.funds) {
          fundsList = fundsResponse.funds;
        }
        
        if (!fundsList || fundsList.length === 0) {
          return { fundTransactions: [], fundWalletIds: new Set(), fundsList: [] };
        }

        // Tạo Set các targetWalletId (ví quỹ) để check transactions từ ví quỹ
        const fundWalletIds = new Set();
        fundsList.forEach(fund => {
          const targetWalletId = fund.targetWalletId || fund.walletId || fund.targetWallet?.walletId || fund.targetWallet?.id;
          if (targetWalletId) {
            fundWalletIds.add(String(targetWalletId));
          }
        });

        // Lấy transactions của từng fund (giới hạn 100 transactions mỗi fund)
        const fundTransactionsPromises = fundsList.map(async (fund) => {
          try {
            const fundId = fund.fundId || fund.id;
            if (!fundId) return [];
            
            const result = await getFundTransactions(fundId, 100);
            // getFundTransactions trả về { response: { ok, status }, data: { transactions: [...], total } }
            let transactions = [];
            if (result?.response?.ok && result?.data) {
              transactions = Array.isArray(result.data) 
                ? result.data 
                : result.data?.transactions || [];
            }
            
            // Map mỗi transaction với thông tin fund
            return transactions.map(tx => mapFundTransactionToFrontend(tx, fund)).filter(Boolean);
          } catch (error) {
            console.error(`Error fetching transactions for fund ${fund.fundId || fund.id}:`, error);
            return [];
          }
        });

        const allFundTransactions = await Promise.all(fundTransactionsPromises);
        return { 
          fundTransactions: allFundTransactions.flat(),
          fundWalletIds,
          fundsList 
        };
      } catch (error) {
        console.error("Error fetching fund transactions:", error);
        return { fundTransactions: [], fundWalletIds: new Set(), fundsList: [] };
      }
    };

    try {
      // Luôn dùng fetchLegacyHistory để lấy TẤT CẢ transactions, kể cả của wallets đã bị soft delete
      // fetchScopedHistory chỉ query wallets trong walletIds (không bao gồm deleted wallets)
      const [scoped, fundData] = await Promise.all([
        fetchLegacyHistory(),
        fetchFundTransactions(),
      ]);
      const { fundTransactions: fundTransactionsList, fundWalletIds, fundsList } = fundData;
      
      const filteredScopedExternal = scoped.external.filter(matchesCurrentUser);
      const filteredScopedInternal = scoped.internal.filter(matchesCurrentUser);
      // Map transactions và lưu raw transaction data để có thể lấy walletType sau này
      const mappedExternal = filteredScopedExternal
        .map((tx) => {
          const mapped = mapTransactionToFrontend(tx);
          if (mapped) {
            // Lưu raw transaction để có thể lấy walletType từ tx.wallet
            mapped.rawTx = tx;
          }
          return mapped;
        })
        .filter(Boolean);
      const mappedInternal = filteredScopedInternal.map(mapTransferToFrontend);

      // Phân chia transactions theo walletType
      // PERSONAL: walletType !== "GROUP" (bao gồm PERSONAL hoặc không có walletType)
      // GROUP: walletType === "GROUP"
      // Lưu ý: Lấy walletType từ raw transaction entity trước, fallback về wallets list
      // QUAN TRỌNG: Loại bỏ fund transactions khỏi personalExternal và groupExternal
      const personalExternal = mappedExternal.filter((tx) => {
        // Loại bỏ fund transactions - chúng chỉ hiển thị trong tab FUND
        if (tx.isFundTransaction) return false;
        if (!tx.walletName && !tx.walletId) return false;

        // Ưu tiên lấy walletType từ raw transaction entity
        let walletType = "";
        if (tx.rawTx?.wallet?.walletType) {
          walletType = String(tx.rawTx.wallet.walletType).toUpperCase();
        } else {
          // Fallback: tìm trong wallets list
          const wallet = wallets.find(
            (w) =>
              w.name === tx.walletName ||
              w.walletName === tx.walletName ||
              (w.id && tx.walletId && String(w.id) === String(tx.walletId)) ||
              (w.walletId &&
                tx.walletId &&
                String(w.walletId) === String(tx.walletId))
          );
          if (wallet) {
            walletType = (wallet.walletType || wallet.type || "")
              .toString()
              .toUpperCase();
          }
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        // Chỉ lấy PERSONAL (không phải GROUP)
        // Không bao gồm fund transactions (đã tách ra riêng)
        return walletType !== "GROUP";
      });
      const groupExternal = mappedExternal.filter((tx) => {
        // Loại bỏ fund transactions - chúng chỉ hiển thị trong tab FUND
        if (tx.isFundTransaction) return false;
        if (!tx.walletName && !tx.walletId) return false;

        // Ưu tiên lấy walletType từ raw transaction entity
        let walletType = "";
        if (tx.rawTx?.wallet?.walletType) {
          walletType = String(tx.rawTx.wallet.walletType).toUpperCase();
        } else {
          // Fallback: tìm trong wallets list
          const wallet = wallets.find(
            (w) =>
              w.name === tx.walletName ||
              w.walletName === tx.walletName ||
              (w.id && tx.walletId && String(w.id) === String(tx.walletId)) ||
              (w.walletId &&
                tx.walletId &&
                String(w.walletId) === String(tx.walletId))
          );
          if (wallet) {
            walletType = (wallet.walletType || wallet.type || "")
              .toString()
              .toUpperCase();
          }
        }

        // Chỉ lấy GROUP
        // Không bao gồm fund transactions (đã tách ra riêng)
        return walletType === "GROUP";
      });

      const personalInternal = mappedInternal.filter((tx) => {
        // Loại bỏ fund transactions - kiểm tra nếu targetWalletId là fund wallet
        const targetWalletId = tx.targetWalletId || tx.rawTransfer?.toWalletId || tx.rawTransfer?.toWallet?.walletId;
        if (targetWalletId && fundWalletIds.has(String(targetWalletId))) {
          return false; // Đây là fund transaction, loại bỏ khỏi internal
        }
        if (!tx.sourceWallet || !tx.targetWallet) return false;
        // Lấy tên ví từ transaction (đã được map, có thể có "(đã rời ví)" hoặc "(đã xóa)")
        const sourceWalletName = tx.sourceWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");
        const targetWalletName = tx.targetWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");

        // Tìm wallet trong wallets list (bao gồm cả deleted wallets)
        const sourceWallet = wallets.find(
          (w) =>
            w.name === sourceWalletName ||
            w.walletName === sourceWalletName ||
            (tx.sourceWalletId &&
              String(w.id || w.walletId) === String(tx.sourceWalletId))
        );
        const targetWallet = wallets.find(
          (w) =>
            w.name === targetWalletName ||
            w.walletName === targetWalletName ||
            (tx.targetWalletId &&
              String(w.id || w.walletId) === String(tx.targetWalletId))
        );

        // Nếu không tìm thấy wallet, vẫn hiển thị transaction (có thể wallet đã rời hoặc bị xóa)
        // Nhưng cần kiểm tra walletType từ raw transaction data nếu có
        let sourceType = "";
        let targetType = "";

        if (sourceWallet) {
          sourceType = (sourceWallet.walletType || sourceWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.fromWallet?.walletType) {
          sourceType = String(
            tx.rawTransfer.fromWallet.walletType
          ).toUpperCase();
        }

        if (targetWallet) {
          targetType = (targetWallet.walletType || targetWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.toWallet?.walletType) {
          targetType = String(tx.rawTransfer.toWallet.walletType).toUpperCase();
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        if (!sourceType) sourceType = "PERSONAL";
        if (!targetType) targetType = "PERSONAL";

        // PERSONAL với PERSONAL (cả 2 đều không phải GROUP)
        return sourceType !== "GROUP" && targetType !== "GROUP";
      });
      const groupInternal = mappedInternal.filter((tx) => {
        // Loại bỏ fund transactions - kiểm tra nếu targetWalletId là fund wallet
        const targetWalletId = tx.targetWalletId || tx.rawTransfer?.toWalletId || tx.rawTransfer?.toWallet?.walletId;
        if (targetWalletId && fundWalletIds.has(String(targetWalletId))) {
          return false; // Đây là fund transaction, loại bỏ khỏi internal
        }
        if (!tx.sourceWallet || !tx.targetWallet) return false;
        // Lấy tên ví từ transaction (đã được map, có thể có "(đã rời ví)" hoặc "(đã xóa)")
        const sourceWalletName = tx.sourceWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");
        const targetWalletName = tx.targetWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");

        // Tìm wallet trong wallets list (bao gồm cả deleted wallets)
        const sourceWallet = wallets.find(
          (w) =>
            w.name === sourceWalletName ||
            w.walletName === sourceWalletName ||
            (tx.sourceWalletId &&
              String(w.id || w.walletId) === String(tx.sourceWalletId))
        );
        const targetWallet = wallets.find(
          (w) =>
            w.name === targetWalletName ||
            w.walletName === targetWalletName ||
            (tx.targetWalletId &&
              String(w.id || w.walletId) === String(tx.targetWalletId))
        );

        // Nếu không tìm thấy wallet, vẫn hiển thị transaction (có thể wallet đã rời hoặc bị xóa)
        // Nhưng cần kiểm tra walletType từ raw transaction data nếu có
        let sourceType = "";
        let targetType = "";

        if (sourceWallet) {
          sourceType = (sourceWallet.walletType || sourceWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.fromWallet?.walletType) {
          sourceType = String(
            tx.rawTransfer.fromWallet.walletType
          ).toUpperCase();
        }

        if (targetWallet) {
          targetType = (targetWallet.walletType || targetWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.toWallet?.walletType) {
          targetType = String(tx.rawTransfer.toWallet.walletType).toUpperCase();
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        if (!sourceType) sourceType = "PERSONAL";
        if (!targetType) targetType = "PERSONAL";

        // GROUP với GROUP, hoặc PERSONAL với GROUP (ít nhất 1 ví là GROUP)
        return sourceType === "GROUP" || targetType === "GROUP";
      });

      // Chỉ update state nếu dữ liệu thực sự thay đổi
      // QUAN TRỌNG: Cũng kiểm tra isLeftWallet, isWalletDeleted và walletName để đảm bảo cập nhật khi trạng thái thay đổi
      setExternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          mappedExternal.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          // Kiểm tra xem có transaction nào thay đổi không (so sánh bằng amount, date, category, attachment, isLeftWallet, isWalletDeleted, walletName)
          const hasChanged = mappedExternal.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transactionId || p.code) ===
                (tx.id || tx.transactionId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.category !== tx.category ||
              prevTx.attachment !== tx.attachment ||
              prevTx.isLeftWallet !== tx.isLeftWallet ||
              prevTx.isWalletDeleted !== tx.isWalletDeleted ||
              prevTx.walletName !== tx.walletName ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited
            ); // walletName có thể thay đổi khi thêm "(đã rời ví)"
          });
          if (!hasChanged) {
            return prev; // Không thay đổi, giữ nguyên
          }
        }
        return personalExternal;
      });

      setGroupExternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          groupExternal.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          const hasChanged = groupExternal.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transactionId || p.code) ===
                (tx.id || tx.transactionId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.category !== tx.category ||
              prevTx.attachment !== tx.attachment ||
              prevTx.isLeftWallet !== tx.isLeftWallet ||
              prevTx.isWalletDeleted !== tx.isWalletDeleted ||
              prevTx.isViewerWallet !== tx.isViewerWallet ||
              prevTx.walletName !== tx.walletName ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited
            ); // walletName có thể thay đổi khi thêm "(đã rời ví)"
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return groupExternal;
      });

      // Gộp personalInternal và groupInternal thành internalTransactions
      const allInternal = [...personalInternal, ...groupInternal];
      setInternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transferId || t.code)
        );
        const newIds = new Set(
          allInternal.map((t) => t.id || t.transferId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          const hasChanged = allInternal.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transferId || p.code) ===
                (tx.id || tx.transferId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.isLeftWallet !== tx.isLeftWallet ||
              prevTx.isWalletDeleted !== tx.isWalletDeleted ||
              prevTx.isViewerWallet !== tx.isViewerWallet ||
              prevTx.sourceWallet !== tx.sourceWallet ||
              prevTx.targetWallet !== tx.targetWallet ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited
            ); // sourceWallet/targetWallet có thể thay đổi khi thêm "(đã rời ví)"
          });
          if (!hasChanged) {
            return prev; // Không thay đổi, giữ nguyên
          }
        }
        return allInternal;
      });

      // Set fund transactions state
      setFundTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          fundTransactionsList.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          return prev; // Không thay đổi, giữ nguyên
        }
        return fundTransactionsList;
      });
    } catch (scopedError) {
      console.warn(
        "TransactionsPage: scoped history fetch failed, using legacy APIs",
        scopedError
      );
      // Fetch fund transactions trong catch block để có fundWalletIds
      const fundData = await fetchFundTransactions();
      const { fundTransactions: legacyFundTransactionsList, fundWalletIds: legacyFundWalletIds } = fundData;
      const legacy = await fetchLegacyHistory();
      const filteredLegacyExternal = legacy.external.filter(matchesCurrentUser);
      const filteredLegacyInternal = legacy.internal.filter((tx) => {
        // Nếu transaction đã bị xóa, không cần check matchesCurrentUser
        // Vì deleted transactions có thể thiếu thông tin user
        if (
          tx.isDeleted === true ||
          tx.deleted === true ||
          tx.is_deleted === true ||
          tx.is_delete === true
        ) {
          return true;
        }
        return matchesCurrentUser(tx);
      });
      // Map transactions và lưu raw transaction data để có thể lấy walletType sau này
      const mappedExternal = filteredLegacyExternal
        .map((tx) => {
          const mapped = mapTransactionToFrontend(tx);
          if (mapped) {
            // Lưu raw transaction để có thể lấy walletType từ tx.wallet
            mapped.rawTx = tx;
          }
          return mapped;
        })
        .filter(Boolean);
      const mappedInternal = filteredLegacyInternal.map(mapTransferToFrontend);

      // Phân chia transactions theo walletType (legacy fallback)
      // Lưu ý: Lấy walletType từ raw transaction entity trước, fallback về wallets list
      // QUAN TRỌNG: Loại bỏ fund transactions khỏi personalExternalLegacy và groupExternalLegacy
      const personalExternalLegacy = mappedExternal.filter((tx) => {
        // Loại bỏ fund transactions - chúng chỉ hiển thị trong tab FUND
        if (tx.isFundTransaction) return false;
        if (!tx.walletName && !tx.walletId) return false;

        // Ưu tiên lấy walletType từ raw transaction entity
        let walletType = "";
        if (tx.rawTx?.wallet?.walletType) {
          walletType = String(tx.rawTx.wallet.walletType).toUpperCase();
        } else {
          // Fallback: tìm trong wallets list
          const wallet = wallets.find(
            (w) =>
              w.name === tx.walletName ||
              w.walletName === tx.walletName ||
              (w.id && tx.walletId && String(w.id) === String(tx.walletId)) ||
              (w.walletId &&
                tx.walletId &&
                String(w.walletId) === String(tx.walletId))
          );
          if (wallet) {
            walletType = (wallet.walletType || wallet.type || "")
              .toString()
              .toUpperCase();
          }
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        // Chỉ lấy PERSONAL (không phải GROUP)
        return walletType !== "GROUP";
      });
      const groupExternalLegacy = mappedExternal.filter((tx) => {
        // Loại bỏ fund transactions - chúng chỉ hiển thị trong tab FUND
        if (tx.isFundTransaction) return false;
        if (!tx.walletName && !tx.walletId) return false;

        // Ưu tiên lấy walletType từ raw transaction entity
        let walletType = "";
        if (tx.rawTx?.wallet?.walletType) {
          walletType = String(tx.rawTx.wallet.walletType).toUpperCase();
        } else {
          // Fallback: tìm trong wallets list
          const wallet = wallets.find(
            (w) =>
              w.name === tx.walletName ||
              w.walletName === tx.walletName ||
              (w.id && tx.walletId && String(w.id) === String(tx.walletId)) ||
              (w.walletId &&
                tx.walletId &&
                String(w.walletId) === String(tx.walletId))
          );
          if (wallet) {
            walletType = (wallet.walletType || wallet.type || "")
              .toString()
              .toUpperCase();
          }
        }

        // Chỉ lấy GROUP
        return walletType === "GROUP";
      });

      const personalInternalLegacy = mappedInternal.filter((tx) => {
        // Loại bỏ fund transactions - kiểm tra nếu targetWalletId là fund wallet
        const targetWalletId = tx.targetWalletId || tx.rawTransfer?.toWalletId || tx.rawTransfer?.toWallet?.walletId;
        if (targetWalletId && legacyFundWalletIds && legacyFundWalletIds.has(String(targetWalletId))) {
          return false; // Đây là fund transaction, loại bỏ khỏi internal
        }
        if (!tx.sourceWallet || !tx.targetWallet) return false;
        // Lấy tên ví từ transaction (đã được map, có thể có "(đã rời ví)" hoặc "(đã xóa)")
        const sourceWalletName = tx.sourceWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");
        const targetWalletName = tx.targetWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");

        // Tìm wallet trong wallets list (bao gồm cả deleted wallets)
        const sourceWallet = wallets.find(
          (w) =>
            w.name === sourceWalletName ||
            w.walletName === sourceWalletName ||
            (tx.sourceWalletId &&
              String(w.id || w.walletId) === String(tx.sourceWalletId))
        );
        const targetWallet = wallets.find(
          (w) =>
            w.name === targetWalletName ||
            w.walletName === targetWalletName ||
            (tx.targetWalletId &&
              String(w.id || w.walletId) === String(tx.targetWalletId))
        );

        // Nếu không tìm thấy wallet, vẫn hiển thị transaction (có thể wallet đã rời hoặc bị xóa)
        // Nhưng cần kiểm tra walletType từ raw transaction data nếu có
        let sourceType = "";
        let targetType = "";

        if (sourceWallet) {
          sourceType = (sourceWallet.walletType || sourceWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.fromWallet?.walletType) {
          sourceType = String(
            tx.rawTransfer.fromWallet.walletType
          ).toUpperCase();
        }

        if (targetWallet) {
          targetType = (targetWallet.walletType || targetWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.toWallet?.walletType) {
          targetType = String(tx.rawTransfer.toWallet.walletType).toUpperCase();
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        if (!sourceType) sourceType = "PERSONAL";
        if (!targetType) targetType = "PERSONAL";

        // PERSONAL với PERSONAL (cả 2 đều không phải GROUP)
        return sourceType !== "GROUP" && targetType !== "GROUP";
      });
      const groupInternalLegacy = mappedInternal.filter((tx) => {
        // Loại bỏ fund transactions - kiểm tra nếu targetWalletId là fund wallet
        const targetWalletId = tx.targetWalletId || tx.rawTransfer?.toWalletId || tx.rawTransfer?.toWallet?.walletId;
        if (targetWalletId && legacyFundWalletIds && legacyFundWalletIds.has(String(targetWalletId))) {
          return false; // Đây là fund transaction, loại bỏ khỏi internal
        }
        if (!tx.sourceWallet || !tx.targetWallet) return false;
        // Lấy tên ví từ transaction (đã được map, có thể có "(đã rời ví)" hoặc "(đã xóa)")
        const sourceWalletName = tx.sourceWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");
        const targetWalletName = tx.targetWallet
          .replace(/\s*\(đã rời ví\)\s*$/, "")
          .replace(/\s*\(đã xóa\)\s*$/, "");

        // Tìm wallet trong wallets list (bao gồm cả deleted wallets)
        const sourceWallet = wallets.find(
          (w) =>
            w.name === sourceWalletName ||
            w.walletName === sourceWalletName ||
            (tx.sourceWalletId &&
              String(w.id || w.walletId) === String(tx.sourceWalletId))
        );
        const targetWallet = wallets.find(
          (w) =>
            w.name === targetWalletName ||
            w.walletName === targetWalletName ||
            (tx.targetWalletId &&
              String(w.id || w.walletId) === String(tx.targetWalletId))
        );

        // Nếu không tìm thấy wallet, vẫn hiển thị transaction (có thể wallet đã rời hoặc bị xóa)
        // Nhưng cần kiểm tra walletType từ raw transaction data nếu có
        let sourceType = "";
        let targetType = "";

        if (sourceWallet) {
          sourceType = (sourceWallet.walletType || sourceWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.fromWallet?.walletType) {
          sourceType = String(
            tx.rawTransfer.fromWallet.walletType
          ).toUpperCase();
        }

        if (targetWallet) {
          targetType = (targetWallet.walletType || targetWallet.type || "")
            .toString()
            .toUpperCase();
        } else if (tx.rawTransfer?.toWallet?.walletType) {
          targetType = String(tx.rawTransfer.toWallet.walletType).toUpperCase();
        }

        // Nếu không có walletType, mặc định là PERSONAL (không phải GROUP)
        if (!sourceType) sourceType = "PERSONAL";
        if (!targetType) targetType = "PERSONAL";

        // GROUP với GROUP, hoặc PERSONAL với GROUP (ít nhất 1 ví là GROUP)
        return sourceType === "GROUP" || targetType === "GROUP";
      });

      // Chỉ update state nếu dữ liệu thực sự thay đổi
      setExternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          mappedExternal.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          const hasChanged = mappedExternal.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transactionId || p.code) ===
                (tx.id || tx.transactionId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.category !== tx.category ||
              prevTx.attachment !== tx.attachment ||
              prevTx.isLeftWallet !== tx.isLeftWallet ||
              prevTx.isWalletDeleted !== tx.isWalletDeleted ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited ||
              prevTx.isViewerWallet !== tx.isViewerWallet ||
              prevTx.walletName !== tx.walletName
            );
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return personalExternalLegacy;
      });

      setGroupExternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          groupExternalLegacy.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          const hasChanged = groupExternalLegacy.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transactionId || p.code) ===
                (tx.id || tx.transactionId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited ||
              prevTx.category !== tx.category ||
              prevTx.attachment !== tx.attachment
            );
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return groupExternalLegacy;
      });

      // Gộp personalInternalLegacy và groupInternalLegacy thành internalTransactions
      const allInternalLegacy = [
        ...personalInternalLegacy,
        ...groupInternalLegacy,
      ];
      setInternalTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transferId || t.code)
        );
        const newIds = new Set(
          allInternalLegacy.map((t) => t.id || t.transferId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          const hasChanged = allInternalLegacy.some((tx) => {
            const prevTx = prev.find(
              (p) =>
                (p.id || p.transferId || p.code) ===
                (tx.id || tx.transferId || tx.code)
            );
            if (!prevTx) return true;
            return (
              prevTx.amount !== tx.amount ||
              prevTx.date !== tx.date ||
              prevTx.isLeftWallet !== tx.isLeftWallet ||
              prevTx.isDeleted !== tx.isDeleted ||
              prevTx.isEdited !== tx.isEdited ||
              prevTx.isWalletDeleted !== tx.isWalletDeleted ||
              prevTx.isViewerWallet !== tx.isViewerWallet ||
              prevTx.sourceWallet !== tx.sourceWallet ||
              prevTx.targetWallet !== tx.targetWallet
            );
          });
          if (!hasChanged) {
            return prev;
          }
        }
        return allInternalLegacy;
      });

      // Set fund transactions trong legacy path
      setFundTransactions((prev) => {
        const prevIds = new Set(
          prev.map((t) => t.id || t.transactionId || t.code)
        );
        const newIds = new Set(
          legacyFundTransactionsList.map((t) => t.id || t.transactionId || t.code)
        );
        if (
          prevIds.size === newIds.size &&
          [...prevIds].every((id) => newIds.has(id))
        ) {
          return prev; // Không thay đổi, giữ nguyên
        }
        return legacyFundTransactionsList;
      });
    }
  }, [
    walletsIds,
    mapTransactionToFrontend,
    mapTransferToFrontend,
    matchesCurrentUser,
    wallets,
  ]);

  // Ref để track lần cuối cùng refresh
  const lastRefreshRef = useRef({ walletsIds: "", timestamp: 0 });
  const isRefreshingRef = useRef(false);

  const runInitialLoad = useCallback(async () => {
    // Tránh refresh nếu đang refresh hoặc wallets không thay đổi
    const currentWalletsIds = walletsIds;
    if (isRefreshingRef.current) {
      return;
    }

    // Chỉ refresh nếu wallets thực sự thay đổi hoặc chưa từng refresh
    if (
      lastRefreshRef.current.walletsIds === currentWalletsIds &&
      lastRefreshRef.current.timestamp > 0
    ) {
      return;
    }

    isRefreshingRef.current = true;
    setLoading(true);
    try {
      await refreshTransactionsData();
      lastRefreshRef.current = {
        walletsIds: currentWalletsIds,
        timestamp: Date.now(),
      };
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [walletsIds, refreshTransactionsData]);

  // Force refresh transactions khi leftWalletIds thay đổi
  // Phải đặt sau khi refreshTransactionsData được định nghĩa
  useEffect(() => {
    const currentStr = Array.from(leftWalletIds).sort().join(",");
    if (currentStr !== leftWalletIdsStrRef.current) {
      leftWalletIdsStrRef.current = currentStr;
      // Force refresh transactions trực tiếp, không qua runInitialLoad
      // Vì runInitialLoad có check walletsIds, mà walletsIds không thay đổi khi leftWalletIds thay đổi
      const forceRefresh = async () => {
        if (isRefreshingRef.current) {
          return;
        }
        isRefreshingRef.current = true;
        setLoading(true);
        try {
          // Gọi refreshTransactionsData trực tiếp để map lại transactions với leftWalletIds mới
          await refreshTransactionsData();
        } catch (error) {
          console.error(
            "Failed to refresh transactions after leftWalletIds changed:",
            error
          );
        } finally {
          setLoading(false);
          isRefreshingRef.current = false;
        }
      };

      forceRefresh();
    }
  }, [leftWalletIds, refreshTransactionsData]);

  useEffect(() => {
    runInitialLoad();

    const handleUserChange = () => {
      // Reset last refresh khi user thay đổi
      lastRefreshRef.current = { walletsIds: "", timestamp: 0 };
      runInitialLoad();
    };
    window.addEventListener("userChanged", handleUserChange);

    const handleStorageChange = (e) => {
      if (
        e.key === "accessToken" ||
        e.key === "user" ||
        e.key === "auth_user"
      ) {
        // Reset last refresh khi storage thay đổi
        lastRefreshRef.current = { walletsIds: "", timestamp: 0 };
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

    // Lắng nghe notification về việc bị kick/rời ví hoặc được mời lại
    const handleWalletMemberLeft = async (event) => {
      const { walletIds, notifications } = event.detail || {};

      if (!notifications || !Array.isArray(notifications)) {
        return;
      }

      // Kiểm tra xem có notification WALLET_MEMBER_REMOVED hoặc WALLET_MEMBER_LEFT không
      const memberLeftNotifs = notifications.filter(
        (n) =>
          n.type === "WALLET_MEMBER_REMOVED" || n.type === "WALLET_MEMBER_LEFT"
      );

      if (memberLeftNotifs.length > 0) {
        // Lưu walletIds vào state để đánh dấu là đã rời ví
        const removedWalletIds = new Set();
        memberLeftNotifs.forEach((n) => {
          const walletId = n.referenceId || n.walletId || n.reference_id;
          if (walletId) {
            removedWalletIds.add(String(walletId));
          }
        });

        if (removedWalletIds.size > 0) {
          // Cập nhật leftWalletIds state ngay lập tức
          setLeftWalletIds((prev) => {
            const newSet = new Set(prev);
            removedWalletIds.forEach((id) => newSet.add(id));
            return newSet;
          });

          // Force reload wallets và transactions ngay lập tức
          // Reset isRefreshingRef để đảm bảo refresh được thực hiện
          isRefreshingRef.current = false;

          // Force reload wallets trước
          if (loadWallets && typeof loadWallets === "function") {
            try {
              await loadWallets();
            } catch (error) {
              console.error(
                "Failed to reload wallets after member left:",
                error
              );
            }
          }

          // Reset last refresh để force reload transactions
          lastRefreshRef.current = { walletsIds: "", timestamp: 0 };

          // Force refresh transactions ngay lập tức, không đợi
          setLoading(true);
          try {
            await refreshTransactionsData();
          } catch (error) {
            console.error(
              "Failed to refresh transactions after member left:",
              error
            );
          } finally {
            setLoading(false);
            isRefreshingRef.current = false;
          }
        }
      }
    };
    window.addEventListener("walletMemberLeft", handleWalletMemberLeft);

    // Lắng nghe notification khi được mời lại vào ví HOẶC bị kick khỏi ví
    // QUAN TRỌNG: Lắng nghe cả walletNotificationReceived để bắt tất cả notifications
    const handleWalletNotification = async (event) => {
      const { notifications } = event.detail || {};

      if (!notifications || !Array.isArray(notifications)) {
        return;
      }

      // Kiểm tra xem có notification WALLET_MEMBER_REMOVED hoặc WALLET_MEMBER_LEFT không
      // (để xử lý trường hợp notification đã được đọc nhưng vẫn cần reload)
      const memberLeftNotifs = notifications.filter(
        (n) =>
          n.type === "WALLET_MEMBER_REMOVED" || n.type === "WALLET_MEMBER_LEFT"
      );

      if (memberLeftNotifs.length > 0) {
        // Lưu walletIds vào state để đánh dấu là đã rời ví
        const removedWalletIds = new Set();
        memberLeftNotifs.forEach((n) => {
          const walletId = n.referenceId || n.walletId || n.reference_id;
          if (walletId) {
            removedWalletIds.add(String(walletId));
          }
        });

        if (removedWalletIds.size > 0) {
          // Cập nhật leftWalletIds state ngay lập tức
          setLeftWalletIds((prev) => {
            const newSet = new Set(prev);
            removedWalletIds.forEach((id) => newSet.add(id));
            return newSet;
          });

          // Force reload wallets và transactions ngay lập tức
          isRefreshingRef.current = false;

          // Force reload wallets trước
          if (loadWallets && typeof loadWallets === "function") {
            try {
              await loadWallets();
            } catch (error) {
              console.error(
                "Failed to reload wallets after member left:",
                error
              );
            }
          }

          // Reset last refresh để force reload transactions
          lastRefreshRef.current = { walletsIds: "", timestamp: 0 };

          // Force refresh transactions ngay lập tức
          setLoading(true);
          try {
            await refreshTransactionsData();
          } catch (error) {
            console.error(
              "Failed to refresh transactions after member left:",
              error
            );
          } finally {
            setLoading(false);
            isRefreshingRef.current = false;
          }
        }
        return; // Đã xử lý, không cần xử lý WALLET_INVITED nữa
      }

      // Kiểm tra xem có notification WALLET_INVITED không
      const invitedNotifs = notifications.filter(
        (n) => n.type === "WALLET_INVITED"
      );

      if (invitedNotifs.length > 0) {
        // Xóa walletIds khỏi danh sách đã rời ví (vì được mời lại)
        const invitedWalletIds = new Set();
        invitedNotifs.forEach((n) => {
          const walletId = n.referenceId || n.walletId || n.reference_id;
          if (walletId) {
            invitedWalletIds.add(String(walletId));
          }
        });

        if (invitedWalletIds.size > 0) {
          setLeftWalletIds((prev) => {
            const newSet = new Set(prev);
            invitedWalletIds.forEach((id) => newSet.delete(id));
            return newSet;
          });

          // Force reload wallets và transactions để cập nhật isViewerWallet
          isRefreshingRef.current = false;

          // Force reload wallets trước
          if (loadWallets && typeof loadWallets === "function") {
            try {
              await loadWallets();
            } catch (error) {
              console.error("Failed to reload wallets after invited:", error);
            }
          }

          // Reset last refresh để force reload transactions
          lastRefreshRef.current = { walletsIds: "", timestamp: 0 };

          // Force refresh transactions ngay lập tức để cập nhật isViewerWallet
          setLoading(true);
          try {
            await refreshTransactionsData();
          } catch (error) {
            console.error(
              "Failed to refresh transactions after invited:",
              error
            );
          } finally {
            setLoading(false);
            isRefreshingRef.current = false;
          }
        }
      }
    };
    window.addEventListener(
      "walletNotificationReceived",
      handleWalletNotification
    );

    // Lắng nghe event khi wallets được reload để tự động refresh transactions
    const handleWalletsReloaded = () => {
      // Reset last refresh để force reload transactions
      lastRefreshRef.current = { walletsIds: "", timestamp: 0 };
      setTimeout(() => {
        runInitialLoad();
      }, 300);
    };
    window.addEventListener("walletsReloaded", handleWalletsReloaded);

    // Lắng nghe event khi role thay đổi để refresh transactions
    const handleWalletRoleUpdated = async (event) => {
      const { walletId } = event.detail || {};
      if (walletId) {
        // Reload wallets để cập nhật role
        if (loadWallets && typeof loadWallets === "function") {
          try {
            await loadWallets();
          } catch (error) {
            console.error("Failed to reload wallets after role update:", error);
          }
        }
        // Reset last refresh để force reload transactions
        lastRefreshRef.current = { walletsIds: "", timestamp: 0 };
        // Force refresh transactions để cập nhật isViewerWallet
        isRefreshingRef.current = false;
        setLoading(true);
        try {
          await refreshTransactionsData();
        } catch (error) {
          console.error(
            "Failed to refresh transactions after role update:",
            error
          );
        } finally {
          setLoading(false);
          isRefreshingRef.current = false;
        }
      }
    };
    window.addEventListener("walletRoleUpdated", handleWalletRoleUpdated);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletMerged", handleWalletMerged);
      window.removeEventListener("walletMemberLeft", handleWalletMemberLeft);
      window.removeEventListener(
        "walletNotificationReceived",
        handleWalletNotification
      );
      window.removeEventListener("walletsReloaded", handleWalletsReloaded);
      window.removeEventListener("walletRoleUpdated", handleWalletRoleUpdated);
    };
  }, [runInitialLoad, loadWallets, refreshTransactionsData]);

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
      (wallet) =>
        String(wallet.id) === normalizedFocus ||
        String(wallet.walletId) === normalizedFocus
    );

    if (walletById) {
      walletNameToApply =
        walletById.name || walletById.walletName || walletNameToApply;
    } else {
      const walletByName = wallets.find(
        (wallet) =>
          (wallet.name || wallet.walletName || "").toLowerCase() === focusLower
      );
      if (walletByName) {
        walletNameToApply =
          walletByName.name || walletByName.walletName || walletNameToApply;
      }
    }

    if (activeTab !== TABS.EXTERNAL && activeTab !== TABS.GROUP_EXTERNAL) {
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

  const evaluateBudgetWarning = useCallback(
    (payload, walletEntity) => {
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
        if ((budget.categoryType || "expense").toLowerCase() !== "expense")
          continue;
        const budgetCategory = normalizeBudgetCategoryKey(budget.categoryName);
        if (!budgetCategory || budgetCategory !== normalizedCategory) continue;
        if (!isTransactionWithinBudgetPeriod(budget, txDate)) continue;
        if (!doesBudgetMatchWallet(budget, walletEntity, payload.walletName))
          continue;

        const limit = Number(budget.limitAmount || budget.amountLimit || 0);
        const amount = Number(payload.amount || 0);
        if (!limit || !amount) continue;

        const spent = Number(getSpentForBudget(budget) || 0);
        const totalAfterTx = spent + amount;
        const warnPercent = Number(
          budget.alertPercentage ?? budget.warningThreshold ?? 80
        );
        const warningAmount = limit * (warnPercent / 100);
        const isExceeding = totalAfterTx > limit;
        const crossesWarning =
          !isExceeding &&
          spent < warningAmount &&
          totalAfterTx >= warningAmount;

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
    },
    [budgets, getSpentForBudget]
  );

  const handleCreate = async (payload, options = {}) => {
    const skipBudgetCheck = options.skipBudgetCheck === true;
    try {
      if (activeTab === TABS.EXTERNAL || activeTab === TABS.GROUP_EXTERNAL) {
        // Find walletId and categoryId
        // Ưu tiên tìm theo walletId (tránh nhầm khi có nhiều ví trùng tên)
        const wallet =
          (payload.walletId && findWalletById(payload.walletId)) ||
          findWalletByDisplayName(payload.walletName);
        if (!wallet) {
          setToast({
            open: true,
            message: t("transactions.error.wallet_not_found").replace(
              "{wallet}",
              payload.walletName
            ),
            type: "error",
          });
          return;
        }

        if (isViewerOnlyWallet(wallet)) {
          showViewerRestrictionToast();
          return;
        }

        // Tìm category trong đúng danh sách dựa trên loại giao dịch
        // Tránh tìm nhầm category cùng tên nhưng khác loại
        const categoryList =
          payload.type === "income"
            ? incomeCategories || []
            : expenseCategories || [];

        const category = categoryList.find(
          (c) =>
            c.name === payload.category ||
            c.categoryName === payload.category ||
            (c.name && c.name.trim() === payload.category?.trim()) ||
            (c.categoryName &&
              c.categoryName.trim() === payload.category?.trim())
        );

        if (!category) {
          setToast({
            open: true,
            message: `Không tìm thấy danh mục "${
              payload.category
            }" trong loại ${
              payload.type === "income" ? "thu nhập" : "chi tiêu"
            }.`,
            type: "error",
          });
          return;
        }

        const walletId = wallet.walletId || wallet.id;
        const categoryId = category.categoryId || category.id;

        if (!categoryId) {
          setToast({
            open: true,
            message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.",
            type: "error",
          });
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

        const transactionDate = payload.date
          ? new Date(payload.date).toISOString()
          : new Date().toISOString();

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
        // Với chuyển tiền, cũng ưu tiên dùng ID nếu có để tránh nhầm ví khi trùng tên
        const sourceWallet =
          (payload.sourceWalletId && findWalletById(payload.sourceWalletId)) ||
          findWalletByDisplayName(payload.sourceWallet);
        const targetWallet =
          (payload.targetWalletId && findWalletById(payload.targetWalletId)) ||
          findWalletByDisplayName(payload.targetWallet);

        if (!sourceWallet || !targetWallet) {
          setToast({
            open: true,
            message: t("transactions.error.wallet_not_found_pair"),
            type: "error",
          });
          return;
        }

        if (
          isViewerOnlyWallet(sourceWallet) ||
          isViewerOnlyWallet(targetWallet)
        ) {
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

      // Reload budgets để cập nhật spent amount sau khi tạo giao dịch chi tiêu
      if (refreshBudgets && typeof refreshBudgets === "function") {
        try {
          await refreshBudgets();
        } catch (e) {
          console.debug("Failed to reload budgets after transaction:", e);
        }
      }

      setCurrentPage(1);
    } catch (error) {
      console.error("Error creating transaction:", error);
      setToast({
        open: true,
        message:
          t("transactions.error.create_failed") +
          (error?.message ? `: ${error.message}` : ""),
        type: "error",
      });
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
      setToast({
        open: true,
        message: t("transactions.error.id_not_found"),
        type: "error",
      });
      return;
    }

    try {
      // Xử lý giao dịch chuyển tiền (transfer)
      if (editing.type === "transfer") {
        const sourceWalletEntity = findWalletByDisplayName(
          editing.sourceWallet || ""
        );
        const targetWalletEntity = findWalletByDisplayName(
          editing.targetWallet || ""
        );
        if (
          isViewerOnlyWallet(sourceWalletEntity) ||
          isViewerOnlyWallet(targetWalletEntity)
        ) {
          showViewerRestrictionToast();
          return;
        }

        const response = await walletAPI.updateTransfer(
          editing.id,
          payload.note || "",
          payload.amount,
          payload.date
        );

        await refreshTransactionsData();
        if (loadWallets) await loadWallets();

        setEditing(null);
        setToast({
          open: true,
          message: t("transactions.toast.update_success"),
          type: "success",
        });
        return;
      }

      // Xử lý giao dịch thu nhập/chi tiêu (external transactions)
      const editingWallet = findWalletByDisplayName(editing.walletName || "");
      if (isViewerOnlyWallet(editingWallet)) {
        showViewerRestrictionToast();
        return;
      }

      // Tìm categoryId từ category name
      const categoryList =
        editing.type === "income"
          ? incomeCategories || []
          : expenseCategories || [];

      const category = categoryList.find(
        (c) =>
          c.name === payload.category ||
          c.categoryName === payload.category ||
          (c.name && c.name.trim() === payload.category?.trim()) ||
          (c.categoryName && c.categoryName.trim() === payload.category?.trim())
      );

      if (!category) {
        setToast({
          open: true,
          message: `Không tìm thấy danh mục "${payload.category}" trong loại ${
            editing.type === "income" ? "thu nhập" : "chi tiêu"
          }.`,
          type: "error",
        });
        return;
      }

      const categoryId = category.categoryId || category.id;
      if (!categoryId) {
        setToast({
          open: true,
          message: "Không tìm thấy ID của danh mục. Vui lòng thử lại.",
          type: "error",
        });
        return;
      }

      // Gọi API update
      const response = await transactionAPI.updateTransaction(
        editing.id,
        categoryId,
        payload.amount, // số tiền mới
        payload.note || "",
        payload.attachment || null
      );

      // Force refresh bằng cách reset lastRefreshRef để đảm bảo refresh ngay lập tức
      lastRefreshRef.current = { walletsIds: "", timestamp: 0 };
      await refreshTransactionsData();
      if (loadWallets) await loadWallets();

      setEditing(null);
      setToast({
        open: true,
        message: t("transactions.toast.update_success"),
        type: "success",
      });
    } catch (error) {
      console.error("Error updating transaction/transfer:", error);
      const errorMessage = error.message || "Lỗi không xác định";
      if (editing.type === "transfer") {
        setToast({
          open: true,
          message: t("transactions.error.update_failed") + ": " + errorMessage,
          type: "error",
        });
      } else {
        setToast({
          open: true,
          message: t("transactions.error.update_failed") + ": " + errorMessage,
          type: "error",
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;

    const item = confirmDel;

    if (item.type === "transfer") {
      const sourceWalletEntity = findWalletByDisplayName(
        item.sourceWallet || ""
      );
      const targetWalletEntity = findWalletByDisplayName(
        item.targetWallet || ""
      );
      if (
        isViewerOnlyWallet(sourceWalletEntity) ||
        isViewerOnlyWallet(targetWalletEntity)
      ) {
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

        setToast({
          open: true,
          message: t("transactions.toast.delete_success"),
          type: "success",
        });
        return;
      }

      // Xử lý xóa giao dịch thu nhập/chi tiêu
      // Gọi API xóa
      await transactionAPI.deleteTransaction(item.id);

      // Force refresh bằng cách reset lastRefreshRef để đảm bảo refresh ngay lập tức
      lastRefreshRef.current = { walletsIds: "", timestamp: 0 };

      // Reload wallets để cập nhật số dư
      await loadWallets();
      await refreshTransactionsData();

      setToast({
        open: true,
        message: t("transactions.toast.delete_success"),
        type: "success",
      });
    } catch (error) {
      console.error("Error deleting transaction/transfer:", error);
      // Kiểm tra nếu lỗi là về ví âm tiền
      const errorMessage = error.message || "Lỗi không xác định";
      if (
        errorMessage.includes(
          "Không thể xóa giao dịch vì ví không được âm tiền"
        ) ||
        errorMessage.includes("ví không được âm tiền") ||
        errorMessage.includes("ví âm tiền") ||
        errorMessage.includes("âm tiền")
      ) {
        setToast({
          open: true,
          message: t("transactions.error.delete_wallet_negative"),
          type: "error",
        });
      } else {
        if (item.type === "transfer") {
          setToast({
            open: true,
            message:
              t("transactions.error.delete_failed") + ": " + errorMessage,
            type: "error",
          });
        } else {
          setToast({
            open: true,
            message:
              t("transactions.error.delete_failed") + ": " + errorMessage,
            type: "error",
          });
        }
      }
    }
  };

  const handleTransactionEditRequest = useCallback(
    (tx) => {
      if (!tx) return;

      if (tx.type === "transfer") {
        const sourceWalletEntity = findWalletByDisplayName(
          tx.sourceWallet || ""
        );
        const targetWalletEntity = findWalletByDisplayName(
          tx.targetWallet || ""
        );
        if (
          isViewerOnlyWallet(sourceWalletEntity) ||
          isViewerOnlyWallet(targetWalletEntity)
        ) {
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
        const sourceWalletEntity = findWalletByDisplayName(
          tx.sourceWallet || ""
        );
        const targetWalletEntity = findWalletByDisplayName(
          tx.targetWallet || ""
        );
        if (
          isViewerOnlyWallet(sourceWalletEntity) ||
          isViewerOnlyWallet(targetWalletEntity)
        ) {
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
      // Bao gồm cả PERSONAL và GROUP external transactions
      const categoryMap = {};
      const categoryAllTotals = {}; // Temp to sum by category

      const allExternalTx = [
        ...externalTransactions,
        ...groupExternalTransactions,
      ];
      allExternalTx.forEach((t) => {
        if (t.type === "expense" && t.category && t.walletName) {
          // Add to specific wallet key
          const walletKey = `${t.category}:${t.walletName}`;
          categoryMap[walletKey] = (categoryMap[walletKey] || 0) + t.amount;

          // Track total for category:all calculation
          categoryAllTotals[t.category] =
            (categoryAllTotals[t.category] || 0) + t.amount;
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
      // Cập nhật cho cả PERSONAL và GROUP external transactions
      const allExternalTransactions = [
        ...externalTransactions,
        ...groupExternalTransactions,
      ];
      const currentIds = new Set(
        allExternalTransactions.map((t) => t.id || t.transactionId || t.code)
      );
      const prevIds = new Set(
        externalTransactionsRef.current.map(
          (t) => t.id || t.transactionId || t.code
        )
      );
      if (
        currentIds.size !== prevIds.size ||
        [...currentIds].some((id) => !prevIds.has(id))
      ) {
        externalTransactionsRef.current = allExternalTransactions;
        updateAllExternalTransactions(allExternalTransactions);
      }
    }, 200); // Debounce 200ms

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    externalTransactions,
    groupExternalTransactions,
    updateTransactionsByCategory,
    updateAllExternalTransactions,
  ]);

  const currentTransactions = useMemo(() => {
    if (activeTab === TABS.EXTERNAL) {
      return externalTransactions;
    } else if (activeTab === TABS.INTERNAL) {
      return internalTransactions; // Đã bao gồm cả personalInternal và groupInternal
    } else if (activeTab === TABS.GROUP_EXTERNAL) {
      return groupExternalTransactions;
    } else if (activeTab === TABS.FUND) {
      return fundTransactions;
    }
    return [];
  }, [
    activeTab,
    externalTransactions,
    internalTransactions,
    groupExternalTransactions,
    fundTransactions,
  ]);

  const allCategories = useMemo(() => {
    const s = new Set(
      currentTransactions.map((t) => t.category).filter(Boolean)
    );
    return Array.from(s);
  }, [currentTransactions]);

  const allWallets = useMemo(() => {
    if (activeTab === TABS.EXTERNAL || activeTab === TABS.GROUP_EXTERNAL || activeTab === TABS.FUND) {
      const s = new Set(
        currentTransactions.map((t) => t.walletName).filter(Boolean)
      );
      return Array.from(s);
    }
    const s = new Set();
    currentTransactions.forEach((t) => {
      if (t.sourceWallet) s.add(t.sourceWallet);
      if (t.targetWallet) s.add(t.targetWallet);
    });
    return Array.from(s);
  }, [activeTab, currentTransactions]);

  const scheduleCounts = useMemo(() => {
    const counts = {
      all: scheduledTransactions.length,
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    scheduledTransactions.forEach((item) => {
      const status = String(item.status).toUpperCase();
      const hasRuns = (item.successRuns || 0) > 0;

      if (status === "COMPLETED") {
        counts.completed += 1;
      } else if (status === "FAILED") {
        counts.failed += 1;
      } else if (status === "CANCELLED") {
        counts.cancelled += 1;
      } else if (status === "PENDING" || status === "RUNNING") {
        // Đang hoạt động = đã chạy ít nhất 1 lần nhưng chưa hoàn tất
        if (hasRuns) {
          counts.active += 1;
        } else {
          counts.pending += 1;
        }
      }
    });
    return counts;
  }, [scheduledTransactions]);

  const filteredSchedules = useMemo(() => {
    return scheduledTransactions.filter((item) => {
      const status = String(item.status).toUpperCase();
      const hasRuns = (item.successRuns || 0) > 0;
      const isPendingOrRunning = status === "PENDING" || status === "RUNNING";

      if (scheduleFilter === "pending") {
        // Chờ chạy = chưa có lần chạy nào thành công
        return isPendingOrRunning && !hasRuns;
      }
      if (scheduleFilter === "active") {
        // Đang hoạt động = đã chạy ít nhất 1 lần nhưng chưa hoàn tất
        return isPendingOrRunning && hasRuns;
      }
      if (scheduleFilter === "completed") {
        return status === "COMPLETED";
      }
      if (scheduleFilter === "failed") {
        return status === "FAILED";
      }
      if (scheduleFilter === "cancelled") {
        return status === "CANCELLED";
      }
      return true; // all
    });
  }, [scheduledTransactions, scheduleFilter]);

  const isScheduleView = activeTab === TABS.SCHEDULE;

  const filteredSorted = useMemo(() => {
    let list = currentTransactions.slice();

    list = list.filter((t) => {
      // Filter theo loại giao dịch (chỉ áp dụng cho external transactions và fund transactions)
      // "all" = hiển thị tổng hợp cả thu nhập và chi tiêu
      if (activeTab === TABS.EXTERNAL || activeTab === TABS.GROUP_EXTERNAL || activeTab === TABS.FUND) {
        if (filterType !== "all" && t.type !== filterType) return false;
      }

      if (filterCategory !== "all" && t.category !== filterCategory)
        return false;

      if (filterWallet !== "all") {
        if (activeTab === TABS.EXTERNAL || activeTab === TABS.GROUP_EXTERNAL || activeTab === TABS.FUND) {
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
        const joined =
          activeTab === TABS.EXTERNAL || activeTab === TABS.GROUP_EXTERNAL
            ? [t.code, t.walletName, t.category, t.note, t.amount?.toString()]
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

  // Load scheduled transactions from API
  const loadScheduledTransactions = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const response = await scheduledTransactionAPI.getAll();
      const items = response?.scheduledTransactions || [];

      // Map backend response to frontend format
      const mapped = items.map((item) => ({
        id: item.scheduleId,
        walletId: item.walletId,
        walletName: item.walletName,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        transactionType:
          item.transactionTypeName === "Chi tiêu" ? "expense" : "income",
        transactionTypeName: item.transactionTypeName,
        amount: parseFloat(item.amount) || 0,
        currency: "VND",
        scheduleType: item.scheduleType,
        scheduleTypeLabel:
          SCHEDULE_TYPE_LABELS[item.scheduleType] || item.scheduleType,
        status: item.status,
        firstRun:
          item.nextExecutionDate && item.executionTime
            ? `${item.nextExecutionDate}T${item.executionTime}`
            : null,
        nextRun:
          item.nextExecutionDate && item.executionTime
            ? `${item.nextExecutionDate}T${item.executionTime}`
            : null,
        endDate: item.endDate,
        successRuns: item.completedCount || 0,
        failedRuns: item.failedCount || 0,
        totalRuns: estimateScheduleRuns(
          item.nextExecutionDate,
          item.endDate,
          item.scheduleType,
          item.completedCount || 0
        ),
        warning:
          item.failedCount > 0 ? `Thất bại ${item.failedCount} lần` : null,
        note: item.note,
        logs: [], // Will be loaded separately when viewing details
        dayOfWeek: item.dayOfWeek,
        dayOfMonth: item.dayOfMonth,
        month: item.month,
        day: item.day,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setScheduledTransactions(mapped);
    } catch (error) {
      console.error("Failed to load scheduled transactions:", error);
      setToast({
        open: true,
        message: "Không thể tải danh sách lịch hẹn giao dịch",
        type: "error",
      });
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  // Ref để track lần cuối refresh schedule tab - tránh refresh liên tục
  const lastScheduleRefreshRef = useRef(0);
  const SCHEDULE_REFRESH_COOLDOWN = 5000; // 5 giây cooldown

  // Load scheduled transactions when tab changes to SCHEDULE
  // Chỉ reload nếu đã qua cooldown period
  useEffect(() => {
    if (activeTab === TABS.SCHEDULE) {
      const now = Date.now();
      if (now - lastScheduleRefreshRef.current > SCHEDULE_REFRESH_COOLDOWN) {
        lastScheduleRefreshRef.current = now;
        loadScheduledTransactions();
        loadWallets?.();
      }
    }
  }, [activeTab, loadScheduledTransactions, loadWallets]);

  // Auto-refresh scheduled transactions and wallets every 60 seconds when on Schedule tab
  // Chỉ chạy khi tab đang active và không bị lag
  useEffect(() => {
    if (activeTab !== TABS.SCHEDULE) return;

    const intervalId = setInterval(() => {
      // Chỉ refresh nếu tab vẫn đang focus
      if (document.visibilityState === "visible") {
        loadScheduledTransactions();
        loadWallets?.();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [activeTab, loadScheduledTransactions, loadWallets]);

  const handleScheduleSubmit = async (payload) => {
    const scheduleWallet = findWalletById(payload.walletId);
    if (scheduleWallet && isViewerOnlyWallet(scheduleWallet)) {
      showViewerRestrictionToast();
      return;
    }

    try {
      // Parse firstRun datetime
      const firstRunDate = payload.firstRun ? new Date(payload.firstRun) : null;

      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const formatLocalDate = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Format time as HH:mm in local timezone
      const formatLocalTime = (date) => {
        if (!date) return "08:00";
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      };

      // Build API request
      const requestData = {
        walletId: parseInt(payload.walletId),
        transactionTypeId: payload.transactionType === "expense" ? 1 : 2, // 1 = Chi tiêu, 2 = Thu nhập
        categoryId: parseInt(payload.categoryId),
        amount: parseFloat(payload.amount),
        note: payload.note || "",
        scheduleType:
          payload.scheduleType === "ONE_TIME" ? "ONCE" : payload.scheduleType,
        startDate: formatLocalDate(firstRunDate),
        executionTime: formatLocalTime(firstRunDate),
        endDate: payload.endDate || null,
      };

      // Add schedule-type specific fields
      if (payload.scheduleType === "WEEKLY") {
        // Get day of week from firstRun (1-7, Monday-Sunday)
        requestData.dayOfWeek = firstRunDate
          ? firstRunDate.getDay() === 0
            ? 7
            : firstRunDate.getDay()
          : 1;
      } else if (payload.scheduleType === "MONTHLY") {
        requestData.dayOfMonth = firstRunDate ? firstRunDate.getDate() : 1;
      } else if (payload.scheduleType === "YEARLY") {
        requestData.month = firstRunDate ? firstRunDate.getMonth() + 1 : 1;
        requestData.day = firstRunDate ? firstRunDate.getDate() : 1;
      }

      const response = await scheduledTransactionAPI.create(requestData);

      if (response.scheduledTransaction) {
        // Reload the list
        await loadScheduledTransactions();
        setScheduleModalOpen(false);
        setToast({
          open: true,
          message: t("transactions.toast.schedule_created"),
          type: "success",
        });
      } else if (response.error) {
        setToast({
          open: true,
          message: response.error,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to create scheduled transaction:", error);
      setToast({
        open: true,
        message:
          error.response?.data?.error || "Không thể tạo lịch hẹn giao dịch",
        type: "error",
      });
    }
  };

  const handleScheduleCancel = async (scheduleId) => {
    try {
      const response = await scheduledTransactionAPI.cancel(scheduleId);

      if (response.scheduledTransaction || response.message) {
        // Reload the list
        await loadScheduledTransactions();
        setSelectedSchedule(null);
        setToast({
          open: true,
          message: t("transactions.toast.schedule_cancelled"),
          type: "success",
        });
      } else if (response.error) {
        setToast({
          open: true,
          message: response.error,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to cancel scheduled transaction:", error);
      setToast({
        open: true,
        message: error.response?.data?.error || "Không thể hủy lịch hẹn",
        type: "error",
      });
    }
  };

  // Load execution logs when selecting a schedule
  const handleSelectSchedule = async (schedule) => {
    // First set the schedule to show loading state quickly
    setSelectedSchedule(schedule);

    try {
      // Load fresh schedule data and logs from server
      const [scheduleResponse, logsResponse] = await Promise.all([
        scheduledTransactionAPI.getById(schedule.id),
        scheduledTransactionAPI.getLogs(schedule.id),
      ]);

      // Map fresh schedule data
      const freshSchedule = scheduleResponse?.scheduledTransaction;
      const logs = logsResponse?.logs || [];

      // Map logs to frontend format
      const mappedLogs = logs.map((log) => ({
        id: log.logId,
        time: log.executionTime,
        status: log.status,
        message: log.message,
        amount: log.amount,
        balanceBefore: log.walletBalanceBefore,
        balanceAfter: log.walletBalanceAfter,
      }));

      // Update selected schedule with fresh data and logs
      if (freshSchedule) {
        // Estimate total runs based on schedule type and dates
        const totalRunsEstimate = estimateScheduleRuns(
          freshSchedule.nextExecutionDate,
          freshSchedule.endDate,
          freshSchedule.scheduleType,
          freshSchedule.completedCount || 0
        );

        setSelectedSchedule({
          ...schedule,
          status: freshSchedule.status,
          nextRun:
            freshSchedule.nextExecutionDate && freshSchedule.executionTime
              ? `${freshSchedule.nextExecutionDate}T${freshSchedule.executionTime}`
              : null,
          successRuns: freshSchedule.completedCount || 0,
          failedRuns: freshSchedule.failedCount || 0,
          totalRuns: totalRunsEstimate,
          logs: mappedLogs,
        });

        // Also update in the main list
        setScheduledTransactions((prev) =>
          prev.map((s) =>
            s.id === schedule.id
              ? {
                  ...s,
                  status: freshSchedule.status,
                  successRuns: freshSchedule.completedCount || 0,
                  failedRuns: freshSchedule.failedCount || 0,
                  totalRuns: totalRunsEstimate,
                  nextRun:
                    freshSchedule.nextExecutionDate &&
                    freshSchedule.executionTime
                      ? `${freshSchedule.nextExecutionDate}T${freshSchedule.executionTime}`
                      : null,
                }
              : s
          )
        );
      } else {
        setSelectedSchedule((prev) =>
          prev ? { ...prev, logs: mappedLogs } : null
        );
      }

      // Reload wallets if there are completed logs
      const hasNewCompletedLogs = mappedLogs.some(
        (log) => log.status === "COMPLETED"
      );
      const now = Date.now();
      if (
        hasNewCompletedLogs &&
        now - lastScheduleRefreshRef.current > SCHEDULE_REFRESH_COOLDOWN
      ) {
        lastScheduleRefreshRef.current = now;
        loadWallets?.();
      }
    } catch (error) {
      console.error("Failed to load schedule details:", error);
    }
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
              <h2 className="wallet-header-title">
                {t("transactions.page.title")}
              </h2>
              <p className="wallet-header-subtitle">
                {t("transactions.page.subtitle")}
              </p>
            </div>
          </div>

          <div className="wallet-header-center d-flex justify-content-end">
            <div className="funds-tabs">
              <button
                type="button"
                className={`funds-tab ${
                  activeTab === TABS.EXTERNAL ? "funds-tab--active" : ""
                }`}
                onClick={() =>
                  handleTabChange({ target: { value: TABS.EXTERNAL } })
                }
              >
                {t("transactions.tab.external")}
              </button>
              <button
                type="button"
                className={`funds-tab ${
                  activeTab === TABS.GROUP_EXTERNAL ? "funds-tab--active" : ""
                }`}
                onClick={() =>
                  handleTabChange({ target: { value: TABS.GROUP_EXTERNAL } })
                }
              >
                Giao dịch ví nhóm
              </button>
              <button
                type="button"
                className={`funds-tab ${
                  activeTab === TABS.INTERNAL ? "funds-tab--active" : ""
                }`}
                onClick={() =>
                  handleTabChange({ target: { value: TABS.INTERNAL } })
                }
              >
                {t("transactions.tab.internal")}
              </button>
              <button
                type="button"
                className={`funds-tab ${
                  activeTab === TABS.FUND ? "funds-tab--active" : ""
                }`}
                onClick={() =>
                  handleTabChange({ target: { value: TABS.FUND } })
                }
              >
                Giao dịch quỹ
              </button>
              <button
                type="button"
                className={`funds-tab ${
                  activeTab === TABS.SCHEDULE ? "funds-tab--active" : ""
                }`}
                onClick={() =>
                  handleTabChange({ target: { value: TABS.SCHEDULE } })
                }
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
                  <p className="text-muted mb-0"></p>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <i className="bi bi-plus-lg me-2" />
                  {t("transactions.schedule.create_btn")}
                </button>
              </div>

              <div className="schedule-tabs mb-3">
                {SCHEDULE_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={`schedule-tab ${
                      scheduleFilter === tab.value ? "active" : ""
                    }`}
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
                    const meta =
                      SCHEDULE_STATUS_META[schedule.status] ||
                      SCHEDULE_STATUS_META.PENDING;
                    const progress =
                      schedule.totalRuns > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (schedule.successRuns / schedule.totalRuns) * 100
                            )
                          )
                        : 0;
                    return (
                      <div
                        className="scheduled-card d-flex flex-column"
                        key={schedule.id}
                        style={{ minHeight: "180px" }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1">
                              {schedule.walletName} •{" "}
                              {schedule.transactionType === "income"
                                ? t("transactions.type.income")
                                : t("transactions.type.expense")}
                            </h6>
                            <p className="mb-1 text-muted">
                              {schedule.categoryName} ·{" "}
                              {schedule.scheduleTypeLabel}
                            </p>
                          </div>
                          <span className={meta.className}>
                            {t(
                              `transactions.schedule.status.${String(
                                schedule.status
                              ).toLowerCase()}`
                            )}
                          </span>
                        </div>
                        <div className="d-flex flex-wrap gap-3 mb-2 small text-muted">
                          <span>
                            {t("transactions.schedule.amount")}{" "}
                            {formatCurrency(schedule.amount)}
                          </span>
                          <span>
                            {t("transactions.schedule.next_run")}{" "}
                            {formatVietnamDateTime(schedule.nextRun)}
                          </span>
                          <span>
                            {t("transactions.schedule.completed_runs")}{" "}
                            {schedule.successRuns}/{schedule.totalRuns || "∞"}
                          </span>
                        </div>
                        <div className="progress schedule-progress">
                          <div
                            className="progress-bar"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex-grow-1 d-flex flex-column justify-content-between">
                          <div
                            className="schedule-warning-container"
                            style={{ minHeight: "24px" }}
                          >
                            {schedule.warning && (
                              <div className="schedule-warning">
                                <i className="bi bi-exclamation-triangle-fill me-1" />
                                {schedule.warning}
                              </div>
                            )}
                          </div>
                          <div className="scheduled-card-actions d-flex justify-content-end gap-3 mt-auto">
                            <button
                              type="button"
                              className="btn btn-link px-0"
                              onClick={() => handleSelectSchedule(schedule)}
                            >
                              {t("transactions.schedule.view_history")}
                            </button>
                            {schedule.status !== "COMPLETED" &&
                              schedule.status !== "CANCELLED" && (
                                <button
                                  type="button"
                                  className="btn btn-link px-0 text-danger"
                                  onClick={() =>
                                    handleScheduleCancel(schedule.id)
                                  }
                                >
                                  {t("transactions.schedule.cancel")}
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`transactions-layout ${
              expandedPanel
                ? "transactions-layout--expanded"
                : activeTab === TABS.FUND
                ? "transactions-layout--fund-only"
                : "transactions-layout--with-history"
            }`}
          >
            {/* LEFT: Create Transaction Form - Ẩn khi activeTab === FUND */}
            {activeTab !== TABS.FUND && (!expandedPanel || expandedPanel === "form") && (
              <div
                className={`transactions-form-panel ${
                  expandedPanel === "form" ? "expanded" : ""
                }`}
              >
                <TransactionForm
                  mode="create"
                  variant={
                    activeTab === TABS.INTERNAL ? "internal" : "external"
                  }
                  onSubmit={handleCreate}
                  onReset={() => {
                    // Reset form sau khi submit
                  }}
                  expanded={expandedPanel === "form"}
                  onToggleExpand={() =>
                    setExpandedPanel(expandedPanel === "form" ? null : "form")
                  }
                  availableWallets={actionableWallets}
                  activeTab={activeTab}
                />
              </div>
            )}

            {/* RIGHT: Transaction History */}
            {(!expandedPanel || expandedPanel === "history") && (
              <div
                className={`transactions-history-panel ${
                  expandedPanel === "history" ? "expanded" : ""
                }`}
              >
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
                  expanded={expandedPanel === "history"}
                  onToggleExpand={() =>
                    setExpandedPanel(
                      expandedPanel === "history" ? null : "history"
                    )
                  }
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
          activeTab={activeTab}
        />

        <ConfirmModal
          open={!!confirmDel}
          title={t("transactions.confirm.delete_title")}
          message={
            confirmDel
              ? t("transactions.confirm.delete_message").replace(
                  "{code}",
                  confirmDel.code
                )
              : ""
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
          onClose={() =>
            setToast({ open: false, message: "", type: "success" })
          }
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
  const walletId = walletEntity
    ? walletEntity.walletId ?? walletEntity.id
    : null;
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
