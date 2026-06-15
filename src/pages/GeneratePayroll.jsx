import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../api/payrollApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatZAR, getMonthStart, getTodayStr } from "../utils/helpers";

const todayStr   = getTodayStr();
const monthStart = getMonthStart();

const inp = {
  width:        "100%",
  padding:      "10px 12px",
  border:       "1px solid #d0d5dd",
  borderRadius: 8,
  fontSize:     13,
  outline:      "none",
  boxSizing:    "border-box",
};

// ===== Quick-select month presets =====
const buildMonthPresets = () => {
  const presets = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().split("T")[0];
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    presets.push({
      label: d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
      start, end,
    });
  }
  return presets;
};
const MONTH_PRESETS = buildMonthPresets();

function GeneratePayroll() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [startDate,  setStartDate]  = useState(monthStart);
  const [endDate,    setEndDate]    = useState(todayStr);
  const [teamFilter, setTeamFilter] = useState("");
  const [result,     setResult]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState("");

  // ===== Queries =====
  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn:  teamApi.getAll,
    select:   (d) => d.data,
  });

  const { data: preview, isLoading: loadingPreview, refetch: refetchPreview } = useQuery({
    queryKey: QUERY_KEYS.PAYROLL_PREVIEW({ start: startDate, end: endDate, team: teamFilter }),
    queryFn:  () => payrollApi.getPreview({
      pay_period_start: startDate,
      pay_period_end:   endDate,
      ...(teamFilter ? { team_id: teamFilter } : {}),
    }),
    select:   (d) => d.data,
    enabled:  !!startDate && !!endDate,
  });

  // Refresh preview whenever filters change
  useEffect(() => {
    if (startDate && endDate) refetchPreview();
  }, [startDate, endDate, teamFilter]);

  // ===== Bulk generate mutation =====
  const generateMutation = useMutation({
    mutationFn: () => payrollApi.generateBulk({
      pay_period_start: startDate,
      pay_period_end:   endDate,
      ...(teamFilter ? { team_id: teamFilter } : {}),
    }),
    onSuccess: (res) => {
      setResult(res.data);
      setErrorMsg("");
      qc.invalidateQueries({ queryKey: ["payroll"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to generate payroll.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setResult(null);
    if (!startDate || !endDate) { setErrorMsg("Please select a pay period."); return; }
    if (endDate < startDate)    { setErrorMsg("End date must be after start date."); return; }
    if (!preview?.employees_with_claims) {
      setErrorMsg("No approved claims found in this period. Nothing to generate."); return;
    }
    generateMutation.mutate();
  };

  const hasResult = !!result;

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Payroll &gt; Generate Payroll</div>

        <div className="page-title-row">
          <div>
            <h2>Generate Payroll</h2>
            <p className="subtitle">Generate payroll from approved claims for a given period.</p>
          </div>
          <button className="cancel-btn" onClick={() => navigate("/admin-payroll")}>
            ← Back
          </button>
        </div>

        {/* ===== Success result ===== */}
        {hasResult && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            borderRadius: 12, padding: 20, marginBottom: 20,
          }}>
            <p style={{ fontWeight: 800, color: "#157347", margin: "0 0 12px", fontSize: 15 }}>
              ✓ Payroll Generated Successfully
            </p>
            <div style={{ display: "flex", gap: 24, fontSize: 13, flexWrap: "wrap" }}>
              <span>Records: <strong>{result.generated?.length}</strong></span>
              <span>Skipped: <strong>{result.skipped?.length}</strong></span>
              {result.errors?.length > 0 && (
                <span style={{ color: "#b42318" }}>Errors: <strong>{result.errors.length}</strong></span>
              )}
              <span>
                Grand Total: <strong style={{ color: "#006fd6", fontSize: 15 }}>
                  {formatZAR(result.grand_total)}
                </strong>
              </span>
            </div>
            {result.skipped?.length > 0 && (
              <details style={{ marginTop: 10, fontSize: 12, color: "#667085" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  View skipped ({result.skipped.length})
                </summary>
                {result.skipped.map((s) => (
                  <div key={s.employee_id} style={{ paddingLeft: 12, marginTop: 4 }}>
                    {s.name} — {s.reason}
                  </div>
                ))}
              </details>
            )}
          </div>
        )}

        {/* ===== Error ===== */}
        {errorMsg && (
          <div style={{
            background: "#fee4e2", border: "1px solid #fecaca",
            color: "#b42318", padding: "10px 16px",
            borderRadius: 8, fontSize: 13, marginBottom: 16,
          }}>
            ✕ {errorMsg}
          </div>
        )}

        <div className="submit-claim-grid">
          {/* ===== Form ===== */}
          <div className="claim-form-card">
            <h3>Payroll Settings</h3>

            {/* Month presets */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#344054", display: "block", marginBottom: 8 }}>
                Quick Select Month
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MONTH_PRESETS.map((preset) => {
                  const active = preset.start === startDate && preset.end === endDate;
                  return (
                    <button
                      key={preset.start}
                      type="button"
                      onClick={() => { setStartDate(preset.start); setEndDate(preset.end); }}
                      style={{
                        padding:      "5px 12px",
                        borderRadius: 999,
                        fontSize:     12,
                        fontWeight:   700,
                        cursor:       "pointer",
                        border:       `1px solid ${active ? "#006fd6" : "#e6edf5"}`,
                        background:   active ? "#eaf4ff" : "white",
                        color:        active ? "#006fd6" : "#667085",
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="claim-form-row">
              <div className="form-group">
                <label>Pay Period Start *</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inp}
                />
              </div>
              <div className="form-group">
                <label>Pay Period End *</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={todayStr}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inp}
                />
              </div>
            </div>

            {/* Team filter */}
            <div className="form-group">
              <label>Team</label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                style={inp}
              >
                <option value="">All Teams</option>
                {teams?.map((t) => (
                  <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                ))}
              </select>
            </div>

            {/* ===== Preview box ===== */}
            <div style={{
              background:   "#f4f8fd",
              border:       "1px solid #e6edf5",
              borderRadius: 10,
              padding:      16,
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#667085", textTransform: "uppercase", margin: "0 0 12px" }}>
                Payroll Preview
              </p>

              {loadingPreview ? (
                <p style={{ fontSize: 13, color: "#667085", margin: 0 }}>Calculating preview...</p>
              ) : !preview ? (
                <p style={{ fontSize: 13, color: "#667085", margin: 0 }}>Select a period to see preview.</p>
              ) : (
                <>
                  {[
                    {
                      label: "Employees with Approved Claims",
                      value: preview.employees_with_claims,
                      color: preview.employees_with_claims > 0 ? "#157347" : "#667085",
                    },
                    {
                      label: "Total Approved Claims",
                      value: preview.total_approved_claims,
                      color: "#344054",
                    },
                    {
                      label: "Estimated Total Payroll",
                      value: formatZAR(preview.estimated_total),
                      color: "#006fd6",
                      large: true,
                    },
                  ].map(({ label, value, color, large }) => (
                    <div key={label} style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      alignItems:     "center",
                      padding:        "8px 0",
                      borderBottom:   "1px solid #edf2f7",
                      fontSize:       13,
                    }}>
                      <span style={{ color: "#667085" }}>{label}</span>
                      <strong style={{ color, fontSize: large ? 16 : 14 }}>{value}</strong>
                    </div>
                  ))}

                  {preview.employees_with_claims === 0 && (
                    <p style={{ fontSize: 12, color: "#b42318", marginTop: 10, marginBottom: 0 }}>
                      ⚠ No approved claims found in this period. Payroll cannot be generated.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ===== Info note ===== */}
            <div style={{
              background: "#eaf4ff", border: "1px solid #bfdbfe",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 12, color: "#006fd6", marginBottom: 16,
            }}>
              ℹ️ Payroll is generated from <strong>Approved</strong> claims only. Employees already
              processed for this period will be skipped. Holiday pay includes grave-shift midnight split.
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate("/admin-payroll")}
              >
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={handleGenerate}
                disabled={
                  generateMutation.isPending ||
                  !preview?.employees_with_claims ||
                  loadingPreview
                }
              >
                {generateMutation.isPending
                  ? "Generating..."
                  : `Generate Payroll${preview?.employees_with_claims ? ` (${preview.employees_with_claims} employees)` : ""}`}
              </button>
            </div>
          </div>

          {/* ===== Right: Generated records ===== */}
          <div className="recent-claims-card">
            <h3>Generated Records</h3>

            {!result ? (
              <p style={{ color: "#667085", fontSize: 13 }}>
                Run payroll generation to see results here.
              </p>
            ) : result.generated?.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No records generated.</p>
            ) : (
              result.generated.map((r) => (
                <div key={r.payroll_id} className="recent-claim-item">
                  <div>
                    <strong style={{ fontSize: 13 }}>{r.name}</strong>
                    <span style={{ fontSize: 11, color: "#667085" }}>
                      ID #{r.payroll_id}
                    </span>
                  </div>
                  <strong style={{ color: "#006fd6", fontSize: 13 }}>
                    {formatZAR(r.total_pay)}
                  </strong>
                </div>
              ))
            )}

            {result && (
              <div style={{
                marginTop: 12,
                borderTop: "1px solid #edf2f7",
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
              }}>
                <span style={{ color: "#667085" }}>Grand Total</span>
                <strong style={{ color: "#006fd6", fontSize: 16 }}>
                  {formatZAR(result.grand_total)}
                </strong>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default GeneratePayroll;