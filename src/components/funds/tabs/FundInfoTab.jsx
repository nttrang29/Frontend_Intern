import React from "react";
import { formatMoney } from "../../../utils/formatMoney";
import { formatVietnamDate } from "../../../utils/dateFormat";
import "../../../styles/components/funds/FundInfoTab.css";

export default function FundInfoTab({ fund, wallets }) {
  const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
  
  const getFrequencyLabel = (freq) => {
    const labels = {
      DAILY: "Hàng ngày",
      WEEKLY: "Hàng tuần",
      MONTHLY: "Hàng tháng",
      YEARLY: "Hàng năm"
    };
    return labels[freq] || freq;
  };

  return (
    <div className="fund-info-tab">
      <h6 className="fund-info-tab__subtitle">Xem thông tin chi tiết quỹ</h6>
      
      {/* THÔNG TIN CƠ BẢN */}
      <div className="fund-info-section">
        <div className="fund-info-section__header">
          <div className="fund-info-section__icon">
            <i className="bi bi-info-circle-fill"></i>
          </div>
          <h5 className="fund-info-section__title">Thông tin cơ bản</h5>
        </div>
        
        <div className="fund-info-section__content">
          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-tag-fill"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Tên quỹ</div>
              <div className="fund-info-item__value">{fund.name}</div>
            </div>
          </div>

          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-currency-exchange"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Loại tiền tệ</div>
              <div className="fund-info-item__value fund-info-item__value--currency">
                {fund.currency}
              </div>
            </div>
          </div>

          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-calendar-check-fill"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Loại quỹ</div>
              <div className={`fund-info-item__value fund-info-item__value--badge ${fund.hasTerm ? 'fund-info-item__value--term' : 'fund-info-item__value--no-term'}`}>
                <i className={`bi ${fund.hasTerm ? 'bi-calendar-range' : 'bi-calendar-x'}`}></i>
                {fund.hasTerm ? "Có kỳ hạn" : "Không kỳ hạn"}
              </div>
            </div>
          </div>

          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Ví nguồn</div>
              <div className="fund-info-item__value">{fund.sourceWalletName || "Không có thông tin"}</div>
            </div>
          </div>

          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-cash-stack"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Số dư ví nguồn</div>
              <div className="fund-info-item__value fund-info-item__value--money">
                {sourceWallet 
                  ? formatMoney(sourceWallet.balance, sourceWallet.currency)
                  : 'Không tìm thấy ví'}
              </div>
            </div>
          </div>

          <div className="fund-info-item">
            <div className="fund-info-item__icon">
              <i className="bi bi-clock-history"></i>
            </div>
            <div className="fund-info-item__content">
              <div className="fund-info-item__label">Ngày tạo</div>
              <div className="fund-info-item__value">
                {fund.createdAt ? new Date(fund.createdAt).toLocaleString('vi-VN') : "Không có thông tin"}
              </div>
            </div>
          </div>

          {fund.note && (
            <div className="fund-info-item fund-info-item--full">
              <div className="fund-info-item__icon">
                <i className="bi bi-sticky-fill"></i>
              </div>
              <div className="fund-info-item__content">
                <div className="fund-info-item__label">Ghi chú</div>
                <div className="fund-info-item__value fund-info-item__value--note">
                  {fund.note}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MỤC TIÊU & TẦN SUẤT */}
      <div className="fund-info-section">
        <div className="fund-info-section__header">
          <div className="fund-info-section__icon">
            <i className="bi bi-bullseye"></i>
          </div>
          <h5 className="fund-info-section__title">Mục tiêu & Tần suất</h5>
        </div>
        
        <div className="fund-info-section__content">
          {fund.hasTerm && fund.target ? (
            <>
              <div className="fund-info-item fund-info-item--highlight">
                <div className="fund-info-item__icon">
                  <i className="bi bi-trophy-fill"></i>
                </div>
                <div className="fund-info-item__content">
                  <div className="fund-info-item__label">Số tiền mục tiêu</div>
                  <div className="fund-info-item__value fund-info-item__value--target">
                    {formatMoney(fund.target, fund.currency)}
                  </div>
                </div>
              </div>

              {fund.frequency && (
                <div className="fund-info-item">
                  <div className="fund-info-item__icon">
                    <i className="bi bi-repeat"></i>
                  </div>
                  <div className="fund-info-item__content">
                    <div className="fund-info-item__label">Tần suất gửi</div>
                    <div className="fund-info-item__value fund-info-item__value--badge fund-info-item__value--frequency">
                      <i className="bi bi-arrow-repeat"></i>
                      {getFrequencyLabel(fund.frequency)}
                    </div>
                  </div>
                </div>
              )}

              {fund.amountPerPeriod && (
                <div className="fund-info-item">
                  <div className="fund-info-item__icon">
                    <i className="bi bi-cash-coin"></i>
                  </div>
                  <div className="fund-info-item__content">
                    <div className="fund-info-item__label">Số tiền mỗi kỳ</div>
                    <div className="fund-info-item__value fund-info-item__value--money">
                      {formatMoney(fund.amountPerPeriod, fund.currency)}
                    </div>
                  </div>
                </div>
              )}

              <div className="fund-info-item fund-info-item--inline">
                <div className="fund-info-item fund-info-item--date">
                  <div className="fund-info-item__icon">
                    <i className="bi bi-calendar-event"></i>
                  </div>
                  <div className="fund-info-item__content">
                    <div className="fund-info-item__label">Ngày bắt đầu</div>
                    <div className="fund-info-item__value fund-info-item__value--date">
                      {fund.startDate ? formatVietnamDate(fund.startDate) : "Chưa thiết lập"}
                    </div>
                  </div>
                </div>
                
                <div className="fund-info-item fund-info-item--date">
                  <div className="fund-info-item__icon">
                    <i className="bi bi-calendar-x"></i>
                  </div>
                  <div className="fund-info-item__content">
                    <div className="fund-info-item__label">Ngày kết thúc</div>
                    <div className="fund-info-item__value fund-info-item__value--date">
                      {fund.endDate ? formatVietnamDate(fund.endDate) : "Chưa thiết lập"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="fund-info-empty">
              <i className="bi bi-info-circle"></i>
              <p>Không sử dụng tính năng mục tiêu & tần suất cho quỹ này.</p>
            </div>
          )}
        </div>
      </div>

      {/* CHẾ ĐỘ NẠP TIỀN */}
      <div className="fund-info-section fund-info-section--compact">
        <div className="fund-info-section__header fund-info-section__header--inline">
          <div className="fund-info-section__icon fund-info-section__icon--small">
            <i className="bi bi-gear-fill"></i>
          </div>
          <h5 className="fund-info-section__title fund-info-section__title--small">Chế độ nạp tiền</h5>
          <div className={`fund-info-mode ${fund.autoDepositEnabled ? 'fund-info-mode--auto' : 'fund-info-mode--manual'}`}>
            <div className="fund-info-mode__icon fund-info-mode__icon--small">
              <i className={`bi ${fund.autoDepositEnabled ? 'bi-arrow-repeat' : 'bi-wallet2'}`}></i>
            </div>
            <div className="fund-info-mode__content fund-info-mode__content--inline">
              <div className="fund-info-mode__value fund-info-mode__value--small">
                {fund.autoDepositEnabled ? "Nạp tự động" : "Nạp thủ công"}
              </div>
              {fund.autoDepositEnabled && fund.autoDepositAmount && (
                <div className="fund-info-mode__desc fund-info-mode__desc--inline">
                  {formatMoney(fund.autoDepositAmount, fund.currency)} mỗi kỳ
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
