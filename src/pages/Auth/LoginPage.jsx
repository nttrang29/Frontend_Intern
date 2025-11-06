import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";

const API_URL = "http://localhost:8080/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return setError("Vui lòng nhập đầy đủ email và mật khẩu!");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return setError("Email không hợp lệ! Vui lòng nhập đúng định dạng.");
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'\",.<>\/?~]).{8,}$/;

    if (form.password.length < 8) {
      return setError("Mật khẩu phải có ít nhất 8 ký tự!");
    }
    if (!passwordRegex.test(form.password)) {
      return setError(
        "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt!"
      );
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      const data = await response.json();

     if (response.ok && data.accessToken) {
  // ✅ Lưu token như cũ
  localStorage.setItem("accessToken", data.accessToken);

  // ✅ Lưu thông tin user nếu backend trả kèm
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  } else {
    // 🔁 Fallback: gọi /auth/me để lấy thông tin user từ token
    try {
      const meRes = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` }
      });
      if (meRes.ok) {
        const me = await meRes.json();
        localStorage.setItem("user", JSON.stringify(me));
      }
    } catch (_) {
      // im lặng nếu lỗi, vẫn cho đăng nhập (vì đã có token)
    }
  }
        setShowSuccess(true);
      } else if (response.status === 401 || response.status === 400) {
        setShowInvalid(true);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError("Lỗi kết nối đến máy chủ. Vui lòng kiểm tra Backend (cổng 8080).");
      }
    } catch (err) {
      setError("Không thể kết nối server. Kiểm tra backend giúp nhé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={onSubmit}>
        <h3 className="text-center mb-4">Đăng nhập</h3>

        <div className="mb-3 input-group">
          <span className="input-group-text">
            <i className="bi bi-envelope-fill"></i>
          </span>
          <input
            type="email"
            className="form-control"
            name="email"
            placeholder="Nhập email"
            onChange={onChange}
            required
          />
        </div>

        <div className="mb-2 input-group">
          <span className="input-group-text">
            <i className="bi bi-lock-fill"></i>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            className="form-control"
            name="password"
            placeholder="Nhập mật khẩu"
            onChange={onChange}
            required
          />
          <span
            className="input-group-text eye-toggle"
            role="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="d-grid mb-3 mt-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </div>

        <div className="text-center">
          <Link to="/forgot-password" className="text-decoration-none link-hover me-3">
            Quên mật khẩu?
          </Link>
          <Link to="/register" className="text-decoration-none link-hover">
            Chưa có tài khoản?
          </Link>
        </div>

        <div className="d-flex align-items-center my-3">
          <hr className="flex-grow-1" />
          <span className="mx-2 text-muted">Hoặc đăng nhập bằng</span>
          <hr className="flex-grow-1" />
        </div>

        <div className="d-grid gap-2">
  <button
  type="button"
  className="btn btn-outline-danger"
  onClick={() => {
    const callback = `${window.location.origin}/oauth/callback`;
    window.location.href = `${API_URL}/oauth2/authorization/google?redirect_uri=${encodeURIComponent(callback)}`;
  }}
>
  <i className="bi bi-google me-2"></i> Google
</button>
</div>

      </form>

      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng nhập"
        message="Đăng nhập thành công!"
        redirectUrl="/home"
      />

      <AccountExistsModal
        open={showInvalid}
        onClose={() => setShowInvalid(false)}
        seconds={3}
        title="Đăng nhập"
        message="Sai email hoặc mật khẩu!"
      />
    </AuthLayout>
  );
}
