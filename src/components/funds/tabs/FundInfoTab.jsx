import React from "react";
import { formatMoney } from "../../../utils/formatMoney";
import { formatVietnamDate } from "../../../utils/dateFormat";

export default function FundInfoTab({ fund, wallets }) {
  return (
    <div>
      <h6 className="mb-3 text-muted">Xem thông tin chi tiết quỹ</h6>
      
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Thông tin cơ bản</div>
        
        <div className="funds-field">
          <label>Tên quỹ</label>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            {fund.name}
          </div>
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Loại tiền tệ</label>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {fund.currency}
            </div>
          </div>
          <div>
            <label>Loại quỹ</label>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {fund.hasTerm ? "Có kỳ hạn" : "Không kỳ hạn"}
            </div>
          </div>
        </div>

        <div className="funds-field funds-field--inline">
          <div>
            <label>Ví nguồn</label>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {fund.sourceWalletName || "Không có thông tin"}
            </div>
          </div>
          <div>
            <label>Số dư ví nguồn</label>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {(() => {
                const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                return sourceWallet 
                  ? formatMoney(sourceWallet.balance, sourceWallet.currency)
                  : 'Không tìm thấy ví';
              })()}
            </div>
          </div>
        </div>

        <div className="funds-field">
          <label>Ngày tạo</label>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            {fund.createdAt ? new Date(fund.createdAt).toLocaleString('vi-VN') : "Không có thông tin"}
          </div>
        </div>

        {fund.note && (
          <div className="funds-field">
            <label>Ghi chú</label>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
              {fund.note}
            </div>
          </div>
        )}
      </div>

      {/* MỤC TIÊU & TẦN SUẤT - Luôn hiển thị */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Mục tiêu & Tần suất</div>
        
        {fund.hasTerm && fund.target ? (
          <>
            <div className="funds-field">
              <label>Số tiền mục tiêu</label>
              <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontWeight: '600', color: '#0d6efd' }}>
                {formatMoney(fund.target, fund.currency)}
              </div>
            </div>

            {fund.frequency && (
              <div className="funds-field funds-field--inline">
                <div>
                  <label>Tần suất gửi</label>
                  <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    {fund.frequency}
                  </div>
                </div>
                {fund.amountPerPeriod && (
                  <div>
                    <label>Số tiền mỗi kỳ</label>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      {formatMoney(fund.amountPerPeriod, fund.currency)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="funds-field funds-field--inline">
              <div>
                <label>Ngày bắt đầu</label>
                <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  {fund.startDate ? formatVietnamDate(fund.startDate) : "Chưa thiết lập"}
                </div>
              </div>
              <div>
                <label>Ngày kết thúc</label>
                <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  {fund.endDate ? formatVietnamDate(fund.endDate) : "Chưa thiết lập"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="alert alert-secondary mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Không sử dụng tính năng mục tiêu & tần suất cho quỹ này.
          </div>
        )}
      </div>

      {/* CHẾ ĐỘ NẠP TIỀN */}
      <div className="funds-fieldset">
        <div className="funds-fieldset__legend">Chế độ nạp tiền</div>
        {fund.autoDepositEnabled ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-arrow-repeat" style={{ color: '#10b981' }}></i>
            <span style={{ fontSize: '0.875rem' }}>Nạp tự động</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-hand-thumbs-up" style={{ color: '#0d6efd' }}></i>
            <span style={{ fontSize: '0.875rem' }}>Nạp thủ công</span>
          </div>
        )}
      </div>
    </div>
  );
}



