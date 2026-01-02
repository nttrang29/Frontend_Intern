// src/pages/Admin/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/admin/AdminUsersPage.css";
import { ROLES, useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/common/Toast/ToastContext";
import {
  getAdminUsers,
  getUserLoginLogs,
  changeUserRole,
  lockUser,
  unlockUser,
  deleteUser as deleteUserApi,
} from "../../services/adminUserApi";
import { useLanguage } from "../../contexts/LanguageContext";

// format thời gian dạng "YYYY-MM-DD HH:mm"
function formatNow() {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

// helper: format ISO từ BE -> "YYYY-MM-DD HH:mm"
function formatFromIso(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
  } catch {
    return isoString;
  }
}

export default function AdminUsersPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [logs, setLogs] = useState([]); // nhật ký đăng nhập
  const [editHistory, setEditHistory] = useState({}); // lịch sử chỉnh sửa tài khoản

  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // panel bên phải: "info" | "logs" | "manage" | "history"
  const [activePanel, setActivePanel] = useState("info");

  // helper thêm lịch sử chỉnh sửa (chỉ lưu trong phiên FE hiện tại)
  const addHistoryEntry = (userId, action, detail) => {
    setEditHistory((prev) => {
      const list = prev[userId] || [];
      const newEntry = {
        id: Date.now() + Math.random(),
        time: formatNow(),
        action,
        detail,
      };
      return {
        ...prev,
        [userId]: [...list, newEntry],
      };
    });
  };


  // =============== API calls ===============

  // 1) Lấy danh sách user từ BE
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await getAdminUsers(); // GET /admin/users
      const mapped = res.data
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role, // "USER" | "ADMIN"
          status: u.locked ? "LOCKED" : "ACTIVE",
          createdAt: formatFromIso(u.createdAt),
          lastLogin: null, // tạm, sau này BE có trường lastLogin thì map thêm
        }))
        // Ẩn admin hệ thống (email: admin@financeapp.com)
        .filter((u) => u.email.toLowerCase() !== "admin@financeapp.com");
      setUsers(mapped);
    } catch (e) {
      console.error(e);
      showToast(t("admin.users.error.load_failed"), "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // 2) Lấy login logs theo user
  const fetchUserLogs = async (userId) => {
    setLoadingLogs(true);
    try {
      const res = await getUserLoginLogs(userId); // GET /admin/users/{id}/login-logs
      const mapped = res.data.map((log) => ({
        id: log.id,
        time: formatFromIso(log.loginTime),
        action: "LOGIN",
        detail: `IP: ${log.ipAddress} • ${log.userAgent}`,
      }));
      setLogs(mapped);
    } catch (e) {
      console.error(e);
      showToast(t("admin.users.error.logs_load_failed"), "error");
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // 3) Đổi role USER <-> ADMIN
  const updateUserRole = async (userId, newRole) => {
    // Không cho phép thay đổi role của chính mình
    if (userId === currentUser?.id) {
      showToast(t("admin.users.error.cannot_change_own_role"), "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    
    // Chỉ admin hệ thống mới có thể thay đổi role của admin khác
    if (!isSystemAdmin && target?.role === ROLES.ADMIN) {
      showToast(t("admin.users.error.only_system_admin_change_role"), "error");
      return;
    }

    const oldRole = target?.role;

    try {
      await changeUserRole(userId, newRole); // POST /admin/users/{id}/role

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      if (target) {
        addHistoryEntry(
          userId,
          t("admin.users.history.role_change"),
          t("admin.users.history.role_change_detail").replace("{old}", oldRole).replace("{new}", newRole)
        );
        showToast(
          t("admin.users.toast.role_updated").replace("{name}", target.fullName).replace("{role}", newRole)
        );
      } else {
        showToast(t("admin.users.toast.role_updated_generic"));
      }
    } catch (e) {
      console.error(e);
      showToast(t("admin.users.error.role_update_failed"), "error");
    }
  };

  // 4) Khóa / mở khóa user
  const toggleUserStatus = async (userId) => {
    // Không cho phép khóa/mở khóa chính mình
    if (userId === currentUser?.id) {
      showToast(t("admin.users.error.cannot_toggle_self"), "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Chỉ admin hệ thống mới có thể khóa/mở khóa admin khác
    if (!isSystemAdmin && target.role === ROLES.ADMIN) {
      showToast(t("admin.users.error.only_system_admin_toggle"), "error");
      return;
    }

    const oldStatus = target.status;
    const isActive = oldStatus === "ACTIVE";

    try {
      if (isActive) {
        await lockUser(userId); // POST /admin/users/{id}/lock
      } else {
        await unlockUser(userId); // POST /admin/users/{id}/unlock
      }

      const newStatus = isActive ? "LOCKED" : "ACTIVE";

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: newStatus } : u
        )
      );

      addHistoryEntry(
        userId,
        "Cập nhật trạng thái",
        t("admin.users.history.status_change_detail").replace("{old}", oldStatus).replace("{new}", newStatus)
      );
      showToast(
        isActive
          ? t("admin.users.toast.status_locked").replace("{name}", target.fullName)
          : t("admin.users.toast.status_unlocked").replace("{name}", target.fullName)
      );
    } catch (e) {
      console.error(e);
      showToast(t("admin.users.error.status_update_failed"), "error");
    }
  };

  // 5) Xoá user
  const deleteUser = async (userId) => {
    // Không cho phép xóa chính mình
    if (userId === currentUser?.id) {
      showToast(t("admin.users.error.cannot_delete_self"), "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Chỉ admin hệ thống mới có thể xóa admin khác
    if (!isSystemAdmin && target.role === ROLES.ADMIN) {
      showToast(t("admin.users.error.only_system_admin_delete"), "error");
      return;
    }

    try {
      await deleteUserApi(userId); // DELETE /admin/users/{id}

      if (target) {
        addHistoryEntry(
          userId,
          t("admin.users.history.delete"),
          t("admin.users.history.delete_detail").replace("{name}", target.fullName)
        );
      }

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setLogs([]);
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(t("admin.users.toast.deleted").replace("{name}", target?.fullName || ""));
    } catch (e) {
      console.error(e);
      showToast(t("admin.users.error.delete_failed"), "error");
    }
  };

  // =============== Effects ===============
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId != null) {
      fetchUserLogs(selectedUserId);
    } else {
      setLogs([]);
    }
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== "ALL" && u.role !== filterRole) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, filterRole, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  // Kiểm tra xem user đang chọn có phải là chính mình không
  const isCurrentUser = useMemo(
    () => selectedUser && currentUser && selectedUser.id === currentUser.id,
    [selectedUser, currentUser]
  );

  // Kiểm tra xem currentUser có phải là admin hệ thống không
  const isSystemAdmin = useMemo(
    () => currentUser?.email?.toLowerCase() === "admin@financeapp.com",
    [currentUser]
  );

  // Kiểm tra xem có thể quản lý user này không
  // - Không thể quản lý chính mình
  // - Nếu không phải admin hệ thống, không thể quản lý admin khác
  const canManageUser = useMemo(
    () => {
      if (!selectedUser) return false;
      if (isCurrentUser) return false; // Không thể quản lý chính mình
      if (!isSystemAdmin && selectedUser.role === ROLES.ADMIN) {
        return false; // Không phải admin hệ thống thì không thể quản lý admin khác
      }
      return true;
    },
    [selectedUser, isCurrentUser, isSystemAdmin]
  );

  const accountHistory = useMemo(
    () => (selectedUserId ? editHistory[selectedUserId] || [] : []),
    [editHistory, selectedUserId]
  );

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    setActivePanel("info");
  };

  const getStatusLabel = (status) => {
    if (status === "ACTIVE") return t("admin.users.status.active");
    if (status === "LOCKED") return t("admin.users.status.locked");
    return t("admin.users.status.unknown");
  };

  // =============== Render ===============
  return (
    <div className="admin-users-page">
      <div className="admin-users__header">
        <div>
          <h1 className="admin-users__title">{t("admin.users.title")}</h1>
          <p className="admin-users__subtitle">
            {t("admin.users.subtitle").replace("{name}", currentUser?.fullName || "Admin")}
          </p>
        </div>
      </div>

      <div className="admin-users__layout">
        {/* Cột trái: danh sách user */}
        <div className="admin-users__left">
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>{t("admin.users.list_title")}</h2>
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder={t("admin.users.search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="ALL">{t("admin.users.filter_role_all")}</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                  <option value={ROLES.USER}>User</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div className="admin-empty">
                {t("admin.users.loading")}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-empty">{t("admin.users.empty")}</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin.users.table.name")}</th>
                      <th>{t("admin.users.table.email")}</th>
                      <th>{t("admin.users.table.role")}</th>
                      <th>{t("admin.users.table.status")}</th>
                      <th>{t("admin.users.table.created_at")}</th>
                      <th>{t("admin.users.table.last_login")}</th>
                      <th>{t("admin.users.table.action")}</th>
                    </tr>
                  </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className={
                            u.id === selectedUserId ? "admin-row--active" : ""
                          }
                          onClick={() => handleSelectUser(u.id)}
                        >
                          <td>{u.fullName}</td>
                          <td>{u.email}</td>
                          <td>
                            <select
                              value={u.role}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateUserRole(u.id, e.target.value);
                              }}
                              disabled={
                                u.id === currentUser?.id ||
                                (!isSystemAdmin && u.role === ROLES.ADMIN)
                              }
                              title={
                                u.id === currentUser?.id
                                  ? "Không thể thay đổi vai trò của chính mình"
                                  : !isSystemAdmin && u.role === ROLES.ADMIN
                                  ? "Chỉ admin hệ thống mới có thể thay đổi vai trò của admin khác"
                                  : ""
                              }
                            >
                              <option value={ROLES.ADMIN}>Admin</option>
                              <option value={ROLES.USER}>User</option>
                            </select>
                          </td>
                          <td>
                            <span
                              className={
                                u.status === "ACTIVE"
                                  ? "badge badge--active"
                                  : "badge badge--locked"
                              }
                            >
                              {getStatusLabel(u.status)}
                            </span>
                          </td>
                          <td>{u.createdAt || t("admin.users.info.no_data")}</td>
                          <td>{u.lastLogin || t("admin.users.info.no_data")}</td>
                          <td className="admin-actions-cell">
                            <button
                              className="btn-chip btn-chip--ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserStatus(u.id);
                              }}
                              disabled={
                                u.id === currentUser?.id ||
                                (!isSystemAdmin && u.role === ROLES.ADMIN)
                              }
                              title={
                                u.id === currentUser?.id
                                  ? "Không thể khóa/mở khóa chính mình"
                                  : !isSystemAdmin && u.role === ROLES.ADMIN
                                  ? "Chỉ admin hệ thống mới có thể khóa/mở khóa admin khác"
                                  : ""
                              }
                            >
                              {u.status === "ACTIVE" ? t("admin.users.btn.lock") : t("admin.users.btn.unlock")}
                            </button>
                            <button
                              className="btn-chip btn-chip--danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUser(u.id);
                              }}
                              disabled={
                                u.id === currentUser?.id ||
                                (!isSystemAdmin && u.role === ROLES.ADMIN)
                              }
                              title={
                                u.id === currentUser?.id
                                  ? "Không thể xóa chính mình"
                                  : !isSystemAdmin && u.role === ROLES.ADMIN
                                  ? "Chỉ admin hệ thống mới có thể xóa admin khác"
                                  : ""
                              }
                            >
                              {t("admin.users.btn.delete")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>

        {/* Cột phải: chi tiết + các panel chức năng ẩn/hiện */}
        <div className="admin-users__right">
          {!selectedUser ? (
            <div className="admin-empty admin-empty--border">
              {t("admin.users.select_hint")}
            </div>
          ) : (
            <>
              {/* Tabs chức năng */}
              <div className="admin-panel-tabs">
                <button
                  className={
                    activePanel === "info"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("info")}
                >
                  {t("admin.users.tab.info")}
                </button>
                <button
                  className={
                    activePanel === "logs"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("logs")}
                >
                  {t("admin.users.tab.logs")}
                </button>
                <button
                  className={
                    activePanel === "history"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("history")}
                >
                  {t("admin.users.tab.history")}
                </button>
                <button
                  className={
                    activePanel === "manage"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("manage")}
                >
                  {t("admin.users.tab.manage")}
                </button>
              </div>

              {/* Panel: Thông tin */}
              {activePanel === "info" && (
                <div className="admin-card admin-panel">
                  <h2>{t("admin.users.info.title")}</h2>
                  <div className="admin-detail">
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.name")}</div>
                      <div className="admin-detail__value">
                        {selectedUser.fullName}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.email")}</div>
                      <div className="admin-detail__value">
                        {selectedUser.email}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.role")}</div>
                      <div className="admin-detail__value">
                        {selectedUser.role}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.status")}</div>
                      <div className="admin-detail__value">
                        {getStatusLabel(selectedUser.status)}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.last_login")}</div>
                      <div className="admin-detail__value">
                        {selectedUser.lastLogin || t("admin.users.info.no_data")}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">{t("admin.users.info.created_at")}</div>
                      <div className="admin-detail__value">
                        {selectedUser.createdAt || t("admin.users.info.no_data")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel: Nhật ký đăng nhập */}
              {activePanel === "logs" && (
                <div className="admin-card admin-panel">
                  <div className="admin-card__header">
                    <h2>{t("admin.users.logs.title")}</h2>
                  </div>
                  {loadingLogs ? (
                    <div className="admin-empty">{t("admin.users.logs.loading")}</div>
                  ) : logs.length === 0 ? (
                    <div className="admin-empty">
                      {t("admin.users.logs.empty")}
                    </div>
                  ) : (
                    <ul className="admin-log-list">
                      {logs.map((log) => (
                        <li key={log.id} className="admin-log-item">
                          <div className="admin-log__time">{log.time}</div>
                          <div className="admin-log__action">
                            {log.action}
                          </div>
                          <div className="admin-log__detail">
                            {log.detail}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Panel: Lịch sử chỉnh sửa tài khoản */}
              {activePanel === "history" && (
                <div className="admin-card admin-panel">
                  <div className="admin-card__header">
                    <h2>{t("admin.users.history.title")}</h2>
                  </div>
                  {accountHistory.length === 0 ? (
                    <div className="admin-empty">
                      {t("admin.users.history.empty")}
                    </div>
                  ) : (
                    <ul className="admin-log-list">
                      {accountHistory.map((h) => (
                        <li key={h.id} className="admin-log-item">
                          <div className="admin-log__time">{h.time}</div>
                          <div className="admin-log__action">{h.action}</div>
                          <div className="admin-log__detail">{h.detail}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Panel: Quản lý tài khoản */}
              {activePanel === "manage" && (
                <div className="admin-card admin-panel">
                  <h2>{t("admin.users.manage.title")}</h2>
                  <p className="admin-panel__desc">{t("admin.users.manage.desc")}</p>

                  <div className="admin-manage-grid">
                    <div className="admin-manage-block">
                      <h3>{t("admin.users.manage.role_title")}</h3>
                      <p>{t("admin.users.manage.role_desc")}</p>
                      {!canManageUser ? (
                        <div className="text-muted">
                          <select value={selectedUser.role} disabled>
                            <option value={ROLES.ADMIN}>Admin</option>
                            <option value={ROLES.USER}>User</option>
                          </select>
                          <small className="d-block mt-2 text-warning">
                            {isCurrentUser
                              ? "Không thể thay đổi vai trò của chính mình"
                              : !isSystemAdmin && selectedUser.role === ROLES.ADMIN
                              ? "Chỉ admin hệ thống mới có thể thay đổi vai trò của admin khác"
                              : "Không thể thay đổi vai trò"}
                          </small>
                        </div>
                      ) : (
                        <select
                          value={selectedUser.role}
                          onChange={(e) =>
                            updateUserRole(selectedUser.id, e.target.value)
                          }
                        >
                          <option value={ROLES.ADMIN}>Admin</option>
                          <option value={ROLES.USER}>User</option>
                        </select>
                      )}
                    </div>

                    <div className="admin-manage-block">
                      <h3>{t("admin.users.manage.status_title")}</h3>
                      <p>{t("admin.users.manage.status_desc")}</p>
                      {!canManageUser ? (
                        <div>
                          <button className="btn-primary" disabled>
                            {selectedUser.status === "ACTIVE"
                              ? t("admin.users.manage.btn_lock")
                              : t("admin.users.manage.btn_unlock")}
                          </button>
                          <small className="d-block mt-2 text-warning">
                            {isCurrentUser
                              ? "Không thể khóa/mở khóa chính mình"
                              : !isSystemAdmin && selectedUser.role === ROLES.ADMIN
                              ? "Chỉ admin hệ thống mới có thể khóa/mở khóa admin khác"
                              : "Không thể thay đổi trạng thái"}
                          </small>
                        </div>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => toggleUserStatus(selectedUser.id)}
                        >
                          {selectedUser.status === "ACTIVE"
                            ? t("admin.users.manage.btn_lock")
                            : t("admin.users.manage.btn_unlock")}
                        </button>
                      )}
                    </div>

                    <div className="admin-manage-block">
                      <h3>{t("admin.users.manage.delete_title")}</h3>
                      <p>{t("admin.users.manage.delete_desc")}</p>
                      {!canManageUser ? (
                        <div>
                          <button
                            className="btn-primary btn-primary--outline"
                            disabled
                          >
                            {t("admin.users.manage.btn_delete")}
                          </button>
                          <small className="d-block mt-2 text-warning">
                            {isCurrentUser
                              ? "Không thể xóa chính mình"
                              : !isSystemAdmin && selectedUser.role === ROLES.ADMIN
                              ? "Chỉ admin hệ thống mới có thể xóa admin khác"
                              : "Không thể xóa tài khoản"}
                          </small>
                        </div>
                      ) : (
                        <button
                          className="btn-primary btn-primary--outline"
                          onClick={() => deleteUser(selectedUser.id)}
                        >
                          {t("admin.users.manage.btn_delete")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

