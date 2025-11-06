import { Outlet } from "react-router-dom";
import HomeSidebar from "../components/home/Sidebar/HomeSidebar";
import HomeTopbar from "../components/home/Topbar/HomeTopbar";
import "../styles/home/HomeLayout.css";

export default function HomeLayout() {
  return (
    <div className="home__wrap">
      <aside className="home__sidebar">
        <HomeSidebar />
      </aside>
      <main className="home__main">
        <HomeTopbar />
        <div className="home__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
