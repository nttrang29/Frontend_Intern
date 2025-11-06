import "../../../styles/home/Topbar.css";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { useEffect, useState } from "react";

export default function HomeTopbar() {
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;

      const u = JSON.parse(raw);
      setUserName(u.fullName || u.username || u.email || "Người dùng");

      // Ưu tiên ảnh Google OAuth -> fallback ảnh hệ thống
      const avatar =
        u.picture ||            // Google OAuth
        u.avatarUrl ||          // nếu backend lưu trường này
        "https://www.gravatar.com/avatar/?d=mp&s=40"; // fallback mặc định

      setUserAvatar(avatar);
    } catch (e) {
      // nếu JSON lỗi, dùng fallback
      setUserAvatar("https://www.gravatar.com/avatar/?d=mp&s=40");
    }
  }, []);

  return (
    <header className="tb__wrap">
      <div className="tb__welcome">Xin chào, {userName}!</div>

      <div className="tb__search tb__search--pill">
        <input placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
        <button className="tb__search-btn" aria-label="Tìm kiếm">
          <i className="bi bi-search"></i>
        </button>
      </div>

      <div className="tb__actions">
        <div className="tb__divider" />
        <NotificationBell />
        <div className="tb__divider" />
        <UserMenu avatarUrl={userAvatar} />
      </div>
    </header>
  );
}
