import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { claimApi } from "../api/claimApi";
import { rosterApi } from "../api/rosterApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import useNotifications from "../hooks/useNotifications";
import { getTodayStr, getWeekRange, getMonthStart, formatZAR,
  formatDate, getShiftLabel, getShiftTime, findNextShift,
  countScheduled, calcTotalEarnings, flattenRoster, 
} from "../utils/helpers";

// ===== Constants (computed once outside component) =====
const todayStr = getTodayStr();
const weekRange = getWeekRange();
const monthStart = getMonthStart();
const monthName = new Date().toLocaleDateString("en", { month: "short" });
const currentYear = new Date().getFullYear();

// ===== Notification type icon map =====
const NOTIF_ICON = {
  claim_submitted: { icon: "📝", color: "#b54708" },
  claim_approved: { icon: "✅", color: "#157347" },
  claim_rejected: { icon: "❌", color: "#b42318" },
  claim_reset: { icon: "↺", color: "#b54708" },
  roster_published: { icon: "📅", color: "#006fd6" },
  holiday_alert: { icon: "🌟", color: "#7a3aed" },
  payslip_available: { icon: "💰", color: "#157347" },
  system: { icon: "🔔", color: "#344054" },
};

function Dashboard() {
  const navigate = useNavigate();

  // ===== Queries =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const { data: weekRosterData, isLoading: loadingRoster } = useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER(weekRange),
    queryFn: () => rosterApi.getMyRoster(weekRange),
    select: (d) => d.data,
  });

  const { data: pendingClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ status: "Pending" }),
    queryFn: () => claimApi.getMyClaims({ status: "Pending" }),
    select: (d) => d.data,
  });

  const { data: approvedClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    queryFn: () => claimApi.getMyClaims({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    select: (d) => d.data,
  });

  // Real notifications for the panel
  const {
    notifications,
    unreadCount,
    markRead,
  } = useNotifications({ limit: 5 });

  const in30DaysStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  })();

  const { data: holidays } = useQuery({
    queryKey: QUERY_KEYS.HOLIDAYS(currentYear),
    queryFn: () => holidayApi.getAll(currentYear),
    select: (d) => d.data,
  });

  const upcomingHolidays = (holidays || []).filter(
    (h) => h.holiday_date >= todayStr && h.holiday_date <= in30DaysStr
  );

  // ===== Derived =====
  const emp = profile?.employee;
  const firstName = emp?.name?.split(" ")[0] || "there";
  const hourlyRate = Number(emp?.hourly_rate || 0);

  // ── FIX: getMyRoster returns roster as a FLAT ARRAY not grouped by date.
  // flattenRoster handles both array and grouped-object shapes safely.
  const rosterEntries = flattenRoster(weekRosterData);

  const nextShift = findNextShift(weekRosterData);
  const weekShifts = countScheduled(weekRosterData);
  const weekHours = weekShifts * 8;
  const totalEarnings = calcTotalEarnings(approvedClaims, hourlyRate);

  // ===== Stat cards =====
  const stats = [
    {
      icon: nextShift?.is_public_holiday ? "🌟" : "📅",
      cls: "",
      label: "My Next Shift",
      value: nextShift ? (nextShift.shift?.shift_name || "Scheduled") : "No shift",
      sub: nextShift
        ? `${formatDate(nextShift.roster_date)} · ${getShiftTime(nextShift)}${nextShift.is_public_holiday ? " · Public Holiday" : ""}`
        : "Nothing scheduled this week",
    },
    {
      icon: "⏱️", cls: "green",
      label: "This Week",
      value: `${weekHours}h`,
      sub: `${weekShifts} scheduled shift${weekShifts !== 1 ? "s" : ""}`,
    },
    {
      icon: "📝", cls: "orange",
      label: "Claims Status",
      value: pendingClaims?.length || 0,
      sub: "Pending approval",
    },
    {
      icon: "💰", cls: "purple",
      label: `Earnings (${monthName})`,
      value: formatZAR(totalEarnings),
      sub: "From approved claims",
    },
  ];

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard</div>

        <h2>Welcome back, {firstName} 👋</h2>
        <p className="subtitle">
          {new Date().toLocaleDateString("en-ZA", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>

        {/* ===== Stats ===== */}
        <div className="stats-grid">
          {stats.map(({ icon, cls, label, value, sub }) => (
            <div key={label} className="stat-card">
              <div className={`stat-icon ${cls}`}>{icon}</div>
              <div>
                <span>{label}</span>
                <h3>{value}</h3>
                {sub && <p>{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">

          {/* ===== Mini Roster ===== */}
          <div className="panel roster-panel">
            <div className="panel-header">
              <h3>My Roster (This Week)</h3>
              <a
                onClick={() => navigate("/roster")}
                style={{ fontSize: 12, color: "#006fd6", cursor: "pointer" }}
              >
                Full Roster →
              </a>
            </div>

            {loadingRoster ? (
              <p style={{ color: "#667085", fontSize: 13 }}>Loading roster...</p>
            ) : rosterEntries.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>
                No roster generated for this week.
              </p>
            ) : (
              <div className="mini-roster">
                {rosterEntries.map((entry) => {
                  const dateStr = entry.roster_date;
                  const isToday = dateStr === todayStr;
                  const isOff = entry.status === "Off";
                  const isHoliday = !!entry.is_public_holiday;
                  const isGrave = !!entry.shift?.is_grave;
                  const label = getShiftLabel(entry);
                  const time = getShiftTime(entry);

                  // Card background
                  const cardStyle = {
                    ...(isToday && { border: "2px solid #006fd6", background: "#eaf4ff" }),
                    ...(isHoliday && !isToday && { border: "1px solid #d8b4fe", background: "#f9f0ff" }),
                  };

                  // Shift badge style
                  const labelStyle = isOff
                    ? { color: "#98a2b3", fontSize: 11 }
                    : isHoliday
                      ? { background: "#f1eaff", color: "#7a3aed", padding: "2px 6px", borderRadius: 999, fontSize: 11, fontWeight: 800 }
                      : { background: isToday ? "#006fd6" : "#e6edf5", color: isToday ? "white" : "#344054", padding: "2px 6px", borderRadius: 999, fontSize: 11, fontWeight: 700 };

                  return (
                    <div key={dateStr} className="roster-day" style={cardStyle}>

                      {/* Day name */}
                      <strong style={{ color: isToday ? "#005bbb" : "#344054" }}>
                        {new Date(dateStr + "T00:00:00").toLocaleDateString("en", { weekday: "short" })}
                      </strong>

                      {/* Date */}
                      <small style={{ color: "#98a2b3" }}>
                        {new Date(dateStr + "T00:00:00").toLocaleDateString("en-ZA", {
                          day: "numeric", month: "short",
                        })}
                      </small>

                      {/* Shift label */}
                      <span style={labelStyle}>
                        {isHoliday && !isOff ? "🌟 " : ""}{label}
                      </span>

                      {/* Overnight indicator for grave shift */}
                      {isGrave && !isOff && (
                        <span style={{
                          fontSize: 9, color: "#7a3aed",
                          fontWeight: 700, letterSpacing: 0.3,
                        }}>
                          🌙 OVERNIGHT
                        </span>
                      )}

                      {/* Shift time */}
                      <p style={{ color: isOff ? "#d0d5dd" : "#667085", fontSize: 11 }}>
                        {time}
                      </p>

                      {/* Today badge */}
                      {isToday && (
                        <span style={{
                          background: "#006fd6", color: "white",
                          fontSize: 8, fontWeight: 800,
                          padding: "1px 5px", borderRadius: 999,
                          letterSpacing: 0.5, textTransform: "uppercase",
                        }}>
                          Today
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Notifications Panel ===== */}
          <div className="panel notifications-panel">
            <div className="panel-header">
              <h3>
                Recent Notifications
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: 8, background: "#006fd6", color: "white",
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 999,
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <a
                onClick={() => navigate("/notifications")}
                style={{ fontSize: 12, color: "#006fd6", cursor: "pointer" }}
              >
                View All
              </a>
            </div>

            <ul className="notifications-list">
              {notifications.length === 0 ? (
                <li>
                  <span style={{ background: "#e6edf5" }} />
                  <div>
                    <p style={{ color: "#667085" }}>No new notifications.</p>
                    <small>All up to date</small>
                  </div>
                </li>
              ) : (
                notifications.slice(0, 5).map((notif) => {
                  const cfg = NOTIF_ICON[notif.type] || NOTIF_ICON.system;
                  const read = notif.is_read;

                  return (
                    <li
                      key={notif.notification_id}
                      style={{ cursor: "pointer", opacity: read ? 0.65 : 1 }}
                      onClick={() => {
                        if (!read) markRead.mutate(notif.notification_id);
                        navigate("/notifications");
                      }}
                    >
                      <span style={{
                        background: read ? "#e6edf5" : cfg.color,
                        width: 8, height: 8, borderRadius: "50%",
                        flexShrink: 0, marginTop: 6,
                      }} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <p style={{
                          fontWeight: read ? 400 : 700,
                          color: read ? "#667085" : "#1d2939",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {cfg.icon} {notif.title}
                        </p>
                        <small style={{
                          color: "#98a2b3",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {notif.message}
                        </small>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            {/* Upcoming Holidays */}
            <div className="panel">
              <div className="panel-header">
                <h3>Upcoming Holidays</h3>
              </div>

              {upcomingHolidays.length === 0 ? (
                <p style={{ color: "#667085", fontSize: 13 }}>
                  No holidays in the next 30 days.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {upcomingHolidays.slice(0, 5).map((h) => {
                    const daysAway = Math.ceil(
                      (new Date(h.holiday_date) - new Date(todayStr)) / 86_400_000
                    );
                    return (
                      <div key={h.holiday_id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 12px",
                        borderRadius: 8,
                        background: daysAway <= 7 ? "#f9f0ff" : "#f4f8fd",
                        border: `1px solid ${daysAway <= 7 ? "#d8b4fe" : "#e6edf5"}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#344054" }}>
                            🌟 {h.holiday_name}
                          </div>
                          <div style={{ fontSize: 11, color: "#667085" }}>{h.holiday_date}</div>
                        </div>
                        <span style={{
                          background: daysAway <= 7 ? "#f1eaff" : "#eaf4ff",
                          color: daysAway <= 7 ? "#7a3aed" : "#006fd6",
                          padding: "3px 10px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `In ${daysAway}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Dashboard;
