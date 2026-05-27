import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { claimApi } from "../api/claimApi";
import { holidayApi } from "../api/holidayApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  formatZAR, formatDateTime, getTodayStr,
  getMonthStart, calcClaimEarnings,
} from "../utils/helpers";

const todayStr = getTodayStr();
const monthStart = getMonthStart();
const currentYear = new Date().getFullYear();
const monthName = new Date().toLocaleDateString("en", { month: "long" });

const in30DaysStr = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
})();

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

const buildActivityFeed = (claims) => {
  if (!claims?.length) return [];

  return [...claims]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map((claim) => {
      const name = claim.employee?.name || "An employee";
      if (claim.status === "Approved") return {
        icon: "✅", iconClass: "activity-icon green",
        text: `${name} claim approved`,
        time: claim.updated_at || claim.created_at,
      };
      if (claim.status === "Rejected") return {
        icon: "❌", iconClass: "activity-icon",
        text: `${name} claim rejected`,
        time: claim.updated_at || claim.created_at,
      };
      return {
        icon: "📝", iconClass: "activity-icon",
        text: `${name} submitted a claim`,
        time: claim.created_at,
      };
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 4);
};

function AdminDashboard() {
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

  // ===== Derived values =====
  const activeEmployees = employees?.filter((e) => e.status === "Active") || [];

  const upcomingHolidays = (holidays || []).filter(
    (h) => h.holiday_date >= todayStr && h.holiday_date <= in30DaysStr
  );

  const totalPayroll = (approvedClaims || []).reduce((sum, claim) => {
    const rate = Number(claim.employee?.hourly_rate || 0);
    return sum + calcClaimEarnings(claim, rate).total;
  }, 0);

  const chartData = buildChartData(allMonthClaims);
  const activityFeed = buildActivityFeed(allMonthClaims);

  // ===== Stats config =====
  const stats = [
    { icon: "👥", label: "Total Employees", value: activeEmployees.length, sub: "Active Employees" },
    { icon: "📋", label: "Pending Claims", value: pendingClaims?.length || 0, sub: "Awaiting Approval", cls: "green" },
    { icon: "✅", label: "Approved Claims", value: approvedClaims?.length || 0, sub: "This Month", cls: "orange" },
    { icon: "💰", label: `Total Payroll (${monthName})`, value: formatZAR(totalPayroll), sub: "This Month", cls: "purple" },
    { icon: "📅", label: "Upcoming Holidays", value: upcomingHolidays.length, sub: "Next 30 Days" },
  ];

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard</div>

        {/* ===== Stats ===== */}
        <div className="admin-stats-grid">
          {stats.map(({ icon, label, value, sub, cls }) => (
            <div key={label} className="stat-card">
              <div className={`stat-icon ${cls || ""}`}>{icon}</div>
              <div>
                <span>{label}</span>
                <h3>{value}</h3>
                <p>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-dashboard-grid">

          {/* ===== Chart ===== */}
          <div className="panel">
            <div className="panel-header">
              <h3>Claims Overview (This Month)</h3>
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

            {/* Summary row */}
            {!loadingClaims && (
              <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 13, color: "#667085" }}>
                <span>Total: <strong style={{ color: "#006fd6" }}>{allMonthClaims?.length || 0}</strong></span>
                <span>Approved: <strong style={{ color: "#157347" }}>{approvedClaims?.length || 0}</strong></span>
                <span>Rejected: <strong style={{ color: "#b42318" }}>{allMonthClaims?.filter((c) => c.status === "Rejected").length || 0}</strong></span>
              </div>
            )}
          </div>

          {/* ===== Activity Feed ===== */}
          <div className="panel">
            <div className="panel-header">
              <h3>Recent Activities</h3>
              <a href="/admin-claims" style={{ fontSize: 12, color: "#006fd6" }}>View All</a>
            </div>

            {activityFeed.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No recent activity this month.</p>
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

            {/* Upcoming holidays */}
            {upcomingHolidays.length > 0 && (
              <div style={{ marginTop: 16, borderTop: "1px solid #edf2f7", paddingTop: 14 }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>Upcoming Holidays</p>
                {upcomingHolidays.slice(0, 2).map((h) => (
                  <div key={h.holiday_id} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 13, padding: "6px 0", borderBottom: "1px solid #edf2f7",
                  }}>
                    <span style={{ color: "#344054" }}>{h.holiday_name}</span>
                    <span style={{ color: "#667085" }}>{h.holiday_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default AdminDashboard;