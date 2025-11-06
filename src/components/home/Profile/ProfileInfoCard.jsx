import { useMemo, useState, useRef } from "react";
import "../../../styles/home/Profile.css";

const API_BASE_URL = "http://localhost:8080/auth";

/* ===== OTP 6 Ô ===== */
function Otp6({ value = "", onChange }) {
  const len = 6;
  const refs = useRef([]);

  const digits = useMemo(() => {
    const s = (value || "").slice(0, len);
    return Array.from({ length: len }, (_, i) => s[i] ?? "");
  }, [value]);

  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    onChange?.(next.join(""));
    if (v && i < len - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="otp6">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp6__box"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
        />
      ))}
    </div>
  );
}

export default function ProfileInfoCard({ user }) {
  const u = user || {
    name: "Trần Vinh Trí",
    email: "admin@example.com",
    phone: "09xx xxx xxx",
    role: "Người dùng",
    joined: "10/2024",
  };

  const [name, setName] = useState(u.name);
  const [nameOk, setNameOk] = useState("");

  // --- đổi mật khẩu ---
  const [step, setStep] = useState(1);
  const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
  const [show, setShow] = useState({ old: false, next: false, confirm: false });
  const [hint, setHint] = useState({ old: "", next: "", confirm: "" });
  const [okMsg, setOkMsg] = useState({ old: "", next: "", confirm: "" });
  const [otp, setOtp] = useState("");
  const [otpMsg, setOtpMsg] = useState({ error: "", ok: "" });
  const [loading, setLoading] = useState(false);

  const PASS_RULE =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|:;"'<>,.?/~`]).{8,}$/;

  const eye = (k) => (
    <button
      type="button"
      className="input-eye"
      onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
      aria-label={show[k] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      title={show[k] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
    >
      <i className={`bi ${show[k] ? "bi-eye-slash" : "bi-eye"}`} />
    </button>
  );

  const onChangePw = (e) => {
    const { name, value } = e.target;
    setPw((s) => ({ ...s, [name]: value }));
    setHint((s) => ({ ...s, [name]: "" }));
    setOkMsg((s) => ({ ...s, [name]: "" }));
  };

  const validateStep1 = () => {
    let valid = true;
    const nh = { old: "", next: "", confirm: "" };
    const ok = { old: "", next: "", confirm: "" };

    // Mật khẩu hiện tại
    if (!pw.old) {
      nh.old = "Vui lòng nhập mật khẩu hiện tại.";
      valid = false;
    } else if (!PASS_RULE.test(pw.old)) {
      nh.old = "Mật khẩu hiện tại chưa đạt yêu cầu (HOA, thường, số, ký tự đặc biệt, ≥8).";
      valid = false;
    } else {
      ok.old = "✔ Mật khẩu hiện tại hợp lệ.";
    }

    // Mật khẩu mới
    if (!pw.next) {
      nh.next = "Vui lòng nhập mật khẩu mới.";
      valid = false;
    } else if (!PASS_RULE.test(pw.next)) {
      nh.next = "Mật khẩu mới ≥8 ký tự, gồm HOA, thường, số và ký tự đặc biệt.";
      valid = false;
    } else if (pw.next === pw.old) {
      nh.next = "Mật khẩu mới không được trùng với mật khẩu hiện tại.";
      valid = false;
    } else {
      ok.next = "✔ Mật khẩu mới hợp lệ.";
    }

    // Nhập lại
    if (!pw.confirm) {
      nh.confirm = "Vui lòng nhập lại mật khẩu mới.";
      valid = false;
    } else if (pw.confirm !== pw.next) {
      nh.confirm = "Mật khẩu nhập lại chưa khớp.";
      valid = false;
    } else {
      ok.confirm = "✔ Khớp và hợp lệ.";
    }

    setHint(nh);
    setOkMsg(ok);
    return valid;
  };

  /* =========================
   * STEP 1: Gửi yêu cầu đổi mật khẩu → gửi OTP email
   * API: POST /auth/change-password/request-otp (Bearer)
   * body: { oldPassword, newPassword, confirmPassword }
   * ========================= */
  const submitStep1 = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setHint((h) => ({ ...h, old: "Bạn chưa đăng nhập." }));
      return;
    }

    setLoading(true);
    setOtp("");
    setOtpMsg({ ok: "", error: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/change-password/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: pw.old,
          newPassword: pw.next,
          confirmPassword: pw.confirm,
        }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        setHint((h) => ({ ...h, old: data?.error || `Yêu cầu thất bại: ${res.status}` }));
        return;
      }

      setOtpMsg({ ok: data?.message || "Đã gửi mã xác minh tới email của bạn.", error: "" });
      setStep(2);
    } catch (err) {
      setHint((h) => ({ ...h, old: "Không thể kết nối máy chủ. Kiểm tra backend." }));
    } finally {
      setLoading(false);
    }
  };

  /* (tuỳ chọn) Gửi lại OTP */
  const resendOtp = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    setOtpMsg({ ok: "", error: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/change-password/resend-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        setOtpMsg({ error: data?.error || `Gửi lại mã thất bại (${res.status})`, ok: "" });
        return;
      }
      setOtpMsg({ ok: data?.message || "Đã gửi lại mã xác minh.", error: "" });
    } catch {
      setOtpMsg({ error: "Không thể kết nối máy chủ.", ok: "" });
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   * STEP 2: Xác thực OTP để chốt đổi mật khẩu
   * API: POST /auth/change-password/confirm (Bearer)
   * body: { code, newPassword }  (kèm newPassword để backend chắc chắn)
   * ========================= */
  const submitOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpMsg({ error: "Vui lòng nhập đủ 6 số.", ok: "" });
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setOtpMsg({ error: "Bạn chưa đăng nhập.", ok: "" });
      return;
    }

    setLoading(true);
    setOtpMsg({ error: "", ok: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/change-password/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: otp,
          newPassword: pw.next, // gửi lại để backend chốt
        }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        setOtpMsg({ error: data?.error || `Xác thực thất bại: ${res.status}`, ok: "" });
        return;
      }

      setOtpMsg({ error: "", ok: data?.message || "Đổi mật khẩu thành công." });
      // reset form sau khi thành công
      setTimeout(() => {
        setStep(1);
        setPw({ old: "", next: "", confirm: "" });
        setHint({ old: "", next: "", confirm: "" });
        setOkMsg({ old: "", next: "", confirm: "" });
        setOtp("");
        setOtpMsg({ ok: "", error: "" });
      }, 1000);
    } catch {
      setOtpMsg({ error: "Không thể kết nối máy chủ.", ok: "" });
    } finally {
      setLoading(false);
    }
  };

  const saveName = () => {
    if (!name.trim()) return setNameOk("Tên không được để trống.");
    // TODO: call API cập nhật tên hiển thị nếu backend có
    setNameOk("Đã lưu tên hiển thị.");
    setTimeout(() => setNameOk(""), 1200);
  };

  return (
    <div className="profile__info-card">
      <h5 className="mb-3">Thông tin tài khoản</h5>

      <div className="info-grid">
        <div className="info-item span2">
          <span>Họ tên:</span>
          <div className="name-edit">
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ tên"
            />
            <button type="button" className="btn btn-outline-primary" onClick={saveName}>
              Lưu
            </button>
          </div>
          {!!nameOk && (
            <div className={`form-hint ${nameOk.includes("không") ? "error" : "success"}`}>
              {nameOk}
            </div>
          )}
        </div>

        <div><span>Email:</span><strong>{u.email}</strong></div>
        <div><span>Số điện thoại:</span><strong>{u.phone}</strong></div>
        <div><span>Vai trò:</span><strong>{u.role}</strong></div>
        <div><span>Tham gia từ:</span><strong>{u.joined}</strong></div>
      </div>

      <hr className="my-3" />

      {step === 1 ? (
        <form onSubmit={submitStep1}>
          <h6 className="mb-2">Thay đổi mật khẩu</h6>

          <label className="form-label">Mật khẩu hiện tại</label>
          <div className="pw-input">
            <input
              type={show.old ? "text" : "password"}
              name="old"
              value={pw.old}
              onChange={onChangePw}
              placeholder="Nhập mật khẩu hiện tại"
              disabled={loading}
            />
            {eye("old")}
          </div>
          {hint.old && <div className="form-hint error">{hint.old}</div>}
          {okMsg.old && <div className="form-hint success">{okMsg.old}</div>}

          <label className="form-label mt-2">Mật khẩu mới</label>
          <div className="pw-input">
            <input
              type={show.next ? "text" : "password"}
              name="next"
              value={pw.next}
              onChange={onChangePw}
              placeholder="Nhập mật khẩu mới"
              disabled={loading}
            />
            {eye("next")}
          </div>
          {hint.next && <div className="form-hint error">{hint.next}</div>}
          {okMsg.next && <div className="form-hint success">{okMsg.next}</div>}

          <label className="form-label mt-2">Nhập lại mật khẩu mới</label>
          <div className="pw-input">
            <input
              type={show.confirm ? "text" : "password"}
              name="confirm"
              value={pw.confirm}
              onChange={onChangePw}
              placeholder="Nhập lại mật khẩu mới"
              disabled={loading}
            />
            {eye("confirm")}
          </div>
          {hint.confirm && <div className="form-hint error">{hint.confirm}</div>}
          {okMsg.confirm && <div className="form-hint success">{okMsg.confirm}</div>}

          <button type="submit" className="btn btn-primary mt-3 w-100" disabled={loading}>
            {loading ? "Đang gửi mã..." : "Gửi mã xác minh"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="otp-form">
          <h6 className="text-center mb-2">Xác thực OTP</h6>
          <p className="text-center text-muted mb-2">
            Nhập mã xác thực gồm 6 số được gửi tới email của bạn.
          </p>

          <div className="otp-wrapper">
            <Otp6 value={otp} onChange={setOtp} />
            {otpMsg.error && <div className="form-hint error text-center mt-2">{otpMsg.error}</div>}
            {otpMsg.ok && <div className="form-hint success text-center mt-2">{otpMsg.ok}</div>}
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-link p-0" disabled={loading}
                    onClick={() => { setStep(1); setOtp(""); setOtpMsg({ ok: "", error: "" }); }}>
              Quay lại
            </button>
            <button type="button" className="btn btn-link p-0" onClick={resendOtp} disabled={loading}>
              Gửi lại mã
            </button>
          </div>

          <button type="submit" className="btn btn-primary mt-2 w-100" disabled={loading}>
            {loading ? "Đang xác nhận..." : "Xác nhận"}
          </button>
        </form>
      )}
    </div>
  );
}
