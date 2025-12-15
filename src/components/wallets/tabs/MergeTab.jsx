import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatConvertedBalance } from "../utils/walletUtils";
import { useAuth } from "../../../contexts/AuthContext";
import { useBudgetData } from "../../../contexts/BudgetDataContext";
import { useWalletData } from "../../../contexts/WalletDataContext";
import { useLanguage } from "../../../contexts/LanguageContext";

const getLocalUserId = () => {
  if (typeof window === "undefined") return null;
  try {
    const authRaw = localStorage.getItem("auth_user");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      return (
        parsed?.userId ||
        parsed?.id ||
        parsed?.user?.userId ||
        parsed?.user?.id ||
        null
      );
    }
    const legacyRaw = localStorage.getItem("user");
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      return parsed?.userId || parsed?.id || null;
    }
  } catch (error) {
    console.warn("MergeTab: unable to parse current user", error);
  }
  return null;
};

const normalizeId = (value) => {
  if (value === undefined || value === null) return null;
  return String(value);
};

export default function MergeTab({
  wallet,
  allWallets,
  mergeTargetId,
  setMergeTargetId,
  onSubmitMerge,
  onChangeSelectedWallet,
}) {
  const [step, setStep] = useState(2);
  const [targetId, setTargetId] = useState(mergeTargetId || "");
  const [currencyMode, setCurrencyMode] = useState("keepTarget");
  const [agree, setAgree] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [direction, setDirection] = useState("this_into_other");
  const [searchTerm, setSearchTerm] = useState("");
  const [makeTargetDefault, setMakeTargetDefault] = useState(false);
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { budgets } = useBudgetData();
  const walletContext = useWalletData();
  // Lấy wallets mới nhất từ context để đảm bảo dữ liệu luôn được cập nhật
  const contextWallets = walletContext?.wallets || [];
  const loadWallets = walletContext?.loadWallets;

  // Force reload wallet data khi MergeTab được mở để đảm bảo dữ liệu mới nhất
  // Điều này đặc biệt quan trọng khi người dùng vừa sửa ví và đặt làm ví mặc định
  // Sử dụng ref để tránh reload quá nhiều lần
  const hasReloadedRef = useRef(false);
  useEffect(() => {
    if (wallet?.id && loadWallets && !hasReloadedRef.current) {
      // Delay nhỏ để đảm bảo các update trước đó đã hoàn tất
      const timer = setTimeout(() => {
        hasReloadedRef.current = true;
        // Reload wallets để lấy dữ liệu mới nhất từ API
        loadWallets().catch((err) => {
          console.debug("MergeTab: Failed to reload wallets:", err);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [wallet?.id, loadWallets]);
  
  // Reset reload flag khi wallet thay đổi
  useEffect(() => {
    hasReloadedRef.current = false;
  }, [wallet?.id]);

  const currentUserId = useMemo(() => {
    const contextId =
      currentUser?.id ||
      currentUser?.userId ||
      currentUser?.user?.id ||
      currentUser?.user?.userId ||
      null;
    const fallback = contextId || getLocalUserId();
    return fallback ? normalizeId(fallback) : null;
  }, [currentUser]);

  const getTxCount = (w) => {
    if (!w) return 0;
    const candidates = [
      w.txCount,
      w.transactionCount,
      w.transactionsCount,
      w.totalTransactions,
      w.totalTransaction,
      Array.isArray(w.transactions) ? w.transactions.length : null,
    ];
    const found = candidates.find(
      (val) => val !== undefined && val !== null && !Number.isNaN(Number(val))
    );
    return Number(found) || 0;
  };

  useEffect(() => {
    if (!processing) return;
    setProgress(0);
    let v = 0;
    const timer = setInterval(() => {
      v += 15;
      if (v >= 100) {
        v = 100;
        clearInterval(timer);
        setTimeout(() => setProcessing(false), 400);
      }
      setProgress(v);
    }, 260);
    return () => clearInterval(timer);
  }, [processing]);

  useEffect(() => {
    if (setMergeTargetId) setMergeTargetId(targetId);
  }, [targetId, setMergeTargetId]);

  useEffect(() => {
    setTargetId("");
    if (setMergeTargetId) setMergeTargetId("");
  }, [direction, setMergeTargetId]);

  useEffect(() => {
    setMakeTargetDefault(false);
  }, [targetId, direction]);

  // Tính toán tất cả các giá trị trước khi có early return (để hooks được gọi đúng thứ tự)
  // Luôn lấy wallet mới nhất từ context hoặc allWallets để đảm bảo dữ liệu được cập nhật (ví dụ: sau khi đổi ví mặc định)
  const currentWallet = useMemo(() => {
    if (!wallet?.id) return wallet;
    // Ưu tiên lấy từ contextWallets (dữ liệu mới nhất từ WalletDataContext)
    // Nếu không có trong context, fallback về allWallets prop
    // Cuối cùng mới dùng prop wallet
    const latestFromContext = contextWallets.find(
      (w) => String(w.id) === String(wallet.id)
    );
    if (latestFromContext) return latestFromContext;
    
    const latestFromProps = (allWallets || []).find(
      (w) => String(w.id) === String(wallet.id)
    );
    return latestFromProps || wallet;
  }, [wallet, allWallets, contextWallets]);
  const thisName = currentWallet?.name || "Ví hiện tại";

  const currentWalletOwnerId = useMemo(
    () => normalizeId(currentWallet?.ownerUserId),
    [currentWallet]
  );

  const selectableWallets = useMemo(() => {
    if (!currentWallet || currentWallet.isShared) return [];
    if (!currentUserId || !currentWalletOwnerId) return [];
    if (currentWalletOwnerId !== currentUserId) return [];

    // Ưu tiên dùng contextWallets (dữ liệu mới nhất), fallback về allWallets
    const walletsToUse = contextWallets.length > 0 ? contextWallets : (allWallets || []);
    
    return walletsToUse.filter((w) => {
      if (!w || w.id === currentWallet.id) return false;
      if (w.isShared) return false;
      const ownerId = normalizeId(w.ownerUserId);
      return ownerId === currentUserId;
    });
  }, [allWallets, contextWallets, currentWallet, currentUserId, currentWalletOwnerId]);

  const budgetWalletIds = useMemo(
    () =>
      (budgets || [])
        .map((b) => (b?.walletId !== null && b?.walletId !== undefined ? Number(b.walletId) : null))
        .filter((id) => id !== null && !Number.isNaN(id)),
    [budgets]
  );

  const isBudgetWallet = (w) => {
    if (!w || w.id === undefined || w.id === null) return false;
    return budgetWalletIds.includes(Number(w.id));
  };

  useEffect(() => {
    if (!targetId) return;
    const exists = selectableWallets.some(
      (w) => String(w.id) === String(targetId)
    );
    if (!exists) {
      setTargetId("");
    }
  }, [selectableWallets, targetId]);

  const filteredWallets = useMemo(() => {
    return selectableWallets.filter((w) => {
      if (!searchTerm.trim()) return true;
      const name = (w.name || "").toLowerCase();
      return name.includes(searchTerm.trim().toLowerCase());
    });
  }, [selectableWallets, searchTerm]);

  const selectedWallet = useMemo(() => {
    if (!targetId) return null;
    // Ưu tiên tìm wallet mới nhất từ contextWallets (dữ liệu mới nhất)
    // Nếu không có trong context, tìm từ allWallets
    // Cuối cùng mới tìm từ selectableWallets
    const latestFromContext = contextWallets.find(
      (w) => String(w.id) === String(targetId)
    );
    if (latestFromContext && selectableWallets.some((w) => String(w.id) === String(targetId))) {
      return latestFromContext;
    }
    
    const latestFromProps = (allWallets || []).find(
      (w) => String(w.id) === String(targetId)
    );
    if (latestFromProps && selectableWallets.some((w) => String(w.id) === String(targetId))) {
      return latestFromProps;
    }
    
    // Fallback về selectableWallets nếu không tìm thấy trong context hoặc props
    return selectableWallets.find((w) => String(w.id) === String(targetId)) || null;
  }, [allWallets, contextWallets, selectableWallets, targetId]);

  const isThisIntoOther = direction === "this_into_other";

  const sourceWallet = useMemo(() => {
    if (!currentWallet) return null;
    return direction === "this_into_other" ? currentWallet : selectedWallet || null;
  }, [currentWallet, direction, selectedWallet]);

  const targetWallet = useMemo(() => {
    if (!currentWallet) return null;
    return direction === "this_into_other" ? selectedWallet || null : currentWallet;
  }, [currentWallet, direction, selectedWallet]);

  const budgetBlocking = useMemo(() => {
    if (isBudgetWallet(currentWallet)) {
      return "Ví này đang được dùng làm nguồn cho ngân sách và không thể gộp.";
    }
    if (isBudgetWallet(selectedWallet)) {
      return "Ví đích đang được dùng làm nguồn cho ngân sách và không thể gộp.";
    }
    return null;
  }, [currentWallet, selectedWallet]);

  const srcCurrency = sourceWallet?.currency || "VND";
  const srcName = sourceWallet?.name || "Ví nguồn";
  const srcBalance = useMemo(() => {
    return Number(sourceWallet?.balance ?? sourceWallet?.current ?? 0) || 0;
  }, [sourceWallet]);
  const srcTxCount = useMemo(() => getTxCount(sourceWallet), [sourceWallet]);

  const tgtCurrency = targetWallet?.currency || srcCurrency;
  const tgtName = targetWallet?.name || "Ví đích";
  const tgtBalance = useMemo(() => {
    return Number(targetWallet?.balance ?? targetWallet?.current ?? 0) || 0;
  }, [targetWallet]);
  const tgtTxCount = useMemo(() => getTxCount(targetWallet), [targetWallet]);

  const currentIsDefault = !!currentWallet?.isDefault;
  const selectedIsDefault = !!selectedWallet?.isDefault;

  const sourceIsDefault = useMemo(() => {
    return (direction === "this_into_other" && currentIsDefault) ||
      (direction === "other_into_this" && selectedIsDefault);
  }, [direction, currentIsDefault, selectedIsDefault]);

  const targetIsDefault = useMemo(() => {
    return (direction === "this_into_other" && selectedIsDefault) ||
      (direction === "other_into_this" && currentIsDefault);
  }, [direction, selectedIsDefault, currentIsDefault]);

  // Frontend chỉ dùng VND, không còn chức năng chuyển đổi tiền tệ
  const differentCurrency = false; // Luôn false vì chỉ dùng VND
  
  const convertedSourceAmount = srcBalance;
  const convertedTargetAmount = tgtBalance;
  const finalCurrency = "VND";

  const finalBalance = useMemo(() => {
    if (!targetWallet || !sourceWallet) return srcBalance;
    if (!differentCurrency) {
      return srcBalance + tgtBalance;
    }
    if (currencyMode === "keepSource") {
      return srcBalance + convertedTargetAmount;
    }
    return tgtBalance + convertedSourceAmount;
  }, [targetWallet, sourceWallet, srcBalance, tgtBalance, differentCurrency, currencyMode, convertedSourceAmount, convertedTargetAmount]);

  if (budgetBlocking) {
    return (
      <div className="wallets-section">
        <div className="wallets-section__header">
          <h3>{t('wallets.merge.title')}</h3>
          <span>{t('wallets.merge.budget_blocking')}</span>
        </div>
        <div className="alert alert-warning" role="alert">
          {budgetBlocking}
        </div>
      </div>
    );
  }

  // Early return sau khi tất cả hooks đã được gọi
  if (!wallet) {
    return (
      <div className="wallets-section">
        <p>{t('wallets.merge.select_wallet_hint')}</p>
      </div>
    );
  }

  const needDefaultConfirmation = (() => {
    if (!selectedWallet) return false;
    if (currentIsDefault && direction === "this_into_other") {
      return true;
    }

    if (
      !currentIsDefault &&
      direction === "other_into_this" &&
      selectedIsDefault
    ) {
      return true;
    }

    return false;
  })();

  const handleNextFromStep2 = () => {
    if (!targetId) return;
    if (needDefaultConfirmation) {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleConfirmMerge = () => {
    if (!targetWallet || !sourceWallet || !agree) return;
    if (!onSubmitMerge) return;

    const sourceId = sourceWallet.id;
    const targetIdFinal = targetWallet.id;
    if (!sourceId || !targetIdFinal) return;

    const payload = {
      sourceWalletId: sourceId,
      targetWalletId: targetIdFinal,
      currencyMode,
      direction,
      setTargetAsDefault: !!makeTargetDefault,
    };

    setStep(6);
    setProcessing(true);

    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      onSubmitMerge(fakeEvent, payload);

      if (onChangeSelectedWallet && targetIdFinal) {
        onChangeSelectedWallet(targetIdFinal);
      }
    }, 3000);
  };

  /* STEP 2 */
  const renderStep2 = () => {
    const currentBal =
      Number(currentWallet.balance ?? currentWallet.current ?? 0) || 0;
    const currentCur = currentWallet.currency || "VND";
    const currentTx = getTxCount(currentWallet);

    const selectedBal =
      selectedWallet &&
      (Number(selectedWallet.balance ?? selectedWallet.current ?? 0) || 0);
    const selectedCur = selectedWallet?.currency || "VND";

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">{t('wallets.merge.step_2_title')}</div>
          <div className="wallet-merge__step-pill">{t('wallets.merge.step_pill')}</div>
        </div>

        <div className="wallet-merge__box">
          {selectedWallet && (
            <div className="wallet-merge__relation">
              {isThisIntoOther ? (
                <>
                  {t('wallets.merge.relation_this_into_other', { thisName, otherName: selectedWallet.name || t('wallets.merge.selected_wallet') })}
                </>
              ) : (
                <>
                  {t('wallets.merge.relation_other_into_this', { thisName, otherName: selectedWallet.name || t('wallets.merge.selected_wallet') })}
                </>
              )}
            </div>
          )}

          <div className="wallet-merge__grid-2">
            <div className="wallet-merge__summary-wrapper">
              <div className="wallet-merge__summary-wrapper-header">
                <h4>{t('wallets.merge.summary_title')}</h4>
                <span>{t('wallets.merge.summary_subtitle')}</span>
              </div>

              <div className="wallet-merge__summary-col">
                <div className="wallet-merge__summary-card wallet-merge__summary-card--source">
                  <div className="wallet-merge__summary-title">{t('wallets.merge.current_wallet_title')}</div>
                  <div className="wallet-merge__summary-name">{thisName}</div>

                  <div className="wallet-merge__summary-row">
                    <span>{t('wallets.merge.currency_label')}</span>
                    <span>{currentCur}</span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>{t('wallets.merge.balance_label')}</span>
                    <span>
                      {formatConvertedBalance(currentBal, currentCur)}
                    </span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>{t('wallets.merge.transaction_count_label')}</span>
                    <span>{currentTx}</span>
                  </div>
                  {currentIsDefault && (
                    <div className="wallet-merge__target-warning">
                      {t('wallets.merge.is_default_warning')}
                    </div>
                  )}
                </div>

                <div className="wallet-merge__summary-card wallet-merge__summary-card--target">
                  <div className="wallet-merge__summary-title">
                    VÍ ĐÍCH ĐANG CHỌN
                  </div>
                  <div className="wallet-merge__summary-name">
                    {selectedWallet
                      ? selectedWallet.name || "Ví được chọn"
                      : "Chưa chọn ví đích"}
                  </div>

                  <div className="wallet-merge__summary-row">
                    <span>Tiền tệ</span>
                    <span>{selectedWallet ? selectedCur : "—"}</span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Số dư</span>
                    <span>
                      {selectedWallet
                        ? formatConvertedBalance(selectedBal, selectedCur)
                        : "—"}
                    </span>
                  </div>
                  <div className="wallet-merge__summary-row">
                    <span>Loại ví</span>
                    <span>
                      {selectedWallet
                        ? selectedWallet.isShared
                          ? "Ví nhóm"
                          : "Ví cá nhân"
                        : "—"}
                    </span>
                  </div>
                  {selectedWallet?.isDefault && (
                    <div className="wallet-merge__target-warning">
                      Ví này đang là ví mặc định.
                    </div>
                  )}
                  {selectedWallet &&
                    (selectedWallet.currency || "VND") !== currentCur && (
                      <div className="wallet-merge__target-warning">
                        Khác loại tiền tệ với ví hiện tại
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="wallet-merge__right-wrapper">
              <div className="wallet-merge__right-header">
                <h4>Thiết lập gộp &amp; chọn ví</h4>
                <span>Chọn chiều gộp và ví đích muốn gộp.</span>
              </div>

              <div className="wallet-merge__right">
                <div className="wallet-merge__direction">
                  <button
                    type="button"
                    className={
                      isThisIntoOther
                        ? "wallet-merge__direction-btn wallet-merge__direction-btn--active"
                        : "wallet-merge__direction-btn"
                    }
                    onClick={() => setDirection("this_into_other")}
                  >
                    Gộp ví này vào ví khác
                  </button>
                  <button
                    type="button"
                    className={
                      !isThisIntoOther
                        ? "wallet-merge__direction-btn wallet-merge__direction-btn--active"
                        : "wallet-merge__direction-btn"
                    }
                    onClick={() => setDirection("other_into_this")}
                  >
                    Gộp ví khác vào ví này
                  </button>
                </div>
                <p className="wallet-merge__direction-note">
                  {isThisIntoOther
                    ? "Số dư và giao dịch của ví hiện tại sẽ chuyển sang ví bạn chọn."
                    : "Số dư và giao dịch của ví được chọn sẽ được gộp vào ví hiện tại."}
                </p>

                <div className="wallet-merge__section-title">
                  {isThisIntoOther
                    ? "Chọn ví đích để gộp vào"
                    : "Chọn ví cần gộp vào ví này"}
                </div>
                <p className="wallet-merge__hint">
                  Chỉ các ví cá nhân do chính bạn sở hữu mới được phép gộp với nhau. Ví nhóm hoặc ví người khác chia sẻ cho bạn sẽ không xuất hiện tại đây.
                </p>

                <div className="wallet-merge__search">
                  <input
                    type="text"
                    placeholder="Tìm theo tên ví..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="wallet-merge__target-list">
                  {filteredWallets.length === 0 && (
                    <p className="wallet-merge__empty">
                      Không tìm thấy ví nào phù hợp. Hãy thử từ khóa khác.
                    </p>
                  )}

                  {filteredWallets.map((w) => {
                    const checked = String(targetId) === String(w.id);
                    const isDiff =
                      (w.currency || "VND") !== currentCur;

                    return (
                      <label
                        key={w.id}
                        className={
                          checked
                            ? "wallet-merge__target wallet-merge__target--active"
                            : "wallet-merge__target"
                        }
                      >
                        <input
                          type="radio"
                          name="mergeTarget"
                          value={w.id}
                          checked={checked}
                          onChange={() => setTargetId(String(w.id))}
                        />
                        <div className="wallet-merge__target-main">
                          <div className="wallet-merge__target-top">
                            <span className="wallet-merge__target-name">
                              {w.name || "Ví không tên"}
                            </span>
                            <span className="wallet-merge__target-chip">
                              {w.isShared ? "Ví nhóm" : "Ví cá nhân"}
                            </span>
                          </div>
                          <div className="wallet-merge__target-row">
                            <span>Tiền tệ</span>
                            <span>{w.currency || "VND"}</span>
                          </div>
                          <div className="wallet-merge__target-row">
                            <span>Số dư</span>
                            <span>
                              {formatConvertedBalance(Number(w.balance ?? w.current ?? 0), w.currency || "VND")}
                            </span>
                          </div>
                          {w.isDefault && (
                            <div className="wallet-merge__target-warning">
                              Ví này đang là ví mặc định.
                            </div>
                          )}
                          {isDiff && (
                            <div className="wallet-merge__target-warning">
                              Khác loại tiền tệ với ví hiện tại
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="wallet-merge__actions">
                  <button
                    type="button"
                    className="wallets-btn wallets-btn--ghost"
                    onClick={() => setStep(2)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="wallets-btn wallets-btn--primary"
                    disabled={!targetId}
                    onClick={handleNextFromStep2}
                  >
                    Tiếp tục
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3DefaultHandling = () => {
    if (!selectedWallet || !sourceWallet || !targetWallet) return null;

    if (sourceIsDefault) {
      const defaultName = sourceWallet?.name || "Ví mặc định hiện tại";
      return (
        <div className="wallets-section wallet-merge__panel">
          <div className="wallet-merge__step-header">
            <div className="wallet-merge__step-label">
              Bước 3 – Xử lý ví mặc định
            </div>
            <div className="wallet-merge__step-pill">Cảnh báo quan trọng</div>
          </div>

          <div className="wallet-merge__box">
            <div className="wallet-merge__section-block wallet-merge__section-block--warning">
              <div className="wallet-merge__section-title">
                Bạn đang gộp một ví mặc định
              </div>
              <ul className="wallet-merge__list">
                <li>
                  <strong>{defaultName}</strong> hiện đang là ví mặc định của
                  hệ thống.
                </li>
                <li>
                  Sau khi gộp, ví <strong>{defaultName}</strong> sẽ bị xoá.
                </li>
                <li>
                  Bạn cần quyết định ví nào sẽ là ví mặc định mới sau khi gộp.
                </li>
              </ul>
            </div>

            <div className="wallet-merge__section-block">
              <div className="wallet-merge__section-title">
                Chọn cách xử lý ví mặc định
              </div>
              <p className="wallet-merge__hint">
                Ví đích hiện tại: <strong>{tgtName}</strong>
              </p>

              <div className="wallet-merge__options">
                <label className="wallet-merge__option">
                  <input
                    type="radio"
                    name="defaultHandling"
                    value="makeTargetDefault"
                    checked={makeTargetDefault === true}
                    onChange={() => setMakeTargetDefault(true)}
                  />
                  <div>
                    <div className="wallet-merge__option-title">
                      Đặt ví đích làm ví mặc định mới (khuyến nghị)
                    </div>
                    <div className="wallet-merge__option-desc">
                      Sau khi gộp, ví{" "}
                      <strong>{tgtName || "ví đích"}</strong> sẽ trở thành ví
                      mặc định.
                    </div>
                  </div>
                </label>

                <label className="wallet-merge__option">
                  <input
                    type="radio"
                    name="defaultHandling"
                    value="noDefault"
                    checked={makeTargetDefault === false}
                    onChange={() => setMakeTargetDefault(false)}
                  />
                  <div>
                    <div className="wallet-merge__option-title">
                      Không đặt ví mặc định sau khi gộp
                    </div>
                    <div className="wallet-merge__option-desc">
                      Hệ thống sẽ tạm thời không có ví mặc định. Bạn có thể
                      chọn lại sau trong phần quản lý ví.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(4)}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 3 – Xử lý ví mặc định
          </div>
          <div className="wallet-merge__step-pill">Thiết lập an toàn</div>
        </div>

        <div className="wallet-merge__box">
          <div className="wallet-merge__section-block wallet-merge__section-block--warning">
            <div className="wallet-merge__section-title">
              Bạn đang gộp một ví mặc định vào ví thường
            </div>
            <ul className="wallet-merge__list">
              <li>
                Ví <strong>{srcName}</strong> hiện đang là ví mặc định.
              </li>
              <li>
                Sau khi gộp, ví mặc định này sẽ bị xoá và chỉ còn ví{" "}
                <strong>{tgtName}</strong>.
              </li>
              <li>
                Bạn cần quyết định có đặt ví <strong>{tgtName}</strong> làm ví
                mặc định mới hay không.
              </li>
            </ul>
          </div>

          <div className="wallet-merge__section-block">
            <div className="wallet-merge__section-title">
              Cài đặt ví mặc định sau khi gộp
            </div>
            <div className="wallet-merge__options">
              <label className="wallet-merge__option">
                <input
                  type="radio"
                  name="defaultHandling2"
                  value="makeTargetDefault"
                  checked={makeTargetDefault === true}
                  onChange={() => setMakeTargetDefault(true)}
                />
                <div>
                  <div className="wallet-merge__option-title">
                    Đặt ví đích làm ví mặc định
                  </div>
                  <div className="wallet-merge__option-desc">
                    Sau khi gộp, ví <strong>{tgtName}</strong> sẽ được đặt làm
                    ví mặc định của hệ thống.
                  </div>
                </div>
              </label>

              <label className="wallet-merge__option">
                <input
                  type="radio"
                  name="defaultHandling2"
                  value="keepCurrent"
                  checked={makeTargetDefault === false}
                  onChange={() => setMakeTargetDefault(false)}
                />
                <div>
                  <div className="wallet-merge__option-title">
                    Không tự động thay đổi ví mặc định
                  </div>
                  <div className="wallet-merge__option-desc">
                    Bạn có thể tự chọn lại ví mặc định sau ở phần quản lý ví.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(2)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--primary"
              onClick={() => setStep(4)}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep4Currency = () => {
    if (!targetWallet) return null;

    if (!differentCurrency) {
      return (
        <div className="wallets-section wallet-merge__panel">
          <div className="wallet-merge__step-header">
            <div className="wallet-merge__step-label">
              Bước 4 – Chọn loại tiền đích
            </div>
            <div className="wallet-merge__step-pill">
              Hai ví cùng loại tiền
            </div>
          </div>

          <div className="wallet-merge__box">
            <p className="wallet-merge__hint">
              Cả hai ví đều sử dụng{" "}
              <strong>{tgtCurrency}</strong>. Hệ thống sẽ giữ nguyên loại tiền
              này cho ví sau khi gộp.
            </p>

            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--ghost"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(5)}
              >
                Xem trước kết quả
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 4 – Chọn loại tiền đích
          </div>
          <div className="wallet-merge__step-pill">
            Hai ví khác loại tiền
          </div>
        </div>

        <div className="wallet-merge__box">
          <div className="wallet-merge__grid-2 wallet-merge__grid-2--equal">
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ NGUỒN</div>
              <div className="wallet-merge__summary-name">{srcName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{srcCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(srcBalance, srcCurrency)}
                </span>
              </div>
            </div>
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ ĐÍCH</div>
              <div className="wallet-merge__summary-name">{tgtName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{tgtCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(tgtBalance, tgtCurrency)}
                </span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-title">
            Cách xử lý khác loại tiền
          </div>
          <p className="wallet-merge__hint">
            Chọn loại tiền sẽ được giữ lại sau khi gộp. Hệ thống sẽ tự động quy đổi theo tỷ giá hiện tại.
          </p>

          <div className="wallet-merge__options">
            <label className="wallet-merge__option">
              <input
                type="radio"
                name="currencyMode"
                value="keepTarget"
                checked={currencyMode === "keepTarget"}
                onChange={() => setCurrencyMode("keepTarget")}
              />
              <div>
                <div className="wallet-merge__option-title">
                  Giữ VND (loại tiền của ví đích)
                </div>
                <div className="wallet-merge__option-desc">
                  Số dư ví nguồn: {formatConvertedBalance(srcBalance, "VND")}
                </div>
              </div>
            </label>

            <label className="wallet-merge__option">
              <input
                type="radio"
                name="currencyMode"
                value="keepSource"
                checked={currencyMode === "keepSource"}
                onChange={() => setCurrencyMode("keepSource")}
              />
              <div>
                <div className="wallet-merge__option-title">
                  Giữ VND (loại tiền của ví nguồn)
                </div>
                <div className="wallet-merge__option-desc">
                  Số dư ví đích: {formatConvertedBalance(tgtBalance, "VND")}
                </div>
              </div>
            </label>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(2)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--primary"
              onClick={() => setStep(5)}
            >
              Xem trước kết quả
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep5Preview = () => {
    if (!targetWallet || !sourceWallet) return null;

    return (
      <div className="wallets-section wallet-merge__panel">
        <div className="wallet-merge__step-header">
          <div className="wallet-merge__step-label">
            Bước 5 – Xem trước kết quả
          </div>
          <div className="wallet-merge__step-pill">Kiểm tra lần cuối</div>
        </div>

        <div className="wallet-merge__box wallet-merge__box--preview">
          <div className="wallet-merge__grid-2 wallet-merge__grid-2--equal">
            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ NGUỒN</div>
              <div className="wallet-merge__summary-name">{srcName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ</span>
                <span>{srcCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư</span>
                <span>
                  {formatConvertedBalance(srcBalance, srcCurrency)}
                </span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Giao dịch</span>
                <span>{srcTxCount}</span>
              </div>
            </div>

            <div className="wallet-merge__summary-card">
              <div className="wallet-merge__summary-title">VÍ ĐÍCH</div>
              <div className="wallet-merge__summary-name">{tgtName}</div>
              <div className="wallet-merge__summary-row">
                <span>Tiền tệ hiện tại</span>
                <span>{tgtCurrency}</span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Số dư hiện tại</span>
                <span>
                  {formatConvertedBalance(tgtBalance, tgtCurrency)}
                </span>
              </div>
              <div className="wallet-merge__summary-row">
                <span>Giao dịch hiện tại</span>
                <span>{tgtTxCount}</span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-divider" />

          <div className="wallet-merge__section-block">
            <div className="wallet-merge__section-title">
              Kết quả sau khi gộp
            </div>
            <div className="wallet-merge__result-grid">
              <div className="wallet-merge__result-row">
                <span>Ví đích</span>
                <span>{tgtName}</span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Loại tiền sau gộp</span>
                <span>{finalCurrency}</span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Số dư dự kiến</span>
                <span>
                  {formatConvertedBalance(finalBalance, finalCurrency)}
                </span>
              </div>
              <div className="wallet-merge__result-row">
                <span>Tổng giao dịch</span>
                <span>{srcTxCount + tgtTxCount}</span>
              </div>
            </div>
          </div>

          <div className="wallet-merge__section-block wallet-merge__section-block--warning">
            <div className="wallet-merge__section-title">Xác nhận</div>
            <ul className="wallet-merge__list">
              <li>Ví nguồn sẽ bị xoá sau khi gộp.</li>
              <li>
                Các giao dịch sẽ được chuyển sang ví đích theo loại tiền đã
                chọn.
              </li>
              <li>Hành động này không thể hoàn tác.</li>
            </ul>

            <label className="wallet-merge__agree">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>Tôi đã đọc và đồng ý với điều khoản gộp ví.</span>
            </label>
          </div>

          <div className="wallet-merge__actions">
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={() => setStep(4)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="wallets-btn wallets-btn--danger"
              disabled={!agree}
              onClick={handleConfirmMerge}
            >
              Xác nhận gộp ví
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep6Processing = () => (
    <div className="wallets-section wallet-merge__panel">
      <div className="wallet-merge__step-header">
        <div className="wallet-merge__step-label">Xử lý và hoàn tất</div>
        <div className="wallet-merge__step-pill">Hoàn thành</div>
      </div>

      <div className="wallet-merge__box">
        {processing ? (
          <div className="wallet-merge__processing">
            <div className="wallet-merge__section-title">
              Hệ thống đang gộp ví
            </div>
            <p className="wallet-merge__hint">
              Đang chuyển số dư & giao dịch sang ví đích...
            </p>
            <div className="wallet-merge__progress-bar">
              <div
                className="wallet-merge__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="wallet-merge__progress-text">
              {progress}% hoàn thành
            </div>
          </div>
        ) : (
          <div className="wallet-merge__success">
            <div className="wallet-merge__section-title">
              Đã gộp ví thành công
            </div>
            <p className="wallet-merge__hint">
              Hệ thống đã cập nhật lại số dư & giao dịch theo thiết lập của
              bạn.
            </p>
            <div className="wallet-merge__actions">
              <button
                type="button"
                className="wallets-btn wallets-btn--primary"
                onClick={() => setStep(2)}
              >
                Quay lại danh sách ví
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (step === 2) return renderStep2();
  if (step === 3) return renderStep3DefaultHandling();
  if (step === 4) return renderStep4Currency();
  if (step === 5) return renderStep5Preview();
  return renderStep6Processing();
}

