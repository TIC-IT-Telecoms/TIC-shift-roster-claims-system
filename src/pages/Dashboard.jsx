import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { profileApi }   from "../api/profileApi";
import { claimApi }     from "../api/claimApi";
import { rosterApi }    from "../api/rosterApi";
import { holidayApi }   from "../api/holidayApi";
import { QUERY_KEYS }   from "../utils/queryKeys";
import useNotifications from "../hooks/useNotifications";
import {
  getTodayStr, getWeekRange, getMonthStart,
  formatZAR, formatDate,
  getShiftLabel, getShiftTime,
  findNextShift, countScheduled,
  calcTotalEarnings, flattenRoster,
} from "../utils/helpers";

// ===== Constants =====
const todayStr   = getTodayStr();
const weekRange  = getWeekRange();
const monthStart = getMonthStart();
const monthName  = new Date().toLocaleDateString("en", { month: "short" });
const currentYear = new Date().getFullYear();

const in30Days = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
})();

const daysUntil = (dateStr) =>
  Math.ceil((new Date(dateStr + "T00:00:00") - new Date(todayStr + "T00:00:00")) / 86_400_000);

// ===== Notification icon map =====
const NOTIF_ICON = {
  claim_submitted:   { icon: "📝", color: "#b54708" },
  claim_approved:    { icon: "✅", color: "#157347" },
  claim_rejected:    { icon: "❌", color: "#b42318" },
  claim_reset:       { icon: "↺",  color: "#b54708" },
  roster_published:  { icon: "📅", color: "#006fd6" },
  holiday_alert:     { icon: "🌟", color: "#7a3aed" },
  payslip_available: { icon: "💰", color: "#157347" },
  system:            { icon: "🔔", color: "#344054" },
};

function Dashboard() {
  const navigate = useNavigate();

  // ===== Queries =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn:  profileApi.getProfile,
    select:   (d) => d.data,
  });

  const { data: weekRosterData, isLoading: loadingRoster } = useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER(weekRange),
    queryFn:  () => rosterApi.getMyRoster(weekRange),
    select:   (d) => d.data,
  });

  const { data: pendingClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ status: "Pending" }),
    queryFn:  () => claimApi.getMyClaims({ status: "Pending" }),
    select:   (d) => d.data,
  });

  const { data: approvedClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    queryFn:  () => claimApi.getMyClaims({ status: "Approved", start_date: monthStart, end_date: todayStr }),
    select:   (d) => d.data,
  });

  const { data: holidays } = useQuery({
    queryKey: QUERY_KEYS.HOLIDAYS(currentYear),
    queryFn:  () => holidayApi.getAll(currentYear),
    select:   (d) => d.data,
  });

  const { notifications, unreadCount, markRead } = useNotifications({ limit: 5 });

  // ===== Derived =====
  const emp          = profile?.employee;
  const firstName    = emp?.name?.split(" ")[0] || "there";
  const hourlyRate   = Number(emp?.hourly_rate || 0);
  const rosterEntries = flattenRoster(weekRosterData);
  const nextShift    = findNextShift(weekRosterData);
  const weekShifts   = countScheduled(weekRosterData);
  const weekHours    = weekShifts * 8;
  const totalEarnings = calcTotalEarnings(approvedClaims, hourlyRate);

  const upcomingHolidays = (holidays || [])
    .filter((h) => h.holiday_date >= todayStr && h.holiday_date <= in30Days)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  // ===== Stat cards =====
  const stats = [
    {
      icon:  nextShift?.is_public_holiday ? "🌟" : "📅",
      bg:    "bg-[#eaf4ff]",
      label: "My Next Shift",
      value: nextShift ? (nextShift.shift?.shift_name || "Scheduled") : "No shift",
      sub:   nextShift
        ? `${formatDate(nextShift.roster_date)} · ${getShiftTime(nextShift)}${nextShift.is_public_holiday ? " · 🌟 Holiday" : ""}`
        : "Nothing scheduled this week",
    },
    {
      icon:  "⏱️",
      bg:    "bg-[#e8f8ef]",
      label: "This Week",
      value: `${weekHours}h`,
      sub:   `${weekShifts} shift${weekShifts !== 1 ? "s" : ""} scheduled`,
    },
    {
      icon:  "📝",
      bg:    "bg-[#fff3e5]",
      label: "Claims",
      value: pendingClaims?.length || 0,
      sub:   "Pending approval",
    },
    {
      icon:  "💰",
      bg:    "bg-[#f1eaff]",
      label: `Earnings (${monthName})`,
      value: formatZAR(totalEarnings),
      sub:   "From approved claims",
    },
  ];

  return (
    <Layout>
      <section className="p-4 md:p-5">

        {/* ===== Header ===== */}
        <p className="text-xs text-[#667085] mb-1">Dashboard</p>
        <h2 className="text-xl font-bold text-[#1d2939] m-0">
          Welcome back, {firstName} 👋
        </h2>
        <p className="text-sm text-[#667085] mt-1 mb-5">
          {new Date().toLocaleDateString("en-ZA", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>

        {/* ===== Stats grid — 2 cols mobile, 4 cols desktop ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {stats.map(({ icon, bg, label, value, sub }) => (
            <div
              key={label}
              className="bg-white border border-[#e6edf5] rounded-xl p-3 md:p-4 flex gap-3 items-start"
            >
              <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0`}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#667085] m-0 leading-tight">{label}</p>
                <h3 className="text-base md:text-lg font-extrabold text-[#1d2939] my-1 leading-tight truncate">
                  {value}
                </h3>
                {sub && <p className="text-[10px] md:text-xs text-[#667085] m-0 leading-tight">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ===== Main grid — stacked mobile, 2-col desktop ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

          {/* ===== Mini Roster ===== */}
          <div className="bg-white border border-[#e6edf5] rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[15px] font-bold text-[#1d2939]">
                My Roster (This Week)
              </h3>
              <button
                onClick={() => navigate("/roster")}
                className="text-xs text-[#006fd6] font-bold bg-transparent border-none cursor-pointer"
              >
                Full Roster →
              </button>
            </div>

            {loadingRoster ? (
              <p className="text-sm text-[#667085]">Loading roster...</p>
            ) : rosterEntries.length === 0 ? (
              <p className="text-sm text-[#667085]">No roster generated for this week.</p>
            ) : (
              /* Horizontal scroll on mobile, 7-col grid on desktop */
              <div className="overflow-x-auto -mx-1 pb-1">
                <div className="flex gap-2 min-w-max md:min-w-0 md:grid md:grid-cols-7 px-1">
                  {rosterEntries.map((entry) => {
                    const dateStr   = entry.roster_date;
                    const isToday   = dateStr === todayStr;
                    const isOff     = entry.status === "Off";
                    const isHoliday = !!entry.is_public_holiday;
                    const isGrave   = !!entry.shift?.is_grave;
                    const label     = getShiftLabel(entry);
                    const time      = getShiftTime(entry);

                    return (
                      <div
                        key={dateStr}
                        className="text-center rounded-xl p-2 md:p-2.5 w-20 md:w-auto shrink-0 md:shrink border"
                        style={{
                          borderColor: isToday ? "#006fd6" : isHoliday ? "#d8b4fe" : "#edf2f7",
                          borderWidth:  isToday ? 2 : 1,
                          background:   isToday ? "#eaf4ff" : isHoliday ? "#f9f0ff" : "transparent",
                        }}
                      >
                        {/* Day */}
                        <strong
                          className="block text-[11px] font-bold"
                          style={{ color: isToday ? "#005bbb" : "#344054" }}
                        >
                          {new Date(dateStr + "T00:00:00")
                            .toLocaleDateString("en", { weekday: "short" })}
                        </strong>

                        {/* Date */}
                        <small className="block text-[10px] text-[#98a2b3] my-0.5">
                          {new Date(dateStr + "T00:00:00")
                            .toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                        </small>

                        {/* Shift badge */}
                        <span
                          className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={
                            isOff
                              ? { color: "#98a2b3" }
                              : isHoliday
                              ? { background: "#f1eaff", color: "#7a3aed" }
                              : { background: isToday ? "#006fd6" : "#e6edf5", color: isToday ? "white" : "#344054" }
                          }
                        >
                          {isHoliday && !isOff ? "🌟 " : ""}{label}
                        </span>

                        {/* Overnight */}
                        {isGrave && !isOff && (
                          <span className="block text-[8px] text-[#7a3aed] font-bold mt-0.5">
                            🌙 OVR
                          </span>
                        )}

                        {/* Time */}
                        <p
                          className="text-[9px] mt-1 mb-0"
                          style={{ color: isOff ? "#d0d5dd" : "#667085" }}
                        >
                          {time}
                        </p>

                        {/* Today pill */}
                        {isToday && (
                          <span className="inline-block mt-1 bg-[#006fd6] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Today
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===== Right column: Notifications + Holidays ===== */}
          <div className="flex flex-col gap-4">

            {/* Notifications */}
            <div className="bg-white border border-[#e6edf5] rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="m-0 text-[15px] font-bold text-[#1d2939] flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-[#006fd6] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => navigate("/notifications")}
                  className="text-xs text-[#006fd6] font-bold bg-transparent border-none cursor-pointer"
                >
                  View All
                </button>
              </div>

              <ul className="list-none p-0 m-0 divide-y divide-[#edf2f7]">
                {notifications.length === 0 ? (
                  <li className="flex gap-3 py-3 items-start">
                    <span className="w-2 h-2 rounded-full bg-[#e6edf5] mt-1.5 shrink-0" />
                    <p className="text-sm text-[#667085] m-0">All caught up ✓</p>
                  </li>
                ) : (
                  notifications.slice(0, 5).map((notif) => {
                    const cfg  = NOTIF_ICON[notif.type] || NOTIF_ICON.system;
                    const read = notif.is_read;

                    return (
                      <li
                        key={notif.notification_id}
                        className="flex gap-3 py-3 items-start cursor-pointer"
                        style={{ opacity: read ? 0.65 : 1 }}
                        onClick={() => {
                          if (!read) markRead.mutate(notif.notification_id);
                          navigate("/notifications");
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{ background: read ? "#e6edf5" : cfg.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs m-0 truncate"
                            style={{
                              fontWeight: read ? 400 : 700,
                              color:      read ? "#667085" : "#1d2939",
                            }}
                          >
                            {cfg.icon} {notif.title}
                          </p>
                          <small className="text-[10px] text-[#98a2b3] block truncate">
                            {notif.message}
                          </small>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-white border border-[#e6edf5] rounded-xl p-4">
              <h3 className="m-0 text-[15px] font-bold text-[#1d2939] mb-3">
                Upcoming Holidays
              </h3>

              {upcomingHolidays.length === 0 ? (
                <p className="text-sm text-[#667085] m-0">
                  No holidays in the next 30 days.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingHolidays.slice(0, 4).map((h) => {
                    const d = daysUntil(h.holiday_date);
                    const soon = d <= 7;
                    return (
                      <div
                        key={h.holiday_id}
                        className="flex justify-between items-center rounded-lg px-3 py-2 border"
                        style={{
                          background:   soon ? "#f9f0ff" : "#f4f8fd",
                          borderColor:  soon ? "#d8b4fe" : "#e6edf5",
                        }}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-[13px] font-bold text-[#344054] m-0 truncate">
                            🌟 {h.holiday_name}
                          </p>
                          <p className="text-[11px] text-[#667085] m-0">{h.holiday_date}</p>
                        </div>
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap"
                          style={{
                            background: soon ? "#f1eaff" : "#eaf4ff",
                            color:      soon ? "#7a3aed" : "#006fd6",
                          }}
                        >
                          {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d}d`}
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