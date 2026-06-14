import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import useNotifications from "../hooks/useNotifications";
import GlobalSearch from "./ui/GlobalSearch";

function Layout({ children }) {
  const { user } = useAuthStore();
  const role = user?.user?.user?.role || "Employee";

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    window.location.href = "/";
  };

  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuth);

  const { unreadCount } = useNotifications({
    limit: 1,
    unreadOnly: true,
    enabled: isAuth,
  });

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-icon">🛡️</div>
          <div>
            <h3>NOC Roster</h3>
            <p>{role === "Admin" ? "Management System" : "Employee Portal"}</p>
          </div>
        </div>

        <nav className="side-menu">
          {role === "Admin" ? (
            <>
              <NavLink to="/admin-dashboard">🏠 Admin Dashboard</NavLink>
              <NavLink to="/employees">👥 Employees</NavLink>
              <NavLink to="/teams">🏢 Teams</NavLink>
              <NavLink to="/shifts">🕐 Shifts</NavLink>
              <NavLink to="/rotation-cycles">🔄 Rotation Cycles</NavLink>
              <NavLink to="/admin-rosters">📅 Rosters</NavLink>
              <NavLink to="/admin-claims">📋 Claims</NavLink>
              <NavLink to="/payroll-admin">💰 Payroll</NavLink>
              <NavLink to="/compliance">🛡️ Compliance</NavLink>
              <NavLink to="/holidays">🌟 Holidays</NavLink>
              <NavLink to="/admin-reports">📊 Reports</NavLink>
              <NavLink to="/admin-settings">⚙️ Settings</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard">🏠 Dashboard</NavLink>
              <NavLink to="/profile">👤 My Profile</NavLink>
              <NavLink to="/roster">📅 My Roster</NavLink>
              <NavLink to="/claims">📋 My Claims</NavLink>
              <NavLink to="/approvals">✅ My Approvals</NavLink>
              <NavLink to="/payroll">💰 My Payroll</NavLink>
              <NavLink to="/reports">📊 My Reports</NavLink>
              <NavLink to="/notifications">🔔 Notifications</NavLink>
              <NavLink to="/settings">⚙️ Settings</NavLink>
            </>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="top-brand">
            <div className="small-logo">🛡️</div>
            <div>
              <h4>NOC ROSTER & CLAIMS</h4>
              <span>{role === "Admin" ? "MANAGEMENT SYSTEM" : "EMPLOYEE PORTAL"}</span>
            </div>
          </div>

          <GlobalSearch />

          <div className="top-actions">

            <div
              className="bell"
              onClick={() => navigate("/notifications")}
              style={{ cursor: "pointer", position: "relative" }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: "#dc2626",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  lineHeight: 1,
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="avatar">{getInitials(user?.user?.name)}</div>
            <div className="user-info">
              <strong>{user?.user?.name}</strong>
              <small style={{ textTransform: "capitalize" }}>{user?.user?.position}</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default Layout;