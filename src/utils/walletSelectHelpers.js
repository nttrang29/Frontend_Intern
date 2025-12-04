export const WALLET_TYPE_ICON_CONFIG = {
  personal: {
    icon: "bi-person-bounding-box",
    color: "#0f172a",
    bg: "linear-gradient(135deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.03) 100%)",
  },
  shared: {
    icon: "bi-person-check-fill",
    color: "#0f766e",
    bg: "linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(45,212,191,0.05) 100%)",
  },
  group: {
    icon: "bi-people-fill",
    color: "#1d4ed8",
    bg: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(14,165,233,0.08) 100%)",
  },
};

export const resolveWalletTypeKey = (wallet = {}) => {
  if (wallet?.isShared) return "group";
  if (wallet?.hasSharedMembers) return "shared";
  return "personal";
};

export const mapWalletsToSelectOptions = (wallets = [], labels = {}, valueSelector = (wallet) => wallet.name) => {
  if (!Array.isArray(wallets)) return [];
  return wallets
    .map((wallet) => {
      if (!wallet) return null;
      const rawValue = valueSelector(wallet);
      if (rawValue === undefined || rawValue === null || rawValue === "") return null;
      const typeKey = resolveWalletTypeKey(wallet);
      const config = WALLET_TYPE_ICON_CONFIG[typeKey] || WALLET_TYPE_ICON_CONFIG.personal;
      return {
        value: String(rawValue),
        label: wallet.name || wallet.walletName || String(rawValue),
        icon: config.icon,
        iconColor: config.color,
        iconBg: config.bg,
        description: labels[typeKey],
        raw: wallet,
      };
    })
    .filter(Boolean);
};
