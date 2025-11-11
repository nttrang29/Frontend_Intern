import React, { useMemo, useState } from "react";
import "../../styles/home/TransactionsPage.css";
import TransactionViewModal from "../../components/transactions/TransactionViewModal";
import TransactionFormModal from "../../components/transactions/TransactionFormModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import SuccessToast from "../../components/common/Toast/SuccessToast";

// 🚩 TODO API sau này: thay MOCK_TRANSACTIONS + các thao tác setState
// bằng gọi API thật (GET/POST/PUT/DELETE).
const MOCK_TRANSACTIONS = [
  {
    id: 1,
    code: "TX-0001",
    type: "expense",
    walletName: "Tiền mặt",
    amount: 50000,
    currency: "VND",
    date: "2023-10-20",
    category: "Ăn uống",
    note: "Bữa trưa vui vẻ cùng đồng nghiệp",
    creatorCode: "USR001",
    attachment:
      "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 2,
    code: "TX-0002",
    type: "income",
    walletName: "Ngân hàng A",
    amount: 1500000,
    currency: "VND",
    date: "2023-10-19",
    category: "Lương thưởng",
    note: "Lương tuần",
    creatorCode: "USR001",
    attachment: "",
  },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [filterRange, setFilterRange] = useState("all"); // 🔹 khoảng thời gian

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  // ===== Sinh mã giao dịch mới dạng TX-000X =====
  const nextCode = () => {
    const max = transactions.reduce((m, t) => {
      const num = parseInt(String(t.code || "").replace(/\D/g, ""), 10);
      return isNaN(num) ? m : Math.max(m, num);
    }, 0);
    const n = max + 1;
    return 'TX-${String(n).padStart(4, "0")}';
  };

  // ===== Thêm giao dịch mới =====
  const handleCreate = (payload) => {
    const tx = {
      id: Date.now(),
      code: nextCode(),
      creatorCode: "USR001", // 🚩 sau này lấy từ user đăng nhập
      attachment: "", // 🚩 sau này cập nhật link ảnh thật
      ...payload,
    };
    setTransactions((list) => [tx, ...list]);
    setCreating(false);
    setToast({ open: true, message: "Đã thêm giao dịch mới." });
  };

  // ===== Cập nhật giao dịch =====
  const handleUpdate = (payload) => {
    if (!editing) return;
    setTransactions((list) =>
      list.map((t) => (t.id === editing.id ? { ...t, ...payload } : t))
    );
    setEditing(null);
    setToast({ open: true, message: "Đã cập nhật giao dịch." });
  };

  // ===== Xóa giao dịch =====
  const handleDelete = () => {
    if (!confirmDel) return;
    setTransactions((list) => list.filter((t) => t.id !== confirmDel.id));
    setConfirmDel(null);
    setToast({ open: true, message: "Đã xóa giao dịch." });
  };

  const allCategories = useMemo(() => {
    const s = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(s);
  }, [transactions]);

  const allWallets = useMemo(() => {
    const s = new Set(transactions.map((t) => t.walletName).filter(Boolean));
    return Array.from(s);
  }, [transactions]);

  // ===== Lọc theo khoảng thời gian =====
  const matchRange = (tx, range) => {
    if (range === "all") return true;
    const txDate = new Date(tx.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = (today - txDate) / (1000 * 60 * 60 * 24);

    switch (range) {
      case "today":
        return txDate.toDateString() === today.toDateString();
      case "7days":
        return diffDays >= 0 && diffDays < 7;
      case "month":
        return (
          txDate.getFullYear() === today.getFullYear() &&
          txDate.getMonth() === today.getMonth()
        );
      case "year":
        return txDate.getFullYear() === today.getFullYear();
      default:
        return true;
    }
  };

  // ===== Lọc + tìm kiếm =====
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterWallet !== "all" && t.walletName !== filterWallet) return false;
      if (!matchRange(t, filterRange)) return false;

      if (searchText) {
        const keyword = searchText.toLowerCase();
        const joined = [
          t.code,
          t.walletName,
          t.category,
          t.note,
          t.amount?.toString(),
        ]
          .join(" ")
          .toLowerCase();
        if (!joined.includes(keyword)) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterCategory, filterWallet, filterRange, searchText]);

  return (
    <div className="tx-page container py-4">
      {/* ===== Header bọc card trắng ===== */}
      <div className="tx-header card border-0 mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h2 className="tx-title mb-1">Quản lý Giao dịch</h2>
            <p className="text-muted mb-0">
              Xem, tìm kiếm và quản lý các khoản thu chi gần đây.
            </p>
          </div>
          <button
            className="btn btn-primary tx-add-btn d-flex align-items-center"
            onClick={() => setCreating(true)}
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm giao dịch mới
          </button>
        </div>
      </div>

      {/* ===== Thanh filter / search ===== */}
      <div className="tx-filters card border-0 mb-3">
        <div className="card-body d-flex flex-wrap gap-2">
          <div className="tx-filter-item flex-grow-1">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                className="form-control border-start-0"
                placeholder="Tìm kiếm giao dịch..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="tx-filter-item">
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Loại giao dịch</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
            </select>
          </div>

          <div className="tx-filter-item">
            <select
              className="form-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Danh mục</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="tx-filter-item">
            <select
              className="form-select"
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
            >
              <option value="all">Ví</option>
              {allWallets.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* 🔹 Bảng chọn Khoảng thời gian */}
          <div className="tx-filter-item">
            <select
              className="form-select"
              value={filterRange}
              onChange={(e) => setFilterRange(e.target.value)}
            >
              <option value="all">Khoảng thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày gần đây</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== Bảng danh sách giao dịch ===== */}
      <div className="card border-0 tx-table-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th>Ngày</th>
                <th>Loại</th>
                <th>Ví</th>
                <th>Mô tả</th>
                <th className="text-end">Số tiền</th>
                <th className="text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Không có giao dịch nào phù hợp.
                  </td>
                </tr>
              )}

              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.date).toLocaleDateString("vi-VN")}</td>
                  <td>{t.type === "income" ? "Thu nhập" : "Chi tiêu"}</td>
                  <td>{t.walletName}</td>
                  <td>{t.note || t.category}</td>
                  <td className="text-end">
                    <span
                      className={
                        t.type === "expense" ? "tx-amount-expense" : "tx-amount-income"
                      }
                    >
                      {t.type === "expense" ? "-" : "+"}
                      {t.amount.toLocaleString("vi-VN")} {t.currency}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-link btn-sm text-muted me-1"
                      title="Xem chi tiết"
                      onClick={() => setViewing(t)}
                    >
                      <i className="bi bi-eye" />
                    </button>
                    <button
                      className="btn btn-link btn-sm text-muted me-1"
                      title="Chỉnh sửa"
                      onClick={() => setEditing(t)}
                    >
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      className="btn btn-link btn-sm text-danger"
                      title="Xóa"
                      onClick={() => setConfirmDel(t)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal Xem ===== */}
      <TransactionViewModal
        open={!!viewing}
        tx={viewing}
        onClose={() => setViewing(null)}
      />

      {/* ===== Modal Thêm / Sửa ===== */}
      <TransactionFormModal
        open={creating}
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setCreating(false)}
      />

      <TransactionFormModal
        open={!!editing}
        mode="edit"
        initialData={editing}
        onSubmit={handleUpdate}
        onClose={() => setEditing(null)}
      />

      {/* ===== Xác nhận xóa ===== */}
      <ConfirmModal
        open={!!confirmDel}
        title="Xóa giao dịch"
        message={confirmDel ? 'Bạn chắc chắn muốn xóa giao dịch ${confirmDel.code}? ': ""}
        okText="Xóa"
        cancelText="Hủy"
        onOk={handleDelete}
        onClose={() => setConfirmDel(null)}
      />

      {/* ===== Toast ===== */}
      <SuccessToast
        open={toast.open}
        message={toast.message}
        duration={2200}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}