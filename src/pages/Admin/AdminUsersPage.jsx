// src/pages/Admin/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/admin/AdminUsersPage.css";
import { ROLES, useAuth } from "../../home/store/AuthContext";
import { useToast } from "../../components/common/Toast/ToastContext";
import {
  getAdminUsers,
  getUserLoginLogs,
  changeUserRole,
  lockUser,
  unlockUser,
  deleteUser as deleteUserApi,
} from "../../services/adminUserApi";

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
      showToast("Không tải được danh sách người dùng", "error");
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
      showToast("Không tải được nhật ký đăng nhập", "error");
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // 3) Đổi role USER <-> ADMIN
  const updateUserRole = async (userId, newRole) => {
    // Không cho phép thay đổi role của chính mình
    if (userId === currentUser?.id) {
      showToast("Không thể thay đổi vai trò của chính mình", "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    
    // Chỉ admin hệ thống mới có thể thay đổi role của admin khác
    if (!isSystemAdmin && target?.role === ROLES.ADMIN) {
      showToast("Chỉ admin hệ thống mới có thể thay đổi vai trò của admin khác", "error");
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
          "Đổi vai trò",
          `Đổi vai trò từ "${oldRole}" sang "${newRole}".`
        );
        showToast(
          `Đã cập nhật vai trò cho ${target.fullName} thành "${newRole}".`
        );
      } else {
        showToast(`Đã cập nhật vai trò tài khoản.`);
      }
    } catch (e) {
      console.error(e);
      showToast("Đổi vai trò thất bại", "error");
    }
  };

  // 4) Khóa / mở khóa user
  const toggleUserStatus = async (userId) => {
    // Không cho phép khóa/mở khóa chính mình
    if (userId === currentUser?.id) {
      showToast("Không thể khóa/mở khóa chính mình", "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Chỉ admin hệ thống mới có thể khóa/mở khóa admin khác
    if (!isSystemAdmin && target.role === ROLES.ADMIN) {
      showToast("Chỉ admin hệ thống mới có thể khóa/mở khóa admin khác", "error");
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
        `Thay đổi trạng thái từ "${oldStatus}" sang "${newStatus}".`
      );
      showToast(
        isActive
          ? `Đã khóa tài khoản ${target.fullName}.`
          : `Đã mở khóa tài khoản ${target.fullName}.`
      );
    } catch (e) {
      console.error(e);
      showToast("Cập nhật trạng thái thất bại", "error");
    }
  };

  // 5) Xoá user
  const deleteUser = async (userId) => {
    // Không cho phép xóa chính mình
    if (userId === currentUser?.id) {
      showToast("Không thể xóa chính mình", "error");
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Chỉ admin hệ thống mới có thể xóa admin khác
    if (!isSystemAdmin && target.role === ROLES.ADMIN) {
      showToast("Chỉ admin hệ thống mới có thể xóa admin khác", "error");
      return;
    }

    try {
      await deleteUserApi(userId); // DELETE /admin/users/{id}

      if (target) {
        addHistoryEntry(
          userId,
          "Xóa tài khoản",
          `Tài khoản "${target.fullName}" đã bị xóa khỏi hệ thống.`
        );
      }

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setLogs([]);
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(`Đã xóa tài khoản ${target?.fullName || ""}.`);
    } catch (e) {
      console.error(e);
      showToast("Xóa tài khoản thất bại", "error");
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
    if (status === "ACTIVE") return "Đang hoạt động";
    if (status === "LOCKED") return "Đã khóa";
    return "Không xác định";
  };

  // =============== Render ===============
  return (
    <div className="admin-users-page">
      <div className="admin-users__header">
        <div>
          <h1 className="admin-users__title">Quản lý người dùng</h1>
          <p className="admin-users__subtitle">
            Xin chào {currentUser?.fullName || "Admin"}, bạn có thể phân quyền,
            khóa/mở, xóa tài khoản, xem nhật ký đăng nhập và toàn bộ lịch sử
            chỉnh sửa tài khoản tại đây.
          </p>
        </div>
      </div>

      <div className="admin-users__layout">
        {/* Cột trái: danh sách user */}
        <div className="admin-users__left">
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Danh sách tài khoản</h2>
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                  <option value={ROLES.USER}>User</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div className="admin-empty">
                Đang tải danh sách người dùng...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-empty">Không có người dùng phù hợp.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Đăng nhập gần nhất</th>
                    <th>Hành động</th>
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
                      <td>{u.createdAt || "Không có dữ liệu"}</td>
                      <td>{u.lastLogin || "Chưa có dữ liệu"}</td>
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
                          {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
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
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cột phải: chi tiết + các panel chức năng ẩn/hiện */}
        <div className="admin-users__right">
          {!selectedUser ? (
            <div className="admin-empty admin-empty--border">
              Chọn một người dùng ở bảng bên trái để xem chi tiết & thao tác.
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
                  Thông tin
                </button>
                <button
                  className={
                    activePanel === "logs"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("logs")}
                >
                  Nhật ký đăng nhập
                </button>
                <button
                  className={
                    activePanel === "history"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("history")}
                >
                  Lịch sử chỉnh sửa
                </button>
                <button
                  className={
                    activePanel === "manage"
                      ? "admin-tab admin-tab--active"
                      : "admin-tab"
                  }
                  onClick={() => setActivePanel("manage")}
                >
                  Quản lý tài khoản
                </button>
              </div>

              {/* Panel: Thông tin */}
              {activePanel === "info" && (
                <div className="admin-card admin-panel">
                  <h2>Thông tin tài khoản</h2>
                  <div className="admin-detail">
                    <div>
                      <div className="admin-detail__label">Họ tên</div>
                      <div className="admin-detail__value">
                        {selectedUser.fullName}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">Email</div>
                      <div className="admin-detail__value">
                        {selectedUser.email}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">Vai trò</div>
                      <div className="admin-detail__value">
                        {selectedUser.role}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">Trạng thái</div>
                      <div className="admin-detail__value">
                        {getStatusLabel(selectedUser.status)}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">
                        Đăng nhập gần nhất
                      </div>
                      <div className="admin-detail__value">
                        {selectedUser.lastLogin || "Chưa có dữ liệu"}
                      </div>
                    </div>
                    <div>
                      <div className="admin-detail__label">Ngày tạo</div>
                      <div className="admin-detail__value">
                        {selectedUser.createdAt || "Không có dữ liệu"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel: Nhật ký đăng nhập */}
              {activePanel === "logs" && (
                <div className="admin-card admin-panel">
                  <div className="admin-card__header">
                    <h2>Nhật ký hoạt động (đăng nhập)</h2>
                  </div>
                  {loadingLogs ? (
                    <div className="admin-empty">Đang tải nhật ký...</div>
                  ) : logs.length === 0 ? (
                    <div className="admin-empty">
                      Chưa có nhật ký hoạt động cho người dùng này.
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
                    <h2>Lịch sử chỉnh sửa tài khoản</h2>
                  </div>
                  {accountHistory.length === 0 ? (
                    <div className="admin-empty">
                      Chưa có thao tác chỉnh sửa nào cho tài khoản này trong
                      phiên làm việc hiện tại.
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
                  <h2>Quản lý tài khoản</h2>
                  <p className="admin-panel__desc">
                    Thực hiện các thao tác quản trị cho tài khoản đã chọn. Mỗi
                    hành động sẽ hiển thị thông báo thành công và ghi vào lịch
                    sử chỉnh sửa.
                  </p>

                  <div className="admin-manage-grid">
                    <div className="admin-manage-block">
                      <h3>Vai trò</h3>
                      <p>Phân quyền cho người dùng.</p>
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
                      <h3>Trạng thái</h3>
                      <p>Khóa hoặc mở khóa tài khoản.</p>
                      {!canManageUser ? (
                        <div>
                          <button className="btn-primary" disabled>
                            {selectedUser.status === "ACTIVE"
                              ? "Khóa tài khoản"
                              : "Mở khóa tài khoản"}
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
                            ? "Khóa tài khoản"
                            : "Mở khóa tài khoản"}
                        </button>
                      )}
                    </div>

                    <div className="admin-manage-block">
                      <h3>Xóa tài khoản</h3>
                      <p>
                        Xóa vĩnh viễn tài khoản khỏi hệ thống. Hành động này
                        không thể hoàn tác.
                      </p>
                      {!canManageUser ? (
                        <div>
                          <button
                            className="btn-primary btn-primary--outline"
                            disabled
                          >
                            Xóa tài khoản
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
                          Xóa tài khoản
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

