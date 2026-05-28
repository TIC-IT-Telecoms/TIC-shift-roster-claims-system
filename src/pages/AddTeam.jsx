import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamApi } from "../api/teamApi";
import { employeeApi } from "../api/employeeApi";
import { QUERY_KEYS } from "../utils/queryKeys";

const inputStyle = {
  width: "100%", padding: "11px", border: "1px solid #d0d5dd",
  borderRadius: 8, outline: "none", fontSize: 13,
  fontFamily: "inherit", boxSizing: "border-box",
};

function AddTeam() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    team_name: "", description: "", employee_ids: [],
  });
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // ===== Fetch employees to assign =====
  const { data: employees } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn: employeeApi.getAll,
    select: (d) => d.data?.filter((e) => e.status === "Active"),
  });

  // ===== Create team =====
  const createTeam = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS });
      navigate("/teams", { state: { success: "Team created successfully." } });
    },
    onError: (err) => {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const toggleEmployee = (id) => {
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter((eid) => eid !== id)
        : [...f.employee_ids, id],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.team_name.trim()) { setError("Team name is required."); return; }
    createTeam.mutate(form);
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">
          Dashboard &gt;{" "}
          <a href="/teams" style={{ color: "#006fd6" }}>Teams</a> &gt; Add Team
        </div>

        <div className="page-title-row">
          <div>
            <h2>Add Team</h2>
            <p className="subtitle">Create a new team and assign members.</p>
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fee4e2", border: "1px solid #fecaca",
            color: "#b42318", padding: "12px 16px",
            borderRadius: 8, marginBottom: 18, fontSize: 13,
          }}>
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="claim-form-card" style={{ marginBottom: 18 }}>
            <h3>Team Details</h3>

            {/* Team Name */}
            <div className="form-group">
              <label>Team Name <span style={{ color: "#b42318" }}>*</span></label>
              <input
                style={inputStyle}
                placeholder="e.g. Network Ops"
                value={form.team_name}
                onChange={set("team_name")}
                onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                placeholder="Enter team description..."
                value={form.description}
                onChange={set("description")}
              />
            </div>
          </div>

          {/* ===== Assign Members ===== */}
          <div className="claim-form-card" style={{ marginBottom: 18 }}>
            <h3>Assign Members</h3>
            <p style={{ color: "#667085", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Select employees to add to this team. You can also assign them later.
            </p>

            {!employees?.length ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No active employees available.</p>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8, maxHeight: 260, overflowY: "auto",
              }}>
                {employees.map((emp) => {
                  const selected = form.employee_ids.includes(emp.employee_id);
                  return (
                    <label key={emp.employee_id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${selected ? "#006fd6" : "#e6edf5"}`,
                      background: selected ? "#eaf4ff" : "white",
                      transition: "all 0.15s",
                    }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleEmployee(emp.employee_id)}
                        style={{ accentColor: "#006fd6", width: 15, height: 15 }}
                      />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {emp.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#667085" }}>
                          {emp.team?.team_name ? `Currently: ${emp.team.team_name}` : "No team"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {form.employee_ids.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#006fd6", fontWeight: 700 }}>
                {form.employee_ids.length} member{form.employee_ids.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/teams")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={createTeam.isPending}
            >
              {createTeam.isPending ? "Creating..." : "Save Team"}
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}

export default AddTeam;