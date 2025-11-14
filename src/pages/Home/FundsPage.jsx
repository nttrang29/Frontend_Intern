// src/pages/Home/FundsPage.jsx
import React, { useMemo, useState } from "react";
import "../../styles/home/FundsPage.css"; // chỉnh path nếu folder khác

// ================== DEMO DATA ==================

// Demo ví cá nhân
const DEMO_WALLETS = [
  {
    id: "w1",
    name: "Ví tiền mặt",
    balance: 2500000,
    currency: "VND",
    createdAt: "2024-10-10",
  },
  {
    id: "w2",
    name: "Techcombank",
    balance: 150,
    currency: "USD",
    createdAt: "2024-08-01",
  },
  {
    id: "w3",
    name: "Momo",
    balance: 0,
    currency: "VND",
    createdAt: "2024-09-15",
  },
];

// Demo quỹ cá nhân đã tồn tại
const DEMO_PERSONAL_FUNDS = [
  {
    id: "pf1",
    name: "Quỹ mua Macbook",
    type: "saving",
    kind: "term",
    targetAmount: 30000000,
    currency: "VND",
    frequency: "monthly",
    perPeriodAmount: 3000000,
    walletName: "Techcombank",
  },
  {
    id: "pf2",
    name: "Quỹ tiêu dùng cuối tuần",
    type: "spending",
    budgetName: "Ngân sách giải trí (DEMO)",
  },
  {
    id: "pf3",
    name: "Quỹ thiện nguyện",
    type: "custom",
  },
];

// Demo quỹ nhóm đã tồn tại
const DEMO_GROUP_FUNDS = [
  {
    id: "gf1",
    name: "Quỹ du lịch Đà Nẵng 2025",
    type: "saving",
    members: 4,
  },
  {
    id: "gf2",
    name: "Quỹ ăn trưa team",
    type: "spending",
    members: 6,
  },
];

const FREQUENCIES = [
  { value: "daily", label: "Hàng ngày" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "yearly", label: "Hàng năm" },
];

const SAVING_KIND = [
  { value: "no_term", label: "Tiết kiệm không thời hạn" },
  { value: "term", label: "Tiết kiệm có thời hạn" },
];

const MEMBER_ROLES = [
  {
    value: "view",
    label: "Quyền xem",
    desc: "Chỉ xem giao dịch & số dư",
  },
  {
    value: "deposit",
    label: "Quyền nạp tiền",
    desc: "Được tạo giao dịch nạp, rút cần admin duyệt",
  },
];

export default function FundsPage() {
  // tab lớn: quỹ cá nhân / quỹ nhóm
  const [mode, setMode] = useState("personal"); // "personal" | "group"

  // loại quỹ cá nhân
  const [personalType, setPersonalType] = useState("saving"); // "saving" | "spending" | "custom"

  // loại quỹ nhóm
  const [groupType, setGroupType] = useState("saving");

  // tiết kiệm: loại
  const [savingKind, setSavingKind] = useState("no_term");

  // chọn ví nguồn
  const [sourceWalletId, setSourceWalletId] = useState(DEMO_WALLETS[0].id);

  // form tiết kiệm
  const [savingForm, setSavingForm] = useState({
    name: "Quỹ mua Macbook (demo)",
    targetAmount: "30000000",
    frequency: "monthly",
    perPeriodAmount: "3000000",
    startDate: new Date().toISOString().slice(0, 10),
    reminderDate: "",
    reminderTime: "",
  });

  // form quỹ tiêu dùng (demo)
  const [spendingForm, setSpendingForm] = useState({
    name: "Quỹ ăn uống (demo)",
    budgetLink: "demo1",
  });

  // form quỹ tự tạo
  const [customForm, setCustomForm] = useState({
    name: "Quỹ thiện nguyện (demo)",
    description: "Dùng để ủng hộ các hoạt động thiện nguyện.",
    rules: "Mọi giao dịch rút tiền đều cần 2 người duyệt.",
  });

  // nhóm: thành viên
  const [members, setMembers] = useState([
    { id: 1, name: "Bạn (Owner)", email: "you@example.com", role: "owner" },
    { id: 2, name: "Thành viên A", email: "memberA@example.com", role: "view" },
  ]);

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "view",
  });

  // danh sách quỹ demo (có thể thêm mới khi bấm Lưu)
  const [personalFunds, setPersonalFunds] =
    useState(DEMO_PERSONAL_FUNDS);
  const [groupFunds, setGroupFunds] = useState(DEMO_GROUP_FUNDS);

  // wallet đã chọn
  const selectedWallet = useMemo(
    () => DEMO_WALLETS.find((w) => w.id === sourceWalletId),
    [sourceWalletId]
  );

  // ===== helper tính gợi ý thời gian hoàn thành tiết kiệm (SAFE) =====
  const suggestedEndDate = useMemo(() => {
    const { targetAmount, perPeriodAmount, frequency, startDate } =
      savingForm;

    const target = Number(targetAmount);
    const per = Number(perPeriodAmount);

    // thiếu dữ liệu => không tính
    if (!target || !per || per <= 0 || target <= 0 || !startDate) {
      return null;
    }

    const periods = Math.ceil(target / per);
    if (!periods || !Number.isFinite(periods)) return null;

    // ép format ngày cho chắc: YYYY-MM-DDT00:00:00
    const d = new Date(startDate + "T00:00:00");
    if (!d || Number.isNaN(d.getTime())) {
      return null;
    }

    const result = new Date(d);

    if (frequency === "daily") {
      result.setDate(result.getDate() + periods);
    } else if (frequency === "monthly") {
      result.setMonth(result.getMonth() + periods);
    } else if (frequency === "yearly") {
      result.setFullYear(result.getFullYear() + periods);
    } else {
      return null;
    }

    if (!result || Number.isNaN(result.getTime())) {
      return null;
    }

    return result.toISOString().slice(0, 10);
  }, [savingForm]);

  // ===== validation cho số tiền mục tiêu =====
  const savingTargetError = useMemo(() => {
    if (!selectedWallet) return null;
    if (!savingForm.targetAmount) return null;

    const target = Number(savingForm.targetAmount);
    if (Number.isNaN(target) || target <= 0) {
      return "Số tiền mục tiêu phải lớn hơn 0.";
    }

    const balance = selectedWallet.balance || 0;
    const cur = selectedWallet.currency || "VND";

    if (target <= balance) {
      return `Số tiền mục tiêu phải lớn hơn số dư hiện tại (${balance.toLocaleString()} ${cur}).`;
    }

    if (balance === 0) {
      if (cur === "VND" && target <= 1000) {
        return "Vì số dư ví là 0, số tiền tiết kiệm tối thiểu phải lớn hơn 1.000 VND.";
      }
      if (cur === "USD" && target <= 1) {
        return "Vì số dư ví là 0, số tiền tiết kiệm tối thiểu phải lớn hơn 1 USD.";
      }
    }

    return null;
  }, [selectedWallet, savingForm.targetAmount]);

  // ===== handler chung =====
  const updateSavingForm = (patch) =>
    setSavingForm((prev) => ({ ...prev, ...patch }));

  const updateSpendingForm = (patch) =>
    setSpendingForm((prev) => ({ ...prev, ...patch }));

  const updateCustomForm = (patch) =>
    setCustomForm((prev) => ({ ...prev, ...patch }));

  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) return;
    setMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
      },
    ]);
    setNewMember({ name: "", email: "", role: "view" });
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) =>
      prev.filter((m) => m.id !== id || m.role === "owner")
    );
  };

  // ===== submit demo (không gọi API, chỉ thêm vào list mock) =====
  const handleSubmitPersonal = (e) => {
    e.preventDefault();
    let newFundName =
      personalType === "saving"
        ? savingForm.name
        : personalType === "spending"
        ? spendingForm.name
        : customForm.name;

    if (!newFundName) {
      alert("Vui lòng nhập tên quỹ trước khi lưu.");
      return;
    }

    const walletName = selectedWallet?.name || "Ví nguồn (demo)";
    const currency = selectedWallet?.currency || "VND";

    const newFund = {
      id: "pf_" + Date.now(),
      name: newFundName,
      type: personalType,
      kind: personalType === "saving" ? savingKind : undefined,
      targetAmount:
        personalType === "saving"
          ? Number(savingForm.targetAmount) || 0
          : undefined,
      currency,
      frequency:
        personalType === "saving" ? savingForm.frequency : undefined,
      perPeriodAmount:
        personalType === "saving"
          ? Number(savingForm.perPeriodAmount) || 0
          : undefined,
      walletName,
      budgetName:
        personalType === "spending" && spendingForm.budgetLink
          ? "Ngân sách demo"
          : undefined,
    };

    setPersonalFunds((prev) => [newFund, ...prev]);
    console.log("Tạo quỹ cá nhân DEMO:", newFund);
    alert("Đã tạo thêm một quỹ cá nhân DEMO. Xem trong danh sách bên dưới.");
  };

  const handleSubmitGroup = (e) => {
    e.preventDefault();

    let newFundName =
      groupType === "saving"
        ? savingForm.name
        : groupType === "spending"
        ? spendingForm.name
        : customForm.name;

    if (!newFundName) {
      alert("Vui lòng nhập tên quỹ trước khi lưu.");
      return;
    }

    const newFund = {
      id: "gf_" + Date.now(),
      name: newFundName,
      type: groupType,
      members: members.length,
    };

    setGroupFunds((prev) => [newFund, ...prev]);
    console.log("Tạo quỹ nhóm DEMO:", newFund);
    alert("Đã tạo thêm một quỹ nhóm DEMO. Xem trong danh sách bên dưới.");
  };

  // ================== JSX cho từng khối ==================

  const renderSavingSection = () => (
    <div className="fund-card">
      <div className="fund-card__header">
        <h2>Quỹ tiết kiệm</h2>
        <p>Thiết lập mục tiêu, tần suất gửi và nhắc nhở.</p>
      </div>

      {/* Loại tiết kiệm */}
      <div className="fund-row">
        <label className="fund-label">Loại tiết kiệm</label>
        <div className="fund-segment">
          {SAVING_KIND.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={
                "fund-segment__item" +
                (savingKind === opt.value
                  ? " fund-segment__item--active"
                  : "")
              }
              onClick={() => setSavingKind(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tên quỹ */}
      <div className="fund-row">
        <label className="fund-label">
          Tên quỹ <span className="fund-label__required">*</span>
        </label>
        <input
          type="text"
          className="fund-input"
          placeholder="Ví dụ: Quỹ mua Macbook, Quỹ du lịch Đà Lạt..."
          value={savingForm.name}
          onChange={(e) => updateSavingForm({ name: e.target.value })}
        />
      </div>

      {/* Ví nguồn */}
      <div className="fund-row">
        <label className="fund-label">
          Chọn ví nguồn <span className="fund-label__required">*</span>
        </label>
        <div className="fund-wallet-select">
          <select
            className="fund-input"
            value={sourceWalletId}
            onChange={(e) => setSourceWalletId(e.target.value)}
          >
            {DEMO_WALLETS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.balance.toLocaleString()} {w.currency}
              </option>
            ))}
          </select>
          {selectedWallet && (
            <div className="fund-wallet-meta">
              <span>
                Số dư hiện tại:{" "}
                <strong>
                  {selectedWallet.balance.toLocaleString()}{" "}
                  {selectedWallet.currency}
                </strong>
              </span>
              <span>
                Ngày tạo ví:{" "}
                <strong>
                  {new Date(
                    selectedWallet.createdAt
                  ).toLocaleDateString("vi-VN")}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Số tiền mục tiêu */}
      <div className="fund-row">
        <label className="fund-label">
          Số tiền mục tiêu tiết kiệm{" "}
          <span className="fund-label__required">*</span>
        </label>
        <input
          type="number"
          className={
            "fund-input" + (savingTargetError ? " fund-input--error" : "")
          }
          min={0}
          value={savingForm.targetAmount}
          onChange={(e) =>
            updateSavingForm({ targetAmount: e.target.value })
          }
          placeholder="Nhập số tiền bạn muốn đạt được"
        />
        {savingTargetError && (
          <p className="fund-error">{savingTargetError}</p>
        )}
      </div>

      {/* Tần suất + số tiền kỳ */}
      <div className="fund-row fund-row--grid">
        <div>
          <label className="fund-label">
            Tần suất gửi tiết kiệm
            <span className="fund-label__required">*</span>
          </label>
          <div className="fund-segment">
            {FREQUENCIES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  "fund-segment__item" +
                  (savingForm.frequency === opt.value
                    ? " fund-segment__item--active"
                    : "")
                }
                onClick={() =>
                  updateSavingForm({ frequency: opt.value })
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="fund-label">
            Số tiền mỗi kỳ gửi
            <span className="fund-label__required">*</span>
          </label>
          <input
            type="number"
            className="fund-input"
            min={0}
            value={savingForm.perPeriodAmount}
            onChange={(e) =>
              updateSavingForm({ perPeriodAmount: e.target.value })
            }
            placeholder="Ví dụ: 3.000.000 mỗi tháng"
          />
        </div>
      </div>

      {/* Gợi ý thời gian hoàn thành */}
      <div className="fund-row">
        <label className="fund-label">Gợi ý thời gian hoàn thành</label>
        {suggestedEndDate ? (
          <div className="fund-suggest">
            <span>
              Nếu bạn gửi đều theo tần suất trên, dự kiến hoàn thành mục
              tiêu vào:
            </span>
            <strong>
              {" "}
              {new Date(
                suggestedEndDate
              ).toLocaleDateString("vi-VN")}
            </strong>
          </div>
        ) : (
          <p className="fund-note">
            Nhập số tiền mục tiêu và số tiền mỗi kỳ để hệ thống gợi ý
            thời gian hoàn thành.
          </p>
        )}
      </div>

      {/* Ngày bắt đầu + nhắc nhở */}
      <div className="fund-row fund-row--grid">
        <div>
          <label className="fund-label">Ngày bắt đầu</label>
          <input
            type="date"
            className="fund-input"
            value={savingForm.startDate}
            onChange={(e) =>
              updateSavingForm({ startDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="fund-label">Ngày nhắc nhở</label>
          <input
            type="date"
            className="fund-input"
            value={savingForm.reminderDate}
            onChange={(e) =>
              updateSavingForm({ reminderDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="fund-label">Giờ nhắc nhở</label>
          <input
            type="time"
            className="fund-input"
            value={savingForm.reminderTime}
            onChange={(e) =>
              updateSavingForm({ reminderTime: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );

  const renderSpendingSection = () => (
    <div className="fund-card">
      <div className="fund-card__header">
        <h2>Quỹ tiêu dùng</h2>
        <p>
          Liên kết hạn mức từ mục Ngân sách. Phần logic chi tiết bạn sẽ
          bổ sung sau.
        </p>
      </div>

      <div className="fund-row">
        <label className="fund-label">
          Tên quỹ tiêu dùng{" "}
          <span className="fund-label__required">*</span>
        </label>
        <input
          type="text"
          className="fund-input"
          value={spendingForm.name}
          onChange={(e) =>
            updateSpendingForm({ name: e.target.value })
          }
          placeholder="Ví dụ: Quỹ ăn uống, Quỹ giải trí cuối tuần..."
        />
      </div>

      <div className="fund-row">
        <label className="fund-label">Chọn hạn mức từ Ngân sách</label>
        <select
          className="fund-input"
          value={spendingForm.budgetLink}
          onChange={(e) =>
            updateSpendingForm({ budgetLink: e.target.value })
          }
        >
          <option value="">
            -- Demo: sẽ hiển thị danh sách ngân sách sau --
          </option>
          <option value="demo1">Hạn mức ăn uống (DEMO)</option>
          <option value="demo2">Hạn mức di chuyển (DEMO)</option>
        </select>
        <p className="fund-note">
          Hiện tại đây chỉ là demo. Sau này bạn có thể map dữ liệu thực
          từ module Ngân sách.
        </p>
      </div>
    </div>
  );

  const renderCustomSection = () => (
    <div className="fund-card">
      <div className="fund-card__header">
        <h2>Quỹ tự tạo</h2>
        <p>
          Không bị giới hạn quy tắc. Bạn tự định nghĩa mục tiêu, cách
          ghi nhận, và quy tắc sử dụng.
        </p>
      </div>

      <div className="fund-row">
        <label className="fund-label">
          Tên quỹ <span className="fund-label__required">*</span>
        </label>
        <input
          type="text"
          className="fund-input"
          value={customForm.name}
          onChange={(e) =>
            updateCustomForm({ name: e.target.value })
          }
          placeholder="Ví dụ: Quỹ thiện nguyện, Quỹ mua quà cho gia đình..."
        />
      </div>

      <div className="fund-row">
        <label className="fund-label">Mô tả</label>
        <textarea
          className="fund-input fund-input--textarea"
          rows={3}
          value={customForm.description}
          onChange={(e) =>
            updateCustomForm({ description: e.target.value })
          }
          placeholder="Mục đích, phạm vi sử dụng quỹ..."
        />
      </div>

      <div className="fund-row">
        <label className="fund-label">Quy tắc riêng</label>
        <textarea
          className="fund-input fund-input--textarea"
          rows={3}
          value={customForm.rules}
          onChange={(e) =>
            updateCustomForm({ rules: e.target.value })
          }
          placeholder="Ví dụ: chỉ dùng cho trường hợp khẩn cấp, cần 2 người duyệt..."
        />
      </div>
    </div>
  );

  const renderPersonalFund = () => (
    <>
      <form className="fund-layout" onSubmit={handleSubmitPersonal}>
        <div className="fund-layout__left">
          <div className="fund-toggle">
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (personalType === "saving"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setPersonalType("saving")}
            >
              Quỹ tiết kiệm
            </button>
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (personalType === "spending"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setPersonalType("spending")}
            >
              Quỹ tiêu dùng
            </button>
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (personalType === "custom"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setPersonalType("custom")}
            >
              Quỹ tự tạo
            </button>
          </div>

          <div className="fund-layout__content">
            {personalType === "saving" && renderSavingSection()}
            {personalType === "spending" && renderSpendingSection()}
            {personalType === "custom" && renderCustomSection()}
          </div>
        </div>

        <aside className="fund-layout__right">
          <div className="fund-summary">
            <h3>Tóm tắt quỹ cá nhân</h3>
            <p>
              Bạn đang tạo{" "}
              <strong>
                {personalType === "saving"
                  ? "Quỹ tiết kiệm"
                  : personalType === "spending"
                  ? "Quỹ tiêu dùng"
                  : "Quỹ tự tạo"}
              </strong>
              .
            </p>
            {selectedWallet && (
              <ul className="fund-summary__list">
                <li>
                  <span>Ví nguồn:</span>
                  <strong>{selectedWallet.name}</strong>
                </li>
                {personalType === "saving" && (
                  <>
                    <li>
                      <span>Mục tiêu:</span>
                      <strong>
                        {savingForm.targetAmount
                          ? `${Number(
                              savingForm.targetAmount
                            ).toLocaleString()} ${
                              selectedWallet.currency
                            }`
                          : "Chưa nhập"}
                      </strong>
                    </li>
                    <li>
                      <span>Tần suất:</span>
                      <strong>
                        {
                          FREQUENCIES.find(
                            (f) => f.value === savingForm.frequency
                          )?.label
                        }
                      </strong>
                    </li>
                    <li>
                      <span>Tiền mỗi kỳ:</span>
                      <strong>
                        {savingForm.perPeriodAmount
                          ? Number(
                              savingForm.perPeriodAmount
                            ).toLocaleString()
                          : "Chưa nhập"}
                      </strong>
                    </li>
                    {suggestedEndDate && (
                      <li>
                        <span>Dự kiến hoàn thành:</span>
                        <strong>
                          {new Date(
                            suggestedEndDate
                          ).toLocaleDateString("vi-VN")}
                        </strong>
                      </li>
                    )}
                  </>
                )}
              </ul>
            )}
            <button type="submit" className="fund-btn fund-btn--primary">
              Lưu quỹ cá nhân (Demo)
            </button>
            <p className="fund-note fund-note--small">
              Hiện tại thao tác này chỉ thêm vào danh sách demo bên dưới và
              log dữ liệu ra console. Sau này bạn map vào API thực.
            </p>
          </div>
        </aside>
      </form>

      {/* Danh sách quỹ cá nhân demo */}
      <section className="funds-demo">
        <h3>Danh sách quỹ cá nhân (DEMO)</h3>
        <div className="funds-demo__grid">
          {personalFunds.map((f) => (
            <div key={f.id} className="funds-demo__item">
              <div className="funds-demo__title">{f.name}</div>
              <div className="funds-demo__meta">
                <span className="fund-badge">
                  {f.type === "saving"
                    ? "Tiết kiệm"
                    : f.type === "spending"
                    ? "Tiêu dùng"
                    : "Tự tạo"}
                </span>
                {f.walletName && <span>{f.walletName}</span>}
              </div>
              {f.type === "saving" && (
                <p className="funds-demo__line">
                  Mục tiêu:{" "}
                  <strong>
                    {f.targetAmount.toLocaleString()} {f.currency}
                  </strong>
                </p>
              )}
              {f.type === "spending" && f.budgetName && (
                <p className="funds-demo__line">
                  Ngân sách: <strong>{f.budgetName}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const renderGroupFund = () => (
    <>
      <form className="fund-layout" onSubmit={handleSubmitGroup}>
        <div className="fund-layout__left">
          <div className="fund-toggle">
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (groupType === "saving"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setGroupType("saving")}
            >
              Quỹ tiết kiệm nhóm
            </button>
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (groupType === "spending"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setGroupType("spending")}
            >
              Quỹ tiêu dùng nhóm
            </button>
            <button
              type="button"
              className={
                "fund-toggle__item" +
                (groupType === "custom"
                  ? " fund-toggle__item--active"
                  : "")
              }
              onClick={() => setGroupType("custom")}
            >
              Quỹ tự tạo nhóm
            </button>
          </div>

          <div className="fund-layout__content">
            {/* reuse các section cá nhân cho quỹ nhóm */}
            {groupType === "saving" && renderSavingSection()}
            {groupType === "spending" && renderSpendingSection()}
            {groupType === "custom" && renderCustomSection()}

            {/* Quản lý thành viên */}
            <div className="fund-card fund-card--members">
              <div className="fund-card__header">
                <h2>Thành viên & phân quyền</h2>
                <p>
                  Người tạo quỹ có <strong>full quyền</strong> (xem / sửa / xóa
                  / thêm thành viên).
                </p>
              </div>

              <div className="fund-row">
                <ul className="fund-members">
                  {members.map((m) => (
                    <li key={m.id} className="fund-members__item">
                      <div>
                        <div className="fund-members__name">{m.name}</div>
                        <div className="fund-members__email">
                          {m.email}
                        </div>
                      </div>
                      <div className="fund-members__right">
                        <span className="fund-badge">
                          {m.role === "owner"
                            ? "Owner (Full quyền)"
                            : m.role === "view"
                            ? "Xem"
                            : "Nạp tiền"}
                        </span>
                        {m.role !== "owner" && (
                          <button
                            type="button"
                            className="fund-btn fund-btn--ghost"
                            onClick={() => handleRemoveMember(m.id)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="fund-row fund-row--grid">
                <div>
                  <label className="fund-label">Tên thành viên</label>
                  <input
                    type="text"
                    className="fund-input"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="fund-label">Email</label>
                  <input
                    type="email"
                    className="fund-input"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="member@example.com"
                  />
                </div>
                <div>
                  <label className="fund-label">Quyền</label>
                  <select
                    className="fund-input"
                    value={newMember.role}
                    onChange={(e) =>
                      setNewMember((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                  >
                    {MEMBER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="fund-note fund-note--small">
                    Quyền xem: chỉ xem giao dịch & số dư. Quyền nạp tiền:
                    được tạo giao dịch nạp, rút tiền cần admin (owner)
                    duyệt.
                  </p>
                </div>
              </div>

              <div className="fund-row">
                <button
                  type="button"
                  className="fund-btn fund-btn--outline"
                  onClick={handleAddMember}
                >
                  Thêm thành viên
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="fund-layout__right">
          <div className="fund-summary">
            <h3>Tóm tắt quỹ nhóm</h3>
            <p>
              Người tạo quỹ là <strong>Owner</strong>, có toàn quyền. Các
              thành viên khác có quyền xem hoặc nạp tiền, rút tiền cần
              owner xác nhận.
            </p>
            <ul className="fund-summary__list">
              <li>
                <span>Số thành viên:</span>
                <strong>{members.length}</strong>
              </li>
            </ul>
            <button
              type="submit"
              className="fund-btn fund-btn--primary"
            >
              Lưu quỹ nhóm (Demo)
            </button>
            <p className="fund-note fund-note--small">
              Hiện tại thao tác này chỉ thêm vào danh sách demo bên dưới
              và log dữ liệu ra console. Sau này bạn gắn API tạo quỹ nhóm
              & phân quyền.
            </p>
          </div>
        </aside>
      </form>

      {/* Danh sách quỹ nhóm demo */}
      <section className="funds-demo">
        <h3>Danh sách quỹ nhóm (DEMO)</h3>
        <div className="funds-demo__grid">
          {groupFunds.map((f) => (
            <div key={f.id} className="funds-demo__item">
              <div className="funds-demo__title">{f.name}</div>
              <div className="funds-demo__meta">
                <span className="fund-badge">
                  {f.type === "saving"
                    ? "Tiết kiệm nhóm"
                    : f.type === "spending"
                    ? "Tiêu dùng nhóm"
                    : "Tự tạo nhóm"}
                </span>
                <span>{f.members} thành viên</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className="funds-page">
      <header className="funds-page__header">
        <div>
          <h1>Quản lý quỹ</h1>
          <p>
            Tạo quỹ cá nhân và quỹ nhóm để quản lý tiết kiệm, tiêu dùng và
            các mục tiêu tài chính riêng.
          </p>
        </div>
        <div className="funds-page__tabs">
          <button
            type="button"
            className={
              "funds-tab" +
              (mode === "personal" ? " funds-tab--active" : "")
            }
            onClick={() => setMode("personal")}
          >
            Quỹ cá nhân
          </button>
          <button
            type="button"
            className={
              "funds-tab" + (mode === "group" ? " funds-tab--active" : "")
            }
            onClick={() => setMode("group")}
          >
            Quỹ nhóm
          </button>
        </div>
      </header>

      <main className="funds-page__body">
        {mode === "personal" ? renderPersonalFund() : renderGroupFund()}
      </main>
    </div>
  );
}
