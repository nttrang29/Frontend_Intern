import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useOnClickOutside from "../../../hooks/useOnClickOutside";
import ConfirmModal from "../../common/Modal/ConfirmModal";
export default function UserMenu({ avatarUrl }) {
 const [open, setOpen] = useState(false);
 const [confirm, setConfirm] = useState(false);
 const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);
 const ref = useRef(null);
 const navigate = useNavigate();
 useOnClickOutside(ref, () => setOpen(false));
 
 // Cập nhật avatar khi prop avatarUrl thay đổi
 useEffect(() => {
   setCurrentAvatar(avatarUrl);
 }, [avatarUrl]);
 
 // Đóng bằng ESC (không thay đổi cấu trúc DOM)
 useEffect(() => {
   const onKey = (e) => {
     if (e.key === "Escape") setOpen(false);
   };
   document.addEventListener("keydown", onKey);
   return () => document.removeEventListener("keydown", onKey);
 }, []);
 const onLogout = () => setConfirm(true);
 const doLogout = () => {
   localStorage.removeItem("accessToken");
   localStorage.removeItem("auth_token");
   localStorage.removeItem("user");
   localStorage.removeItem("refreshToken");
   
   // ✅ Trigger event để CategoryDataContext clear categories
   window.dispatchEvent(new CustomEvent('userChanged'));
   
   setConfirm(false);
   navigate("/login", { replace: true });
 };
 return (
<div className="tb__dd" ref={ref}>
<button
       className="tb__avatar btn-reset"
       title="Tài khoản"
       onClick={() => setOpen((v) => !v)}
       aria-haspopup="menu"
       aria-expanded={open}
>
<img 
         src={currentAvatar} 
         alt="avatar" 
         key={currentAvatar} 
         onError={(e) => {
           e.target.src = "https://www.gravatar.com/avatar/?d=mp&s=40";
         }}
       />
</button>
     {open && (
<div
         className="dd__panel dd__panel--menu is-open shadow-lg"
         role="menu"
         style={{ width: 240 }}
>
<div className="dd__section">
           {/* Hồ sơ cá nhân */}

           {/* Cài đặt */}
<button
             className="dd__link"
             onClick={() => {
               setOpen(false);
               navigate("/home/settings");
             }}
>
<i className="bi bi-gear dd__icon" />
<span>Cài đặt</span>
</button>
           {/* Đánh giá ứng dụng */}
<button
             className="dd__link"
             onClick={() => {
               setOpen(false);
               navigate("/home/feedback");
             }}
>
<i className="bi bi-stars dd__icon" />
<span>Đánh giá ứng dụng</span>
</button>
</div>
<div className="dd__divider" />
<div className="dd__section">
<button className="dd__link dd__danger" onClick={onLogout}>
<i className="bi bi-box-arrow-right dd__icon" />
<span>Đăng xuất</span>
</button>
</div>
</div>
     )}
<ConfirmModal
       open={confirm}
       title="Đăng xuất"
       message="Bạn có chắc chắn muốn đăng xuất không?"
       okText="Đăng xuất"
       onOk={doLogout}
       onClose={() => setConfirm(false)}
     />
</div>
 );
}