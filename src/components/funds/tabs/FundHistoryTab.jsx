import React from "react";
import { formatMoney } from "../../../utils/formatMoney";

export default function FundHistoryTab({
  fund,
  historyLoading,
  historyError,
  displayHistory
}) {
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h6 className="mb-0 text-muted">Lịch sử giao dịch</h6>
        {historyLoading ? (
          <span style={{ 
            fontSize: '0.875rem', 
            color: '#6c757d',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <i className="bi bi-arrow-repeat bi-spin me-1"></i>
            Đang tải...
          </span>
        ) : displayHistory.length > 0 && (
          <span style={{ 
            fontSize: '0.875rem', 
            color: '#6c757d',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px'
          }}>
            {displayHistory.length} giao dịch
          </span>
        )}
      </div>
      
      {historyLoading ? (
        <div style={{
          padding: '3rem 2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <i className="bi bi-arrow-repeat bi-spin" style={{ fontSize: '3rem', color: '#6c757d', marginBottom: '1rem' }}></i>
          <h6 style={{ color: '#6c757d' }}>Đang tải lịch sử...</h6>
        </div>
      ) : historyError ? (
        <div style={{
          padding: '2rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '0.5rem' }}></i>
          <h6 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Lỗi tải lịch sử</h6>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            {historyError}
          </p>
        </div>
      ) : displayHistory.length === 0 ? (
        <div style={{
          padding: '3rem 2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#6c757d', marginBottom: '1rem' }}></i>
          <h6 style={{ color: '#6c757d' }}>Chưa có giao dịch nào</h6>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            Lịch sử nạp tiền sẽ được hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem',
          maxHeight: '600px',
          overflowY: 'auto',
          paddingRight: '0.5rem'
        }}>
          {displayHistory.map((tx) => {
            const isSuccess = tx.status === 'success';
            const isWithdraw = tx.isWithdraw || tx.type === 'withdraw';
            const isSettle = tx.isSettle || tx.txType === 'settle';
            const isInfoOnly = tx.isInfoOnly || tx.txType === 'info'; // Mục thông báo, không phải giao dịch thực sự
            const isRegularWithdraw = isWithdraw && !isSettle && !isInfoOnly;
            const isDeposit = !isWithdraw && !isInfoOnly;
            
            // Màu sắc đồng bộ với biểu đồ: xanh cho nạp, đỏ cho rút, cam cho tất toán, xanh lá cho thông báo
            let borderColor, iconColor, bgColor;
            if (isInfoOnly) {
              // Mục thông báo "Đã hoàn thành mục tiêu": màu xanh lá
              borderColor = isSuccess ? '#10b981' : '#059669';
              iconColor = isSuccess ? '#10b981' : '#059669';
              bgColor = isSuccess ? '#d1fae5' : '#a7f3d0';
            } else if (isSettle) {
              borderColor = isSuccess ? '#f59e0b' : '#d97706';
              iconColor = isSuccess ? '#f59e0b' : '#d97706';
              bgColor = isSuccess ? '#fef3c7' : '#fde68a';
            } else if (isRegularWithdraw) {
              borderColor = isSuccess ? '#ef4444' : '#dc2626';
              iconColor = isSuccess ? '#ef4444' : '#dc2626';
              bgColor = isSuccess ? '#fee2e2' : '#fecaca';
            } else {
              borderColor = isSuccess ? '#0d6efd' : '#0b63f6';
              iconColor = isSuccess ? '#0d6efd' : '#0b63f6';
              bgColor = isSuccess ? '#dbeafe' : '#bfdbfe';
            }
            
            const iconName = isSuccess ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            
            return (
              <div key={tx.id} style={{
                padding: '1.25rem',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                display: 'flex',
                gap: '1rem',
                alignItems: 'start',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ 
                  flexShrink: 0,
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: isWithdraw 
                    ? (isSuccess ? '#fee2e2' : '#fecaca') 
                    : (isSuccess ? '#d1fae5' : '#fee2e2'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className={`bi ${iconName}`} style={{ 
                    fontSize: '1.25rem', 
                    color: iconColor 
                  }}></i>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className={
                        isInfoOnly
                          ? 'bi bi-trophy-fill'
                          : (isSettle 
                            ? 'bi bi-x-circle' 
                            : (isRegularWithdraw 
                              ? 'bi bi-arrow-down-circle' 
                              : (tx.type === 'auto' ? 'bi bi-arrow-repeat' : 'bi bi-hand-thumbs-up')))
                      } style={{ 
                        fontSize: '1rem',
                        color: iconColor
                      }}></i>
                      <span style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>
                        {tx.typeLabel}
                      </span>
                    </div>
                    
                    {!isInfoOnly && (
                      <div style={{ 
                        padding: '0.375rem 0.75rem',
                        backgroundColor: bgColor,
                        borderRadius: '20px',
                        fontSize: '0.875rem', 
                        fontWeight: '700', 
                        color: iconColor 
                      }}>
                        {(isSettle || isRegularWithdraw) ? '-' : (isSuccess ? '+' : '')}{formatMoney(tx.amount, fund.currency)}
                      </div>
                    )}
                    {isInfoOnly && (
                      <div style={{ 
                        padding: '0.375rem 0.75rem',
                        backgroundColor: bgColor,
                        borderRadius: '20px',
                        fontSize: '0.875rem', 
                        fontWeight: '700', 
                        color: iconColor 
                      }}>
                        {formatMoney(tx.amount, fund.currency)}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <div style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.625rem',
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: iconColor
                    }}>
                      <i className={`bi ${isSuccess ? 'bi-check2' : 'bi-x'}`} style={{ fontSize: '0.875rem' }}></i>
                      {isSuccess ? 'Thành công' : 'Thất bại'}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      <i className="bi bi-clock me-1"></i>
                      {tx.date ? new Date(tx.date).toLocaleString('vi-VN') : 'N/A'}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                    {tx.message}
                  </div>
                  
                  {!isSuccess && tx.walletBalance !== undefined && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ color: '#991b1b', marginBottom: '0.25rem' }}>
                        <strong>Số dư ví tại thời điểm:</strong> {formatMoney(tx.walletBalance, fund.currency)}
                      </div>
                      <div style={{ color: '#991b1b' }}>
                        <strong>Số tiền cần:</strong> {formatMoney(tx.amount, fund.currency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



