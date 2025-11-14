import { useRef, useState } from "react";
import "../../../styles/home/Profile.css";

export default function ProfileCard({ user, onChangeAvatar }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const u = user || {
    name: "Trần Vinh Trí",
    email: "admin@example.com",
    avatar: "https://i.pravatar.cc/150?img=13",
  };

  const avatarSrc = preview || u.avatar;

  // Xử lý khi chọn ảnh
  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    onChangeAvatar?.(file); // Gọi callback nếu có
  };

  return (
    <div className="profile__card-minimal">
      <div
        className="profile__avatar editable"
        onClick={() => fileRef.current?.click()}
        title="Nhấn để đổi ảnh đại diện"
      >
        <img src={avatarSrc} alt="Ảnh đại diện" />
        <div className="profile__avatar-overlay">
          <i className="bi bi-camera-fill"></i>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          style={{ display: "none" }}
          onChange={handleSelect}
        />
      </div>

      <h5 className="profile__name">{u.name}</h5>
      <p className="profile__email">{u.email}</p>
    </div>
  );
}
