import React, { useMemo, useState } from "react";
import { useWalletData } from "../../home/store/WalletDataContext";

import WalletGroupCreateModal from "../../components/walletGroups/WalletGroupCreateModal";
import WalletGroupEditModal from "../../components/walletGroups/WalletGroupEditModal";
import WalletGroupViewModal from "../../components/walletGroups/WalletGroupViewModal";
import WalletGroupCard from "../../components/walletGroups/WalletGroupCard";
import ConfirmModal from "../../components/common/Modal/ConfirmModal";
import SuccessToast from "../../components/common/Toast/SuccessToast";

import "../../styles/home/WalletsPage.css";

export default function WalletGroupsPage() {
  const { groups, wallets, createGroup /*, updateGroup, deleteGroup*/ } = useWalletData();

  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  const existingNames = useMemo(
    () => groups.map((g) => g.name.toLowerCase().trim()),
    [groups]
  );

  const handleCreateGroup = async (form) => {
    const g = await createGroup({
      name: form.name, description: form.description, isDefault: !!form.isDefault
    });
    setShowCreate(false);
    setToast({ open: true, message: `Tạo nhóm ví "${g.name}" thành công` });
  };

  const handleView = (g) => setViewing(g);
  const handleEdit = (g) => setEditing(g);

  const handleSubmitEdit = async (data) => {
    // TODO: gọi updateGroup nếu đã thêm trong Context
    setEditing(null);
    setToast({ open: true, message: "Cập nhật nhóm ví thành công" });
  };

  const handleDelete = (g) => setConfirmDel(g);
  const doDelete = async () => {
    // TODO: gọi deleteGroup nếu đã thêm trong Context
    setConfirmDel(null);
    setToast({ open: true, message: "Đã xóa nhóm ví thành công" });
  };

  const walletNameById = (id) => wallets.find(w => w.id === id)?.name || `#${id}`;

  return (
    <div className="wallet-page container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-semibold text-dark">Nhóm ví</h3>
        <button className="btn btn-gradient d-flex align-items-center" onClick={() => setShowCreate(true)}>
          <i className="bi bi-plus-circle me-2" />
          Tạo nhóm ví
        </button>
      </div>

      <div className="row g-4">
        {groups.map((g) => (
          <WalletGroupCard
            key={g.id}
            group={{
              ...g,
              wallets: (g.walletIds || []).map(walletNameById), // Card cũ đang cần mảng tên
            }}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showCreate && (
        <WalletGroupCreateModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateGroup} // hoặc bỏ nếu modal tự gọi Context
        />
      )}

      {viewing && <WalletGroupViewModal group={viewing} onClose={() => setViewing(null)} />}

      {editing && (
        <WalletGroupEditModal
          group={editing}
          existingNames={existingNames}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmitEdit}
        />
      )}

      <ConfirmModal
        open={!!confirmDel}
        title="Xóa nhóm ví"
        message={confirmDel ? `Bạn có chắc muốn xóa nhóm "${confirmDel.name}" không?` : ""}
        okText="Xóa"
        cancelText="Hủy"
        onOk={doDelete}
        onClose={() => setConfirmDel(null)}
      />

      <SuccessToast
        open={toast.open}
        message={toast.message}
        duration={2400}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}
