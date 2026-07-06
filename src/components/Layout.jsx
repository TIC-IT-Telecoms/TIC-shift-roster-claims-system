import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { useAuthStore } from "../store/authStore";
import useNotifications from "../hooks/useNotifications";
import GlobalSearch from "./ui/GlobalSearch";

// ===== Nav items per role =====
const ADMIN_NAV = [
  { to: "/admin-dashboard", label: "🏠 Admin Dashboard" },
  { to: "/employees", label: "👥 Employees" },
  { to: "/teams", label: "🏢 Teams" },
  { to: "/shifts", label: "🕐 Shifts" },
  { to: "/rotation-cycles", label: "🔄 Rotation Cycles" },
  { to: "/admin-rosters", label: "📅 Rosters" },
  { to: "/admin-claims", label: "📋 Claims" },
  { to: "/admin-payroll", label: "💰 Payroll" },
  { to: "/compliance", label: "🛡️ Compliance" },
  { to: "/holidays", label: "🌟 Holidays" },
  { to: "/admin-reports", label: "📊 Reports" },
  { to: "/admin-settings", label: "⚙️ Settings" },
];

const EMPLOYEE_NAV = [
  { to: "/dashboard", label: "🏠 Dashboard" },
  { to: "/profile", label: "👤 My Profile" },
  { to: "/roster", label: "📅 My Roster" },
  { to: "/claims", label: "📋 My Claims" },
  { to: "/payroll", label: "💰 My Payroll" },
  { to: "/reports", label: "📊 My Reports" },
  { to: "/notifications", label: "🔔 Notifications" },
  { to: "/settings", label: "⚙️ Settings" },
];

// ===== Initials from name =====
const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

function Layout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  // Auth
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuth);

  const role = (
    user?.user?.user?.role ||
    "Employee"
  ).toLowerCase();

  const isAdmin = role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  const emp = user?.user || [];
  const empName = emp?.name || "User";
  const empPos = emp?.position || (isAdmin ? "Administrator" : "Employee");

  const { unreadCount } = useNotifications({
    limit: 1,
    unreadOnly: true,
    enabled: isAuth,
  });

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    window.location.href = "/";
  };

  const closeSidebar = () => setOpen(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f8fd]">

      {/* ===== Mobile overlay ===== */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside className={`
        fixed top-0 left-0 h-screen w-60 bg-white z-50 flex flex-col
        border-r border-[#e6edf5] shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:static md:translate-x-0 md:shadow-none
      `}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-14 bg-[#006fd6] shrink-0">
          <div className="w-8 h-8 bg-[#005bbb] rounded-lg flex items-center justify-center text-lg shrink-0">
            🛡️
          </div>
          <div className="min-w-0">
            <h3 className="m-0 text-white text-xs font-bold leading-tight truncate">NOC Roster</h3>
            <p className="m-0 text-white text-[9px] opacity-80 truncate">
              {isAdmin ? "Management System" : "Employee Portal"}
            </p>
          </div>
          <button
            className="ml-auto md:hidden text-white text-xl"
            onClick={closeSidebar}
          >
            <HiX />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3 overflow-y-auto flex-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 no-underline
                ${isActive
                  ? "bg-[#eaf4ff] text-[#006fd6] font-bold"
                  : "text-[#344054] hover:bg-[#eaf4ff] hover:text-[#006fd6]"
                }
              `}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#e6edf5] shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#344054] hover:bg-[#fee4e2] hover:text-[#b42318] transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ===== Main area ===== */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ===== Topbar ===== */}
        <header className="bg-[#006fd6] text-white h-14 flex items-center gap-3 px-3 md:px-4 shrink-0">
          <button
            className="md:hidden text-2xl text-white shrink-0"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <HiMenu />
          </button>

          <div className="flex items-center gap-2 md:hidden shrink-0">
            <div className="w-7 h-7 bg-[#005bbb] rounded-lg flex items-center justify-center text-sm">
              🛡️
            </div>
            <div className="hidden sm:block">
              <h4 className="m-0 text-white text-xs font-bold leading-tight">NOC ROSTER</h4>
              <span className="text-white text-[8px] opacity-80">
                {isAdmin ? "MANAGEMENT SYSTEM" : "EMPLOYEE PORTAL"}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex justify-center">
            <div className="w-full max-w-md">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => navigate("/notifications")}
              className="relative text-white text-lg cursor-pointer bg-transparent border-none p-1"
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="w-8 h-8 rounded-full bg-[#eaf4ff] text-[#006fd6] flex items-center justify-center font-bold text-xs shrink-0">
              {getInitials(empName)}
            </div>

            <div className="hidden lg:flex flex-col text-xs leading-tight max-w-30">
              <strong className="truncate">{empName}</strong>
              <small className="opacity-80 truncate capitalize">{empPos}</small>
            </div>
          </div>
        </header>

        {/* ===== Page content ===== */}
        <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;