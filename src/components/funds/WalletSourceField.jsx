// src/components/funds/WalletSourceField.jsx
import React, { useMemo, useState } from "react";
import "../../styles/components/funds/FundForms.css";

export default function WalletSourceField({
  required,
  wallets = [],
  value,
  onChange,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      wallets.filter((w) =>
        (w.name || "").toLowerCase().includes(search.toLowerCase())
      ),
    [wallets, search]
  );

  return (
    <div className="funds-field">
      <label>
        Ví nguồn {required && <span className="req">*</span>}
      </label>
      <div className="wallet-source">
        <input
          type="text"
          className="wallet-source__search"
          placeholder="Nhập để tìm ví..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="wallet-source__list">
          {filtered.length === 0 ? (
            <span className="funds-hint">Không tìm thấy ví phù hợp.</span>
          ) : (
            filtered.map((w) => {
              const selected = String(value) === String(w.id);
              const label = w.currency ? `${w.name} · ${w.currency}` : w.name;

              return (
                <button
                  key={w.id}
                  type="button"
                  className={
                    "wallet-source__item" + (selected ? " is-active" : "")
                  }
                  onClick={() => {
                    onChange && onChange(w.id);
                    setSearch(label);
                  }}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>

        <div className="funds-hint">
          Hiển thị các ví của bạn. Kéo ngang nếu danh sách dài.
        </div>
      </div>
    </div>
  );
}
