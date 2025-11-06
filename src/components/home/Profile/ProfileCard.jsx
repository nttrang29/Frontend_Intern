import "../../../styles/home/Profile.css";

export default function ProfileCard({ user }) {
  const u = user || {
    name: "Trần Vinh Trí",
    email: "admin@example.com",
    avatar: "https://i.pravatar.cc/150?img=13",
  };

  return (
    <div className="profile__card-minimal">
      <div className="profile__avatar">
        <img src={u.avatar} alt="Ảnh đại diện" />
      </div>
      <h5 className="profile__name">{u.name}</h5>
      <p className="profile__email">{u.email}</p>
    </div>
  );
}
