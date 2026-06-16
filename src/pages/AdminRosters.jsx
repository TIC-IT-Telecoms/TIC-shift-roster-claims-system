import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rosterApi } from "../api/rosterApi";
import { rotationApi } from "../api/rotationApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  getTodayStr, getWeekDates, formatRangeLabel,
  formatHeader, getShiftCell, buildTeamRosterMap,
} from "../utils/helpers";

const todayStr = getTodayStr();

// ===== Shared input style =====
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d5dd", borderRadius: 8,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

// ===== Generate Modal =====
// NOTE: default_shift_id removed — backend assigns rotation shift on holidays,
//       is_public_holiday is a flag only. No shift override on holidays.
function GenerateModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    rotation_ids: [], start_date: "", end_date: "",
  });
  const [error, setError] = useState("");

  const { data: rotations } = useQuery({
    queryKey: QUERY_KEYS.ROTATIONS,
    queryFn: rotationApi.getAll,
    select: (d) => d.data,
  });

  const generateRoster = useMutation({
    mutationFn: rosterApi.generate,
    onSuccess:  (data) => onSuccess(data),
    onError:    (err)  => setError(err.message),
  });

  const toggleRotation = (id) =>
    setForm((f) => ({
      ...f,
      rotation_ids: f.rotation_ids.includes(id)
        ? f.rotation_ids.filter((r) => r !== id)
        : [...f.rotation_ids, id],
    }));

  const handleGenerate = (e) => {
    e.preventDefault();
    setError("");
    if (!form.rotation_ids.length) { setError("Select at least one rotation cycle."); return; }
    if (!form.start_date || !form.end_date) { setError("Start and end date are required."); return; }
    generateRoster.mutate({
      rotation_ids: form.rotation_ids.map(Number),
      start_date:   form.start_date,
      end_date:     form.end_date,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#005bbb" }}>Generate Roster</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Rotation Cycles */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 8 }}>
              Rotation Cycles *
            </label>
            <div style={{ border: "1px solid #e6edf5", borderRadius: 8, padding: 10, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {rotations?.map((r) => {
                const selected = form.rotation_ids.includes(r.rotation_id);
                return (
                  <label key={r.rotation_id} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    borderRadius: 7, cursor: "pointer",
                    background: selected ? "#eaf4ff" : "transparent",
                    border: `1px solid ${selected ? "#006fd6" : "transparent"}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRotation(r.rotation_id)}
                      style={{ accentColor: "#006fd6" }}
                    />
                    <span style={{ fontSize: 13, color: "#344054", flex: 1 }}>{r.cycle_name}</span>
                    {r.is_active && (
                      <span style={{ fontSize: 11, background: "#e8f8ef", color: "#157347", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                        Active
                      </span>
                    )}
                  </label>
                );
              })}
              {!rotations?.length && (
                <p style={{ color: "#667085", fontSize: 13, margin: 0 }}>No rotation cycles found.</p>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Start Date *", key: "start_date", min: undefined },
              { label: "End Date *",   key: "end_date",   min: form.start_date },
            ].map(({ label, key, min }) => (
              <div key={key}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="date" value={form[key]} min={min}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={inp} required
                />
              </div>
            ))}
          </div>

          {/* Info note */}
          <div style={{ background: "#eaf4ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#006fd6" }}>
            ℹ️ Holiday pay is applied automatically via the public holiday calendar. Employees work their rostered shift on all dates.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 18px", border: "1px solid #d0d5dd", borderRadius: 8, background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={generateRoster.isPending}
              style={{ padding: "10px 18px", background: "#006fd6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {generateRoster.isPending ? "Generating..." : "Generate Roster"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Delete Range Modal =====
function DeleteRangeModal({ teams, onClose, onSuccess }) {
  const [form, setForm]       = useState({ start_date: "", end_date: "", team_id: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError]     = useState("");

  const deleteRange = useMutation({
    mutationFn: rosterApi.deleteRange,
    onSuccess: (data) => onSuccess(data),
    onError:   (err)  => setError(err.message),
  });

  const handleDelete = (e) => {
    e.preventDefault();
    setError("");
    if (!form.start_date || !form.end_date) { setError("Start and end date are required."); return; }
    if (!confirmed) { setError("Please confirm the deletion by checking the box below."); return; }

    const payload = { start_date: form.start_date, end_date: form.end_date };
    if (form.team_id) payload.team_id = Number(form.team_id);

    deleteRange.mutate(payload);
  };

  const scope = form.team_id
    ? teams?.find((t) => String(t.team_id) === String(form.team_id))?.team_name || "selected team"
    : "ALL teams";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: 460, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#b42318" }}>Delete Roster Range</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {/* Warning banner */}
        <div style={{
          background: "#fee4e2", border: "1px solid #fecaca",
          borderRadius: 8, padding: "12px 14px",
          fontSize: 13, color: "#b42318", marginBottom: 20,
        }}>
          ⚠️ <strong>This cannot be undone.</strong> All roster entries in the selected range will be permanently deleted.
          Employees will need to have their roster regenerated.
        </div>

        {error && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleDelete} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Start Date *", key: "start_date", min: undefined },
              { label: "End Date *",   key: "end_date",   min: form.start_date },
            ].map(({ label, key, min }) => (
              <div key={key}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="date" value={form[key]} min={min}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={inp} required
                />
              </div>
            ))}
          </div>

          {/* Team filter — optional */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>
              Team (optional)
            </label>
            <select
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              style={inp}
            >
              <option value="">All Teams</option>
              {teams?.map((t) => (
                <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "#667085", marginTop: 4 }}>
              Leave blank to delete roster entries for all teams in the date range.
            </p>
          </div>

          {/* Dynamic scope preview */}
          {form.start_date && form.end_date && (
            <div style={{
              background: "#f4f8fd", border: "1px solid #e6edf5",
              borderRadius: 8, padding: "12px 14px", fontSize: 13,
            }}>
              <strong style={{ color: "#344054" }}>Scope of deletion:</strong>
              <div style={{ marginTop: 6, color: "#667085" }}>
                📅 {form.start_date} to {form.end_date}
                <br />
                👥 {scope}
              </div>
            </div>
          )}

          {/* Confirmation checkbox */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            cursor: "pointer", padding: "10px 14px",
            background: confirmed ? "#fff0f0" : "#f4f8fd",
            border: `1px solid ${confirmed ? "#fecaca" : "#e6edf5"}`,
            borderRadius: 8,
          }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ accentColor: "#b42318", marginTop: 2, width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13, color: "#344054" }}>
              I understand this will <strong>permanently delete</strong> all roster entries for{" "}
              <strong>{scope}</strong> in the selected date range.
            </span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 18px", border: "1px solid #d0d5dd", borderRadius: 8, background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteRange.isPending || !confirmed}
              style={{
                padding: "10px 18px", background: "#dc2626", color: "white",
                border: "none", borderRadius: 8, fontWeight: 700,
                cursor: deleteRange.isPending || !confirmed ? "not-allowed" : "pointer",
                fontSize: 13, opacity: !confirmed ? 0.5 : 1,
              }}
            >
              {deleteRange.isPending ? "Deleting..." : "Delete Entries"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Main Component =====
function AdminRosters() {
  const qc = useQueryClient();

  const [offset, setOffset] = useState(0);
  const [teamFilter, setTeamFilter] = useState("");
  const [showGenModal, setShowGenModal] = useState(false);
  const [showDelModal, setShowDelModal] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [delResult, setDelResult] = useState(null);

  const weekDates = getWeekDates(offset);
  const range = { start_date: weekDates[0], end_date: weekDates[6] };

  // ===== Queries =====
  const { data: rosterData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ROSTERS({ ...range, ...(teamFilter ? { team_id: teamFilter } : {}) }),
    queryFn: () => rosterApi.getAll({ ...range, ...(teamFilter ? { team_id: teamFilter } : {}) }),
    select: (d) => d.data,
  });

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (d) => d.data,
  });

  // ===== Derived =====
  const teamRosterMap = buildTeamRosterMap(rosterData);
  const teamNames = Object.keys(teamRosterMap).sort();

  const allEntries = rosterData?.roster
    ? Object.values(rosterData.roster).flat()
    : [];

  const stats = [
    { label: `${allEntries.filter((r) => r.status === "Scheduled").length} Scheduled`, bg: "#eaf4ff", color: "#006fd6" },
    { label: `${allEntries.filter((r) => r.status === "Off").length} Off`, bg: "#f2f4f7", color: "#667085" },
    {
  label: `${
    new Set(
      allEntries
        .filter((r) => Number(r.is_public_holiday) === 1)
        .map((r) => r.roster_date)
    ).size
  } Holiday`,
  bg: "#f1eaff",
  color: "#7a3aed",
}
  ];

  const handleGenSuccess = (data) => {
    setGenResult(data.data);
    setDelResult(null);
    setShowGenModal(false);
    qc.invalidateQueries({ queryKey: ["rosters"] });
  };

  const handleDelSuccess = (data) => {
    setDelResult(data.data);
    setGenResult(null);
    setShowDelModal(false);
    qc.invalidateQueries({ queryKey: ["rosters"] });
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Rosters</div>

        <div className="page-title-row">
          <div>
            <h2>Rosters</h2>
            <p className="subtitle">Weekly shift schedule by team.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setShowDelModal(true); setGenResult(null); setDelResult(null); }}
              style={{
                padding: "10px 18px", border: "1px solid #fecaca",
                background: "white", color: "#b42318",
                borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13,
              }}
            >
              🗑 Delete Range
            </button>
            <button
              className="primary-btn"
              onClick={() => { setShowGenModal(true); setGenResult(null); setDelResult(null); }}
            >
              Generate Roster
            </button>
          </div>
        </div>

        {/* ===== Generation Result ===== */}
        {genResult && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "12px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            ✓ Roster generated —{" "}
            <strong>{genResult.total_inserted}</strong> entries inserted,{" "}
            <strong>{genResult.total_skipped}</strong> skipped,{" "}
            <strong>{genResult.holiday_flagged ?? genResult.holiday_entries ?? 0}</strong> holiday-flagged entries.
            {genResult.warning && (
              <span style={{ marginLeft: 8, color: "#b54708" }}>⚠️ {genResult.warning}</span>
            )}
          </div>
        )}

        {/* ===== Deletion Result ===== */}
        {delResult && (
          <div style={{
            background: "#fff3e5", border: "1px solid #fed7aa",
            color: "#b54708", padding: "12px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            🗑 Roster deleted — <strong>{delResult.deleted_count}</strong> entries removed for{" "}
            {delResult.date_range?.start_date} to {delResult.date_range?.end_date}.
          </div>
        )}

        {/* ===== Toolbar ===== */}
        <div className="roster-toolbar">
          <button className="arrow-btn" onClick={() => setOffset((o) => o - 1)}>‹</button>

          <div className="date-picker" style={{ cursor: "default" }}>
            {formatRangeLabel(weekDates[0], weekDates[6])}
          </div>

          <button className="arrow-btn" onClick={() => setOffset((o) => o + 1)}>›</button>

          <button
            className="filter-btn"
            onClick={() => setOffset(0)}
            style={{ marginLeft: 4 }}
          >
            Today
          </button>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="filter-btn"
            style={{ cursor: "pointer" }}
          >
            <option value="">All Teams</option>
            {teams?.map((t) => (
              <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
            ))}
          </select>
        </div>

        {/* ===== Summary Pills =====*/}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {stats.map(({ label, bg, color }) => (
            <span key={label} style={{
              background: bg, color,
              padding: "5px 14px", borderRadius: 999,
              fontSize: 12, fontWeight: 700,
            }}>
              {label}
            </span>
          ))}
        </div> 

        {/* ===== Roster Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading roster...</p>
          ) : teamNames.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "#667085", fontSize: 14 }}>No roster generated for this period.</p>
              <button
                className="primary-btn"
                onClick={() => setShowGenModal(true)}
                style={{ marginTop: 12 }}
              >
                Generate Now
              </button>
            </div>
          ) : (
            <table className="roster-table admin-roster-table">
              <thead>
                <tr>
                  <th>Team</th>
                  {weekDates.map((date) => {
                    const { day, date: dateLabel } = formatHeader(date);
                    const isToday = date === todayStr;
                    return (
                      <th key={date} style={isToday ? { background: "#006fd6", color: "white" } : {}}>
                        {day}<br />{dateLabel}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {teamNames.map((teamName) => (
                  <tr key={teamName}>
                    <td><strong style={{ color: "#344054" }}>{teamName}</strong></td>
                    {weekDates.map((date) => {
                      const entry = teamRosterMap[teamName]?.[date];
                      const { label, style } = getShiftCell(entry);
                      const isToday = date === todayStr;
                      return (
                        <td key={date} style={isToday ? { background: "#f0f7ff" } : {}}>
                          <span style={style}>
                            {entry?.is_public_holiday && label !== "Off" ? `${label}` : label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="shift-legend" style={{ marginTop: 16 }}>
            <span><b className="legend-early" /> Early (06–14)</span>
            <span><b className="legend-night" /> Night (14–22)</span>
            <span><b className="legend-grave" /> Grave (22–06)</span>
            <span><b className="legend-off" /> Day Off</span>
            <span><b className="legend-holiday" /> Holiday-flagged</span>
          </div>

          <p className="roster-note">Note: Roster is subject to change. Please check regularly.</p>
        </div>

        {/* ===== Generate Modal ===== */}
        {showGenModal && (
          <GenerateModal
            onClose={() => setShowGenModal(false)}
            onSuccess={handleGenSuccess}
          />
        )}

        {/* ===== Delete Range Modal ===== */}
        {showDelModal && (
          <DeleteRangeModal
            teams={teams}
            onClose={() => setShowDelModal(false)}
            onSuccess={handleDelSuccess}
          />
        )}

      </section>
    </Layout>
  );
}

export default AdminRosters;
