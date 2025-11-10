import React, { useMemo, useRef, useState } from "react";
import { useWalletData } from "../../home/store/WalletDataContext";

import WalletCard from "../../components/wallets/WalletCard";
import WalletViewModal from "../../components/wallets/WalletViewModal";
import WalletEditModal from "../../components/wallets/WalletEditModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import SuccessToast from "../../components/common/Toast/SuccessToast";
import WalletCreateChooser from "../../components/wallets/WalletCreateChooser";
import WalletCreatePersonalModal from "../../components/wallets/WalletCreatePersonalModal";
import WalletCreateGroupModal from "../../components/wallets/WalletCreateGroupModal";

import "../../styles/home/WalletsPage.css";

const API_URL = "http://localhost:8080/wallets";

const CURRENCIES = ["VND", "USD", "EUR", "JPY", "GBP"];

export default function WalletsPage() {
  const { wallets, createWallet, updateWallet, deleteWallet } = useWalletData();

  // ===== UI state =====
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
    if (key === "balance") return Number(a.balance || 0) - Number(b.balance || 0);
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

  // ===== CRUD =====
  const handleAddWalletClick = () => setShowChooser((v) => !v);

  const doDelete = async () => {
    await deleteWallet(confirmDel.id);
    setConfirmDel(null);
    setToast({ open: true, message: "Đã xóa ví thành công" });
  };

  const handleCreatePersonal = async (f) => {
    const w = await createWallet({
      name: f.name.trim(),
      currency: f.currency,
      type: f.type || "CASH",
      balance: Number(f.openingBalance || 0),
      note: f.note?.trim() || "",
      isDefault: !!f.isDefault,
      isShared: false,
      groupId: null,
    });
    setShowPersonal(false);
    setToast({ open: true, message: `Đã tạo ví cá nhân "${w.name}"` });
  };

  const afterCreateGroupWallet = (w) => {
    setToast({ open: true, message: `Đã tạo ví nhóm "${w?.name || ""}"` });
  };

  const handleSubmitEdit = async (data) => {
    await updateWallet(data);
    setEditing(null);
    setToast({ open: true, message: "Cập nhật ví thành công" });
  };

  return (
    <div className="wallet-page container py-4">
      {/* ===== Header tổng ===== */}
      <div className="wallet-header card border-0 shadow-sm p-3 p-lg-4 mb-4">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <h3 className="wallet-header__title mb-0">
            <i className="bi bi-wallet2 me-2"></i> Danh sách ví
          </h3>

          <div className="wallet-header__controls d-flex align-items-center gap-3 flex-wrap">
            {/* Phạm vi */}
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-layers-half text-light opacity-75"></i>
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
              <i className="bi bi-sort-alpha-down text-light opacity-75"></i>
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
                {sortDir === "asc" ? (
                  <>
                    <i className="bi bi-sort-down-alt me-1" /> Tăng
                  </>
                ) : (
                  <>
                    <i className="bi bi-sort-up me-1" /> Giảm
                  </>
                )}
              </button>
            </div>

            {/* Tạo ví mới */}
            <div className="position-relative">
              <button
                ref={anchorRef}
                className="btn btn-gradient d-flex align-items-center"
                onClick={handleAddWalletClick}
              >
                <i className="bi bi-plus-lg me-2"></i> Tạo ví mới
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

      {/* ===== Hai cột: ví cá nhân & ví nhóm ===== */}
      <div className="row g-4">
        {/* Ví cá nhân */}
        <div className="col-12 col-lg-6">
          <section className="wallet-section card border-0 shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="bi bi-person-fill me-2"></i>Ví cá nhân</h5>
              <span className="badge bg-light text-dark">{personalWallets.length} ví</span>
            </div>
            <div className="card-body">
              {personalWallets.length === 0 ? (
                <div className="alert alert-light border rounded-3 mb-0">
                  Chưa có ví cá nhân nào. Nhấn <strong>Tạo ví mới</strong> để thêm.
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
              <h5 className="mb-0"><i className="bi bi-people-fill me-2"></i>Ví nhóm</h5>
              <span className="badge bg-light text-dark">{groupWallets.length} ví</span>
            </div>
            <div className="card-body">
              {groupWallets.length === 0 ? (
                <div className="alert alert-light border rounded-3 mb-0">
                  Chưa có ví nhóm nào. Chọn <strong>Tạo ví nhóm</strong> trong menu “Tạo ví mới”.
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
        onCreated={afterCreateGroupWallet}
      />

      {viewing && <WalletViewModal wallet={viewing} onClose={() => setViewing(null)} />}

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
        message={confirmDel ? `Xóa ví "${confirmDel.name}"?` : ""}
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
