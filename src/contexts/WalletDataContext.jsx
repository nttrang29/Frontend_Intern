import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { logActivity } from "../utils/activityLogger";
import { 
  createWallet as createWalletAPI, 
  getMyWallets, 
  updateWallet as updateWalletAPI, 
  deleteWallet as deleteWalletAPI,
  transferMoney as transferMoneyAPI,
  mergeWallets as mergeWalletsAPI,
  setDefaultWallet as setDefaultWalletAPI,
} from "../services/wallet.service";
import { walletAPI } from "../services/wallet.service";

const WalletDataContext = createContext(null);

const MERGE_PERSONAL_ONLY_ERROR = "WALLET_MERGE_PERSONAL_ONLY";

const getAuthUserId = () => {
  if (typeof window === "undefined") return null;
  try {
    const authRaw = localStorage.getItem("auth_user");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      return (
        parsed?.userId ||
        parsed?.id ||
        parsed?.user?.userId ||
        parsed?.user?.id ||
        null
      );
    }

    const legacyRaw = localStorage.getItem("user");
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      return parsed?.userId || parsed?.id || null;
    }
  } catch (error) {
    console.warn("WalletDataContext: unable to read auth user id", error);
  }
  return null;
};

const normalizeId = (value) => {
  if (value === undefined || value === null) return null;
  return String(value);
};

export function WalletDataProvider({ children }) {
  // ví
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // nhóm ví
  const [groups, setGroups] = useState([
    { id: 10, name: "Gia đình", description: "", walletIds: [], budgetWalletId: null, isDefault: false, createdAt: "2025-11-01T09:00:00Z" },
    { id: 11, name: "Đầu tư",  description: "", walletIds: [], budgetWalletId: null, isDefault: false, createdAt: "2025-11-02T09:00:00Z" },
  ]);

  // Load wallets từ API khi component mount hoặc khi user đăng nhập (chỉ khi có token)
  useEffect(() => {
    const loadWalletsIfToken = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await loadWallets();
      } else {
        setWallets([]);
        setLoading(false);
      }
    };

    // Load ngay khi mount
    loadWalletsIfToken();

    // Lắng nghe custom event khi user đăng nhập/đăng xuất trong cùng tab
    const handleUserChange = () => {
      loadWalletsIfToken();
    };
    window.addEventListener("userChanged", handleUserChange);

    // Lắng nghe sự kiện storage để reload khi user đăng nhập/đăng xuất từ tab khác
    const handleStorageChange = (e) => {
      if (e.key === "accessToken" || e.key === "user" || e.key === "auth_user") {
        loadWalletsIfToken();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Lắng nghe event khi có notification wallet mới để tự động reload wallets
    const handleWalletNotification = () => {
      // Đợi một chút để đảm bảo backend đã xử lý xong
      setTimeout(() => {
        loadWalletsIfToken();
      }, 500);
    };
    window.addEventListener("walletNotificationReceived", handleWalletNotification);

    // Lắng nghe event khi wallet được cập nhật (share, update role, etc.)
    const handleWalletUpdated = (event) => {
      const { walletId, removedEmail } = event.detail || {};
      
      // Nếu có email bị xóa, cập nhật sharedEmails trong wallet state ngay lập tức
      if (walletId && removedEmail) {
        setWallets(prev => {
          return prev.map(w => {
            if (String(w.id) === String(walletId)) {
              // Xóa email khỏi sharedEmails
              const updatedSharedEmails = Array.isArray(w.sharedEmails) 
                ? w.sharedEmails.filter(email => 
                    email && typeof email === "string" && 
                    email.toLowerCase().trim() !== removedEmail.toLowerCase().trim()
                  )
                : [];
              
              console.log("🔄 Updating wallet sharedEmails after wallet updated:", {
                walletId,
                removedEmail,
                oldSharedEmails: w.sharedEmails,
                newSharedEmails: updatedSharedEmails
              });
              
              return {
                ...w,
                sharedEmails: updatedSharedEmails
              };
            }
            return w;
          });
        });
      }
      
      // Reload wallets ngay lập tức khi có thay đổi
      setTimeout(() => {
        loadWalletsIfToken();
      }, 300);
    };
    window.addEventListener("walletUpdated", handleWalletUpdated);

    // Lắng nghe event khi có thành viên rời khỏi ví
    const handleWalletMemberLeft = (event) => {
      const { walletIds, removedEmail } = event.detail || {};
      
      // Nếu có email bị xóa, cập nhật sharedEmails trong wallet state ngay lập tức
      if (walletIds && Array.isArray(walletIds) && walletIds.length > 0 && removedEmail) {
        setWallets(prev => {
          return prev.map(w => {
            if (walletIds.some(id => String(id) === String(w.id))) {
              // Xóa email khỏi sharedEmails
              const updatedSharedEmails = Array.isArray(w.sharedEmails) 
                ? w.sharedEmails.filter(email => 
                    email && typeof email === "string" && 
                    email.toLowerCase().trim() !== removedEmail.toLowerCase().trim()
                  )
                : [];
              
              console.log("🔄 Updating wallet sharedEmails after member left:", {
                walletId: w.id,
                removedEmail,
                oldSharedEmails: w.sharedEmails,
                newSharedEmails: updatedSharedEmails
              });
              
              return {
                ...w,
                sharedEmails: updatedSharedEmails
              };
            }
            return w;
          });
        });
      }
      
      // Reload wallets để cập nhật số thành viên và danh sách ví
      setTimeout(() => {
        loadWalletsIfToken();
      }, 500);
    };
    window.addEventListener("walletMemberLeft", handleWalletMemberLeft);

    // Lắng nghe event khi danh sách thành viên được cập nhật
    const handleWalletMembersUpdated = (event) => {
      const { walletId, removedEmail } = event.detail || {};
      
      // Nếu có email bị xóa, cập nhật sharedEmails trong wallet state ngay lập tức
      if (walletId && removedEmail) {
        setWallets(prev => {
          return prev.map(w => {
            if (String(w.id) === String(walletId)) {
              // Xóa email khỏi sharedEmails
              const updatedSharedEmails = Array.isArray(w.sharedEmails) 
                ? w.sharedEmails.filter(email => 
                    email && typeof email === "string" && 
                    email.toLowerCase().trim() !== removedEmail.toLowerCase().trim()
                  )
                : [];
              
              console.log("🔄 Updating wallet sharedEmails after member removal:", {
                walletId,
                removedEmail,
                oldSharedEmails: w.sharedEmails,
                newSharedEmails: updatedSharedEmails
              });
              
              return {
                ...w,
                sharedEmails: updatedSharedEmails
              };
            }
            return w;
          });
        });
      }
      
      // Reload wallets để cập nhật số thành viên
      setTimeout(() => {
        loadWalletsIfToken();
      }, 300);
    };
    window.addEventListener("walletMembersUpdated", handleWalletMembersUpdated);

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletNotificationReceived", handleWalletNotification);
      window.removeEventListener("walletUpdated", handleWalletUpdated);
      window.removeEventListener("walletMemberLeft", handleWalletMemberLeft);
      window.removeEventListener("walletMembersUpdated", handleWalletMembersUpdated);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Màu mặc định cho ví (theo hình 2)
  const DEFAULT_WALLET_COLOR = "#2D99AE";

  // Helper: Normalize wallet data từ API format sang format dùng trong app
  const normalizeWallet = (apiWallet, existingWallet = null) => {
    // Giữ lại color từ ví cũ nếu API không trả về
    const preservedColor = apiWallet.color || existingWallet?.color || null;
    // Nếu vẫn không có màu, dùng màu mặc định
    const finalColor = preservedColor || DEFAULT_WALLET_COLOR;
    
    // Ưu tiên walletType từ API để xác định isShared
    // Nếu API có walletType, dùng nó; nếu không, mới dùng isShared từ API hoặc state cũ
    const walletType = apiWallet.walletType || apiWallet.type;
    const rawIsShared = walletType === "GROUP" 
      ? true 
      : (walletType === "PERSONAL" 
          ? false 
          : (apiWallet.isShared !== undefined ? apiWallet.isShared : (existingWallet?.isShared || false)));

    const resolvedMembersCount = apiWallet.totalMembers ?? apiWallet.membersCount ?? existingWallet?.membersCount ?? 0;
    const resolvedSharedEmails = apiWallet.sharedEmails || existingWallet?.sharedEmails || [];
    const resolvedRole = (apiWallet.walletRole || apiWallet.role || apiWallet.accessRole || apiWallet.sharedRole || existingWallet?.walletRole || existingWallet?.sharedRole || "")
      .toString()
      .toUpperCase();

    // Client-side enforcement: for PERSONAL (non-shared) wallets, ensure that
    // users who are not the owner are treated as VIEW (viewer) regardless of
    // what the backend returned. This enforces the product rule that personal
    // wallets shared to others must be viewer-only.
    // Additionally, if no role is provided and current user is the owner (or no owner info),
    // default to OWNER role to ensure the creator can manage their wallet.
    let enforcedRole = resolvedRole;
    try {
      const curUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let currentUserId = null;
      if (curUserRaw) {
        try {
          const u = JSON.parse(curUserRaw);
          currentUserId = u.userId || u.id || null;
        } catch (e) {
          currentUserId = null;
        }
      }
      const ownerId = apiWallet.ownerId || apiWallet.ownerUserId || apiWallet.createdBy || existingWallet?.ownerUserId || null;
      const isPersonalWallet = rawIsShared === false;
      
      // FIX: Nếu không có role từ backend VÀ (user là owner HOẶC không có thông tin owner)
      // thì mặc định gán OWNER để user có thể quản lý ví của mình
      if (!resolvedRole || resolvedRole === "") {
        // Nếu currentUserId === ownerId hoặc không có ownerId (ví mới tạo), user là OWNER
        if (!ownerId || (currentUserId && String(ownerId) === String(currentUserId))) {
          enforcedRole = 'OWNER';
        }
      }
      
      if (isPersonalWallet && ownerId && currentUserId && String(ownerId) !== String(currentUserId)) {
        enforcedRole = 'VIEW';
      }
    } catch (e) {
      // If any error occurs, fall back to resolvedRole
      enforcedRole = resolvedRole;
    }
    const hasSharedMembers = resolvedMembersCount > 1
      || resolvedSharedEmails.length > 0
      || (resolvedRole && !["", "OWNER", "MASTER", "ADMIN"].includes(resolvedRole));
    
    return {
      id: apiWallet.walletId || apiWallet.id,
      name: apiWallet.walletName || apiWallet.name,
      currency: apiWallet.currencyCode || apiWallet.currency,
      balance: apiWallet.balance || 0,
      type: walletType || "CASH",
      // Xử lý cả isDefault và default để tương thích với backend
      // Backend có thể serialize isDefault thành default do Java boolean getter naming
      isDefault: apiWallet.isDefault !== undefined 
        ? apiWallet.isDefault 
        : (apiWallet.default !== undefined ? apiWallet.default : false),
      isShared: rawIsShared,
      groupId: apiWallet.groupId || null,
      ownerUserId: apiWallet.ownerId || apiWallet.ownerUserId || apiWallet.createdBy || existingWallet?.ownerUserId || null,
      ownerName: apiWallet.ownerName || apiWallet.ownerFullName || existingWallet?.ownerName || "",
      ownerEmail: apiWallet.ownerEmail || existingWallet?.ownerEmail || "",
      walletRole: enforcedRole || (apiWallet.walletRole || apiWallet.role || apiWallet.accessRole || existingWallet?.walletRole || null),
      sharedRole: enforcedRole || (apiWallet.sharedRole || existingWallet?.sharedRole || null),
      sharedEmails: resolvedSharedEmails,
      membersCount: resolvedMembersCount,
      hasSharedMembers,
      createdAt: apiWallet.createdAt,
      note: apiWallet.description || apiWallet.note || "",
      color: finalColor,
      includeOverall: apiWallet.includeOverall !== false,
      includePersonal: apiWallet.includePersonal !== false,
      includeGroup: apiWallet.includeGroup !== false,
      txCount: apiWallet.transactionCount || apiWallet.txCount || 0,
      transactionCount: apiWallet.transactionCount || apiWallet.txCount || 0,
      deleted: apiWallet.deleted || false,
    };
  };

  const loadWallets = async () => {
    try {
      setLoading(true);
      const { response, data } = await getMyWallets();
      if (response.ok && data.wallets) {
        // Normalize wallets từ API format, giữ lại color từ state cũ
        let normalizedWallets = [];
        setWallets(prev => {
          normalizedWallets = data.wallets
            .filter(apiWallet => !apiWallet.deleted) // Filter out deleted wallets
            .map(apiWallet => {
              const existingWallet = prev.find(w => 
                (w.id === (apiWallet.walletId || apiWallet.id))
              );
              return normalizeWallet(apiWallet, existingWallet);
            });
          
          // Filter out deleted wallets từ prev state trước khi so sánh
          const prevFiltered = prev.filter(w => !w.deleted);
          
          // Chỉ update state nếu dữ liệu thực sự thay đổi
          // So sánh bằng IDs và các key properties
          const prevFilteredIds = new Set(prevFiltered.map(w => w.id || w.walletId));
          const newWalletIds = new Set(normalizedWallets.map(w => w.id || w.walletId));
          
          if (prevFilteredIds.size !== newWalletIds.size || [...newWalletIds].some(id => !prevFilteredIds.has(id))) {
            return normalizedWallets;
          }
          
          // Kiểm tra xem có wallet nào thay đổi properties không
          const hasChanged = normalizedWallets.some(newWallet => {
            const oldWallet = prevFiltered.find(w => w.id === newWallet.id);
            if (!oldWallet) return true;
            
            // Normalize role để so sánh (chuyển về uppercase và loại bỏ khoảng trắng)
            const normalizeRole = (role) => {
              if (!role) return "";
              return String(role).toUpperCase().trim();
            };
            
            const oldRole = normalizeRole(oldWallet.walletRole || oldWallet.sharedRole || oldWallet.role);
            const newRole = normalizeRole(newWallet.walletRole || newWallet.sharedRole || newWallet.role);
            
            // So sánh các key properties, bao gồm transactionCount, role, sharedEmails và membersCount
            const oldSharedEmails = Array.isArray(oldWallet.sharedEmails) ? oldWallet.sharedEmails.sort().join(',') : '';
            const newSharedEmails = Array.isArray(newWallet.sharedEmails) ? newWallet.sharedEmails.sort().join(',') : '';
            
            const changed = oldWallet.name !== newWallet.name ||
                   oldWallet.walletName !== newWallet.walletName ||
                   oldWallet.balance !== newWallet.balance ||
                   oldWallet.currency !== newWallet.currency ||
                   oldWallet.currencyCode !== newWallet.currencyCode ||
                   oldWallet.isDefault !== newWallet.isDefault ||
                   oldWallet.isShared !== newWallet.isShared ||
                   oldWallet.transactionCount !== newWallet.transactionCount ||
                   oldWallet.txCount !== newWallet.txCount ||
                   oldWallet.membersCount !== newWallet.membersCount ||
                   oldSharedEmails !== newSharedEmails ||
                   oldRole !== newRole; // So sánh role đã normalize
            
            // Log thay đổi để debug
            if (changed) {
              console.log("🔄 Wallet changed:", {
                walletId: newWallet.id,
                walletName: newWallet.name,
                changes: {
                  name: oldWallet.name !== newWallet.name,
                  balance: oldWallet.balance !== newWallet.balance,
                  membersCount: oldWallet.membersCount !== newWallet.membersCount,
                  sharedEmails: oldSharedEmails !== newSharedEmails,
                  role: oldRole !== newRole
                },
                oldMembersCount: oldWallet.membersCount,
                newMembersCount: newWallet.membersCount,
                oldSharedEmails: oldSharedEmails,
                newSharedEmails: newSharedEmails
              });
            }
            
            return changed;
          });
          
          // Đảm bảo không có ví nào bị xóa trong result
          // Luôn return normalizedWallets nếu có thay đổi để trigger re-render
          return hasChanged ? normalizedWallets : prevFiltered;
        });
        
        // Trả về wallets đã được normalize
        return normalizedWallets;
      } else {
        console.error("Failed to load wallets:", data.error);
        return [];
      }
    } catch (error) {
      console.error("Error loading wallets:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ====== helpers ======
  const createWallet = async (payload) => {
    try {
      const { response, data } = await createWalletAPI({
        walletName: payload.name,
        currencyCode: payload.currency || "VND",
        description: payload.note || "",
        setAsDefault: payload.isDefault || false,
        walletType: payload.isShared ? "GROUP" : "PERSONAL",
        // Gửi color lên API nếu có (API có thể không hỗ trợ, nhưng không sao)
        color: payload.color || DEFAULT_WALLET_COLOR,
      });
      
      if (response.ok && data.wallet) {
        // Giữ lại color từ payload nếu có (vì API có thể không trả về)
        const newWallet = normalizeWallet(data.wallet);
        
        // Lấy currentUserId để gán làm owner (người tạo ví chính là owner)
        let currentUserId = null;
        try {
          const curUserRaw = localStorage.getItem('user');
          if (curUserRaw) {
            const u = JSON.parse(curUserRaw);
            currentUserId = u.userId || u.id || null;
          }
        } catch (e) {
          // ignore
        }
        
        const finalWallet = {
          ...newWallet,
          color: payload.color || newWallet.color || DEFAULT_WALLET_COLOR,
          // FIX: Đảm bảo người tạo ví có quyền OWNER
          walletRole: newWallet.walletRole || 'OWNER',
          sharedRole: newWallet.sharedRole || 'OWNER',
          ownerUserId: newWallet.ownerUserId || currentUserId,
        };
        setWallets(prev => {
          let next = [finalWallet, ...prev];
          if (finalWallet.isDefault) {
            next = next.map(w => (w.id === finalWallet.id ? w : { ...w, isDefault: false }));
          }
          return next;
        });
        // nếu là ví nhóm thì liên kết vào group
        if (finalWallet.isShared && finalWallet.groupId) {
          setGroups(prev => prev.map(g => g.id === finalWallet.groupId
            ? { ...g, walletIds: Array.from(new Set([...(g.walletIds||[]), finalWallet.id])) }
            : g
          ));
        }
        try {
          logActivity({
            type: "wallet.create",
            message: `Tạo ví ${finalWallet.name || finalWallet.id}`,
            data: { walletId: finalWallet.id, name: finalWallet.name },
          });
        } catch (e) {
          // ignore logging errors
        }
        return finalWallet;
      } else {
        throw new Error(data.error || "Không thể tạo ví");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  };

  const updateWallet = async (patch) => {
    try {
      const walletId = patch.id;
      // Tìm ví cũ để giữ lại color
      const oldWallet = wallets.find(w => w.id === walletId);
      
      // Logic mới theo WALLET_DEFAULT_FEATURE_CHANGES.md:
      // 1. Khi shouldSetDefault = true: Luôn thêm setAsDefault: true vào backendPayload
      // 2. Khi shouldUnsetDefault = true && wasDefault = true: Thêm setAsDefault: false
      // 3. Luôn gọi updateWalletAPI nếu có thay đổi hoặc shouldSetDefault/shouldUnsetDefault
      const shouldSetDefault = patch.isDefault === true;
      const shouldUnsetDefault = patch.isDefault === false;
      const wasDefault = oldWallet?.isDefault || false;
      
      // Xây dựng updateData, chỉ gửi các field có giá trị
      // QUAN TRỌNG: Chỉ gửi các field được phép, KHÔNG gửi type, isShared, walletType
      // để tránh vô tình thay đổi loại ví
      const updateData = {};
      
      if (patch.name !== undefined || patch.walletName !== undefined) {
        updateData.walletName = patch.name || patch.walletName;
      }
      if (patch.note !== undefined || patch.description !== undefined) {
        updateData.description = patch.note || patch.description || "";
      }
      if (patch.currency !== undefined || patch.currencyCode !== undefined) {
        updateData.currencyCode = patch.currency || patch.currencyCode;
      }
      if (patch.balance !== undefined) {
        updateData.balance = patch.balance;
      }
      
      // Xử lý set/unset default wallet theo WALLET_DEFAULT_FEATURE_CHANGES.md
      if (shouldSetDefault) {
        updateData.setAsDefault = true;
      } else if (shouldUnsetDefault && wasDefault) {
        updateData.setAsDefault = false;
      }
      
      // QUAN TRỌNG: walletType CHỈ được gửi khi patch.walletType được định nghĩa rõ ràng
      // KHÔNG tự động convert từ patch.isShared hoặc patch.type
      // Điều này đảm bảo khi rút tiền (chỉ gửi balance), walletType không bị thay đổi
      if (patch.walletType !== undefined) {
        updateData.walletType = patch.walletType;
      }
      
      // Gửi color lên API nếu có (API có thể không hỗ trợ, nhưng không sao)
      if (patch.color !== undefined) {
        updateData.color = patch.color || oldWallet?.color || DEFAULT_WALLET_COLOR;
      }
      
      // Gọi API update nếu có thay đổi hoặc shouldSetDefault/shouldUnsetDefault
      // Theo WALLET_DEFAULT_FEATURE_CHANGES.md: Luôn gọi updateWalletAPI khi có thay đổi hoặc set/unset default
      const { response, data } = await updateWalletAPI(walletId, updateData);
      
      if (response.ok && data.wallet) {
        // Giữ lại color từ patch hoặc từ ví cũ (vì API không trả về color)
        const updatedWallet = normalizeWallet(data.wallet, oldWallet);
        const finalWallet = {
          ...updatedWallet,
          // Ưu tiên: color từ patch > color từ ví cũ > màu mặc định
          color: patch.color || oldWallet?.color || updatedWallet.color || DEFAULT_WALLET_COLOR,
        };
        
        setWallets(prev => {
          const updated = prev
            .filter(w => !w.deleted) // Filter out deleted wallets
            .map(w => (w.id === walletId ? finalWallet : w));
          // Đảm bảo chỉ có 1 ví mặc định
          if (finalWallet.isDefault) {
            return updated.map(w => (w.id === walletId ? w : { ...w, isDefault: false }));
          }
          return updated;
        });
        try {
          logActivity({
            type: "wallet.update",
            message: `Cập nhật ví ${walletId}`,
            data: { walletId, patch: updateData },
          });
        } catch (e) {}
        return finalWallet;
      } else {
        throw new Error(data.error || "Không thể cập nhật ví");
      }
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  };

  const deleteWallet = async (id) => {
    try {
      // find current wallet name for better activity description
      const existingWallet = wallets.find(w => w.id === id) || null;
      const existingName = existingWallet?.name || existingWallet?.walletName || null;

      const { response, data } = await deleteWalletAPI(id);
      
      if (response.ok) {
        // Soft delete: chỉ đánh dấu deleted, không xóa khỏi state
        // State sẽ được filter khi loadWallets được gọi
        setWallets(prev => prev.filter(w => w.id !== id && !w.deleted));
        setGroups(prev => prev.map(g => ({ 
          ...g, 
          walletIds: (g.walletIds||[]).filter(wid => wid !== id), 
          budgetWalletId: g.budgetWalletId === id ? null : g.budgetWalletId 
        })));
        try {
          logActivity({
            type: "wallet.delete",
            message: `Xóa ví ${existingName || id}`,
            data: { walletId: id, walletName: existingName },
          });
        } catch (e) {}
        return data;
      } else {
        throw new Error(data.error || "Không thể xóa ví");
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      throw error;
    }
  };

  const transferMoney = async (transferData) => {
    try {
      // Map từ format của WalletInspector sang format API
      // WalletInspector gửi: sourceId, targetId, amount, note/description
      // API yêu cầu: fromWalletId, toWalletId, amount, note
      const sourceId = transferData.sourceId || transferData.sourceWalletId || transferData.fromWalletId;
      const targetId = transferData.targetId || transferData.targetWalletId || transferData.toWalletId;
      
      const { response, data } = await transferMoneyAPI({
        fromWalletId: sourceId,
        toWalletId: targetId,
        amount: transferData.amount,
        targetCurrencyCode: transferData.targetCurrencyCode, // Currency của số tiền nhập vào (theo ví gửi)
        note: transferData.note || transferData.description || "",
      });

      if (response.ok) {
        // Reload wallets để lấy số dư mới nhất và nhận wallets đã được cập nhật
        const updatedWallets = await loadWallets();
        
        // Tìm source và target wallet từ wallets mới nhất
        const sourceWallet = updatedWallets.find(w => w.id === sourceId);
        const targetWallet = updatedWallets.find(w => w.id === targetId);
        
        console.log("transferMoney - sourceId:", sourceId, "targetId:", targetId);
        console.log("transferMoney - updatedWallets count:", updatedWallets.length);
        console.log("transferMoney - sourceWallet:", sourceWallet);
        console.log("transferMoney - targetWallet:", targetWallet);
        
        return {
          ...data,
          sourceWallet,
          targetWallet,
        };
      } else {
        throw new Error(data.error || "Không thể chuyển tiền");
      }
    } catch (error) {
      console.error("Error transferring money:", error);
      throw error;
    }
  };

  const mergeWallets = async (mergeData) => {
    try {
      const { targetId, sourceId, keepCurrency, preview } = mergeData;
      
      // Đảm bảo targetId và sourceId là số
      const targetIdNum = Number(targetId);
      const sourceIdNum = Number(sourceId);
      
      if (isNaN(targetIdNum) || isNaN(sourceIdNum)) {
        throw new Error("ID ví không hợp lệ");
      }
      
      // Capture current wallet names before merge (source will be removed afterwards)
      const sourceWalletBefore = wallets.find(w => w.id === sourceIdNum);
      const targetWalletBefore = wallets.find(w => w.id === targetIdNum);
      const sourceNameBefore = (sourceWalletBefore?.name || sourceWalletBefore?.walletName || null);
      const targetNameBefore = (targetWalletBefore?.name || targetWalletBefore?.walletName || null);

      const currentUserId = normalizeId(getAuthUserId());
      const sourceOwnerId = normalizeId(sourceWalletBefore?.ownerUserId);
      const targetOwnerId = normalizeId(targetWalletBefore?.ownerUserId);
      const sourceIsPersonal = !!sourceWalletBefore && !sourceWalletBefore.isShared;
      const targetIsPersonal = !!targetWalletBefore && !targetWalletBefore.isShared;

      const isAllowedMerge =
        sourceIsPersonal &&
        targetIsPersonal &&
        currentUserId &&
        sourceOwnerId &&
        targetOwnerId &&
        sourceOwnerId === currentUserId &&
        targetOwnerId === currentUserId;

      if (!isAllowedMerge) {
        const restrictionError = new Error(MERGE_PERSONAL_ONLY_ERROR);
        restrictionError.code = MERGE_PERSONAL_ONLY_ERROR;
        throw restrictionError;
      }

      // Xác định targetCurrency
      let targetCurrency;
      if (keepCurrency === "SOURCE") {
        // Giữ currency của ví nguồn
        targetCurrency = preview?.currency || mergeData.targetCurrency || "VND";
      } else {
        // Giữ currency của ví đích (mặc định)
        targetCurrency = mergeData.targetCurrency || "VND";
        // Nếu có preview và preview.currency là currency của ví đích, dùng nó
        if (preview?.currency) {
          // Kiểm tra xem preview.currency có phải là currency của ví đích không
          // Nếu keepCurrency là TARGET, preview.currency sẽ là currency của ví đích
          targetCurrency = preview.currency;
        }
      }

      console.log("mergeWallets - Calling API:", {
        targetId: targetIdNum,
        sourceId: sourceIdNum,
        targetCurrency,
        keepCurrency,
        previewCurrency: preview?.currency,
      });

      // BEFORE calling the merge endpoint: fetch members of both wallets so we can
      // ensure the merged wallet contains the union of shared users.
      // Note: backend may already handle members. We attempt to add any missing
      // members to the final wallet after merge by calling shareWallet for missing emails.
      const safeGetMembers = async (walletId) => {
        try {
          const resp = await walletAPI.getWalletMembers(walletId);
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          if (Array.isArray(resp.data)) return resp.data;
          if (Array.isArray(resp.members)) return resp.members;
          if (resp.result && Array.isArray(resp.result.data)) return resp.result.data;
          return [];
        } catch (e) {
          console.warn("mergeWallets: failed to load members for wallet", walletId, e.message || e);
          return [];
        }
      };

      const sourceMembers = await safeGetMembers(sourceIdNum);
      const targetMembers = await safeGetMembers(targetIdNum);

      const extractEmail = (m) => {
        if (!m) return null;
        if (m.email) return String(m.email).toLowerCase();
        if (m.userEmail) return String(m.userEmail).toLowerCase();
        if (m.user && m.user.email) return String(m.user.email).toLowerCase();
        return null;
      };

      const targetEmailsSet = new Set(targetMembers.map(extractEmail).filter(Boolean));
      const sourceEmails = sourceMembers.map(extractEmail).filter(Boolean);
      const missingEmails = Array.from(new Set(sourceEmails.filter(e => e && !targetEmailsSet.has(e))));

      const { response, data } = await mergeWalletsAPI(targetIdNum, {
        sourceWalletId: sourceIdNum,
        targetCurrency: targetCurrency,
        setTargetAsDefault: mergeData.setTargetAsDefault,
      });

      console.log("mergeWallets - API response:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (response.ok) {
        // If there are missing shared emails from the source wallet, try to share them
        // to the target wallet so the merged wallet contains the union of users.
        if (missingEmails.length > 0) {
          console.log("mergeWallets - Adding missing members to target wallet:", missingEmails);
          for (const email of missingEmails) {
            try {
              // We call shareWallet with the email. Backend controls assigned role.
              await walletAPI.shareWallet(targetIdNum, email);
            } catch (err) {
              console.warn("mergeWallets - failed to share", email, "to wallet", targetIdNum, err?.message || err);
            }
          }
        }

        // Reload wallets sau khi gộp và sau khi cố gắng cập nhật thành viên
        const updatedWallets = await loadWallets();

        // Tìm wallet đích sau khi gộp (ví nguồn đã bị xóa)
        const finalWallet = updatedWallets.find(w => w.id === targetIdNum);

        // Also attempt to fetch final wallet members to return for caller convenience
        let finalMembers = [];
        try {
          finalMembers = await safeGetMembers(targetIdNum);
        } catch (e) {
          finalMembers = [];
        }

        // Dispatch a global event so UI components can update without a full reload.
        try {
          const evtDetail = { targetId: targetIdNum, finalMembers };
          window.dispatchEvent(new CustomEvent("walletMerged", { detail: evtDetail }));
        } catch (e) {
          // ignore if CustomEvent not supported in environment
          console.debug("walletMerged event dispatch failed", e);
        }
        try {
          // try to include wallet names for clearer activity descriptions
          const updatedSource = updatedWallets.find(w => w.id === sourceIdNum);
          const updatedTarget = updatedWallets.find(w => w.id === targetIdNum);
          const srcName = (sourceNameBefore || updatedSource?.name || updatedSource?.walletName || null);
          const tgtName = (updatedTarget?.name || updatedTarget?.walletName || targetNameBefore || null);
          logActivity({
            type: "wallet.merge",
            message: `Gộp ví ${srcName || sourceIdNum} vào ${tgtName || targetIdNum}`,
            data: {
              sourceId: sourceIdNum,
              targetId: targetIdNum,
              sourceName: srcName,
              targetName: tgtName,
            },
          });
        } catch (e) {}

        return {
          ...data,
          finalWallet,
          finalMembers,
        };
      } else {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: Không thể gộp ví`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error merging wallets:", error);
      throw error;
    }
  };

  const convertToGroup = async (walletId) => {
    try {
      // Đảm bảo walletId là số
      const walletIdNum = Number(walletId);
      if (isNaN(walletIdNum)) {
        throw new Error("ID ví không hợp lệ");
      }

      // Tìm ví hiện tại để lấy thông tin
      const currentWallet = wallets.find(w => w.id === walletIdNum);
      if (!currentWallet) {
        throw new Error("Không tìm thấy ví");
      }

      // Đảm bảo walletName không rỗng (bắt buộc theo API)
      const walletName = currentWallet.name || currentWallet.walletName;
      if (!walletName || walletName.trim() === "") {
        throw new Error("Tên ví không được để trống");
      }

      console.log("convertToGroup - Calling API với walletId:", walletIdNum);
      console.log("convertToGroup - current wallet:", currentWallet);
      console.log("convertToGroup - walletName:", walletName);
      
      // Gọi API convert từ wallet.service
      // API sử dụng PUT /wallets/{walletId} với walletName và walletType: "GROUP"
      // Theo API documentation (dòng 384-390), cần cả walletName và walletType
      const data = await walletAPI.convertToGroupWallet(walletIdNum, walletName.trim());
      
      console.log("convertToGroup - API response:", data);
      console.log("convertToGroup - API response wallet:", data?.wallet);
      
      // API response có thể chứa wallet đã được cập nhật
      // Nếu có, normalize nó ngay để đảm bảo isShared được set đúng
      if (data?.wallet) {
        const normalizedFromResponse = normalizeWallet(data.wallet, currentWallet);
        console.log("convertToGroup - normalizedFromResponse:", normalizedFromResponse);
        
        // Cập nhật state ngay với wallet từ response
        setWallets(prev => prev.map(w => 
          w.id === walletIdNum ? normalizedFromResponse : w
        ));
      }
      
      // Reload wallets sau khi chuyển đổi để lấy dữ liệu mới nhất từ database
      const updatedWallets = await loadWallets();
      
      // Tìm wallet đã được chuyển đổi
      const updatedWallet = updatedWallets.find(w => w.id === walletIdNum);
      
      console.log("convertToGroup - updatedWallet sau loadWallets:", updatedWallet);
      console.log("convertToGroup - updatedWallet.isShared:", updatedWallet?.isShared);
      console.log("convertToGroup - updatedWallet.type:", updatedWallet?.type);
      try {
        logActivity({
          type: "wallet.group",
          message: `Chuyển ${walletName} thành ví nhóm`,
          data: { walletId: walletIdNum, walletName },
        });
      } catch (e) {}

      return {
        ...data,
        wallet: updatedWallet,
      };
    } catch (error) {
      console.error("Error converting wallet:", error);
      throw error;
    }
  };

  /**
   * Đặt ví làm ví mặc định
   * Sử dụng endpoint PATCH /wallets/{walletId}/set-default
   * Backend tự động bỏ ví mặc định cũ và đặt ví này làm ví mặc định
   */
  const setDefaultWallet = async (walletId) => {
    try {
      const walletIdNum = Number(walletId);
      if (isNaN(walletIdNum)) {
        throw new Error("ID ví không hợp lệ");
      }

      console.log("setDefaultWallet - Calling API với walletId:", walletIdNum);
      const { response, data } = await setDefaultWalletAPI(walletIdNum);
      
      console.log("setDefaultWallet - API response:", { status: response.status, ok: response.ok, data });
      
      if (response.ok) {
        // Reload wallets để lấy trạng thái mới nhất từ backend
        // Backend đã tự động bỏ ví mặc định cũ và đặt ví này làm ví mặc định
        const updatedWallets = await loadWallets();
        
        // Tìm wallet đã được đặt làm mặc định
        const updatedWallet = updatedWallets.find(w => w.id === walletIdNum);
        
        console.log("setDefaultWallet - updatedWallet sau loadWallets:", updatedWallet);
        console.log("setDefaultWallet - updatedWallet.isDefault:", updatedWallet?.isDefault);
        
        return {
          ...data,
          wallet: updatedWallet,
        };
      } else {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: Không thể đặt ví mặc định`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error setting default wallet:", error);
      throw error;
    }
  };

  const createGroup = async ({ name, description = "", isDefault = false }) => {
    await new Promise(r => setTimeout(r, 200));
    const newGroup = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      walletIds: [],
      budgetWalletId: null,
      isDefault: !!isDefault,
      createdAt: new Date().toISOString(),
    };
    setGroups(prev => [newGroup, ...prev.map(g => (isDefault ? { ...g, isDefault: false } : g))]);
    return newGroup;
  };

  const linkBudgetWallet = (groupId, walletId) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const ensured = Array.from(new Set([...(g.walletIds||[]), walletId]));
      return { ...g, walletIds: ensured, budgetWalletId: walletId };
    }));
    setWallets(prev => prev.map(w => (w.id === walletId ? { ...w, isShared: true, groupId } : w)));
  };

  const value = useMemo(() => ({
    wallets, groups, loading,
    createWallet, updateWallet, deleteWallet, setDefaultWallet,
    createGroup, linkBudgetWallet,
    transferMoney, mergeWallets, convertToGroup,
    loadWallets, // Export để có thể reload từ bên ngoài
  }), [wallets, groups, loading]);

  return <WalletDataContext.Provider value={value}>{children}</WalletDataContext.Provider>;
}

export function useWalletData() {
  const ctx = useContext(WalletDataContext);
  if (!ctx) throw new Error("useWalletData must be used within WalletDataProvider");
  return ctx;
}