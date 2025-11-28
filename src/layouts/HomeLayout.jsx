import { Outlet } from "react-router-dom";
import HomeSidebar from "../components/home/Sidebar/HomeSidebar";
import HomeTopbar from "../components/home/Topbar/HomeTopbar";
import ChatWidget from "../components/common/ChatWidget/ChatWidget";
import "../styles/pages/HomeLayout.css";

export default function HomeLayout() {
  return (
    <div className="home-page">
      {/* (Tuỳ chọn) Ảnh nền — overlay đã tắt */}
      <div className="home-page__bg">
        <img className="home-page__bg-img" src="/images/home-bg.jpg" alt="" />
      </div>
      <div className="home-page__overlay" />

      {/* Sidebar cố định */}
      <aside className="home__sidebar">
        <HomeSidebar />
      </aside>

      {/* Khối bao nội dung */}
      <div className="home__wrap">
        <main className="home__main">
          {/* TOPBAR CỐ ĐỊNH */}
          <div className="home__topbar">
            <div className="tb__wrap">
              <HomeTopbar />
            </div>
          </div>

         

          {/* Vùng nội dung cuộn */}
          <div className="home__content">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
