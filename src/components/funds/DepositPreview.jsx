import React from "react";
import { formatMoney } from "../../utils/formatMoney";
import { formatVietnamDate } from "../../utils/dateFormat";
import { calcEstimateDate } from "./utils/fundUtils";

export default function DepositPreview({ depositAmount, fund, wallets, depositStatusInfo }) {
  if (!depositAmount || Number(depositAmount) <= 0) {
    return null;
  }

  const amount = Number(depositAmount);
  const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);

  // Logic mới: Kiểm tra số tiền dựa trên trạng thái nạp
  const shouldRequireAmountPerPeriod = depositStatusInfo?.hasEnoughForCurrentPeriod 
    ? depositStatusInfo.extraDepositCount === 0 // Lần nạp thêm đầu tiên
    : true; // Chưa nạp đủ cho chu kỳ hiện tại

  // Kiểm tra số tiền nhỏ hơn số tiền theo tần suất (chỉ khi cần thiết)
  if (shouldRequireAmountPerPeriod && fund.amountPerPeriod && amount < fund.amountPerPeriod) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fff7ed',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
          <strong style={{ color: '#f59e0b' }}>
            {depositStatusInfo?.hasEnoughForCurrentPeriod 
              ? 'Lần nạp thêm đầu tiên phải đủ số tiền theo tần suất!' 
              : 'Số tiền nạp không đủ!'}
          </strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
          Số tiền bạn nhập: <strong>{formatMoney(amount, fund.currency)}</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
          Số tiền theo tần suất: <strong>{formatMoney(fund.amountPerPeriod, fund.currency)}</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#92400e', marginTop: '0.5rem' }}>
          ⚠️ {depositStatusInfo?.hasEnoughForCurrentPeriod 
            ? `Lần nạp thêm đầu tiên phải nạp ít nhất ${formatMoney(fund.amountPerPeriod, fund.currency)}. Các lần sau có thể nạp bao nhiêu cũng được.`
            : `Bạn cần nạp ít nhất ${formatMoney(fund.amountPerPeriod, fund.currency)} để đảm bảo theo đúng kế hoạch.`}
        </div>
      </div>
    );
  }
  
  // Hiển thị thông báo vượt tiến độ nếu đã nạp đủ và đang nạp thêm
  if (depositStatusInfo?.hasEnoughForCurrentPeriod && depositStatusInfo.extraDepositCount > 0) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#f0fdf4',
        border: '2px solid #86efac',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="bi bi-rocket-takeoff-fill" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
          <strong style={{ color: '#047857' }}>Nạp thêm - Vượt tiến độ!</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
          Bạn đã nạp đủ cho chu kỳ hiện tại. Lần nạp này sẽ được tính là <strong>vượt tiến độ</strong>.
        </div>
        <div style={{ fontSize: '0.875rem', color: '#065f46', marginTop: '0.5rem' }}>
          💡 Đây là lần nạp thêm thứ <strong>{depositStatusInfo.extraDepositCount + 1}</strong>. Bạn có thể nạp bao nhiêu cũng được.
        </div>
      </div>
    );
  }

  // Kiểm tra số tiền vượt quá số dư ví
  if (sourceWallet && amount > sourceWallet.balance) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444', fontSize: '1.25rem' }}></i>
          <strong style={{ color: '#ef4444' }}>Số dư ví nguồn không đủ!</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
          Số tiền muốn nạp: <strong>{formatMoney(amount, fund.currency)}</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
          Số dư ví nguồn: <strong>{formatMoney(sourceWallet.balance, sourceWallet.currency)}</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.5rem' }}>
          ⚠️ Vượt quá: <strong>{formatMoney(amount - sourceWallet.balance, fund.currency)}</strong>
        </div>
      </div>
    );
  }

  // Preview số dư sau khi nạp
  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#e7f3ff',
      border: '2px solid #0d6efd',
      borderRadius: '8px',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <i className="bi bi-info-circle-fill" style={{ color: '#0d6efd', fontSize: '1.25rem' }}></i>
        <strong style={{ color: '#0d6efd' }}>Xác nhận thông tin</strong>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#374151' }}>
        Số dư quỹ hiện tại: <strong>{formatMoney(fund.current, fund.currency)}</strong>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#374151' }}>
        Số tiền nạp: <strong>+ {formatMoney(amount, fund.currency)}</strong>
      </div>
      <div style={{ 
        fontSize: '1rem', 
        color: '#0d6efd', 
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #bfdbfe',
        fontWeight: '700'
      }}>
        Số dư sau khi nạp: {formatMoney(fund.current + amount, fund.currency)}
      </div>

      {/* Prediction & Suggestions - Gợi ý dựa trên số tiền nạp */}
      {fund.hasTerm && fund.target && fund.amountPerPeriod && fund.frequency && (() => {
        const newBalance = fund.current + amount;
        const remaining = fund.target - newBalance;

        if (remaining <= 0) return null; // Đã hoàn thành

        let timeUnit = '';
        switch (fund.frequency) {
          case 'DAILY': timeUnit = 'ngày'; break;
          case 'WEEKLY': timeUnit = 'tuần'; break;
          case 'MONTHLY': timeUnit = 'tháng'; break;
        }

        const threshold = fund.amountPerPeriod * 0.1; // 10% tolerance

        // Case 1: Nạp ĐÚNG theo kế hoạch (±10%)
        if (Math.abs(amount - fund.amountPerPeriod) <= threshold) {
          return (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              backgroundColor: '#e7f3ff',
              border: '1px solid #0d6efd',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <i className="bi bi-check-circle-fill" style={{ color: '#0d6efd' }}></i>
                <strong style={{ fontSize: '0.875rem', color: '#084298' }}>Theo đúng kế hoạch</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#0a58ca' }}>
                ✓ Bạn đang nạp đúng số tiền theo tần xuất đã đặt ra. Tiếp tục duy trì để hoàn thành mục tiêu <strong>đúng thời gian dự kiến</strong>!
              </div>
            </div>
          );
        }

        // Case 2: Nạp NHIỀU HƠN kế hoạch
        if (amount > fund.amountPerPeriod) {
          const originalRemaining = fund.target - fund.current;
          const originalPeriodsLeft = Math.ceil(originalRemaining / fund.amountPerPeriod);
          const periodsLeft = Math.ceil(remaining / fund.amountPerPeriod);
          const periodsSaved = originalPeriodsLeft - periodsLeft;

          // Tính ngày hoàn thành dự kiến ban đầu và mới
          let originalEndDate = null;
          let newEndDate = null;
          let timeSavedPercent = 0;

          if (fund.startDate && originalPeriodsLeft > 0 && periodsLeft > 0) {
            const freqMap = {
              'DAILY': 'day',
              'WEEKLY': 'week',
              'MONTHLY': 'month',
              'YEARLY': 'year'
            };

            // Tính từ ngày hiện tại (sau khi nạp)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Ngày hoàn thành dự kiến ban đầu (nếu tiếp tục nạp theo amountPerPeriod)
            originalEndDate = calcEstimateDate(
              today.toISOString().slice(0, 10),
              freqMap[fund.frequency] || 'month',
              originalPeriodsLeft
            );

            // Ngày hoàn thành mới (sau khi nạp amount này, còn lại bao nhiêu kỳ với amountPerPeriod)
            newEndDate = calcEstimateDate(
              today.toISOString().slice(0, 10),
              freqMap[fund.frequency] || 'month',
              periodsLeft
            );

            // Tính phần trăm thời gian tiết kiệm được
            if (originalEndDate && newEndDate) {
              const originalDays = Math.ceil((originalEndDate - today) / (1000 * 60 * 60 * 24));
              const newDays = Math.ceil((newEndDate - today) / (1000 * 60 * 60 * 24));
              if (originalDays > 0) {
                timeSavedPercent = Math.round(((originalDays - newDays) / originalDays) * 100);
              }
            }
          }

          if (periodsSaved > 0) {
            return (
              <div style={{
                marginTop: '0.75rem',
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <i className="bi bi-rocket-takeoff-fill" style={{ color: '#10b981', fontSize: '1.5rem' }}></i>
                  <strong style={{ fontSize: '1rem', color: '#047857' }}>Vượt kế hoạch - Hoàn thành sớm hơn!</strong>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
                  🎉 Nạp nhiều hơn dự kiến! Bạn sẽ hoàn thành mục tiêu <strong>sớm hơn {periodsSaved} {timeUnit}</strong> so với kế hoạch ban đầu.
                </div>

                {timeSavedPercent > 0 && originalEndDate && newEndDate && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '6px',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '0.5rem', fontWeight: '600' }}>
                      📅 Dự báo hoàn thành:
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                      • Theo kế hoạch ban đầu: <strong>{formatVietnamDate(originalEndDate)}</strong>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
                      • Sau khi nạp {formatMoney(amount, fund.currency)}: <strong>{formatVietnamDate(newEndDate)}</strong>
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#047857',
                      fontWeight: '600',
                      padding: '0.75rem',
                      backgroundColor: '#d1fae5',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid #86efac'
                    }}>
                      ⚡ Hoàn thành sớm hơn <strong style={{ fontSize: '1.1rem' }}>{timeSavedPercent}%</strong> so với dự kiến!
                    </div>
                  </div>
                )}

                {!timeSavedPercent && periodsSaved > 0 && (
                  <div style={{ fontSize: '0.875rem', color: '#065f46', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    💡 Tiếp tục nạp với số tiền này sẽ giúp bạn đạt mục tiêu nhanh hơn!
                  </div>
                )}
              </div>
            );
          }
        }

        return null;
      })()}
    </div>
  );
}



