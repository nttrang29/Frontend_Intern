import React, { useMemo, useRef, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import useOnClickOutside from "../../hooks/useOnClickOutside";

export default function SearchableSelectInput({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  emptyMessage,
  error,
  displayText, // Text để hiển thị khi value là empty nhưng muốn hiển thị text
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const selectRef = useRef(null);

  useOnClickOutside(selectRef, () => {
    setIsOpen(false);
    setSearchText("");
  });

  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options
      .map((opt) => {
        if (!opt) return null;
        if (typeof opt === "string") {
          return { value: opt, label: opt };
        }
        if (typeof opt === "object") {
          // Ưu tiên dùng opt.value nếu có (đã được set đúng từ walletOptions)
          const normalizedValue = opt.value ?? opt.name ?? opt.label ?? "";
          if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
            return null;
          }
          // Đảm bảo value là string để so sánh nhất quán
          const stringValue = String(normalizedValue);
          // Giữ lại tất cả properties từ opt, nhưng đảm bảo value và label được set đúng
          // Đặt value và label sau spread để đảm bảo chúng không bị ghi đè
          return {
            ...opt, // Giữ lại tất cả properties khác từ opt (bao gồm raw, icon, description, etc.)
            value: stringValue, // Đảm bảo value là string (override sau spread để đảm bảo không bị ghi đè)
            label: opt.label || opt.name || stringValue, // Giữ label gốc nếu có (có thể đã format với email)
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return normalizedOptions;
    const keyword = searchText.toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(keyword));
  }, [normalizedOptions, searchText]);

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === "") return null;
    // So sánh value (đã được normalize thành string trong normalizedOptions)
    const normalizedValue = String(value);
    return normalizedOptions.find((opt) => {
      // opt.value đã là string từ normalizedOptions
      return String(opt.value || "") === normalizedValue;
    }) || null;
  }, [normalizedOptions, value]);

  const placeholderText = placeholder || t("transactions.form.select_option");
  const showDropdown = isOpen && !disabled;
  // Nếu đang mở dropdown, hiển thị searchText
  // Nếu có selectedOption, hiển thị label của option (ưu tiên cao nhất)
  // Nếu value là empty nhưng có displayText, hiển thị displayText
  // Nếu không, hiển thị value hoặc empty
  const displayValue = showDropdown 
    ? searchText 
    : (selectedOption?.label || (displayText && (!value || value === "") ? displayText : (value || "")));

  return (
    <div className="mb-3">
      {label && <label className="form-label fw-semibold">{label}</label>}
      <div
        className={`searchable-select wallet-select ${showDropdown ? "is-open" : ""}`}
        ref={selectRef}
        style={{ position: "relative" }}
      >
        <div className="input-group" style={{ position: "relative" }}>
          {selectedOption?.icon && !showDropdown && (
            <span
              className="input-group-text bg-white border-end-0"
              style={{ borderRight: "none", background: selectedOption.iconBg || "transparent" }}
            >
              <i
                className={`bi ${selectedOption.icon}`}
                style={{ color: selectedOption.iconColor || "#0f172a", fontSize: "1.05rem" }}
              />
            </span>
          )}
          <input
            type="text"
            className={`form-control ${error ? "is-invalid" : ""}`}
            placeholder={showDropdown ? placeholderText : displayValue || placeholderText}
            value={showDropdown ? searchText : displayValue}
            onFocus={() => {
              if (disabled) return;
              setIsOpen(true);
              setSearchText("");
            }}
            onChange={(e) => {
              if (disabled) return;
              setSearchText(e.target.value);
              setIsOpen(true);
            }}
            disabled={disabled}
            style={{
              paddingRight: searchText ? "34px" : "12px",
              borderLeft: selectedOption?.icon && !showDropdown ? "none" : undefined,
              paddingLeft: selectedOption?.icon && !showDropdown ? "8px" : undefined,
            }}
          />
          {searchText && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchText("");
              }}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#6c757d",
                fontSize: "0.8rem",
                zIndex: 10,
              }}
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            className="searchable-select-menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
              maxHeight: "220px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-muted small">
                {emptyMessage || t("wallets.search_none") || t("common.no_data") || "Không tìm thấy dữ liệu"}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`searchable-option ${String(value) === String(opt.value) ? "active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (onChange && typeof onChange === 'function') {
                      try {
                        onChange(opt.value);
                      } catch (error) {
                        console.error(error);
                      }
                    }
                    setSearchText("");
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: String(value) === String(opt.value) ? "#eff6ff" : "transparent",
                    color: String(value) === String(opt.value) ? "#1e40af" : "#111827",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "background-color 0.2s, color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {opt.icon && (
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          background: opt.iconBg || "rgba(15,23,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <i className={`bi ${opt.icon}`} style={{ color: opt.iconColor || "#0f172a", fontSize: "1rem" }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "inherit" }}>{opt.label}</div>
                      {opt.description && (
                        <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{opt.description}</div>
                      )}
                    </div>
                    {String(value) === opt.value && (
                      <i className="bi bi-check-circle-fill" style={{ color: "rgb(11, 90, 165)", fontSize: "1rem" }} />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <div className="invalid-feedback d-block mt-1">{error}</div>}
    </div>
  );
}
