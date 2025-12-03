// src/components/home/Topbar/NotificationList.jsx

// chọn icon + nhãn theo loại thông báo
function getIconAndLabel(type) {
  switch (type) {
    case "user_feedback":
      return {
        icon: "bi-chat-left-text",
        label: "Đánh giá mới",
      };
    case "admin_reply":
      return {
        icon: "bi-reply-fill",
        label: "Phản hồi của admin",
      };
    case "fund_warning":
      return {
        icon: "bi-exclamation-triangle-fill",
        label: "Cảnh báo quỹ",
      };
    case "fund_reminder":
      return {
        icon: "bi-bell-fill",
        label: "Nhắc nạp tiền",
      };
    case "fund_auto_deposit":
      return {
        icon: "bi-check-circle-fill",
        label: "Nạp tự động",
      };
    default:
      return {
        icon: "bi-bell-fill",
        label: "Thông báo",
      };
  }
}

export default function NotificationList({ items = [], onItemClick }) {
  // EMPTY STATE xịn xò
  if (!items.length) {
    return (
      <div className="notif-empty">
        <div className="notif-empty__icon">
          <i className="bi bi-bell-slash" />
        </div>
        <div className="notif-empty__title">Chưa có thông báo</div>
        <div className="notif-empty__desc">
          Mọi hoạt động quan trọng (đánh giá, phản hồi, cảnh báo chi tiêu...)
          sẽ hiển thị tại đây.
        </div>
      </div>
    );
  }

  return (
    <ul className="dd__list notif-list">
      {items.map((n) => {
        const { icon, label } = getIconAndLabel(n.type);

        const title = n.title || "Thông báo";
        const desc = n.desc || "";
        const time = n.timeLabel || "Vừa xong";

        return (
          <li
            key={n.id}
            className={
              "dd__item notif-item " + (n.read ? "notif-item--read" : "")
            }
            onClick={() => onItemClick && onItemClick(n)}
          >
            {/* ICON TRÒN BÊN TRÁI */}
            <div className="notif-item__icon-wrap">
              <div className="notif-item__icon">
                <i className={`bi ${icon}`} />
              </div>
            </div>

            {/* TEXT BÊN PHẢI */}
            <div className="notif-item__content">
              {/* hàng 1: tiêu đề + badge type */}
              <div className="notif-item__title-row">
                <span className="notif-item__title">{title}</span>
                <span className="notif-item__type-badge">{label}</span>
              </div>

              {/* hàng 2: mô tả */}
              {desc && (
                <div className="notif-item__desc">{desc}</div>
              )}

              {/* hàng 3: thời gian + trạng thái */}
              <div className="notif-item__meta">
                <span className="notif-item__time">{time}</span>
                <span
                  className={
                    "notif-item__status " +
                    (n.read
                      ? "notif-item__status--read"
                      : "notif-item__status--unread")
                  }
                >
                  {n.read ? "Đã xem" : "Mới"}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}