import React, { createContext, useContext, useMemo, useState } from "react";

const WalletDataContext = createContext(null);

export function WalletDataProvider({ children }) {
  // ví
  const [wallets, setWallets] = useState([
    { id: 1, name: "Ví tiền mặt", currency: "VND", balance: 2_500_000, type: "CASH", isDefault: true,  isShared: false, groupId: null, createdAt: "2025-11-01T09:00:00Z", note: "" },
    { id: 2, name: "Techcombank", currency: "VND", balance: 10_000_000, type: "BANK", isDefault: false, isShared: false, groupId: null, createdAt: "2025-11-02T08:30:00Z", note: "" },
    { id: 3, name: "Momo",       currency: "VND", balance: 1_800_000, type: "EWALLET", isDefault: false, isShared: false, groupId: null, createdAt: "2025-11-05T13:15:00Z", note: "" },
  ]);

  // nhóm ví
  const [groups, setGroups] = useState([
    { id: 10, name: "Gia đình", description: "", walletIds: [], budgetWalletId: null, isDefault: false, createdAt: "2025-11-01T09:00:00Z" },
    { id: 11, name: "Đầu tư",  description: "", walletIds: [], budgetWalletId: null, isDefault: false, createdAt: "2025-11-02T09:00:00Z" },
  ]);

  // ====== helpers ======
  const createWallet = async (payload) => {
    // mock API
    await new Promise(r => setTimeout(r, 200));
    const newWallet = { id: Date.now(), createdAt: new Date().toISOString(), ...payload };
    setWallets(prev => {
      let next = [newWallet, ...prev];
      if (newWallet.isDefault) next = next.map(w => (w.id === newWallet.id ? w : { ...w, isDefault: false }));
      return next;
    });
    // nếu là ví nhóm thì liên kết vào group
    if (newWallet.isShared && newWallet.groupId) {
      setGroups(prev => prev.map(g => g.id === newWallet.groupId
        ? { ...g, walletIds: Array.from(new Set([...(g.walletIds||[]), newWallet.id])) }
        : g
      ));
    }
    return newWallet;
  };

  const updateWallet = async (patch) => {
    await new Promise(r => setTimeout(r, 150));
    setWallets(prev => prev.map(w => (w.id === patch.id ? { ...w, ...patch } : w)));
    return patch;
  };

  const deleteWallet = async (id) => {
    await new Promise(r => setTimeout(r, 150));
    setWallets(prev => prev.filter(w => w.id !== id));
    setGroups(prev => prev.map(g => ({ ...g, walletIds: (g.walletIds||[]).filter(wid => wid !== id), budgetWalletId: g.budgetWalletId === id ? null : g.budgetWalletId })));
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
    wallets, groups,
    createWallet, updateWallet, deleteWallet,
    createGroup, linkBudgetWallet
  }), [wallets, groups]);

  return <WalletDataContext.Provider value={value}>{children}</WalletDataContext.Provider>;
}

export function useWalletData() {
  const ctx = useContext(WalletDataContext);
  if (!ctx) throw new Error("useWalletData must be used within WalletDataProvider");
  return ctx;
}
