// src/pages/MyRoster.jsx
import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { rosterApi } from "../api/rosterApi";
import { QUERY_KEYS } from "../utils/queryKeys";

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

// ===== Date helpers =====
const getWeekRange = (offset = 0) => {
  const base = new Date(today);
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start_date: mon.toISOString().split("T")[0], end_date: sun.toISOString().split("T")[0] };
};

const getMonthRange = (offset = 0) => {
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start_date: d.toISOString().split("T")[0],
    end_date: end > new Date(todayStr) ? todayStr : end.toISOString().split("T")[0],
  };
};

const formatRangeLabel = ({ start_date, end_date }) => {
  const fmt = (s) => new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start_date)} – ${fmt(end_date)}`;
};

const formatDisplayDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

const formatDay = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en", { weekday: "long" });

const fmtTime = (s, e) => (s && e ? `${s.slice(0, 5)} – ${e.slice(0, 5)}` : "—");

const getShiftName = (entry) => {
  if (entry.is_public_holiday) return entry.status === "Off" ? "Holiday 🎉" : `${entry.shift?.shift_name?.split(" ")[0] || "Holiday"} 🎉`;
  if (entry.status === "Off") return "Day Off";
  return entry.shift?.shift_name || "—";
};

const getShiftTime = (entry) =>
  entry.status === "Off" ? "—" : fmtTime(entry.shift?.start_time, entry.shift?.end_time);

const getStatusClass = (entry) => {
  if (entry.is_public_holiday) return "status-approved";
  if (entry.status === "Off") return "status-off";
  return "status-scheduled";
};

const VIEWS = ["Week", "Month"];

function MyRoster() {
  const [view, setView] = useState("Week");
  const [offset, setOffset] = useState(0);

  const range = view === "Week" ? getWeekRange(offset) : getMonthRange(offset);

  const { data: rosterData, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER(range),
    queryFn: () => rosterApi.getMyRoster(range),
    select: (d) => d.data,
  });

  const rosterList = rosterData?.roster
    ? (Array.isArray(rosterData.roster)
      ? [...rosterData.roster]
      : Object.values(rosterData.roster).flat()
    ).sort((a, b) => a.roster_date.localeCompare(b.roster_date))
    : [];

  const scheduled = rosterList.filter((r) => r.status === "Scheduled").length;
  const offDays = rosterList.filter((r) => r.status === "Off").length;
  const holidays = new Set(rosterList.filter((r) => r.is_public_holiday).map((r) => r.roster_date)).size;

  return (
    <Layout>
      <section className="p-4 md:p-5">
        <p className="text-xs text-[#667085] mb-3">Dashboard &gt; My Roster</p>

        {/* ===== Title + view toggle ===== */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="m-0 text-xl font-bold text-[#1d2939]">My Roster</h2>
          <div className="flex gap-1.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); setOffset(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-colors ${view === v ? "bg-[#006fd6] text-white" : "bg-[#eaf4ff] text-[#006fd6]"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Nav toolbar ===== */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="bg-[#006fd6] text-white border-none rounded-lg px-3 py-2 font-bold cursor-pointer text-base"
          >‹</button>

          <div className="flex-1 md:flex-none min-w-0 text-center bg-white border border-[#dbe7f3] rounded-lg px-3 py-2 font-bold text-[#344054] text-sm truncate">
            {formatRangeLabel(range)}
          </div>

          <button
            onClick={() => setOffset((o) => o + 1)}
            className="bg-[#006fd6] text-white border-none rounded-lg px-3 py-2 font-bold cursor-pointer text-base"
          >›</button>

          <button
            onClick={() => setOffset(0)}
            className="bg-[#006fd6] text-white border-none rounded-lg px-4 py-2 font-bold cursor-pointer text-sm"
          >
            Today
          </button>
        </div>

        {/* ===== Summary pills ===== */}
        <div className="flex gap-2 flex-wrap mb-4">
          {[
            { label: `${scheduled} Scheduled`, bg: "#eaf4ff", color: "#006fd6" },
            { label: `${offDays} Off`, bg: "#f2f4f7", color: "#667085" },
            { label: `${holidays} Holiday`, bg: "#f1eaff", color: "#7a3aed" },
          ].map(({ label, bg, color }) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: bg, color }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* ===== Table with horizontal scroll on mobile ===== */}
        <div className="bg-white border border-[#e6edf5] rounded-xl p-4">
          {isLoading ? (
            <p className="text-sm text-[#667085] py-4">Loading roster...</p>
          ) : isError ? (
            <p className="text-sm text-[#b42318] py-4">Failed to load roster. Please try again.</p>
          ) : rosterList.length === 0 ? (
            <p className="text-sm text-[#667085] py-4">No roster generated for this period yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200">Date</th>
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200 hidden sm:table-cell">Day</th>
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200">Shift</th>
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200">Time</th>
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200 hidden md:table-cell">Break</th>
                    {/* Status column hidden on mobile */}
                    <th className="text-left text-sm text-gray-700 px-3 py-3 border-b border-gray-200 hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterList.map((entry) => {
                    const isToday = entry.roster_date === todayStr;
                    const isHoliday = entry.is_public_holiday;
                    return (
                      <tr
                        key={entry.roster_id}
                        className={`${isToday ? "bg-blue-50" : ""} ${isHoliday && !isToday ? "bg-purple-50" : ""}`}
                      >
                        <td className="px-3 py-3.5 text-sm border-b border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isToday && (
                              <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                TODAY
                              </span>
                            )}
                            <span className="text-sm text-gray-700">{formatDisplayDate(entry.roster_date)}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3.5 text-sm text-gray-500 border-b border-gray-100">
                          {formatDay(entry.roster_date)}
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-700 font-medium border-b border-gray-100">
                          {getShiftName(entry)}
                          {entry.shift?.is_grave && entry.status !== "Off" && (
                            <span className="block text-[10px] text-purple-600 font-bold">🌙 Overnight</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-500 border-b border-gray-100">
                          {getShiftTime(entry)}
                        </td>
                        <td className="hidden md:table-cell px-3 py-3.5 text-sm text-gray-500 border-b border-gray-100">
                          {entry.status === "Scheduled" ? "30m" : "—"}
                        </td>
                        {/* Status cell hidden on mobile */}
                        <td className="hidden sm:table-cell px-3 py-3.5 border-b border-gray-100">
                          <span className={getStatusClass(entry)}>
                            {entry.is_public_holiday ? "Holiday 🎉" : entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          )}

          <p className="roster-note mt-4">Note: Roster is subject to change. Please check regularly.</p>
        </div>
      </section>
    </Layout>
  );
}

export default MyRoster;