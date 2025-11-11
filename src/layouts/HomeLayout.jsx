import { Outlet } from "react-router-dom";
import HomeSidebar from "../components/home/Sidebar/HomeSidebar";
import HomeTopbar from "../components/home/Topbar/HomeTopbar";
import "../styles/home/HomeLayout.css";

export default function HomeLayout() {
  return (
    <div className="home-page">
      
      <div className="home-page__bg">
       
      </div>

      {/* Overlay mờ nhẹ */}
      <div className="home-page__overlay" />

      {/* Layout tổng */}
      <div className="home__wrap">
        {/* Sidebar bên trái */}
        <aside className="home__sidebar">
          <div className="sb__container">
            <HomeSidebar />
          </div>
        </aside>

        {/* Phần chính bên phải */}
        <main className="home__main">
          {/* Thanh topbar cố định phía trên nội dung */}
          <div className="home__topbar">
            <HomeTopbar />
          </div>

          {/* Khu vực nội dung */}
          <div className="home__content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}