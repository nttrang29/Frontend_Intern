import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/GlobalSearch.css";

const MENU_ITEMS = [
  { id: "dashboard", label: "Tổng quan", path: "/home", icon: "bi-speedometer2" },
  { id: "wallets", label: "Ví", path: "/home/wallets", icon: "bi-wallet2" },
  { id: "budgets", label: "Ngân sách", path: "/home/budgets", icon: "bi-graph-up-arrow" },
  { id: "transactions", label: "Giao dịch", path: "/home/transactions", icon: "bi-cash-stack" },
  { id: "categories", label: "Danh mục", path: "/home/categories", icon: "bi-tag" },
  { id: "reports", label: "Báo cáo", path: "/home/reports", icon: "bi-graph-up" },
  { id: "budgets-edit", label: "Chỉnh sửa ngân sách", path: "/home/budgets", icon: "bi-pencil" },
  { id: "add-transaction", label: "Thêm giao dịch", path: "/home/transactions", icon: "bi-plus-lg" },
  { id: "add-category", label: "Thêm danh mục", path: "/home/categories", icon: "bi-plus-lg" },
  { id: "add-wallet", label: "Thêm ví", path: "/home/wallets", icon: "bi-plus-lg" },
  { id: "settings", label: "Cài đặt", path: "/home/settings", icon: "bi-gear" },
  { id: "profile", label: "Hồ sơ", path: "/home/profile", icon: "bi-person-circle" },
];

export default function GlobalSearch() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchBoxRef = useRef(null);
  const resultsRef = useRef(null);

  // Tìm kiếm khi gõ
  const handleSearch = (e) => {
    const text = e.target.value.toLowerCase();
    setSearchText(text);

    if (text.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Lọc các mục khớp với text tìm kiếm
    const filtered = MENU_ITEMS.filter(
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
          placeholder="Tìm kiếm chức năng..."
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
          <p className="mb-0">Không tìm thấy chức năng "{searchText}"</p>
        </div>
      )}
    </div>
  );
}
