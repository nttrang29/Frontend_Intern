import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";

import { useAuth, ROLES } from "../../home/store/AuthContext";

// Danh sách tài khoản ảo
const FAKE_USERS = [
  {
    id: "1",
    fullName: "Admin System",
    email: "admin@wallet.com",
    password: "Admin123!",
    role: ROLES.ADMIN,
  },
  {
    id: "2",
    fullName: "User Normal",
    email: "user@wallet.com",
    password: "User123!",
    role: ROLES.USER,
  },
  {
    id: "3",
    fullName: "Viewer Only",
    email: "viewer@wallet.com",
    password: "Viewer123!",
    role: ROLES.VIEWER,
  },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [error, setError] = useState("");
  const [successRedirect, setSuccessRedirect] = useState("/home"); // redirect khác nhau theo role

  const { login } = useAuth();

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

    setLoading(true);

    // 🔍 Tìm user trong danh sách ảo
    const foundUser = FAKE_USERS.find(
      (u) =>
        u.email.toLowerCase() === form.email.toLowerCase() &&
        u.password === form.password
    );

    if (!foundUser) {
      setShowInvalid(true);
      setLoading(false);
      return;
    }

    // Tạo object user chuẩn
    const finalUser = {
      id: foundUser.id,
      fullName: foundUser.fullName,
      email: foundUser.email,
      role: foundUser.role,
      accessToken: "FAKE_TOKEN_" + foundUser.role, // cho vui, để chỗ khác nếu có check token
    };

    // Lưu vào AuthContext + localStorage
    login(finalUser);

    // ✅ Admin → /admin/users, còn lại → /home
    if (foundUser.role === ROLES.ADMIN) {
      setSuccessRedirect("/admin/users");
    } else {
      setSuccessRedirect("/home");
    }

    setLoading(false);
    setShowSuccess(true);
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
           type="password"
            className="form-control"
            name="password"
            placeholder="Nhập mật khẩu"
            onChange={onChange}
            required
          />
          
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="d-grid mb-3 mt-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </div>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-decoration-none link-hover me-3"
          >
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

        {/* Đang dùng demo local nên tạm disable Google */}
        <div className="d-grid gap-2">
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled
            title="Đã tắt trong chế độ demo"
          >
            <i className="bi bi-google me-2"></i> Google (đã tắt ở chế độ demo)
          </button>
        </div>
      </form>

      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng nhập"
        message="Đăng nhập thành công!"
        redirectUrl={successRedirect}   // 👈 Dùng redirect động
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
