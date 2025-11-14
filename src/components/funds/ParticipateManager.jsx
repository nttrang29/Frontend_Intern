// src/components/funds/ParticipateManager.jsx
import React, { useEffect, useState } from "react";
import FundSection from "./FundSection";

export default function ParticipateManager({ viewFunds, useFunds }) {
  const [selectedFund, setSelectedFund] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!selectedFund) {
      setMembers([]);
      return;
    }

    if (Array.isArray(selectedFund.members) && selectedFund.members.length > 0) {
      setMembers(selectedFund.members);
    } else {
      setMembers([
        { id: 1, name: "Bạn A", email: "a@example.com", role: "owner" },
        { id: 2, name: "Bạn B", email: "b@example.com", role: "use" },
        { id: 3, name: "Bạn C", email: "c@example.com", role: "view" },
      ]);
    }
  }, [selectedFund]);

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      { id: Date.now(), name: "", email: "", role: "view" },
    ]);
  };

  const handleChangeMember = (id, field, value) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveMembers = () => {
    if (!selectedFund) return;
    console.log("Lưu cập nhật thành viên quỹ tham gia", {
      fundId: selectedFund.id,
      members,
    });
    alert("Đã lưu thay đổi thành viên (demo trên FE).");
  };

  return (
    <div className="row g-3">
      {/* CỘT TRÁI: DANH SÁCH QUỸ ĐƯỢC THAM GIA */}
      <div className="col-lg-5">
        <FundSection
          title="Quỹ tham gia (chỉ xem)"
          subtitle="Bạn chỉ có quyền xem số dư và lịch sử."
          items={viewFunds}
          onSelectFund={() => {
            // quỹ xem: không cho chỉnh
          }}
        />

        <FundSection
          title="Quỹ tham gia (được sử dụng)"
          subtitle="Bạn được phép thao tác tiền và quản lý thành viên (tuỳ quyền)."
          items={useFunds}
          onSelectFund={(fund) => setSelectedFund(fund)}
        />
      </div>

      {/* CỘT PHẢI: CHI TIẾT QUỸ ĐƯỢC CHỌN */}
      <div className="col-lg-7">
        {!selectedFund ? (
          <div className="card border-0 shadow-sm p-3 p-lg-4">
            <h5 className="mb-2">Chọn một quỹ được sử dụng</h5>
            <p className="mb-0 text-muted">
              Hãy bấm vào một quỹ trong phần{" "}
              <strong>Quỹ tham gia (được sử dụng)</strong> bên trái để xem chi
              tiết và quản lý thành viên.
            </p>
          </div>
        ) : (
          <div className="funds-fieldset">
            <div className="funds-fieldset__legend">
              Quản lý quỹ được tham gia
            </div>

            <div className="funds-field">
              <label>Tên quỹ</label>
              <input
                type="text"
                value={selectedFund.name}
                onChange={(e) =>
                  setSelectedFund((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <div className="funds-hint">
                Bạn có thể đổi tên quỹ này (đang demo trên FE).
              </div>
            </div>

            <div className="funds-field funds-field--inline">
              <div>
                <label>Loại quỹ</label>
                <input
                  type="text"
                  disabled
                  value={
                    selectedFund.type === "group"
                      ? "Quỹ nhóm"
                      : "Quỹ cá nhân"
                  }
                />
              </div>
              <div>
                <label>Vai trò của bạn</label>
                <input
                  type="text"
                  disabled
                  value={
                    selectedFund.role === "manage"
                      ? "Được sử dụng"
                      : "Chỉ xem"
                  }
                />
              </div>
            </div>

            <div className="funds-field funds-field--inline">
              <div>
                <label>Số dư hiện tại</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedFund.current.toLocaleString("vi-VN")} ${
                    selectedFund.currency || ""
                  }`}
                />
              </div>
              <div>
                <label>Mục tiêu (nếu có)</label>
                <input
                  type="text"
                  disabled
                  value={
                    selectedFund.target
                      ? `${selectedFund.target.toLocaleString("vi-VN")} ${
                          selectedFund.currency || ""
                        }`
                      : "Không thiết lập"
                  }
                />
              </div>
            </div>

            <div className="funds-field mt-2">
              <label>Thành viên quỹ</label>

              {selectedFund.role !== "manage" ? (
                <div className="funds-hint">
                  Bạn chỉ có quyền xem. Không thể chỉnh sửa thành viên trong
                  quỹ này.
                </div>
              ) : (
                <>
                  <div className="funds-hint">
                    Bạn có thể thêm, xoá và sửa tên / email / quyền của thành
                    viên.
                  </div>

                  <div className="funds-members">
                    {members.map((m) => (
                      <div key={m.id} className="funds-member-row">
                        <input
                          type="text"
                          placeholder="Tên"
                          value={m.name}
                          onChange={(e) =>
                            handleChangeMember(m.id, "name", e.target.value)
                          }
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={m.email}
                          onChange={(e) =>
                            handleChangeMember(m.id, "email", e.target.value)
                          }
                        />
                        <select
                          value={m.role}
                          onChange={(e) =>
                            handleChangeMember(m.id, "role", e.target.value)
                          }
                        >
                          <option value="owner">Chủ quỹ</option>
                          <option value="use">Được sử dụng</option>
                          <option value="view">Chỉ xem</option>
                        </select>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemoveMember(m.id)}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn-link"
                      onClick={handleAddMember}
                    >
                      <i className="bi bi-person-plus me-1" />
                      Thêm thành viên
                    </button>
                  </div>

                  <div className="funds-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedFund(null)}
                    >
                      Đóng chi tiết
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveMembers}
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
