// src/pages/Home/WalletsPage.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useWalletData } from "../../home/store/WalletDataContext";
import { transactionAPI } from "../../services/api-client";

import WalletCard from "../../components/wallets/WalletCard";
import WalletEditModal from "../../components/wallets/WalletEditModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import Toast from "../../components/common/Toast/Toast";
import WalletCreateChooser from "../../components/wallets/WalletCreateChooser";
import WalletCreatePersonalModal from "../../components/wallets/WalletCreatePersonalModal";
import WalletCreateGroupModal from "../../components/wallets/WalletCreateGroupModal";

import WalletInspector from "../../components/wallets/WalletInspector";
import useToggleMask from "../../hooks/useToggleMask";

import "../../styles/home/WalletsPage.css";

const CURRENCIES = ["VND", "USD"];

/** Bảng màu cho ví mới (theo 2 ảnh bạn gửi) */
const WALLET_COLORS = ["#2D99AE"];

/** Chọn màu ít dùng nhất để hạn chế trùng màu liên tiếp */
function pickWalletColor(existing = []) {
  const counts = new Map(WALLET_COLORS.map((c) => [c, 0]));
  for (const w of existing) {
    if (w?.color && counts.has(w.color)) {
      counts.set(w.color, counts.get(w.color) + 1);
    }
  }
  let min = Infinity;
  for (const v of counts.values()) min = Math.min(min, v);
  const candidates = WALLET_COLORS.filter((c) => counts.get(c) === min);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Hook animate mở/đóng bằng max-height + opacity (mượt cả khi đóng) */
function useAutoHeight(isOpen, deps = []) {
  const ref = useRef(null);
  const [maxH, setMaxH] = useState(isOpen ? "none" : "0px");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    let timerId = 0;

    const runOpen = () => {
      const h = el.scrollHeight;
      setMaxH(h + "px");
      timerId = window.setTimeout(() => setMaxH("none"), 400);
    };

    if (isOpen) {
      setMaxH("0px");
      rafId = requestAnimationFrame(runOpen);
    } else {
      const current = getComputedStyle(el).maxHeight;
      if (current === "none") {
        const h = el.scrollHeight;
        setMaxH(h + "px");
        rafId = requestAnimationFrame(() => setMaxH("0px"));
      } else {
        setMaxH("0px");
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ...deps]);

  return {
    ref,
    props: {
      className: "exp-anim",
      style: { maxHeight: maxH },
      "aria-hidden": isOpen ? "false" : "true",
    },
  };
}

const formatMoney = (amount = 0, currency = "VND") => {
  const numAmount = Number(amount) || 0;
  
  // Custom format cho USD: hiển thị $ ở trước, không có số thập phân nếu là số nguyên
  if (currency === "USD") {
    const formatted = numAmount % 1 === 0 
      ? numAmount.toLocaleString("en-US")
      : numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formatted}`;
  }
  
  // Format cho VND và các currency khác
  try {
    if (currency === "VND") {
      return `${numAmount.toLocaleString("vi-VN")} VND`;
    }
    // Các currency khác
    return `${numAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  } catch {
    return `${numAmount.toLocaleString("vi-VN")} ${currency}`;
  }
};

export default function WalletsPage() {
  const { 
    wallets, 
    createWallet, 
    updateWallet, 
    deleteWallet,
    setDefaultWallet,
    transferMoney,
    mergeWallets,
    convertToGroup,
    loadWallets
  } = useWalletData();

  // ====== “mắt” tổng ======
  const [showTotalAll, toggleTotalAll] = useToggleMask(true);
  const [showTotalPersonal, toggleTotalPersonal] = useToggleMask(true);
  const [showTotalGroup, toggleTotalGroup] = useToggleMask(true);

  // ====== Tạo / chooser ======
  const [showChooser, setShowChooser] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const anchorRef = useRef(null);

  // ====== Modals / toast ======
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  // ====== Sort ======
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [sortScope, setSortScope] = useState("all");
  const toggleSortDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  // ====== Expand 1 phần (personal/group) ======
  const [expandedSection, setExpandedSection] = useState(null); // 'personal' | 'group' | null
  const isPersonalExpanded = expandedSection === "personal";
  const isGroupExpanded = expandedSection === "group";
  const toggleExpand = (key) =>
    setExpandedSection((prev) => (prev === key ? null : key));

  // Inspector (panel phải)
  const [selectedWallet, setSelectedWallet] = useState(null);
  useEffect(() => {
    if (expandedSection === null) setSelectedWallet(null);
  }, [expandedSection]);

  // Đồng bộ selectedWallet với wallets state khi wallets thay đổi
  useEffect(() => {
    if (selectedWallet?.id) {
      const updated = wallets.find(w => w.id === selectedWallet.id);
      if (updated) {
        // So sánh số dư bằng số để tránh vấn đề với floating point
        const currentBalance = Number(selectedWallet.balance || 0);
        const newBalance = Number(updated.balance || 0);
        
        // Cập nhật selectedWallet nếu có bất kỳ thay đổi nào (không chỉ balance)
        // hoặc nếu số dư đã thay đổi đáng kể (> 0.01 để tránh floating point issues)
        if (Math.abs(currentBalance - newBalance) > 0.01 || 
            updated.name !== selectedWallet.name ||
            updated.currency !== selectedWallet.currency) {
          console.log("Syncing selectedWallet - old balance:", currentBalance, "new balance:", newBalance);
          setSelectedWallet(updated);
        }
      }
    }
  }, [wallets, selectedWallet?.id, selectedWallet?.balance]);

  const topRef = useRef(null);
  useEffect(() => {
    if (expandedSection && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedSection]);

  // [ADDED] Reset scroll mượt khi thu gọn về null
  useEffect(() => {
    if (expandedSection === null) {
      const sc = document.querySelector(".wallet-page");
      if (sc) {
        requestAnimationFrame(() => {
          sc.scrollTo({ top: 0, behavior: "smooth" });
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [expandedSection]);

  const personalInspectorRef = useRef(null);
  const groupInspectorRef = useRef(null);
  const focusInspector = (section, delay = 280) => {
    setTimeout(() => {
      const el =
        section === "personal"
          ? personalInspectorRef.current
          : groupInspectorRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.remove("flash");
      // trigger reflow
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 900);
    }, delay);
  };

  // ====== Data helpers ======
  const existingNames = useMemo(
    () => wallets.map((w) => w.name.toLowerCase().trim()),
    [wallets]
  );

  const compareByKey = (a, b, key) => {
    if (key === "name") return (a.name || "").localeCompare(b.name || "");
    if (key === "balance")
      return Number(a.balance || 0) - Number(b.balance || 0);
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  };
  const sortWith = (arr, key, dir) => {
    const out = [...arr].sort((a, b) => compareByKey(a, b, key));
    return dir === "asc" ? out : out.reverse();
  };
  const sortDefaultDesc = (arr) => sortWith(arr, "createdAt", "desc");

  const personalListRaw = useMemo(
    () => wallets.filter((w) => !w.isShared),
    [wallets]
  );
  const groupListRaw = useMemo(
    () => wallets.filter((w) => w.isShared),
    [wallets]
  );

  const personalWallets = useMemo(() => {
    const list = personalListRaw;
    if (sortScope === "all" || sortScope === "personal")
      return sortWith(list, sortKey, sortDir);
    return sortDefaultDesc(list);
  }, [personalListRaw, sortKey, sortDir, sortScope]);

  const groupWallets = useMemo(() => {
    const list = groupListRaw;
    if (sortScope === "all" || sortScope === "group")
      return sortWith(list, sortKey, sortDir);
    return sortDefaultDesc(list);
  }, [groupListRaw, sortKey, sortDir, sortScope]);

  const currencyOfChoice = useMemo(
    () => (wallets[0]?.currency ? wallets[0].currency : "VND"),
    [wallets]
  );

  // Helper function để tính tỷ giá (chuyển đổi về VND)
  const getRate = (from, to) => {
    if (!from || !to || from === to) return 1;
    // Tỷ giá cố định (theo ExchangeRateServiceImpl)
    const rates = {
      VND: 1,
      USD: 0.000041, // 1 VND = 0.000041 USD
      EUR: 0.000038,
      JPY: 0.0063,
      GBP: 0.000032,
      CNY: 0.00030,
    };
    if (!rates[from] || !rates[to]) return 1;
    // Tính tỷ giá: from → VND → to
    const fromToVND = 1 / rates[from];
    const toToVND = 1 / rates[to];
    return fromToVND / toToVND;
  };

  // Helper function để chuyển đổi số tiền về VND
  const convertToVND = (amount, currency) => {
    if (!currency || currency === "VND") return Number(amount) || 0;
    const rate = getRate(currency, "VND");
    const converted = (Number(amount) || 0) * rate;
    // Làm tròn về số nguyên vì VND không có số thập phân
    return Math.round(converted);
  };

  // Helper function để chuyển đổi từ VND sang currency khác
  const convertFromVND = (amountVND, targetCurrency) => {
    if (!targetCurrency || targetCurrency === "VND") return Number(amountVND) || 0;
    const rate = getRate("VND", targetCurrency);
    const converted = (Number(amountVND) || 0) * rate;
    // Làm tròn theo số chữ số thập phân của currency đích
    const decimals = targetCurrency === "VND" ? 0 : 2;
    return Math.round(converted * Math.pow(10, decimals)) / Math.pow(10, decimals);
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
    window.addEventListener('currencySettingChanged', handleCurrencyChange);
    return () => {
      window.removeEventListener('currencySettingChanged', handleCurrencyChange);
    };
  }, []);

  // ====== Tổng chỉ cộng ví đang bật công tắc (chuyển đổi tất cả về VND, sau đó quy đổi sang displayCurrency) ======
  const totalAll = useMemo(
    () => {
      const totalInVND = wallets
        .filter((w) => w.includeOverall !== false)
        .reduce((s, w) => {
          const balanceInVND = convertToVND(w.balance, w.currency || "VND");
          return s + balanceInVND;
        }, 0);
      // Quy đổi từ VND sang đơn vị tiền tệ hiển thị
      return convertFromVND(totalInVND, displayCurrency);
    },
    [wallets, displayCurrency]
  );

  const totalPersonal = useMemo(
    () => {
      const totalInVND = personalListRaw
        .filter((w) => w.includePersonal !== false)
        .reduce((s, w) => {
          const balanceInVND = convertToVND(w.balance, w.currency || "VND");
          return s + balanceInVND;
        }, 0);
      // Quy đổi từ VND sang đơn vị tiền tệ hiển thị
      return convertFromVND(totalInVND, displayCurrency);
    },
    [personalListRaw, displayCurrency]
  );

  const totalGroup = useMemo(
    () => {
      const totalInVND = groupListRaw
        .filter((w) => w.includeGroup !== false)
        .reduce((s, w) => {
          const balanceInVND = convertToVND(w.balance, w.currency || "VND");
          return s + balanceInVND;
        }, 0);
      // Quy đổi từ VND sang đơn vị tiền tệ hiển thị
      return convertFromVND(totalInVND, displayCurrency);
    },
    [groupListRaw, displayCurrency]
  );

  // ====== CRUD ======
  const handleAddWalletClick = () => setShowChooser((v) => !v);


const doDelete = async (wallet) => {
  if (!wallet || !wallet.id) {
    console.error("Lỗi doDelete: Không có thông tin ví.");
    return;
  }

  setConfirmDel(null); // Đóng modal

  try {
    // Gọi API thật từ Context (đã xử lý error trong Context)
    await deleteWallet(wallet.id); 

    // THÀNH CÔNG: Cập nhật UI
    setToast({ open: true, message: `Đã xóa ví "${wallet.name}"`, type: "success" });
    
    if (selectedWallet?.id === wallet.id) {
      setSelectedWallet(null);
    }
  } catch (error) {
    // THẤT BẠI (Lỗi mạng hoặc lỗi code)
    console.error("Lỗi nghiêm trọng khi gọi deleteWallet:", error);
    setToast({ open: true, message: error.message || "Lỗi kết nối máy chủ", type: "error" });
  }
};

  /** Tạo ví cá nhân: thêm color ngẫu nhiên từ bảng */
  const handleCreatePersonal = async (f) => {
    const w = await createWallet({
      name: f.name.trim(),
      currency: f.currency,
      type: f.type || "CASH",
      note: f.note?.trim() || "",
      isDefault: !!f.isDefault,
      isShared: false,
      groupId: null,
      includeOverall: true,
      includePersonal: true,
      color: pickWalletColor(wallets),
    });

    // Đảm bảo chỉ duy nhất 1 ví mặc định
    // Backend tự động xử lý khi tạo ví với setAsDefault: true
    // Nhưng để đảm bảo UI được cập nhật ngay, ta reload wallets
    // (Logic này đã được xử lý trong createWallet của Context)

    setShowPersonal(false);
    setToast({ open: true, message: `Đã tạo ví cá nhân "${w.name}"`, type: "success" });
  };

  /** Sau khi tạo ví nhóm: chêm include flags + color nếu thiếu */
  const afterCreateGroupWallet = async (w) => {
    if (!w) return;
    const patch = {};
    if (w.includeOverall === undefined || w.includeGroup === undefined) {
      patch.includeOverall = true;
      patch.includeGroup = true;
    }
    if (!w.color) {
      patch.color = pickWalletColor(wallets);
    }
    if (Object.keys(patch).length) {
      const updated = { ...w, ...patch };
      await updateWallet(updated);
    }
    setToast({ open: true, message: `Đã tạo ví nhóm "${w?.name || ""}"`, type: "success" });
  };

  const handleSubmitEdit = async (data) => {
    try {
      const walletId = editing?.id;
      if (!walletId) {
        throw new Error("Không tìm thấy ví cần cập nhật");
      }

      // Map từ format của WalletEditModal sang format của updateWallet
      // Theo WALLET_DEFAULT_FEATURE_CHANGES.md: Bỏ balance khỏi form sửa ví
      const updatePayload = {
        id: walletId,
        name: data.walletName,
        walletName: data.walletName,
        currency: data.currencyCode,
        currencyCode: data.currencyCode,
        // KHÔNG gửi balance vì form sửa ví không còn trường số dư
        note: data.description,
        description: data.description,
        // Gửi isDefault để updateWallet xử lý set/unset default
        isDefault: data.setAsDefault || false,
        // Giữ lại color từ ví đang chỉnh sửa
        color: editing?.color || data.color || null,
      };
      
      const updated = await updateWallet(updatePayload);

      // Backend tự động xử lý việc đảm bảo chỉ có 1 ví mặc định
      // khi setAsDefault: true được gửi
      
      setEditing(null);
      setToast({ open: true, message: "Cập nhật ví thành công", type: "success" });
      if (selectedWallet?.id === walletId && updated) {
        setSelectedWallet(updated);
      }
    } catch (error) {
      console.error("Error updating wallet:", error);
      setToast({
        open: true,
        message: error.message || "Không thể cập nhật ví",
        type: "error",
      });
    }
  };

  // Inspector actions
  const handleWithdraw = async (wallet, amount, categoryId, note) => {
    try {
      // Lấy thời gian hiện tại theo múi giờ Việt Nam
      const getVietnamDateTime = () => {
        const now = new Date();
        const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        return vietnamTime.toISOString();
      };
      
      // Gọi API tạo transaction expense
      const response = await transactionAPI.addExpense(
        Number(amount),
        getVietnamDateTime(),
        wallet.id,
        Number(categoryId),
        note || "",
        null // imageUrl - không có ảnh cho rút ví
      );
      
      if (response && response.transaction) {
        // Reload wallets để lấy dữ liệu mới nhất (balance đã được cập nhật bởi backend)
        await loadWallets();
        
        // Cập nhật selectedWallet với balance mới (tính từ transaction)
        const newBalance = Number(wallet.balance || 0) - Number(amount);
        setSelectedWallet({
          ...wallet,
          balance: newBalance
        });
        
        setToast({ open: true, message: "Rút tiền thành công. Giao dịch đã được lưu vào lịch sử.", type: "success" });
      } else {
        throw new Error(response?.error || "Không thể tạo giao dịch");
      }
    } catch (error) {
      console.error("Error withdrawing money:", error);
      setToast({
        open: true,
        message: error.message || error.error || "Không thể rút tiền",
        type: "error",
      });
    }
  };

  const handleDeposit = async (wallet, amount, categoryId, note) => {
    try {
      // Lấy thời gian hiện tại theo múi giờ Việt Nam
      const getVietnamDateTime = () => {
        const now = new Date();
        const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        return vietnamTime.toISOString();
      };
      
      // Gọi API tạo transaction income
      const response = await transactionAPI.addIncome(
        Number(amount),
        getVietnamDateTime(),
        wallet.id,
        Number(categoryId),
        note || "",
        null // imageUrl - không có ảnh cho nạp ví
      );
      
      if (response && response.transaction) {
        // Reload wallets để lấy dữ liệu mới nhất (balance đã được cập nhật bởi backend)
        await loadWallets();
        
        // Cập nhật selectedWallet với balance mới (tính từ transaction)
        const newBalance = Number(wallet.balance || 0) + Number(amount);
        setSelectedWallet({
          ...wallet,
          balance: newBalance
        });
        
        setToast({ open: true, message: "Nạp tiền thành công. Giao dịch đã được lưu vào lịch sử.", type: "success" });
      } else {
        throw new Error(response?.error || "Không thể tạo giao dịch");
      }
    } catch (error) {
      console.error("Error depositing money:", error);
      setToast({
        open: true,
        message: error.message || error.error || "Không thể nạp tiền",
        type: "error",
      });
    }
  };

  const handleMerge = async (mergeData) => {
    try {
      const result = await mergeWallets(mergeData);
      
      // mergeWallets trong Context đã reload wallets rồi
      // Xác định wallet cuối cùng sau khi gộp
      const { targetId, mode, baseWallet } = mergeData;
      const finalWalletId = mode === "this_to_other" ? targetId : baseWallet.id;
      
      // Ưu tiên sử dụng wallet từ result (đã được cập nhật từ API)
      let finalWallet = result?.finalWallet;
      
      console.log("handleMerge - result:", result);
      console.log("handleMerge - finalWalletId:", finalWalletId);
      console.log("handleMerge - finalWallet from result:", finalWallet);
      
      // Nếu không có trong result, đợi một chút để wallets state được cập nhật rồi tìm
      if (!finalWallet) {
        await new Promise(resolve => setTimeout(resolve, 100));
        finalWallet = wallets.find(w => w.id === finalWalletId);
        console.log("handleMerge - finalWallet from wallets state:", finalWallet);
      }
      
      if (finalWallet) {
        console.log("handleMerge - Setting selectedWallet:", finalWallet);
        setSelectedWallet(finalWallet);
        setToast({
          open: true,
          message: `Đã gộp ví thành công`,
          type: "success",
        });
      } else {
        console.warn("handleMerge - Không tìm thấy wallet sau khi gộp");
        setSelectedWallet(null);
        // Vẫn hiển thị thông báo thành công vì API đã trả về 200
        // Nhưng cảnh báo user nếu cần
        setToast({
          open: true,
          message: `Gộp ví đã được thực hiện. Vui lòng làm mới trang nếu không thấy thay đổi.`,
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error merging wallets:", error);
      setToast({
        open: true,
        message: error.message || "Không thể gộp ví",
        type: "error",
      });
    }
  };

  const handleConvert = async (wallet, toShared) => {
    try {
      if (toShared && !wallet.isShared) {
        // Chuyển từ cá nhân sang nhóm
        const result = await convertToGroup(wallet.id);
        
        // convertToGroup trong Context đã reload wallets rồi
        // Sử dụng wallet từ result hoặc tìm trong wallets state
        let updatedWallet = result?.wallet;
        
        console.log("handleConvert - result:", result);
        console.log("handleConvert - updatedWallet from result:", updatedWallet);
        
        if (!updatedWallet) {
          // Đợi một chút để wallets state được cập nhật
          await new Promise(resolve => setTimeout(resolve, 100));
          updatedWallet = wallets.find(w => w.id === wallet.id);
          console.log("handleConvert - updatedWallet from wallets state:", updatedWallet);
        }
        
        if (updatedWallet) {
          console.log("handleConvert - Setting selectedWallet:", updatedWallet);
          setSelectedWallet(updatedWallet);
        }
        
        setToast({ 
          open: true, 
          message: result?.message || "Chuyển đổi ví thành nhóm thành công",
          type: "success",
        });
      } else if (!toShared && wallet.isShared) {
        // Chuyển từ nhóm sang cá nhân
        // Theo API_DOCUMENTATION.md: Không thể chuyển từ GROUP → PERSONAL
        // Sẽ báo lỗi: "Không thể chuyển ví nhóm về ví cá nhân. Vui lòng xóa các thành viên trước."
        setToast({ 
          open: true, 
          message: "Không thể chuyển ví nhóm về ví cá nhân. Vui lòng xóa các thành viên trước.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error converting wallet:", error);
      setToast({
        open: true,
        message: error.message || "Không thể chuyển đổi ví",
        type: "error",
      });
    }
  };

  const handleTransfer = async (transferData) => {
    try {
      const result = await transferMoney(transferData);
      
      // transferMoney trong Context đã reload wallets rồi
      // Xác định wallet nào cần hiển thị sau khi chuyển
      const targetId = transferData.mode === "this_to_other" 
        ? transferData.targetId 
        : transferData.sourceId;
      
      // Ưu tiên sử dụng wallet từ result (đã được cập nhật từ API)
      let updatedWallet = result?.targetWallet || result?.sourceWallet;
      
      console.log("handleTransfer - result:", result);
      console.log("handleTransfer - targetId:", targetId);
      console.log("handleTransfer - updatedWallet from result:", updatedWallet);
      
      // Nếu không có trong result, đợi một chút để wallets state được cập nhật rồi tìm
      if (!updatedWallet) {
        // Đợi React cập nhật state
        await new Promise(resolve => setTimeout(resolve, 100));
        updatedWallet = wallets.find(w => w.id === targetId);
        console.log("handleTransfer - updatedWallet from wallets state:", updatedWallet);
      }
      
      if (updatedWallet) {
        console.log("handleTransfer - Setting selectedWallet:", updatedWallet);
        setSelectedWallet(updatedWallet);
      } else {
        console.warn("handleTransfer - Không tìm thấy wallet với id:", targetId);
      }
      
      setToast({
        open: true,
        message: "Chuyển tiền thành công",
        type: "success",
      });
    } catch (error) {
      console.error("Error transferring money:", error);
      setToast({
        open: true,
        message: error.message || "Không thể chuyển tiền",
        type: "error",
      });
    }
  };

  // ====== Toggle trong menu “...” ======
  const handleToggleOverall = async (wallet, nextOn) => {
    const next = { ...wallet, includeOverall: !!nextOn };
    await updateWallet(next);
    if (selectedWallet?.id === wallet.id) setSelectedWallet(next);
  };

  const handleToggleSection = async (wallet, nextOn) => {
    const next = { ...wallet };
    if (wallet.isShared) next.includeGroup = !!nextOn;
    else next.includePersonal = !!nextOn;
    await updateWallet(next);
    if (selectedWallet?.id === wallet.id) setSelectedWallet(next);
  };

  // ====== Auto-height containers ======
  const personalExpand = useAutoHeight(isPersonalExpanded, [
    personalWallets.length,
  ]);
  const groupExpand = useAutoHeight(isGroupExpanded, [groupWallets.length]);

  // ====== Click card: mở rộng (trừ vùng tương tác) ======
  const isInteractiveEvent = (e) => {
    const t = e.target;
    return !!t.closest(
      ".dropdown, .dropdown-menu, .wc-dots, button, a, input, textarea, select, label, .form-check"
    );
  };

  // === Quản lý refs của từng thẻ để auto-scroll ===
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const cardRefs = useRef({});
  const setCardRef = (id) => (el) => {
    if (el) cardRefs.current[id] = el;
  };
  const scrollToSelected = (id, delayMs = 0) => {
    const el = id ? cardRefs.current[id] : null;
    if (!el) return;
    const run = () =>
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    delayMs > 0 ? setTimeout(run, delayMs) : run();
  };

  const handleCardClick = (section, wallet) => {
    setSelectedWallet(wallet);
    setSelectedWalletId(wallet.id);

    const willOpenPersonal = section === "personal" && !isPersonalExpanded;
    const willOpenGroup = section === "group" && !isGroupExpanded;
    if (willOpenPersonal) setExpandedSection("personal");
    if (willOpenGroup) setExpandedSection("group");

    const needDelay = willOpenPersonal || willOpenGroup;
    const delay = needDelay ? 480 : 0; // khớp thời gian mở rộng
    scrollToSelected(wallet.id, delay);
    focusInspector(section, needDelay ? 300 : 0);
  };

  const handleCardAreaClick = (section, wallet) => (e) => {
    if (isInteractiveEvent(e)) return;
    handleCardClick(section, wallet);
  };

  // Nếu đã mở rộng mà đổi lựa chọn -> cuộn ngay
  useEffect(() => {
    if (!selectedWalletId) return;
    if (isPersonalExpanded || isGroupExpanded) {
      scrollToSelected(selectedWalletId, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWalletId, isPersonalExpanded, isGroupExpanded]);

  // Helper: đưa ví mặc định lên đầu (không phá thứ tự phần còn lại)
  const defaultFirst = (arr) => {
    const d = [];
    const r = [];
    for (const w of arr) {
      (w?.isDefault ? d : r).push(w);
    }
    return [...d, ...r];
  };

  // MIGRATE: tự gán màu cho các ví cũ chưa có color
  useEffect(() => {
    const toPatch = wallets.filter((w) => !w.color);
    if (!toPatch.length) return;
    (async () => {
      for (const w of toPatch) {
        try {
          await updateWallet({ ...w, color: pickWalletColor(wallets) });
        } catch {}
      }
    })();
  }, [wallets, updateWallet]);

  // ============ [ADDED] Đồng bộ nền inspector với thẻ ví đã chọn ============
  const [inspectorBg, setInspectorBg] = useState(null);

  useEffect(() => {
    if (!selectedWalletId) {
      setInspectorBg(null);
      return;
    }
    const wrap = cardRefs.current[selectedWalletId];
    const card = wrap?.querySelector?.(".wallet-card");
    if (!card) {
      setInspectorBg(null);
      return;
    }
    const cs = getComputedStyle(card);
    const bgImg =
      cs.backgroundImage && cs.backgroundImage !== "none"
        ? cs.backgroundImage
        : null;
    const bg = bgImg || cs.background || null;
    setInspectorBg(bg);
  }, [selectedWalletId]);
  // ========================================================================

  // ===== Render =====
  return (
    <div className="wallet-page container py-4">
      <div ref={topRef} />

      {/* ===== Header ===== */}
      <div className="wallet-header card border-0 shadow-sm p-3 p-lg-4 mb-2">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <h3 className="wallet-header__title mb-0">
            <i className="bi bi-wallet2 me-2"></i> Danh sách ví
          </h3>

          <div className="wallet-header__controls d-flex align-items-center gap-3 flex-wrap">
            {/* Phạm vi */}
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-layers-half text-light opacity-75"></i>
              <label className="sort-label text-light">Phạm vi:</label>
              <select
                className="form-select form-select-sm sort-select"
                value={sortScope}
                onChange={(e) => setSortScope(e.target.value)}
              >
                <option value="all">Tất cả ví</option>
                <option value="personal">Chỉ ví cá nhân</option>
                <option value="group">Chỉ ví nhóm</option>
              </select>
            </div>

            {/* Sắp xếp */}
            <div className="sort-box d-flex align-items-center gap-2">
              <i className="bi bi-sort-alpha-down text-light opacity-75"></i>
              <label className="sort-label text-light">Sắp xếp theo:</label>
              <select
                className="form-select form-select-sm sort-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="createdAt">Ngày tạo</option>
                <option value="balance">Số tiền</option>
                <option value="name">Tên ví</option>
              </select>

              <button
                className="btn btn-sm btn-outline-light sort-dir-btn"
                onClick={toggleSortDir}
              >
                {sortDir === "asc" ? (
                  <>
                    <i className="bi bi-sort-down-alt me-1" /> Tăng
                  </>
                ) : (
                  <>
                    <i className="bi bi-sort-up me-1" /> Giảm
                  </>
                )}
              </button>
            </div>

            {/* Tạo ví mới */}
            <div className="position-relative">
              <button
                ref={anchorRef}
                className="btn btn-sm btn-outline-light sort-dir-btn d-flex align-items-center"
                onClick={handleAddWalletClick}
                aria-expanded={showChooser}
              >
                <i className="bi bi-plus-lg me-2"></i> Tạo ví mới
              </button>
              <WalletCreateChooser
                open={showChooser}
                anchorRef={anchorRef}
                onClose={() => setShowChooser(false)}
                onChoosePersonal={() => {
                  setShowChooser(false);
                  setShowPersonal(true);
                }}
                onChooseGroup={() => {
                  setShowChooser(false);
                  setShowGroup(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tổng số dư tất cả (ẩn khi đang expand 1 phần) ===== */}
      {expandedSection === null && (
        <section className="mt-2 mb-3">
          <div className="sum-card sum-card--overall">
            <div className="sum-card__title">TỔNG SỐ DƯ</div>
            <div className="sum-card__value">
              {formatMoney(
                showTotalAll ? totalAll : 0,
                displayCurrency || "VND"
              ).replace(
                /[\d,.]+/,
                showTotalAll
                  ? new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: displayCurrency === "VND" ? 0 : 2,
                    }).format(totalAll)
                  : "••••••"
              )}
              <i
                role="button"
                tabIndex={0}
                aria-pressed={showTotalAll}
                className={`bi ${
                  showTotalAll ? "bi-eye" : "bi-eye-slash"
                } money-eye`}
                onClick={toggleTotalAll}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  (e.preventDefault(), toggleTotalAll())
                }
              />
            </div>
            <div className="sum-card__desc">
              Tổng hợp tất cả số dư các ví (chỉ tính ví đang bật).
            </div>
          </div>
        </section>
      )}

      {/* ===== 2 cột. Mở rộng 1 phần thì phần kia ẩn ===== */}
      <div className="row g-4">
        {/* ========== Ví cá nhân ========== */}
        <div
          className={
            isPersonalExpanded
              ? "col-12"
              : isGroupExpanded
              ? "d-none"
              : "col-12 col-lg-6"
          }
        >
          <section
            className={`wallet-section card border-0 shadow-sm h-100 ${
              isPersonalExpanded ? "section-expanded" : ""
            }`}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">
                  <i className="bi bi-person-fill me-2"></i>Ví cá nhân
                </h5>
                <button
                  type="button"
                  className="section-toggle"
                  aria-expanded={isPersonalExpanded}
                  onClick={() => toggleExpand("personal")}
                />
              </div>
              <span className="badge bg-light text-dark">
                {personalWallets.length} ví
              </span>
            </div>

            <div className="card-body">
              {/* ==== KHỐI MỞ RỘNG (animation) ==== */}
              <div ref={personalExpand.ref} {...personalExpand.props}>
                <div className="row gx-4">
                  {/* Tổng cá nhân (mini) */}
                  <div className="col-12">
                    <div className="sum-card sum-card--mini sum-card--personal mb-3">
                      <div className="sum-card__title">
                        TỔNG SỐ DƯ (CÁ NHÂN)
                      </div>
                      <div className="sum-card__value">
                        {formatMoney(
                          showTotalPersonal ? totalPersonal : 0,
                          displayCurrency || "VND"
                        ).replace(
                          /[\d,.]+/,
                          showTotalPersonal
                            ? new Intl.NumberFormat("vi-VN", {
                                maximumFractionDigits: displayCurrency === "VND" ? 0 : 2,
                              }).format(totalPersonal)
                            : "••••••"
                        )}
                        <i
                          role="button"
                          tabIndex={0}
                          aria-pressed={showTotalPersonal}
                          className={`bi ${
                            showTotalPersonal ? "bi-eye" : "bi-eye-slash"
                          } money-eye`}
                          onClick={toggleTotalPersonal}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            (e.preventDefault(), toggleTotalPersonal())
                          }
                        />
                      </div>
                      <div className="sum-card__desc">
                        Tổng hợp số dư của các ví cá nhân đang bật.
                      </div>
                    </div>
                  </div>

                  {/* Bên trái: grid ví (cuộn nếu >6) */}
                  <div className="col-12 col-lg-8">
                    {personalWallets.length === 0 ? (
                      <div className="alert alert-light border rounded-3 mb-0">
                        Chưa có ví nào. Nhấn <strong>Tạo ví mới</strong> để thêm
                        ví đầu tiên.
                      </div>
                    ) : (
                      <div className="wallet-grid wallet-grid--expanded-two wallet-grid--limit-6">
                        {defaultFirst(personalWallets).map((w) => (
                          <div
                            className={`wallet-grid__item ${
                              selectedWalletId === w.id ? "is-selected" : ""
                            }`}
                            key={w.id}
                            ref={setCardRef(w.id)}
                            role="button"
                            tabIndex={0}
                            onClickCapture={handleCardAreaClick("personal", w)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleCardClick("personal", w);
                              }
                            }}
                          >
                            <WalletCard
                              wallet={w}
                              onToggleOverall={handleToggleOverall}
                              onToggleSection={handleToggleSection}
                              onEdit={setEditing}
                              onDelete={setConfirmDel}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bên phải: inspector */}
                  <aside
                    className="col-12 col-lg-4"
                    ref={personalInspectorRef}
                    style={{
                      "--wi-accent": selectedWallet?.color || "#6C7EE1",
                    }}
                  >
                    <WalletInspector
                      wallet={selectedWallet}
                      wallets={wallets}
                      masked={false}
                      formatMoney={formatMoney}
                      maskMoney={(amount, cur, visible) =>
                        visible ? formatMoney(amount, cur || "VND") : "••••••"
                      }
                      onEdit={setEditing}
                      onDelete={(w) => setConfirmDel(w)}
                      onWithdraw={handleWithdraw}
                      onDeposit={handleDeposit}
                      onTransfer={handleTransfer}
                      onMerge={handleMerge}
                      onConvert={handleConvert}
                      accent={selectedWallet?.color}
                      heroBg={inspectorBg} // <<< truyền nền đồng bộ
                    />
                  </aside>
                </div>
              </div>

              {/* ==== KHỐI THU GỌN (cuộn nếu >6) ==== */}
              {!isPersonalExpanded && (
                <>
                  {personalWallets.length === 0 ? (
                    <div className="alert alert-light border rounded-3 mb-0 mt-2">
                      Chưa có ví nào. Nhấn <strong>Tạo ví mới</strong> để thêm
                      ví đầu tiên.
                    </div>
                  ) : (
                    <div className="wallet-grid wallet-grid--limit-6 mt-2">
                      {defaultFirst(personalWallets).map((w) => (
                        <div
                          className={`wallet-grid__item ${
                            selectedWalletId === w.id ? "is-selected" : ""
                          }`}
                          key={w.id}
                          ref={setCardRef(w.id)}
                          role="button"
                          tabIndex={0}
                          onClickCapture={handleCardAreaClick("personal", w)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCardClick("personal", w);
                            }
                          }}
                        >
                          <WalletCard
                            wallet={w}
                            onToggleOverall={handleToggleOverall}
                            onToggleSection={handleToggleSection}
                            onEdit={setEditing}
                            onDelete={setConfirmDel}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* ========== Ví nhóm ========== */}
        <div
          className={
            isGroupExpanded
              ? "col-12"
              : isPersonalExpanded
              ? "d-none"
              : "col-12 col-lg-6"
          }
        >
          <section
            className={`wallet-section card border-0 shadow-sm h-100 ${
              isGroupExpanded ? "section-expanded" : ""
            }`}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">
                  <i className="bi bi-people-fill me-2"></i>Ví nhóm
                </h5>
                <button
                  type="button"
                  className="section-toggle"
                  aria-expanded={isGroupExpanded}
                  onClick={() => toggleExpand("group")}
                />
              </div>
              <span className="badge bg-light text-dark">
                {groupWallets.length} ví
              </span>
            </div>

            <div className="card-body">
              {/* ==== KHỐI MỞ RỘNG ==== */}
              <div ref={groupExpand.ref} {...groupExpand.props}>
                <div className="row gx-4">
                  {/* Tổng nhóm (mini) */}
                  <div className="col-12">
                    <div className="sum-card sum-card--mini sum-card--group mb-3">
                      <div className="sum-card__title">TỔNG SỐ DƯ (NHÓM)</div>
                      <div className="sum-card__value">
                        {formatMoney(
                          showTotalGroup ? totalGroup : 0,
                          displayCurrency || "VND"
                        ).replace(
                          /[\d,.]+/,
                          showTotalGroup
                            ? new Intl.NumberFormat("vi-VN", {
                                maximumFractionDigits: displayCurrency === "VND" ? 0 : 2,
                              }).format(totalGroup)
                            : "••••••"
                        )}
                        <i
                          role="button"
                          tabIndex={0}
                          aria-pressed={showTotalGroup}
                          className={`bi ${
                            showTotalGroup ? "bi-eye" : "bi-eye-slash"
                          } money-eye`}
                          onClick={toggleTotalGroup}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            (e.preventDefault(), toggleTotalGroup())
                          }
                        />
                      </div>
                      <div className="sum-card__desc">
                        Tổng hợp số dư của các ví nhóm đang bật.
                      </div>
                    </div>
                  </div>

                  {/* Bên trái: grid ví (cuộn nếu >6) */}
                  <div className="col-12 col-lg-8">
                    {groupWallets.length === 0 ? (
                      <div className="alert alert-light border rounded-3 mb-0">
                        Chưa có ví nhóm nào. Chọn <strong>Tạo ví nhóm</strong>{" "}
                        trong menu “Tạo ví mới”.
                      </div>
                    ) : (
                      <div className="wallet-grid wallet-grid--expanded-two wallet-grid--limit-6">
                        {defaultFirst(groupWallets).map((w) => (
                          <div
                            className={`wallet-grid__item ${
                              selectedWalletId === w.id ? "is-selected" : ""
                            }`}
                            key={w.id}
                            ref={setCardRef(w.id)}
                            role="button"
                            tabIndex={0}
                            onClickCapture={handleCardAreaClick("group", w)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleCardClick("group", w);
                              }
                            }}
                          >
                            <WalletCard
                              wallet={w}
                              onToggleOverall={handleToggleOverall}
                              onToggleSection={handleToggleSection}
                              onEdit={setEditing}
                              onDelete={setConfirmDel}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bên phải: inspector */}
                  <aside
                    className="col-12 col-lg-4"
                    ref={groupInspectorRef}
                    style={{
                      "--wi-accent": selectedWallet?.color || "#6C7EE1",
                    }}
                  >
                    <WalletInspector
                      wallet={selectedWallet}
                      wallets={wallets}
                      masked={false}
                      formatMoney={formatMoney}
                      maskMoney={(amount, cur, visible) =>
                        visible ? formatMoney(amount, cur || "VND") : "••••••"
                      }
                      onEdit={setEditing}
                      onDelete={(w) => setConfirmDel(w)}
                      onWithdraw={handleWithdraw}
                      onDeposit={handleDeposit}
                      onTransfer={handleTransfer}
                      onMerge={handleMerge}
                      onConvert={handleConvert}
                      accent={selectedWallet?.color}
                      heroBg={inspectorBg} // <<< truyền nền đồng bộ
                    />
                  </aside>
                </div>
              </div>

              {/* ==== KHỐI THU GỌN (cuộn nếu >6) ==== */}
              {!isGroupExpanded && (
                <>
                  {groupWallets.length === 0 ? (
                    <div className="alert alert-light border rounded-3 mb-0 mt-2">
                      Chưa có ví nhóm nào. Chọn <strong>Tạo ví nhóm</strong>{" "}
                      trong menu “Tạo ví mới”.
                    </div>
                  ) : (
                    <div className="wallet-grid wallet-grid--limit-6 mt-2">
                      {defaultFirst(groupWallets).map((w) => (
                        <div
                          className={`wallet-grid__item ${
                            selectedWalletId === w.id ? "is-selected" : ""
                          }`}
                          key={w.id}
                          ref={setCardRef(w.id)}
                          role="button"
                          tabIndex={0}
                          onClickCapture={handleCardAreaClick("group", w)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCardClick("group", w);
                            }
                          }}
                        >
                          <WalletCard
                            wallet={w}
                            onToggleOverall={handleToggleOverall}
                            onToggleSection={handleToggleSection}
                            onEdit={setEditing}
                            onDelete={setConfirmDel}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ===== Modals ===== */}
      <WalletCreatePersonalModal
        open={showPersonal}
        onClose={() => setShowPersonal(false)}
        currencies={CURRENCIES}
        existingNames={existingNames}
        onSubmit={handleCreatePersonal}
      />
      <WalletCreateGroupModal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        currencies={CURRENCIES}
        onCreated={afterCreateGroupWallet}
      />

      {editing && (
        <WalletEditModal
          wallet={editing}
          currencies={CURRENCIES}
          existingNames={existingNames}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmitEdit}
        />
      )}

      <ConfirmModal
        open={!!confirmDel}
        title="Xóa ví"
        message={confirmDel ? `Xóa ví "${confirmDel.name}"?` : ""}
        okText="Xóa"
        cancelText="Hủy"
        onOk={() => doDelete(confirmDel)}
        onClose={() => setConfirmDel(null)}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={2200}
        onClose={() => setToast({ open: false, message: "", type: "success" })}
      />
    </div>
  );
}
