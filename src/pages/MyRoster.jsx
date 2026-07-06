import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { rosterApi } from "../api/rosterApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Date helpers =====
const today = new Date();
const todayStr = today.toISOString().split("T")[0];

const getWeekRange = (offset = 0) => {
  const base = new Date(today);
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start_date: mon.toISOString().split("T")[0],
    end_date: sun.toISOString().split("T")[0],
  };
};

const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
};

const formatDay = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en", { weekday: "long" });
};

const formatTime = (start, end) => {
  if (!start || !end) return "—";
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
};

const getStatusClass = (entry) => {
  if (entry.is_public_holiday) {
    return "status-approved";
  }

  if (entry.status === "Off") {
    return "status-off";
  }

  return "status-scheduled";
};

const getShiftName = (entry) => {
  // Public Holiday
  if (entry.is_public_holiday) {
    if (entry.status === "Off") {
      return "Holiday 🎉";
    }

    const shiftName =
      entry.shift?.shift_name?.split(" ")[0] || "Holiday";

    return `${shiftName} 🎉`;
  }

  // Normal Off Day
  if (entry.status === "Off") {
    return "Day Off";
  }

  return entry.shift?.shift_name || "—";
};


const getShiftTime = (entry) => {
  if (entry.status === "Off") return "—";

  return formatTime(
    entry.shift?.start_time,
    entry.shift?.end_time
  );
};

// ===== View options =====
const VIEWS = ["Week", "Month"];

const getMonthRange = (offset = 0) => {
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const start = d.toISOString().split("T")[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  return { start_date: start, end_date: end };
};

const formatRangeLabel = (range) => {
  const s = new Date(range.start_date);
  const e = new Date(range.end_date);
  return `${s.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })} – ${e.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}`;
};

function MyRoster() {
  const [view, setView] = useState("Week");
  const [offset, setOffset] = useState(0);

  const range = view === "Week" ? getWeekRange(offset) : getMonthRange(offset);

  const { data: rosterData, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER(range),
    queryFn: () => rosterApi.getMyRoster(range),
    select: (d) => d.data,
  });

  // Flatten roster into sorted array
  const rosterList = rosterData?.roster
    ? Array.isArray(rosterData.roster)
      ? [...rosterData.roster].sort((a, b) => a.roster_date.localeCompare(b.roster_date))
      : Object.values(rosterData.roster).flat().sort((a, b) => a.roster_date.localeCompare(b.roster_date))
    : [];

  // Stats
  const scheduled = rosterList.filter((r) => r.status === "Scheduled").length;
  const offDays = rosterList.filter((r) => r.status === "Off").length;
  const holidays = new Set(rosterList
    .filter((r) => r.is_public_holiday)
    .map((r) => r.roster_date)
  ).size;

  const handlePrev = () => setOffset((o) => o - 1);
  const handleNext = () => setOffset((o) => o + 1);
  const handleToday = () => setOffset(0);

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Roster</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>My Roster</h2>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); setOffset(0); }}
                style={{
                  padding: "7px 16px", borderRadius: 7, border: "none",
                  fontWeight: 700, cursor: "pointer", fontSize: 13,
                  background: view === v ? "#006fd6" : "#eaf4ff",
                  color: view === v ? "white" : "#006fd6",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Toolbar ===== */}
        <div className="roster-toolbar">
          <button className="arrow-btn" onClick={handlePrev}>‹</button>

          <div className="date-picker" style={{ cursor: "default" }}>
            {formatRangeLabel(range)}
          </div>

          <button className="arrow-btn" onClick={handleNext}>›</button>

          <button
            className="view-btn"
            onClick={handleToday}
            style={{ marginLeft: 8 }}
          >
            Today
          </button>
        </div>

        {/* ===== Summary Pills ===== */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: `${scheduled} Scheduled`, bg: "#eaf4ff", color: "#006fd6" },
            { label: `${offDays} Off`, bg: "#f2f4f7", color: "#667085" },
            { label: `${holidays} Holiday`, bg: "#f1eaff", color: "#7a3aed" },
          ].map(({ label, bg, color }) => (
            <span key={label} style={{
              background: bg, color, padding: "5px 14px",
              borderRadius: 999, fontSize: 12, fontWeight: 700,
            }}>
              {label}
            </span>
          ))}
        </div>

        {/* ===== Roster Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading roster...</p>
          ) : isError ? (
            <p style={{ color: "#b42318", fontSize: 13, padding: "20px 0" }}>
              Failed to load roster. Please try again.
            </p>
          ) : rosterList.length === 0 ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              No roster has been generated for this period yet.
            </p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Shift</th>
                  <th>Time</th>
                  <th>Break</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {rosterList.map((entry) => {
                  const isToday = entry.roster_date === todayStr;
                  const isHoliday = entry.is_public_holiday;

                  return (
                    <tr
                      key={entry.roster_id}
                      className={isToday ? "today-row" : ""}
                      style={isHoliday ? { background: "#f9f0ff" } : {}}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isToday && (
                            <span style={{
                              background: "#006fd6", color: "white",
                              fontSize: 9, fontWeight: 700, padding: "2px 6px",
                              borderRadius: 999,
                            }}>
                              TODAY
                            </span>
                          )}
                          {formatDisplayDate(entry.roster_date)}
                        </div>
                      </td>
                      <td>{formatDay(entry.roster_date)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {getShiftName(entry)}
                        </div>
                      </td>
                      <td>{getShiftTime(entry)}</td>
                      <td>
                        {entry.status === "Scheduled" ? "30m" : "—"}
                      </td>
                      <td>
                        <span className={getStatusClass(entry)}>
                          {entry.is_public_holiday
                            ? "Holiday 🎉"
                            : entry.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ===== Shift Legend ===== */}
          {/* <div className="shift-legend" style={{ marginTop: 16 }}>
            <span>
              <b className="legend-early" />
              Early (06:00–14:00)
            </span>
            <span>
              <b className="legend-night" />
              Night (14:00–22:00)
            </span>
            <span>
              <b className="legend-grave" />
              Grave (22:00–06:00)
            </span>
            <span>
              <b className="legend-off" />
              Off Day
            </span>
            <span>
              <b className="legend-holiday" />
              Holidays
            </span>
          </div> */}

          <p className="roster-note">
            Note: Roster is subject to change. Please check regularly.
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default MyRoster;