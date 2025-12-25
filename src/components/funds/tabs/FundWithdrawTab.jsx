import React from "react";
import { formatMoney } from "../../../utils/formatMoney";
import { parseAmount, parseAmountNonNegative } from "../../../utils/parseAmount";
import { formatMoneyInput, getMoneyValue } from "../../../utils/formatMoneyInput";
import "../../../styles/components/funds/FundWithdrawTab.css";

export default function FundWithdrawTab({
  fund,
  wallets,
  progress,
  saving,
  withdrawProgress,
  partialWithdrawAmount,
  setPartialWithdrawAmount,
  handleWithdraw,
  handleSettle,
  handleDelete,
  setActiveTab
}) {
  const isCompleted = progress >= 100;
  // Cho phép rút tiền nếu: quỹ không thời hạn HOẶC quỹ có thời hạn đã hoàn thành
  const canWithdraw = !fund.hasTerm || isCompleted;
  const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
  
  // Parse amount safely handling formatted strings (e.g. "1.000.000")
  const getNumericAmount = (val) => {
    if (!val) return 0;
    return getMoneyValue(val);
  };

  const withdrawAmountValue = partialWithdrawAmount ? getNumericAmount(partialWithdrawAmount) : fund.current;
  const newWalletBalance = sourceWallet ? sourceWallet.balance + withdrawAmountValue : 0;
  const isFullWithdraw = !partialWithdrawAmount || withdrawAmountValue >= fund.current;

  if (!canWithdraw) {
    return (
      <div className="fund-withdraw-locked">
        <div className="fund-withdraw-locked__icon">
          <i className="bi bi-lock-fill"></i>
        </div>
        
        <h5 className="fund-withdraw-locked__title">
          Quỹ chưa đến hạn rút tiền
        </h5>
        
        <div className="fund-withdraw-locked__info">
          <div className="fund-withdraw-locked__info-text">
            <strong>Quỹ có kỳ hạn:</strong> Chỉ rút khi hoàn thành 100% mục tiêu <strong>hoặc có thể tất toán</strong>
          </div>
          <div className="fund-withdraw-locked__progress">
            <i className="bi bi-graph-up"></i>
            <span className="fund-withdraw-locked__progress-value">{progress}%</span>
            <span className="fund-withdraw-locked__progress-max">/ 100%</span>
          </div>
        </div>
        
        <div className="fund-withdraw-locked__hint">
          <i className="bi bi-info-circle me-1"></i>
          Còn thiếu <strong>{100 - progress}%</strong> để hoàn thành mục tiêu
        </div>

        {fund.current > 0 && (
          <div className="fund-withdraw-locked__actions">
            <button 
              type="button" 
              className="btn btn-settle" 
              disabled={saving}
              onClick={handleSettle}
            >
              <i className={`bi bi-check-circle me-1 ${saving ? '' : 'pulsing'}`}></i>
              {saving ? "Đang xử lý..." : "Tất toán"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Hiển thị UI khác nhau cho quỹ có thời hạn và không thời hạn
  const isNoTermFund = !fund.hasTerm;
  
  return (
    <>
      {/* Celebration Card - Chỉ hiển thị cho quỹ có thời hạn */}
      {!isNoTermFund && (
        <div className="fund-withdraw-celebration">
          <div className="fund-withdraw-celebration__rings">
            <div className="fund-withdraw-celebration__ring"></div>
            <div className="fund-withdraw-celebration__ring"></div>
          </div>
          
          <div className="fund-withdraw-celebration__content">
            <div className="fund-withdraw-celebration__icon">
              <i className="bi bi-trophy-fill"></i>
            </div>
            
            <h3 className="fund-withdraw-celebration__title">
              🎉 Chúc mừng! Hoàn thành mục tiêu!
            </h3>
            
            <div className="fund-withdraw-celebration__badge">
              <i className="bi bi-check-circle-fill"></i>
              <span>{progress}% hoàn thành</span>
            </div>
            
            <p className="fund-withdraw-celebration__balance">
              Số dư quỹ: <strong>{formatMoney(fund.current, fund.currency)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Info Card cho quỹ không thời hạn - Gọn hơn */}
      {isNoTermFund && (
        <div className="fund-withdraw-card fund-withdraw-card--info fund-withdraw-card--compact">
          <div className="fund-withdraw-card__content">
            <div className="fund-withdraw-card__info-compact">
              <div className="fund-withdraw-card__info-compact-item">
                <i className="bi bi-wallet2"></i>
                <div>
                  <span className="fund-withdraw-card__info-compact-label">Ví nguồn</span>
                  <span className="fund-withdraw-card__info-compact-value">{fund.sourceWalletName || "Ví nguồn"}</span>
                </div>
              </div>
              <div className="fund-withdraw-card__info-compact-item">
                <i className="bi bi-cash-stack"></i>
                <div>
                  <span className="fund-withdraw-card__info-compact-label">Số dư quỹ</span>
                  <span className="fund-withdraw-card__info-compact-value fund-withdraw-card__info-compact-value--highlight">
                    {formatMoney(fund.current, fund.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      <form onSubmit={handleWithdraw} className="fund-withdraw-form">
        <div className="fund-withdraw-form__cards">
          {/* Source Wallet & After Withdraw Card - Chỉ hiển thị cho quỹ có thời hạn */}
          {!isNoTermFund && (
            /* Quỹ có thời hạn: Hiển thị đầy đủ thông tin */
            <div className="fund-withdraw-card fund-withdraw-card--source">
              <div className="fund-withdraw-card__icon">
                <i className="bi bi-wallet2"></i>
              </div>
              
              <div className="fund-withdraw-card__content">
                <div className="fund-withdraw-card__label">Rút về ví nguồn</div>
                <div className="fund-withdraw-card__title">
                  {fund.sourceWalletName || "Ví nguồn"}
                </div>
                
                <div className="fund-withdraw-card__balance-info">
                  <div className="fund-withdraw-card__balance-item">
                    <div className="fund-withdraw-card__balance-label">Số dư hiện tại</div>
                    <div className="fund-withdraw-card__balance-value">
                      {sourceWallet 
                        ? formatMoney(sourceWallet.balance, sourceWallet.currency)
                        : 'Không tìm thấy'}
                    </div>
                  </div>
                  
                  <div className="fund-withdraw-card__balance-arrow">
                    <i className="bi bi-arrow-down"></i>
                  </div>
                  
                  <div className="fund-withdraw-card__balance-item fund-withdraw-card__balance-item--after">
                    <div className="fund-withdraw-card__balance-label">Số dư sau khi rút</div>
                    <div className="fund-withdraw-card__balance-value fund-withdraw-card__balance-value--highlight">
                      {sourceWallet 
                        ? formatMoney(newWalletBalance, fund.currency)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount Card - Chỉ hiển thị cho quỹ không thời hạn */}
          {isNoTermFund && (
            <div className="fund-withdraw-card fund-withdraw-card--amount">
              <div className="fund-withdraw-card__icon">
                <i className="bi bi-arrow-down-circle-fill"></i>
              </div>
              
              <div className="fund-withdraw-card__content">
                <div className="fund-withdraw-card__label">Số tiền sẽ rút</div>
                <div className="fund-withdraw-form__amount-input-group">
                  <input
                    type="text"
                    className="fund-withdraw-form__amount-input"
                    placeholder="Nhập số tiền..."
                    value={partialWithdrawAmount}
                    onChange={(e) => {
                      const formatted = formatMoneyInput(e.target.value);
                      setPartialWithdrawAmount(formatted);
                    }}
                    inputMode="decimal"
                    disabled={saving}
                  />
                  <div className="fund-withdraw-form__amount-hint">
                    <span className="fund-withdraw-form__amount-max">
                      Tối đa: {formatMoney(fund.current, fund.currency)}
                    </span>
                  </div>
                </div>
                {partialWithdrawAmount && getNumericAmount(partialWithdrawAmount) > 0 && (
                  <div className="fund-withdraw-card__amount-display">
                    {formatMoney(getNumericAmount(partialWithdrawAmount), fund.currency)}
                    {getNumericAmount(partialWithdrawAmount) < fund.current && (
                      <span className="fund-withdraw-card__amount-remaining">
                        (Còn lại: {formatMoney(fund.current - getNumericAmount(partialWithdrawAmount), fund.currency)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Display cho quỹ có thời hạn - chỉ hiển thị số tiền sẽ rút (toàn bộ) */}
          {!isNoTermFund && (
            <div className="fund-withdraw-card fund-withdraw-card--amount">
              <div className="fund-withdraw-card__icon">
                <i className="bi bi-arrow-down-circle-fill"></i>
              </div>
              
              <div className="fund-withdraw-card__content">
                <div className="fund-withdraw-card__label">Số tiền sẽ rút</div>
                <div className="fund-withdraw-card__amount-display fund-withdraw-card__amount-display--full">
                  {formatMoney(fund.current, fund.currency)}
                  <span className="fund-withdraw-card__amount-note">
                    (Rút toàn bộ)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning Card - Chỉ hiển thị cho quỹ có thời hạn */}
          {!isNoTermFund && (
            <div className="fund-withdraw-card fund-withdraw-card--warning">
              <div className="fund-withdraw-card__icon">
                <i className="bi bi-info-circle-fill"></i>
              </div>
              
              <div className="fund-withdraw-card__content">
                <div className="fund-withdraw-card__warning-title">Lưu ý quan trọng</div>
                <div className="fund-withdraw-card__warning-text">
                  Sau khi rút tiền thành công, quỹ sẽ được <strong>đóng</strong> và chuyển sang trạng thái <strong>hoàn thành</strong>. 
                  Bạn vẫn có thể xem lại lịch sử quỹ này trong mục "Quỹ đã hoàn thành".
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {saving && withdrawProgress > 0 && (
          <div className="fund-withdraw-progress">
            <div className="fund-withdraw-progress__header">
              <span className="fund-withdraw-progress__label">
                <i className="bi bi-arrow-down-circle me-1"></i>
                Đang rút tiền...
              </span>
              <span className="fund-withdraw-progress__value">{withdrawProgress}%</span>
            </div>
            <div className="fund-withdraw-progress__bar">
              <div 
                className="fund-withdraw-progress__fill" 
                style={{ width: `${withdrawProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Actions - UI khác nhau cho quỹ có thời hạn và không thời hạn */}
        {isNoTermFund ? (
          <>
            {/* Quỹ không thời hạn: Nút Rút tiền và Tất toán cùng hàng (khi có số dư), Xóa quỹ (khi số dư = 0) */}
            {fund.current > 0 ? (
              <div className="fund-withdraw-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary fund-withdraw-actions__submit" 
                  disabled={saving || !partialWithdrawAmount || (getNumericAmount(partialWithdrawAmount) <= 0 || getNumericAmount(partialWithdrawAmount) > fund.current)}
                >
                  <i className="bi bi-wallet2 me-1"></i>
                  {saving ? "Đang xử lý..." : "Rút tiền"}
                </button>
                <button
                  type="button"
                  className="btn btn-warning fund-withdraw-actions__withdraw-all"
                  onClick={handleSettle}
                  disabled={saving}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  {saving ? "Đang xử lý..." : "Tất toán"}
                </button>
              </div>
            ) : (
              <div className="fund-withdraw-actions">
                <button
                  type="button"
                  className="btn btn-danger fund-withdraw-actions__delete"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <i className="bi bi-trash me-1"></i>
                  {saving ? "Đang xử lý..." : "Xóa quỹ"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Quỹ có thời hạn: Giữ nguyên UI cũ */}
            <div className="fund-withdraw-actions">
            <button
              type="button"
              className="btn btn-secondary fund-withdraw-actions__cancel"
              onClick={() => setActiveTab("info")}
              disabled={saving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-primary fund-withdraw-actions__submit" 
              disabled={saving}
            >
              <i className="bi bi-wallet2 me-1"></i>
              {saving ? "Đang xử lý..." : "Rút toàn bộ"}
            </button>
          </div>
          </>
        )}
      </form>
    </>
  );
}
