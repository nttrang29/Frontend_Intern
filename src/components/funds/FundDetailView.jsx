// src/components/funds/FundDetailView.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useFundData } from "../../contexts/FundDataContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useToast } from "../common/Toast/ToastContext";
import ConfirmModal from "../common/Modal/ConfirmModal";
import { formatMoney } from "../../utils/formatMoney";
import ReminderBlock from "./ReminderBlock";
import AutoTopupBlock from "./AutoTopupBlock";
import "../../styles/components/funds/FundDetail.css";
import "../../styles/components/funds/FundForms.css";

const buildFormState = (fund) => ({
  name: fund.name || "",
  note: fund.note || "",
  target: fund.target ?? "",
  frequency: fund.frequency || "",
  amountPerPeriod: fund.amountPerPeriod || "",
  startDate: fund.startDate || "",
  endDate: fund.endDate || "",
  reminderEnabled: fund.reminderEnabled || false,
  reminderType: fund.reminderType || "",
  reminderTime: fund.reminderTime ? fund.reminderTime.substring(0, 5) : "",
  reminderDayOfWeek: fund.reminderDayOfWeek || "",
  reminderDayOfMonth: fund.reminderDayOfMonth || "",
  autoDepositEnabled: fund.autoDepositEnabled || false,
  autoDepositType: fund.autoDepositType || "",
  autoDepositAmount: fund.autoDepositAmount || "",
  autoDepositScheduleType: fund.autoDepositScheduleType || "",
  autoDepositTime: fund.autoDepositTime ? fund.autoDepositTime.substring(0, 5) : "",
  autoDepositDayOfWeek: fund.autoDepositDayOfWeek || "",
  autoDepositDayOfMonth: fund.autoDepositDayOfMonth || "",
});

export default function FundDetailView({ fund, onBack, onUpdateFund, defaultTab = "info" }) {
  const { updateFund, depositToFund, withdrawFromFund, deleteFund, closeFund } = useFundData();
  const { wallets } = useWalletData();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState(defaultTab); // info | edit | deposit | withdraw | warnings | history
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [form, setForm] = useState(() => buildFormState(fund));
  const [saving, setSaving] = useState(false);
  const [withdrawProgress, setWithdrawProgress] = useState(0);
  
  // States for currency and wallet selection
  const [selectedCurrency, setSelectedCurrency] = useState(fund.currency || "VND");
  const [selectedSourceWalletId, setSelectedSourceWalletId] = useState(fund.sourceWalletId || "");
  
  // States for ReminderBlock and AutoTopupBlock
  const [reminderOn, setReminderOn] = useState(fund.reminderEnabled || false);
  const [reminderData, setReminderData] = useState(null);
  const [autoTopupOn, setAutoTopupOn] = useState(fund.autoDepositEnabled || false);
  const [autoTopupData, setAutoTopupData] = useState(null);
  
  // State for delete confirmation modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Lấy danh sách currencies
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(wallets.map(w => w.currency))];
    return currencies.sort();
  }, [wallets]);
  
  // Filter wallets theo currency
  const filteredWallets = useMemo(() => {
    if (!selectedCurrency) return [];
    return wallets.filter(w => w.currency === selectedCurrency);
  }, [wallets, selectedCurrency]);
  
  // Reset sourceWalletId khi đổi currency
  useEffect(() => {
    if (selectedCurrency !== fund.currency) {
      setSelectedSourceWalletId("");
    }
  }, [selectedCurrency, fund.currency]);

  // Khi chọn quỹ khác hoặc defaultTab thay đổi
  useEffect(() => {
    setActiveTab(defaultTab);
    setForm(buildFormState(fund));
    setSelectedCurrency(fund.currency || "VND");
    setSelectedSourceWalletId(fund.sourceWalletId || "");
    setReminderOn(fund.reminderEnabled || false);
    setAutoTopupOn(fund.autoDepositEnabled || false);
  }, [fund.id, defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính toán trạng thái nạp tiền (cho quỹ không tự động)
  const getDepositStatus = () => {
    if (fund.autoDepositEnabled) {
      return { canDeposit: false, status: 'auto_enabled' };
    }
    
    if (!fund.frequency || !fund.startDate) {
      return { canDeposit: true, status: 'anytime' };
    }
    
    const now = new Date();
    const start = new Date(fund.startDate);
    const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    // Tính kỳ hiện tại
    let currentPeriod = 0;
    let daysPerPeriod = 1;
    
    switch (fund.frequency) {
      case 'DAILY':
        currentPeriod = daysSinceStart;
        daysPerPeriod = 1;
        break;
      case 'WEEKLY':
        currentPeriod = Math.floor(daysSinceStart / 7);
        daysPerPeriod = 7;
        break;
      case 'MONTHLY':
        currentPeriod = Math.floor(daysSinceStart / 30);
        daysPerPeriod = 30;
        break;
      default:
        return { canDeposit: true, status: 'anytime' };
    }
    
    // Giả lập số kỳ đã nạp (từ transaction history)
    const depositedPeriods = Math.floor(fund.current / (fund.amountPerPeriod || 1));
    
    if (depositedPeriods < currentPeriod) {
      // Đã quá hạn - cần nạp bù
      return { 
        canDeposit: true, 
        status: 'overdue',
        missedPeriods: currentPeriod - depositedPeriods,
        nextDepositDate: new Date(start.getTime() + depositedPeriods * daysPerPeriod * 24 * 60 * 60 * 1000)
      };
    } else if (depositedPeriods === currentPeriod) {
      // Đúng hạn - có thể nạp
      return { 
        canDeposit: true, 
        status: 'ready',
        period: currentPeriod + 1
      };
    } else {
      // Chưa đến lúc
      const nextDepositDate = new Date(start.getTime() + (depositedPeriods + 1) * daysPerPeriod * 24 * 60 * 60 * 1000);
      return { 
        canDeposit: false, 
        status: 'waiting',
        nextDepositDate
      };
    }
  };
  
  const depositStatus = getDepositStatus();

  // Set số tiền nạp mặc định khi vào tab deposit
  useEffect(() => {
    if (activeTab === 'deposit' && !fund.autoDepositEnabled && fund.amountPerPeriod) {
      if (depositStatus.status === 'ready' || depositStatus.status === 'overdue') {
        const defaultAmount = depositStatus.status === 'overdue' 
          ? fund.amountPerPeriod * depositStatus.missedPeriods
          : fund.amountPerPeriod;
        setDepositAmount(String(defaultAmount));
      }
    }
  }, [activeTab, fund.autoDepositEnabled, fund.amountPerPeriod, depositStatus.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setForm(buildFormState(fund));
    setActiveTab("info");
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Vui lòng nhập tên quỹ.", "error");
      return;
    }

    setSaving(true);

    try {
      // Validation
      if (!selectedCurrency) {
        showToast("Vui lòng chọn loại tiền tệ.", "error");
        setSaving(false);
        return;
      }
      if (!selectedSourceWalletId) {
        showToast("Vui lòng chọn ví nguồn.", "error");
        setSaving(false);
        return;
      }

      const updateData = {
        fundName: form.name.trim(),
        currencyCode: selectedCurrency,
        sourceWalletId: Number(selectedSourceWalletId),
        note: form.note.trim() || null,
        frequency: form.frequency || null,
        amountPerPeriod: form.amountPerPeriod ? Number(form.amountPerPeriod) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      // Thêm target nếu có kỳ hạn
      if (fund.hasTerm && form.target) {
        updateData.targetAmount = Number(form.target);
      }

      // Thêm reminder data từ ReminderBlock
      updateData.reminderEnabled = reminderOn;
      if (reminderOn && reminderData) {
        updateData.reminderType = reminderData.reminderType;
        updateData.reminderTime = reminderData.reminderTime;
        if (reminderData.reminderDayOfWeek) {
          updateData.reminderDayOfWeek = reminderData.reminderDayOfWeek;
        }
        if (reminderData.reminderDayOfMonth) {
          updateData.reminderDayOfMonth = reminderData.reminderDayOfMonth;
        }
        if (reminderData.reminderMonth) {
          updateData.reminderMonth = reminderData.reminderMonth;
        }
        if (reminderData.reminderDay) {
          updateData.reminderDay = reminderData.reminderDay;
        }
      }

      // Thêm auto deposit data từ AutoTopupBlock
      updateData.autoDepositEnabled = autoTopupOn;
      if (autoTopupOn && autoTopupData) {
        updateData.autoDepositType = autoTopupData.autoDepositType;
        updateData.autoDepositAmount = autoTopupData.autoDepositAmount;
        
        if (autoTopupData.autoDepositType === "CUSTOM_SCHEDULE") {
          updateData.autoDepositScheduleType = autoTopupData.autoDepositScheduleType;
          updateData.autoDepositTime = autoTopupData.autoDepositTime;
          if (autoTopupData.autoDepositDayOfWeek) {
            updateData.autoDepositDayOfWeek = autoTopupData.autoDepositDayOfWeek;
          }
          if (autoTopupData.autoDepositDayOfMonth) {
            updateData.autoDepositDayOfMonth = autoTopupData.autoDepositDayOfMonth;
          }
          if (autoTopupData.autoDepositMonth) {
            updateData.autoDepositMonth = autoTopupData.autoDepositMonth;
          }
          if (autoTopupData.autoDepositDay) {
            updateData.autoDepositDay = autoTopupData.autoDepositDay;
          }
        }
      }

      console.log("Updating fund:", fund.id, updateData);

      // Gọi API update
      const result = await updateFund(fund.id, updateData);

      if (result.success) {
        showToast("Cập nhật quỹ thành công!", "success");
        // Callback để reload fund list
        if (onUpdateFund) {
          await onUpdateFund();
        }
        setActiveTab("info");
      } else {
        showToast(`Không thể cập nhật quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error updating fund:", error);
      showToast("Đã xảy ra lỗi khi cập nhật quỹ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const progress =
    fund.target && fund.target > 0
      ? Math.min(100, Math.round((fund.current / fund.target) * 100))
      : null;

  // Transaction history - Sẽ được lấy từ API khi backend implement
  // TODO: Implement API để lấy fund transaction history
  const transactionHistory = [];
  const maxAmount = Math.max(fund.target || 0, fund.current || 1);
  
  // Transaction history list - Sẽ được lấy từ API khi backend implement
  const mockTransactionHistory = [];

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    
    // Validation cơ bản
    if (!amount || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ.", "error");
      return;
    }

    if (amount < 1000) {
      showToast("Số tiền nạp tối thiểu là 1,000.", "error");
      return;
    }

    // Kiểm tra số dư ví nguồn
    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
    if (!sourceWallet) {
      showToast("Không tìm thấy ví nguồn.", "error");
      return;
    }

    if (amount > sourceWallet.balance) {
      showToast(
        `Số dư ví nguồn không đủ! Số dư hiện tại: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`,
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      console.log("Depositing to fund:", fund.id, amount);
      const result = await depositToFund(fund.id, amount);

      if (result.success) {
        showToast(`Nạp ${formatMoney(amount, fund.currency)} vào quỹ thành công!`, "success");
        setDepositAmount("");
        setActiveTab("info");
        // Callback để reload
        if (onUpdateFund) {
          await onUpdateFund();
        }
      } else {
        showToast(`Không thể nạp tiền: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error depositing to fund:", error);
      showToast("Đã xảy ra lỗi khi nạp tiền.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    // Rút toàn bộ số dư quỹ
    const amount = fund.current;
    
    if (!amount || amount <= 0) {
      showToast("Quỹ không có số dư để rút.", "error");
      return;
    }

    setSaving(true);
    setWithdrawProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setWithdrawProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until actual completion
        }
        return prev + 10;
      });
    }, 200);

    try {
      console.log("Withdrawing ALL from fund:", fund.id, amount);
      
      // Rút toàn bộ tiền
      const result = await withdrawFromFund(fund.id, amount);

      // Complete progress
      clearInterval(progressInterval);
      setWithdrawProgress(100);

      if (result.success) {
        showToast(`🎉 Hoàn thành quỹ! Rút toàn bộ ${formatMoney(amount, fund.currency)} về ví nguồn thành công!`, "success");
        
        // Đóng quỹ (soft delete - giữ lại lịch sử)
        await closeFund(fund.id);
        
        // Delay một chút để user đọc toast
        setTimeout(() => {
          // Quay về danh sách quỹ
          if (onBack) {
            onBack();
          }
        }, 1000);
      } else {
        showToast(`Không thể rút tiền: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error withdrawing from fund:", error);
      showToast("Đã xảy ra lỗi khi rút tiền.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFund = () => {
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteFund = async () => {
    setConfirmDeleteOpen(false);
    setSaving(true);

    try {
      console.log("Deleting fund:", fund.id);
      const result = await deleteFund(fund.id);

      if (result.success) {
        showToast("Xóa quỹ thành công!", "success");
        // Quay về danh sách
        if (onBack) {
          onBack();
        }
      } else {
        showToast(`Không thể xóa quỹ: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting fund:", error);
      showToast("Đã xảy ra lỗi khi xóa quỹ.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fund-detail-layout">
      {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
      <div className="fund-detail-form">
        <h5 className="mb-4" style={{ fontWeight: '700', color: '#111827' }}>Quản lý quỹ</h5>

        {/* TABS NAVIGATION - Segment Control Style */}
        <div className="mb-4" style={{ 
          display: 'flex', 
          gap: '0',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          padding: '0.375rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setActiveTab("info")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "info" ? '#fff' : 'transparent',
              color: activeTab === "info" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "info" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "info" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-info-circle" style={{ fontSize: '1rem' }}></i>
            <span>Thông tin quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("edit")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "edit" ? '#fff' : 'transparent',
              color: activeTab === "edit" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "edit" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "edit" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-pencil-square" style={{ fontSize: '1rem' }}></i>
            <span>Sửa quỹ</span>
          </button>
          
          <button
            onClick={() => setActiveTab("deposit")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "deposit" ? '#fff' : 'transparent',
              color: activeTab === "deposit" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "deposit" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "deposit" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-plus-circle-fill" style={{ fontSize: '1rem' }}></i>
            <span>Nạp tiền</span>
          </button>
          
          <button
            onClick={() => setActiveTab("withdraw")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "withdraw" ? '#fff' : 'transparent',
              color: activeTab === "withdraw" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "withdraw" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "withdraw" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-dash-circle-fill" style={{ fontSize: '1rem' }}></i>
            <span>Rút tiền</span>
          </button>
          
          <button
            onClick={() => setActiveTab("warnings")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "warnings" ? '#fff' : 'transparent',
              color: activeTab === "warnings" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "warnings" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "warnings" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1rem' }}></i>
            <span>Cảnh báo</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            style={{
              flex: '1 1 auto',
              minWidth: '130px',
              padding: '0.625rem 1rem',
              border: 'none',
              background: activeTab === "history" ? '#fff' : 'transparent',
              color: activeTab === "history" ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === "history" ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "history" ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            <i className="bi bi-clock-history" style={{ fontSize: '1rem' }}></i>
            <span>Lịch sử</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="mt-3">
          {/* TAB 1: THÔNG TIN QUỸ */}
          {activeTab === "info" && (
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
                          {fund.startDate ? new Date(fund.startDate).toLocaleDateString('vi-VN') : "Chưa thiết lập"}
                        </div>
                      </div>
                      <div>
                        <label>Ngày kết thúc</label>
                        <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                          {fund.endDate ? new Date(fund.endDate).toLocaleDateString('vi-VN') : "Chưa thiết lập"}
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

              {/* NHẮC NHỞ - Luôn hiển thị */}
              <div className="funds-fieldset">
                <div className="funds-fieldset__legend">Nhắc nhở</div>
                {fund.reminderEnabled ? (
                  <div className="alert alert-info mb-0">
                    <i className="bi bi-bell-fill me-2"></i>
                    <strong>Đã bật nhắc nhở:</strong> {fund.reminderType} lúc {fund.reminderTime}
                    {fund.reminderDayOfWeek && ` - Thứ ${fund.reminderDayOfWeek}`}
                    {fund.reminderDayOfMonth && ` - Ngày ${fund.reminderDayOfMonth}`}
                  </div>
                ) : (
                  <div className="alert alert-secondary mb-0">
                    <i className="bi bi-bell-slash me-2"></i>
                    Không sử dụng tính năng nhắc nhở cho quỹ này.
                  </div>
                )}
              </div>

              {/* TỰ ĐỘNG NẠP TIỀN - Luôn hiển thị */}
              <div className="funds-fieldset">
                <div className="funds-fieldset__legend">Tự động nạp tiền</div>
                {fund.autoDepositEnabled ? (
                  <div className="alert alert-success mb-0">
                    <i className="bi bi-arrow-repeat me-2"></i>
                    <strong>Đã bật tự động nạp:</strong> {formatMoney(fund.autoDepositAmount, fund.currency)} - {fund.autoDepositType === "FOLLOW_REMINDER" ? "Theo lịch nhắc nhở" : "Tự thiết lập lịch"}
                    {fund.autoDepositScheduleType && ` (${fund.autoDepositScheduleType})`}
                  </div>
                ) : (
                  <div className="alert alert-secondary mb-0">
                    <i className="bi bi-x-circle me-2"></i>
                    Không sử dụng tính năng tự động nạp tiền cho quỹ này.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SỬA QUỸ */}
          {activeTab === "edit" && (
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
                      <label>Chọn loại tiền tệ <span className="req">*</span></label>
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                      >
                        <option value="">-- Chọn loại tiền tệ --</option>
                        {availableCurrencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <div className="funds-hint">
                        Thay đổi loại tiền tệ của quỹ.
                      </div>
                    </div>
                    <div>
                      <label>Chọn ví nguồn <span className="req">*</span></label>
                      <select
                        value={selectedSourceWalletId}
                        onChange={(e) => setSelectedSourceWalletId(e.target.value)}
                        disabled={!selectedCurrency}
                      >
                        <option value="">
                          {!selectedCurrency 
                            ? "-- Vui lòng chọn loại tiền tệ trước --"
                            : filteredWallets.length === 0
                            ? "-- Không có ví nào với loại tiền tệ này --"
                            : "-- Chọn ví nguồn --"
                          }
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

                {/* MỤC TIÊU & TẦN SUẤT */}
                {fund.hasTerm && (
                  <div className="funds-fieldset">
                    <div className="funds-fieldset__legend">Mục tiêu & tần suất</div>
                    
                    <div className="funds-field">
                      <label>Số tiền mục tiêu ({fund.currency}) <span className="req">*</span></label>
                      <input
                        type="number"
                        min="1000"
                        value={form.target}
                        onChange={(e) => handleFormChange("target", e.target.value)}
                        required
                      />
                      <div className="funds-hint">Tối thiểu 1,000 {fund.currency}</div>
                    </div>

                    <div className="funds-field funds-field--inline">
                      <div>
                        <label>Tần suất gửi <span className="req">*</span></label>
                        <select
                          value={form.frequency}
                          onChange={(e) => handleFormChange("frequency", e.target.value)}
                          required
                        >
                          <option value="">-- Chọn tần suất --</option>
                          <option value="DAILY">Theo ngày</option>
                          <option value="WEEKLY">Theo tuần</option>
                          <option value="MONTHLY">Theo tháng</option>
                        </select>
                      </div>
                      <div>
                        <label>Số tiền gửi mỗi kỳ <span className="req">*</span></label>
                        <input
                          type="number"
                          min="1000"
                          value={form.amountPerPeriod}
                          onChange={(e) => handleFormChange("amountPerPeriod", e.target.value)}
                          disabled={!form.frequency}
                          required
                        />
                        <div className="funds-hint">Tối thiểu 1,000 {fund.currency}</div>
                      </div>
                    </div>

                    <div className="funds-field funds-field--inline">
                      <div>
                        <label>Ngày bắt đầu <span className="req">*</span></label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => handleFormChange("startDate", e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                        <div className="funds-hint">Phải từ hôm nay trở đi</div>
                      </div>
                      <div>
                        <label>Ngày kết thúc dự kiến</label>
                        <input
                          type="text"
                          value={(() => {
                            if (!form.target || !form.amountPerPeriod || !form.frequency || !form.startDate) {
                              return '';
                            }
                            const target = Number(form.target);
                            const amountPerPeriod = Number(form.amountPerPeriod);
                            if (target <= 0 || amountPerPeriod <= 0) return '';
                            
                            const periods = Math.ceil(target / amountPerPeriod);
                            const startDate = new Date(form.startDate);
                            let endDate = new Date(startDate);
                            
                            switch (form.frequency) {
                              case 'DAILY':
                                endDate.setDate(endDate.getDate() + periods);
                                break;
                              case 'WEEKLY':
                                endDate.setDate(endDate.getDate() + (periods * 7));
                                break;
                              case 'MONTHLY':
                                endDate.setMonth(endDate.getMonth() + periods);
                                break;
                              default:
                                return '';
                            }
                            
                            return endDate.toLocaleDateString('vi-VN');
                          })()}
                          disabled
                          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                        <div className="funds-hint">Tự động tính dựa trên mục tiêu và số tiền mỗi kỳ</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NHẮC NHỞ */}
                <ReminderBlock
                  reminderOn={reminderOn}
                  setReminderOn={setReminderOn}
                  freq={form.frequency || "MONTHLY"}
                  onDataChange={setReminderData}
                />

                {/* TỰ ĐỘNG NẠP TIỀN */}
                <AutoTopupBlock
                  autoTopupOn={autoTopupOn}
                  setAutoTopupOn={setAutoTopupOn}
                  freq={form.frequency || "MONTHLY"}
                  onDataChange={setAutoTopupData}
                />

                <div className="funds-actions mt-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Hủy
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      <i className="bi bi-check-circle me-1"></i>
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleDeleteFund}
                      disabled={saving}
                      style={{
                        backgroundColor: '#dc3545',
                        borderColor: '#dc3545'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#bb2d3b';
                        e.target.style.borderColor = '#b02a37';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#dc3545';
                        e.target.style.borderColor = '#dc3545';
                      }}
                    >
                      <i className="bi bi-trash me-1"></i>
                      {saving ? "Đang xóa..." : "Xóa quỹ"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: NẠP TIỀN */}
          {activeTab === "deposit" && (
            <div>
              {fund.autoDepositEnabled ? (
                // Đã bật auto-deposit: Hiển thị bill nạp tự động sắp tới
                <>
                  <h6 className="mb-3 text-muted">
                    Thông tin nạp tiền tự động
                  </h6>
                  
                  <div style={{
                    padding: '2rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}>
                    {/* Icon & Title */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1rem',
                        borderRadius: '50%',
                        backgroundColor: '#e7f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="bi bi-arrow-repeat" style={{ fontSize: '2.5rem', color: '#0d6efd' }}></i>
                      </div>
                      <h5 style={{ color: '#111827', marginBottom: '0.5rem' }}>Nạp tiền tự động đang hoạt động</h5>
                      <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0' }}>
                        Quỹ của bạn sẽ được nạp tiền tự động theo lịch đã cài đặt
                      </p>
                    </div>

                    {/* Bill Details */}
                    <div style={{
                      padding: '1.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                          Số tiền nạp mỗi lần
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d6efd' }}>
                          {formatMoney(fund.autoDepositAmount || fund.amountPerPeriod || 0, fund.currency)}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                            Tần suất
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                            {fund.frequency === 'DAILY' ? 'Hàng ngày' : 
                             fund.frequency === 'WEEKLY' ? 'Hàng tuần' : 
                             fund.frequency === 'MONTHLY' ? 'Hàng tháng' : 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                            Ví nguồn
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                            {fund.sourceWalletName || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next Deposit Info */}
                    {fund.autoDepositDayOfMonth && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <i className="bi bi-calendar-check" style={{ fontSize: '1.5rem', color: '#10b981' }}></i>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                            Lần nạp tiếp theo
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                            {fund.frequency === 'MONTHLY' && `Ngày ${fund.autoDepositDayOfMonth} hàng tháng`}
                            {fund.frequency === 'WEEKLY' && `Mỗi tuần vào ${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][fund.autoDepositDayOfWeek || 0]}`}
                            {fund.frequency === 'DAILY' && 'Hàng ngày'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info Note */}
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#92400e'
                    }}>
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Lưu ý:</strong> Khi đã bật nạp tiền tự động, bạn không thể nạp thủ công. 
                      Để nạp thủ công, vui lòng tắt chức năng tự động nạp tiền trong tab "Sửa quỹ".
                    </div>
                  </div>
                </>
              ) : (
                // Chưa bật auto-deposit: Cho phép nạp thủ công
                <>
                  <h6 className="mb-3 text-muted">Nạp tiền vào quỹ từ ví nguồn (thủ công)</h6>
                  
                  {/* Info banners */}
                  {fund.reminderEnabled && depositStatus.status === 'waiting' && depositStatus.nextDepositDate && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <i className="bi bi-info-circle-fill" style={{ fontSize: '1.25rem', color: '#10b981' }}></i>
                      <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
                        <strong>Lưu ý:</strong> Lần nạp tiếp theo theo lịch là <strong>{depositStatus.nextDepositDate.toLocaleDateString('vi-VN')}</strong>. 
                        Bạn vẫn có thể nạp thủ công bất kỳ lúc nào.
                      </div>
                    </div>
                  )}
                  
                  {fund.reminderEnabled && depositStatus.status === 'overdue' && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.25rem', color: '#f59e0b' }}></i>
                      <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                        <strong>Thông báo:</strong> Bạn đã bỏ lỡ <strong>{depositStatus.missedPeriods}</strong> kỳ nạp tiền theo lịch. 
                        Hãy nạp để theo kịp tiến độ.
                      </div>
                    </div>
                  )}
                  
                  {/* Form nạp tiền thủ công */}
                  <form onSubmit={handleDeposit}>
                <div className="funds-fieldset">
                  <div className="funds-fieldset__legend">Thông tin ví và quỹ</div>
                  
                  {/* Thông tin ví nguồn */}
                  <div className="funds-field">
                    <label>Ví nguồn</label>
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#f0fdf4', 
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#059669', marginBottom: '0.25rem' }}>
                            {fund.sourceWalletName || "Không có thông tin"}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                            {(() => {
                              const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                              return sourceWallet 
                                ? `Số dư: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`
                                : 'Không tìm thấy ví';
                            })()}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '0.5rem 1rem',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {fund.currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Số dư quỹ hiện tại */}
                  <div className="funds-field">
                    <label>Số dư quỹ hiện tại</label>
                    <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '8px', fontSize: '1.25rem', fontWeight: '600', color: '#0d6efd' }}>
                      {formatMoney(fund.current, fund.currency)}
              </div>
            </div>

            <div className="funds-field">
                    <label>
                      Số tiền muốn nạp ({fund.currency}) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Nhập số tiền muốn nạp"
                    />
                    <div className="funds-hint">
                      Số tiền tối thiểu: 1,000 {fund.currency}
                      {(() => {
                        const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                        return sourceWallet 
                          ? ` • Số dư ví nguồn: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`
                          : '';
                      })()}
                    </div>
                  </div>

                  {/* CẢNH BÁO / PREVIEW */}
                  {depositAmount && Number(depositAmount) > 0 && (() => {
                    const amount = Number(depositAmount);
                    const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                    
                    // Kiểm tra số tiền vượt quá số dư ví
                    if (sourceWallet && amount > sourceWallet.balance) {
                      return (
                        <div style={{
                          padding: '1rem',
                          backgroundColor: '#fef2f2',
                          border: '2px solid #ef4444',
                          borderRadius: '8px',
                          marginTop: '1rem'
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
                        marginTop: '1rem'
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
                            const periodsLeft = Math.ceil(remaining / fund.amountPerPeriod);
                            const originalRemaining = fund.target - fund.current;
                            const originalPeriodsLeft = Math.ceil(originalRemaining / fund.amountPerPeriod);
                            const periodsSaved = originalPeriodsLeft - periodsLeft;
                            
                            if (periodsSaved > 0) {
                              return (
                                <div style={{
                                  marginTop: '0.75rem',
                                  padding: '0.75rem',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #86efac',
                                  borderRadius: '6px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <i className="bi bi-rocket-takeoff-fill" style={{ color: '#10b981' }}></i>
                                    <strong style={{ fontSize: '0.875rem', color: '#047857' }}>Vượt kế hoạch</strong>
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
                                    🎉 Nạp nhiều hơn dự kiến! Bạn sẽ hoàn thành mục tiêu <strong>sớm hơn {periodsSaved} {timeUnit}</strong> so với kế hoạch ban đầu.
                                  </div>
                                </div>
                              );
                            }
                          }
                          
                          // Case 3: Nạp ÍT HƠN kế hoạch
                          if (amount < fund.amountPerPeriod) {
                            const shortage = fund.amountPerPeriod - amount;
                            return (
                              <div style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem',
                                backgroundColor: '#fff7ed',
                                border: '1px solid #fbbf24',
                                borderRadius: '6px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                  <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b' }}></i>
                                  <strong style={{ fontSize: '0.875rem', color: '#92400e' }}>Cảnh báo tiến độ</strong>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.5rem' }}>
                                  ⚠️ Bạn đang nạp <strong>ít hơn {formatMoney(shortage, fund.currency)}</strong> so với kế hoạch ({formatMoney(fund.amountPerPeriod, fund.currency)}/{timeUnit}).
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#92400e', padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                                  💡 <strong>Khuyến nghị:</strong> Nạp thêm {formatMoney(shortage, fund.currency)} để đảm bảo đúng tiến độ, hoặc điều chỉnh kế hoạch trong tab "Sửa quỹ".
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    );
                  })()}
            </div>

            <div className="funds-actions mt-3">
              <button
                type="button"
                className="btn-secondary"
                    onClick={() => {
                      setDepositAmount("");
                      setActiveTab("info");
                    }}
                    disabled={saving}
                  >
                    Hủy
              </button>
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
              </form>
                </>
              )}
            </div>
          )}

          {/* TAB 4: RÚT TIỀN */}
          {activeTab === "withdraw" && (
            <div>
              <h6 className="mb-3 text-muted">Rút tiền từ quỹ về ví nguồn</h6>
              
              {/* Kiểm tra điều kiện rút tiền */}
              {(() => {
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
                      {/* Icon Circle */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        borderRadius: '50%',
                        backgroundColor: '#fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="bi bi-lock-fill" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
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
                          <strong>Quỹ có kỳ hạn:</strong> Chỉ rút khi hoàn thành 100% mục tiêu
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          marginTop: '0.75rem'
                        }}>
                          <i className="bi bi-graph-up" style={{ color: '#f59e0b' }}></i>
                          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>
                            {progress}%
                          </span>
                          <span style={{ fontSize: '0.875rem', color: '#78350f' }}>
                            / 100%
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                        <i className="bi bi-info-circle me-1"></i>
                        Còn thiếu <strong>{100 - progress}%</strong> để hoàn thành mục tiêu
                      </div>
                    </div>
                  );
                }

                // ĐÃ HOÀN THÀNH - Hiển thị chúc mừng!
                return (
                  <>
                    {/* CELEBRATION CARD */}
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
                      
                      {/* Pulse rings */}
                      <div className="pulse-ring" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                      <div className="pulse-ring" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0.5s' }}></div>
                      
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Success Icon */}
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

                    {/* FORM RÚT TOÀN BỘ */}
                    <form onSubmit={handleWithdraw}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* Card: Ví nguồn */}
                        <div style={{
                          padding: '1.5rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderLeft: '5px solid #10b981',
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                            {/* Icon Circle */}
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
                              <i className="bi bi-wallet2" style={{ fontSize: '1.25rem', color: '#10b981' }}></i>
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
                                <i className="bi bi-cash-stack"></i>
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

                        {/* Card: Số tiền rút */}
                        <div style={{
                          padding: '1.5rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderLeft: '5px solid #ef4444',
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                            {/* Icon Circle */}
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
                              <i className="bi bi-arrow-down-circle-fill" style={{ fontSize: '1.25rem', color: '#ef4444' }}></i>
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

                        {/* Card: Sau khi rút */}
                        <div style={{
                          padding: '1.5rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderLeft: '5px solid #0d6efd',
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                            {/* Icon Circle */}
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
                              <i className="bi bi-arrow-right-circle-fill" style={{ fontSize: '1.25rem', color: '#0d6efd' }}></i>
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Sau khi rút
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                {/* Số dư quỹ */}
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
                                
                                {/* Số dư ví */}
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

                        {/* Card: Thông báo */}
                        <div style={{
                          padding: '1.5rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderLeft: '5px solid #f59e0b',
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                            {/* Icon Circle */}
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
                              <i className="bi bi-info-circle-fill" style={{ fontSize: '1.25rem', color: '#f59e0b' }}></i>
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

                      {/* Progress Bar khi đang rút */}
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

                      <div className="funds-actions mt-3">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setActiveTab("info")}
                          disabled={saving}
                        >
                          Hủy
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                          <i className="bi bi-wallet2 me-1"></i>
                          {saving ? "Đang xử lý..." : "Rút toàn bộ về ví nguồn"}
              </button>
            </div>
          </form>
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 5: CẢNH BÁO */}
          {activeTab === "warnings" && (
            <div>
              <h6 className="mb-3 text-muted">Theo dõi tiến độ và cảnh báo</h6>
              
              {(() => {
                const sourceWallet = wallets.find(w => w.id === fund.sourceWalletId);
                const warnings = [];
                
                // CẢNH BÁO 1: Tự động nạp tiền nhưng số dư ví không đủ
                if (fund.autoDepositEnabled && fund.autoDepositAmount && sourceWallet) {
                  if (sourceWallet.balance < fund.autoDepositAmount) {
                    warnings.push({
                      type: 'auto-insufficient',
                      title: 'Số dư ví không đủ cho lần nạp tự động tiếp theo',
                      severity: 'danger',
                      data: {
                        needed: fund.autoDepositAmount,
                        available: sourceWallet.balance,
                        shortage: fund.autoDepositAmount - sourceWallet.balance
                      }
                    });
                  }
                }
                
                // CẢNH BÁO 2: Tiến độ chậm so với kế hoạch (nếu có frequency và amountPerPeriod)
                if (fund.hasTerm && fund.target && fund.startDate && fund.frequency && fund.amountPerPeriod) {
                  const daysSinceStart = Math.floor((new Date() - new Date(fund.startDate)) / (1000 * 60 * 60 * 24));
                  const periodsElapsed = fund.frequency === 'DAILY' ? daysSinceStart :
                                        fund.frequency === 'WEEKLY' ? Math.floor(daysSinceStart / 7) :
                                        fund.frequency === 'MONTHLY' ? Math.floor(daysSinceStart / 30) :
                                        Math.floor(daysSinceStart / 365);
                  
                  const expectedAmount = Math.min(periodsElapsed * fund.amountPerPeriod, fund.target);
                  
                  if (fund.current < expectedAmount * 0.8) { // Nếu chậm hơn 20%
                    warnings.push({
                      type: 'behind-schedule',
                      title: 'Tiến độ nạp tiền chậm hơn kế hoạch',
                      severity: 'warning',
                      data: {
                        current: fund.current,
                        expected: expectedAmount,
                        behind: expectedAmount - fund.current
                      }
                    });
                  }
                }
                
                // CẢNH BÁO 3: Còn nhiều tiền cần nạp nhưng thời gian sắp hết
                if (fund.hasTerm && fund.target && fund.endDate) {
                  const daysRemaining = Math.floor((new Date(fund.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const amountRemaining = fund.target - fund.current;
                  
                  if (daysRemaining > 0 && daysRemaining < 30 && amountRemaining > fund.current * 0.5) {
                    warnings.push({
                      type: 'deadline-approaching',
                      title: 'Sắp đến hạn nhưng còn nhiều tiền cần nạp',
                      severity: 'warning',
                      data: {
                        daysRemaining,
                        amountRemaining,
                        dailyNeeded: Math.ceil(amountRemaining / daysRemaining)
                      }
                    });
                  }
                }
                
                // Hiển thị cảnh báo hoặc thông báo OK
                if (warnings.length === 0) {
                  return (
                    <div style={{
                      padding: '3rem 2rem',
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem', color: '#10b981', marginBottom: '1rem' }}></i>
                      <h5 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Mọi thứ đều ổn!</h5>
                      <p className="text-muted mb-0">
                        Không có cảnh báo nào. Quỹ của bạn đang hoạt động tốt.
                      </p>
                    </div>
                  );
                }
                
                // Hiển thị danh sách cảnh báo
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {warnings.map((warning, idx) => {
                      const isDanger = warning.severity === 'danger';
                      const borderColor = isDanger ? '#ef4444' : '#f59e0b';
                      const iconColor = isDanger ? '#ef4444' : '#f59e0b';
                      const iconBg = isDanger ? '#fee2e2' : '#fed7aa';
                      
                      return (
                        <div key={idx} style={{
                          padding: '1.25rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderLeft: `5px solid ${borderColor}`,
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
                            {/* Icon Circle */}
                            <div style={{ 
                              flexShrink: 0,
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              backgroundColor: iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ 
                                fontSize: '1.25rem', 
                                color: iconColor
                              }}></i>
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              {/* Title với severity badge */}
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.375rem 0.75rem',
                                  backgroundColor: iconBg,
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: '12px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: iconColor,
                                  marginBottom: '0.5rem'
                                }}>
                                  <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '0.875rem' }}></i>
                                  {isDanger ? 'Nghiêm trọng' : 'Cảnh báo'}
                                </div>
                                <h6 style={{ color: '#111827', marginBottom: '0', fontWeight: '600', fontSize: '1rem' }}>
                                  {warning.title}
                                </h6>
                              </div>
                              
                              {warning.type === 'auto-insufficient' && (
                                <>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Lần nạp tự động tiếp theo cần: <strong>{formatMoney(warning.data.needed, fund.currency)}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Số dư ví nguồn hiện tại: <strong>{formatMoney(warning.data.available, fund.currency)}</strong>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '1rem',
                                    background: `linear-gradient(135deg, ${isDanger ? '#fef2f2' : '#fef3c7'} 0%, ${isDanger ? '#fee2e2' : '#fed7aa'} 100%)`,
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '8px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      fontSize: '1rem',
                                      color: iconColor, 
                                      fontWeight: '700'
                                    }}>
                                      <i className="bi bi-cash-stack"></i>
                                      Cần nạp thêm: {formatMoney(warning.data.shortage, fund.currency)}
                                    </div>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    gap: '0.5rem'
                                  }}>
                                    <i className="bi bi-lightbulb-fill" style={{ color: '#10b981', flexShrink: 0 }}></i>
                                    <div>
                                      <strong>Khuyến nghị:</strong> Nạp tiền vào ví "{fund.sourceWalletName}" để đảm bảo lịch tự động nạp tiền hoạt động bình thường.
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              {warning.type === 'behind-schedule' && (
                                <>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Số dư hiện tại: <strong>{formatMoney(warning.data.current, fund.currency)}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Số dư mong đợi: <strong>{formatMoney(warning.data.expected, fund.currency)}</strong>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '8px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      fontSize: '1rem',
                                      color: iconColor, 
                                      fontWeight: '700'
                                    }}>
                                      <i className="bi bi-graph-down-arrow"></i>
                                      Chậm tiến độ: {formatMoney(warning.data.behind, fund.currency)}
                                    </div>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    gap: '0.5rem'
                                  }}>
                                    <i className="bi bi-lightbulb-fill" style={{ color: '#10b981', flexShrink: 0 }}></i>
                                    <div>
                                      <strong>Khuyến nghị:</strong> Cần nạp thêm {formatMoney(warning.data.behind, fund.currency)} để bắt kịp tiến độ theo kế hoạch.
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              {warning.type === 'deadline-approaching' && (
                                <>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Thời gian còn lại: <strong>{warning.data.daysRemaining} ngày</strong>
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                                    Số tiền còn thiếu: <strong>{formatMoney(warning.data.amountRemaining, fund.currency)}</strong>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '8px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      fontSize: '1rem',
                                      color: iconColor, 
                                      fontWeight: '700'
                                    }}>
                                      <i className="bi bi-calendar-check"></i>
                                      Cần nạp: {formatMoney(warning.data.dailyNeeded, fund.currency)}/ngày
                                    </div>
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.75rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    gap: '0.5rem'
                                  }}>
                                    <i className="bi bi-lightbulb-fill" style={{ color: '#10b981', flexShrink: 0 }}></i>
                                    <div>
                                      <strong>Khuyến nghị:</strong> Quỹ sắp đến hạn nhưng còn nhiều tiền cần nạp. Hãy tăng tốc độ tiết kiệm!
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 6: LỊCH SỬ */}
          {activeTab === "history" && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h6 className="mb-0 text-muted">Lịch sử giao dịch nạp tiền</h6>
                {mockTransactionHistory.length > 0 && (
                  <span style={{ 
                    fontSize: '0.875rem', 
                    color: '#6c757d',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px'
                  }}>
                    {mockTransactionHistory.length} giao dịch
                  </span>
                )}
              </div>
              
              {mockTransactionHistory.length === 0 ? (
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
                  {mockTransactionHistory.slice(0, 5).map((tx) => {
                    const isSuccess = tx.status === 'success';
                    const bgColor = isSuccess ? '#f0fdf4' : '#fef2f2';
                    const borderColor = isSuccess ? '#10b981' : '#ef4444';
                    const iconColor = isSuccess ? '#10b981' : '#ef4444';
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
                        {/* Icon Circle */}
                        <div style={{ 
                          flexShrink: 0,
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: isSuccess ? '#d1fae5' : '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <i className={`bi ${iconName}`} style={{ 
                            fontSize: '1.25rem', 
                            color: iconColor 
                          }}></i>
                        </div>
                        
                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          {/* Header Row */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <i className={tx.type === 'auto' ? 'bi bi-arrow-repeat' : 'bi bi-hand-thumbs-up'} style={{ 
                                fontSize: '1rem',
                                color: '#6c757d'
                              }}></i>
                              <span style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>
                                {tx.type === 'auto' ? 'Nạp tự động' : 'Nạp thủ công'}
                              </span>
                            </div>
                            
                            {/* Amount Badge */}
                            <div style={{ 
                              padding: '0.375rem 0.75rem',
                              backgroundColor: isSuccess ? '#d1fae5' : '#fee2e2',
                              borderRadius: '20px',
                              fontSize: '0.875rem', 
                              fontWeight: '700', 
                              color: iconColor 
                            }}>
                              {isSuccess ? '+' : ''}{formatMoney(tx.amount, fund.currency)}
                            </div>
                          </div>
                          
                          {/* Status Row */}
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
                              backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
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
                              {new Date(tx.date).toLocaleString('vi-VN')}
                            </div>
                          </div>
                          
                          {/* Message */}
                          <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                            {tx.message}
                          </div>
                          
                          {/* Failed transaction details */}
                          {!isSuccess && tx.walletBalance !== undefined && (
                            <div style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              fontSize: '0.75rem'
                            }}>
                              <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <i className="bi bi-info-circle-fill"></i>
                                Chi tiết lỗi
                              </div>
                              <div style={{ color: '#991b1b', lineHeight: '1.6' }}>
                                <div>• Số tiền cần: <strong>{formatMoney(tx.amount, fund.currency)}</strong></div>
                                <div>• Số dư ví: <strong>{formatMoney(tx.walletBalance, fund.currency)}</strong></div>
                                <div>• Thiếu: <strong>{formatMoney(tx.amount - tx.walletBalance, fund.currency)}</strong></div>
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
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BIỂU ĐỒ & THỐNG KÊ */}
      <div className="fund-detail-card">
        <div className="mb-3">
          <h4 className="fund-detail-title mb-1">{fund.name}</h4>
          <div className="fund-detail-chip">
            Quỹ tiết kiệm cá nhân
            <span className="mx-1">•</span>
            {fund.hasTerm ? "Có kỳ hạn" : "Không kỳ hạn"}
          </div>
        </div>

        {/* BIỂU ĐỒ LỊCH SỬ NẠP TIỀN */}
        <div style={{ 
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '1rem'
        }}>
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
              BIỂU ĐỒ SỐ DƯ
            </div>
            {progress !== null && (
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d6efd' }}>
                {progress}% hoàn thành
              </div>
            )}
          </div>

          {/* LINE CHART */}
          <div style={{ position: 'relative', height: '180px', paddingTop: '10px' }}>
            <svg width="100%" height="180" style={{ overflow: 'visible' }}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <line
                  key={percent}
                  x1="0"
                  y1={180 - (percent / 100) * 160}
                  x2="100%"
                  y2={180 - (percent / 100) * 160}
                  stroke="#e9ecef"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              ))}

              {/* Area under curve */}
              <path
                d={`M 0 180 
                    ${transactionHistory.map((item, idx) => {
                      const x = (idx / (transactionHistory.length - 1)) * 100;
                      const y = 180 - ((item.amount / maxAmount) * 160);
                      return `L ${x}% ${y}`;
                    }).join(' ')} 
                    L 100% 180 Z`}
                fill="url(#gradient)"
                opacity="0.2"
              />

              {/* Line */}
              <polyline
                points={transactionHistory.map((item, idx) => {
                  const x = (idx / (transactionHistory.length - 1)) * 100;
                  const y = 180 - ((item.amount / maxAmount) * 160);
                  return `${x}%,${y}`;
                }).join(' ')}
                fill="none"
                stroke="#0d6efd"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points với màu sắc theo loại nạp tiền */}
              {transactionHistory.map((item, idx) => {
                const x = (idx / (transactionHistory.length - 1)) * 100;
                const y = 180 - ((item.amount / maxAmount) * 160);
                const pointColor = item.type === 'manual' ? '#10b981' :      // Xanh lá - Thủ công
                                   item.type === 'auto' ? '#0d6efd' :        // Xanh dương - Tự động
                                   '#9ca3af';                                 // Xám - Initial
                return (
                  <g key={idx}>
                    {/* Outer circle (white border) */}
                    <circle
                      cx={`${x}%`}
                      cy={y}
                      r="6"
                      fill="#fff"
                      stroke={pointColor}
                      strokeWidth="3"
                    />
                    {/* Inner dot (colored) */}
                    {item.type !== 'initial' && (
                      <circle
                        cx={`${x}%`}
                        cy={y}
                        r="3"
                        fill={pointColor}
                      />
                    )}
                  </g>
                );
              })}

              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            {/* X-axis labels - chỉ hiện một số ngày chọn lọc */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#6c757d'
            }}>
              {transactionHistory.filter((_, idx) => idx % 3 === 0 || idx === transactionHistory.length - 1).map((item, idx, arr) => (
                <div key={item.date} style={{ 
                  flex: 1, 
                  textAlign: idx === 0 ? 'left' : idx === arr.length - 1 ? 'right' : 'center' 
                }}>
                  {item.date}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* THỐNG KÊ CHI TIẾT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Số dư hiện tại */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '8px',
            borderLeft: '4px solid #0d6efd'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
              SỐ DƯ HIỆN TẠI
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0d6efd' }}>
              {formatMoney(fund.current, fund.currency)}
            </div>
          </div>

          {/* Mục tiêu */}
          {fund.target && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff7ed',
              borderRadius: '8px',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                MỤC TIÊU
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>
                {formatMoney(fund.target, fund.currency)}
              </div>
            </div>
          )}

          {/* Còn thiếu */}
          {fund.target && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                CÒN THIẾU
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ef4444' }}>
                {formatMoney(fund.target - fund.current, fund.currency)}
              </div>
            </div>
          )}

          {/* Tần suất & Số tiền mỗi kỳ */}
          {fund.frequency && fund.amountPerPeriod && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                TẦN SUẤT GỬI
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>
                    {fund.frequency === 'DAILY' ? 'Hàng ngày' :
                     fund.frequency === 'WEEKLY' ? 'Hàng tuần' :
                     fund.frequency === 'MONTHLY' ? 'Hàng tháng' :
                     fund.frequency === 'YEARLY' ? 'Hàng năm' : fund.frequency}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#10b981' }}>
                    {formatMoney(fund.amountPerPeriod, fund.currency)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ngày bắt đầu & kết thúc */}
          {(fund.startDate || fund.endDate) && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#faf5ff',
              borderRadius: '8px',
              borderLeft: '4px solid #a855f7'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                THỜI GIAN
              </div>
              <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                {fund.startDate && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Bắt đầu:</strong> {new Date(fund.startDate).toLocaleDateString('vi-VN')}
                  </div>
                )}
                {fund.endDate && (
                  <div>
                    <strong>Kết thúc:</strong> {new Date(fund.endDate).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tính năng đã bật */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
              TÍNH NĂNG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fund.reminderEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="bi bi-bell-fill" style={{ color: '#0d6efd' }}></i>
                  <span style={{ fontSize: '0.875rem' }}>Nhắc nhở đã bật</span>
                </div>
              )}
              {fund.autoDepositEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="bi bi-arrow-repeat" style={{ color: '#10b981' }}></i>
                  <span style={{ fontSize: '0.875rem' }}>Tự động nạp tiền</span>
                </div>
              )}
              {!fund.reminderEnabled && !fund.autoDepositEnabled && (
                <div style={{ fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic' }}>
                  Chưa bật tính năng nào
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Xác nhận xóa quỹ"
        message={`Bạn có chắc chắn muốn xóa quỹ "${fund.name}"?\n\nHành động này sẽ xóa vĩnh viễn quỹ và không thể hoàn tác!`}
        okText="Xóa quỹ"
        cancelText="Hủy"
        danger={true}
        onOk={confirmDeleteFund}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
