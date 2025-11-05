import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";
import ReCAPTCHA from "react-google-recaptcha";

const API_URL = "http://localhost:8080/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [captchaValue, setCaptchaValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExists, setShowExists] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const OTP_LENGTH = 6;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const otpRefs = useRef([]);
  const captchaRef = useRef(null);

  const onChange = (e) => {
    const name = e.target.name === "username" ? "fullName" : e.target.name;
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setError("");
    setSuccessMsg("");
  };

  const validateStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?~]).{8,}$/;

    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      return "Vui lòng nhập đầy đủ thông tin!";
    }
    if (!emailRegex.test(form.email)) {
      return "Email không hợp lệ! Vui lòng nhập đúng định dạng.";
    }
    if (form.password.length < 8) {
      return "Mật khẩu phải có ít nhất 8 ký tự!";
    }
    if (!passwordRegex.test(form.password)) {
      return "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt!";
    }
    if (form.password !== form.confirmPassword) {
      return "Mật khẩu nhập lại không khớp!";
    }
    return "";
  };

  const onSubmitStep1 = async (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) return setError(err);

    if (!captchaValue) return setError("Vui lòng xác minh captcha để tiếp tục!");

    setError("");
    setSuccessMsg("");

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          recaptchaToken: captchaValue,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message) {
        setSuccessMsg(data.message);
        setOtp(Array(OTP_LENGTH).fill(""));

        setCaptchaValue(null);
        captchaRef.current?.reset();

        setTimeout(() => {
          setError("");
          setSuccessMsg("");
          setStep(2);
          otpRefs.current[0]?.focus();
        }, 1200);
      } else {
        setError(data.error || "Đã xảy ra lỗi, vui lòng thử lại.");
        if (data.error?.includes("Email đã được sử dụng")) setShowExists(true);
      }
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ. Kiểm tra backend và secret key.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    setError("");
    if (v && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (!text) return;
    const arr = text.slice(0, OTP_LENGTH).split("");
    const next = [...otp];
    for (let i = 0; i < OTP_LENGTH; i++) next[i] = arr[i] || "";
    setOtp(next);
    const last = Math.min(arr.length, OTP_LENGTH) - 1;
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const onSubmitStep2 = async (e) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length < OTP_LENGTH) return setError("Vui lòng nhập đủ 6 số OTP!");

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });

      const data = await response.json();

      if (response.ok && data.message?.includes("Xác minh thành công")) {
        setShowSuccess(true);
      } else {
        setError(data.error || "Lỗi xác minh mã.");
      }
    } catch {
      setError("Lỗi kết nối đến máy chủ khi xác minh mã.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Đã gửi lại mã xác minh mới vào email!");
      } else {
        setError(data.error || "Lỗi gửi lại mã xác minh.");
      }
    } catch {
      setError("Không thể gửi lại mã. Vui lòng thử sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={step === 1 ? onSubmitStep1 : onSubmitStep2}>
        <h3 className="text-center mb-4">Tạo tài khoản</h3>

        {step === 1 && (
          <>
            <div className="mb-3 input-group">
              <span className="input-group-text">
                <i className="bi bi-person-fill"></i>
              </span>
              <input
                type="text"
                className="form-control"
                name="fullName"
                placeholder="Họ và tên"
                onChange={onChange}
                required
              />
            </div>

            <div className="mb-3 input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope-fill"></i>
              </span>
              <input
                type="email"
                className="form-control"
                name="email"
                placeholder="Địa chỉ email"
                onChange={onChange}
                required
              />
            </div>

            <div className="mb-1 input-group">
              <span className="input-group-text">
                <i className="bi bi-lock-fill"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                name="password"
                placeholder="Mật khẩu"
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

            <div className="form-text mb-3" style={{ marginLeft: 2 }}>
              Mật khẩu ≥ 8 ký tự, phải có chữ hoa, thường, số và ký tự đặc biệt.
            </div>

            <div className="mb-2 input-group">
              <span className="input-group-text">
                <i className="bi bi-shield-lock"></i>
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                className="form-control"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                onChange={onChange}
                required
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
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <div className="mb-3 mt-3 d-flex justify-content-center">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey="6LcxkgMsAAAAAHeuksM9h7ypHtcx2iAF3C29X0yB"
                onChange={(v) => {
                  setCaptchaValue(v);
                  if (v) setError("");
                }}
                onExpired={() => setCaptchaValue(null)}
              />
            </div>

            <div className="d-grid mb-3 mt-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Đang xử lý..." : "Gửi mã xác minh"}
              </button>
            </div>

            <div className="text-center">
              <span className="text-muted">Đã có tài khoản? </span>
              <Link to="/login" className="text-decoration-none link-hover">
                Đăng nhập ngay
              </Link>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center mb-2 text-muted">
              Nhập mã gồm <strong>6 số</strong> đã gửi tới email <strong>{form.email}</strong>.
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
                />
              ))}
            </div>

            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <div className="d-grid mb-3 mt-2">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? "Đang xác minh..." : "Xác nhận mã"}
              </button>
            </div>

            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setCaptchaValue(null);
                  captchaRef.current?.reset();
                  setStep(1);
                }}
              >
                Nhập lại thông tin
              </button>

              <button
                type="button"
                className="btn btn-link p-0"
                disabled={loading}
                onClick={resendVerificationCode}
              >
                Gửi lại mã
              </button>
            </div>
          </>
        )}
      </form>

      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng ký"
        message="Đăng ký thành công!"
        redirectUrl="/login"
      />

      <AccountExistsModal
        open={showExists}
        onClose={() => setShowExists(false)}
        seconds={3}
        title="Đăng ký"
        message="Email đã được sử dụng! Vui lòng dùng email khác."
        redirectUrl="/login"
      />
    </AuthLayout>
  );
}
