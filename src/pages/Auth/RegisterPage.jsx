import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";
import ReCAPTCHA from "react-google-recaptcha";

export default function RegisterPage() {
  // step 1: nhập thông tin  — step 2: nhập mã OTP
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    username: "",
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

  // 👁 hiện/ẩn mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ===== OTP 6 ô =====
  const OTP_LENGTH = 6;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const otpRefs = useRef([]);
  // ✅ Thêm ref để reset reCAPTCHA
  const captchaRef = useRef(null); 

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccessMsg("");
  };

  // Validate cho step 1
  const validateStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\-]).{6,}$/;

    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      return "Vui lòng nhập đầy đủ thông tin!";
    }
    if (!emailRegex.test(form.email)) {
      return "Email không hợp lệ! Vui lòng nhập đúng định dạng.";
    }
    if (form.password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự!";
    }
    if (!passwordRegex.test(form.password)) {
      return "Mật khẩu phải có chữ cái, số và ký tự đặc biệt!";
    }
    if (form.password !== form.confirmPassword) {
      return "Mật khẩu nhập lại không khớp!";
    }
    return "";
  };

  // Submit STEP 1: kiểm tra trùng + gửi mã
  const onSubmitStep1 = async (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) return setError(err);

    // Kiểm tra reCAPTCHA chỉ ở bước 1
    if (!captchaValue) {
      return setError("Vui lòng xác minh captcha để tiếp tục!");
    }
    
    // Clear lỗi/thông báo thành công trước khi submit
    setError("");
    setSuccessMsg("");

    try {
      setLoading(true);

      // DEMO trùng tài khoản/email
      const isExists =
        form.username.trim().toLowerCase() === "admin" ||
        form.email.toLowerCase().includes("1234");

      setTimeout(() => {
if (isExists) {
          setShowExists(true); // mở modal "tài khoản đã tồn tại"
        } else {
          // Demo gửi OTP thành công
          setSuccessMsg(" Mã xác minh đã được gửi tới email của bạn!");
          // reset OTP trước khi vào bước 2
          setOtp(Array(OTP_LENGTH).fill(""));
          setTimeout(() => {
            // Reset lỗi/thông báo thành công khi chuyển bước
            setError(""); 
            setSuccessMsg("");
            setStep(2);
            // focus ô đầu tiên
            otpRefs.current[0]?.focus();
          }, 1200);
        }
      }, 800);
    } catch {
      setError("Có lỗi khi gửi mã xác minh. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý input OTP
  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    // Clear lỗi khi bắt đầu nhập
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

  // Submit STEP 2: xác minh mã
  const onSubmitStep2 = async (e) => {
    e.preventDefault();
    setError(""); // Clear lỗi trước khi submit bước 2
    const code = otp.join("");
    if (code.length < OTP_LENGTH) return setError("Vui lòng nhập đủ 6 số OTP!");

    try {
      setLoading(true);
      setTimeout(() => {
        // DEMO: mã đúng 123456
        if (code !== "123456") {
          setError("Mã xác minh không đúng! Vui lòng kiểm tra lại.");
        } else {
          setShowSuccess(true); // modal → /login
        }
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={step === 1 ? onSubmitStep1 : onSubmitStep2}>
        <h3 className="text-center mb-4">Tạo tài khoản</h3>

        {/* ===== STEP 1: THÔNG TIN ===== */}
        {step === 1 && (
          <>
            {/* Username */}
            <div className="mb-3 input-group">
              <span className="input-group-text">
                <i className="bi bi-person-fill"></i>
              </span>
              <input
                type="text"
className="form-control"
                name="username"
                placeholder="Tên người dùng"
                onChange={onChange}
                required
              />
            </div>

            {/* Email */}
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

            {/* Password */}
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
              Mật khẩu ≥ 6 ký tự, phải có chữ cái, số và ký tự đặc biệt.
            </div>

            {/* Confirm Password */}
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

            {/* Lỗi / thông báo */}
            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            {/* reCAPTCHA */}
            <div className="mb-3 mt-3 d-flex justify-content-center">
              <ReCAPTCHA
                // ✅ Gán ref
                ref={captchaRef}
sitekey="6LcxkgMsAAAAAHeuksM9h7ypHtcx2iAF3C29X0yB"
                onChange={value => {
                    setCaptchaValue(value);
                    if (value) setError(""); 
                }}
                onExpired={() => setCaptchaValue(null)} 
              />
            </div>

            {/* Submit: Gửi mã */}
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

        {/* ===== STEP 2: OTP 6 Ô ===== */}
        {step === 2 && (
          <>
            <div className="text-center mb-2 text-muted">
              Nhập mã xác minh gồm <strong>6</strong> số đã gửi tới email của bạn.
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
                    // Reset lỗi/thông báo khi quay lại bước 1
                    setError(""); 
                    setSuccessMsg("");
                    // ✅ Reset reCAPTCHA
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
                onClick={() => {
                  setError("");
setSuccessMsg(""); 
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    setSuccessMsg(" Đã gửi lại mã xác minh vào email của bạn!");
                  }, 800);
                }}
              >
                Gửi lại mã
              </button>
            </div>
          </>
        )}
      </form>

      {/* Modal thành công (sau khi xác minh OTP OK) */}
      <LoginSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        seconds={3}
        title="Đăng ký"
        message="Đăng ký thành công!"
        redirectUrl="/login"
      />

      {/* Modal: tài khoản đã tồn tại (ở bước 1) */}
      <AccountExistsModal
        open={showExists}
        onClose={() => setShowExists(false)}
        seconds={3}
        title="Đăng ký"
        message="Tài khoản đã tồn tại! Vui lòng dùng thông tin khác."
      />
    </AuthLayout>
  );
}
