// src/pages/Auth/ForgotPasswordPage.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import ConfirmModal from "../../components/common/Modal/ConfirmModal"; // ✅ dùng confirm chung
import "../../styles/AuthForms.css";

import {
  forgotPasswordRequest,
  verifyForgotOtp,
  resetPassword,
} from "../../services/auth.service";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [otp, setOtp] = useState(Array(6).fill(""));
  const otpRefs = useRef([]);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpCountdown, setOtpCountdown] = useState(0); // 60s countdown
  const isResendDisabled = loading || otpCountdown > 0;
  const isOtpExpired = otpCountdown === 0;

  // ✅ modal xác nhận hủy
  const [openCancelModal, setOpenCancelModal] = useState(false);

  // ====== Password strength state ======
  const [passwordStrength, setPasswordStrength] = useState({
    label: "",
    color: "",
  });

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
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccessMsg("");

    if (name === "newPassword") {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  /* ================================
          OTP COUNTDOWN
  ================================ */
  useEffect(() => {
    if (step !== 2) return;
    if (otpCountdown <= 0) return;

    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  // Khi OTP hết hạn: xoá thông báo, xoá lỗi, xoá OTP
  useEffect(() => {
    if (step === 2 && otpCountdown === 0) {
      setSuccessMsg("");
      setError("");
      setOtp(Array(6).fill(""));
    }
  }, [step, otpCountdown]);

  /* ================================
          STEP 1 — Gửi OTP
  ================================ */
  const handleSendEmail = async () => {
    if (!form.email) return setError("Vui lòng nhập email!");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return setError("Email không hợp lệ!");
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await forgotPasswordRequest({ email: form.email });

      if (!res.response?.ok) {
        const apiMsg =
          res.data?.message ||
          res.data?.error ||
          "Không gửi được mã!";
        setError(apiMsg);
        return;
      }

      setSuccessMsg("Mã xác minh đã được gửi đến email!");
      setOtpCountdown(60);

      setTimeout(() => {
        setStep(2);
        otpRefs.current[0]?.focus();
      }, 800);
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Không gửi được mã!";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  /* ================================
          STEP 2 — Nhập OTP
  ================================ */
  const handleOtpChange = (idx, value) => {
    const v = value.replace(/\D/g, "").slice(0, 1);

    const next = [...otp];
    next[idx] = v;
    setOtp(next);

    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  // Cho phép dán 1 lần 6 số OTP
  const handleOtpPaste = (e, idx) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text") || "";
    const clean = pasted.replace(/\D/g, "").slice(0, 6);
    if (!clean) return;

    const next = Array(6).fill("");
    for (let i = 0; i < clean.length; i++) {
      next[i] = clean[i];
    }
    setOtp(next);

    const focusIndex = Math.min(clean.length - 1, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      setOtp(Array(6).fill(""));
      otpRefs.current[0]?.focus();
      return;
    }

    if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }

    if (e.key === "ArrowRight" && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    if (isOtpExpired)
      return setError("Mã OTP đã hết hạn. Vui lòng gửi lại mã!");

    const code = otp.join("");
    if (code.length !== 6) return setError("Vui lòng nhập đủ 6 số!");

    try {
      setLoading(true);
      setError("");

      const res = await verifyForgotOtp({
        email: form.email,
        otp: code,
      });

      if (!res.response?.ok) {
        const apiMsg =
          res.data?.message ||
          res.data?.error ||
          "OTP không hợp lệ!";
        setError(apiMsg);
        setOtp(Array(6).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }

      setResetToken(res.data.resetToken);

      setSuccessMsg("Xác minh OTP thành công!");
      setTimeout(() => {
        setStep(3);
        setSuccessMsg("");
      }, 900);
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "OTP không hợp lệ!";
      setError(apiMsg);

      setOtp(Array(6).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await forgotPasswordRequest({ email: form.email });

      if (!res.response?.ok) {
        const apiMsg =
          res.data?.message ||
          res.data?.error ||
          "Không gửi lại mã được!";
        setError(apiMsg);
        return;
      }

      setSuccessMsg("Đã gửi lại mã mới!");
      setOtpCountdown(60);
      setOtp(Array(6).fill(""));
      otpRefs.current[0]?.focus();
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Không gửi lại mã được!";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  /* ================================
          STEP 3 — Đổi mật khẩu
  ================================ */
  /* ================================
      STEP 3 — Đổi mật khẩu
================================ */
const handleChangePassword = async () => {
  const password = form.newPassword.trim();
  const confirm = form.confirmPassword.trim();

  // Validate rỗng
  if (!password || !confirm) {
    return setError("Vui lòng nhập mật khẩu!");
  }

  // Validate độ dài
  if (password.length < 8) {
    return setError("Mật khẩu phải có ít nhất 8 ký tự!");
  }

  // Validate chữ hoa – chữ thường – số – ký tự đặc biệt
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?~]).{8,}$/;

  if (!passwordRegex.test(password)) {
    return setError(
      "Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt!"
    );
  }

  // Validate match
  if (password !== confirm) {
    return setError("Mật khẩu nhập lại không khớp!");
  }

  try {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await resetPassword({
      resetToken,
      newPassword: password,
    });

    if (!res.response?.ok) {
      const apiMsg =
        res.data?.message ||
        res.data?.error ||
        "Đổi mật khẩu thất bại!";
      setError(apiMsg);
      return;
    }

    setShowSuccess(true);
  } catch (err) {
    const apiMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Đổi mật khẩu thất bại!";
    setError(apiMsg);
  } finally {
    setLoading(false);
  }
};


  // ✅ mở modal xác nhận
  const handleOpenCancelModal = () => {
    setOpenCancelModal(true);
  };

  // ✅ user chọn "Xác nhận" trên modal
  const handleConfirmCancelReset = () => {
    setOpenCancelModal(false);
    navigate("/login");
  };

  /* ================================
            RENDER UI
  ================================ */
return (
  <AuthLayout>
    <form className="auth-form">

      <h3 className="text-center mb-4">Quên mật khẩu</h3>

      {/* STEP 1 — NHẬP EMAIL */}
      {step === 1 && (
        <>
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
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {successMsg && <div className="auth-success">{successMsg}</div>}

          <div className="d-grid mt-3 mb-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSendEmail}
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Gửi mã xác minh"}
            </button>
          </div>

          <div className="text-center mt-3">
            <Link to="/login" className="auth-link">
              ← Quay lại đăng nhập
            </Link>
          </div>
        </>
      )}

      {/* STEP 2 — NHẬP OTP */}
      {step === 2 && (
        <>
          <div className="otp-card mb-3">

            <div className="otp-card__icon-wrap">
              <i className="bi bi-shield-lock-fill"></i>
            </div>

            <h5 className="otp-card__title">Xác minh mã OTP</h5>
            <p className="otp-card__subtitle">
              Nhập mã gồm <strong>6 số</strong> được gửi tới <strong>{form.email}</strong>.
            </p>

            <div className="otp-card__badge-wrapper">
              {otpCountdown > 0 ? (
                <span className="otp-card__badge is-active">
                  Mã sẽ hết hạn sau <b>: {otpCountdown}s</b>
                </span>
              ) : (
                <span className="otp-card__badge is-expired">
                  Mã OTP đã hết hạn — vui lòng gửi lại mã
                </span>
              )}
            </div>

            {/* successMsg chỉ khi OTP còn hạn */}
            {successMsg && otpCountdown > 0 && (
              <div className="auth-success mt-2">{successMsg}</div>
            )}

            {!isOtpExpired && (
              <>
                {error && <div className="auth-error mt-2">{error}</div>}

                <div className="otp-inputs mb-3">
                  {otp.map((v, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      className="otp-box"
                      value={v}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      onPaste={(e) => handleOtpPaste(e, idx)}
                    />
                  ))}
                </div>

                <div className="d-grid mt-2 mb-2">
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={loading}
                    onClick={handleVerifyCode}
                  >
                    Tiếp tục
                  </button>
                </div>
              </>
            )}

            {/* Nếu OTP hết hạn */}
            {isOtpExpired && error && (
              <div className="auth-error mt-2">{error}</div>
            )}
          </div>

          <div className="otp-card__footer d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-link p-0 auth-link"
              onClick={() => {
                setStep(1);
                setOtp(Array(6).fill(""));
                setOtpCountdown(0);
                setError("");
                setSuccessMsg("");
              }}
            >
              <i className="bi bi-arrow-left-short"></i> Nhập lại email
            </button>

            <button
              type="button"
              className="btn btn-link p-0 auth-link"
              onClick={handleResendCode}
              disabled={isResendDisabled}
            >
              <i className="bi bi-arrow-repeat"></i> Gửi lại mã
            </button>
          </div>
        </>
      )}

      {/* STEP 3 — ĐẶT MẬT KHẨU MỚI */}
      {step === 3 && (
        <>
          {/* new password */}
          <div className="mb-2 input-group">
            <span className="input-group-text">
              <i className="bi bi-lock-fill"></i>
            </span>
            <input
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              className="form-control"
              placeholder="Mật khẩu mới"
              value={form.newPassword}
              onChange={onChange}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowNewPassword((v) => !v)}
            >
              <i className={showNewPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
            </button>
          </div>

          {/* strength */}
          {form.newPassword && (
            <div className="form-text mb-1" style={{ color: passwordStrength.color }}>
              Mật khẩu {passwordStrength.label}
            </div>
          )}

          <div className="form-text mb-3">
            Mật khẩu ≥ 8 ký tự, gồm chữ hoa, thường, số & ký tự đặc biệt.
          </div>

          {/* confirm password */}
          <div className="mb-3 input-group">
            <span className="input-group-text">
              <i className="bi bi-shield-lock"></i>
            </span>
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              className="form-control"
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={onChange}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowConfirm((v) => !v)}
            >
              <i className={showConfirm ? "bi bi-eye-slash" : "bi bi-eye"}></i>
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="d-grid mt-3 mb-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={loading}
            >
              {loading ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </div>

          <div className="d-grid">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleOpenCancelModal}
              disabled={loading}
            >
              Hủy đặt lại mật khẩu
            </button>
          </div>
        </>
      )}
    </form>

    {/* Success modal */}
    <LoginSuccessModal
      open={showSuccess}
      onClose={() => setShowSuccess(false)}
      seconds={3}
      title="Đổi mật khẩu"
      message="Đổi mật khẩu thành công! Bạn sẽ quay lại Đăng nhập."
      redirectUrl="/login"
    />

    {/* Cancel confirm modal */}
    <ConfirmModal
      open={openCancelModal}
      title="Hủy đặt lại mật khẩu"
      message="Bạn có chắc muốn hủy đặt lại mật khẩu và quay lại Đăng nhập?"
      okText="Hủy & quay lại"
      cancelText="Tiếp tục đổi mật khẩu"
      danger={true}
      onOk={handleConfirmCancelReset}
      onClose={() => setOpenCancelModal(false)}
    />
  </AuthLayout>
);

}
