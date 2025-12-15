import React, { useEffect, useMemo } from "react";
import { formatMoneyInput, getMoneyValue } from "../../../utils/formatMoneyInput";
import { formatMoney } from "../../../utils/formatMoney";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function TransferTab({
  wallet,
  allWallets,
  transferTargetId,
  setTransferTargetId,
  transferAmount,
  setTransferAmount,
  transferNote,
  setTransferNote,
  onSubmitTransfer,
}) {
  const { t } = useLanguage();

  const safeWallets = useMemo(() => (Array.isArray(allWallets) ? allWallets : []), [allWallets]);

  const resolveRole = (wallet) => {
    if (!wallet) return "";
    const candidates = [
      wallet.walletRole,
      wallet.sharedRole,
      wallet.role,
      wallet.accessRole,
      wallet.currentUserRole,
      wallet.membershipRole,
    ];
    for (const candidate of candidates) {
      if (!candidate && candidate !== 0) continue;
      if (typeof candidate === "string") return candidate.toUpperCase();
      if (typeof candidate === "number") return String(candidate).toUpperCase();
      if (typeof candidate === "object") {
        if (typeof candidate.role === "string") return candidate.role.toUpperCase();
        if (typeof candidate.name === "string") return candidate.name.toUpperCase();
        if (typeof candidate.value === "string") return candidate.value.toUpperCase();
      }
    }
    return "";
  };

  const isViewerOnlyWallet = (wallet) => {
    const role = resolveRole(wallet);
    return ["VIEW", "VIEWER"].includes(role);
  };

  const isMemberWallet = (wallet) => {
    const role = resolveRole(wallet);
    // Chỉ coi là ví được chia sẻ (cho phép làm ví đích) khi role là MEMBER/USER/USE
    return ["MEMBER", "USER", "USE"].includes(role);
  };

  const isOwnerWallet = (wallet) => {
    const role = resolveRole(wallet);
    return ["OWNER", "MASTER", "ADMIN"].includes(role);
  };


  // Frontend chỉ dùng VND, không còn chức năng chuyển đổi tiền tệ
  const sourceBalance = Number(wallet?.balance || 0);
  const selectableTargets = useMemo(() => {
    return safeWallets.filter((candidate) => {
      if (!candidate) return false;
      if (String(candidate.id) === String(wallet?.id)) return false;
      // Bỏ các ví chỉ được xem
      if (isViewerOnlyWallet(candidate)) return false;
      // Xác định ví có phải shared không:
      // Ở đây chỉ tin cậy cờ isShared từ backend, tránh hiểu nhầm ví cá nhân OWNER là ví chia sẻ.
      const isShared = !!candidate.isShared;
      if (!isShared) return true; // ví cá nhân (kể cả OWNER)
      // Ví nhóm do mình sở hữu → cho phép
      if (isOwnerWallet(candidate)) return true;
      // Ví được chia sẻ: chỉ cho phép khi role là MEMBER/USER/USE
      if (isMemberWallet(candidate)) return true;
      return false;
    });
  }, [safeWallets, wallet?.id]);

  const targetWallet = useMemo(() => {
    return (
      selectableTargets.find((w) => String(w.id) === String(transferTargetId)) ||
      null
    );
  }, [selectableTargets, transferTargetId]);

  useEffect(() => {
    if (!transferTargetId) return;
    const stillValid = selectableTargets.some(
      (candidate) => String(candidate.id) === String(transferTargetId)
    );
    if (!stillValid) {
      setTransferTargetId("");
    }
  }, [selectableTargets, transferTargetId, setTransferTargetId]);

  // Parse số tiền từ format Việt Nam (dấu chấm mỗi 3 số, dấu phẩy thập phân)
  const transferAmountNum = getMoneyValue(transferAmount || "");

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>{t('wallets.transfer.title')}</h3>
        <span>
          {t('wallets.transfer.subtitle')}
        </span>
      </div>
      <form
        className="wallet-form"
        onSubmit={onSubmitTransfer}
        autoComplete="off"
      >
        <div className="wallet-form__row">
          <label>
            Ví nguồn
            <input
              type="text"
              value={wallet.name || "Ví hiện tại"}
              disabled
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư ví nguồn:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(sourceBalance, "VND")}
              </strong>
            </div>
          </label>
          <label>
            {t('wallets.transfer.target_label')}
            <select
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
            >
              <option value="">{t('wallets.transfer.target_placeholder')}</option>
              {selectableTargets.map((w) => {
                const isShared = !!w.isShared;
                // Xác định loại ví để hiển thị
                let typeLabel = "";
                if (!isShared) {
                  // Ví cá nhân (không chia sẻ hoặc chỉ mình dùng)
                  typeLabel = t("wallets.transfer.personal_tag"); // "(Cá nhân)"
                } else if (isMemberWallet(w)) {
                  // Ví được chia sẻ (mình là MEMBER/USER/USE)
                  typeLabel = "(Ví được chia sẻ)";
                } else {
                  // Ví nhóm mà mình là owner/role cao hơn
                  typeLabel = t("wallets.transfer.group_tag"); // "(Nhóm)"
                }
                const ownerEmail = w.ownerEmail || w.ownerContact || "";
                const baseName = w.name || t("wallets.no_name");
                const label = ownerEmail
                  ? `${baseName} ${typeLabel} - ${ownerEmail}`
                  : `${baseName} ${typeLabel}`;
                return (
                  <option key={w.id} value={w.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              {t('wallets.transfer.target_hint')}
            </div>
            {targetWallet && (
              <div style={{ 
                fontSize: "0.875rem", 
                color: "#6b7280",
                marginTop: "4px"
              }}>
                {t('wallets.transfer.target_balance')}:{" "}
                <strong style={{ color: "#111827" }}>
                  {formatMoney(Number(targetWallet?.balance || 0), "VND")}
                </strong>
              </div>
            )}
          </label>
        </div>
        <div className="wallet-form__row">
          <label>
            {t('wallets.transfer.amount_label')}
            <input
              type="text"
              value={transferAmount || ""}
              onChange={(e) => {
                // Format kiểu Việt Nam:
                // - Dấu chấm (.) mỗi 3 số từ bên phải cho phần nguyên
                // - Dấu phẩy (,) là dấu thập phân (phần sau không format)
                const inputValue = e.target.value;
                // Chỉ lưu giá trị hợp lệ (số, dấu chấm và dấu phẩy)
                let cleaned = inputValue.replace(/[^\d.,]/g, "");
                
                // Chỉ cho phép một dấu phẩy (dấu thập phân)
                const commaIndex = cleaned.indexOf(",");
                const lastCommaIndex = cleaned.lastIndexOf(",");
                
                if (commaIndex !== -1) {
                  // Có dấu phẩy (dấu thập phân)
                  // Chỉ cho phép một dấu phẩy
                  if (commaIndex !== lastCommaIndex) {
                    // Nếu có nhiều dấu phẩy, chỉ giữ dấu phẩy đầu tiên
                    cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, "");
                  }
                  
                  // Tách phần nguyên và phần thập phân
                  const integerPart = cleaned.substring(0, commaIndex).replace(/\./g, ""); // Loại bỏ dấu chấm cũ
                  const decimalPart = cleaned.substring(commaIndex + 1);
                  
                  // Format phần nguyên với dấu chấm mỗi 3 số
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  
                  // Kết hợp: phần nguyên đã format + dấu phẩy + phần thập phân (không format)
                  setTransferAmount(`${formattedInteger},${decimalPart}`);
                } else {
                  // Không có dấu phẩy, chỉ format phần nguyên
                  const integerPart = cleaned.replace(/\./g, ""); // Loại bỏ dấu chấm cũ
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setTransferAmount(formattedInteger);
                }
              }}
              onBlur={(e) => {
                // Khi blur, giữ nguyên format (đã format rồi)
                // Không cần làm gì thêm
              }}
              placeholder={t('wallets.transfer.amount_placeholder')}
              inputMode="numeric"
            />
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            {t('wallets.modal.note_label')}
            <textarea
              rows={2}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder={t('wallets.transfer.note_placeholder')}
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền không hợp lệ */}
        {transferAmount && transferAmountNum > sourceBalance && (
          <div className="wallet-form__row">
            <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
              {t('wallets.transfer.error.invalid_amount')}
            </div>
          </div>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={!transferTargetId || !transferAmount || transferAmountNum > sourceBalance || transferAmountNum <= 0}
          >
            <span style={{ marginRight: "6px" }}>✔</span>
            {t('wallets.transfer.confirm_button')}
          </button>
        </div>
      </form>
    </div>
  );
}

