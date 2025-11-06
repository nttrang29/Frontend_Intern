import { useEffect, useRef, useState } from "react";
import useOnClickOutside from "../../../hooks/useOnClickOutside";
import { fetchNotifications } from "../../../services/notification.service";
import NotificationList from "./NotificationList";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useOnClickOutside(popRef, () => setOpen(false));

  useEffect(() => {
    if (open && !items.length) fetchNotifications().then(setItems);
  }, [open, items.length]);

  const unread = items.length;

  return (
    <div className="tb__dd" ref={popRef}>
      <button ref={btnRef} className="tb__icon" title="Notifications" onClick={() => setOpen((v) => !v)}>
        🔔
        {unread > 0 && <span className="tb__badge">{unread}</span>}
      </button>

      {open && (
        <div className="dd__panel" style={{ width: 320 }}>
          <div className="dd__head">Thông báo</div>
          <NotificationList items={items} />
          <div className="dd__foot">
            <button className="btn btn-sm btn-light" onClick={() => setItems([])}>Đánh dấu đã đọc</button>
          </div>
        </div>
      )}
    </div>
  );
}
