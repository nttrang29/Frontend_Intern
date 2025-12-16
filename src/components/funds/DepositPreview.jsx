import React from "react";
import { formatMoney } from "../../utils/formatMoney";
import { formatVietnamDate } from "../../utils/dateFormat";
import { calcEstimateDate } from "./utils/fundUtils";

export default function DepositPreview({ depositAmount, fund, wallets, depositStatusInfo, todayManualDepositStatus }) {
  if (!depositAmount || Number(depositAmount) <= 0) {
    return null;
  }

  const amount = Number(depositAmount);
  const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
  
  // Tính số tiền đã nạp hôm nay (nếu có)
  const todayDepositedAmount = todayManualDepositStatus?.status === 'deposited' 
    ? (todayManualDepositStatus.amount || 0) 
    : 0;

  // Ngưỡng vượt tiến độ: 1,000 VND (dùng chung cho toàn component)
  const threshold = 1000;

  // Logic mới: Kiểm tra số tiền dựa trên trạng thái nạp
  // Nếu hôm nay đã nạp >= tần suất, thì lần nạp tiếp theo không cần yêu cầu >= tần suất
  const hasEnoughToday = todayDepositedAmount >= (fund.amountPerPeriod || 0);
  const shouldRequireAmountPerPeriod = depositStatusInfo?.hasEnoughForCurrentPeriod 
    ? (depositStatusInfo.extraDepositCount === 0 && !hasEnoughToday) // Lần nạp thêm đầu tiên nhưng chưa nạp đủ hôm nay
    : !hasEnoughToday; // Chưa nạp đủ cho chu kỳ hiện tại và chưa nạp đủ hôm nay

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
  
  // Hiển thị thông báo vượt tiến độ nếu đã nạp đủ và đang nạp thêm (chỉ cho quỹ có thời hạn)
  // Điều kiện: 
  // 1. Đã nạp đủ cho chu kỳ và có lần nạp thêm (extraDepositCount > 0), HOẶC
  // 2. Hôm nay đã nạp >= tần suất + 1,000 VND (vượt tiến độ), HOẶC
  // 3. Hôm nay đã nạp >= tần suất và đang nhập số tiền nạp tiếp (lần nạp thứ 2 trong ngày)
  const hasDeadline = fund.hasDeadline || fund.hasTerm || !!fund.endDate;
  const isAheadToday = todayDepositedAmount >= ((fund.amountPerPeriod || 0) + threshold);
  const isSecondDepositToday = hasEnoughToday && todayDepositedAmount > 0;
  
  if (hasDeadline && ((depositStatusInfo?.hasEnoughForCurrentPeriod && depositStatusInfo.extraDepositCount > 0) 
      || isAheadToday 
      || isSecondDepositToday)) {
    const extraDepositCount = depositStatusInfo?.extraDepositCount || 0;
    const displayCount = isSecondDepositToday && extraDepositCount === 0 ? 1 : (extraDepositCount + 1);
    
    // Tính phần trăm vượt tiến độ (chuẩn hóa với logic nạp theo tần suất)
    const totalTodayDeposit = todayDepositedAmount + amount;
    const totalExtraAmount = totalTodayDeposit - (fund.amountPerPeriod || 0);
    
    // Chỉ tính phần trăm khi vượt >= threshold (1,000 VND)
    const aheadPercent = fund.amountPerPeriod && totalExtraAmount >= threshold
      ? Math.round((totalExtraAmount / fund.amountPerPeriod) * 100)
      : 0;
    
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
        {todayDepositedAmount > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#065f46', marginTop: '0.5rem' }}>
            Đã nạp hôm nay: <strong>{formatMoney(todayDepositedAmount, fund.currency)}</strong>
            {fund.amountPerPeriod && (
              <> (Tần suất: {formatMoney(fund.amountPerPeriod, fund.currency)})</>
            )}
          </div>
        )}
        {aheadPercent > 0 && (
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#047857', 
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '6px',
            fontWeight: '600'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              Bạn đang nạp <strong style={{ fontSize: '1rem', color: '#047857' }}>+{aheadPercent}%</strong> so với số tiền theo tần suất.
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
              • Số tiền theo tần suất: <strong>{formatMoney(fund.amountPerPeriod, fund.currency)}</strong>
            </div>
            {todayDepositedAmount > 0 && (
              <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                • Đã nạp hôm nay: <strong>{formatMoney(todayDepositedAmount, fund.currency)}</strong>
              </div>
            )}
            <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.25rem' }}>
              • Số tiền nạp: <strong>{formatMoney(amount, fund.currency)}</strong>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#047857', fontWeight: '600' }}>
              • Vượt tiến độ: <strong style={{ fontSize: '1rem' }}>+{aheadPercent}%</strong> ({formatMoney(totalExtraAmount, fund.currency)})
            </div>
          </div>
        )}
        <div style={{ fontSize: '0.875rem', color: '#065f46', marginTop: '0.5rem' }}>
          Đây là lần nạp thêm thứ <strong>{displayCount}</strong>. Bạn có thể nạp bao nhiêu cũng được.
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

      {/* Prediction & Suggestions - Gợi ý dựa trên số tiền nạp (chỉ cho quỹ có thời hạn) */}
      {(fund.hasTerm || fund.hasDeadline) && fund.target && fund.amountPerPeriod && fund.frequency && (() => {
        const newBalance = fund.current + amount;
        const remaining = fund.target - newBalance;

        if (remaining <= 0) return null; // Đã hoàn thành

        let timeUnit = '';
        switch (fund.frequency) {
          case 'DAILY': timeUnit = 'ngày'; break;
          case 'WEEKLY': timeUnit = 'tuần'; break;
          case 'MONTHLY': timeUnit = 'tháng'; break;
        }
        
        // Tính tổng số tiền sẽ nạp hôm nay (bao gồm cả lần nạp đang nhập)
        const totalTodayDeposit = todayDepositedAmount + amount;
        const totalExtraAmount = totalTodayDeposit - fund.amountPerPeriod; // Tổng số tiền vượt so với tần suất
        
        // Nếu hôm nay đã nạp vượt >= 1,000 VND, thì bất kỳ lần nạp tiếp theo nào cũng là "vượt tiến độ"
        const alreadyAheadToday = todayDepositedAmount >= (fund.amountPerPeriod + threshold);
        
        // Số tiền vượt của lần nạp đang nhập
        const extraAmount = amount - fund.amountPerPeriod;

        // Case 1: Nạp ĐÚNG theo kế hoạch (chênh lệch < 1,000 VND)
        // Chỉ khi vượt >= 1,000 VND mới tính là "vượt tiến độ"
        // Nếu đã nạp vượt hôm nay rồi, thì bất kỳ lần nạp tiếp theo nào cũng là "vượt tiến độ"
        if (!alreadyAheadToday && totalExtraAmount < threshold && extraAmount < threshold) {
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

        // Case 2: Nạp NHIỀU HƠN kế hoạch (vượt >= 1,000 VND)
        // Hiển thị khi:
        // - Đã nạp vượt hôm nay rồi (alreadyAheadToday), HOẶC
        // - Tổng số tiền sẽ nạp hôm nay vượt >= 1,000 VND (totalExtraAmount >= threshold), HOẶC
        // - Lần nạp đang nhập vượt >= 1,000 VND (extraAmount >= threshold)
        if (alreadyAheadToday || totalExtraAmount >= threshold || extraAmount >= threshold) {
          const originalRemaining = fund.target - fund.current;
          const originalPeriodsLeft = Math.ceil(originalRemaining / fund.amountPerPeriod);
          const periodsLeft = Math.ceil(remaining / fund.amountPerPeriod);
          const periodsSaved = originalPeriodsLeft - periodsLeft;

          // Tính phần trăm vượt tiến độ dựa trên tổng số tiền vượt (bao gồm cả đã nạp hôm nay)
          // Sử dụng totalExtraAmount thay vì extraAmount để tính chính xác
          const aheadPercent = totalExtraAmount >= threshold 
            ? Math.round((totalExtraAmount / fund.amountPerPeriod) * 100)
            : Math.round((extraAmount / fund.amountPerPeriod) * 100);

          // Tính ngày hoàn thành dự kiến ban đầu và mới
          let originalEndDate = null;
          let newEndDate = null;
          let timeSavedPercent = 0;
          let daysSaved = 0;

          if (fund.startDate && originalPeriodsLeft > 0) {
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
            if (periodsLeft > 0) {
              newEndDate = calcEstimateDate(
                today.toISOString().slice(0, 10),
                freqMap[fund.frequency] || 'month',
                periodsLeft
              );
            }

            // Tính phần trăm thời gian tiết kiệm được
            if (originalEndDate) {
              const originalDays = Math.ceil((originalEndDate - today) / (1000 * 60 * 60 * 24));
              if (newEndDate && originalDays > 0) {
                const newDays = Math.ceil((newEndDate - today) / (1000 * 60 * 60 * 24));
                daysSaved = originalDays - newDays;
                timeSavedPercent = Math.round(((daysSaved / originalDays) * 100));
              } else if (remaining <= 0) {
                // Đã hoàn thành mục tiêu
                daysSaved = originalDays;
                timeSavedPercent = 100;
              }
            }
          }

          // Luôn hiển thị thông báo vượt tiến độ khi:
          // - Đã nạp vượt hôm nay rồi, HOẶC
          // - Nạp nhiều hơn tần suất
          if (alreadyAheadToday || amount > fund.amountPerPeriod) {
            return (
              <div style={{
                marginTop: '0.75rem',
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '1rem', color: '#047857' }}>Vượt kế hoạch - Hoàn thành sớm hơn!</strong>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
                  Nạp nhiều hơn dự kiến! Bạn đang nạp <strong style={{ color: '#047857', fontSize: '1rem' }}>+{aheadPercent}%</strong> so với số tiền theo tần suất.
                  {periodsSaved > 0 && (
                    <> Bạn sẽ hoàn thành mục tiêu <strong>sớm hơn {periodsSaved} {timeUnit}</strong> so với kế hoạch ban đầu.</>
                  )}
                </div>

                {/* Hiển thị thông tin chi tiết về phần trăm vượt tiến độ */}
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '6px',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Chi tiết vượt tiến độ:
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                    • Số tiền theo tần suất: <strong>{formatMoney(fund.amountPerPeriod, fund.currency)}</strong>
                  </div>
                  {todayDepositedAmount > 0 && (
                    <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                      • Đã nạp hôm nay: <strong>{formatMoney(todayDepositedAmount, fund.currency)}</strong>
                    </div>
                  )}
                  <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.25rem' }}>
                    • Số tiền nạp: <strong>{formatMoney(amount, fund.currency)}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '0.5rem', fontWeight: '600' }}>
                    • Vượt tiến độ: <strong style={{ fontSize: '1rem' }}>+{aheadPercent}%</strong> ({formatMoney(totalExtraAmount >= threshold ? totalExtraAmount : extraAmount, fund.currency)})
                  </div>

                  {originalEndDate && (
                    <>
                      <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '0.5rem', fontWeight: '600', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #86efac' }}>
                        Dự báo hoàn thành:
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                        • Theo kế hoạch ban đầu: <strong>{formatVietnamDate(originalEndDate)}</strong>
                      </div>
                      {newEndDate && (
                        <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
                          • Sau khi nạp {formatMoney(amount, fund.currency)}: <strong>{formatVietnamDate(newEndDate)}</strong>
                        </div>
                      )}
                      {remaining <= 0 && (
                        <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: '600' }}>
                          • Đã hoàn thành mục tiêu!
                        </div>
                      )}
                      {timeSavedPercent > 0 && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#047857',
                          fontWeight: '600',
                          padding: '0.75rem',
                          backgroundColor: '#d1fae5',
                          borderRadius: '6px',
                          textAlign: 'center',
                          border: '1px solid #86efac',
                          marginTop: '0.5rem'
                        }}>
                          Hoàn thành sớm hơn <strong style={{ fontSize: '1.1rem' }}>{timeSavedPercent}%</strong> so với dự kiến!
                          {daysSaved > 0 && (
                            <> ({daysSaved} ngày)</>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {!originalEndDate && (
                    <div style={{ fontSize: '0.875rem', color: '#065f46', fontStyle: 'italic', marginTop: '0.5rem' }}>
                      Tiếp tục nạp với số tiền này sẽ giúp bạn đạt mục tiêu nhanh hơn!
                    </div>
                  )}
                </div>
              </div>
            );
          }
        }

        return null;
      })()}
    </div>
  );
}



