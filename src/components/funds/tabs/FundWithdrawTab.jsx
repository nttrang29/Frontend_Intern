import React from "react";
import { formatMoney } from "../../../utils/formatMoney";

export default function FundWithdrawTab({
  fund,
  wallets,
  progress,
  saving,
  withdrawProgress,
  handleWithdraw,
  handleSettle,
  setActiveTab
}) {
  const isCompleted = progress >= 100;
  const canWithdraw = !fund.hasTerm || isCompleted;

  if (!canWithdraw) {
    return (
      <div style={{
        padding: '2.5rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <style>{`
          @keyframes shake-icon {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          @keyframes float-icon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          .shake-icon {
            animation: shake-icon 2s ease-in-out infinite;
          }
          .float-icon {
            animation: float-icon 3s ease-in-out infinite;
          }
          .pulsing-icon {
            animation: pulse-icon 2s ease-in-out infinite;
          }
          @keyframes pulse-icon {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.5rem',
          borderRadius: '50%',
          backgroundColor: '#fed7aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
        }}>
          <i className="bi bi-lock-fill shake-icon" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
        </div>
        
        <h5 style={{ color: '#111827', marginBottom: '1rem', fontWeight: '600' }}>
          Quỹ chưa đến hạn rút tiền
        </h5>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.5rem' }}>
            <strong>Quỹ có kỳ hạn:</strong> Chỉ rút khi hoàn thành 100% mục tiêu <strong>hoặc có thể tất toán</strong>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem'
          }}>
            <i className="bi bi-graph-up pulsing-icon" style={{ color: '#f59e0b', animationDuration: '2s' }}></i>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>
              {progress}%
            </span>
            <span style={{ fontSize: '0.875rem', color: '#78350f' }}>
              / 100%
            </span>
          </div>
        </div>
        
        <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1.5rem' }}>
          <i className="bi bi-info-circle me-1"></i>
          Còn thiếu <strong>{100 - progress}%</strong> để hoàn thành mục tiêu
        </div>

        {fund.current > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="btn-primary" 
              disabled={saving}
              onClick={handleSettle}
              style={{ 
                flex: '0 0 auto',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#10b981',
                borderColor: '#10b981'
              }}
            >
              <i className={`bi bi-check-circle me-1 ${saving ? '' : 'pulsing-icon'}`} style={saving ? {} : { animationDuration: '2s' }}></i>
              {saving ? "Đang xử lý..." : "Tất toán"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fund completed - Show celebration and withdraw form
  return (
    <>
      <div style={{
        padding: '2.5rem',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '20px',
        textAlign: 'center',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes bounce-icon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .pulse-ring {
            position: absolute;
            width: 100px;
            height: 100px;
            border: 3px solid rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: pulse-ring 2s ease-out infinite;
          }
        `}</style>
        
        <div className="pulse-ring" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
        <div className="pulse-ring" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0.5s' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'bounce-icon 2s ease-in-out infinite'
          }}>
            <i className="bi bi-trophy-fill" style={{ fontSize: '3rem', color: '#fff' }}></i>
          </div>
          
          <h3 style={{ color: '#fff', fontWeight: '700', marginBottom: '0.75rem' }}>
            🎉 Chúc mừng! Hoàn thành mục tiêu!
          </h3>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '20px',
            marginBottom: '1rem'
          }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: '1.25rem', color: '#fff' }}></i>
            <span style={{ color: '#fff', fontSize: '1.125rem', fontWeight: '600' }}>
              {progress}% hoàn thành
            </span>
          </div>
          
          <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1rem', marginBottom: '0' }}>
            Số dư quỹ: <strong>{formatMoney(fund.current, fund.currency)}</strong>
          </p>
        </div>
      </div>

      <form onSubmit={handleWithdraw}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: '5px solid #10b981',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <i className="bi bi-wallet2 float-icon" style={{ fontSize: '1.25rem', color: '#10b981' }}></i>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Rút về ví nguồn
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  {fund.sourceWalletName || "Ví nguồn"}
                </div>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  color: '#065f46'
                }}>
                  <i className="bi bi-cash-stack pulsing-icon" style={{ animationDuration: '2.5s' }}></i>
                  {(() => {
                    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                    return sourceWallet 
                      ? formatMoney(sourceWallet.balance, sourceWallet.currency)
                      : 'Không tìm thấy';
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: '5px solid #ef4444',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <i className="bi bi-arrow-down-circle-fill float-icon" style={{ fontSize: '1.25rem', color: '#ef4444', animationDuration: '2s' }}></i>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Số tiền sẽ rút
                </div>
                <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Toàn bộ số dư quỹ
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                  {formatMoney(fund.current, fund.currency)}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: '5px solid #0d6efd',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <i className="bi bi-arrow-right-circle-fill pulsing-icon" style={{ fontSize: '1.25rem', color: '#0d6efd', animationDuration: '2s' }}></i>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sau khi rút
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                      Số dư quỹ
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#64748b' }}>
                      0 {fund.currency}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#065f46', marginBottom: '0.25rem' }}>
                      Số dư ví nguồn
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                      {(() => {
                        const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                        return sourceWallet 
                          ? formatMoney(sourceWallet.balance + fund.current, fund.currency)
                          : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: '5px solid #f59e0b',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <i className="bi bi-info-circle-fill pulsing-icon" style={{ fontSize: '1.25rem', color: '#f59e0b', animationDuration: '3s' }}></i>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                  Lưu ý quan trọng
                </div>
                <div style={{ fontSize: '0.875rem', color: '#78350f', lineHeight: '1.6' }}>
                  Sau khi rút tiền thành công, quỹ sẽ được <strong>đóng</strong> và chuyển sang trạng thái <strong>hoàn thành</strong>. 
                  Bạn vẫn có thể xem lại lịch sử quỹ này trong mục "Quỹ đã hoàn thành".
                </div>
              </div>
            </div>
          </div>
        </div>

        {saving && withdrawProgress > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                <i className="bi bi-arrow-down-circle me-1"></i>
                Đang rút tiền...
              </span>
              <span style={{ fontSize: '1.125rem', color: '#10b981', fontWeight: '700' }}>
                {withdrawProgress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#d1fae5',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${withdrawProgress}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
        )}

        <div className="funds-actions mt-3" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("info")}
            disabled={saving}
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
            <i className="bi bi-wallet2 me-1"></i>
            {saving ? "Đang xử lý..." : "Rút toàn bộ"}
          </button>
        </div>
      </form>
    </>
  );
}



