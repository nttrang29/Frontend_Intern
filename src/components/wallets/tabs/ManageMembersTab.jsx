import React, { useState } from "react";

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
}) {
  const [showQuickShareForm, setShowQuickShareForm] = useState(false);
  const [quickShareEmail, setQuickShareEmail] = useState("");
  const [quickShareMessage, setQuickShareMessage] = useState("");

  const toggleQuickShareForm = () => {
    setShowQuickShareForm((s) => !s);
    setQuickShareMessage("");
    if (!showQuickShareForm) setQuickShareEmail("");
  };

  const handleQuickShareSubmit = async (e) => {
    e?.preventDefault?.();
    if (!onQuickShareEmail) return;
    setQuickShareMessage("");
    const res = await onQuickShareEmail(quickShareEmail);
    if (res?.success) {
      setQuickShareEmail("");
      setShowQuickShareForm(false);
      setQuickShareMessage("");
    } else if (res?.message) {
      setQuickShareMessage(res.message);
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

  return (
    <div className="wallets-section wallets-section--manage">
      <div className="wallets-section__header">
        <h3>Quản lý người dùng</h3>
        <span>Kiểm soát danh sách người được chia sẻ ví "{wallet?.name}".</span>
      </div>

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
                    {wallet?.isShared && !isOwner && onUpdateMemberRole ? (
                      <select
                        className="wallet-role-select"
                        value={role || 'MEMBER'}
                        onChange={async (e) => {
                          const newRole = (e.target.value || '').toUpperCase();
                          if (!memberId) return;
                          await onUpdateMemberRole(member, newRole);
                        }}
                        disabled={isUpdating}
                        aria-label="Phân quyền thành viên"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="VIEW">Viewer</option>
                      </select>
                    ) : null}

                    <button
                      type="button"
                      className="wallets-btn wallets-btn--danger-outline"
                      onClick={() => onRemoveSharedMember?.(member)}
                      disabled={isOwner || removingMemberId === memberId}
                    >
                      {removingMemberId === memberId ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
