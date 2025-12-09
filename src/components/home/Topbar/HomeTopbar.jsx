import "../../../styles/pages/Topbar.css";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import GlobalSearch from "../../common/GlobalSearch";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { normalizeUserProfile } from "../../../utils/userProfile";

export default function HomeTopbar() {
  const [userName, setUserName] = useState("Người dùng");
  const [userAvatar, setUserAvatar] = useState("https://www.gravatar.com/avatar/?d=mp&s=40");
  const { t } = useLanguage();

  useEffect(() => {
    // 1. Tạo một hàm riêng để load/reload user từ localStorage
    const loadUserFromStorage = () => {
      console.log("HomeTopbar: Hàm loadUserFromStorage() ĐƯỢC GỌI.");
      try {
        const raw = localStorage.getItem("user");
        if (!raw) return;
        
        const normalizedUser = normalizeUserProfile(JSON.parse(raw) || {});
        const newFullName =
          normalizedUser?.fullName ||
          normalizedUser?.username ||
          normalizedUser?.email ||
          "Người dùng";

        // 2. Đọc avatar với fallback đã normalize
        const newAvatar =
          normalizedUser?.avatar ||
          "https://www.gravatar.com/avatar/?d=mp&s=40"; // Ảnh dự phòng
        
        // Cập nhật state để trigger re-render
        setUserName(newFullName);
        setUserAvatar(newAvatar);
        
        console.log("HomeTopbar: Đã cập nhật avatar mới:", newAvatar?.substring(0, 50) + "...");
      } catch (error) {
        console.error("HomeTopbar: Lỗi khi load user từ localStorage:", error);
        // Giữ fallback mặc định nếu parse JSON lỗi
      }
    };

    // 3. Chạy hàm này lần đầu khi component mount
    loadUserFromStorage();

    // 4. ✅ Lắng nghe tín hiệu từ SettingsPage khi profile được cập nhật
    window.addEventListener('storageUpdated', loadUserFromStorage);

    // 5. Dọn dẹp: Xóa listener khi component unmount (rời khỏi trang)
    return () => {
      window.removeEventListener('storageUpdated', loadUserFromStorage);
    };
  }, []); // useEffect này chỉ chạy 1 lần duy nhất khi component mount

  return (
    <header className="tb__wrap" role="banner">
      {/* Trái: chào người dùng */}
      <div className="tb__left">
        <div className="tb__welcome">{t("topbar.welcome").replace("{name}", userName)}</div>
      </div>

      {/* Phải: Global Search + actions */}
      <div className="tb__right">
        <GlobalSearch />

        <div className="tb__actions" role="group" aria-label="Tác vụ topbar">
          <div className="tb__divider" aria-hidden="true" />
          <NotificationBell />
          <div className="tb__divider" aria-hidden="true" />
          {/* Truyền avatarUrl đã được cập nhật vào UserMenu */}
          <UserMenu avatarUrl={userAvatar} />
        </div>
      </div>
    </header>
  );
}