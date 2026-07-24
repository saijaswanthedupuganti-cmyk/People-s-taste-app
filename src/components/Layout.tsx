import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-pt-surface-2 md:pl-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
