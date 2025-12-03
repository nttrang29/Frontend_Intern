// src/utils/fundWarnings.js
/**
 * Tính toán warnings cho một quỹ
 * @param {Object} fund - Fund object
 * @param {Array} wallets - Danh sách ví
 * @returns {Array} - Danh sách warnings
 */
export const calculateFundWarnings = (fund, wallets) => {
  const warnings = [];
  const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
  
  // WARNING 1: Tự động nạp tiền nhưng số dư ví không đủ
  if (fund.autoDepositEnabled && fund.autoDepositAmount && sourceWallet) {
    if (sourceWallet.balance < fund.autoDepositAmount) {
      warnings.push({
        type: 'auto-insufficient',
        fundId: fund.id,
        fundName: fund.name,
        severity: 'danger',
        title: `Ví không đủ cho tự động nạp: ${fund.name}`,
        message: `Cần thêm ${fund.autoDepositAmount - sourceWallet.balance} ${fund.currency}`,
        data: {
          needed: fund.autoDepositAmount,
          available: sourceWallet.balance,
          shortage: fund.autoDepositAmount - sourceWallet.balance
        }
      });
    }
  }
  
  // WARNING 2: Tiến độ chậm so với kế hoạch
  if (fund.hasTerm && fund.target && fund.startDate && fund.frequency && fund.amountPerPeriod) {
    const daysSinceStart = Math.floor((new Date() - new Date(fund.startDate)) / (1000 * 60 * 60 * 24));
    const periodsElapsed = fund.frequency === 'DAILY' ? daysSinceStart :
                          fund.frequency === 'WEEKLY' ? Math.floor(daysSinceStart / 7) :
                          fund.frequency === 'MONTHLY' ? Math.floor(daysSinceStart / 30) :
                          Math.floor(daysSinceStart / 365);
    
    const expectedAmount = Math.min(periodsElapsed * fund.amountPerPeriod, fund.target);
    
    if (fund.current < expectedAmount * 0.8 && periodsElapsed > 0) {
      warnings.push({
        type: 'behind-schedule',
        fundId: fund.id,
        fundName: fund.name,
        severity: 'warning',
        title: `Chậm tiến độ: ${fund.name}`,
        message: `Thiếu ${expectedAmount - fund.current} ${fund.currency} so với kế hoạch`,
        data: {
          current: fund.current,
          expected: expectedAmount,
          behind: expectedAmount - fund.current
        }
      });
    }
  }
  
  // WARNING 3: Sắp đến hạn nhưng còn nhiều tiền cần nạp
  if (fund.hasTerm && fund.target && fund.endDate) {
    const daysRemaining = Math.floor((new Date(fund.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    const amountRemaining = fund.target - fund.current;
    
    if (daysRemaining > 0 && daysRemaining < 30 && amountRemaining > fund.current * 0.5) {
      warnings.push({
        type: 'deadline-approaching',
        fundId: fund.id,
        fundName: fund.name,
        severity: 'warning',
        title: `Sắp đến hạn: ${fund.name}`,
        message: `Còn ${daysRemaining} ngày, thiếu ${amountRemaining} ${fund.currency}`,
        data: {
          daysRemaining,
          amountRemaining,
          dailyNeeded: Math.ceil(amountRemaining / daysRemaining)
        }
      });
    }
  }
  
  return warnings;
};

/**
 * Tính toán warnings cho tất cả quỹ
 */
export const calculateAllFundWarnings = (funds, wallets) => {
  const allWarnings = [];
  
  funds.forEach(fund => {
    const fundWarnings = calculateFundWarnings(fund, wallets);
    allWarnings.push(...fundWarnings);
  });
  
  return allWarnings;
};

