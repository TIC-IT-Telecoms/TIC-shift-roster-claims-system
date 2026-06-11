import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rotationApi } from "../api/rotationApi";
import { teamApi } from "../api/teamApi";
import { shiftApi } from "../api/shiftApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatDate, getTodayStr } from "../utils/helpers";
import ConfirmationModal from "../components/ui/ConfirmationModal";

const todayStr = getTodayStr();

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd",
  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
};

// ===== Resolve current cycle day =====
const resolveCurrentDay = (startDate, cycleLength) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const target = new Date(todayStr);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  return (diff % cycleLength) + 1;
};

const isActive = (startDate) => startDate && startDate <= todayStr;

// ===== Modal: Add / Edit Cycle =====
function CycleModal({ cycle, teams, shifts, onClose, onSuccess }) {
  const isEdit = !!cycle;
  const [form, setForm] = useState({
    cycle_name: cycle?.cycle_name || "",
    cycle_length: cycle?.cycle_length || "",
    start_date: cycle?.start_date || "",
    description: cycle?.description || "",
    details: cycle?.details?.map((d) => ({
      day_number: d.day_number,
      team_id: d.team_id,
      shift_id: d.shift_id,
    })) || [],
  });
  const [error, setError] = useState("");
  const [confirmingCycle, setConfirmingCycle] = useState(null);
  const qc = useQueryClient();

  const createCycle = useMutation({
    mutationFn: rotationApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS }); onSuccess("Rotation cycle created successfully."); },
    onError: (err) => setError(err.message),
  });

  const updateCycle = useMutation({
    mutationFn: (data) => rotationApi.update(cycle.rotation_id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS }); onSuccess("Rotation cycle updated successfully."); },
    onError: (err) => setError(err.message),
  });

  const addRow = () =>
    setForm((f) => ({ ...f, details: [...f.details, { day_number: "", team_id: "", shift_id: "" }] }));

  const removeRow = (i) =>
    setForm((f) => ({ ...f, details: f.details.filter((_, idx) => idx !== i) }));

  const updateRow = (i, key, val) =>
    setForm((f) => {
      const d = [...f.details];
      d[i] = { ...d[i], [key]: val };
      return { ...f, details: d };
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.cycle_name.trim()) { setError("Cycle name is required."); return; }
    if (!form.cycle_length || Number(form.cycle_length) < 1) { setError("Cycle length must be at least 1."); return; }
    if (!form.start_date) { setError("Start date is required."); return; }

    const payload = {
      ...form,
      cycle_length: Number(form.cycle_length),
      details: form.details.map((d) => ({
        day_number: Number(d.day_number),
        team_id: Number(d.team_id),
        shift_id: Number(d.shift_id),
      })).filter((d) => d.day_number && d.team_id && d.shift_id),
    };

    isEdit ? updateCycle.mutate(payload) : createCycle.mutate(payload);
  };

  const confirmDelete = () => {
    if (!confirmingCycle) return;

    deleteCycle.mutate(confirmingCycle.rotation_id, {
      onSuccess: () => {
        setConfirmingCycle(null);
      },
    });
  };

  const isPending = createCycle.isPending || updateCycle.isPending;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 28, width: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,95,180,0.2)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#005bbb" }}>{isEdit ? "Edit Rotation Cycle" : "Add Rotation Cycle"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Name + Length */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Cycle Name *</label>
              <input style={inputStyle} placeholder="e.g. Standard 7-Day Rotation"
                value={form.cycle_name} onChange={(e) => setForm({ ...form, cycle_name: e.target.value })}
                onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Cycle Length (days) *</label>
              <input type="number" min="1" style={inputStyle} placeholder="e.g. 6"
                value={form.cycle_length} onChange={(e) => setForm({ ...form, cycle_length: e.target.value })}
                onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")} />
            </div>
          </div>

          {/* Start Date + Description */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Start Date *</label>
              <input type="date" style={inputStyle}
                value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Description</label>
              <input style={inputStyle} placeholder="Optional description"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")} />
            </div>
          </div>

          {/* Day Assignments */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#344054" }}>
                Day Assignments
              </label>
              <button type="button" onClick={addRow}
                style={{ padding: "5px 12px", background: "#eaf4ff", color: "#006fd6", border: "1px solid #bfdbfe", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                + Add Row
              </button>
            </div>

            <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden" }}>
              {form.details.length === 0 ? (
                <p style={{ color: "#667085", fontSize: 13, padding: "16px", margin: 0, textAlign: "center" }}>
                  No assignments yet. Click + Add Row to begin.
                </p>
              ) : (
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 32px", gap: 8, padding: "8px 10px", background: "#f4f8fd", borderBottom: "1px solid #e6edf5", fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase" }}>
                    <span>Day</span><span>Team</span><span>Shift</span><span />
                  </div>
                  {form.details.map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 32px", gap: 8, padding: "6px 10px", borderBottom: "1px solid #edf2f7", alignItems: "center" }}>
                      <input type="number" min="1" max={form.cycle_length || 99}
                        value={row.day_number} placeholder="#"
                        onChange={(e) => updateRow(i, "day_number", e.target.value)}
                        style={{ ...inputStyle, padding: "6px 8px", textAlign: "center" }} />
                      <select value={row.team_id} onChange={(e) => updateRow(i, "team_id", e.target.value)}
                        style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">Team</option>
                        {teams?.map((t) => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                      </select>
                      <select value={row.shift_id} onChange={(e) => updateRow(i, "shift_id", e.target.value)}
                        style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">Shift</option>
                        {shifts?.map((s) => <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>)}
                      </select>
                      <button type="button" onClick={() => removeRow(i)}
                        style={{ background: "#fee4e2", color: "#b42318", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, padding: "4px 8px" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 18px", border: "1px solid #d0d5dd", borderRadius: 8, background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              style={{ padding: "10px 18px", background: "#006fd6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Modal: View Cycle Details =====
function ViewModal({ cycle, onClose, onEdit }) {
  const currentDay = resolveCurrentDay(cycle.start_date, cycle.cycle_length);
  const active = isActive(cycle.start_date);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 28, width: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,95,180,0.2)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", color: "#005bbb" }}>{cycle.cycle_name}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#667085" }}>{cycle.description || "No description"}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Cycle Length", value: `${cycle.cycle_length} days` },
            { label: "Start Date", value: formatDate(cycle.start_date) },
            { label: "Current Day", value: active && currentDay ? `Day ${currentDay} of ${cycle.cycle_length}` : "Not started" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#f4f8fd", border: "1px solid #e6edf5", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#667085", marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1d2939" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Day assignments */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#344054", marginBottom: 10 }}>
            Day Assignments ({cycle.details?.length || 0} entries)
          </p>

          <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 0, background: "#f4f8fd", borderBottom: "1px solid #e6edf5", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase" }}>
              <span>Day</span><span>Team</span><span>Shift</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {cycle.details?.length ? (
                [...cycle.details]
                  .sort((a, b) => a.day_number - b.day_number)
                  .map((d, i) => {
                    const isCurrentDay = active && d.day_number === currentDay;
                    return (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "60px 1fr 1fr",
                        padding: "10px 14px", borderBottom: "1px solid #edf2f7",
                        background: isCurrentDay ? "#eaf4ff" : "white",
                        fontWeight: isCurrentDay ? 700 : 400,
                      }}>
                        <span style={{ color: isCurrentDay ? "#006fd6" : "#344054", fontWeight: 700 }}>
                          {isCurrentDay ? `▶ ${d.day_number}` : d.day_number}
                        </span>
                        <span style={{ color: "#344054", fontSize: 13 }}>{d.team?.team_name || `Team ${d.team_id}`}</span>
                        <span style={{ color: "#344054", fontSize: 13 }}>{d.shift?.shift_name || `Shift ${d.shift_id}`}</span>
                      </div>
                    );
                  })
              ) : (
                <p style={{ color: "#667085", fontSize: 13, padding: "16px 14px", margin: 0 }}>No assignments defined.</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: "10px 18px", border: "1px solid #d0d5dd", borderRadius: 8, background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Close
          </button>
          <button onClick={() => { onClose(); onEdit(cycle); }}
            style={{ padding: "10px 18px", background: "#006fd6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            ✎ Edit Cycle
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Main Component =====
function RotationCycles() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewCycle, setViewCycle] = useState(null);
  const [editCycle, setEditCycle] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteCycles, setDeleteCycles] = useState(null);

  const { data: cycles, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ROTATIONS,
    queryFn: rotationApi.getAll,
    select: (d) => d.data,
  });

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (d) => d.data,
  });

  const { data: shifts } = useQuery({
    queryKey: QUERY_KEYS.SHIFTS,
    queryFn: shiftApi.getAll,
    select: (d) => d.data,
  });

  const deleteCycle = useMutation({
    mutationFn: rotationApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS });
      setSuccessMsg("Rotation cycle deleted.");
      
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => {setErrorMsg(err.message);
    setDeleteCycles(null);
      setTimeout(() => setErrorMsg(""), 6000);
    }
  });

  const handleDelete = (cycle) => {
   setDeleteCycles(cycle);
  };

  const confirmDelete = () => {
    if (!deleteCycles) return;

    deleteCycle.mutate(deleteCycles.rotation_id,{
      onSuccess: () => { setDeleteCycles(null);
      }
    });
  };

  const handleModalSuccess = (msg) => {
    setShowModal(false);
    setEditCycle(null);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const filtered = (cycles || []).filter((c) =>
    c.cycle_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Rotation Cycles</div>

        <div className="page-title-row">
          <div>
            <h2>Rotation Cycles</h2>
            <p className="subtitle">Manage team shift rotation patterns.</p>
          </div>
          <button
            className="primary-btn"
            onClick={() => { setEditCycle(null); setShowModal(true); }}
          >
            + Add Rotation Cycle
          </button>
        </div>

        {successMsg && (
          <div style={{ background: "#e8f8ef", border: "1px solid #bbf7d0", color: "#157347", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✓ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: "#FF000026", border: "1px solid #fee2e2", color: "#FF0000", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ❌ {errorMsg}
          </div>
        )}

        <div className="employee-toolbar">
          <input
            placeholder="Search rotation cycles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading rotation cycles...</p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cycle Name</th>
                  <th>Length</th>
                  <th>Start Date</th>
                  <th>Current Day</th>
                  <th>Assignments</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((cycle) => {
                  const active = isActive(cycle.start_date);
                  const currentDay = active
                    ? resolveCurrentDay(cycle.start_date, cycle.cycle_length)
                    : null;

                  return (
                    <tr key={cycle.rotation_id}>
                      <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                        RC{String(cycle.rotation_id).padStart(3, "0")}
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: "#1d2939" }}>{cycle.cycle_name}</strong>
                          {cycle.warning && (
                            <div style={{ fontSize: 11, color: "#b54708" }}>⚠️ {cycle.warning}</div>
                          )}
                          {cycle.description && (
                            <div style={{ fontSize: 11, color: "#667085" }}>{cycle.description}</div>
                          )}
                        </div>
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {cycle.cycle_length} days
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {formatDate(cycle.start_date)}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {active && currentDay
                          ? <span style={{ fontWeight: 700, color: "#006fd6" }}>Day {currentDay}</span>
                          : <span style={{ color: "#667085" }}>—</span>}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {cycle.details?.length || 0} entries
                      </td>
                      <td>
                        <span className={active ? "status-approved" : "status-pending"}>
                          {active ? "Active" : "Scheduled"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="edit-btn"
                            title="View details"
                            onClick={() => setViewCycle(cycle)}
                          >
                            👁
                          </button>
                          <button
                            className="edit-btn"
                            title="Edit cycle"
                            onClick={() => { setEditCycle(cycle); setShowModal(true); }}
                          >
                            ✎
                          </button>
                          <button
                            className="delete-btn"
                            title="Delete cycle"
                            onClick={() => handleDelete(cycle)}
                            disabled={deleteCycle.isPending}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {search ? "No cycles match your search." : "No rotation cycles yet. Add your first cycle."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filtered.length} of {cycles?.length || 0} rotation cycles
          </p>
        </div>

        {/* ===== Add/Edit Modal ===== */}
        {showModal && (
          <CycleModal
            cycle={editCycle}
            teams={teams}
            shifts={shifts}
            onClose={() => { setShowModal(false); setEditCycle(null); }}
            onSuccess={handleModalSuccess}
          />
        )}

        {/* ===== View Modal ===== */}
        {viewCycle && (
          <ViewModal
            cycle={viewCycle}
            onClose={() => setViewCycle(null)}
            onEdit={(c) => { setEditCycle(c); setShowModal(true); }}
          />
        )}
        {/* ===== Delete Confirmation Modal ===== */}
        {deleteCycles && (
          <ConfirmationModal
            title="Confirm Deletion"
            message={`Are you sure you want to delete the cycle "${deleteCycles.cycle_name}"? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onClose={() => setDeleteCycles(null)}
            confirmText="Yes, Delete"
            cancelText="Cancel"
          />
        )}
      </section>
    </Layout>
  );
}

export default RotationCycles;