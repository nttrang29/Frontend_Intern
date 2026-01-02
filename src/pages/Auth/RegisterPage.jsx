// src/pages/Auth/RegisterPage.jsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import AccountExistsModal from "../../components/common/Modal/AccountExistsModal";
import "../../styles/AuthForms.css";
import ReCAPTCHA from "react-google-recaptcha";

// API
import {
  registerRequestOtp,
  verifyRegisterOtp,
} from "../../services/auth.service";

export default function RegisterPage() {
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

  // Đếm ngược OTP theo BE (60s)
  const [otpCountdown, setOtpCountdown] = useState(0);
  const isOtpExpired = otpCountdown === 0;
  const isResendDisabled = loading || otpCountdown > 0;

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    label: "",
    color: "",
  });

  // =========================
  // Password strength checker
  // =========================
  const getPasswordStrength = (password) => {
    if (!password) return { label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: "yếu", color: "#dc2626" }; // đỏ
    if (score <= 3) return { label: "trung bình", color: "#f97316" }; // cam
    return { label: "mạnh", color: "#16a34a" }; // xanh lá
  };

  const onChange = (e) => {
    const name = e.target.name === "username" ? "fullName" : e.target.name;
    const value = e.target.value;

    setForm((f) => ({ ...f, [name]: value }));
    setError("");
    setSuccessMsg("");

    if (name === "password") {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const validateStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?~]).{8,}$/;

    if (
      !form.fullName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      return "Vui lòng nhập đầy đủ thông tin!";
    }
    if (!emailRegex.test(form.email)) {
      return "Email không hợp lệ!";
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

  // =========================
  // Countdown OTP
  // =========================
  useEffect(() => {
    if (step !== 2) return;
    if (otpCountdown <= 0) return;

    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  // Khi OTP hết hạn: xoá thông báo, lỗi và reset OTP (đồng bộ ForgotPasswordPage)
  useEffect(() => {
    if (step === 2 && otpCountdown === 0) {
      setSuccessMsg("");
      setError("");
      setOtp(Array(OTP_LENGTH).fill(""));
    }
  }, [step, otpCountdown]);

  // =========================
  // STEP 1 — Request OTP
  // =========================
  const onSubmitStep1 = async (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) return setError(err);

    if (!captchaValue) return setError("Vui lòng xác minh Captcha!");

    setError("");
    setSuccessMsg("");

    try {
      setLoading(true);

      const res = await registerRequestOtp({
        fullName: form.fullName,
        email: form.email,
      });

      if (!res.response?.ok) {
        const msg =
          res.data?.message || res.data?.error || "Đã xảy ra lỗi, vui lòng thử lại.";
        setError(msg);

        if (msg.toLowerCase().includes("đã được đăng ký")) {
          setShowExists(true);
        }
        return;
      }

      setSuccessMsg(
        "Đã gửi mã OTP, vui lòng kiểm tra email để hoàn tất đăng ký."
      );
      setOtpCountdown(60);

      setOtp(Array(OTP_LENGTH).fill(""));
      setCaptchaValue(null);
      captchaRef.current?.reset();

      setTimeout(() => {
        setStep(2);
        otpRefs.current[0]?.focus();
      }, 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Đã xảy ra lỗi, vui lòng thử lại.";

      setError(msg);

      if (msg.toLowerCase().includes("đã được đăng ký")) {
        setShowExists(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // OTP Input Handler
  // =========================
  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    setError("");

    if (v && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      // xoá hết và focus ô đầu (giống ForgotPasswordPage)
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  // Cho phép dán 1 lần 6 số (dán vào ô nào cũng được)
  const handleOtpPaste = (e, idx) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (!text) return;

    const clean = text.slice(0, OTP_LENGTH);
    const arr = clean.split("");
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < OTP_LENGTH; i++) {
      next[i] = arr[i] || "";
    }
    setOtp(next);

    const focusIndex = Math.min(arr.length - 1, OTP_LENGTH - 1);
    if (focusIndex >= 0) otpRefs.current[focusIndex]?.focus();
  };

  // =========================
  // STEP 2 — Verify OTP
  // =========================
  const onSubmitStep2 = async (e) => {
    e.preventDefault();
    setError("");

    if (isOtpExpired) {
      return setError("Mã OTP đã hết hạn, vui lòng gửi lại mã.");
    }

    const code = otp.join("");
    if (code.length < OTP_LENGTH) return setError("Vui lòng nhập đủ 6 số!");

    try {
      setLoading(true);

      const res = await verifyRegisterOtp({
        email: form.email,
        otp: code,
        password: form.password,
        fullName: form.fullName,
      });

      if (!res.response?.ok) {
        const msg = res.data?.message || res.data?.error || "OTP không hợp lệ!";
        setError(msg);
        setOtp(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }

      // Hiển thị modal thông báo thành công trước khi redirect
      setShowSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "OTP không hợp lệ!";
      setError(msg);

      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Resend OTP
  // =========================
  const resendVerificationCode = async () => {
    if (!form.fullName || !form.email || !form.password) {
      return setError("Vui lòng quay lại bước 1 và nhập đầy đủ thông tin.");
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await registerRequestOtp({
        fullName: form.fullName,
        email: form.email,
      });

      if (!res.response?.ok) {
        setError("Không thể gửi lại mã!");
        return;
      }

      setOtp(Array(OTP_LENGTH).fill(""));
      setSuccessMsg("Đã gửi lại mã OTP!");
      setOtpCountdown(60);

      otpRefs.current[0]?.focus();
    } catch (err) {
      setError("Không thể gửi lại mã!");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RENDER
  // =========================
  return (
    <AuthLayout>
      <form
        className="auth-form"
        onSubmit={step === 1 ? onSubmitStep1 : onSubmitStep2}
      >
        <h3 className="text-center mb-4">Tạo tài khoản</h3>

        {/* ================= STEP 1 ================= */}
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
                value={form.fullName}
                onChange={onChange}
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
                value={form.email}
                onChange={onChange}
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
                value={form.password}
                onChange={onChange}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <i
                  className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}
                ></i>
              </button>
            </div>

            {form.password && (
              <div
                className="form-text mb-1"
                style={{ color: passwordStrength.color, marginLeft: 2 }}
              >
                Mật khẩu {passwordStrength.label}
              </div>
            )}

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
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={onChange}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                <i
                  className={showConfirm ? "bi bi-eye-slash" : "bi bi-eye"}
                ></i>
              </button>
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Gửi mã xác minh"}
              </button>
            </div>

            <div className="text-center">
              <span className="text-muted">Đã có tài khoản? </span>
              <Link to="/login" className="auth-link">
                Đăng nhập ngay
              </Link>
            </div>
          </>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <>
            <div className="otp-card mb-3">
              <div className="otp-card__icon-wrap">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <h5 className="otp-card__title">Xác nhận email đăng ký</h5>
              <p className="otp-card__subtitle">
                Nhập mã gồm <strong>6 số</strong> được gửi tới{" "}
                <strong>{form.email}</strong> để hoàn tất tạo tài khoản.
              </p>

              <div className="otp-card__badge-wrapper">
                {otpCountdown > 0 ? (
                  <span className="otp-card__badge is-active">
                    Mã sẽ hết hạn sau   <b>: {otpCountdown}s</b>
                  </span>
                ) : (
                  <span className="otp-card__badge is-expired">
                    Mã OTP đã hết hạn — hãy bấm <b>"Gửi lại mã"</b> bên dưới.
                  </span>
                )}
              </div>

              {/* successMsg chỉ hiển thị khi OTP còn hạn */}
              {successMsg && otpCountdown > 0 && (
                <div className="auth-success mt-2">{successMsg}</div>
              )}

              {/* Chỉ hiển thị ô OTP + nút xác nhận khi CHƯA hết hạn */}
              {!isOtpExpired && (
                <>
                  {error && <div className="auth-error mt-2">{error}</div>}

                  <div className="otp-inputs otp-card__inputs mb-2">
                    {otp.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        className="otp-box"
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        onPaste={(e) => handleOtpPaste(e, idx)}
                        maxLength={1}
                      />
                    ))}
                  </div>

                  <div className="d-grid mb-2 mt-2">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={loading || isOtpExpired}
                    >
                      {loading ? "Đang xác minh..." : "Xác nhận mã"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="otp-card__footer d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-link p-0 auth-link"
                onClick={() => {
                  setStep(1);
                  setOtp(Array(OTP_LENGTH).fill(""));
                  setOtpCountdown(0);
                  setSuccessMsg("");
                  setError("");
                  setCaptchaValue(null);
                  captchaRef.current?.reset();
                }}
              >
                <i className="bi bi-arrow-left-short"></i> Nhập lại thông tin
              </button>

              <button
                type="button"
                className="btn btn-link p-0 auth-link"
                disabled={isResendDisabled}
                onClick={resendVerificationCode}
              >
                <i className="bi bi-arrow-repeat"></i> Gửi lại mã
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
        message="Email đã được sử dụng!"
        redirectUrl="/login"
      />
    </AuthLayout>
  );
}
