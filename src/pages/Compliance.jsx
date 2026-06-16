import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatDate, getTodayStr, getMonthStart } from "../utils/helpers";
import {
  useComplianceFlags,
  useRunComplianceCheck,
  useRunBulkCheck,
  useResolveFlag,
  useDeleteFlag,
} from "../hooks/useCompliance";
import { useAuthStore } from "../store/authStore";
import usePagination from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import ConfirmationModal from "../components/ui/ConfirmationModal";

const todayStr   = getTodayStr();
const monthStart = getMonthStart();

// ===== Severity badge =====
const SeverityBadge = ({ severity }) => {
  const map = {
    High:   { cls: "severity-high",   label: "High" },
    Medium: { cls: "severity-medium", label: "Medium" },
    Low:    { cls: "severity-low",    label: "Low" },
  };
  const cfg = map[severity] || map.Low;
  return <span className={cfg.cls}>{cfg.label}</span>;
};

// ===== Run Check Modal =====
function RunCheckModal({ employees, teams, onClose }) {
  const [mode,       setMode]       = useState("single"); // single | bulk
  const [empId,      setEmpId]      = useState("");
  const [teamId,     setTeamId]     = useState("");
  const [startDate,  setStartDate]  = useState(monthStart);
  const [endDate,    setEndDate]    = useState(todayStr);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");

  const singleCheck = useRunComplianceCheck();
  const bulkCheck   = useRunBulkCheck();
  const isPending   = singleCheck.isPending || bulkCheck.isPending;

  const inp = {
    width:        "100%",
    padding:      "9px 12px",
    border:       "1px solid #d0d5dd",
    borderRadius: 8,
    fontSize:     13,
    outline:      "none",
    boxSizing:    "border-box",
  };

  const handleRun = () => {
    setError("");
    setResult(null);

    if (!startDate || !endDate) { setError("Select a date range."); return; }
    if (mode === "single" && !empId) { setError("Select an employee."); return; }

    const payload = { start_date: startDate, end_date: endDate };

    if (mode === "single") {
      singleCheck.mutate({ ...payload, employee_id: Number(empId) }, {
        onSuccess: (res) => setResult({ count: res.data?.length || 0, mode: "single" }),
        onError:   (e)   => setError(e.message || "Check failed."),
      });
    } else {
      if (teamId) payload.team_id = Number(teamId);
      bulkCheck.mutate(payload, {
        onSuccess: (res) => setResult({ count: res.data?.flags_generated || 0, checked: res.data?.employees_checked || 0, mode: "bulk" }),
        onError:   (e)   => setError(e.message || "Bulk check failed."),
      });
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: "100%", maxWidth: 460,
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#005bbb" }}>Run Compliance Check</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { value: "single", label: "Single Employee" },
            { value: "bulk",   label: "All Employees" },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              style={{
                padding:      "7px 16px",
                borderRadius: 8,
                border:       `1px solid ${mode === m.value ? "#006fd6" : "#e6edf5"}`,
                background:   mode === m.value ? "#eaf4ff" : "white",
                color:        mode === m.value ? "#006fd6" : "#667085",
                fontWeight:   700,
                fontSize:     13,
                cursor:       "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            ✕ {error}
          </div>
        )}

        {result && (
          <div style={{ background: "#e8f8ef", border: "1px solid #bbf7d0", color: "#157347", padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            ✓ {result.mode === "bulk"
              ? `Bulk check complete — ${result.count} new flag${result.count !== 1 ? "s" : ""} across ${result.checked} employees.`
              : `${result.count} new flag${result.count !== 1 ? "s" : ""} generated.`}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "single" ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>
                Employee *
              </label>
              <select value={empId} onChange={(e) => setEmpId(e.target.value)} style={inp}>
                <option value="">Select employee</option>
                {employees?.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>{e.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>
                Team (optional)
              </label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={inp}>
                <option value="">All Teams</option>
                {teams?.map((t) => (
                  <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Start Date *", val: startDate, set: setStartDate, min: undefined, max: endDate },
              { label: "End Date *",   val: endDate,   set: setEndDate,   min: startDate, max: todayStr },
            ].map(({ label, val, set, min, max }) => (
              <div key={label}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 6 }}>{label}</label>
                <input type="date" value={val} min={min} max={max} onChange={(e) => set(e.target.value)} style={inp} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} className="cancel-btn">Cancel</button>
            <button
              onClick={handleRun}
              disabled={isPending}
              className="primary-btn"
            >
              {isPending ? "Running..." : "Run Check"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== View Flag Modal =====
function FlagModal({ flag, onClose, onResolve, isAdmin, resolving }) {
  const [notes, setNotes] = useState("");
  if (!flag) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: "100%", maxWidth: 460,
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: "#1d2939" }}>
              CMP-{String(flag.compliance_id).padStart(3, "0")}
            </h3>
            <div style={{ marginTop: 4 }}>
              <SeverityBadge severity={flag.severity} />
              <span style={{ marginLeft: 8 }}>
                <span className={flag.resolved ? "status-approved" : "status-rejected"}>
                  {flag.resolved ? "Resolved" : "Open"}
                </span>
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Employee",        value: flag.employee?.name || "—" },
            { label: "Team",            value: flag.employee?.team?.team_name || "—" },
            { label: "Flag Date",       value: formatDate(flag.flag_date) },
            { label: "Rule Violated",   value: flag.rule_violated },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f4f8fd", fontSize: 13 }}>
              <span style={{ color: "#667085" }}>{label}</span>
              <strong style={{ color: "#344054", maxWidth: 240, textAlign: "right" }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#344054", marginBottom: 16 }}>
          {flag.description}
        </div>

        {/* Resolve notes if already resolved */}
        {flag.resolved && flag.resolve_notes && (
          <div style={{ background: "#e8f8ef", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#157347", marginBottom: 16 }}>
            ✓ Resolved: {flag.resolve_notes}
          </div>
        )}

        {/* Resolve form for open flags (admin only) */}
        {isAdmin && !flag.resolved && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 6, fontWeight: 700 }}>
              Resolution Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reviewed with employee — shift pattern adjusted..."
              rows={2}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} className="cancel-btn">Close</button>
          {isAdmin && !flag.resolved && (
            <button
              onClick={() => onResolve(flag.compliance_id, notes)}
              disabled={resolving}
              className="primary-btn"
            >
              {resolving ? "Resolving..." : "✓ Mark Resolved"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Main Component =====
const TABS = ["All", "Open", "Resolved"];
const SEVERITIES = ["All", "High", "Medium", "Low"];
const PAGE_SIZE = 10;

function Compliance() {
  const role    = useAuthStore((s) => s.user?.role) || "employee";
  const isAdmin = role === "admin";

  const [tab,          setTab]          = useState("All");
  const [severity,     setSeverity]     = useState("All");
  const [search,       setSearch]       = useState("");
  const [viewFlag,     setViewFlag]     = useState(null);
  const [showCheck,    setShowCheck]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = {};
  if (tab === "Open")     queryParams.resolved = "false";
  if (tab === "Resolved") queryParams.resolved = "true";
  if (severity !== "All") queryParams.severity = severity;

  const { data: flags = [], isLoading, isError } = useComplianceFlags(queryParams);
  const resolveFlag = useResolveFlag();
  const deleteFlag  = useDeleteFlag();

  const { data: employees } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn:  employeeApi.getAll,
    select:   (d) => d.data,
    enabled:  isAdmin,
  });

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn:  teamApi.getAll,
    select:   (d) => d.data,
    enabled:  isAdmin,
  });

  const filtered = (flags || []).filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.employee?.name?.toLowerCase().includes(q) ||
      f.rule_violated?.toLowerCase().includes(q) ||
      f.flag_date?.includes(q)
    );
  });

  const { currentPage, setCurrentPage, resetPage, totalPages,
    paginatedData, startIndex, endIndex } = usePagination(filtered, PAGE_SIZE);

  const handleTabChange = (t) => { setTab(t); resetPage(); };
  const handleSearch    = (v) => { setSearch(v); resetPage(); };

  const handleResolve = (id, notes) => {
    resolveFlag.mutate({ id, notes }, {
      onSuccess: () => setViewFlag(null),
    });
  };

  const handleDelete = () => {
    deleteFlag.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  // Summary counts (from unfiltered full flags array)
  const allFlags   = flags || [];
  const openCount  = allFlags.filter((f) => !f.resolved).length;
  const highCount  = allFlags.filter((f) => f.severity === "High" && !f.resolved).length;
  const resolvedCount = allFlags.filter((f) => f.resolved).length;

  const countsByTab = {
    All:      allFlags.length,
    Open:     openCount,
    Resolved: resolvedCount,
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Compliance</div>

        <div className="page-title-row">
          <div>
            <h2>Compliance</h2>
            <p className="subtitle">BCEA statutory rule exception monitoring.</p>
          </div>
          {isAdmin && (
            <button className="primary-btn" onClick={() => setShowCheck(true)}>
              ⚡ Run Compliance Check
            </button>
          )}
        </div>

        {/* ===== Summary Stats ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Flags",      value: allFlags.length,  color: "#006fd6", bg: "#eaf4ff" },
            { label: "Open Exceptions",  value: openCount,        color: "#b42318", bg: "#fff0f0" },
            { label: "High Severity",    value: highCount,        color: "#b54708", bg: "#fff3e5" },
            { label: "Resolved",         value: resolvedCount,    color: "#157347", bg: "#e8f8ef" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: "white", border: "1px solid #e6edf5", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, color: "#667085", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>
                {isLoading ? <span style={{ fontSize: 13, color: "#d0d5dd" }}>…</span> : value}
              </div>
            </div>
          ))}
        </div>

        {/* ===== Tabs ===== */}
        <div className="claims-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => handleTabChange(t)}
            >
              {t} ({isLoading ? "…" : countsByTab[t]})
            </button>
          ))}
        </div>

        {/* ===== Search + Severity ===== */}
        <div className="employee-toolbar" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search by employee, rule or date..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => { setSeverity(s); resetPage(); }}
                style={{
                  padding:      "7px 14px",
                  borderRadius: 8,
                  fontSize:     12,
                  fontWeight:   700,
                  cursor:       "pointer",
                  border:       `1px solid ${severity === s ? "#006fd6" : "#e6edf5"}`,
                  background:   severity === s ? "#eaf4ff" : "white",
                  color:        severity === s ? "#006fd6" : "#667085",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading compliance flags...</p>
          ) : isError ? (
            <p style={{ color: "#b42318", fontSize: 13, padding: "20px 0" }}>Failed to load compliance data. Please try again.</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#667085" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <p style={{ fontWeight: 700, margin: "0 0 6px" }}>
                {search ? "No flags match your search." : "No exceptions found."}
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                {tab === "Open" ? "All clear — no open compliance exceptions." : ""}
              </p>
            </div>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Flag Date</th>
                  <th>Rule Violated</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((flag) => (
                  <tr key={flag.compliance_id} style={!flag.resolved && flag.severity === "High" ? { background: "#fff8f8" } : {}}>
                    <td style={{ fontFamily: "monospace", color: "#667085", fontSize: 12 }}>
                      CMP-{String(flag.compliance_id).padStart(3, "0")}
                    </td>
                    <td>
                      <strong style={{ fontSize: 13, color: "#1d2939" }}>{flag.employee?.name || "—"}</strong>
                      {flag.employee?.team?.team_name && (
                        <div style={{ fontSize: 11, color: "#667085" }}>{flag.employee.team.team_name}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: "#344054" }}>{formatDate(flag.flag_date)}</td>
                    <td style={{ fontSize: 13, color: "#b54708", maxWidth: 220 }}>
                      <span title={flag.description}>{flag.rule_violated}</span>
                    </td>
                    <td><SeverityBadge severity={flag.severity} /></td>
                    <td>
                      <span className={flag.resolved ? "status-approved" : "status-rejected"}>
                        {flag.resolved ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* View */}
                        <button
                          title="View details"
                          onClick={() => setViewFlag(flag)}
                          style={{
                            background: "#eaf4ff", color: "#006fd6",
                            border: "none", borderRadius: 6,
                            width: 28, height: 28, cursor: "pointer", fontSize: 14,
                          }}
                        >
                          👁
                        </button>

                        {/* Resolve — admin, open only */}
                        {isAdmin && !flag.resolved && (
                          <button
                            title="Resolve"
                            onClick={() => handleResolve(flag.compliance_id, "")}
                            disabled={resolveFlag.isPending}
                            style={{
                              background: "#e8f8ef", color: "#157347",
                              border: "none", borderRadius: 6,
                              width: 28, height: 28, cursor: "pointer", fontSize: 14,
                            }}
                          >
                            ✓
                          </button>
                        )}

                        {/* Delete — admin only */}
                        {isAdmin && (
                          <button
                            title="Delete flag"
                            onClick={() => setDeleteTarget(flag.compliance_id)}
                            disabled={deleteFlag.isPending}
                            style={{
                              background: "#fee4e2", color: "#b42318",
                              border: "none", borderRadius: 6,
                              width: 28, height: 28, cursor: "pointer", fontSize: 14,
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginTop: 16,
              borderTop: "1px solid #edf2f7", paddingTop: 12,
            }}>
              <p className="roster-note" style={{ margin: 0 }}>
                Showing {startIndex}–{endIndex} of {filtered.length} flag{filtered.length !== 1 ? "s" : ""}
              </p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>

        {/* ===== Modals ===== */}
        {showCheck && (
          <RunCheckModal
            employees={employees}
            teams={teams}
            onClose={() => setShowCheck(false)}
          />
        )}

        {viewFlag && (
          <FlagModal
            flag={viewFlag}
            isAdmin={isAdmin}
            resolving={resolveFlag.isPending}
            onResolve={handleResolve}
            onClose={() => setViewFlag(null)}
          />
        )}

        {deleteTarget && (
          <ConfirmationModal
            title="Delete Compliance Flag"
            message="Permanently delete this compliance flag? This cannot be undone."
            confirmText="Delete"
            confirmColor="#dc2626"
            isPending={deleteFlag.isPending}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </section>
    </Layout>
  );
}

export default Compliance;