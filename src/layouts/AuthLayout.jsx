// src/layouts/AuthLayout.jsx
import { useEffect, useRef } from "react";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import "../styles/AuthLayout.css";

export default function AuthLayout({ children }) {
  const videoRightRef = useRef(null); // video bên phải (cũ)
  const videoLeftRef = useRef(null);  // video bên trái (mới)

  // 🎯 Giúp video mượt hơn khi chuyển trang & pause khi tab ẩn
  useEffect(() => {
    const vRight = videoRightRef.current;
    const vLeft  = videoLeftRef.current;
    if (!vRight && !vLeft) return;

    const safePlay = (v) => v && v.play && v.play().catch(() => {});
    const safePause = (v) => v && v.pause && v.pause();

    const handleVis = () => {
      if (document.hidden) {
        safePause(vRight);
        safePause(vLeft);
      } else {
        safePlay(vRight);
        safePlay(vLeft);
      }
    };

    document.addEventListener("visibilitychange", handleVis);

    // auto play khi mount
    safePlay(vRight);
    safePlay(vLeft);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, []);

  return (
    <div className="auth-page d-flex flex-column min-vh-100">
      {/* ✅ Video background chung cho toàn bộ trang Auth */}
      <div className="auth-page__bg">
        {/* Video bên phải (giữ nguyên logic) */}
        <video
          ref={videoRightRef}
          className="auth-page__video auth-page__video--right"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"           // giúp load mượt
          poster="/videos/bg.jpg"
        >
          <source src="/videos/bg.webm" type="video/webm" />
          <source src="/videos/bg.mp4"  type="video/mp4" />
        </video>

        {/* ✅ Video bên trái (bổ sung) */}
        <video
          ref={videoLeftRef}
          className="auth-page__video auth-page__video--left"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/bg2.jpg"
        >
          <source src="/videos/bg2.webm" type="video/webm" />
          <source src="/videos/bg2.mp4"  type="video/mp4" />
        </video>
      </div>

      {/* Overlay nhẹ để form dễ đọc (giữ nguyên) */}
      <div className="auth-page__overlay" />

      {/* Header + nội dung + Footer (giữ nguyên) */}
      <Header />
      <main className="auth-page__main flex-grow-1 d-flex align-items-center justify-content-center">
        <div className="auth-page__stage route-fade">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
