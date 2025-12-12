import React, { useState, useMemo } from "react";
import ConfirmModal from "../../common/Modal/ConfirmModal";
import { useAuth } from "../../../contexts/AuthContext";

export default function ManageMembersTab({
  wallet,
  sharedMembers = [],
  sharedMembersLoading = false,
  sharedMembersError = "",
  onRemoveSharedMember,
  removingMemberId,
  onQuickShareEmail,
  quickShareLoading = false,
  onUpdateMemberRole,
  updatingMemberId,
  effectiveIsOwner = true,
  onLeaveWallet,
}) {
  const [showQuickShareForm, setShowQuickShareForm] = useState(false);
  const [quickShareEmail, setQuickShareEmail] = useState("");
  const [quickShareMessage, setQuickShareMessage] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null,
    payload: null,
    title: "",
    message: "",
    danger: false,
  });
  const [leavingWallet, setLeavingWallet] = useState(false);
  const { currentUser } = useAuth();

  const toggleQuickShareForm = () => {
    setShowQuickShareForm((s) => !s);
    setQuickShareMessage("");
    if (!showQuickShareForm) setQuickShareEmail("");
  };

  const handleQuickShareSubmit = (e) => {
    e?.preventDefault?.();
    if (!onQuickShareEmail) return;
    const email = quickShareEmail.trim();
    if (!email) return;
    setQuickShareMessage("");
    setConfirmState({
      open: true,
      type: "add",
      payload: { email },
      title: "Xác nhận chia sẻ",
      message: `Bạn có chắc muốn chia sẻ ví "${wallet?.name || ""}" cho ${email}?`,
      danger: false,
    });
  };

  const triggerRemoveConfirm = (member) => {
    if (!member) return;
    setConfirmState({
      open: true,
      type: "remove",
      payload: { member },
      title: "Xóa người dùng",
      message: `Bạn có chắc muốn xóa quyền truy cập của ${member.fullName || member.email || "người dùng"}?`,
      danger: true,
    });
  };

  const triggerRoleConfirm = (member, newRole) => {
    if (!member || !newRole) return;
    const label = newRole === "VIEW" ? "Người xem" : "Thành viên";
    setConfirmState({
      open: true,
      type: "role",
      payload: { member, newRole },
      title: "Xác nhận phân quyền",
      message: `Bạn có chắc muốn đặt quyền của ${member.fullName || member.email || "người dùng"} thành "${label}"?`,
      danger: false,
    });
  };

  const triggerLeaveConfirm = () => {
    setConfirmState({
      open: true,
      type: "leave",
      payload: null,
      title: "Rời khỏi ví",
      message: `Bạn có chắc muốn rời khỏi ví "${wallet?.name || ""}"? Bạn sẽ không thể truy cập ví này nữa.`,
      danger: true,
    });
  };

  const resetConfirm = () => {
    setConfirmState({ open: false, type: null, payload: null, title: "", message: "", danger: false });
  };

  const handleConfirmOk = async () => {
    const { type, payload } = confirmState;
    if (!type) {
      resetConfirm();
      return;
    }

    try {
      if (type === "add" && onQuickShareEmail) {
        const res = await onQuickShareEmail(payload.email);
        if (res?.success) {
          setQuickShareEmail("");
          setShowQuickShareForm(false);
          setQuickShareMessage("");
        } else if (res?.message) {
          setQuickShareMessage(res.message);
        }
      }

      if (type === "remove" && onRemoveSharedMember) {
        await onRemoveSharedMember(payload.member);
      }

      if (type === "role" && onUpdateMemberRole) {
        await onUpdateMemberRole(payload.member, payload.newRole);
      }

      if (type === "leave" && onLeaveWallet) {
        setLeavingWallet(true);
        try {
          await onLeaveWallet();
        } finally {
          setLeavingWallet(false);
        }
      }
    } finally {
      resetConfirm();
    }
  };
  const ownerBadge = (role = "") => {
    const upper = role.toUpperCase();
    if (upper === "OWNER" || upper === "MASTER" || upper === "ADMIN") {
      return "Chủ ví";
    }
    if (upper === "USE" || upper === "USER") return "Được sử dụng";
    if (upper === "VIEW" || upper === "VIEWER") return "Chỉ xem";
    return role;
  };

  const safeMembers = Array.isArray(sharedMembers) ? sharedMembers : [];

  // Check if current user is a member (not owner)
  const isCurrentUserMember = useMemo(() => {
    if (!currentUser || effectiveIsOwner) return false;
    const currentUserId = currentUser.id || currentUser.userId;
    const currentUserEmail = (currentUser.email || "").toLowerCase().trim();
    
    return safeMembers.some((member) => {
      const memberId = member.userId ?? member.memberUserId ?? member.memberId;
      const memberEmail = ((member.email || member.userEmail || "")).toLowerCase().trim();
      const memberRole = (member.role || "").toUpperCase();
      const isOwner = ["OWNER", "MASTER", "ADMIN"].includes(memberRole);
      
      if (isOwner) return false;
      
      return (
        (currentUserId && memberId && String(currentUserId) === String(memberId)) ||
        (currentUserEmail && memberEmail && currentUserEmail === memberEmail)
      );
    });
  }, [currentUser, safeMembers, effectiveIsOwner]);

  return (
    <div className="wallets-section wallets-section--manage">
      <div className="wallets-section__header">
        <h3>Quản lý người dùng</h3>
        <span>Kiểm soát danh sách người được chia sẻ ví "{wallet?.name}".</span>
      </div>

      {/* Nút rời khỏi ví - chỉ hiển thị khi user không phải owner và là member */}
      {!effectiveIsOwner && isCurrentUserMember && onLeaveWallet && (
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="wallets-btn wallets-btn--danger"
            onClick={triggerLeaveConfirm}
            disabled={leavingWallet}
          >
            {leavingWallet ? "Đang rời khỏi..." : "Rời khỏi ví"}
          </button>
        </div>
      )}

      <div className="wallets-manage-list">
        <div style={{ marginBottom: 10 }}>
          {onQuickShareEmail && (
            <button
              type="button"
              className="wallets-btn wallets-btn--ghost"
              onClick={toggleQuickShareForm}
            >
              {showQuickShareForm ? "- Thêm" : "+ Thêm người chia sẻ"}
            </button>
          )}
          {showQuickShareForm && (
            <form
              className="wallet-share-quick-form"
              onSubmit={handleQuickShareSubmit}
              style={{ marginTop: 8 }}
            >
              <input
                type="email"
                value={quickShareEmail}
                onChange={(e) => setQuickShareEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
              <button type="submit" disabled={!quickShareEmail.trim() || quickShareLoading}>
                {quickShareLoading ? "Đang thêm..." : "Thêm"}
              </button>
            </form>
          )}
          {quickShareMessage && (
            <div className="wallets-manage__state wallets-manage__state--error" style={{ marginTop: 8 }}>
              {quickShareMessage}
            </div>
          )}
        </div>
        {sharedMembersLoading && (
          <div className="wallets-manage__state">Đang tải danh sách...</div>
        )}
        {!sharedMembersLoading && sharedMembersError && (
          <div className="wallets-manage__state wallets-manage__state--error">
            {sharedMembersError}
          </div>
        )}
        {!sharedMembersLoading && !sharedMembersError && safeMembers.length === 0 && (
          <div className="wallets-manage__state">
            Chưa có người dùng nào được chia sẻ.
          </div>
        )}

        {!sharedMembersLoading && !sharedMembersError && safeMembers.length > 0 && (
          <ul>
            {safeMembers.map((member) => {
              const memberId = member.userId ?? member.memberUserId ?? member.memberId;
              const role = (member.role || "").toUpperCase();
              const isOwner = ["OWNER", "MASTER", "ADMIN"].includes(role);
              const isUpdating = updatingMemberId && String(updatingMemberId) === String(memberId);
              const isRemoving = removingMemberId && String(removingMemberId) === String(memberId);
              const canChangeRole = !isOwner && onUpdateMemberRole;
              return (
                <li key={memberId || member.email || role}>
                  <div>
                    <div className="wallets-manage__name">{member.fullName || member.name || member.email}</div>
                    <div className="wallets-manage__meta">
                      {member.email && <span>{member.email}</span>}
                      {/* If wallet is personal: owner shows Chủ ví, others always show Chỉ xem */}
                      <span>{ownerBadge(wallet && !wallet.isShared ? (isOwner ? 'OWNER' : 'VIEW') : role)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Role selector for owner to change - only show for shared (group) wallets */}
                    {/* For personal wallets, only viewer role is available, so hide the role selector */}
                    {canChangeRole && wallet?.isShared ? (
                      <select
                        className="wallet-role-select"
                        value={role || 'MEMBER'}
                        onChange={async (e) => {
                          const newRole = (e.target.value || '').toUpperCase();
                          if (!memberId) return;
                          if (newRole === role) return;
                          e.target.value = role || 'MEMBER';
                          triggerRoleConfirm(member, newRole);
                        }}
                        disabled={isUpdating}
                        aria-label="Phân quyền thành viên"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="VIEW">Viewer</option>
                      </select>
                    ) : null}

                    {!isOwner && onRemoveSharedMember && (
                      <button
                        type="button"
                        className="wallets-btn wallets-btn--danger-outline"
                        onClick={() => triggerRemoveConfirm(member)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? "Đang xóa..." : "Xóa"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        danger={confirmState.danger}
        onOk={handleConfirmOk}
        onClose={resetConfirm}
        okText={
          confirmState.type === "add"
            ? "Chia sẻ"
            : confirmState.type === "leave"
            ? "Rời khỏi"
            : "Xác nhận"
        }
      />
    </div>
  );
}
