import { NavLink } from "react-router-dom";
import { Home, Search, PlusCircle, Bookmark, User } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search", label: "Search", icon: Search, end: false },
  { to: "/post", label: "Post", icon: PlusCircle, end: false },
  { to: "/saved", label: "Saved", icon: Bookmark, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-pt-border bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-20 md:border-r md:border-t-0 md:pb-0"
    >
      <ul className="flex items-stretch justify-around md:h-full md:flex-col md:justify-start md:gap-2 md:py-6">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1 md:flex-none">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors duration-150 md:py-2 ${
                  isActive ? "text-pt-primary" : "text-pt-ink-soft hover:text-pt-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-6 w-6"
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.25 : 1.75}
                    fill={label === "Post" && isActive ? "currentColor" : "none"}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
