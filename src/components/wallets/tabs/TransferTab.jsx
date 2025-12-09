import React, { useEffect, useMemo } from "react";
import { formatMoneyInput, getMoneyValue } from "../../../utils/formatMoneyInput";
import { formatMoney } from "../../../utils/formatMoney";
import { getRate } from "../utils/walletUtils";

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

  // Format số tiền chuyển đổi với độ chính xác cao (giống tỷ giá - 6 chữ số thập phân)
  const formatConvertedAmount = (amount = 0, currency = "VND") => {
    const numAmount = Number(amount) || 0;
    if (currency === "VND") {
      // VND: hiển thị với 6 chữ số thập phân để khớp với tỷ giá
      const formatted = numAmount.toLocaleString("vi-VN", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      });
      return `${formatted} VND`;
    }
    if (currency === "USD") {
      // USD: hiển thị lên tới 8 chữ số thập phân
      const formatted = numAmount.toLocaleString("en-US", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 8 
      });
      return `$${formatted}`;
    }
    // Các currency khác
    const formatted = numAmount.toLocaleString("vi-VN", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
    return `${formatted} ${currency}`;
  };

  const sourceCurrency = wallet.currency || "VND";
  const sourceBalance = Number(wallet?.balance || 0);
  const selectableTargets = useMemo(() => {
    return safeWallets.filter((candidate) => {
      if (!candidate) return false;
      if (String(candidate.id) === String(wallet?.id)) return false;
      return !isViewerOnlyWallet(candidate);
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
  const targetCurrency = targetWallet?.currency || null;

  const currencyMismatch =
    !!targetWallet && !!targetCurrency && targetCurrency !== sourceCurrency;

  // Tính tỷ giá và số tiền chuyển đổi
  const exchangeRate = useMemo(() => {
    if (!currencyMismatch || !targetCurrency) return 1;
    return getRate(sourceCurrency, targetCurrency);
  }, [currencyMismatch, sourceCurrency, targetCurrency]);

  const transferAmountNum = Number(transferAmount || 0);
  const convertedAmount = useMemo(() => {
    if (!currencyMismatch || !transferAmountNum) return 0;
    // Không làm tròn để giữ đúng giá như tỷ giá (giữ 6 chữ số thập phân)
    const converted = transferAmountNum * exchangeRate;
    return converted;
  }, [transferAmountNum, exchangeRate, currencyMismatch, targetCurrency]);

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>Chuyển tiền giữa các ví</h3>
        <span>
          Chuyển tiền từ ví hiện tại sang ví khác. Nếu khác loại tiền tệ, hệ
          thống sẽ tự động quy đổi theo tỷ giá.
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
              value={`${wallet.name || "Ví hiện tại"} (${sourceCurrency})`}
              disabled
            />
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginTop: "4px"
            }}>
              Số dư ví nguồn:{" "}
              <strong style={{ color: "#111827" }}>
                {formatMoney(sourceBalance, sourceCurrency)}
              </strong>
            </div>
          </label>
          <label>
            Ví đích
            <select
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
            >
              <option value="">-- Chọn ví đích --</option>
              {selectableTargets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || "Chưa đặt tên"}{" "}
                  {w.isShared ? "(Nhóm)" : "(Cá nhân)"} · {w.currency || "VND"}
                </option>
              ))}
            </select>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Chỉ những ví bạn có quyền thao tác mới hiển thị trong danh sách này.
            </div>
            {targetWallet && (
              <div style={{ 
                fontSize: "0.875rem", 
                color: "#6b7280",
                marginTop: "4px"
              }}>
                Số dư ví đích:{" "}
                <strong style={{ color: "#111827" }}>
                  {formatMoney(Number(targetWallet?.balance || 0), targetCurrency || "VND")}
                </strong>
              </div>
            )}
          </label>
        </div>
        <div className="wallet-form__row">
          <label>
            Số tiền chuyển (theo {sourceCurrency})
            <input
              type="text"
              value={formatMoneyInput(transferAmount)}
              onChange={(e) => {
                const parsed = getMoneyValue(e.target.value);
                setTransferAmount(parsed ? String(parsed) : "");
              }}
              placeholder={`Nhập số tiền bằng ${sourceCurrency}`}
              inputMode="numeric"
            />
            {currencyMismatch && transferAmountNum > 0 && (
              <>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tiền chuyển đổi:{" "}
                  <strong style={{ color: "#059669" }}>
                    {formatConvertedAmount(convertedAmount, targetCurrency)}
                  </strong>
                </div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginTop: "4px"
                }}>
                  Tỷ giá: 1 {sourceCurrency} = {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 8 })} {targetCurrency}
                </div>
              </>
            )}
          </label>
        </div>

        <div className="wallet-form__row">
          <label className="wallet-form__full">
            Ghi chú
            <textarea
              rows={2}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Ghi chú cho lần chuyển này..."
            />
          </label>
        </div>

        {/* Hiển thị lỗi nếu số tiền không hợp lệ */}
        {transferAmount && transferAmountNum > sourceBalance && (
          <div className="wallet-form__row">
            <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "-10px", marginBottom: "10px" }}>
              Số tiền không hợp lệ hoặc vượt quá số dư.
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
            Xác nhận chuyển
          </button>
        </div>
      </form>
    </div>
  );
}

