import React, { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function ConvertTab({
  wallet,
  allWallets = [],
  onConvertToGroup,
  onChangeSelectedWallet,
}) {
  const { t } = useLanguage();
  const isDefault = !!wallet.isDefault;
  const isShared = !!wallet.isShared;

  const personalWallets = (allWallets || []).filter((w) => !w.isShared);
  const candidateDefaults = personalWallets.filter((w) => w.id !== wallet.id);
  const hasCandidate = candidateDefaults.length > 0;

  const [defaultMode, setDefaultMode] = useState(
    hasCandidate ? "chooseOther" : "noDefault"
  );
  const [newDefaultId, setNewDefaultId] = useState(
    hasCandidate ? String(candidateDefaults[0].id) : ""
  );

  useEffect(() => {
    const newCandidates = (allWallets || []).filter(
      (w) => !w.isShared && w.id !== wallet.id
    );
    const hasCandidateNow = newCandidates.length > 0;

    setDefaultMode(hasCandidateNow ? "chooseOther" : "noDefault");
    setNewDefaultId(hasCandidateNow ? String(newCandidates[0].id) : "");
  }, [wallet.id, allWallets]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let options = null;

    if (isDefault && !isShared) {
      if (hasCandidate && defaultMode === "chooseOther" && newDefaultId) {
        options = {
          newDefaultWalletId: Number(newDefaultId),
          noDefault: false,
        };
      } else {
        options = {
          newDefaultWalletId: null,
          noDefault: true,
        };
      }
    }

    onConvertToGroup?.(e, options || null);

    if (onChangeSelectedWallet) {
      onChangeSelectedWallet(null);
    }
  };

  const isSubmitDisabled =
    wallet.isShared ||
    (isDefault &&
      !isShared &&
      defaultMode === "chooseOther" &&
      hasCandidate &&
      !newDefaultId);

  return (
    <div className="wallets-section">
      <div className="wallets-section__header">
        <h3>{t('wallets.convert.title')}</h3>
        <span>
          {t('wallets.convert.subtitle')}
        </span>
      </div>

      <form className="wallet-form" onSubmit={handleSubmit}>
        <div className="wallet-form__row">
          <label className="wallet-form__full">
            <span className="wallet-detail-item__label">{t('wallets.convert.summary_label')}</span>
            <div className="wallet-detail-item" style={{ marginTop: 4 }}>
              <div className="wallet-detail-item__value">
                <strong>{t('wallets.convert.name_label')}:</strong> {wallet.name}
              </div>
              <div className="wallet-detail-item__value">
                <strong>{t('wallets.convert.status_label')}:</strong>{" "}
                {wallet.isShared ? t('wallets.convert.status_group') : t('wallets.convert.status_personal')}
              </div>
              {isDefault && !wallet.isShared && (
                <div
                  className="wallet-detail-item__value"
                  style={{ marginTop: 4 }}
                >
                  <strong>{t('wallets.inspector.note')}:</strong> {t('wallets.convert.is_default_note')}
                </div>
              )}
            </div>
          </label>
        </div>

        {isDefault && !wallet.isShared && (
          <>
            <div className="wallet-merge__section-block wallet-merge__section-block--warning">
              <div className="wallet-merge__section-title">
                {t('wallets.convert.warning_title')}
              </div>
              <ul className="wallet-merge__list">
                <li>
                  <strong>{wallet.name}</strong> {t('wallets.convert.warning_message_1')}
                </li>
                <li>
                  {t('wallets.convert.warning_message_2')}
                </li>
              </ul>
            </div>

            <div className="wallet-merge__section-block">
              <div className="wallet-merge__section-title">
                {t('wallets.convert.default_handling_title')}
              </div>

              {hasCandidate ? (
                <div className="wallet-merge__options">
                  <label className="wallet-merge__option">
                    <input
                      type="radio"
                      name="defaultBehavior"
                      value="chooseOther"
                      checked={defaultMode === "chooseOther"}
                      onChange={() => setDefaultMode("chooseOther")}
                    />
                    <div>
                      <div className="wallet-merge__option-title">
                        {t('wallets.convert.option_choose_other_title')}
                      </div>
                      <div className="wallet-merge__option-desc">
                        {t('wallets.convert.option_choose_other_desc')}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <select
                          value={newDefaultId}
                          disabled={defaultMode !== "chooseOther"}
                          onChange={(e) => setNewDefaultId(e.target.value)}
                        >
                          {candidateDefaults.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name || t('wallets.convert.other_personal_wallet')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>

                  <label className="wallet-merge__option">
                    <input
                      type="radio"
                      name="defaultBehavior"
                      value="noDefault"
                      checked={defaultMode === "noDefault"}
                      onChange={() => setDefaultMode("noDefault")}
                    />
                    <div>
                      <div className="wallet-merge__option-title">
                        {t('wallets.convert.option_no_default_title')}
                      </div>
                      <div className="wallet-merge__option-desc">
                        {t('wallets.convert.option_no_default_desc')}
                      </div>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="wallet-merge__section-block">
                  <p className="wallet-merge__hint">
                    {t('wallets.convert.no_other_wallet_hint')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="wallet-form__footer wallet-form__footer--right">
          <button
            type="submit"
            className="wallets-btn wallets-btn--primary"
            disabled={isSubmitDisabled}
          >
            {wallet.isShared ? t('wallets.convert.already_group') : t('wallets.convert.convert_button')}
          </button>
        </div>
      </form>
    </div>
  );
}

