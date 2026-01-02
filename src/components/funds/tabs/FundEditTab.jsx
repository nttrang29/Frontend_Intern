import React from "react";
import AutoTopupBlock from "../AutoTopupBlock";
import ReminderBlock from "../ReminderBlock";
import { formatMoney } from "../../../utils/formatMoney";
import { formatVietnamDate } from "../../../utils/dateFormat";

export default function FundEditTab({
  fund,
  form,
  isFundCompleted,
  saving,
  selectedCurrency,
  selectedSourceWalletId,
  setSelectedSourceWalletId,
  filteredWallets,
  autoDepositData,
  setAutoDepositData,
  reminderData,
  setReminderData,
  hasTodayAutoDeposit,
  nextAutoDepositDate,
  hasTodayReminder,
  nextReminderDate,
  handleFormChange,
  handleSubmitEdit
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

  return (
    <div>
      <h6 className="mb-3 text-muted">Chỉnh sửa thông tin quỹ</h6>
      
      <form onSubmit={handleSubmitEdit}>
        {/* THÔNG TIN CƠ BẢN */}
        <div className="funds-fieldset">
          <div className="funds-fieldset__legend">Thông tin cơ bản</div>
          
          <div className="funds-field">
            <label>Tên quỹ <span className="req">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              required
              maxLength={50}
            />
            <div className="funds-hint">Tối đa 50 ký tự.</div>
          </div>

          <div className="funds-field funds-field--inline">
            <div>
              <label>Loại tiền tệ</label>
              <input type="text" value="VND" disabled className="form-control" />
              <div className="funds-hint">Cố định VND.</div>
            </div>
            <div>
              <label>Chọn ví nguồn <span className="req">*</span></label>
              <select
                value={selectedSourceWalletId}
                onChange={(e) => setSelectedSourceWalletId(e.target.value)}
              >
                <option value="">
                  {filteredWallets.length === 0
                    ? "-- Không có ví nào với loại tiền tệ này --"
                    : "-- Chọn ví nguồn --"}
                </option>
                {filteredWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="funds-hint">
                Tất cả giao dịch nạp tiền sẽ từ ví này.
              </div>
              
              {/* Hiển thị số dư ví đã chọn */}
              {selectedSourceWalletId && filteredWallets.find(w => String(w.id) === String(selectedSourceWalletId)) && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label>Số dư ví nguồn</label>
                  <input
                    type="text"
                    value={(() => {
                      const wallet = filteredWallets.find(w => String(w.id) === String(selectedSourceWalletId));
                      return wallet ? formatMoney(wallet.balance, wallet.currency) : 'N/A';
                    })()}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="funds-field">
            <label>Ghi chú</label>
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => handleFormChange("note", e.target.value)}
              placeholder="Ghi chú cho quỹ này (không bắt buộc)"
            />
          </div>
        </div>

        {/* TỰ ĐỘNG NẠP TIỀN - Chỉ hiển thị nếu quỹ là auto-deposit */}
        {fund.autoDepositEnabled && (
          <AutoTopupBlock
            autoTopupOn={true}
            setAutoTopupOn={() => {}}
            freq={form.frequency || fund.frequency || "MONTHLY"}
            onDataChange={(data) => {
              setAutoDepositData(data);
            }}
            periodAmount={form.amountPerPeriod || fund.amountPerPeriod}
            lockMode={false}
            hasTodayAutoDeposit={hasTodayAutoDeposit}
            nextAutoDepositDate={nextAutoDepositDate ? formatVietnamDate(nextAutoDepositDate) : null}
            initialValues={{
              autoDepositTime: fund.autoDepositTime,
              autoDepositDayOfWeek: fund.autoDepositDayOfWeek,
              autoDepositDayOfMonth: fund.autoDepositDayOfMonth,
              autoDepositStartAt: fund.autoDepositStartAt,
              autoDepositAmount: fund.autoDepositAmount,
              autoDepositScheduleType: fund.autoDepositScheduleType || fund.autoDepositType,
            }}
            baseStartDate={form.startDate || fund.startDate}
            hideToggle={true}
            disableStartDate={true}
          />
        )}

        {/* NHẮC NHỞ - Chỉ hiển thị nếu quỹ là manual (reminder) */}
        {fund.reminderEnabled && (
          <ReminderBlock
            reminderOn={true}
            setReminderOn={() => {}}
            freq={form.frequency || fund.frequency || "MONTHLY"}
            onDataChange={(data) => {
              setReminderData(data);
            }}
            hideToggle={true}
            initialValues={{
              reminderTime: fund.reminderTime,
              reminderDayOfWeek: fund.reminderDayOfWeek,
              reminderDayOfMonth: fund.reminderDayOfMonth,
              reminderType: fund.reminderType,
            }}
            hasTodayReminder={hasTodayReminder}
            nextReminderDate={nextReminderDate ? formatVietnamDate(nextReminderDate) : null}
          />
        )}

        <div className="funds-actions mt-3" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            <i className="bi bi-check-circle me-1"></i>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}



