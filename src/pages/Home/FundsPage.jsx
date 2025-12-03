// src/pages/Home/FundsPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useWalletData } from "../../contexts/WalletDataContext";
import { useFundData } from "../../contexts/FundDataContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { calculateAllFundWarnings } from "../../utils/fundWarnings";
import "../../styles/pages/FundsPage.css";
import "../../styles/components/funds/FundCard.css";
import "../../styles/components/funds/FundSection.css";
import "../../styles/components/funds/FundDetail.css";
import "../../styles/components/funds/FundForms.css";

// Components
import FundSection from "../../components/funds/FundSection";
import PersonalTermForm from "../../components/funds/PersonalTermForm";
import PersonalNoTermForm from "../../components/funds/PersonalNoTermForm";
import FundDetailView from "../../components/funds/FundDetailView";

export default function FundsPage() {
  const location = useLocation();
  const { wallets } = useWalletData();
  const { funds, loading, loadFunds, getFundById } = useFundData();
  const { pushNotification } = useNotifications();
  const { t } = useLanguage();

  // CHỈ VÍ CÁ NHÂN (vì đã bỏ quỹ nhóm)
  const personalWallets = useMemo(
    () => wallets.filter((w) => !w.isShared),
    [wallets]
  );

  // Load funds khi component mount
  useEffect(() => {
    loadFunds();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính toán warnings và push vào notifications
  useEffect(() => {
    if (funds.length === 0 || wallets.length === 0) return;
    
    const allWarnings = calculateAllFundWarnings(funds, wallets);
    
    // Push warnings vào notification context
    allWarnings.forEach(warning => {
      pushNotification({
        role: 'user',
        type: 'fund_warning',
        fundId: warning.fundId,
        title: warning.title,
        desc: warning.message,
        timeLabel: 'Mới',
        severity: warning.severity,
        warningType: warning.type
      });
    });
    
    // TODO: Notifications for fund reminders and auto-deposits will be handled by backend
  }, [funds, wallets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý navigate từ notification
  useEffect(() => {
    if (location.state?.openFundId && location.state?.defaultTab) {
      const fundToOpen = funds.find(f => f.id === location.state.openFundId);
      if (fundToOpen) {
        handleSelectFund(fundToOpen, location.state.defaultTab);
        // Clear state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, funds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chỉ lọc quỹ cá nhân
  const personalTermFunds = useMemo(() => {
    const filtered = funds.filter((f) => f.type === "personal" && f.hasTerm);
    console.log("FundsPage: Total funds:", funds.length);
    console.log("FundsPage: Personal term funds:", filtered.length, filtered);
    return filtered;
  }, [funds]);
  
  const personalNoTermFunds = useMemo(() => {
    const filtered = funds.filter((f) => f.type === "personal" && !f.hasTerm);
    console.log("FundsPage: Personal no-term funds:", filtered.length, filtered);
    return filtered;
  }, [funds]);

  // View mode
  const [viewMode, setViewMode] = useState("overview"); // overview | detail | create
  const [personalTab, setPersonalTab] = useState("term");
  const [activeFund, setActiveFund] = useState(null);

  // Tìm kiếm + sắp xếp
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("name"); // name | currentDesc | progressDesc

  const handleSelectFund = (fund, defaultTab = "info") => {
    setActiveFund(fund);
    setViewMode("detail");
    setDefaultTab(defaultTab);
  };

  const [defaultTab, setDefaultTab] = useState("info");

  const handleUpdateFund = async () => {
    // Reload funds list từ API
    await loadFunds();
    
    // Lấy lại fund detail mới nhất
    if (activeFund?.id) {
      const result = await getFundById(activeFund.id);
      if (result.success) {
        setActiveFund(result.data);
      }
    }
  };

  // Helper: áp dụng search + sort
  const applySearchAndSort = (list) => {
    let result = [...list];

    // Tìm kiếm theo tên quỹ
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((f) =>
        (f.name || "").toLowerCase().includes(lower)
      );
    }

    // Sắp xếp
    switch (sortMode) {
      case "currentDesc": // Số tiền hiện tại giảm dần
        result.sort((a, b) => (b.current || 0) - (a.current || 0));
        break;
      case "progressDesc": {
        // Tỷ lệ hoàn thành giảm dần
        const getProgress = (f) =>
          f.target && f.target > 0 ? (f.current || 0) / f.target : 0;
        result.sort((a, b) => getProgress(b) - getProgress(a));
        break;
      }
      case "name":
      default:
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
    }

    return result;
  };

  const filteredTermFunds = useMemo(
    () => applySearchAndSort(personalTermFunds),
    [personalTermFunds, searchTerm, sortMode]
  );

  const filteredNoTermFunds = useMemo(
    () => applySearchAndSort(personalNoTermFunds),
    [personalNoTermFunds, searchTerm, sortMode]
  );

  // Hiển thị loading
  if (loading) {
    return (
      <div className="funds-page tx-page container-fluid py-4">
        <div className="tx-page-inner">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-3 text-muted">Đang tải danh sách quỹ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="funds-page tx-page container-fluid py-4">
      <div className="tx-page-inner">
      {/* HEADER */}
      {/* HEADER QUỸ – CHUẨN LAYOUT GIỐNG VÍ */}
<div className="funds-header-unique mb-3">
  {/* TRÁI: ICON + TEXT */}
  <div className="funds-header-left">
    <div className="funds-header-icon">
      <i className="bi bi-piggy-bank" />
    </div>

    <div className="funds-header-text">
      <h2 className="mb-1">{t('funds.title')}</h2>
      <p className="mb-0 text-muted">{t('funds.subtitle')}</p>
    </div>
  </div>

  {/* PHẢI: NÚT */}
  {viewMode === "overview" ? (
    <button
      type="button"
      className="btn btn-outline-primary funds-header-btn"
      onClick={() => setViewMode("create")}
    >
      <i className="bi bi-plus-circle me-1" />
      {t('funds.btn.create_personal')}
    </button>
  ) : (
    <button
      type="button"
      className="btn btn-outline-secondary funds-header-btn"
      onClick={() => {
        setViewMode("overview");
        setActiveFund(null);
      }}
    >
      <i className="bi bi-arrow-left me-1" />
      {t('funds.btn.back')}
    </button>
  )}
</div>

      {/* OVERVIEW */}
      {viewMode === "overview" && (
        <div className="funds-wrapper">
          {/* Thanh tìm kiếm & sắp xếp */}
          <div className="funds-toolbar">
            <div className="funds-toolbar__search">
              <i className="bi bi-search" />

              <input
                type="text"
                placeholder={t('funds.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {searchTerm && (
                <button
                  type="button"
                  className="funds-clear-search"
                  onClick={() => setSearchTerm("")}
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>

            <div className="funds-toolbar__sort">
              <span>{t('funds.sort_label')}</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
              >
                <option value="name">{t('funds.sort.name')}</option>
                <option value="currentDesc">{t('funds.sort.currentDesc')}</option>
                <option value="progressDesc">{t('funds.sort.progressDesc')}</option>
              </select>
            </div>
          </div>

          {/* 2 cột: có thời hạn / không thời hạn */}
          <div className="funds-two-col">
            {/* BOX 1: QUỸ CÓ THỜI HẠN */}
            <div className="fund-section-wrapper fund-section-wrapper--term">
              <FundSection
                title={t('funds.section.personal_term')}
                subtitle={t('funds.section.personal_term_desc')}
                items={filteredTermFunds}
                onSelectFund={handleSelectFund}
              />
            </div>

            {/* BOX 2: QUỸ KHÔNG THỜI HẠN */}
            <div className="fund-section-wrapper fund-section-wrapper--no-term">
              <FundSection
                title={t('funds.section.personal_no_term')}
                subtitle={t('funds.section.personal_no_term_desc')}
                items={filteredNoTermFunds}
                onSelectFund={handleSelectFund}
              />
            </div>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {viewMode === "detail" && activeFund && (
        <div className="card border-0 shadow-sm p-3 p-lg-4">
          <FundDetailView
            fund={activeFund}
            defaultTab={defaultTab}
            onBack={() => {
              setViewMode("overview");
              setActiveFund(null);
              setDefaultTab("info");
            }}
            onUpdateFund={handleUpdateFund}
          />
        </div>
      )}

      {/* CREATE FUND */}
      {viewMode === "create" && (
        <div className="card border-0 shadow-sm p-3 p-lg-4">
          <div className="funds-tabs mb-3">
            <button
              className={
                "funds-tab" + (personalTab === "term" ? " funds-tab--active" : "")
              }
              onClick={() => setPersonalTab("term")}
            >
              {t('funds.section.personal_term')}
            </button>
            <button
              className={
                "funds-tab" +
                (personalTab === "no-term" ? " funds-tab--active" : "")
              }
              onClick={() => setPersonalTab("no-term")}
            >
              {t('funds.section.personal_no_term')}
            </button>
          </div>

          {personalTab === "term" ? (
            <PersonalTermForm 
              wallets={personalWallets} 
              onSuccess={async () => {
                await loadFunds();
                setViewMode("overview");
              }}
            />
          ) : (
            <PersonalNoTermForm 
              wallets={personalWallets}
              onSuccess={async () => {
                await loadFunds();
                setViewMode("overview");
              }}
            />
          )}
        </div>
      )}
      </div>
    </div>
  );
}
