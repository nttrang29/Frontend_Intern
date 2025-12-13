// src/pages/Auth/LoginPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";

// API
import { login, loginWithGoogle } from "../../services/auth.service";
import { getProfile, updateProfile } from "../../services/profile.service";
import { verify2FA, resetTemporary2FA } from "../../services/2fa.service";

// AUTH CONTEXT
import { useAuth } from "../../contexts/AuthContext";
import { normalizeUserProfile } from "../../utils/userProfile";

// 🔥 CLIENT_ID phải TRÙNG với BE (spring.security.oauth2.client.registration.google.client-id)
const GOOGLE_CLIENT_ID =
  "418846497154-r9s0e5pgls2ucrnulgjeuk3v3uja1a6u.apps.googleusercontent.com";

const decodeJwtPayload = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${("00" + char.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn("Không thể giải mã Google ID token:", error);
    return null;
  }
};

export default function LoginPage() {
  const { login: authLogin } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [redirectPath, setRedirectPath] = useState("/home");
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAAttempts, setTwoFAAttempts] = useState(0);
  const [twoFALockedUntil, setTwoFALockedUntil] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showForgot2FA, setShowForgot2FA] = useState(false);
  const [reset2FALoading, setReset2FALoading] = useState(false);
  const [reset2FASuccess, setReset2FASuccess] = useState(false);

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
  async function handleLoginSuccess(token, options = {}) {
    if (!token) {
      setShowInvalid(true);
      return;
    }

    localStorage.setItem("accessToken", token);

    let targetPath = "/home";
    const { fallbackAvatarUrl, fallbackFullName } = options;

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
      let normalizedUser = normalizeUserProfile(me, {
        fallbackAvatarUrl,
        fallbackFullName,
      });

      if ((!normalizedUser || !normalizedUser.avatar) && fallbackAvatarUrl) {
        try {
          const avatarUpdateRes = await updateProfile({
            fullName:
              normalizedUser?.fullName ||
              normalizedUser?.name ||
              fallbackFullName,
            avatar: fallbackAvatarUrl,
          });

          if (avatarUpdateRes?.response?.ok && avatarUpdateRes.data?.user) {
            normalizedUser = normalizeUserProfile(avatarUpdateRes.data.user);
          } else {
            normalizedUser = {
              ...(normalizedUser || me),
              avatar: fallbackAvatarUrl,
            };
          }
        } catch (avatarSyncError) {
          console.warn("Không thể đồng bộ avatar Google:", avatarSyncError);
          normalizedUser = {
            ...(normalizedUser || me),
            avatar: fallbackAvatarUrl,
          };
        }
      }

      const userToPersist = normalizedUser || me;
      if (!userToPersist) {
        throw new Error("Không lấy được thông tin người dùng sau khi đăng nhập");
      }
      localStorage.setItem("user", JSON.stringify(userToPersist));

      const rawRoles = [];
      if (userToPersist?.role) rawRoles.push(userToPersist.role);
      if (userToPersist?.roleName) rawRoles.push(userToPersist.roleName);
      if (Array.isArray(userToPersist?.roles))
        rawRoles.push(...userToPersist.roles);
      if (Array.isArray(userToPersist?.authorities)) {
        rawRoles.push(
          ...userToPersist.authorities.map((a) =>
            typeof a === "string" ? a : a.authority
          )
        );
      }

      const primaryRole =
        userToPersist?.role ||
        userToPersist?.roleName ||
        (Array.isArray(userToPersist?.roles) && userToPersist.roles.length > 0
          ? userToPersist.roles[0]
          : "USER");

      const isAdmin = rawRoles.some(
        (r) => typeof r === "string" && r.toUpperCase().includes("ADMIN")
      );

      targetPath = isAdmin ? "/admin/users" : "/home";

      // update AuthContext
      authLogin({
        id: userToPersist?.id || userToPersist?.userId,
        fullName:
          userToPersist?.fullName ||
          userToPersist?.name ||
          userToPersist?.username ||
          fallbackFullName ||
          "",
        email: userToPersist?.email,
        role: primaryRole,
        accessToken: token,
      });

      // Dispatch event để các context (WalletDataContext, CategoryDataContext) reload data
      // QUAN TRỌNG: Dispatch cả storageUpdated để đảm bảo tương thích với Google OAuth
      window.dispatchEvent(new CustomEvent("userChanged"));
      window.dispatchEvent(new CustomEvent("storageUpdated"));

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

      const googleClaims = decodeJwtPayload(idToken);
      const googleAvatarUrl =
        googleClaims?.picture ||
        googleClaims?.pictureUrl ||
        googleClaims?.picture_url ||
        googleClaims?.image ||
        googleClaims?.imageUrl;
      const googleFullName = googleClaims?.name;
      const googleEmailClaim = googleClaims?.email;

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

      // Kiểm tra nếu cần xác thực 2FA
      if (res.data?.requires2FA) {
        // Với Google login, cần lấy email từ token hoặc response
        // Lưu token tạm thời để có thể lấy profile sau
        const tempToken = extractToken(res.data);
        if (tempToken) {
          localStorage.setItem("accessToken", tempToken);
          // Lấy email từ profile ngay lập tức
          try {
            const meRes = await getProfile();
            let me = meRes.data || meRes;
            if (me.user) {
              me = me.user;
            }
            const googleEmail = me.email || me.userEmail || me.username || "";
            if (googleEmail) {
              setLoginEmail(googleEmail.trim().toLowerCase());
            } else {
              // Nếu không lấy được từ profile, thử lấy từ response
              const emailFromResponse =
                res.data?.email ||
                res.data?.user?.email ||
                googleEmailClaim ||
                "";
              setLoginEmail(emailFromResponse.trim().toLowerCase() || null);
            }
          } catch (profileError) {
            console.error("Error getting profile for 2FA:", profileError);
            // Nếu không lấy được từ profile, thử lấy từ response
            const emailFromResponse =
              res.data?.email ||
              res.data?.user?.email ||
              googleEmailClaim ||
              "";
            setLoginEmail(emailFromResponse.trim().toLowerCase() || null);
          }
        } else {
          // Nếu không có token, thử lấy email từ response
          const emailFromResponse =
            res.data?.email ||
            res.data?.user?.email ||
            googleEmailClaim ||
            "";
          setLoginEmail(emailFromResponse.trim().toLowerCase() || null);
        }
        setShow2FA(true);
        setError("");
        return;
      }

      // Nếu thành công, lấy token và đăng nhập
      const token = extractToken(res.data);
      if (!token) {
        return setError("Không nhận được token từ server. Vui lòng thử lại.");
      }

      await handleLoginSuccess(token, {
        fallbackAvatarUrl: googleAvatarUrl,
        fallbackFullName: googleFullName,
      });
    } catch (err) {
      console.error("Login Google lỗi:", err);
      setError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  // Đếm ngược khi bị khóa
  useEffect(() => {
    if (twoFALockedUntil && new Date() < new Date(twoFALockedUntil)) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((new Date(twoFALockedUntil) - new Date()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          setCountdown(0);
          // Không reset attempts khi hết thời gian khóa, chỉ reset lock
          setTwoFALockedUntil(null);
          setTwoFAError("");
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(0);
    }
  }, [twoFALockedUntil]);

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
          const availableWidth = btn.offsetWidth || btn.clientWidth || 0;
          const normalizedWidth = availableWidth
            ? Math.min(380, Math.max(220, availableWidth))
            : 320;
          window.google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
            width: normalizedWidth,
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
          (status === 400 && errorCode !== "USER_NOT_FOUND") || 
          (status === 401 && errorCode !== "USER_NOT_FOUND") 
        ) {
          return setShowInvalid(true);
        }

        // Fallback
        return setError(msg || "Không kết nối được máy chủ (cổng 8080).");
      }

      // Kiểm tra nếu cần xác thực 2FA
      if (res.data?.requires2FA) {
        setLoginEmail(form.email);
        setShow2FA(true);
        setError("");
        return;
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

  // Xử lý xác thực 2FA
  const handle2FASubmit = async (e) => {
    e.preventDefault();

    // Kiểm tra nếu bị khóa
    if (twoFALockedUntil && new Date() < new Date(twoFALockedUntil)) {
      return;
    }

    if (!twoFACode || twoFACode.length !== 6) {
      setTwoFAError("Vui lòng nhập mã xác thực 6 số");
      return;
    }

    try {
      setTwoFALoading(true);
      setTwoFAError("");

      // Lấy email từ form hoặc từ state
      // Với Google login, không dùng form.email vì có thể là email chưa đăng ký
      // Chỉ dùng loginEmail (email từ Google account thực tế)
      if (!loginEmail) {
        setTwoFAError("Không tìm thấy email. Vui lòng đăng nhập lại.");
        return;
      }
      const email = loginEmail;

      const res = await verify2FA(email, twoFACode);

      if (!res.response?.ok) {
        const newAttempts = twoFAAttempts + 1;
        setTwoFAAttempts(newAttempts);

        // Tính số lần sai trong chu kỳ hiện tại (mỗi chu kỳ 3 lần)
        const attemptsInCycle = ((newAttempts - 1) % 3) + 1;
        const remainingInCycle = 3 - attemptsInCycle;

        // Kiểm tra nếu đã sai đủ 3 lần trong chu kỳ hiện tại
        if (attemptsInCycle === 3) {
          // Tính thời gian khóa dựa trên tổng số lần sai
          let lockDurationMs;
          let lockDurationSeconds;
          let lockMessage;

          if (newAttempts <= 3) {
            // Lần 1-3: 60 giây
            lockDurationMs = 60000;
            lockDurationSeconds = 60;
            lockMessage = "Bạn đã nhập sai quá 3 lần. Vui lòng đợi 1 phút.";
          } else if (newAttempts <= 6) {
            // Lần 4-6: 5 phút
            lockDurationMs = 300000;
            lockDurationSeconds = 300;
            lockMessage = "Bạn đã nhập sai quá 6 lần. Vui lòng đợi 5 phút.";
          } else if (newAttempts <= 9) {
            // Lần 7-9: 15 phút
            lockDurationMs = 900000;
            lockDurationSeconds = 900;
            lockMessage = "Bạn đã nhập sai quá 9 lần. Vui lòng đợi 15 phút.";
          } else {
            // Lần 10-12: 30 phút
            lockDurationMs = 1800000;
            lockDurationSeconds = 1800;
            lockMessage = "Bạn đã nhập sai quá 12 lần. Vui lòng đợi 30 phút.";
          }

          const lockUntil = new Date(Date.now() + lockDurationMs);
          setTwoFALockedUntil(lockUntil);
          setCountdown(lockDurationSeconds);
          setTwoFAError(lockMessage);
        } else {
          // Chưa đủ 3 lần trong chu kỳ, hiển thị số lần còn lại
          setTwoFAError(`Mã pin không đúng. Bạn còn ${remainingInCycle} lần nhập.`);
        }
        return;
      }

      // Thành công, lấy token và đăng nhập
      const token = extractToken(res.data);
      await handleLoginSuccess(token);
      setShow2FA(false);
      setTwoFACode("");
      // Reset attempts khi đăng nhập thành công
      setTwoFAAttempts(0);
      setTwoFALockedUntil(null);
      setCountdown(0);
    } catch (err) {
      console.error("Lỗi verify 2FA:", err);
      setTwoFAError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setTwoFALoading(false);
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
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((v) => !v)}
          >
            <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
          </button>
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
          <span className="mx-2 text-muted">Hoặc đăng nhập bằng</span>
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

      {/* Modal xác thực 2FA */}
      {show2FA && (
        <div className="modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "90%"
          }}>
            <h3 className="text-center mb-3">Xác thực 2 lớp</h3>
            <p className="text-center text-muted mb-4">
              Vui lòng nhập mã pin 6 số bạn đã tạo trong cài đặt.
            </p>
            <form onSubmit={handle2FASubmit}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Nhập mã 6 số"
                  value={twoFACode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFACode(value);
                    setTwoFAError("");
                  }}
                  maxLength={6}
                  style={{
                    fontSize: twoFACode ? "1.75rem" : "1rem",
                    letterSpacing: twoFACode ? "0.6rem" : "normal",
                    fontWeight: "600",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: "#1a1a1a",
                    padding: "1rem 1.25rem",
                    border: "2px solid #d1d5db",
                    borderRadius: "12px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                  }}
                  disabled={twoFALoading || countdown > 0}
                />
              </div>
              
              {/* Link "Bạn quên mã xác thực?" */}
              {!showForgot2FA && (
                <div className="text-center mb-3">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => setShowForgot2FA(true)}
                    style={{
                      color: "#6c757d",
                      textDecoration: "none",
                      fontSize: "0.9rem"
                    }}
                    onMouseEnter={(e) => e.target.style.color = "#495057"}
                    onMouseLeave={(e) => e.target.style.color = "#6c757d"}
                  >
                    Bạn quên mã xác thực?
                  </button>
                </div>
              )}

              {/* Nút khi bấm "Bạn quên mã xác thực?" */}
              {showForgot2FA && (
                <div className="d-grid gap-2 mb-3">
                  {reset2FASuccess ? (
                    <div className="alert alert-success mb-0" role="alert">
                      Đã gửi mã xác thực tạm thời tới email của bạn. Vui lòng kiểm tra hộp thư.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={async () => {
                          // Với Google login, không dùng form.email vì có thể là email chưa đăng ký
                          // Chỉ dùng loginEmail (email từ Google account thực tế)
                          if (!loginEmail) {
                            setTwoFAError("Không tìm thấy email. Vui lòng đăng nhập lại.");
                            return;
                          }
                          const email = loginEmail;

                          setReset2FALoading(true);
                          setTwoFAError("");
                          try {
                            const res = await resetTemporary2FA(email);
                            if (res.response?.ok) {
                              setReset2FASuccess(true);
                              setTwoFAError("");
                            } else {
                              setTwoFAError(res.data?.error || "Không thể lấy mã xác thực tạm thời");
                            }
                          } catch (error) {
                            setTwoFAError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
                          } finally {
                            setReset2FALoading(false);
                          }
                        }}
                        disabled={reset2FALoading}
                      >
                        {reset2FALoading ? "Đang xử lý..." : "Lấy mã xác thực tạm thời"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setShowForgot2FA(false);
                          setReset2FASuccess(false);
                        }}
                        disabled={reset2FALoading}
                      >
                        Quay lại
                      </button>
                    </>
                  )}
                </div>
              )}

              {twoFAError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {twoFAError}
                  {countdown > 0 && (
                    <div className="mt-2">
                      <strong>
                        Thời gian còn lại: {
                          countdown >= 60 
                            ? `${Math.floor(countdown / 60)} phút ${countdown % 60} giây`
                            : `${countdown} giây`
                        }
                      </strong>
                    </div>
                  )}
                </div>
              )}
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={twoFALoading || countdown > 0}
                >
                  {twoFALoading 
                    ? "Đang xử lý..." 
                    : countdown > 0 
                      ? `Vui lòng đợi ${countdown >= 60 ? `${Math.floor(countdown / 60)}p ${countdown % 60}s` : `${countdown}s`}`
                      : "Xác thực"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFACode("");
                    setTwoFAError("");
                    setTwoFAAttempts(0);
                    setTwoFALockedUntil(null);
                    setCountdown(0);
                    setShowForgot2FA(false);
                    setReset2FASuccess(false);
                  }}
                  disabled={twoFALoading || countdown > 0}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
