import React from "react";
import { formatMoney } from "../../../utils/formatMoney";
import { formatVietnamDate } from "../../../utils/dateFormat";
import DepositPreview from "../DepositPreview";

export default function FundDepositTab({
  fund,
  wallets,
  isFundCompleted,
  depositAmount,
  setDepositAmount,
  saving,
  todayAutoDepositStatus,
  todayManualDepositStatus,
  depositStatus,
  handleDeposit,
  depositStatusInfo
}) {
  if (isFundCompleted) {
    return (
      <div style={{
        padding: '3rem 2rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.5rem',
          borderRadius: '50%',
          backgroundColor: '#d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem', color: '#10b981' }}></i>
        </div>
        <h5 style={{ color: '#111827', marginBottom: '1rem', fontWeight: '600' }}>
          Quỹ đã hoàn thành mục tiêu
        </h5>
        <p style={{ fontSize: '1rem', color: '#6c757d', marginBottom: '0', lineHeight: '1.6' }}>
          Quỹ của bạn đã đạt 100% mục tiêu. Vui lòng vào mục <strong>"Rút tiền"</strong> để rút tiền về ví và sử dụng.
        </p>
      </div>
    );
  }

  if (fund.autoDepositEnabled) {
    // Auto-deposit mode
    return (
      <>
        <h6 className="mb-3 text-muted">Thông tin nạp tiền tự động</h6>
        
        <div style={{
          padding: '2rem',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            padding: '2rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e5e7eb'
          }}>
            <style>{`
              @keyframes rotate-icon {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse-icon {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              @keyframes bounce-icon {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              .rotating-icon {
                animation: rotate-icon 3s linear infinite;
              }
              .pulsing-icon {
                animation: pulse-icon 2s ease-in-out infinite;
              }
              .bouncing-icon {
                animation: bounce-icon 2s ease-in-out infinite;
              }
            `}</style>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                backgroundColor: '#e7f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(13, 110, 253, 0.15)',
                position: 'relative'
              }}>
                <i className="bi bi-arrow-repeat rotating-icon" style={{ fontSize: '2.5rem', color: '#0d6efd' }}></i>
              </div>
              <h5 style={{ color: '#111827', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                Nạp tiền tự động đang hoạt động
              </h5>
              <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0' }}>
                Quỹ của bạn sẽ được nạp tiền tự động theo lịch đã cài đặt
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Số tiền nạp mỗi lần
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0d6efd' }}>
                    {formatMoney(fund.autoDepositAmount || fund.amountPerPeriod || 0, fund.currency)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tần suất
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                      {fund.frequency === 'DAILY' ? 'Hàng ngày' : 
                       fund.frequency === 'WEEKLY' ? 'Hàng tuần' : 
                       fund.frequency === 'MONTHLY' ? 'Hàng tháng' : 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Ví nguồn
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                      {fund.sourceWalletName || 'N/A'}
                    </div>
                  </div>
                </div>

                {fund.autoDepositTime && (
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Thời gian tự động nạp
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                      {fund.autoDepositTime.substring(0, 5)}
                      {fund.frequency === 'WEEKLY' && fund.autoDepositDayOfWeek && (
                        <span style={{ fontSize: '0.875rem', color: '#6c757d', marginLeft: '0.5rem' }}>
                          - {['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][fund.autoDepositDayOfWeek - 1]}
                        </span>
                      )}
                      {fund.frequency === 'MONTHLY' && fund.autoDepositDayOfMonth && (
                        <span style={{ fontSize: '0.875rem', color: '#6c757d', marginLeft: '0.5rem' }}>
                          - Ngày {fund.autoDepositDayOfMonth}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {todayAutoDepositStatus && (
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: todayAutoDepositStatus.status === 'deposited' ? '#f0fdf4' : 
                                     todayAutoDepositStatus.status === 'pending' ? '#fef2f2' : '#fffbeb',
                    border: `2px solid ${todayAutoDepositStatus.status === 'deposited' ? '#86efac' : 
                                         todayAutoDepositStatus.status === 'pending' ? '#fecaca' : '#fde68a'}`,
                    borderRadius: '12px',
                    flex: '1'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      {todayAutoDepositStatus.status === 'deposited' ? (
                        <i className="bi bi-check-circle-fill pulsing-icon" style={{ fontSize: '1.5rem', color: '#10b981' }}></i>
                      ) : todayAutoDepositStatus.status === 'pending' ? (
                        <i className="bi bi-clock-history rotating-icon" style={{ fontSize: '1.5rem', color: '#ef4444', animationDuration: '2s' }}></i>
                      ) : (
                        <i className="bi bi-hourglass-split bouncing-icon" style={{ fontSize: '1.5rem', color: '#f59e0b' }}></i>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                        Trạng thái hôm nay
                      </div>
                    </div>

                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: todayAutoDepositStatus.status === 'deposited' ? '#065f46' : 
                             todayAutoDepositStatus.status === 'pending' ? '#991b1b' : '#92400e',
                      marginBottom: '0.75rem'
                    }}>
                      {todayAutoDepositStatus.message}
                    </div>

                    {todayAutoDepositStatus.status === 'deposited' && (
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#047857',
                        fontWeight: '500'
                      }}>
                        <strong>Số tiền đã nạp:</strong> {formatMoney(todayAutoDepositStatus.amount, fund.currency)}
                      </div>
                    )}

                    {todayAutoDepositStatus.status === 'pending' && (
                      <div>
                        <div style={{ 
                          padding: '0.75rem', 
                          backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                          borderRadius: '8px',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem', fontWeight: '500' }}>
                            <strong>Thiếu số tiền:</strong> {formatMoney(todayAutoDepositStatus.missingAmount, fund.currency)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#7f1d1d', marginBottom: '0.25rem' }}>
                            <strong>Số dư ví nguồn:</strong> {formatMoney(todayAutoDepositStatus.sourceWalletBalance, fund.currency)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                            <strong>Số tiền cần nạp:</strong> {formatMoney(todayAutoDepositStatus.pendingAmount, fund.currency)}
                          </div>
                        </div>
                        <div style={{
                          padding: '0.75rem',
                          backgroundColor: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          color: '#991b1b',
                          fontWeight: '500'
                        }}>
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          <strong>Vui lòng nạp {formatMoney(todayAutoDepositStatus.missingAmount, fund.currency)} vào ví "{todayAutoDepositStatus.sourceWalletName}" để hệ thống tự động nạp vào quỹ.</strong>
                        </div>
                      </div>
                    )}

                    {todayAutoDepositStatus.status === 'not_deposited' && (
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#92400e',
                        fontWeight: '500'
                      }}>
                        Hệ thống sẽ tự động nạp tiền vào quỹ theo lịch đã cài đặt.
                      </div>
                    )}
                  </div>
                )}

                {fund.autoDepositDayOfMonth && (
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <i className="bi bi-calendar-check pulsing-icon" style={{ fontSize: '1.75rem', color: '#10b981', animationDuration: '3s' }}></i>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Lần nạp tiếp theo
                      </div>
                      <div style={{ fontSize: '1rem', color: '#047857', fontWeight: '600' }}>
                        {fund.frequency === 'MONTHLY' && `Ngày ${fund.autoDepositDayOfMonth} hàng tháng`}
                        {fund.frequency === 'WEEKLY' && `Mỗi tuần vào ${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][fund.autoDepositDayOfWeek || 0]}`}
                        {fund.frequency === 'DAILY' && 'Hàng ngày'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Manual deposit mode
  return (
    <>
      <h6 className="mb-3 text-muted">Thông tin nạp tiền thủ công</h6>
      
      <div style={{
        padding: '2rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          padding: '2rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e5e7eb'
        }}>
          <style>{`
            @keyframes rotate-icon {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse-icon {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            @keyframes bounce-icon {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            .rotating-icon {
              animation: rotate-icon 3s linear infinite;
            }
            .pulsing-icon {
              animation: pulse-icon 2s ease-in-out infinite;
            }
            .bouncing-icon {
              animation: bounce-icon 2s ease-in-out infinite;
            }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
              position: 'relative'
            }}>
              <i className="bi bi-wallet2 rotating-icon" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
            </div>
            <h5 style={{ color: '#111827', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
              Nạp tiền thủ công
            </h5>
            <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0' }}>
              Bạn có thể nạp tiền vào quỹ bất kỳ lúc nào
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Số tiền theo tần suất
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}>
                  {formatMoney(fund.amountPerPeriod || 0, fund.currency)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tần suất
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                    {fund.frequency === 'DAILY' ? 'Hàng ngày' : 
                     fund.frequency === 'WEEKLY' ? 'Hàng tuần' : 
                     fund.frequency === 'MONTHLY' ? 'Hàng tháng' : 'N/A'}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ví nguồn
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                    {fund.sourceWalletName || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Số dư quỹ hiện tại
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0d6efd' }}>
                  {formatMoney(fund.current, fund.currency)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todayManualDepositStatus && (
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: todayManualDepositStatus.status === 'deposited' ? '#f0fdf4' : '#fffbeb',
                  border: `2px solid ${todayManualDepositStatus.status === 'deposited' ? '#86efac' : '#fde68a'}`,
                  borderRadius: '12px',
                  flex: '1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {todayManualDepositStatus.status === 'deposited' ? (
                      <i className="bi bi-check-circle-fill pulsing-icon" style={{ fontSize: '1.5rem', color: '#10b981' }}></i>
                    ) : (
                      <i className="bi bi-hourglass-split bouncing-icon" style={{ fontSize: '1.5rem', color: '#f59e0b' }}></i>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                      Trạng thái hôm nay
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: todayManualDepositStatus.status === 'deposited' ? '#065f46' : '#92400e',
                    marginBottom: '0.75rem'
                  }}>
                    {todayManualDepositStatus.message}
                  </div>

                  {todayManualDepositStatus.status === 'deposited' && (
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#047857',
                      fontWeight: '500'
                    }}>
                      <strong>Số tiền đã nạp:</strong> {formatMoney(todayManualDepositStatus.amount, fund.currency)}
                    </div>
                  )}

                  {todayManualDepositStatus.status === 'not_deposited' && (
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#92400e',
                      fontWeight: '500'
                    }}>
                      Bạn có thể nạp tiền vào quỹ bất kỳ lúc nào.
                    </div>
                  )}
                </div>
              )}

              {fund.frequency && fund.startDate && (() => {
                const nextDate = depositStatus.nextDepositDate || (() => {
                  const now = new Date();
                  const start = new Date(fund.startDate);
                  const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                  
                  let daysPerPeriod = 1;
                  switch (fund.frequency) {
                    case 'DAILY': daysPerPeriod = 1; break;
                    case 'WEEKLY': daysPerPeriod = 7; break;
                    case 'MONTHLY': daysPerPeriod = 30; break;
                  }
                  
                  const currentPeriod = Math.floor(daysSinceStart / daysPerPeriod);
                  const nextPeriod = currentPeriod + 1;
                  return new Date(start.getTime() + nextPeriod * daysPerPeriod * 24 * 60 * 60 * 1000);
                })();
                
                return (
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <i className="bi bi-calendar-check pulsing-icon" style={{ fontSize: '1.75rem', color: '#10b981', animationDuration: '3s' }}></i>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Lần nạp tiếp theo
                      </div>
                      <div style={{ fontSize: '1rem', color: '#047857', fontWeight: '600' }}>
                        {formatVietnamDate(nextDate)}
                        {fund.frequency === 'DAILY' && ' (Hàng ngày)'}
                        {fund.frequency === 'WEEKLY' && ' (Hàng tuần)'}
                        {fund.frequency === 'MONTHLY' && ' (Hàng tháng)'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <form onSubmit={handleDeposit}>
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
              {/* Cảnh báo - Hiển thị trước input */}
              <DepositPreview depositAmount={depositAmount} fund={fund} wallets={wallets} depositStatusInfo={depositStatusInfo} />
              
              <div className="funds-field">
                <label>
                  Số tiền muốn nạp ({fund.currency}) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => {
                    // Chỉ cho phép số và dấu chấm
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setDepositAmount(value);
                  }}
                  onWheel={(e) => {
                    // Chặn cuộn chuột để thay đổi số tiền
                    e.target.blur();
                  }}
                  onKeyDown={(e) => {
                    // Chặn các phím không phải số, dấu chấm, backspace, delete, arrow keys
                    if (!/[0-9.]/.test(e.key) && 
                        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key) &&
                        !(e.ctrlKey || e.metaKey) && // Cho phép Ctrl+C, Ctrl+V, etc.
                        !(e.key === 'a' && (e.ctrlKey || e.metaKey)) && // Cho phép Ctrl+A
                        !(e.key === 'c' && (e.ctrlKey || e.metaKey)) &&
                        !(e.key === 'v' && (e.ctrlKey || e.metaKey)) &&
                        !(e.key === 'x' && (e.ctrlKey || e.metaKey))) {
                      e.preventDefault();
                    }
                  }}
                  inputMode="decimal"
                  pattern="[0-9]*"
                  placeholder="Nhập số tiền muốn nạp"
                  style={{
                    MozAppearance: 'textfield',
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    padding: 'var(--spacing-sm) 10px',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'var(--transition-base)'
                  }}
                  className="no-spinner"
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                    e.target.style.boxShadow = '0 0 0 1px rgba(45, 153, 174, 0.35)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div className="funds-hint">
                  Số tiền tối thiểu: 1,000 {fund.currency}
                  {fund.amountPerPeriod && (
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                      {' • '}Số tiền theo tần suất: {formatMoney(fund.amountPerPeriod, fund.currency)} (bắt buộc)
                    </span>
                  )}
                  {(() => {
                    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                    return sourceWallet 
                      ? ` • Số dư ví nguồn: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`
                      : '';
                  })()}
                </div>
              </div>

              <div className="funds-actions mt-3" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={saving || (() => {
                    const amount = Number(depositAmount);
                    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                    return amount > 0 && sourceWallet && amount > sourceWallet.balance;
                  })()}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  {saving ? "Đang xử lý..." : "Xác nhận nạp tiền"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}



