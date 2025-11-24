import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { useNavigate } from "react-router-dom";

/**
 * Modal hiển thị sau khi thành công (Đăng nhập, Đăng ký, v.v.)
 * - Tự đếm ngược rồi điều hướng
 * - KHÔNG có nút "Đi ngay"
 */
const LoginSuccessModal = ({
  open,
  seconds = 3,
  onClose,
  title,
  message,
  redirectUrl = "/home",
}) => {
  const [remain, setRemain] = useState(seconds);
  const navigate = useNavigate();

  // Khi modal mở -> reset số giây và start interval giảm dần
  useEffect(() => {
    if (!open) return;

    setRemain(seconds);

    const timer = setInterval(() => {
      setRemain((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, seconds]);

  // Khi remain <= 0 -> đóng modal + điều hướng
  useEffect(() => {
    if (!open) return;
    if (remain > 0) return;

    // chỉ chạy 1 lần khi remain vừa về 0
    onClose?.(); // setShowSuccess(false) ở RegisterPage
    navigate(redirectUrl, { replace: true });
  }, [remain, open, onClose, navigate, redirectUrl]);

  return (
    <Modal open={open} onClose={() => {}} width={480}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #eee" }}>
        <strong>{title}</strong>
      </div>

      <div style={{ padding: 20, textAlign: "center" }}>
        {/* Icon ✓ */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 12px",
            borderRadius: "50%",
            background: "rgba(25,135,84,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            color: "#198754",
          }}
        >
          ✓
        </div>

        {/* Thông báo */}
        <h5 className="mb-2">{message}</h5>
        <div className="text-muted mb-3">
          Đang chuyển đến trang tiếp theo trong <strong>{remain}s</strong>…
        </div>

        {/* Spinner */}
        <div className="d-flex justify-content-center mb-2">
          <div
            className="spinner-border text-success"
            role="status"
            style={{ width: 30, height: 30 }}
          >
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LoginSuccessModal;
