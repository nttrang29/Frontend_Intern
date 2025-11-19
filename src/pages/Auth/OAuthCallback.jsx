import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 1. ✅ IMPORT HÀM getProfile TỪ SERVICE CỦA BẠN
// (Hãy đảm bảo đường dẫn này chính xác, ví dụ: ../../services/profile.service)
import { getProfile } from "../../services/profile.service";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation(); // Dùng hook của React-Router
  const [message, setMessage] = useState("Đang xác thực...");

  useEffect(() => {
    const processLogin = async () => {
      try {
        // 2. Lấy token từ URL
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const error = params.get("error");

        if (error) {
          throw new Error("Đăng nhập Google thất bại. Vui lòng thử lại.");
        }

        if (!token) {
          throw new Error("Không tìm thấy token xác thực.");
        }

        // 3. Lưu token vào localStorage
        // (Interceptor trong profile.service.js sẽ tự động đọc token này)
        localStorage.setItem("accessToken", token);

        // 4. ✅ SỬA LỖI: Dùng getProfile() (axios) để gọi /profile
        // Thay vì gọi /auth/me
        const { response, data } = await getProfile();

        if (!response.ok || !data.user) {
          // Xóa token hỏng nếu không lấy được profile
          localStorage.removeItem("accessToken");
          throw new Error(data.error || "Không thể lấy thông tin profile.");
        }

        // 5. ✅ SỬA LỖI: Lưu user object MỚI vào localStorage
        // (HomeTopbar sẽ đọc được cái này)
        localStorage.setItem("user", JSON.stringify(data.user));

        // 6. Bắn tín hiệu cho HomeTopbar cập nhật ngay lập tức
        window.dispatchEvent(new CustomEvent('storageUpdated'));
        
        // 7. ✅ Trigger event để CategoryDataContext reload categories
        window.dispatchEvent(new CustomEvent('userChanged'));

        // 7. Chuyển hướng
        setMessage("Đăng nhập Google thành công! Đang chuyển hướng...");
        setTimeout(() => navigate("/home", { replace: true }), 800);

      } catch (e) {
        // Xử lý mọi lỗi
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setMessage(e.message || "Có lỗi khi xác thực. Vui lòng thử lại.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    };

    processLogin();
  }, [navigate, location]); // Thêm 'location' vào dependency

  return (
    <div className="container py-5 text-center">
      <div className="spinner-border" role="status" />
      <p className="mt-3">{message}</p>
    </div>
  );
}