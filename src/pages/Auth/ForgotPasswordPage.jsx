// src/pages/Auth/ForgotPasswordPage.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginSuccessModal from "../../components/common/Modal/LoginSuccessModal";
import "../../styles/AuthForms.css";

export default function ForgotPasswordPage() {
  // 1: nhập email, 2: nhập mã OTP, 3: đổi mật khẩu
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Thông báo
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const hideTimerRef = useRef(null);

  // OTP
  const OTP_LEN = 6;
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const otpRefs = useRef([]);

  // ===== Helpers: đảm bảo chỉ một loại thông báo + auto-hide =====
  const clearTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const showError = (msg, autoHideMs = 3000) => {
    clearTimer();
    setSuccessMsg("");
    setError(msg);
    if (autoHideMs) {
      hideTimerRef.current = setTimeout(() => setError(""), autoHideMs);
    }
  };

  const showSuccess = (msg, autoHideMs = 3000) => {
    clearTimer();
    setError("");
    setSuccessMsg(msg);
    if (autoHideMs) {
      hideTimerRef.current = setTimeout(() => setSuccessMsg(""), autoHideMs);
    }
  };

  useEffect(() => {
    return () => clearTimer(); // cleanup khi unmount
  }, []);

  // Focus ô OTP đầu khi sang step 2
  useEffect(() => {
    if (step === 2) {
      // chờ render xong input
      const t = setTimeout(() => otpRefs.current[0]?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Xoá thông báo khi người dùng gõ lại input form
  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError("");
    if (successMsg) setSuccessMsg("");
    clearTimer();
  };

  /* =========================
   *           STEP 1
   *  GỬI EMAIL XÁC MINH
   * ========================= */
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!form.email) return showError("Vui lòng nhập email!");

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return showError("Email không hợp lệ! Vui lòng nhập đúng định dạng.");
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    // Demo giả lập API
    setTimeout(() => {
      setLoading(false);
      const fail = form.email.toLowerCase().includes("fail");
      if (fail) {
        showError("Gửi mã thất bại, vui lòng thử lại!");
      } else {
        showSuccess("Mã xác minh đã được gửi tới email của bạn!", 1200);
        // chuyển sang step 2 sau khi hiển thị success ngắn
        setTimeout(() => {
          setStep(2);
          setSuccessMsg("");
          setOtp(Array(OTP_LEN).fill(""));
          otpRefs.current[0]?.focus();
        }, 1200);
      }
    }, 900);
  };

  /* =========================
   *           STEP 2
   *     OTP 6 Ô NHẬP MÃ
   * ========================= */
  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1); // chỉ số 0-9
    const next = [...otp];
    next[idx] = v;
    setOtp(next);

    // xóa thông báo cũ khi gõ lại OTP
    if (error) setError("");
    if (successMsg) setSuccessMsg("");
    clearTimer();

    if (v && idx < OTP_LEN - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (!otp[idx] && idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
      return;
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

    if (error) setError("");
    if (successMsg) setSuccessMsg("");
    clearTimer();

    const last = Math.min(arr.length, OTP_LEN) - 1;
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LEN) return showError("Vui lòng nhập đủ 6 số mã xác minh!");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (code !== "123456") {
        showError("Mã xác minh không đúng! Vui lòng kiểm tra lại.");
        return;
      }
      showSuccess("Xác minh thành công!", 1000);
      setTimeout(() => {
        setStep(3);
        setSuccessMsg("");
      }, 1000);
    }, 900);
  };

  /* =========================
   *           STEP 3
   *       ĐỔI MẬT KHẨU
   * ========================= */
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\-]).{6,}$/;

    if (!form.newPassword || !form.confirmPassword)
      return showError("Vui lòng nhập đầy đủ mật khẩu!");

    if (form.newPassword.length < 6)
      return showError("Mật khẩu phải có ít nhất 6 ký tự!");

    if (!passwordRegex.test(form.newPassword))
      return showError("Mật khẩu phải có chữ cái, số và ký tự đặc biệt!");

    if (form.newPassword !== form.confirmPassword)
      return showError("Mật khẩu nhập lại không khớp!");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true); // hiện modal sau khi đổi thành công
    }, 900);
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
              Nhập mã xác minh gồm <strong>6</strong> số được gửi tới email của bạn.
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
              <button
                type="button"
                className="btn btn-success"
                onClick={handleVerifyCode}
                disabled={loading}
              >
                {loading ? "Đang xác minh..." : "Xác nhận mã"}
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
                  clearTimer();
                }}
              >
                Nhập lại email
              </button>

              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setSuccessMsg("");
                  clearTimer();
                  setTimeout(() => {
                    setLoading(false);
                    showSuccess("Đã gửi lại mã xác minh vào email của bạn!");
                  }, 800);
                }}
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
              Mật khẩu ≥ 6 ký tự, phải có chữ cái, số và ký tự đặc biệt.
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
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        seconds={3}
        title="Đổi mật khẩu"
        message="Thay đổi mật khẩu thành công!"
        redirectUrl="/login"
      />
    </AuthLayout>
  );
}
