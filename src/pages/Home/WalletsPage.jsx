import React, { useMemo, useRef, useState, useEffect } from "react";
import WalletCard from "../../components/wallets/WalletCard";
import WalletViewModal from "../../components/wallets/WalletViewModal";
import WalletEditModal from "../../components/wallets/WalletEditModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import SuccessToast from "../../components/common/Toast/SuccessToast";
import WalletCreateChooser from "../../components/wallets/WalletCreateChooser";
import WalletCreatePersonalModal from "../../components/wallets/WalletCreatePersonalModal";
import WalletCreateGroupModal from "../../components/wallets/WalletCreateGroupModal";

import "../../styles/home/WalletsPage.css";

const CURRENCIES = ["VND", "USD", "EUR", "JPY", "GBP"];
const API_BASE = "http://localhost:8080/wallets"; // Thay bằng domain thật khi deploy

export default function WalletsPage() {
  // ===== State =====
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showChooser, setShowChooser] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const anchorRef = useRef(null);

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  const existingNames = useMemo(
    () => wallets.map((w) => w.name.toLowerCase().trim()),
    [wallets]
  );

  // ===== Sort state =====
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [sortScope, setSortScope] = useState("all");
  const toggleSortDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const compareByKey = (a, b, key) => {
    if (key === "name") return (a.name || "").localeCompare(b.name || "");
    if (key === "balance")
      return Number(a.balance || 0) - Number(b.balance || 0);
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  };
  const sortWith = (arr, key, dir) => {
    const out = [...arr].sort((a, b) => compareByKey(a, b, key));
    return dir === "asc" ? out : out.reverse();
  };
  const sortDefaultDesc = (arr) => sortWith(arr, "createdAt", "desc");

  // ===== Lists (apply scope) =====
  const personalWallets = useMemo(() => {
    const list = wallets.filter((w) => !w.isShared);
    if (sortScope === "all" || sortScope === "personal")
      return sortWith(list, sortKey, sortDir);
    return sortDefaultDesc(list);
  }, [wallets, sortKey, sortDir, sortScope]);

  const groupWallets = useMemo(() => {
    const list = wallets.filter((w) => w.isShared);
    if (sortScope === "all" || sortScope === "group")
      return sortWith(list, sortKey, sortDir);
    return sortDefaultDesc(list);
  }, [wallets, sortKey, sortDir, sortScope]);

  // ===== API Helpers =====
  const getToken = () => localStorage.getItem("accessToken");

  const api = {
    get: async (url) => {
      const res = await fetch(API_BASE + url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi mạng");
      return res.json();
    },
    post: async (url, body) => {
      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi tạo");
      return res.json();
    },
    patch: async (url, body) => {
      const res = await fetch(API_BASE + url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi cập nhật");
      return res.json();
    },
    del: async (url) => {
      const res = await fetch(API_BASE + url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi xóa");
      return res.json();
    },
  };

  // ===== Load ví =====
  useEffect(() => {
    const loadWallets = async () => {
      try {
        setLoading(true);
        const data = await api.get("");
        const formatted = data.map((w) => ({
          id: w.walletId,
          name: w.walletName,
          currency: w.currencyCode,
          balance: Number(w.balance),
          note: w.description || "",
          isShared: false,
          isDefault: false,
          createdAt: w.createdAt,
        }));
        setWallets(formatted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadWallets();
  }, []);

  // ===== CRUD =====
  const handleAddWalletClick = () => setShowChooser((v) => !v);

  const doDelete = async () => {
    try {
      await api.del(`/${confirmDel.id}`);
      setWallets((prev) => prev.filter((w) => w.id !== confirmDel.id));
      setConfirmDel(null);
      setToast({ open: true, message: "Đã xóa ví thành công" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePersonal = async (f) => {
    try {
      const payload = {
        walletName: f.name.trim(),
        currencyCode: f.currency,
        initialBalance: Number(f.openingBalance || 0),
        description: f.note?.trim() || "",
      };
      const res = await api.post("/create", payload);
      const newWallet = {
        id: res.wallet.walletId,
        name: res.wallet.walletName,
        currency: res.wallet.currencyCode,
        balance: Number(res.wallet.balance),
        note: res.wallet.description || "",
        isShared: false,
        isDefault: false,
        createdAt: res.wallet.createdAt,
      };
      setWallets((prev) => [...prev, newWallet]);
      setShowPersonal(false);
      setToast({
        open: true,
        message: `Đã tạo ví cá nhân "${newWallet.name}"`,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitEdit = async (data) => {
    try {
      const updates = {};
      if (data.name) updates.walletName = data.name;
      if (data.currency) updates.currencyCode = data.currency;
      if (data.note !== undefined) updates.description = data.note;

      const res = await api.patch(`/${data.id}`, updates);
      const updated = {
        ...data,
        name: res.wallet.walletName,
        currency: res.wallet.currencyCode,
        balance: Number(res.wallet.balance),
        note: res.wallet.description || "",
      };
      setWallets((prev) => prev.map((w) => (w.id === data.id ? updated : w)));
      setEditing(null);
      setToast({ open: true, message: "Cập nhật ví thành công" });
    } catch (err) {
      alert(err.message);
    }
  };

  // ===== UI =====
  if (loading) return <div className="text-center py-5">Đang tải ví...</div>;
  if (error) return <div className="alert alert-danger">Lỗi: {error}</div>;

  return (
    <div className="wallet-page container py-4">
      {/* ===== Header tổng ===== */}
      <div className="wallet-header card border-0 shadow-sm p-3 p-lg-4 mb-4">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <h3 className="wallet-header__title mb-0">Danh sách ví</h3>

          <div className="wallet-header__controls d-flex align-items-center gap-3 flex-wrap">
            {/* Phạm vi */}
            <div className="d-flex align-items-center gap-2">
              <label className="sort-label text-light">Phạm vi:</label>
              <select
                className="form-select form-select-sm sort-select"
                value={sortScope}
                onChange={(e) => setSortScope(e.target.value)}
              >
                <option value="all">Tất cả ví</option>
                <option value="personal">Chỉ ví cá nhân</option>
                <option value="group">Chỉ ví nhóm</option>
              </select>
            </div>

            {/* Sắp xếp */}
            <div className="sort-box d-flex align-items-center gap-2">
              <label className="sort-label text-light">Sắp xếp theo:</label>
              <select
                className="form-select form-select-sm sort-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="createdAt">Ngày tạo</option>
                <option value="balance">Số tiền</option>
                <option value="name">Tên ví</option>
              </select>
              <button
                className="btn btn-sm btn-outline-light sort-dir-btn"
                onClick={toggleSortDir}
              >
                {sortDir === "asc" ? "Tăng" : "Giảm"}
              </button>
            </div>

            {/* Tạo ví mới */}
            <div className="position-relative">
              <button
                ref={anchorRef}
                className="btn btn-gradient d-flex align-items-center"
                onClick={handleAddWalletClick}
              >
                Tạo ví mới
              </button>
              <WalletCreateChooser
                open={showChooser}
                anchorRef={anchorRef}
                onClose={() => setShowChooser(false)}
                onChoosePersonal={() => {
                  setShowChooser(false);
                  setShowPersonal(true);
                }}
                onChooseGroup={() => {
                  setShowChooser(false);
                  setShowGroup(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Hai cột ===== */}
      <div className="row g-4">
        {/* Ví cá nhân */}
        <div className="col-12 col-lg-6">
          <section className="wallet-section card border-0 shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Ví cá nhân</h5>
              <span className="badge bg-light text-dark">
                {personalWallets.length} ví
              </span>
            </div>
            <div className="card-body">
              {personalWallets.length === 0 ? (
                <div className="alert alert-light border rounded-3 mb-0">
                  Chưa có ví cá nhân nào. Nhấn <strong>Tạo ví mới</strong> để
                  thêm.
                </div>
              ) : (
                <div className="wallet-grid">
                  {personalWallets.map((w) => (
                    <div className="wallet-grid__item" key={w.id}>
                      <WalletCard
                        wallet={w}
                        onView={setViewing}
                        onEdit={setEditing}
                        onDelete={setConfirmDel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Ví nhóm */}
        <div className="col-12 col-lg-6">
          <section className="wallet-section card border-0 shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Ví nhóm</h5>
              <span className="badge bg-light text-dark">
                {groupWallets.length} ví
              </span>
            </div>
            <div className="card-body">
              {groupWallets.length === 0 ? (
                <div className="alert alert-light border rounded-3 mb-0">
                  Chưa có ví nhóm nào.
                </div>
              ) : (
                <div className="wallet-grid">
                  {groupWallets.map((w) => (
                    <div className="wallet-grid__item" key={w.id}>
                      <WalletCard
                        wallet={w}
                        onView={setViewing}
                        onEdit={setEditing}
                        onDelete={setConfirmDel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ===== Modals ===== */}
      <WalletCreatePersonalModal
        open={showPersonal}
        onClose={() => setShowPersonal(false)}
        currencies={CURRENCIES}
        existingNames={existingNames}
        onSubmit={handleCreatePersonal}
      />
      <WalletCreateGroupModal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        currencies={CURRENCIES}
        onCreated={() =>
          setToast({ open: true, message: "Tạo ví nhóm thành công" })
        }
      />

      {viewing && (
        <WalletViewModal wallet={viewing} onClose={() => setViewing(null)} />
      )}

      {editing && (
        <WalletEditModal
          wallet={editing}
          currencies={CURRENCIES}
          existingNames={existingNames}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmitEdit}
        />
      )}

      <ConfirmModal
        open={!!confirmDel}
        title="Xóa ví"
        message={`Xóa ví "${confirmDel?.name}"?`}
        okText="Xóa"
        cancelText="Hủy"
        onOk={doDelete}
        onClose={() => setConfirmDel(null)}
      />

      <SuccessToast
        open={toast.open}
        message={toast.message}
        duration={2200}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}
