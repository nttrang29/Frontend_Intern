// src/components/transactions/TransactionFormModal.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCategoryData } from "../../contexts/CategoryDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { getVietnamDateTime, convertToVietnamDateTime, formatMoney } from "./utils/transactionUtils";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import SearchableSelectInput from "../common/SearchableSelectInput";
import { mapWalletsToSelectOptions, WALLET_TYPE_ICON_CONFIG } from "../../utils/walletSelectHelpers";

/* ================== CẤU HÌNH MẶC ĐỊNH ================== */
const EMPTY_FORM = {
  type: "expense",
  walletName: "",
  walletId: null, // Thêm walletId để xác định chính xác ví khi có nhiều ví cùng tên
  amount: "",
  date: "",
  category: "Ăn uống",
  note: "",
  currency: "VND",
  attachment: "",
  sourceWallet: "",
  sourceWalletId: null, // Thêm sourceWalletId
  targetWallet: "",
  targetWalletId: null, // Thêm targetWalletId
};

// static defaults kept as fallback
/* ================== Select Input (chỉ dropdown) ================== */
function SelectInput({
  label,
  value,
  onChange,
  options = [],
  required = true,
  disabled = false,
  emptyMessage,
}) {
  const { t } = useLanguage();
  const handleSelect = (e) => {
    onChange(e.target.value);
  };

  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      {hasOptions ? (
        <select
          className="form-select"
          value={value || ""}
          onChange={handleSelect}
          required={required}
          disabled={disabled}
        >
          <option value="">{t("transactions.form.select_option")}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-muted small">
          {emptyMessage || t("common.no_data") || "Không có dữ liệu để hiển thị."}
        </div>
      )}
    </div>
  );
}

/* ================== TransactionFormModal ================== */
export default function TransactionFormModal({
  open,
  mode = "create",
  initialData,
  onSubmit,
  onClose,
  variant = "external",
  availableWallets,
  activeTab, // Tab hiện tại để filter wallets
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [categorySearchText, setCategorySearchText] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categorySelectRef = useRef(null);
  // Refs để lưu giá trị được chọn từ SearchableSelectInput (không phụ thuộc vào form state)
  const selectedSourceWalletIdRef = useRef(null);
  const selectedTargetWalletIdRef = useRef(null);
  // State để trigger re-render khi ref thay đổi
  const [sourceWalletSelectionTrigger, setSourceWalletSelectionTrigger] = useState(0);
  const [targetWalletSelectionTrigger, setTargetWalletSelectionTrigger] = useState(0);
  const { t } = useLanguage();
  
  useOnClickOutside(categorySelectRef, () => setCategoryDropdownOpen(false));

  /* ========== ESC để đóng ========== */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ========== Khóa scroll nền khi mở modal ========== */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // get shared categories and wallets (cần lấy trước để dùng trong useEffect)
  const { expenseCategories, incomeCategories } = useCategoryData();
  const { wallets: walletListFromContext } = useWalletData();
  
  // Lấy currentUserId để kiểm tra owner
  const currentUserId = useMemo(() => {
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
  }, []);

  // Filter wallets dựa trên activeTab
  // EXTERNAL: chỉ ví cá nhân (PERSONAL)
  // GROUP_EXTERNAL: ví nhóm (GROUP) và ví được chia sẻ với role MEMBER
  // INTERNAL: ví cá nhân, ví nhóm và ví được chia sẻ với role MEMBER
  const filteredWalletList = useMemo(() => {
    const allWallets = Array.isArray(availableWallets) ? availableWallets : (walletListFromContext || []);
    
    return allWallets.filter((w) => {
      // Bỏ qua ví đã bị xóa mềm
      if (w?.deleted) return false;
      
      // Lấy walletType để phân biệt PERSONAL và GROUP
      const walletType = (w?.walletType || w?.type || "").toString().toUpperCase();
      const role = (w?.walletRole || w?.sharedRole || w?.role || "").toString().toUpperCase();
      const isShared = !!w?.isShared || !!(w?.walletRole || w?.sharedRole || w?.role);
      
      // Nếu là tab "Giao dịch ví cá nhân" (EXTERNAL) - chỉ hiển thị ví cá nhân
      if (activeTab === "external") {
        // Chỉ lấy ví PERSONAL (walletType !== "GROUP")
        if (walletType === "GROUP") return false;
        
        // Ví cá nhân: kiểm tra xem user có phải owner không
        if (w?.ownerUserId && currentUserId) {
          return String(w.ownerUserId) === String(currentUserId);
        }
        // Nếu không có ownerUserId, mặc định là ví của user hiện tại
        return true;
      }
      
      // Nếu là tab "Giao dịch ví nhóm" (GROUP_EXTERNAL) - chỉ hiển thị ví nhóm và ví được chia sẻ với role MEMBER
      if (activeTab === "group_external") {
        // 1. Ví nhóm (walletType === "GROUP", user là OWNER/MASTER/ADMIN)
        if (walletType === "GROUP" && isShared && ["OWNER", "MASTER", "ADMIN"].includes(role)) {
          return true;
        }
        
        // 2. Ví được chia sẻ với quyền MEMBER/USER/USE (không phải VIEW/VIEWER)
        if (isShared && ["MEMBER", "USER", "USE"].includes(role)) {
          return true;
        }
        
        // Bỏ qua ví cá nhân và các ví khác
        return false;
      }
      
      // Nếu là tab "Giao dịch giữa các ví" (INTERNAL) - cho phép ví cá nhân, ví nhóm và ví được chia sẻ với role MEMBER
      if (activeTab === "internal") {
        // 1. Ví cá nhân (walletType !== "GROUP", user là owner)
        if (walletType !== "GROUP") {
          if (w?.ownerUserId && currentUserId) {
            return String(w.ownerUserId) === String(currentUserId);
          }
          // Nếu không có ownerUserId, mặc định là ví của user hiện tại
          return true;
        }
        
        // 2. Ví nhóm (walletType === "GROUP", user là OWNER/MASTER/ADMIN)
        if (walletType === "GROUP" && isShared && ["OWNER", "MASTER", "ADMIN"].includes(role)) {
          return true;
        }
        
        // 3. Ví được chia sẻ với quyền MEMBER/USER/USE (không phải VIEW/VIEWER)
        if (isShared && ["MEMBER", "USER", "USE"].includes(role)) {
          return true;
        }
        
        // Bỏ qua các ví khác
        return false;
      }
      
      // Fallback: nếu không có activeTab hoặc tab khác, dùng logic cũ (tương thích)
      if (!isShared) {
        if (w?.ownerUserId && currentUserId) {
          return String(w.ownerUserId) === String(currentUserId);
        }
        return true;
      }
      
      if (isShared && ["OWNER", "MASTER", "ADMIN"].includes(role)) {
        return true;
      }
      
      if (isShared && ["MEMBER", "USER", "USE"].includes(role)) {
        return true;
      }
      
      return false;
    });
  }, [availableWallets, walletListFromContext, currentUserId, activeTab]);

  // Helper function để lấy walletId một cách nhất quán
  const getWalletId = (wallet) => {
    if (!wallet) return null;
    // Ưu tiên dùng id, nếu không có thì dùng walletId
    // Dùng ?? thay vì || để xử lý trường hợp id = 0
    return wallet.id ?? wallet.walletId ?? null;
  };

  // Helper function để lấy walletName một cách nhất quán
  const getWalletName = (wallet) => {
    if (!wallet) return "";
    return wallet.name ?? wallet.walletName ?? "";
  };

  const walletList = filteredWalletList;
  
  // Debug: Log walletList để kiểm tra
  console.log("🟣 [walletList] Filtered wallets:", walletList.map(w => {
    const walletId = getWalletId(w);
    const walletName = getWalletName(w);
    return {
      id: w.id,
      walletId: w.walletId,
      name: w.name,
      walletName: w.walletName,
      balance: w.balance,
      getWalletId: walletId,
      getWalletName: walletName,
      raw: w
    };
  }));
  
  // Tìm ví mặc định
  const defaultWallet = walletList.find(w => w.isDefault === true);

  /* ========== Tự động sync sourceWalletId khi có sourceWallet name ========== */
  useEffect(() => {
    if (variant !== "internal") return;
    if (!walletList || walletList.length === 0) return;
    
    // Nếu có sourceWallet name nhưng không có sourceWalletId, tự động tìm và set
    if (form.sourceWallet && form.sourceWallet.trim() !== "" && (!form.sourceWalletId || form.sourceWalletId === null)) {
      console.log("🟦 [auto-sync] Attempting to sync sourceWalletId for:", form.sourceWallet);
      
      const walletsWithSameName = walletList?.filter(w => {
        const walletName = getWalletName(w);
        return walletName === form.sourceWallet;
      }) || [];
      
      console.log("🟦 [auto-sync] Found wallets with same name:", walletsWithSameName.length);
      
      // Nếu chỉ có 1 ví với tên đó, tự động set sourceWalletId
      if (walletsWithSameName.length === 1) {
        const wallet = walletsWithSameName[0];
        const walletId = getWalletId(wallet);
        if (walletId !== null && walletId !== undefined) {
          console.log("🟦 [auto-sync] Setting sourceWalletId from sourceWallet name:", {
            sourceWallet: form.sourceWallet,
            sourceWalletId: walletId,
            walletBalance: wallet.balance
          });
          setForm((f) => ({ ...f, sourceWalletId: Number(walletId) }));
        } else {
          console.log("🟦 [auto-sync] Wallet has no id:", wallet);
        }
      } else if (walletsWithSameName.length > 1) {
        console.log("🟦 [auto-sync] Multiple wallets with same name, cannot auto-sync:", walletsWithSameName.map(w => ({
          id: getWalletId(w),
          name: getWalletName(w)
        })));
      } else {
        console.log("🟦 [auto-sync] No wallet found with name:", form.sourceWallet);
      }
    }
  }, [form.sourceWallet, form.sourceWalletId, walletList, variant]);

  /* ========== Đổ dữ liệu ban đầu ========== */
  useEffect(() => {
    if (!open) return;
    // Luôn lấy thời gian hiện tại mới nhất theo múi giờ Việt Nam khi mở form
    const now = getVietnamDateTime();
  if (variant === "internal") {
      if (mode === "edit" && initialData) {
        let dateValue = "";
        if (initialData.date) {
          dateValue = convertToVietnamDateTime(initialData.date);
        }
        // Tìm walletId từ sourceWallet và targetWallet
        const sourceWallet = walletList?.find(w => getWalletName(w) === initialData.sourceWallet);
        const targetWallet = walletList?.find(w => getWalletName(w) === initialData.targetWallet);
        setForm({
          ...EMPTY_FORM,
          type: "transfer",
          sourceWallet: initialData.sourceWallet || "",
          // Reset refs khi form được reset
          sourceWalletId: sourceWallet ? getWalletId(sourceWallet) : null,
          targetWallet: initialData.targetWallet || "",
          targetWalletId: targetWallet ? getWalletId(targetWallet) : null,
          amount: String(initialData.amount ?? ""),
          date: dateValue || now,
          category: initialData.category || "Chuyển tiền giữa các ví",
          note: initialData.note || "",
          currency: initialData.currency || "VND",
          attachment: initialData.attachment || "",
        });
        setAttachmentPreview(initialData.attachment || "");
      } else {
        // Mode create: luôn dùng thời gian hiện tại theo múi giờ Việt Nam
        setForm({
          ...EMPTY_FORM,
          type: "transfer",
          date: getVietnamDateTime(), // Luôn lấy thời gian mới nhất theo VN
          category: "Chuyển tiền giữa các ví",
        });
        setAttachmentPreview("");
        // Reset refs khi form được reset
        selectedSourceWalletIdRef.current = null;
        selectedTargetWalletIdRef.current = null;
      }
    } else {
      if (mode === "edit" && initialData) {
        // Mode edit: giữ nguyên thời gian của giao dịch cũ (convert sang VN timezone)
        let dateValue = "";
        if (initialData.date) {
          dateValue = convertToVietnamDateTime(initialData.date);
        }
        // Tìm walletId từ walletName để xác định chính xác ví
        const wallet = walletList?.find(w => getWalletName(w) === initialData.walletName);
        const walletId = wallet ? getWalletId(wallet) : null;
        setForm({
          ...EMPTY_FORM,
          type: initialData.type,
          walletName: initialData.walletName,
          walletId: walletId,
          amount: String(initialData.amount),
          date: dateValue || getVietnamDateTime(),
          category: initialData.category,
          note: initialData.note || "",
          currency: initialData.currency || "VND",
          attachment: initialData.attachment || "",
        });
        setAttachmentPreview(initialData.attachment || "");
      } else {
        // Mode create: luôn dùng thời gian hiện tại theo múi giờ Việt Nam
        // Tự động chọn ví mặc định nếu có
        const defaultWalletName = defaultWallet ? getWalletName(defaultWallet) : "";
        const defaultCurrency = defaultWallet?.currency || "VND";
        const defaultWalletId = defaultWallet ? getWalletId(defaultWallet) : null;
        setForm({ 
          ...EMPTY_FORM, 
          date: getVietnamDateTime(),
          walletName: defaultWalletName,
          walletId: defaultWalletId,
          currency: defaultCurrency,
        });
        setAttachmentPreview("");
        // Reset refs và triggers khi form được reset
        selectedSourceWalletIdRef.current = null;
        selectedTargetWalletIdRef.current = null;
        setSourceWalletSelectionTrigger(0);
        setTargetWalletSelectionTrigger(0);
      }
    }
    // Reset refs và triggers khi modal đóng
    if (!open) {
      selectedSourceWalletIdRef.current = null;
      selectedTargetWalletIdRef.current = null;
      setSourceWalletSelectionTrigger(0);
      setTargetWalletSelectionTrigger(0);
    }
  }, [open, mode, initialData, variant, defaultWallet]);

  // Category options với icon và sắp xếp (mới tạo lên đầu)
  const categoryOptionsWithIcon = useMemo(() => {
    const source = form.type === "income" ? incomeCategories : expenseCategories;
    if (!source || source.length === 0) return [];
    
    // Sắp xếp: danh mục mới tạo (id lớn hơn) lên đầu
    const sorted = [...source].sort((a, b) => {
      const aId = a.id || a.categoryId || 0;
      const bId = b.id || b.categoryId || 0;
      return bId - aId; // Mới nhất lên đầu
    });
    
    return sorted.map((c) => ({
      name: c.name || c.categoryName || "",
      icon: c.icon || "bi-tags",
      id: c.id || c.categoryId,
    })).filter(c => c.name);
  }, [form.type, expenseCategories, incomeCategories]);

  const categoryOptions = useMemo(() => {
    return categoryOptionsWithIcon.map(c => c.name);
  }, [categoryOptionsWithIcon]);

  // Filtered categories dựa trên search text
  const filteredCategories = useMemo(() => {
    if (!categorySearchText.trim()) {
      return categoryOptionsWithIcon;
    }
    const keyword = categorySearchText.toLowerCase();
    return categoryOptionsWithIcon.filter(cat => 
      cat.name.toLowerCase().includes(keyword)
    );
  }, [categoryOptionsWithIcon, categorySearchText]);

  // Lấy icon của category đã chọn
  const selectedCategoryIcon = useMemo(() => {
    if (!form.category) return null;
    const found = categoryOptionsWithIcon.find(c => c.name === form.category);
    return found?.icon || "bi-tags";
  }, [form.category, categoryOptionsWithIcon]);

  const hasCategories = categoryOptions.length > 0;

  // Reset category search khi đóng dropdown
  useEffect(() => {
    if (!categoryDropdownOpen) {
      setCategorySearchText("");
    }
  }, [categoryDropdownOpen]);

  // Wallet type labels
  const walletTypeLabels = useMemo(() => ({
    personal: t("wallets.type.personal") || "Ví cá nhân",
    shared: t("wallets.type.shared") || t("wallets.type.shared_personal") || "Ví được chia sẻ",
    group: t("wallets.type.group") || "Ví nhóm",
  }), [t]);

  // Danh sách ví cho ví gửi với đầy đủ thông tin loại ví và email chủ ví
  const walletOptions = useMemo(() => {
    // Dùng walletId làm value để tránh trùng lặp khi có nhiều ví cùng tên
    // Đảm bảo mỗi ví có value duy nhất bằng cách dùng id/walletId (không dùng name)
    const options = mapWalletsToSelectOptions(
      walletList,
      walletTypeLabels,
      (wallet) => {
        // Ưu tiên dùng id hoặc walletId (phải có để đảm bảo unique)
        // Kiểm tra cả null, undefined và empty string, nhưng cho phép 0 (vì 0 là valid ID)
        const walletId = getWalletId(wallet);
        if (walletId !== null && walletId !== undefined && walletId !== "") {
          return String(walletId);
        }
        // Nếu không có id, không thể tạo option (sẽ gây lỗi khi có nhiều ví cùng tên)
        return "";
      }
    );

    // Sửa lại label và description dựa trên quyền sở hữu và loại ví
    const normalized = options
      .filter((opt) => opt.value !== "")
      .map((opt) => {
        const wallet = opt.raw;
        if (!wallet) return opt;

        // Xác định user hiện tại có phải là owner không
        const role = (wallet.walletRole || wallet.sharedRole || wallet.role || "").toString().toUpperCase();
        const isOwner = 
          (wallet.ownerUserId && currentUserId && String(wallet.ownerUserId) === String(currentUserId)) ||
          ["OWNER", "MASTER", "ADMIN"].includes(role);
        
        // Kiểm tra walletType để phân biệt chính xác ví nhóm và ví cá nhân
        const walletType = (wallet.walletType || wallet.type || "").toString().toUpperCase();
        const isGroupWallet = walletType === "GROUP";
        
        // Nếu user là owner
        if (isOwner) {
          // Ví nhóm (walletType === "GROUP") → "Ví nhóm"
          if (isGroupWallet) {
            return {
              ...opt,
              description: "Ví nhóm",
            };
          }
          // Ví cá nhân (walletType === "PERSONAL" hoặc không phải GROUP) → "Ví cá nhân"
          return {
            ...opt,
            description: "Ví cá nhân",
          };
        }
        
        // Nếu user không phải owner (là member được mời) → "Ví được chia sẻ"
        // Lấy email chủ ví từ nhiều nguồn
        const ownerEmail = 
          wallet.ownerEmail || 
          wallet.ownerContact || 
          wallet.owner?.email ||
          wallet.ownerUser?.email ||
          "";
        
        // Thêm email chủ ví vào label nếu có
        let newLabel = opt.label;
        if (ownerEmail && ownerEmail.trim() !== "") {
          newLabel = `${opt.label} (${ownerEmail})`;
        } else if (wallet.ownerName && wallet.ownerName.trim() !== "") {
          // Fallback: nếu không có email, dùng tên chủ ví
          newLabel = `${opt.label} (${wallet.ownerName})`;
        }
        
        return {
          ...opt,
          label: newLabel,
          description: "Ví được chia sẻ",
        };
      });

    // Debug: Log walletOptions để kiểm tra
    console.log("🔵 [walletOptions] Created:", normalized.map(opt => ({
      value: opt.value,
      label: opt.label,
      walletId: getWalletId(opt.raw),
      walletName: getWalletName(opt.raw),
      raw: opt.raw
    })));
    
    return normalized;
  }, [walletList, walletTypeLabels, currentUserId]);
  const hasWallets = walletOptions.length > 0;
  
  // Danh sách ví cho ví nhận (loại bỏ ví gửi đã chọn)
  const targetWalletOptions = useMemo(() => {
    if (!walletOptions || walletOptions.length === 0) return [];
    if (!form.sourceWallet) return walletOptions;
    // Loại bỏ ví gửi khỏi danh sách ví nhận
    return walletOptions.filter((opt) => opt.value !== form.sourceWallet);
  }, [walletOptions, form.sourceWallet]);
  const hasTargetWallets = targetWalletOptions.length > 0;

  // Tìm ví đã chọn trong form giao dịch thông thường
  const selectedWallet = useMemo(() => {
    console.log("🟢 [selectedWallet] Form state:", {
      walletId: form.walletId,
      walletName: form.walletName,
      walletIdType: typeof form.walletId
    });
    
    // Ưu tiên tìm theo walletId nếu có (chính xác nhất)
    if (form.walletId !== null && form.walletId !== undefined && form.walletId !== "") {
      const formWalletId = form.walletId;
      console.log("🟢 [selectedWallet] Searching by walletId:", formWalletId);
      
      const wallet = walletList?.find(w => {
        const walletId = getWalletId(w);
        if (walletId === null || walletId === undefined) return false;
        // So sánh cả number và string để đảm bảo match
        const walletIdNum = Number(walletId);
        const formWalletIdNum = Number(formWalletId);
        // So sánh number trước (chính xác hơn)
        if (!isNaN(walletIdNum) && !isNaN(formWalletIdNum) && walletIdNum === formWalletIdNum) {
          return true;
        }
        // Fallback: so sánh string
        return String(walletId) === String(formWalletId);
      });
      
      if (wallet) {
        console.log("🟢 [selectedWallet] Found by walletId:", {
          walletId: getWalletId(wallet),
          walletName: getWalletName(wallet),
          balance: wallet.balance
        });
        return wallet;
      } else {
        console.log("🟢 [selectedWallet] NOT found by walletId:", formWalletId);
      }
    }
    
    // Nếu không có walletId, tìm theo walletName
    if (!form.walletName) {
      console.log("🟢 [selectedWallet] No walletName, returning null");
      return null;
    }
    
    // Kiểm tra xem có bao nhiêu ví cùng tên trong walletList
    const walletsWithSameName = walletList?.filter(w => {
      const walletName = getWalletName(w);
      return walletName === form.walletName;
    }) || [];
    
    console.log("🟢 [selectedWallet] Searching by walletName:", form.walletName, "Found:", walletsWithSameName.length, "wallets");
    
    // Chỉ trả về ví nếu chỉ có 1 ví với tên đó
    if (walletsWithSameName.length === 1) {
      const found = walletsWithSameName[0];
      console.log("🟢 [selectedWallet] Found by walletName (unique):", {
        walletId: getWalletId(found),
        walletName: getWalletName(found),
        balance: found.balance
      });
      return found;
    }
    
    // Nếu có nhiều ví cùng tên và không có walletId, không thể xác định chính xác
    // Không tìm trong walletOptions vì nó sẽ trả về ví đầu tiên (không chính xác)
    console.log("🟢 [selectedWallet] Multiple wallets with same name, returning null");
    return null;
  }, [form.walletName, form.walletId, walletList]);
  
  // Lấy walletId từ walletName/walletId hiện tại để set value cho SearchableSelectInput
  const currentWalletValue = useMemo(() => {
    // Ưu tiên dùng walletId nếu có (đáng tin cậy nhất)
    if (form.walletId !== null && form.walletId !== undefined && form.walletId !== "") {
      const value = String(form.walletId);
      console.log("🟡 [currentWalletValue] Using walletId:", value);
      return value;
    }
    if (!form.walletName) {
      console.log("🟡 [currentWalletValue] No walletName, returning empty");
      return "";
    }
    // Nếu không có walletId, kiểm tra xem có bao nhiêu ví cùng tên
    const walletsWithSameName = walletList?.filter(w => {
      const walletName = getWalletName(w);
      return walletName === form.walletName;
    }) || [];
    // Nếu chỉ có 1 ví với tên đó, có thể dùng walletId của ví đó
    if (walletsWithSameName.length === 1) {
      const wallet = walletsWithSameName[0];
      const walletId = getWalletId(wallet);
      if (walletId !== null && walletId !== undefined) {
        const value = String(walletId);
        console.log("🟡 [currentWalletValue] Using walletId from unique name:", value);
        return value;
      }
      // Nếu ví không có id, không thể dùng (sẽ gây lỗi)
      console.log("🟡 [currentWalletValue] Wallet has no id, returning empty");
      return "";
    }
    // Nếu có nhiều ví cùng tên và không có walletId, không thể xác định chính xác
    // Trả về empty để user phải chọn lại
    console.log("🟡 [currentWalletValue] Multiple wallets with same name, returning empty");
    return "";
  }, [form.walletName, form.walletId, walletList]);

  // Lấy walletId từ sourceWallet/sourceWalletId hiện tại để set value cho SearchableSelectInput
  const currentSourceWalletValue = useMemo(() => {
    // Ưu tiên dùng sourceWalletId nếu có (đáng tin cậy nhất)
    if (form.sourceWalletId !== null && form.sourceWalletId !== undefined && form.sourceWalletId !== "") {
      const value = String(form.sourceWalletId);
      console.log("🟡 [currentSourceWalletValue] Using sourceWalletId:", value);
      return value;
    }
    if (!form.sourceWallet) {
      console.log("🟡 [currentSourceWalletValue] No sourceWallet name, returning empty");
      return "";
    }
    // Nếu không có sourceWalletId, kiểm tra xem có bao nhiêu ví cùng tên
    const walletsWithSameName = walletList?.filter(w => getWalletName(w) === form.sourceWallet) || [];
    // Nếu chỉ có 1 ví với tên đó, có thể dùng walletId của ví đó
    if (walletsWithSameName.length === 1) {
      const wallet = walletsWithSameName[0];
      const walletId = getWalletId(wallet);
      if (walletId !== null && walletId !== undefined) {
        const value = String(walletId);
        console.log("🟡 [currentSourceWalletValue] Using walletId from unique name:", value);
        return value;
      }
      console.log("🟡 [currentSourceWalletValue] Wallet has no id, returning empty");
      return "";
    }
    // Nếu có nhiều ví cùng tên và không có sourceWalletId, không thể xác định chính xác
    console.log("🟡 [currentSourceWalletValue] Multiple wallets with same name, returning empty");
    return "";
  }, [form.sourceWallet, form.sourceWalletId, walletList]);
  
  const currentTargetWalletValue = useMemo(() => {
    // Ưu tiên dùng targetWalletId nếu có (đáng tin cậy nhất)
    if (form.targetWalletId !== null && form.targetWalletId !== undefined && form.targetWalletId !== "") {
      return String(form.targetWalletId);
    }
    if (!form.targetWallet) return "";
    // Nếu không có targetWalletId, kiểm tra xem có bao nhiêu ví cùng tên
    const walletsWithSameName = walletList?.filter(w => getWalletName(w) === form.targetWallet) || [];
    // Nếu chỉ có 1 ví với tên đó, có thể dùng walletId của ví đó
    if (walletsWithSameName.length === 1) {
      const wallet = walletsWithSameName[0];
      const walletId = getWalletId(wallet);
      if (walletId !== null && walletId !== undefined) {
        return String(walletId);
      }
      return "";
    }
    // Nếu có nhiều ví cùng tên và không có targetWalletId, không thể xác định chính xác
    return "";
  }, [form.targetWallet, form.targetWalletId, walletList]);

  // Tìm ví gửi và ví nhận từ walletList để lấy số dư
  const sourceWallet = useMemo(() => {
    console.log("🟠 [sourceWallet] Form state:", {
      sourceWalletId: form.sourceWalletId,
      sourceWallet: form.sourceWallet,
      sourceWalletIdType: typeof form.sourceWalletId,
      walletListLength: walletList?.length
    });
    
    // Ưu tiên tìm theo sourceWalletId nếu có (chính xác nhất)
    if (form.sourceWalletId !== null && form.sourceWalletId !== undefined && form.sourceWalletId !== "") {
      const formWalletId = form.sourceWalletId;
      console.log("🟠 [sourceWallet] Searching by sourceWalletId:", formWalletId, "Type:", typeof formWalletId);
      
      // Log tất cả wallet IDs để debug
      const allWalletIds = walletList?.map(w => ({
        id: getWalletId(w),
        name: getWalletName(w),
        idType: typeof getWalletId(w)
      })) || [];
      console.log("🟠 [sourceWallet] All wallet IDs in walletList:", allWalletIds);
      
      const wallet = walletList?.find(w => {
        const walletId = getWalletId(w);
        if (walletId === null || walletId === undefined) {
          console.log("🟠 [sourceWallet] Wallet has null/undefined ID:", getWalletName(w));
          return false;
        }
        // So sánh cả number và string để đảm bảo match
        const walletIdNum = Number(walletId);
        const formWalletIdNum = Number(formWalletId);
        // So sánh number trước (chính xác hơn)
        if (!isNaN(walletIdNum) && !isNaN(formWalletIdNum) && walletIdNum === formWalletIdNum) {
          console.log("🟠 [sourceWallet] Match found by number comparison:", walletIdNum, "===", formWalletIdNum);
          return true;
        }
        // Fallback: so sánh string
        const stringMatch = String(walletId) === String(formWalletId);
        if (stringMatch) {
          console.log("🟠 [sourceWallet] Match found by string comparison:", String(walletId), "===", String(formWalletId));
        }
        return stringMatch;
      });
      
      if (wallet) {
        console.log("🟠 [sourceWallet] ✅ Found by sourceWalletId:", {
          walletId: getWalletId(wallet),
          walletName: getWalletName(wallet),
          balance: wallet.balance,
          currency: wallet.currency
        });
        return wallet;
      } else {
        console.log("🟠 [sourceWallet] ❌ NOT found by sourceWalletId:", formWalletId, "Available IDs:", allWalletIds.map(w => w.id));
      }
    }
    
    // Nếu không có sourceWalletId, tìm theo sourceWallet name
    if (!form.sourceWallet) {
      console.log("🟠 [sourceWallet] No sourceWallet name, returning null");
      return null;
    }
    
    // Kiểm tra xem có bao nhiêu ví cùng tên trong walletList
    const walletsWithSameName = walletList?.filter(w => {
      const walletName = getWalletName(w);
      return walletName === form.sourceWallet;
    }) || [];
    
    console.log("🟠 [sourceWallet] Searching by sourceWallet name:", form.sourceWallet, "Found:", walletsWithSameName.length, "wallets");
    
    // Chỉ trả về ví nếu chỉ có 1 ví với tên đó
    if (walletsWithSameName.length === 1) {
      const found = walletsWithSameName[0];
      console.log("🟠 [sourceWallet] Found by name (unique):", {
        walletId: getWalletId(found),
        walletName: getWalletName(found),
        balance: found.balance
      });
      return found;
    }
    
    // Nếu có nhiều ví cùng tên và không có sourceWalletId, thử tìm từ ref hoặc currentSourceWalletValue
    // (ref lưu giá trị được chọn ngay lập tức, không phụ thuộc vào form state)
    const refValue = selectedSourceWalletIdRef.current;
    const valueToSearch = refValue || currentSourceWalletValue;
    if (valueToSearch && valueToSearch !== "") {
      console.log("🟠 [sourceWallet] Multiple wallets with same name, trying to find by ref/value:", refValue, "/", currentSourceWalletValue);
      const walletFromValue = walletList?.find(w => {
        const walletId = getWalletId(w);
        if (walletId === null || walletId === undefined) return false;
        return String(walletId) === String(valueToSearch) || Number(walletId) === Number(valueToSearch);
      });
      if (walletFromValue) {
        console.log("🟠 [sourceWallet] ✅ Found by ref/value:", {
          walletId: getWalletId(walletFromValue),
          walletName: getWalletName(walletFromValue),
          balance: walletFromValue.balance,
          currency: walletFromValue.currency
        });
        return walletFromValue;
      }
    }
    
    // Nếu vẫn không tìm được, không thể xác định chính xác
    console.log("🟠 [sourceWallet] Multiple wallets with same name, returning null");
    return null;
  }, [form.sourceWallet, form.sourceWalletId, walletList, currentSourceWalletValue, sourceWalletSelectionTrigger]);
  
  const targetWallet = useMemo(() => {
    console.log("🟣 [targetWallet] Form state:", {
      targetWalletId: form.targetWalletId,
      targetWallet: form.targetWallet,
      targetWalletIdType: typeof form.targetWalletId
    });
    
    // Ưu tiên tìm theo targetWalletId nếu có (chính xác nhất)
    if (form.targetWalletId !== null && form.targetWalletId !== undefined && form.targetWalletId !== "") {
      const formWalletId = form.targetWalletId;
      console.log("🟣 [targetWallet] Searching by targetWalletId:", formWalletId, "Type:", typeof formWalletId);
      
      // Log tất cả wallet IDs để debug
      const allWalletIds = walletList?.map(w => ({
        id: getWalletId(w),
        name: getWalletName(w),
        idType: typeof getWalletId(w)
      })) || [];
      console.log("🟣 [targetWallet] All wallet IDs in walletList:", allWalletIds);
      
      const wallet = walletList?.find(w => {
        const walletId = getWalletId(w);
        if (walletId === null || walletId === undefined) {
          console.log("🟣 [targetWallet] Wallet has null/undefined ID:", getWalletName(w));
          return false;
        }
        // So sánh cả number và string để đảm bảo match
        const walletIdNum = Number(walletId);
        const formWalletIdNum = Number(formWalletId);
        // So sánh number trước (chính xác hơn)
        if (!isNaN(walletIdNum) && !isNaN(formWalletIdNum) && walletIdNum === formWalletIdNum) {
          console.log("🟣 [targetWallet] Match found by number comparison:", walletIdNum, "===", formWalletIdNum);
          return true;
        }
        // Fallback: so sánh string
        const stringMatch = String(walletId) === String(formWalletId);
        if (stringMatch) {
          console.log("🟣 [targetWallet] Match found by string comparison:", String(walletId), "===", String(formWalletId));
        }
        return stringMatch;
      });
      
      if (wallet) {
        console.log("🟣 [targetWallet] ✅ Found by targetWalletId:", {
          walletId: getWalletId(wallet),
          walletName: getWalletName(wallet),
          balance: wallet.balance,
          currency: wallet.currency
        });
        return wallet;
      } else {
        console.log("🟣 [targetWallet] ❌ NOT found by targetWalletId:", formWalletId, "Available IDs:", allWalletIds.map(w => w.id));
      }
    }
    
    // Nếu không có targetWalletId, tìm theo targetWallet name
    if (!form.targetWallet) {
      console.log("🟣 [targetWallet] No targetWallet name, returning null");
      return null;
    }
    
    // Kiểm tra xem có bao nhiêu ví cùng tên trong walletList
    const walletsWithSameName = walletList?.filter(w => {
      const walletName = getWalletName(w);
      return walletName === form.targetWallet;
    }) || [];
    
    console.log("🟣 [targetWallet] Searching by targetWallet name:", form.targetWallet, "Found:", walletsWithSameName.length, "wallets");
    
    // Chỉ trả về ví nếu chỉ có 1 ví với tên đó
    if (walletsWithSameName.length === 1) {
      const found = walletsWithSameName[0];
      console.log("🟣 [targetWallet] Found by name (unique):", {
        walletId: getWalletId(found),
        walletName: getWalletName(found),
        balance: found.balance
      });
      return found;
    }
    
    // Nếu có nhiều ví cùng tên và không có targetWalletId, thử tìm từ ref hoặc currentTargetWalletValue
    // (ref lưu giá trị được chọn ngay lập tức, không phụ thuộc vào form state)
    const refValue = selectedTargetWalletIdRef.current;
    const valueToSearch = refValue || currentTargetWalletValue;
    if (valueToSearch && valueToSearch !== "") {
      console.log("🟣 [targetWallet] Multiple wallets with same name, trying to find by ref/value:", refValue, "/", currentTargetWalletValue);
      const walletFromValue = walletList?.find(w => {
        const walletId = getWalletId(w);
        if (walletId === null || walletId === undefined) return false;
        return String(walletId) === String(valueToSearch) || Number(walletId) === Number(valueToSearch);
      });
      if (walletFromValue) {
        console.log("🟣 [targetWallet] ✅ Found by ref/value:", {
          walletId: getWalletId(walletFromValue),
          walletName: getWalletName(walletFromValue),
          balance: walletFromValue.balance,
          currency: walletFromValue.currency
        });
        return walletFromValue;
      }
    }
    
    // Nếu vẫn không tìm được, không thể xác định chính xác
    console.log("🟣 [targetWallet] Multiple wallets with same name, returning null");
    return null;
  }, [form.targetWallet, form.targetWalletId, walletList, currentTargetWalletValue, targetWalletSelectionTrigger]);

  // Frontend chỉ dùng VND, không còn chức năng chuyển đổi tiền tệ
  const amountNum = getMoneyValue(form.amount);

  // Kiểm tra số tiền có hợp lệ không (cho loại chi tiêu và chuyển tiền)
  const walletBalance = Number(selectedWallet?.balance || 0);
  const sourceWalletBalance = Number(sourceWallet?.balance || 0);
  
  // Validation cho form giao dịch thông thường (chi tiêu)
  const isExpenseAmountValid = form.type === "expense" 
    ? (amountNum > 0 && amountNum <= walletBalance)
    : (amountNum > 0);
  const showExpenseAmountError = form.type === "expense" && form.amount && !isExpenseAmountValid;
  
  // Validation cho form chuyển tiền
  const isTransferAmountValid = amountNum > 0 && amountNum <= sourceWalletBalance;
  const showTransferAmountError = form.amount && !isTransferAmountValid;
  
  // Tổng hợp validation
  // Khi edit transfer, không cần validate số tiền vì chỉ cho phép sửa ghi chú
  const isAmountValid = (mode === "edit" && variant === "internal")
    ? true  // Luôn valid khi edit transfer (chỉ sửa ghi chú)
    : (variant === "internal" 
        ? isTransferAmountValid 
        : isExpenseAmountValid);
  const showAmountError = variant === "internal" 
    ? showTransferAmountError 
    : showExpenseAmountError;


  // Keep form.category in sync when type changes or categories update
  useEffect(() => {
    if (variant === "internal") return; // internal uses fixed category
    if (!categoryOptions || categoryOptions.length === 0) return;
    if (!form.category || !categoryOptions.includes(form.category)) {
      setForm(f => ({ ...f, category: categoryOptions[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, expenseCategories, incomeCategories]);

  // Reset category dropdown khi mở/đóng modal
  useEffect(() => {
    if (!open) {
      setCategoryDropdownOpen(false);
      setCategorySearchText("");
    }
  }, [open]);

  // Tự động cập nhật currency khi chọn ví (chỉ cho variant external)
  useEffect(() => {
    if (variant !== "external") return;
    if (!selectedWallet || !selectedWallet.currency) return;
    // Chỉ cập nhật nếu currency khác với currency hiện tại
    if (form.currency !== selectedWallet.currency) {
      setForm(f => ({ ...f, currency: selectedWallet.currency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.walletName, selectedWallet, variant]);

  // Tự động cập nhật currency khi chọn ví gửi (cho variant internal - chuyển tiền)
  useEffect(() => {
    if (variant !== "internal") return;
    if (!sourceWallet || !sourceWallet.currency) return;
    // Cập nhật currency theo ví gửi
    if (form.currency !== sourceWallet.currency) {
      setForm(f => ({ ...f, currency: sourceWallet.currency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sourceWallet, sourceWallet, variant]);

  // Debug: Log khi form state thay đổi (cho variant internal)
  useEffect(() => {
    if (variant !== "internal") return;
    console.log("🔵 [FORM STATE CHANGE] Form state updated:", {
      sourceWalletId: form.sourceWalletId,
      sourceWallet: form.sourceWallet,
      targetWalletId: form.targetWalletId,
      targetWallet: form.targetWallet,
      currentSourceWalletValue: currentSourceWalletValue,
      currentTargetWalletValue: currentTargetWalletValue,
      sourceWalletBalance: sourceWallet?.balance,
      targetWalletBalance: targetWallet?.balance
    });
  }, [form.sourceWalletId, form.sourceWallet, form.targetWalletId, form.targetWallet, sourceWallet, targetWallet, currentSourceWalletValue, currentTargetWalletValue, variant]);

  // Auto-sync targetWalletId từ currentTargetWalletValue nếu có value nhưng chưa có targetWalletId
  useEffect(() => {
    if (variant !== "internal") return;
    if (!currentTargetWalletValue || currentTargetWalletValue === "") return;
    if (form.targetWalletId !== null && form.targetWalletId !== undefined && String(form.targetWalletId) === String(currentTargetWalletValue)) return;
    
    // Nếu có currentTargetWalletValue nhưng chưa có targetWalletId, tự động set
    const walletIdNum = Number(currentTargetWalletValue);
    if (!isNaN(walletIdNum)) {
      console.log("🔵 [AUTO-SYNC targetWalletId] Setting targetWalletId from currentTargetWalletValue:", walletIdNum);
      setForm((f) => ({ ...f, targetWalletId: walletIdNum }));
    }
  }, [currentTargetWalletValue, form.targetWalletId, variant]);

  // Auto-sync sourceWalletId từ currentSourceWalletValue nếu có value nhưng chưa có sourceWalletId
  useEffect(() => {
    if (variant !== "internal") return;
    if (!currentSourceWalletValue || currentSourceWalletValue === "") return;
    if (form.sourceWalletId !== null && form.sourceWalletId !== undefined && String(form.sourceWalletId) === String(currentSourceWalletValue)) return;
    
    // Nếu có currentSourceWalletValue nhưng chưa có sourceWalletId, tự động set
    const walletIdNum = Number(currentSourceWalletValue);
    if (!isNaN(walletIdNum)) {
      console.log("🔵 [AUTO-SYNC sourceWalletId] Setting sourceWalletId from currentSourceWalletValue:", walletIdNum);
      setForm((f) => ({ ...f, sourceWalletId: walletIdNum }));
    }
  }, [currentSourceWalletValue, form.sourceWalletId, variant]);

  /* ========== Handlers ========== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Handler cho sourceWallet onChange
  const handleSourceWalletChange = function handleSourceWalletChange(v) {
    console.log("🔴 [handleSourceWalletChange] START - Selected value:", v, "Type:", typeof v);
    console.log("🔴 [handleSourceWalletChange] Function name:", handleSourceWalletChange.name);
    console.log("🔴 [handleSourceWalletChange] walletOptions length:", walletOptions?.length);
    
    try {
      // v là walletId (string), cần tìm wallet và set cả sourceWallet và sourceWalletId
      // Tìm trong walletOptions trước (có label đã format với email)
      const selectedOption = walletOptions.find(opt => String(opt.value) === String(v));
      console.log("🔴 [handleSourceWalletChange] Selected option:", selectedOption ? {
        value: selectedOption.value,
        label: selectedOption.label,
        rawWalletId: getWalletId(selectedOption.raw),
        rawWalletName: getWalletName(selectedOption.raw)
      } : "NOT FOUND");
      
      const wallet = selectedOption?.raw;
      if (wallet) {
        const walletId = getWalletId(wallet);
        const walletName = getWalletName(wallet);
        console.log("🔴 [handleSourceWalletChange] Setting form with wallet from options:", {
          walletId,
          walletName,
          balance: wallet.balance
        });
        
        setForm((f) => {
          // Nếu ví nhận trùng với ví gửi mới, reset ví nhận
          const targetWalletId = f.targetWalletId ? String(f.targetWalletId) : "";
          const newTarget = v === targetWalletId ? "" : f.targetWallet;
          const newTargetId = v === targetWalletId ? null : f.targetWalletId;
          const newForm = { 
            ...f, 
            sourceWallet: walletName,
            sourceWalletId: walletId !== null && walletId !== undefined ? Number(walletId) : null,
            targetWallet: newTarget,
            targetWalletId: newTargetId
          };
          console.log("🔴 [handleSourceWalletChange] New form state:", newForm);
          return newForm;
        });
      } else {
        // Fallback: tìm trực tiếp trong walletList
        console.log("🔴 [handleSourceWalletChange] Option not found, searching in walletList...");
        const walletFromList = walletList?.find(w => {
          const wId = getWalletId(w);
          if (wId === null || wId === undefined) return false;
          // So sánh cả number và string
          return String(wId) === String(v) || Number(wId) === Number(v);
        });
        if (walletFromList) {
          const walletId = getWalletId(walletFromList);
          const walletName = getWalletName(walletFromList);
          console.log("🔴 [handleSourceWalletChange] Found in walletList, setting form:", {
            walletId,
            walletName,
            balance: walletFromList.balance
          });
          setForm((f) => {
            const targetWalletId = f.targetWalletId ? String(f.targetWalletId) : "";
            const newTarget = v === targetWalletId ? "" : f.targetWallet;
            const newTargetId = v === targetWalletId ? null : f.targetWalletId;
            const newForm = { 
              ...f, 
              sourceWallet: walletName,
              sourceWalletId: walletId !== null && walletId !== undefined ? Number(walletId) : null,
              targetWallet: newTarget,
              targetWalletId: newTargetId
            };
            console.log("🔴 [handleSourceWalletChange] New form state:", newForm);
            return newForm;
          });
        } else {
          // Nếu vẫn không tìm thấy, reset form
          console.log("🔴 [handleSourceWalletChange] NOT FOUND in walletList, resetting form");
          setForm((f) => ({ ...f, sourceWallet: "", sourceWalletId: null }));
        }
      }
    } catch (error) {
      console.error("🔴 [handleSourceWalletChange] ERROR:", error);
      console.error("🔴 [handleSourceWalletChange] Error stack:", error.stack);
    }
  };

  // Handler cho targetWallet onChange
  const handleTargetWalletChange = function handleTargetWalletChange(v) {
    console.log("🟣 [handleTargetWalletChange] START - Selected value:", v, "Type:", typeof v);
    console.log("🟣 [handleTargetWalletChange] Function name:", handleTargetWalletChange.name);
    console.log("🟣 [handleTargetWalletChange] targetWalletOptions length:", targetWalletOptions?.length);
    
    try {
      // v là walletId (string), cần tìm wallet và set cả targetWallet và targetWalletId
      // Tìm trong targetWalletOptions trước (có label đã format với email)
      const selectedOption = targetWalletOptions.find(opt => String(opt.value) === String(v));
      console.log("🟣 [handleTargetWalletChange] Selected option:", selectedOption ? {
        value: selectedOption.value,
        label: selectedOption.label,
        rawWalletId: getWalletId(selectedOption.raw),
        rawWalletName: getWalletName(selectedOption.raw)
      } : "NOT FOUND");
      
      const wallet = selectedOption?.raw;
      if (wallet) {
        const walletId = getWalletId(wallet);
        const walletName = getWalletName(wallet);
        console.log("🟣 [handleTargetWalletChange] Setting form with wallet from options:", {
          walletId,
          walletName,
          balance: wallet.balance,
          currency: wallet.currency,
          rawWallet: wallet
        });
        
        setForm((f) => {
          const newForm = { 
            ...f, 
            targetWallet: walletName,
            targetWalletId: walletId !== null && walletId !== undefined ? Number(walletId) : null
          };
          console.log("🟣 [handleTargetWalletChange] New form state:", newForm);
          console.log("🟣 [handleTargetWalletChange] About to return newForm, targetWalletId:", newForm.targetWalletId, "targetWallet:", newForm.targetWallet);
          return newForm;
        });
        
        // Force re-render để đảm bảo targetWallet được cập nhật
        console.log("🟣 [handleTargetWalletChange] Form state updated, waiting for re-render...");
      } else {
        // Fallback: tìm trực tiếp trong walletList
        console.log("🟣 [handleTargetWalletChange] Option not found, searching in walletList...");
        const walletFromList = walletList?.find(w => {
          const wId = getWalletId(w);
          if (wId === null || wId === undefined) return false;
          // So sánh cả number và string
          return String(wId) === String(v) || Number(wId) === Number(v);
        });
        if (walletFromList) {
          const walletId = getWalletId(walletFromList);
          const walletName = getWalletName(walletFromList);
          console.log("🟣 [handleTargetWalletChange] Found in walletList, setting form:", {
            walletId,
            walletName,
            balance: walletFromList.balance
          });
          setForm((f) => {
            const newForm = { 
              ...f, 
              targetWallet: walletName,
              targetWalletId: walletId !== null && walletId !== undefined ? Number(walletId) : null
            };
            console.log("🟣 [handleTargetWalletChange] New form state:", newForm);
            return newForm;
          });
        } else {
          // Nếu vẫn không tìm thấy, reset form
          console.log("🟣 [handleTargetWalletChange] NOT FOUND in walletList, resetting form");
          setForm((f) => ({ ...f, targetWallet: "", targetWalletId: null }));
        }
      }
    } catch (error) {
      console.error("🟣 [handleTargetWalletChange] ERROR:", error);
      console.error("🟣 [handleTargetWalletChange] Error stack:", error.stack);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, attachment: "" }));
      setAttachmentPreview("");
      return;
    }
    
    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t("transactions.form.file_too_large") || "File size must not exceed 5MB");
      e.target.value = ""; // Reset input
      return;
    }
    
    // Resize và compress ảnh trước khi convert sang base64
    const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Tính toán kích thước mới
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              } else {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            // Tạo canvas để resize và compress
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert sang base64 với quality
            const base64String = canvas.toDataURL('image/jpeg', quality);
            resolve(base64String);
          };
          img.onerror = reject;
          img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };
    
    try {
      const base64String = await compressImage(file);
      setForm((f) => ({ ...f, attachment: base64String }));
      setAttachmentPreview(base64String);
    } catch (error) {
      console.error("Error processing image:", error);
      alert(t("transactions.form.image_process_error") || "Error processing image. Please try again.");
      e.target.value = ""; // Reset input
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation: Kiểm tra số tiền cho loại chi tiêu và chuyển tiền (chỉ khi tạo mới)
    if (mode !== "edit" && !isAmountValid) {
      // Không submit nếu số tiền không hợp lệ
      return;
    }
    
    if (variant === "internal") {
      // Khi edit transfer, chỉ gửi note
      if (mode === "edit") {
        onSubmit?.({
          note: form.note || "",
        });
      } else {
        // Khi tạo mới, gửi đầy đủ thông tin
        onSubmit?.({
          sourceWallet: form.sourceWallet,
          targetWallet: form.targetWallet,
          amount: Number(form.amount || 0),
          date: form.date,
          note: form.note || "",
          currency: form.currency || "VND",
          attachment: form.attachment,
        });
      }
    } else {
      onSubmit?.({
        ...form,
        amount: Number(form.amount || 0),
        date: form.date,
      });
    }
  };

  if (!open) return null;

  /* ========== UI ========== */
  const modalUI = (
    <>
      <style>{`
        @keyframes tfmFadeIn { from { opacity: 0 } to { opacity: 1 } }

        .transaction-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          display: flex; align-items: center; justify-content: center;
          z-index: 2147483647;
          animation: tfmFadeIn .15s ease-out;
        }

        .transaction-modal-content {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
          width: 520px;
          max-width: 95%;
          overflow: hidden;
          z-index: 2147483648;
        }

        .type-pill.active:disabled {
          border-width: 2px !important;
          border-color: #black !important;
        }

        .type-pill:disabled:not(.active) {
          border: none !important;
        }
      `}</style>

      <div
        className="transaction-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="transaction-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header border-0 pb-0" style={{ padding: "16px 22px 8px" }}>
            <h5 className="modal-title fw-semibold">
              {mode === "create"
                ? variant === "internal"
                  ? t("transactions.form.title_create_transfer")
                  : t("transactions.form.title_create")
                : variant === "internal"
                ? t("transactions.form.title_edit_transfer")
                : t("transactions.form.title_edit")}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: "12px 22px 18px" }}>
              {variant === "external" ? (
                <>
                  {/* ===== GIAO DỊCH VÍ CÁ NHÂN ===== */}
                  <div className="mb-3">
                    <div className="form-label fw-semibold">{t("transactions.form.type_label")}</div>
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "income" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                        disabled={mode === "edit"}
                      >
                        {t("transactions.type.income")}
                      </button>
                      <button
                        type="button"
                        className={`btn type-pill ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                        disabled={mode === "edit"}
                      >
                        {t("transactions.type.expense")}
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <SearchableSelectInput
                        label={t("transactions.form.wallet")}
                        value={currentWalletValue}
                        displayText={currentWalletValue === "" && form.walletName ? form.walletName : undefined}
                        onChange={(v) => {
                          console.log("🔴 [onChange] Selected value:", v, "Type:", typeof v);
                          
                          // v là walletId (string), cần tìm wallet và set cả walletName và walletId
                          // Tìm trong walletOptions trước (có label đã format với email)
                          const selectedOption = walletOptions.find(opt => String(opt.value) === String(v));
                          console.log("🔴 [onChange] Selected option:", selectedOption ? {
                            value: selectedOption.value,
                            label: selectedOption.label,
                            rawWalletId: getWalletId(selectedOption.raw),
                            rawWalletName: getWalletName(selectedOption.raw)
                          } : "NOT FOUND");
                          
                          const wallet = selectedOption?.raw;
                          if (wallet) {
                            const walletId = getWalletId(wallet);
                            const walletName = getWalletName(wallet);
                            console.log("🔴 [onChange] Setting form with wallet from options:", {
                              walletId,
                              walletName,
                              balance: wallet.balance
                            });
                            setForm((f) => ({ 
                              ...f, 
                              walletName: walletName,
                              walletId: walletId !== null && walletId !== undefined ? Number(walletId) : null
                            }));
                          } else {
                            // Fallback: tìm trực tiếp trong walletList
                            console.log("🔴 [onChange] Option not found, searching in walletList...");
                            const walletFromList = walletList?.find(w => {
                              const wId = getWalletId(w);
                              if (wId === null || wId === undefined) return false;
                              // So sánh cả number và string
                              return String(wId) === String(v) || Number(wId) === Number(v);
                            });
                            if (walletFromList) {
                              const walletId = getWalletId(walletFromList);
                              const walletName = getWalletName(walletFromList);
                              console.log("🔴 [onChange] Found in walletList, setting form:", {
                                walletId,
                                walletName,
                                balance: walletFromList.balance
                              });
                              setForm((f) => ({ 
                                ...f, 
                                walletName: walletName,
                                walletId: walletId !== null && walletId !== undefined ? Number(walletId) : null
                              }));
                            } else {
                              // Nếu vẫn không tìm thấy, reset form
                              console.log("🔴 [onChange] NOT FOUND in walletList, resetting form");
                              setForm((f) => ({ ...f, walletName: "", walletId: null }));
                            }
                          }
                        }}
                        options={walletOptions}
                        placeholder={t("transactions.form.wallet_placeholder") || "Nhập hoặc chọn ví..."}
                        disabled={mode === "edit" || !hasWallets}
                        emptyMessage={!hasWallets ? (t("transactions.form.no_wallets") || "Không có ví khả dụng") : undefined}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
                      <div className="input-group">
                        <input
                          type="text"
                          name="amount"
                          className="form-control"
                          value={formatMoneyInput(form.amount)}
                          onChange={(e) => {
                            const parsed = getMoneyValue(e.target.value);
                            setForm((f) => ({ ...f, amount: parsed ? String(parsed) : "" }));
                          }}
                          required
                          inputMode="numeric"
                          disabled={mode === "edit"}
                          readOnly={mode === "edit"}
                          style={mode === "edit" ? { backgroundColor: "#f8f9fa", cursor: "not-allowed" } : {}}
                        />
                        <span className="input-group-text">{form.currency}</span>
                      </div>
                      {/* Hiển thị số dư cho loại chi tiêu (chỉ khi tạo mới) */}
                      {mode !== "edit" && form.type === "expense" && selectedWallet && (
                        <div className="form-text">
                          {t("wallets.inspector.current_balance_colon")} {" "}
                          <strong>
                            {formatMoney(selectedWallet.balance, selectedWallet.currency || "VND")}
                          </strong>
                        </div>
                      )}
                      {/* Hiển thị lỗi khi số tiền vượt quá số dư (chỉ khi tạo mới) */}
                      {mode !== "edit" && showAmountError && (
                        <div className="text-danger small mt-1">
                          {t("transactions.form.amount_invalid")}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">{t("transactions.form.category")}</label>
                        <div 
                          className={`searchable-select category-select ${categoryDropdownOpen ? "is-open" : ""}`}
                          ref={categorySelectRef}
                          style={{ position: "relative" }}
                        >
                          <div className="input-group" style={{ position: "relative" }}>
                            {form.category && selectedCategoryIcon && !categoryDropdownOpen && (
                              <span className="input-group-text bg-white border-end-0" style={{ borderRight: "none" }}>
                                <i className={`bi ${selectedCategoryIcon}`} style={{ color: "rgb(11, 90, 165)", fontSize: "1.1rem" }} />
                              </span>
                            )}
                            <input
                              type="text"
                              className="form-control"
                              placeholder={categoryDropdownOpen ? (t("transactions.form.category_placeholder") || "Chọn hoặc tìm kiếm danh mục...") : (form.category || (t("transactions.form.category_placeholder") || "Chọn hoặc tìm kiếm danh mục..."))}
                              value={categoryDropdownOpen ? categorySearchText : (form.category || "")}
                              onFocus={() => {
                                setCategoryDropdownOpen(true);
                                setCategorySearchText("");
                              }}
                              onChange={(e) => {
                                setCategorySearchText(e.target.value);
                                setCategoryDropdownOpen(true);
                              }}
                              disabled={!hasCategories}
                              style={{ 
                                borderLeft: form.category && selectedCategoryIcon && !categoryDropdownOpen ? "none" : undefined,
                                paddingLeft: form.category && selectedCategoryIcon && !categoryDropdownOpen ? "8px" : undefined,
                                paddingRight: categorySearchText ? "34px" : "12px"
                              }}
                            />
                            {categorySearchText && (
                              <button
                                type="button"
                                className="category-search-clear-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategorySearchText("");
                                }}
                                style={{
                                  position: "absolute",
                                  right: "10px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  border: "none",
                                  background: "transparent",
                                  padding: "0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#6c757d",
                                  fontSize: "0.8rem",
                                  zIndex: 10,
                                }}
                              >
                                <i className="bi bi-x-lg" />
                              </button>
                            )}
                          </div>

                          {categoryDropdownOpen && hasCategories && (
                            <div 
                              className="searchable-select-menu"
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                marginTop: "4px",
                                background: "#ffffff",
                                borderRadius: "12px",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
                                maxHeight: "200px",
                                overflowY: "auto",
                                zIndex: 1000,
                              }}
                            >
                              {filteredCategories.length === 0 ? (
                                <div className="px-3 py-2 text-muted small">
                                  {t("categories.search_none") || "Không tìm thấy danh mục"}
                                </div>
                              ) : (
                                filteredCategories.slice(0, 5).map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    className={`searchable-option ${form.category === cat.name ? "active" : ""}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setForm(f => ({ ...f, category: cat.name }));
                                      setCategorySearchText("");
                                      setCategoryDropdownOpen(false);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "10px 12px",
                                      border: "none",
                                      background: form.category === cat.name ? "#eff6ff" : "transparent",
                                      color: form.category === cat.name ? "#1e40af" : "#111827",
                                      fontSize: "0.9rem",
                                      cursor: "pointer",
                                      transition: "background-color 0.2s, color 0.2s",
                                      minWidth: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (form.category !== cat.name) {
                                        e.target.style.backgroundColor = "#f1f5f9";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (form.category !== cat.name) {
                                        e.target.style.backgroundColor = "transparent";
                                      }
                                    }}
                                  >
                                    <div 
                                      style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "6px",
                                        background: "linear-gradient(135deg, rgba(11, 90, 165, 0.1) 0%, rgba(10, 181, 192, 0.1) 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "rgb(11, 90, 165)",
                                        fontSize: "1rem",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <i className={`bi ${cat.icon}`} />
                                    </div>
                                    <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word", overflowWrap: "break-word", color: "inherit" }}>{cat.name}</span>
                                    {form.category === cat.name && (
                                      <i className="bi bi-check-circle-fill" style={{ color: "rgb(11, 90, 165)", fontSize: "1rem" }} />
                                    )}
                                  </button>
                                ))
                              )}
                              {filteredCategories.length > 5 && (
                                <div className="px-3 py-2 text-muted small text-center border-top">
                                  Và {filteredCategories.length - 5} danh mục khác...
                                </div>
                              )}
                            </div>
                          )}
                          {!hasCategories && (
                            <div className="text-muted small mt-1">
                              {t("categories.search_none") || "Không có danh mục"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
                      <textarea
                        name="note"
                        className="form-control"
                        rows={2}
                        value={form.note}
                        onChange={handleChange}
                        placeholder={t("transactions.form.note_placeholder")}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">{t("transactions.form.attachment")}</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      {attachmentPreview && (
                        <div className="mt-2">
                          <img
                            src={attachmentPreview}
                            alt={t("transactions.view.attachment")}
                            style={{
                              maxWidth: 180,
                              maxHeight: 140,
                              borderRadius: 12,
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* ===== CHUYỂN TIỀN ===== */
                <div className="row g-3">
                  <div className="col-12">
                    <div className="form-label fw-semibold mb-0">{t("transactions.form.transfer_legend")}</div>
                    <div className="text-muted small">
                      {t("transactions.form.transfer_hint")}
                    </div>
                  </div>

                  <div className="col-md-6">
                      <div className="mb-3">
                      <SearchableSelectInput
                        label={t("transactions.form.source_wallet")}
                        value={currentSourceWalletValue}
                        displayText={currentSourceWalletValue === "" && form.sourceWallet && form.sourceWallet.trim() !== "" ? form.sourceWallet : undefined}
                        onChange={(v) => {
                          console.log("🔴 [sourceWallet onChange INLINE] Called with value:", v);
                          // Lưu giá trị vào ref ngay lập tức và trigger re-render
                          selectedSourceWalletIdRef.current = v;
                          setSourceWalletSelectionTrigger(prev => {
                            const newValue = prev + 1;
                            console.log("🔴 [sourceWallet onChange INLINE] Saved to ref:", selectedSourceWalletIdRef.current, "Trigger:", newValue);
                            return newValue;
                          });
                          console.log("🔴 [sourceWallet onChange INLINE] handleSourceWalletChange exists:", typeof handleSourceWalletChange, "name:", handleSourceWalletChange?.name);
                          if (typeof handleSourceWalletChange === 'function') {
                            handleSourceWalletChange(v);
                          } else {
                            console.error("🔴 [sourceWallet onChange INLINE] handleSourceWalletChange is not a function!");
                          }
                        }}
                        options={walletOptions}
                        placeholder={t("transactions.form.source_wallet_placeholder") || "Nhập hoặc chọn ví gửi..."}
                        disabled={mode === "edit" || !hasWallets}
                        emptyMessage={!hasWallets ? (t("transactions.form.no_wallets") || "Không có ví khả dụng") : undefined}
                      />
                    </div>
                    {sourceWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        {t("wallets.inspector.current_balance_colon")} <strong>{formatMoney(sourceWallet.balance, sourceWallet.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                      <div className="mb-3">
                      <SearchableSelectInput
                        label={t("transactions.form.target_wallet")}
                        value={currentTargetWalletValue}
                        displayText={currentTargetWalletValue === "" && form.targetWallet ? form.targetWallet : undefined}
                        onChange={(v) => {
                          console.log("🟣 [targetWallet onChange INLINE] Called with value:", v);
                          // Lưu giá trị vào ref ngay lập tức và trigger re-render
                          selectedTargetWalletIdRef.current = v;
                          setTargetWalletSelectionTrigger(prev => {
                            const newValue = prev + 1;
                            console.log("🟣 [targetWallet onChange INLINE] Saved to ref:", selectedTargetWalletIdRef.current, "Trigger:", newValue);
                            return newValue;
                          });
                          console.log("🟣 [targetWallet onChange INLINE] handleTargetWalletChange exists:", typeof handleTargetWalletChange);
                          if (typeof handleTargetWalletChange === 'function') {
                            handleTargetWalletChange(v);
                          } else {
                            console.error("🟣 [targetWallet onChange INLINE] handleTargetWalletChange is not a function!");
                          }
                        }}
                        options={targetWalletOptions}
                        placeholder={t("transactions.form.target_wallet_placeholder") || "Nhập hoặc chọn ví nhận..."}
                        disabled={
                          mode === "edit" ||
                          !hasWallets ||
                          !hasTargetWallets ||
                          walletOptions.length < 2
                        }
                        emptyMessage={(!hasWallets || walletOptions.length < 2) ? (t("transactions.form.no_wallets") || "Không có ví khả dụng") : undefined}
                      />
                    </div>
                    {(!hasWallets || walletOptions.length < 2) && (
                      <div className="text-muted small mt-n2 mb-2">
                        {t("transactions.form.need_two_wallets")}
                      </div>
                    )}
                    {targetWallet && mode !== "edit" && (
                      <div className="text-muted small mt-1">
                        {t("wallets.inspector.current_balance_colon")} <strong>{formatMoney(targetWallet.balance, targetWallet.currency)}</strong>
                      </div>
                    )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">{t("transactions.form.amount")}</label>
                    <div className="input-group">
                      <input
                        type="text"
                        name="amount"
                        className="form-control"
                        value={formatMoneyInput(form.amount)}
                        onChange={(e) => {
                          const parsed = getMoneyValue(e.target.value);
                          setForm((f) => ({ ...f, amount: parsed ? String(parsed) : "" }));
                        }}
                        required
                        inputMode="numeric"
                        placeholder={sourceWallet ? `${t("wallets.inspector.transfer_amount_placeholder")} ${sourceWallet.currency || ""}` : ""}
                        disabled={mode === "edit"}
                        readOnly={mode === "edit"}
                        style={mode === "edit" ? { backgroundColor: "#f8f9fa", cursor: "not-allowed" } : {}}
                      />
                      <span className="input-group-text">VND</span>
                    </div>
                    {/* Hiển thị lỗi khi số tiền vượt quá số dư ví gửi (chỉ khi tạo mới) */}
                    {mode !== "edit" && showTransferAmountError && (
                      <div className="text-danger small mt-1">
                        {t("transactions.form.amount_invalid")}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">{t("transactions.form.date")}</label>
                    <input
                      type="datetime-local"
                      name="date"
                      className="form-control"
                      value={form.date}
                      readOnly
                      disabled={mode === "edit"}
                      style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                      required
                    />
                    {mode !== "edit" && (
                        <small className="text-muted">{t("transactions.form.auto_time_note")}</small>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">{t("transactions.form.note")}</label>
                    <textarea
                      name="note"
                      className="form-control"
                      rows={2}
                      value={form.note}
                      onChange={handleChange}
                      placeholder={t("transactions.form.transfer_note_placeholder")}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0" style={{ padding: "8px 22px 16px" }}>
              <button type="button" className="btn btn-light" onClick={onClose}>
                {t("transactions.btn.cancel")}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!isAmountValid}
              >
                {t("transactions.btn.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalUI, document.body);
}
