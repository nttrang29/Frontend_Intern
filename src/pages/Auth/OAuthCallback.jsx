import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8080/auth";

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang xác thực...");

  useEffect(() => {
    (async () => {
      try {
        // 1) Trường hợp BE trả token qua URL: ?token=xxx
        const token = getQueryParam("token");
        const error = getQueryParam("error");

        if (error) {
          setMessage("Đăng nhập Google thất bại. Vui lòng thử lại.");
          setTimeout(() => navigate("/login", { replace: true }), 1500);
          return;
        }

        if (token) {
          // Lưu token -> lấy thông tin user
          localStorage.setItem("accessToken", token);

          try {
            const meRes = await fetch(`${API_URL}/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              const me = await meRes.json();
              localStorage.setItem("user", JSON.stringify(me));
            }
          } catch (_) { /* bỏ qua lỗi, vẫn cho vào hệ thống vì đã có token */ }

          setMessage("Đăng nhập Google thành công! Đang chuyển hướng...");
          setTimeout(() => navigate("/home", { replace: true }), 800);
          return;
        }

        // 2) Trường hợp BE dùng cookie HttpOnly (không trả token trên URL)
        // -> Gọi /auth/me với credentials: 'include' để gửi cookie
        const meRes = await fetch(`${API_URL}/me`, {
          method: "GET",
          credentials: "include",            // QUAN TRỌNG: gửi cookie cùng request
        });

        if (meRes.ok) {
          const me = await meRes.json();
          localStorage.setItem("user", JSON.stringify(me));
          // Nếu BE còn trả kèm accessToken trong body thì bạn có thể lưu thêm:
          // localStorage.setItem("accessToken", me.accessToken);
          setMessage("Đăng nhập Google thành công! Đang chuyển hướng...");
          setTimeout(() => navigate("/home", { replace: true }), 800);
        } else {
          setMessage("Không tìm thấy phiên đăng nhập. Vui lòng thử lại.");
          setTimeout(() => navigate("/login", { replace: true }), 1200);
        }
      } catch (e) {
        setMessage("Có lỗi khi xác thực. Vui lòng thử lại.");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      }
    })();
  }, [navigate]);

  return (
    <div className="container py-5 text-center">
      <div className="spinner-border" role="status" />
      <p className="mt-3">{message}</p>
    </div>
  );
}
