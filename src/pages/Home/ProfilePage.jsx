import ProfileCard from "../../components/home/Profile/ProfileCard";
import ProfileInfoCard from "../../components/home/Profile/ProfileInfoCard";   // <-- import

export default function ProfilePage() {
  const user = {
    name: "Trần Vinh Trí",
    email: "admin@example.com",
    phone: "09xx xxx xxx",
    role: "Người dùng",
    joined: "10/2024",
    avatar: "https://i.pravatar.cc/150?img=13",
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 className="mb-3">Hồ sơ cá nhân</h2>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        <ProfileCard user={user} />
        <ProfileInfoCard user={user} />     {/* <-- render ở đây */}
      </div>
    </div>
  );
}
