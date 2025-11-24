// src/pages/Auth/LoginPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";

// API
import { login, loginWithGoogle } from "../../services/auth.service";
import { getProfile } from "../../services/profile.service";

// AUTH CONTEXT
import { useAuth } from "../../home/store/AuthContext";

// 🔥 CLIENT_ID phải TRÙNG với BE (spring.security.oauth2.client.registration.google.client-id)
const GOOGLE_CLIENT_ID =
  "418846497154-r9s0e5pgls2ucrnulgjeuk3v3uja1a6u.apps.googleusercontent.com";

export default function LoginPage() {
  const { login: authLogin } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [redirectPath, setRedirectPath] = useState("/home");

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  // Lấy token từ API response
  function extractToken(data) {
    return (
      data?.token ||
      data?.accessToken ||
      (typeof data === "string" ? data : null)
    );
  }

  // Sau khi có token (dùng chung login thường & Google)
  async function handleLoginSuccess(token) {
    if (!token) {
      setShowInvalid(true);
      return;
    }

    localStorage.setItem("accessToken", token);

    let targetPath = "/home";

    try {
      const meRes = await getProfile();
      // Backend trả về { user: { userId, fullName, email, ... } }
      // Hoặc có thể là meRes.data.user hoặc meRes.data
      let me = meRes.data || meRes;
      
      // Nếu có wrap trong { user: {...} }, lấy user ra
      if (me.user) {
        me = me.user;
      }
      
      // Đảm bảo có userId
      if (!me.userId && !me.id) {
        console.warn("Profile response không có userId:", me);
      }

      localStorage.setItem("user", JSON.stringify(me));

      const rawRoles = [];
      if (me.role) rawRoles.push(me.role);
      if (me.roleName) rawRoles.push(me.roleName);
      if (Array.isArray(me.roles)) rawRoles.push(...me.roles);
      if (Array.isArray(me.authorities)) {
        rawRoles.push(
          ...me.authorities.map((a) =>
            typeof a === "string" ? a : a.authority
          )
        );
      }

      const primaryRole =
        me.role ||
        me.roleName ||
        (Array.isArray(me.roles) && me.roles.length > 0
          ? me.roles[0]
          : "USER");

      const isAdmin = rawRoles.some(
        (r) => typeof r === "string" && r.toUpperCase().includes("ADMIN")
      );

      targetPath = isAdmin ? "/admin/users" : "/home";

      // update AuthContext
      authLogin({
        id: me.id || me.userId,
        fullName: me.fullName || me.name || me.username || "",
        email: me.email,
        role: primaryRole,
        accessToken: token,
      });

      // Dispatch event để các context (WalletDataContext, CategoryDataContext) reload data
      window.dispatchEvent(new CustomEvent("userChanged"));

      setRedirectPath(targetPath);
    } catch (err) {
      console.error("Lỗi gọi /profile:", err);
      setRedirectPath("/home");

      authLogin({
        id: null,
        fullName: "",
        email: form.email,
        role: "USER",
        accessToken: token,
      });
    }

    setShowSuccess(true);
  }

  // GOOGLE callback
  async function handleGoogleLogin(response) {
    try {
      setLoading(true);
      setError("");

      const idToken = response.credential;
      if (!idToken) {
        return setError("Không lấy được idToken từ Google.");
      }

      const res = await loginWithGoogle({ idToken });
      
      // Kiểm tra response.ok thay vì dùng try-catch
      if (!res.response?.ok) {
        const status = res.response?.status;
        const msg =
          res.data?.message ||
          res.data?.error ||
          res.data?.msg ||
          "";
        const normMsg = msg.toLowerCase();

        // 1️⃣ TÀI KHOẢN BỊ KHÓA (ACCOUNT_LOCKED 403)
        if (
          status === 403 ||
          normMsg.includes("bị khóa") ||
          normMsg.includes("locked")
        ) {
          return setError(
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để mở khóa."
          );
        }

        // 2️⃣ TÀI KHOẢN BỊ XÓA / KHÔNG HOẠT ĐỘNG 30 NGÀY (USER_DELETED 410)
        if (
          status === 410 ||
          normMsg.includes("bị xóa") ||
          normMsg.includes("không hoạt động 30 ngày")
        ) {
          return setError(
            "Tài khoản của bạn đã bị xóa vì vi phạm bản quyền."
          );
        }

        // 3️⃣ USER CHƯA TỒN TẠI (phòng trường hợp backend trả 404)
        if (
          status === 404 ||
          normMsg.includes("không tồn tại") ||
          normMsg.includes("chưa được tạo")
        ) {
          return setError(
            "Tài khoản chưa được tạo. Vui lòng đăng ký hoặc đăng nhập bằng Google."
          );
        }

        // 4️⃣ Sai / hết hạn Google token hoặc lỗi 500
        if (
          status === 500 ||
          normMsg.includes("google token không hợp lệ") ||
          normMsg.includes("xác thực google thất bại") ||
          normMsg.includes("id token không hợp lệ")
        ) {
          return setError("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
        }
        
        // 5️⃣ Lỗi client ID không khớp
        if (
          normMsg.includes("origin is not allowed") ||
          normMsg.includes("client id") ||
          status === 403
        ) {
          return setError("Cấu hình Google OAuth chưa đúng. Vui lòng liên hệ quản trị viên.");
        }

        // 5️⃣ Lỗi khác - không hiển thị "Sai email hoặc mật khẩu"
        return setError(msg || "Lỗi đăng nhập Google. Vui lòng thử lại sau.");
      }

      // Nếu thành công, lấy token và đăng nhập
      const token = extractToken(res.data);
      if (!token) {
        return setError("Không nhận được token từ server. Vui lòng thử lại.");
      }

      await handleLoginSuccess(token);
    } catch (err) {
      console.error("Login Google lỗi:", err);
      setError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  // Load Google Identity Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
        });

        const btn = document.getElementById("googleSignInDiv");
        if (btn) {
          window.google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
            width: "100%",
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Submit login thường
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return setError("Vui lòng nhập đầy đủ email và mật khẩu!");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return setError("Email không hợp lệ!");
    }

    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\\[\]{};':"\\|,.<>/?~]).{8,}$/;
    if (!strongRegex.test(form.password)) {
      return setError(
        "Mật khẩu phải có ít nhất 8 ký tự, gồm hoa – thường – số – ký tự đặc biệt."
      );
    }

    try {
      setLoading(true);
      setError("");

      const res = await login(form);
      
      // Kiểm tra nếu response không ok (có lỗi)
      if (!res.response?.ok) {
        const status = res.response?.status;
        const errorCode = res.data?.code;
        const msg =
          res.data?.message ||
          res.data?.error ||
          res.data?.msg ||
          "";
        const normMsg = msg.toLowerCase();

        // 1️⃣ TÀI KHOẢN KHÔNG TỒN TẠI (USER_NOT_FOUND) - ƯU TIÊN KIỂM TRA TRƯỚC
        if (
          errorCode === "USER_NOT_FOUND" ||
          status === 404 ||
          normMsg.includes("không tồn tại trong hệ thống") ||
          normMsg.includes("email không tồn tại") ||
          normMsg.includes("không tồn tại")
        ) {
          return setError("Tài khoản chưa đăng ký");
        }

        // 2️⃣ TÀI KHOẢN BỊ KHÓA (ACCOUNT_LOCKED 403)
        if (
          errorCode === "ACCOUNT_LOCKED" ||
          status === 403 ||
          normMsg.includes("bị khóa") ||
          normMsg.includes("locked")
        ) {
          return setError(
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để mở khóa."
          );
        }

        // 3️⃣ TÀI KHOẢN BỊ XÓA / KHÔNG HOẠT ĐỘNG (USER_DELETED 410)
        if (
          errorCode === "USER_DELETED" ||
          status === 410 ||
          normMsg.includes("bị xóa") ||
          normMsg.includes("không hoạt động 30 ngày")
        ) {
          return setError(
            "Tài khoản của bạn đã bị xóa vì vi phạm bản quyền."
          );
        }

        // 4️⃣ TÀI KHOẢN GOOGLE CHƯA ĐẶT PASSWORD (GOOGLE_ACCOUNT_ONLY)
        if (
          errorCode === "GOOGLE_ACCOUNT_ONLY" ||
          normMsg.includes("tài khoản google")
        ) {
          return setError(
            "Tài khoản Google chưa đặt mật khẩu. Vui lòng đăng nhập Google để đặt mật khẩu mới."
          );
        }

        // 5️⃣ SAI MẬT KHẨU (INVALID_CREDENTIALS) - Hiển thị modal "Sai email hoặc mật khẩu"
        if (
          errorCode === "INVALID_CREDENTIALS" ||
          (status === 400 && errorCode !== "USER_NOT_FOUND") || // Nếu status 400 nhưng không phải USER_NOT_FOUND, có thể là sai mật khẩu
          (status === 401 && errorCode !== "USER_NOT_FOUND") // Nếu status 401 nhưng không phải USER_NOT_FOUND, có thể là sai mật khẩu
        ) {
          return setShowInvalid(true);
        }

        // Fallback
        return setError(msg || "Không kết nối được máy chủ (cổng 8080).");
      }

      // Nếu thành công, lấy token và đăng nhập
      const token = extractToken(res.data);
      await handleLoginSuccess(token);
    } catch (err) {
      console.error("Lỗi login:", err);
      setError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
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
            name="email"
            className="form-control"
            placeholder="Nhập email"
            value={form.email}
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
            name="password"
            className="form-control"
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={onChange}
            required
          />
          
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="d-grid mt-3 mb-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </div>

        <div className="text-center">
          <Link to="/forgot-password" className="me-3">
            Quên mật khẩu?
          </Link>
          <Link to="/register">Chưa có tài khoản?</Link>
        </div>

        <div className="d-flex align-items-center my-3">
          <hr className="flex-grow-1" />
          <span className="mx-2 text-muted">Hoặc</span>
          <hr className="flex-grow-1" />
        </div>

        <div className="d-grid">
          <div id="googleSignInDiv" />
        </div>
      </form>

      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng nhập"
        message="Đăng nhập thành công!"
        redirectUrl={redirectPath}
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
