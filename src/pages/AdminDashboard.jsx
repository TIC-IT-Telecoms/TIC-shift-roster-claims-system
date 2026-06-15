import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { claimApi } from "../api/claimApi";
import { holidayApi } from "../api/holidayApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import useNotifications from "../hooks/useNotifications";
import {
  formatRelativeTime, getUpcomingHolidays,
  formatZAR, formatDateTime, getTodayStr,
  getMonthStart, calcClaimEarnings, daysUntil,
  calcPayrollTotal
} from "../utils/helpers";

// ===== Constants =====
const todayStr = getTodayStr();
const monthStart = getMonthStart();
const currentYear = new Date().getFullYear();
const monthName = new Date().toLocaleDateString("en", { month: "long" });

const in30DaysStr = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
})();

// ===== Notification type config (admin view) =====
const NOTIF_CONFIG = {
  claim_submitted: { icon: "📝", bg: "#fff3e5", color: "#b54708", border: "#fed7aa" },
  claim_approved: { icon: "✅", bg: "#e8f8ef", color: "#157347", border: "#bbf7d0" },
  claim_rejected: { icon: "❌", bg: "#fee4e2", color: "#b42318", border: "#fecaca" },
  claim_reset: { icon: "↺", bg: "#fff3e5", color: "#b54708", border: "#fed7aa" },
  roster_published: { icon: "📅", bg: "#eaf4ff", color: "#006fd6", border: "#bfdbfe" },
  holiday_alert: { icon: "🌟", bg: "#f1eaff", color: "#7a3aed", border: "#d8b4fe" },
  payslip_available: { icon: "💰", bg: "#e8f8ef", color: "#157347", border: "#bbf7d0" },
  system: { icon: "🔔", bg: "#f4f8fd", color: "#344054", border: "#e6edf5" },
};

// ===== Build bar chart buckets =====
const buildChartData = (claims) => {
  const weeks = Array.from({ length: 6 }, (_, i) => ({
    label: `${[1, 7, 13, 19, 25, 31][i]} ${monthName.slice(0, 3)}`,
    submitted: 0, approved: 0, rejected: 0,
    submittedH: 0, approvedH: 0, rejectedH: 0,
  }));

  (claims || []).forEach((claim) => {
    const day = new Date(claim.claim_date).getDate();
    const idx = Math.min(Math.floor((day - 1) / 5), 5);
    weeks[idx].submitted++;
    if (claim.status === "Approved") weeks[idx].approved++;
    if (claim.status === "Rejected") weeks[idx].rejected++;
  });

  const maxVal = Math.max(...weeks.map((w) => w.submitted), 1);
  return weeks.map((w) => ({
    ...w,
    submittedH: Math.round((w.submitted / maxVal) * 120),
    approvedH: Math.round((w.approved / maxVal) * 120),
    rejectedH: Math.round((w.rejected / maxVal) * 120),
  }));
};

// ===== Build activity feed from claims =====
const buildActivityFeed = (claims) => {
  if (!claims?.length) return [];

  return [...claims]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)
    .map((claim) => {
      const name = claim.employee?.name || "An employee";
      if (claim.status === "Approved") return {
        icon: "✅", iconClass: "activity-icon green",
        text: `${name}'s claim approved`,
        time: claim.updated_at || claim.created_at,
      };
      if (claim.status === "Rejected") return {
        icon: "❌", iconClass: "activity-icon",
        text: `${name}'s claim rejected`,
        time: claim.updated_at || claim.created_at,
      };
      return {
        icon: "📝", iconClass: "activity-icon",
        text: `${name} submitted a claim`,
        time: claim.created_at,
      };
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);
};

function AdminDashboard() {
  const navigate = useNavigate();

  // ===== Queries =====
  const { data: employees } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn: employeeApi.getAll,
    select: (d) => d.data,
  });

  const { data: allMonthClaims, isLoading: loadingClaims } = useQuery({
    queryKey: QUERY_KEYS.CLAIMS({ start_date: monthStart, end_date: todayStr }),
    queryFn: () => claimApi.getAll({ start_date: monthStart, end_date: todayStr }),
    select: (d) => d.data,
  });

  const { data: pendingClaims } = useQuery({
    queryKey: QUERY_KEYS.CLAIMS({ status: "Pending" }),
    queryFn: () => claimApi.getAll({ status: "Pending" }),
    select: (d) => d.data,
  });

  const { data: approvedClaims } = useQuery({
    queryKey: QUERY_KEYS.CLAIMS({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    queryFn: () => claimApi.getAll({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    select: (d) => d.data,
  });

  const { data: holidays } = useQuery({
    queryKey: QUERY_KEYS.HOLIDAYS(currentYear),
    queryFn: () => holidayApi.getAll(currentYear),
    select: (d) => d.data,
  });

  // ===== Notifications =====
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications({ limit: 8 });

  // ===== Derived =====
  const activeEmployees = employees?.filter((e) => e.status === "Active") || [];

  const upcomingHolidays = getUpcomingHolidays(holidays);

  const totalPayroll = calcPayrollTotal(approvedClaims);

const chartData = buildChartData(allMonthClaims);
const activityFeed = buildActivityFeed(allMonthClaims);

// ===== Stats =====
const stats = [
  { icon: "👥", label: "Total Employees", value: activeEmployees.length, sub: "Active", cls: "" },
  { icon: "📋", label: "Pending Claims", value: pendingClaims?.length || 0, sub: "Awaiting Approval", cls: "green" },
  { icon: "✅", label: "Approved Claims", value: approvedClaims?.length || 0, sub: "This Month", cls: "orange" },
  { icon: "💰", label: `Payroll (${monthName})`, value: formatZAR(totalPayroll), sub: "This Month", cls: "purple" },
  { icon: "📅", label: "Upcoming Holidays", value: upcomingHolidays.length, sub: "Next 30 Days", cls: "" },
];

return (
  <Layout>
    <section className="content">
      <div className="breadcrumb">Dashboard</div>

      {/* ===== Stats ===== */}
      <div className="admin-stats-grid">
        {stats.map(({ icon, label, value, sub, cls }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon ${cls}`}>{icon}</div>
            <div>
              <span>{label}</span>
              <h3>{value}</h3>
              <p>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">

        {/* ===== Left: Chart + Activity Feed ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Chart */}
          <div className="panel">
            <div className="panel-header">
              <h3>Claims Overview — {monthName}</h3>
            </div>

            <div className="fake-chart">
              <div className="chart-legend">
                <span><b className="blue-dot" /> Submitted</span>
                <span><b className="green-dot" /> Approved</span>
                <span><b className="red-dot" /> Rejected</span>
              </div>

              {loadingClaims ? (
                <p style={{ color: "#667085", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
                  Loading chart...
                </p>
              ) : (
                <>
                  <div className="chart-bars">
                    {chartData.map((week, i) => (
                      <div className="chart-group" key={i}>
                        <div className="bar submitted" style={{ height: `${Math.max(week.submittedH, 4)}px` }} />
                        <div className="bar approved" style={{ height: `${Math.max(week.approvedH, 4)}px` }} />
                        <div className="bar rejected" style={{ height: `${Math.max(week.rejectedH, 4)}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {chartData.map((w) => <span key={w.label}>{w.label}</span>)}
                  </div>
                </>
              )}
            </div>

            {!loadingClaims && (
              <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 13, color: "#667085" }}>
                <span>Total: <strong style={{ color: "#006fd6" }}>{allMonthClaims?.length || 0}</strong></span>
                <span>Approved: <strong style={{ color: "#157347" }}>{approvedClaims?.length || 0}</strong></span>
                <span>Rejected: <strong style={{ color: "#b42318" }}>{allMonthClaims?.filter((c) => c.status === "Rejected").length || 0}</strong></span>
                <span>Pending: <strong style={{ color: "#b54708" }}>{pendingClaims?.length || 0}</strong></span>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="panel">
            <div className="panel-header">
              <h3>Recent Activity</h3>
              <a
                onClick={() => navigate("/admin-claims")}
                style={{ fontSize: 12, color: "#006fd6", cursor: "pointer" }}
              >
                View All Claims
              </a>
            </div>

            {activityFeed.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No activity this month.</p>
            ) : (
              <ul className="admin-activity-list">
                {activityFeed.map((item, i) => (
                  <li key={i}>
                    <span className={item.iconClass}>{item.icon}</span>
                    <div>
                      <strong>{item.text}</strong>
                      <small>{formatDateTime(item.time)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Right: Notifications + Holidays ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Notifications */}
          <div className="panel">
            <div className="panel-header">
              <h3>
                Notifications
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    style={{
                      background: "none", border: "none",
                      color: "#006fd6", fontSize: 12,
                      cursor: "pointer", fontWeight: 700, padding: 0,
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <a
                  onClick={() => navigate("/notifications")}
                  style={{ fontSize: 12, color: "#006fd6", cursor: "pointer" }}
                >
                  View All
                </a>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#667085" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: 13, margin: 0 }}>No new notifications.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {notifications.slice(0, 6).map((notif) => {
                  const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.system;
                  const read = notif.is_read;

                  return (
                    <div
                      key={notif.notification_id}
                      onClick={() => {
                        if (!read) markRead.mutate(notif.notification_id);
                        navigate("/notifications");
                      }}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: read ? "transparent" : `${cfg.bg}88`,
                        borderLeft: read ? "3px solid transparent" : `3px solid ${cfg.color}`,
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: read ? "#f4f8fd" : cfg.bg,
                        border: `1px solid ${read ? "#e6edf5" : cfg.border}`,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 15, flexShrink: 0,
                      }}>
                        {cfg.icon}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: "0 0 2px",
                          fontSize: 13,
                          fontWeight: read ? 400 : 700,
                          color: read ? "#667085" : "#1d2939",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {notif.title}
                        </p>
                        <small style={{
                          color: "#98a2b3",
                          fontSize: 11,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {formatRelativeTime(notif.created_at)}
                        </small>
                      </div>

                      {/* Unread dot */}
                      {!read && (
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: cfg.color, flexShrink: 0, marginTop: 4,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Holidays */}
          <div className="panel">
            <div className="panel-header">
              <h3>Upcoming Holidays</h3>
              <a
                onClick={() => navigate("/holidays")}
                style={{ fontSize: 12, color: "#006fd6", cursor: "pointer" }}
              >
                View All
              </a>
            </div>

            {upcomingHolidays.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>
                No holidays in the next 30 days.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {upcomingHolidays.slice(0, 5).map((h) => {
                  const daysAway = daysUntil(h.holiday_date);
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

export default AdminDashboard;