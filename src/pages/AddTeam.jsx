import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Shared input style =====
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d5dd", borderRadius: 8,
  fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
const onFocus = (e) => (e.target.style.borderColor = "#006fd6");
const onBlur = (e) => (e.target.style.borderColor = "#d0d5dd");

// ===== Reusable sub-components =====
const Field = ({ label, required, children }) => (
  <div>
    <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#b42318" }}> *</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ borderBottom: "1px solid #e6edf5", paddingBottom: 10, marginBottom: 16 }}>
    <h4 style={{ margin: 0, color: "#005bbb", fontSize: 14 }}>{title}</h4>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#667085" }}>{sub}</p>}
  </div>
);

// ===== Modal Component =====
function AddTeam({ team, employees, onClose, onSuccess }) {
  const isEdit = !!team;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    team_name: team?.team_name || "",
    description: team?.description || "",
    employee_ids: team?.employees?.map((e) => e.employee_id) || [],
  });

  const [error, setError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleEmployee = (id) => {
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter((eid) => eid !== id)
        : [...f.employee_ids, id],
    }));
  };

  const createTeam = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS });
      onSuccess("Team created successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const updateTeam = useMutation({
    mutationFn: (data) => teamApi.update(team.team_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS });
      onSuccess("Team updated successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.team_name.trim()) { setError("Team name is required."); return; }
    isEdit ? updateTeam.mutate(form) : createTeam.mutate(form);
  };

  const isPending = createTeam.isPending || updateTeam.isPending;

  // Active employees only, filter by search
  const activeEmployees = (employees || [])
    .filter((e) => e.status === "Active")
    .filter((e) =>
      !memberSearch ||
      e.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      e.team?.team_name?.toLowerCase().includes(memberSearch.toLowerCase())
    );

  const selectedCount = form.employee_ids.length;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 580,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>

        {/* ===== Sticky Header ===== */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "20px 28px 16px",
          borderBottom: "1px solid #e6edf5",
          position: "sticky", top: 0,
          background: "white", zIndex: 10,
        }}>
          <div>
            <h3 style={{ margin: 0, color: "#005bbb", fontSize: 17 }}>
              {isEdit ? "Edit Team" : "Add Team"}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#667085" }}>
              {isEdit
                ? "Update team details and members."
                : "Create a new team and assign members."}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: "#667085",
          }}>✕</button>
        </div>

        {/* ===== Body ===== */}
        <div style={{ padding: "24px 28px" }}>

          {error && (
            <div style={{
              background: "#fee4e2", border: "1px solid #fecaca",
              color: "#b42318", padding: "10px 14px",
              borderRadius: 8, marginBottom: 20, fontSize: 13,
            }}>
              ✕ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ===== Team Details ===== */}
            <SectionTitle title="Team Details" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <Field label="Team Name" required>
                <input style={inp} placeholder="e.g. Network Ops"
                  value={form.team_name} onChange={set("team_name")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <Field label="Description">
                <textarea
                  style={{ ...inp, minHeight: 80, resize: "vertical" }}
                  placeholder="Describe this team's responsibilities..."
                  value={form.description} onChange={set("description")}
                />
              </Field>
            </div>

            {/* ===== Assign Members ===== */}
            <SectionTitle
              title="Assign Members"
              sub="Select active employees to add to this team. You can update this later."
            />

            {/* Member search */}
            <div style={{ marginBottom: 10 }}>
              <input
                style={{ ...inp, padding: "8px 12px" }}
                placeholder="Search employees..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Member checkboxes */}
            {!activeEmployees.length ? (
              <p style={{ color: "#667085", fontSize: 13, padding: "12px 0" }}>
                {memberSearch ? "No employees match your search." : "No active employees available."}
              </p>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 8, maxHeight: 240, overflowY: "auto",
                border: "1px solid #e6edf5", borderRadius: 10,
                padding: 10, marginBottom: 12,
              }}>
                {activeEmployees.map((emp) => {
                  const selected = form.employee_ids.includes(emp.employee_id);
                  const currentTeam = emp.team?.team_name;
                  const willMove = currentTeam && currentTeam !== team?.team_name;

                  return (
                    <label key={emp.employee_id} style={{
                      display: "flex", alignItems: "flex-start",
                      gap: 10, padding: "10px 12px",
                      borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${selected ? "#006fd6" : "#e6edf5"}`,
                      background: selected ? "#eaf4ff" : "white",
                      transition: "all 0.15s",
                    }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleEmployee(emp.employee_id)}
                        style={{ accentColor: "#006fd6", marginTop: 2 }}
                      />
                      <div style={{ overflow: "hidden", flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700,
                          color: "#1d2939", whiteSpace: "nowrap",
                          textOverflow: "ellipsis", overflow: "hidden",
                        }}>
                          {emp.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#667085" }}>
                          {currentTeam
                            ? willMove
                              ? <span style={{ color: "#b54708" }}>⚠ From: {currentTeam}</span>
                              : `Team: ${currentTeam}`
                            : "No team"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected count + warning */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#006fd6", fontWeight: 700 }}>
                {selectedCount > 0
                  ? `${selectedCount} member${selectedCount !== 1 ? "s" : ""} selected`
                  : "No members selected"}
              </span>
              {form.employee_ids.some((id) => {
                const emp = (employees || []).find((e) => e.employee_id === id);
                return emp?.team?.team_name && emp.team.team_name !== team?.team_name;
              }) && (
                <span style={{ fontSize: 11, color: "#b54708" }}>
                  ⚠ Some employees will be moved from their current team
                </span>
              )}
            </div>

            {/* ===== Actions ===== */}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              gap: 10, marginTop: 24, paddingTop: 16,
              borderTop: "1px solid #e6edf5",
            }}>
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Team"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default AddTeam;