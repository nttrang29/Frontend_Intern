import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";

// NOTE: API_URL không còn dùng khi ở chế độ offline/fake
// const API_URL = "http://localhost:8080/auth";

export default function LoginPage() {
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

  // helper: read/write fake users from localStorage
  const readFakeUsers = () => {
    try {
      const raw = localStorage.getItem("fakeUsers");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeFakeUsers = (arr) => {
    localStorage.setItem("fakeUsers", JSON.stringify(arr));
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

      // --- OFFLINE / FAKE LOGIN LOGIC ---
      // Lấy danh sách fakeUsers từ localStorage
      const users = readFakeUsers();
      const existing = users.find((u) => u.email === form.email);

      if (existing) {
        // user đã tồn tại -> verify password
        if (existing.password === form.password) {
          // thành công
          const fakeToken = `fake-token-${Date.now()}`;
          localStorage.setItem("accessToken", fakeToken);
          // lưu user (không lưu password)
          const safeUser = { email: existing.email, fullName: existing.fullName || existing.email };
          localStorage.setItem("user", JSON.stringify(safeUser));
          setShowSuccess(true);
        } else {
          // mật khẩu sai
          setShowInvalid(true);
        }
      } else {
        // user chưa tồn tại -> tự động tạo tài khoản ảo rồi login
        const newUser = {
          email: form.email,
          password: form.password, // chỉ lưu nội bộ fakeUsers; không dùng ngoài
          fullName: form.email.split("@")[0],
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        writeFakeUsers(users);

        const fakeToken = `fake-token-${Date.now()}`;
        localStorage.setItem("accessToken", fakeToken);
        const safeUser = { email: newUser.email, fullName: newUser.fullName };
        localStorage.setItem("user", JSON.stringify(safeUser));
        setShowSuccess(true);
      }
      // --- END OFFLINE LOGIC ---
    } catch (err) {
      console.error(err);
      setError("Có lỗi nội bộ khi xử lý tài khoản ảo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={onSubmit}>
        <h3 className="text-center mb-4">Đăng nhập (Chế độ giả lập)</h3>

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
            value={form.email}
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
            value={form.password}
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
            {loading ? "Đang xử lý..." : "Đăng nhập / Tạo tài khoản ảo"}
          </button>
        </div>

        <div className="text-center">
          <Link to="/forgot-password" className="text-decoration-none link-hover me-3">
            Quên mật khẩu?
          </Link>
          <Link to="/register" className="text-decoration-none link-hover">
            (Hoặc trang đăng ký)
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
            onClick={() => alert("Oauth Google tắt trong chế độ giả lập (offline).")}
          >
            <i className="bi bi-google me-2"></i> Google (disabled)
          </button>
        </div>
      </form>

      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng nhập"
        message="Đăng nhập thành công (chế độ giả lập)!"
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
