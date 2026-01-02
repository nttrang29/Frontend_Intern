// src/utils/fundWarnings.js
/**
 * Calculate warnings for a single fund based on current state and wallets
 * @param {Object} fund
 * @param {Array} wallets
 * @returns {Array}
 */
export const calculateFundWarnings = (fund, wallets) => {
  const warnings = [];
  const sourceWallet = Array.isArray(wallets)
    ? wallets.find((w) => String(w.id) === String(fund.sourceWalletId))
    : null;

  // WARNING 1: Auto deposit enabled but insufficient wallet balance
  if (fund.autoDepositEnabled && fund.autoDepositAmount && sourceWallet) {
    if (Number(sourceWallet.balance) < Number(fund.autoDepositAmount)) {
      warnings.push({
        type: "auto-insufficient",
        fundId: fund.id,
        fundName: fund.name,
        severity: "danger",
        title: `Ví không đủ cho tự động nạp: ${fund.name}`,
        message: `Cần thêm ${Number(fund.autoDepositAmount) - Number(sourceWallet.balance)} ${
          fund.currency
        }`,
        data: {
          needed: Number(fund.autoDepositAmount),
          available: Number(sourceWallet.balance) || 0,
          shortage: Number(fund.autoDepositAmount) - Number(sourceWallet.balance || 0),
        },
      });
    }
  }

  // WARNING 2: Progress behind schedule (chỉ cho quỹ có thời hạn)
  if ((fund.hasTerm || fund.hasDeadline) && fund.target && fund.startDate && fund.frequency && fund.amountPerPeriod) {
    const daysSinceStart = Math.floor((new Date() - new Date(fund.startDate)) / (1000 * 60 * 60 * 24));
    const periodsElapsed =
      fund.frequency === "DAILY"
        ? daysSinceStart
        : fund.frequency === "WEEKLY"
        ? Math.floor(daysSinceStart / 7)
        : fund.frequency === "MONTHLY"
        ? Math.floor(daysSinceStart / 30)
        : Math.floor(daysSinceStart / 365);

    const expectedAmount = Math.min(periodsElapsed * fund.amountPerPeriod, fund.target);

    if (fund.current < expectedAmount * 0.8 && periodsElapsed > 0) {
      warnings.push({
        type: "behind-schedule",
        fundId: fund.id,
        fundName: fund.name,
        severity: "warning",
        title: `Chậm tiến độ: ${fund.name}`,
        message: `Thiếu ${expectedAmount - fund.current} ${fund.currency} so với kế hoạch`,
        data: {
          current: fund.current,
          expected: expectedAmount,
          behind: expectedAmount - fund.current,
        },
      });
    }
  }

  // WARNING 3: Deadline approaching with large remaining amount (chỉ cho quỹ có thời hạn)
  if ((fund.hasTerm || fund.hasDeadline) && fund.target && fund.endDate) {
    const daysRemaining = Math.floor((new Date(fund.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    const amountRemaining = fund.target - fund.current;

    if (daysRemaining > 0 && daysRemaining < 30 && amountRemaining > fund.current * 0.5) {
      warnings.push({
        type: "deadline-approaching",
        fundId: fund.id,
        fundName: fund.name,
        severity: "warning",
        title: `Sắp đến hạn: ${fund.name}`,
        message: `Còn ${daysRemaining} ngày, thiếu ${amountRemaining} ${fund.currency}`,
        data: {
          daysRemaining,
          amountRemaining,
          dailyNeeded: Math.ceil(amountRemaining / daysRemaining),
        },
      });
    }
  }

  return warnings;
};

/**
 * Calculate warnings for all funds
 */
export const calculateAllFundWarnings = (funds, wallets) => {
  if (!Array.isArray(funds)) return [];
  const allWarnings = [];

  funds.forEach((fund) => {
    const fundWarnings = calculateFundWarnings(fund, wallets);
    allWarnings.push(...fundWarnings);
  });

  return allWarnings;
};
