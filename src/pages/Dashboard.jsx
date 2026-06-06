// src/pages/Dashboard.jsx
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { claimApi } from "../api/claimApi";
import { rosterApi } from "../api/rosterApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  getTodayStr,
  getWeekRange,
  getMonthStart,
  formatZAR,
  formatDate,
  getShiftLabel,
  getShiftTime,
  findNextShift,
  countScheduled,
  calcTotalEarnings,
} from "../utils/helpers";

const todayStr = getTodayStr();
const weekRange = getWeekRange();
const monthStart = getMonthStart();
const monthName = new Date().toLocaleDateString("en", { month: "short" });

function Dashboard() {
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
    queryKey: QUERY_KEYS.MY_CLAIMS({ status: "Approved" }),
    queryFn: () => claimApi.getMyClaims({ status: "Approved" }),
    select: (d) => d.data,
  });

  // ===== Derived =====
  const emp = profile?.employee;
  const firstName = emp?.name?.split(" ")[0] || "there";
  const hourlyRate = Number(emp?.hourly_rate || 0);

  const weekRoster = weekRosterData?.roster;

  // Sorted week entries for mini roster grid
  const rosterList = weekRoster
    ? Object.entries(weekRoster).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const nextShift = findNextShift(weekRosterData);
  const weekShifts = countScheduled(weekRosterData);
  const weekHours = weekShifts * 8;
  const totalEarnings = calcTotalEarnings(approvedClaims, hourlyRate);

  // ===== Stat cards config =====
  const stats = [
    {
      icon: "📅", cls: "",
      label: "My Next Shift",
      value: nextShift ? nextShift.shift?.shift_name || "Scheduled" : "No shift",
      sub: nextShift
        ? `${formatDate(nextShift.roster_date)} · ${getShiftTime(nextShift)}`
        : "Nothing scheduled",
    },
    {
      icon: "⏱️", cls: "green",
      label: "This Week",
      value: `${weekHours}h 00m`,
      sub: "Total Hours",
    },
    {
      icon: "📝", cls: "orange",
      label: "Claims Status",
      value: pendingClaims?.length || 0,
      sub: "Pending",
    },
    {
      icon: "💰", cls: "purple",
      label: `Total Earnings (${monthName})`,
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
          {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
            </div>

            {loadingRoster ? (
              <p style={{ color: "#667085", fontSize: 13 }}>Loading roster...</p>
            ) : rosterList.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No roster generated for this week.</p>
            ) : (
              <div className="mini-roster">
                {rosterList.map(([dateStr, entries]) => {
                  const entry = entries[0];
                  const isToday = dateStr === todayStr;
                  const isOff = entry?.status === "Off";
                  // const isHoliday = entry?.status === "Holiday";
                  const label = getShiftLabel(entry);
                  const time = getShiftTime(entry);

                  return (
                    <div
                      key={dateStr}
                      className="roster-day"
                      style={isToday ? { border: "2px solid #006fd6", background: "#eaf4ff" } : {}}
                    >
                      <strong>
                        {new Date(dateStr).toLocaleDateString("en", { weekday: "short" })}
                      </strong>
                      <small>
                        {new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </small>
                      <span
                        className={isOff ? "off" : ""}
                        // style={isHoliday ? { background: "#f1eaff", color: "#7a3aed" } : {}}
                      >
                        {label}
                      </span>
                      <p>{time}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Notifications ===== */}
          <div className="panel notifications-panel">
            <div className="panel-header">
              <h3>Recent Notifications</h3>
              <a href="/notifications" style={{ fontSize: 12, color: "#006fd6" }}>View All</a>
            </div>

            <ul className="notifications-list">
              {nextShift && (
                <li>
                  <span />
                  <div>
                    <p>Next shift: <b>{nextShift.shift?.shift_name}</b> on {formatDate(nextShift.roster_date)}</p>
                    <small>{getShiftTime(nextShift)}</small>
                  </div>
                </li>
              )}
              
              {approvedClaims?.slice(0, 2).map((claim) => (
                <li key={claim.claim_id}>
                  <span />
                  <div>
                    <p>Your claim for <b>{claim.claim_date}</b> ({claim.shift_type}) is approved.</p>
                    <small>{formatDate(claim.created_at)}</small>
                  </div>
                </li>
              ))}

              {pendingClaims?.slice(0, 2).map((claim) => (
                <li key={claim.claim_id}>
                  <span />
                  <div>
                    <p>Your claim for <b>{claim.claim_date}</b> ({claim.shift_type}) is pending.</p>
                    <small>{formatDate(claim.created_at)}</small>
                  </div>
                </li>
              ))}

              

              {!pendingClaims?.length && !nextShift && (
                <li>
                  <span />
                  <div>
                    <p>No new notifications.</p>
                    <small>All up to date</small>
                  </div>
                </li>
              )}
            </ul>
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default Dashboard;