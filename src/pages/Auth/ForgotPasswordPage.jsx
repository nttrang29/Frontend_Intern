import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import "../../styles/AuthForms.css"; // Đảm bảo file CSS này tồn tại

// ⚠️ Thay thế bằng URL thực tế của Backend Auth Controller
const API_BASE_URL = "http://localhost:8080/auth";

export default function ForgotPasswordPage() {
  // 1: nhập email, 2: nhập mã OTP, 3: đổi mật khẩu
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    code: "", // Lưu trữ mã OTP sau khi nhập ở Step 2
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 👁 hiện/ẩn mật khẩu
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccessMsg("");
  };

  /* =========================
   *           STEP 1
   *  GỬI EMAIL XÁC MINH (Call API: POST /auth/forgot-password)
   * ========================= */
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!form.email) return setError("Vui lòng nhập email!");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return setError("Email không hợp lệ! Vui lòng nhập đúng định dạng.");
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Backend trả về: { message: "Mã xác thực đã gửi đến email" }
        setSuccessMsg(data.message || "Mã xác minh đã được gửi!");
       setTimeout(() => {
        setStep(2);
        setSuccessMsg("");
      otpRefs.current[0]?.focus();
  }, 1200);
      } else {
        // Backend trả về: { error: "Email không tồn tại" }
        setError(data.error || "Gửi mã thất bại. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Lỗi gọi API gửi email:", err);
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   *           STEP 2
   *     OTP 6 Ô NHẬP MÃ
   * (Chỉ lưu mã và chuyển step, xác minh mã gộp vào Step 3)
   * ========================= */
  const OTP_LEN = 6;
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const otpRefs = useRef([]);

  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1); // chỉ số 0-9
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < OTP_LEN - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < OTP_LEN - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (!text) return;
    const arr = text.slice(0, OTP_LEN).split("");
    const next = [...otp];
    for (let i = 0; i < OTP_LEN; i++) next[i] = arr[i] || "";
    setOtp(next);
    const last = Math.min(arr.length, OTP_LEN) - 1;
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LEN) return setError("Vui lòng nhập đủ 6 số mã xác minh!");

    // Lưu mã OTP vào form state
    setForm((f) => ({ ...f, code: code }));

    setLoading(true);
    setError("");

    // Chuyển sang Step 3. Việc xác minh mã sẽ diễn ra ở API /reset-password.
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Đã nhận mã. Vui lòng nhập mật khẩu mới.");
      setTimeout(() => {
        setStep(3);
        setSuccessMsg("");
      }, 1000);
    }, 500);
  };

  const handleResendCode = async () => {
    // Thực hiện lại API call của Step 1 để gửi lại mã
    if (!form.email) return setError("Không có email để gửi lại.");
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Đã gửi lại mã xác minh vào email của bạn!");
      } else {
        setError(data.error || "Gửi lại mã thất bại. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ khi gửi lại mã.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   *           STEP 3
   *     ĐỔI MẬT KHẨU (Call API: POST /auth/reset-password)
   * ========================= */
  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Regex kiểm tra theo Backend: ≥8 ký tự, có hoa, thường, số, ký tự đặc biệt
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\-]).{8,}$/;

    if (!form.newPassword || !form.confirmPassword)
      return setError("Vui lòng nhập đầy đủ mật khẩu!");

    if (form.newPassword.length < 8 || !passwordRegex.test(form.newPassword))
      return setError(
        "Mật khẩu phải ≥6 ký tự, có chữ hoa, thường, số, ký tự đặc biệt!"
      );

    if (form.newPassword !== form.confirmPassword)
      return setError("Mật khẩu nhập lại không khớp!");

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          // ⚠️ Tên trường phải là "Mã xác thực" để khớp với Backend
          "Mã xác thực": form.code,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Backend trả về: { message: "Đổi mật khẩu thành công" }
        setShowSuccess(true); // Hiển thị modal thành công
      } else {
        // Backend trả về: { error: "Mã xác thực sai" } hoặc lỗi khác
        setError(data.error || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.");
      }
    } catch (err) {
      console.error("Lỗi gọi API đổi mật khẩu:", err);
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form">
        <h3 className="text-center mb-4">Quên mật khẩu</h3>

        {/* ===== STEP 1: NHẬP EMAIL ===== */}
        {step === 1 && (
          <>
            <div className="mb-2 input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope-fill"></i>
              </span>
              <input
                type="email"
                className="form-control"
                name="email"
                placeholder="Nhập địa chỉ email"
                onChange={onChange}
                required
                disabled={loading}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <div className="d-grid mb-2 mt-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendEmail}
                disabled={loading}
              >
                {loading ? "Đang gửi..." : "Gửi mã xác minh"}
              </button>
            </div>

            <div className="text-center mt-2">
              <span className="text-muted">Nhớ mật khẩu? </span>
              <Link to="/login" className="text-decoration-none link-hover">
                Đăng nhập ngay
              </Link>
            </div>
          </>
        )}

        {/* ===== STEP 2: NHẬP MÃ XÁC MINH (OTP 6 ô) ===== */}
        {step === 2 && (
          <>
            <div className="text-center mb-2 text-muted">
              Nhập mã xác minh gồm <strong>6</strong> số được gửi tới email **{form.email}**.
            </div>

            <div className="otp-inputs mb-2" onPaste={handleOtpPaste}>
              {otp.map((val, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="otp-box"
                  value={val}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  maxLength={1}
                  disabled={loading}
                />
              ))}
            </div>

            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <div className="d-grid mb-3 mt-2">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleVerifyCode}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Xác nhận mã"}
              </button>
            </div>

            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setStep(1);
                  setOtp(Array(OTP_LEN).fill(""));
                  setError("");
                  setSuccessMsg("");
                }}
                disabled={loading}
              >
                Nhập lại email
              </button>

              <button
                type="button"
                className="btn btn-link p-0"
                onClick={handleResendCode}
                disabled={loading}
              >
                Gửi lại mã
              </button>
            </div>
          </>
        )}

        {/* ===== STEP 3: ĐỔI MẬT KHẨU ===== */}
        {step === 3 && (
          <>
            <div className="mb-1 input-group">
              <span className="input-group-text">
                <i className="bi bi-lock-fill"></i>
              </span>
              <input
                type={showNewPassword ? "text" : "password"}
                className="form-control"
                name="newPassword"
                placeholder="Mật khẩu mới"
                onChange={onChange}
                required
                disabled={loading}
              />
              <span
                className="input-group-text eye-toggle"
                role="button"
                onClick={() => setShowNewPassword((v) => !v)}
                title={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </span>
            </div>
            <div className="form-text mb-3" style={{ marginLeft: 2 }}>
              Mật khẩu ≥ 8 ký tự, phải có chữ hoa, thường, số và ký tự đặc biệt.
            </div>

            <div className="mb-3 input-group">
              <span className="input-group-text">
                <i className="bi bi-shield-lock"></i>
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                className="form-control"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu mới"
                onChange={onChange}
                required
                disabled={loading}
              />
              <span
                className="input-group-text eye-toggle"
                role="button"
                onClick={() => setShowConfirm((v) => !v)}
                title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`} />
              </span>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="d-grid mb-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={loading}
              >
                {loading ? "Đang đổi..." : "Đổi mật khẩu"}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Modal thành công */}
      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đổi mật khẩu"
        message="Thay đổi mật khẩu thành công! Bạn sẽ được chuyển đến trang Đăng nhập."
        redirectUrl="/login"
      />
    </AuthLayout>
  );
}