import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/GlobalSearch.css";
import { useLanguage } from "../../contexts/LanguageContext";

// Menu items reference; labels are resolved at runtime via translation keys
const MENU_ITEMS = [
  { id: "dashboard", labelKey: "sidebar.overview", path: "/home", icon: "bi-speedometer2" },
  { id: "wallets", labelKey: "sidebar.wallets", path: "/home/wallets", icon: "bi-wallet2" },
  { id: "budgets", labelKey: "sidebar.budgets", path: "/home/budgets", icon: "bi-graph-up-arrow" },
  { id: "transactions", labelKey: "sidebar.transactions", path: "/home/transactions", icon: "bi-cash-stack" },
  { id: "categories", labelKey: "sidebar.categories", path: "/home/categories", icon: "bi-tag" },
  { id: "reports", labelKey: "sidebar.reports", path: "/home/reports", icon: "bi-graph-up" },
  { id: "budgets-edit", labelKey: null, label: "Chỉnh sửa ngân sách", path: "/home/budgets", icon: "bi-pencil" },
  { id: "add-transaction", labelKey: null, label: "Thêm giao dịch", path: "/home/transactions", icon: "bi-plus-lg" },
  { id: "add-category", labelKey: null, label: "Thêm danh mục", path: "/home/categories", icon: "bi-plus-lg" },
  { id: "add-wallet", labelKey: null, label: "Thêm ví", path: "/home/wallets", icon: "bi-plus-lg" },
  { id: "settings", labelKey: "settings.title", path: "/home/settings", icon: "bi-gear" },
  { id: "profile", labelKey: "topbar.account", path: "/home/profile", icon: "bi-person-circle" },
];

export default function GlobalSearch() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchBoxRef = useRef(null);
  const resultsRef = useRef(null);
  const { t } = useLanguage();

  // Tìm kiếm khi gõ
  const handleSearch = (e) => {
    const text = e.target.value.toLowerCase();
    setSearchText(text);

    if (text.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Định nghĩa nhãn đã dịch để so khớp
    const localized = MENU_ITEMS.map((it) => ({
      ...it,
      label: it.labelKey ? t(it.labelKey) : it.label || it.id,
    }));

    // Lọc các mục khớp với text tìm kiếm
    const filtered = localized.filter(
      (item) =>
        item.label.toLowerCase().includes(text) ||
        item.id.toLowerCase().includes(text)
    );

    setResults(filtered);
    setIsOpen(true);
  };

  // Chọn một mục từ kết quả
  const handleSelectResult = (item) => {
    setSearchText("");
    setResults([]);
    setIsOpen(false);
    navigate(item.path);
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Xử lý phím Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && results.length > 0) {
      handleSelectResult(results[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchText("");
    }
  };

  return (
    <div className="global-search-container">
      <div
        className="global-search-box"
        ref={searchBoxRef}
      >
        <i className="bi bi-search global-search-icon" />
        <input
          type="text"
          className="global-search-input"
          placeholder={t("topbar.search_placeholder")}
          value={searchText}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => searchText.trim().length > 0 && setIsOpen(true)}
        />
      </div>

      {/* Dropdown kết quả */}
      {isOpen && results.length > 0 && (
        <div className="global-search-results" ref={resultsRef}>
          {results.map((item) => (
            <div
              key={item.id}
              className="global-search-result-item"
              onClick={() => handleSelectResult(item)}
            >
              <i className={`bi ${item.icon} global-search-result-icon`} />
              <span className="global-search-result-label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thông báo không tìm thấy */}
      {isOpen && searchText.trim().length > 0 && results.length === 0 && (
        <div className="global-search-empty">
          <p className="mb-0">{t("topbar.search_no_result").replace("{text}", searchText)}</p>
        </div>
      )}
    </div>
  );
}
