import React, { useState, useEffect, useMemo } from "react";
import Modal from "../common/Modal/Modal";
import SearchableSelectInput from "../common/SearchableSelectInput";
import { mapWalletsToSelectOptions, WALLET_TYPE_ICON_CONFIG } from "../../utils/walletSelectHelpers";
import { formatMoneyInput, handleMoneyInputChange, getMoneyValue } from "../../utils/formatMoneyInput";
import { useLanguage } from "../../contexts/LanguageContext";

const ALL_WALLETS_LABEL = "Tất cả ví";
 
export default function BudgetFormModal({
  open,
  mode, // 'create' or 'edit'
  initialData, // { categoryId, categoryName, categoryType, limitAmount, walletId }
  categories = [], // expense categories array
  wallets = [], // wallet list from WalletDataContext
  onSubmit,
  onClose,
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedWalletLabel, setSelectedWalletLabel] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("VND");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();
 
  const resolveWalletCurrency = (walletId) => {
    const wallet = wallets.find((w) => String(w.id) === String(walletId));
    const code = wallet?.currency || wallet?.currencyCode;
    return (code || "VND").toUpperCase();
  };
 
  useEffect(() => {
    if (initialData && mode === "edit") {
      setSelectedCategoryId(initialData.categoryId ? String(initialData.categoryId) : "");
      if (initialData.walletId !== null && initialData.walletId !== undefined) {
        setSelectedWalletId(String(initialData.walletId));
        setSelectedWalletLabel(initialData.walletName || "");
      } else if (initialData.walletName) {
        setSelectedWalletId("__legacy__");
        setSelectedWalletLabel(initialData.walletName || ALL_WALLETS_LABEL);
      } else {
        setSelectedWalletId("");
        setSelectedWalletLabel("");
      }
      setLimitAmount(
        initialData.limitAmount !== undefined && initialData.limitAmount !== null
          ? formatMoneyInput(initialData.limitAmount)
          : ""
      );
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      setAlertThreshold(initialData.alertPercentage ?? 90);
      setNote(initialData.note || "");
      const initialCurrency =
        initialData.currencyCode ||
        resolveWalletCurrency(initialData.walletId) ||
        "VND";
      setWalletCurrency(initialCurrency);
    } else {
      setSelectedCategoryId("");
      setSelectedWalletId("");
      setSelectedWalletLabel("");
      setLimitAmount("");
      setStartDate("");
      setEndDate("");
      setAlertThreshold(90);
      setNote("");
      const defaultCurrency =
        wallets.length === 1 ? resolveWalletCurrency(wallets[0].id) : "VND";
      setWalletCurrency(defaultCurrency);
    }
    setErrors({});
    setFormError("");
    setSubmitting(false);
  }, [open, mode, initialData, wallets]);
 
  const handleCategoryChange = (value) => setSelectedCategoryId(value);
  const handleWalletChange = (value) => {
    setSelectedWalletId(value);
    if (value) {
      const matchedOption = walletOptions.find((opt) => opt.value === String(value));
      setSelectedWalletLabel(matchedOption?.label || "");
      setWalletCurrency(resolveWalletCurrency(value));
    } else {
      setSelectedWalletLabel("");
      const defaultCurrency = walletList.length === 1
        ? resolveWalletCurrency(walletList[0].id)
        : "VND";
      setWalletCurrency(defaultCurrency);
    }
  };
 
  const handleLimitChange = (e) => {
    handleMoneyInputChange(e, setLimitAmount);
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const limitNumeric = getMoneyValue(limitAmount);
 
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    if (startDateObj) startDateObj.setHours(0, 0, 0, 0);
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);
 
    if (!selectedCategoryId) {
      newErrors.category = t('budgets.error.category');
    }
    
    // Xử lý walletId và walletName trước để validate
    const categoryObj = categories.find((c) => String(c.id) === String(selectedCategoryId)) || {};
    const walletObj = selectedWalletId 
      ? vndWallets.find((w) => String(w.id) === String(selectedWalletId))
      : null;
    const walletOption = selectedWalletId 
      ? walletOptions.find((opt) => String(opt.value) === String(selectedWalletId))
      : null;
    
    let resolvedWalletId = null;
    let resolvedWalletName = "";
    
    if (selectedWalletId && String(selectedWalletId).trim() !== "") {
      const numericId = Number(selectedWalletId);
      if (!isNaN(numericId)) {
        resolvedWalletId = numericId;
        if (walletObj) {
          resolvedWalletName = walletObj.name || walletObj.walletName || walletOption?.label || selectedWalletLabel || `Ví ${numericId}`;
        } else {
          resolvedWalletName = walletOption?.label || selectedWalletLabel || `Ví ${numericId}`;
        }
      }
    } else if (mode === "edit" && (initialData?.walletId === null || initialData?.walletId === undefined)) {
      resolvedWalletId = null;
      resolvedWalletName = initialData?.walletName || ALL_WALLETS_LABEL;
    }
    
    // Validation: Khi tạo mới, bắt buộc phải chọn ví (không cho phép "Tất cả ví")
    if (mode === "create" && !resolvedWalletId) {
      newErrors.wallet = "Vui lòng chọn ví áp dụng hạn mức";
    } else if (mode === "edit" && initialData?.walletId !== null && initialData?.walletId !== undefined && !resolvedWalletId) {
      newErrors.wallet = "Vui lòng chọn ví áp dụng hạn mức";
    }

    if (selectedWalletId) {
      const currencyCode = resolveWalletCurrency(selectedWalletId);
      if (currencyCode !== "VND") {
        newErrors.wallet = t('budgets.error.wallet_vnd_only');
      } else if (mode === "create") {
        // Kiểm tra quyền trên ví được chọn: nếu chỉ là VIEW/VIEWER thì không cho tạo hạn mức
        const viewerOnlyWallet = vndWallets.find(
          (w) => String(w.id) === String(selectedWalletId)
        );
        if (viewerOnlyWallet) {
          const role = (viewerOnlyWallet.walletRole || viewerOnlyWallet.sharedRole || viewerOnlyWallet.role || "")
            .toString()
            .toUpperCase();
          if (role === "VIEW" || role === "VIEWER") {
            newErrors.wallet = t("budgets.error.viewer_wallet");
          }
        }
      }
    }
    if (!limitNumeric || limitNumeric <= 0) {
      newErrors.limit = t('budgets.error.limit_required');
    }
    if (!startDate) {
      newErrors.startDate = t('budgets.error.start_date');
    }
    if (!endDate) {
      newErrors.endDate = t('budgets.error.end_date');
    }
    if (startDateObj && startDateObj < today) {
      newErrors.startDate = t('budgets.error.start_date_past');
    }
    if (startDateObj && endDateObj && endDateObj <= startDateObj) {
      newErrors.endDate = t('budgets.error.date_range');
    }
    if (alertThreshold < 50 || alertThreshold > 100) {
      newErrors.alertThreshold = t('budgets.error.alert_threshold');
    }
 
    // Đảm bảo walletName không rỗng nếu có walletId
    if (resolvedWalletId !== null && (!resolvedWalletName || resolvedWalletName.trim() === "")) {
      resolvedWalletName = `Ví ${resolvedWalletId}`;
    }
    
    // Validation cuối cùng: Khi tạo mới, walletId không được null
    if (mode === "create" && resolvedWalletId === null) {
      newErrors.wallet = "Vui lòng chọn ví áp dụng hạn mức";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Đảm bảo payload có walletId và walletName đúng
    const payload = {
      categoryId: categoryObj.id || null,
      categoryName: categoryObj.name || initialData?.categoryName || "",
      categoryType: "expense",
      walletId: resolvedWalletId, // Phải có giá trị khi tạo mới
      walletName: resolvedWalletName, // Phải có giá trị khi có walletId
      limitAmount: limitNumeric,
      startDate,
      endDate,
      alertPercentage: Number(alertThreshold),
      note: note.trim(),
    };
    
    // Debug log để kiểm tra
    if (mode === "create") {
      console.log("📊 Creating budget with payload:", {
        walletId: payload.walletId,
        walletName: payload.walletName,
        categoryId: payload.categoryId,
        categoryName: payload.categoryName
      });
    }
 
    try {
      setSubmitting(true);
      setFormError("");
      await onSubmit(payload);
      onClose();
    } catch (submitError) {
      const message =
        submitError?.message ||
        submitError?.error ||
        "Không thể lưu hạn mức. Vui lòng kiểm tra lại thông tin.";
      const normalizedMessage =
        message === "budgets.error.duplicate"
          ? "Hạn mức với ví, danh mục và ngày bắt đầu này đã tồn tại."
          : message;
      setFormError(normalizedMessage);
    } finally {
      setSubmitting(false);
    }
  };
 
  const categoryList = categories || [];
  const walletList = wallets || [];
  
  // Lấy currentUserId để kiểm tra owner
  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        return user.userId || user.id || null;
      }
    } catch (error) {
      console.error("Không thể đọc user từ localStorage:", error);
    }
    return null;
  }, []);
  
  const vndWallets = useMemo(
    () =>
      walletList.filter((w) => {
        // Bỏ qua ví đã bị xóa mềm
        if (w?.deleted) return false;
        
        // Chỉ lấy ví VND
        const code = (w?.currency || w?.currencyCode || "").toUpperCase();
        if (code !== "VND") return false;
        
        // Lấy role của user trong ví
        const role = (w?.walletRole || w?.sharedRole || w?.role || "").toString().toUpperCase();
        const isShared = !!w?.isShared || !!(w?.walletRole || w?.sharedRole || w?.role);
        
        // 1. Ví cá nhân (không shared, không có role hoặc role là OWNER)
        if (!isShared) {
          // Ví cá nhân: kiểm tra xem user có phải owner không
          if (w?.ownerUserId && currentUserId) {
            return String(w.ownerUserId) === String(currentUserId);
          }
          // Nếu không có ownerUserId, mặc định là ví của user hiện tại
          return true;
        }
        
        // 2. Ví nhóm (isShared = true, user là OWNER/MASTER/ADMIN)
        if (isShared && ["OWNER", "MASTER", "ADMIN"].includes(role)) {
          return true;
        }
        
        // 3. Ví được chia sẻ với quyền MEMBER/USER/USE (không phải VIEW/VIEWER)
        if (isShared && ["MEMBER", "USER", "USE"].includes(role)) {
          return true;
        }
        
        // Bỏ qua các ví khác (VIEW/VIEWER hoặc không có quyền)
        return false;
      }),
    [walletList, currentUserId]
  );
 
  const categoryOptions = useMemo(() => {
    const defaults = categoryList.map((cat) => ({
      value: cat && cat.id !== undefined && cat.id !== null ? String(cat.id) : "",
      label: cat?.name || "",
      icon: cat?.icon || "bi-tags",
      iconColor: "#0b5aa5",
      iconBg: "linear-gradient(135deg, rgba(11,90,165,0.12) 0%, rgba(10,180,190,0.05) 100%)",
    })).filter((opt) => opt.value && opt.label);
 
    if (
      mode === "edit" &&
      selectedCategoryId &&
      !defaults.some((opt) => opt.value === String(selectedCategoryId))
    ) {
      defaults.push({
        value: String(selectedCategoryId),
        label: initialData?.categoryName || "Danh mục đã chọn",
        icon: "bi-bookmark-check",
        iconColor: "#0f172a",
        iconBg: "rgba(15,23,42,0.08)",
      });
    }
    return defaults;
  }, [categoryList, mode, selectedCategoryId, initialData]);
 
  const walletTypeLabels = useMemo(
    () => ({
      personal: "Ví cá nhân",
      shared: "Ví được chia sẻ",
      group: "Ví nhóm",
    }),
    []
  );
 
  const walletOptions = useMemo(() => {
    const options = mapWalletsToSelectOptions(
      vndWallets,
      walletTypeLabels,
      (wallet) => (wallet?.id !== undefined && wallet?.id !== null ? wallet.id : "")
    );

    // Sửa lại label và description dựa trên quyền sở hữu và loại ví
    const normalized = options
      .filter((opt) => opt.value !== "")
      .map((opt) => {
        const wallet = opt.raw;
        if (!wallet) return opt;

        // Xác định user hiện tại có phải là owner không
        const role = (wallet.walletRole || wallet.sharedRole || wallet.role || "").toString().toUpperCase();
        const isOwner = 
          (wallet.ownerUserId && currentUserId && String(wallet.ownerUserId) === String(currentUserId)) ||
          ["OWNER", "MASTER", "ADMIN"].includes(role);
        
        // Kiểm tra walletType để phân biệt chính xác ví nhóm và ví cá nhân
        // walletType có thể là "GROUP" hoặc "PERSONAL" từ backend
        const walletType = (wallet.walletType || wallet.type || "").toString().toUpperCase();
        // Ví nhóm: walletType === "GROUP"
        // Ví cá nhân: walletType === "PERSONAL" hoặc không có walletType (fallback: kiểm tra isShared)
        const isGroupWallet = walletType === "GROUP";
        
        // Nếu user là owner
        if (isOwner) {
          // Ví nhóm (walletType === "GROUP") → "Ví nhóm"
          if (isGroupWallet) {
            return {
              ...opt,
              description: "Ví nhóm",
            };
          }
          // Ví cá nhân (walletType === "PERSONAL" hoặc không phải GROUP) → "Ví cá nhân"
          return {
            ...opt,
            description: "Ví cá nhân",
          };
        }
        
        // Nếu user không phải owner (là member được mời) → "Ví được chia sẻ"
        // Lấy email chủ ví từ nhiều nguồn (ưu tiên ownerEmail từ API)
        const ownerEmail = 
          wallet.ownerEmail || 
          wallet.ownerContact || 
          wallet.owner?.email ||
          wallet.ownerUser?.email ||
          "";
        
        // Thêm email chủ ví vào label (bắt buộc phải có email cho ví được chia sẻ)
        let newLabel = opt.label;
        if (ownerEmail && ownerEmail.trim() !== "") {
          newLabel = `${opt.label} (${ownerEmail})`;
        } else if (wallet.ownerName && wallet.ownerName.trim() !== "") {
          // Fallback: nếu không có email, dùng tên chủ ví
          newLabel = `${opt.label} (${wallet.ownerName})`;
        }
        
        return {
          ...opt,
          label: newLabel,
          description: "Ví được chia sẻ",
        };
      });

    if (
      mode === "edit" &&
      selectedWalletId &&
      !normalized.some((opt) => opt.value === String(selectedWalletId))
    ) {
      const fallbackConfig = WALLET_TYPE_ICON_CONFIG.shared;
      normalized.push({
        value: String(selectedWalletId),
        label: initialData?.walletName || "Ví đã chọn",
        icon: fallbackConfig.icon,
        iconColor: fallbackConfig.color,
        iconBg: fallbackConfig.bg,
      });
    }

    return normalized;
  }, [walletList, walletTypeLabels, mode, selectedWalletId, initialData, vndWallets]);
 
  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="modal__content budget-form-modal" style={{ padding: "2rem" }}>
        <button
          type="button"
          className="btn-close budget-form-close"
          aria-label={t('common.close')}
          onClick={onClose}
        />
        <div className="budget-form-breadcrumbs">
          <span>{t('budgets.form.breadcrumb_budget')}</span>
          <i className="bi bi-chevron-right" />
          <strong>{mode === "create" ? t('budgets.form.breadcrumb_create') : t('budgets.form.breadcrumb_edit')}</strong>
        </div>
        <h4 className="mb-3" style={{ fontWeight: 600, color: "#212529" }}>
          {mode === "create" ? t('budgets.form.title_create') : t('budgets.form.title_edit')}
        </h4>
        <div className="budget-form-info mb-4">
          <i className="bi bi-info-circle" />
          <div>
            <p>{t('budgets.form.info_desc')}</p>
            <span>{t('budgets.form.info_alert')}</span>
          </div>
        </div>
 
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}
          {/* Category Selector */}
          <div className="mb-3">
            <SearchableSelectInput
              label={t('budgets.form.category_label')}
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder={t('budgets.form.category_placeholder')}
              disabled={mode === "edit"}
              emptyMessage={t('budgets.form.category_empty')}
              error={errors.category}
            />
            {mode === "edit" && (
              <div className="form-text text-muted">
                {t('budgets.form.category_edit_hint')}
              </div>
            )}
          </div>
 
          {/* Wallet Selector */}
          <div className="mb-3">
            <SearchableSelectInput
              label={t('budgets.form.wallet_label')}
              value={selectedWalletId}
              onChange={handleWalletChange}
              options={walletOptions}
              placeholder={t('budgets.form.wallet_placeholder')}
              disabled={mode === "edit"}
              emptyMessage={t('budgets.form.wallet_empty')}
              error={errors.wallet}
            />
            {mode === "edit" && (
              <div className="form-text text-muted">
                {t('budgets.form.wallet_edit_hint')}
              </div>
            )}
          </div>
 
          {/* Limit Amount */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.limit_label', { currency: walletCurrency })}</label>
            <div className="input-group">
              <input
                type="text"
                className={`form-control ${errors.limit ? "is-invalid" : ""}`}
                placeholder="0"
                value={limitAmount}
                onChange={handleLimitChange}
              />
              <span className="input-group-text">{walletCurrency}</span>
            </div>
            {errors.limit && (
              <div className="invalid-feedback d-block">{errors.limit}</div>
            )}
          </div>
 
          {/* Date Range Selector */}
          <div className="mb-3">
            <label className="form-label fw-semibold">{t('budgets.form.date_range_label')}</label>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-text small mb-1 d-block">{t('budgets.form.start_date_label')}</label>
                <input
                  type="date"
                  className={`form-control ${errors.startDate ? "is-invalid" : ""}`}
                  value={startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setStartDate(newStartDate);
                    // Nếu "Đến ngày" đã được chọn và nhỏ hơn hoặc bằng "Từ ngày" mới, reset "Đến ngày"
                    if (endDate && newStartDate) {
                      const newStartDateObj = new Date(newStartDate);
                      const endDateObj = new Date(endDate);
                      newStartDateObj.setHours(0, 0, 0, 0);
                      endDateObj.setHours(0, 0, 0, 0);
                      if (endDateObj <= newStartDateObj) {
                        setEndDate("");
                      }
                    }
                  }}
                  min={(() => {
                    // Ẩn các ngày trong quá khứ - chỉ cho phép chọn từ hôm nay trở đi
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                />
                {errors.startDate && (
                  <div className="invalid-feedback d-block">{errors.startDate}</div>
                )}
              </div>
              <div className="col-6">
                <label className="form-text small mb-1 d-block">{t('budgets.form.end_date_label')}</label>
                <input
                  type="date"
                  className={`form-control ${errors.endDate ? "is-invalid" : ""}`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={(() => {
                    // Ẩn các ngày trước "Từ ngày" đã chọn
                    // Nếu đã chọn "Từ ngày", thì "Đến ngày" phải từ ngày tiếp theo của "Từ ngày"
                    if (startDate) {
                      const startDateObj = new Date(startDate);
                      startDateObj.setDate(startDateObj.getDate() + 1); // Ngày tiếp theo
                      const year = startDateObj.getFullYear();
                      const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
                      const day = String(startDateObj.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    }
                    // Nếu chưa chọn "Từ ngày", thì ẩn các ngày trong quá khứ
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                />
                {errors.endDate && (
                  <div className="invalid-feedback d-block">{errors.endDate}</div>
                )}
              </div>
            </div>
            <div className="form-text mt-2">{t('budgets.form.date_range_hint')}</div>
          </div>
 
          {/* Alert threshold */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.alert_threshold_label')}</label>
            <input
              type="range"
              className="form-range"
              min="50"
              max="100"
              step="5"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>50%</span>
              <span>{alertThreshold}%</span>
              <span>100%</span>
            </div>
            {errors.alertThreshold && (
              <div className="invalid-feedback d-block">{errors.alertThreshold}</div>
            )}
            <div className="form-text">{t('budgets.form.alert_threshold_hint')}</div>
          </div>
 
          {/* Notes */}
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('budgets.form.note_label')}</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={t('budgets.form.note_placeholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="form-text">{t('budgets.form.note_hint')}</div>
          </div>
 
          {/* Buttons */}
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              {t('budgets.form.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {t('budgets.form.processing')}
                </span>
              ) : mode === "create" ? (
                t('budgets.form.submit_create')
              ) : (
                t('budgets.form.submit_update')
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
 
 