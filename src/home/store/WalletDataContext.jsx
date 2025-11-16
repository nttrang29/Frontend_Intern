import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  getMyWallets,
  createWallet as createWalletAPI,
  updateWallet as updateWalletAPI,
  deleteWallet as deleteWalletAPI,
  setDefaultWallet,
} from "../../services/wallet.service";

const WalletDataContext = createContext(null);

/**
 * Helper: Map backend wallet format to frontend format
 * Backend có thể trả về Wallet entity hoặc SharedWalletDTO với các field khác nhau
 */
const mapBackendToFrontend = (backendWallet) => {
  // Log để debug
  if (!backendWallet) {
    console.warn(
      "WalletDataContext: mapBackendToFrontend nhận null/undefined wallet"
    );
    return null;
  }

  // Backend có thể dùng walletId hoặc id, walletName hoặc name
  const walletId = backendWallet.walletId || backendWallet.id;
  const walletName = backendWallet.walletName || backendWallet.name;
  const currencyCode = backendWallet.currencyCode || backendWallet.currency;
  const description = backendWallet.description || backendWallet.note || "";

  if (!walletId) {
    console.warn("WalletDataContext: Wallet không có ID:", backendWallet);
  }

  const mapped = {
    id: walletId,
    name: walletName || "Unnamed Wallet",
    currency: currencyCode || "VND",
    balance: backendWallet.balance || 0,
    type: backendWallet.type || backendWallet.walletType || "CASH",
    isDefault: backendWallet.isDefault || false,
    isShared: backendWallet.isShared || false,
    groupId: backendWallet.groupId || null,
    createdAt: backendWallet.createdAt || new Date().toISOString(),
    note: description,
    includeOverall: true,
    includePersonal: true,
    includeGroup: true,
    color: backendWallet.color || null,
  };

  return mapped;
};

export function WalletDataProvider({ children }) {
  // ví
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // nhóm ví (tạm thời giữ nguyên mock data, sẽ implement API sau)
  const [groups, setGroups] = useState([
    {
      id: 10,
      name: "Gia đình",
      description: "",
      walletIds: [],
      budgetWalletId: null,
      isDefault: false,
      createdAt: "2025-11-01T09:00:00Z",
    },
    {
      id: 11,
      name: "Đầu tư",
      description: "",
      walletIds: [],
      budgetWalletId: null,
      isDefault: false,
      createdAt: "2025-11-02T09:00:00Z",
    },
  ]);

  // ====== Load wallets from API ======
  useEffect(() => {
    const loadWallets = async () => {
      try {
        setLoading(true);
        console.log("WalletDataContext: Bắt đầu load wallets từ API...");
        const { response, data } = await getMyWallets();
        console.log("WalletDataContext: API Response:", { response, data });

        if (response.ok && data.wallets) {
          console.log("WalletDataContext: Raw wallets từ API:", data.wallets);
          const mappedWallets = data.wallets
            .map(mapBackendToFrontend)
            .filter((w) => w !== null); // Filter out null wallets
          console.log("WalletDataContext: Mapped wallets:", mappedWallets);
          setWallets(mappedWallets);
        } else {
          console.error("WalletDataContext: Error loading wallets:", {
            ok: response.ok,
            status: response.status,
            error: data.error,
            data: data,
          });
          // Fallback to empty array on error
          setWallets([]);
        }
      } catch (error) {
        console.error("WalletDataContext: Exception khi load wallets:", error);
        setWallets([]);
      } finally {
        setLoading(false);
      }
    };

    loadWallets();
  }, []);

  // ====== helpers ======
  const createWallet = async (payload) => {
    try {
      // Map frontend payload to backend format
      const backendPayload = {
        walletName: payload.name,
        currencyCode: payload.currency,
        description: payload.note || "",
        setAsDefault: payload.isDefault || false,
      };

      console.log(
        "WalletDataContext: Creating wallet với payload:",
        backendPayload
      );
      const { response, data } = await createWalletAPI(backendPayload);
      console.log("WalletDataContext: Create wallet response:", {
        response,
        data,
      });

      if (response.ok && data.wallet) {
        console.log("WalletDataContext: Raw created wallet:", data.wallet);
        const newWallet = mapBackendToFrontend(data.wallet);
        console.log("WalletDataContext: Mapped created wallet:", newWallet);
        // Merge với các field frontend-specific như color, include flags, etc.
        const mergedWallet = {
          ...newWallet,
          color: payload.color || newWallet.color,
          includeOverall:
            payload.includeOverall !== undefined
              ? payload.includeOverall
              : true,
          includePersonal:
            payload.includePersonal !== undefined
              ? payload.includePersonal
              : true,
          includeGroup:
            payload.includeGroup !== undefined ? payload.includeGroup : true,
          type: payload.type || newWallet.type,
          isShared: payload.isShared || false,
          groupId: payload.groupId || null,
        };

        setWallets((prev) => {
          let next = [mergedWallet, ...prev];
          // Nếu là ví mặc định, bỏ mặc định của các ví khác cùng currency
          if (mergedWallet.isDefault) {
            next = next.map((w) =>
              w.id === mergedWallet.id || w.currency !== mergedWallet.currency
                ? w
                : { ...w, isDefault: false }
            );
          }
          return next;
        });

        // Nếu là ví nhóm thì liên kết vào group
        if (mergedWallet.isShared && mergedWallet.groupId) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === mergedWallet.groupId
                ? {
                    ...g,
                    walletIds: Array.from(
                      new Set([...(g.walletIds || []), mergedWallet.id])
                    ),
                  }
                : g
            )
          );
        }

        return mergedWallet;
      } else {
        const errorMsg = data.error || "Tạo ví thất bại";
        console.error("WalletDataContext: Create wallet failed:", {
          ok: response.ok,
          status: response.status,
          error: errorMsg,
          data: data,
        });
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("WalletDataContext: Exception khi tạo wallet:", error);
      throw error;
    }
  };

  const updateWallet = async (patch) => {
    try {
      const walletId = patch.id;

      // Map frontend patch to backend format
      const backendPayload = {};
      if (patch.name !== undefined) backendPayload.walletName = patch.name;
      if (patch.currency !== undefined)
        backendPayload.currencyCode = patch.currency;
      if (patch.note !== undefined) backendPayload.description = patch.note;

      // Nếu set isDefault, gọi API setDefaultWallet riêng
      if (patch.isDefault === true) {
        await setDefaultWallet(walletId);
      }

      // Gọi API update nếu có thay đổi
      if (Object.keys(backendPayload).length > 0) {
        const { response, data } = await updateWalletAPI(
          walletId,
          backendPayload
        );

        if (response.ok && data.wallet) {
          const updatedWallet = mapBackendToFrontend(data.wallet);
          // Merge với các field frontend-specific
          const mergedWallet = {
            ...updatedWallet,
            ...patch, // Giữ các field frontend như color, include flags, etc.
          };

          setWallets((prev) =>
            prev.map((w) => (w.id === walletId ? mergedWallet : w))
          );
          return mergedWallet;
        } else {
          throw new Error(data.error || "Cập nhật ví thất bại");
        }
      } else {
        // Chỉ update local state nếu không có thay đổi backend
        setWallets((prev) =>
          prev.map((w) => (w.id === walletId ? { ...w, ...patch } : w))
        );
        return { ...patch };
      }
    } catch (error) {
      console.error("Error updating wallet:", error);
      // Fallback: update local state anyway
      setWallets((prev) =>
        prev.map((w) => (w.id === patch.id ? { ...w, ...patch } : w))
      );
      throw error;
    }
  };

  const deleteWallet = async (id) => {
    try {
      const { response, data } = await deleteWalletAPI(id);

      if (response.ok) {
        setWallets((prev) => prev.filter((w) => w.id !== id));
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            walletIds: (g.walletIds || []).filter((wid) => wid !== id),
            budgetWalletId: g.budgetWalletId === id ? null : g.budgetWalletId,
          }))
        );
      } else {
        throw new Error(data.error || "Xóa ví thất bại");
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      throw error;
    }
  };

  const createGroup = async ({ name, description = "", isDefault = false }) => {
    await new Promise((r) => setTimeout(r, 200));
    const newGroup = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      walletIds: [],
      budgetWalletId: null,
      isDefault: !!isDefault,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [
      newGroup,
      ...prev.map((g) => (isDefault ? { ...g, isDefault: false } : g)),
    ]);
    return newGroup;
  };

  const linkBudgetWallet = (groupId, walletId) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const ensured = Array.from(new Set([...(g.walletIds || []), walletId]));
        return { ...g, walletIds: ensured, budgetWalletId: walletId };
      })
    );
    setWallets((prev) =>
      prev.map((w) =>
        w.id === walletId ? { ...w, isShared: true, groupId } : w
      )
    );
  };

  const value = useMemo(
    () => ({
      wallets,
      groups,
      loading,
      createWallet,
      updateWallet,
      deleteWallet,
      createGroup,
      linkBudgetWallet,
    }),
    [wallets, groups, loading]
  );

  return (
    <WalletDataContext.Provider value={value}>
      {children}
    </WalletDataContext.Provider>
  );
}

export function useWalletData() {
  const ctx = useContext(WalletDataContext);
  if (!ctx)
    throw new Error("useWalletData must be used within WalletDataProvider");
  return ctx;
}
