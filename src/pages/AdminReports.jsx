// src/pages/AdminReports.jsx
import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { employeeApi } from "../api/employeeApi";
import { rosterApi } from "../api/rosterApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  formatZAR,
  formatDate,
  calcClaimEarnings,
  exportCSV,
  exportPDF,
  getMonthStart,
  getTodayStr,
} from "../utils/helpers";

// ===== Constants =====
const todayStr   = getTodayStr();
const monthStart = getMonthStart();

const REPORT_TYPES = [
  { value: "payroll",    label: "Payroll Summary" },
  { value: "claims",     label: "Claims Report" },
  { value: "roster",     label: "Roster Report" },
  { value: "compliance", label: "Compliance Report" },
];

// ===== Bar chart helper =====
// Groups approved claims by week bucket (5-day segments) and sums earnings
const buildWeeklyChart = (claims, employees) => {
  const rateMap = {};
  (employees || []).forEach((e) => { rateMap[e.employee_id] = Number(e.hourly_rate || 0); });

  const weeks = Array.from({ length: 5 }, (_, i) => ({
    label:    `Week ${i + 1}`,
    earnings: 0,
    count:    0,
  }));

  (claims || []).forEach((claim) => {
    const day = new Date(claim.claim_date).getDate();
    const idx = Math.min(Math.floor((day - 1) / 7), 4);
    const rate = rateMap[claim.employee_id] || Number(claim.employee?.hourly_rate || 0);
    const { total } = calcClaimEarnings(claim, rate, claim.shift ?? null);
    weeks[idx].earnings += total;
    weeks[idx].count++;
  });

  const maxEarnings = Math.max(...weeks.map((w) => w.earnings), 1);
  return weeks.map((w) => ({
    ...w,
    heightPct: Math.round((w.earnings / maxEarnings) * 100),
  }));
};

// ===== Section heading =====
const SectionTitle = ({ children }) => (
  <p style={{
    fontSize: 11, color: "#667085", fontWeight: 700,
    textTransform: "uppercase", marginBottom: 10, marginTop: 0,
  }}>
    {children}
  </p>
);

function AdminReports() {
  const [reportType, setReportType] = useState("payroll");
  const [startDate,  setStartDate]  = useState(monthStart);
  const [endDate,    setEndDate]    = useState(todayStr);
  const [teamFilter, setTeamFilter] = useState("");
  const [exporting,  setExporting]  = useState(null);

  // ===== Queries =====
  const { data: employees } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn:  employeeApi.getAll,
    select:   (d) => d.data,
  });

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn:  teamApi.getAll,
    select:   (d) => d.data,
  });

  const { data: claims, isLoading: loadingClaims } = useQuery({
    queryKey: QUERY_KEYS.CLAIMS({ start_date: startDate, end_date: endDate, team_id: teamFilter || undefined }),
    queryFn:  () => claimApi.getAll({ start_date: startDate, end_date: endDate, ...(teamFilter ? { team_id: teamFilter } : {}) }),
    select:   (d) => d.data,
    enabled:  !!startDate && !!endDate,
  });

  const { data: rosterData, isLoading: loadingRoster } = useQuery({
    queryKey: QUERY_KEYS.ROSTERS({ start_date: startDate, end_date: endDate, ...(teamFilter ? { team_id: teamFilter } : {}) }),
    queryFn:  () => rosterApi.getAll({ start_date: startDate, end_date: endDate, ...(teamFilter ? { team_id: teamFilter } : {}) }),
    select:   (d) => d.data,
    enabled:  !!startDate && !!endDate && (reportType === "roster" || reportType === "compliance"),
  });

  // ===== Derived data =====
  const approvedClaims = (claims || []).filter((c) => c.status === "Approved");
  const pendingClaims  = (claims || []).filter((c) => c.status === "Pending");
  const rejectedClaims = (claims || []).filter((c) => c.status === "Rejected");

  const rosterList = rosterData?.roster
    ? Object.values(rosterData.roster).flat()
    : [];

  const totalPayroll = approvedClaims.reduce((sum, c) => {
    const rate = Number(c.employee?.hourly_rate || 0);
    return sum + calcClaimEarnings(c, rate, c.shift ?? null).total;
  }, 0);

  const totalOTHours = approvedClaims.reduce((s, c) => s + Number(c.overtime_hours || 0), 0);
  const holidayClaims = approvedClaims.filter((c) => c.is_holiday);
  const overtimeClaims = approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 0);

  const chartData = useMemo(
    () => buildWeeklyChart(approvedClaims, employees),
    [approvedClaims, employees]
  );

  const rangeLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  // ===== Summary stats per report type =====
  const summaryStats = {
    payroll: [
      { label: "Total Payroll",      value: formatZAR(totalPayroll),        color: "#006fd6" },
      { label: "Approved Claims",    value: approvedClaims.length,           color: "#157347" },
      { label: "Overtime Hours",     value: `${totalOTHours}h`,              color: "#b54708" },
      { label: "Holiday Claims",     value: holidayClaims.length,            color: "#7a3aed" },
    ],
    claims: [
      { label: "Total Claims",       value: claims?.length || 0,             color: "#006fd6" },
      { label: "Approved",           value: approvedClaims.length,           color: "#157347" },
      { label: "Pending",            value: pendingClaims.length,            color: "#b54708" },
      { label: "Rejected",           value: rejectedClaims.length,           color: "#b42318" },
    ],
    roster: [
      { label: "Total Entries",      value: rosterList.length,               color: "#006fd6" },
      { label: "Scheduled",          value: rosterList.filter((r) => r.status === "Scheduled").length, color: "#157347" },
      { label: "Off Days",           value: rosterList.filter((r) => r.status === "Off").length,       color: "#667085" },
      { label: "Holiday-Flagged",    value: rosterList.filter((r) => r.is_public_holiday).length,      color: "#7a3aed" },
    ],
    compliance: [
      { label: "Overtime Entries",   value: overtimeClaims.length,           color: "#b54708" },
      { label: "Holiday Claims",     value: holidayClaims.length,            color: "#7a3aed" },
      { label: "High OT (>3h)",      value: approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 3).length, color: "#b42318" },
      { label: "Approved Claims",    value: approvedClaims.length,           color: "#157347" },
    ],
  };

  // ===== Exports =====
  const handleExportCSV = () => {
    setExporting("csv");

    const map = {
      payroll: {
        filename: `payroll_${startDate}_${endDate}.csv`,
        headers:  ["Employee", "Team", "Date", "Shift", "Hours", "OT Hours", "Holiday", "Normal Pay", "OT Pay", "Holiday Pay", "Total"],
        rows:     approvedClaims.map((c) => {
          const rate = Number(c.employee?.hourly_rate || 0);
          const { normal, overtime, holiday, total } = calcClaimEarnings(c, rate, c.shift ?? null);
          return [
            c.employee?.name, c.employee?.team?.team_name || "—",
            c.claim_date, c.shift_type,
            c.hours_worked, c.overtime_hours,
            c.is_holiday ? "Yes" : "No",
            normal.toFixed(2), overtime.toFixed(2),
            holiday.toFixed(2), total.toFixed(2),
          ];
        }),
      },
      claims: {
        filename: `claims_${startDate}_${endDate}.csv`,
        headers:  ["ID", "Employee", "Team", "Date", "Shift", "Hours", "OT Hours", "Holiday", "Status"],
        rows:     (claims || []).map((c) => [
          `CLM${String(c.claim_id).padStart(4, "0")}`,
          c.employee?.name, c.employee?.team?.team_name || "—",
          c.claim_date, c.shift_type,
          c.hours_worked, c.overtime_hours,
          c.is_holiday ? "Yes" : "No",
          c.status,
        ]),
      },
      roster: {
        filename: `roster_${startDate}_${endDate}.csv`,
        headers:  ["Employee", "Team", "Date", "Shift", "Start", "End", "Status", "Holiday"],
        rows:     rosterList.map((r) => [
          r.employee?.name, r.employee?.team?.team_name || "—",
          r.roster_date, r.shift?.shift_name || "—",
          r.shift?.start_time?.slice(0, 5) || "—",
          r.shift?.end_time?.slice(0, 5) || "—",
          r.status,
          r.is_public_holiday ? "Yes" : "No",
        ]),
      },
      compliance: {
        filename: `compliance_${startDate}_${endDate}.csv`,
        headers:  ["Employee", "Team", "Date", "Shift", "Hours", "OT Hours", "Holiday", "Note"],
        rows:     approvedClaims.map((c) => {
          const ot = Number(c.overtime_hours || 0);
          return [
            c.employee?.name, c.employee?.team?.team_name || "—",
            c.claim_date, c.shift_type,
            c.hours_worked, c.overtime_hours,
            c.is_holiday ? "Yes" : "No",
            ot > 3 ? "⚠ OT exceeds 3h" : c.is_holiday ? "Holiday claim" : "Normal",
          ];
        }),
      },
    };

    const cfg = map[reportType];
    if (cfg) exportCSV(cfg.filename, cfg.headers, cfg.rows);
    setExporting(null);
  };

  const handleExportPDF = () => {
    setExporting("pdf");

    const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label || "Report";

    const payrollTotals = () => {
      const normalSum  = approvedClaims.reduce((s, c) => s + calcClaimEarnings(c, Number(c.employee?.hourly_rate || 0), c.shift ?? null).normal,   0);
      const otSum      = approvedClaims.reduce((s, c) => s + calcClaimEarnings(c, Number(c.employee?.hourly_rate || 0), c.shift ?? null).overtime,  0);
      const holSum     = approvedClaims.reduce((s, c) => s + calcClaimEarnings(c, Number(c.employee?.hourly_rate || 0), c.shift ?? null).holiday,   0);
      return { normalSum, otSum, holSum };
    };

    const tableRows = {
      payroll: () => {
        const { normalSum, otSum, holSum } = payrollTotals();
        const rows = approvedClaims.map((c) => {
          const rate = Number(c.employee?.hourly_rate || 0);
          const { total } = calcClaimEarnings(c, rate, c.shift ?? null);
          return `<tr><td>${c.employee?.name}</td><td>${c.employee?.team?.team_name || "—"}</td><td>${c.claim_date}</td><td>${c.shift_type}</td><td>${c.hours_worked}h</td><td>${c.overtime_hours}h</td><td>${c.is_holiday ? "🌟" : ""}</td><td><strong>R${total.toFixed(2)}</strong></td></tr>`;
        }).join("");
        const footer = `
          <br/><table style="width:320px;margin-left:auto;font-size:13px">
            <tr><td>Normal Pay</td><td><strong>R${normalSum.toFixed(2)}</strong></td></tr>
            <tr><td>Overtime Pay (×1.5)</td><td><strong>R${otSum.toFixed(2)}</strong></td></tr>
            <tr><td>Holiday Pay</td><td><strong>R${holSum.toFixed(2)}</strong></td></tr>
            <tr style="font-size:16px"><td><strong>Total Payroll</strong></td><td><strong>R${totalPayroll.toFixed(2)}</strong></td></tr>
          </table>`;
        return `<table><thead><tr><th>Employee</th><th>Team</th><th>Date</th><th>Shift</th><th>Hours</th><th>OT</th><th>Hol</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>${footer}`;
      },
      claims: () => {
        const rows = (claims || []).map((c) =>
          `<tr><td>CLM${String(c.claim_id).padStart(4,"0")}</td><td>${c.employee?.name}</td><td>${c.claim_date}</td><td>${c.shift_type}</td><td>${c.hours_worked}h</td><td>${c.overtime_hours}h</td><td>${c.is_holiday ? "🌟" : ""}</td><td><span class="${c.status.toLowerCase()}">${c.status}</span></td></tr>`
        ).join("");
        return `<table><thead><tr><th>ID</th><th>Employee</th><th>Date</th><th>Shift</th><th>Hours</th><th>OT</th><th>Hol</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
      },
      roster: () => {
        const rows = rosterList.map((r) =>
          `<tr><td>${r.employee?.name}</td><td>${r.employee?.team?.team_name || "—"}</td><td>${r.roster_date}</td><td>${r.shift?.shift_name || "—"}</td><td>${r.shift?.start_time?.slice(0,5) || "—"}</td><td>${r.shift?.end_time?.slice(0,5) || "—"}</td><td>${r.status}</td><td>${r.is_public_holiday ? "🌟" : ""}</td></tr>`
        ).join("");
        return `<table><thead><tr><th>Employee</th><th>Team</th><th>Date</th><th>Shift</th><th>Start</th><th>End</th><th>Status</th><th>Hol</th></tr></thead><tbody>${rows}</tbody></table>`;
      },
      compliance: () => {
        const rows = approvedClaims.map((c) => {
          const ot   = Number(c.overtime_hours || 0);
          const note = ot > 3 ? "⚠ OT >3h" : c.is_holiday ? "Holiday" : "Normal";
          return `<tr><td>${c.employee?.name}</td><td>${c.claim_date}</td><td>${c.shift_type}</td><td>${c.hours_worked}h</td><td>${c.overtime_hours}h</td><td>${c.is_holiday ? "🌟" : ""}</td><td>${note}</td></tr>`;
        }).join("");
        return `<table><thead><tr><th>Employee</th><th>Date</th><th>Shift</th><th>Hours</th><th>OT</th><th>Hol</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`;
      },
    };

    exportPDF(
      `${reportLabel} — ${rangeLabel}`,
      `<p><strong>Period:</strong> ${rangeLabel}${teamFilter ? ` &nbsp;<strong>Team:</strong> ${teams?.find((t) => String(t.team_id) === String(teamFilter))?.team_name}` : ""}</p>` +
      (tableRows[reportType]?.() || "<p>No data.</p>")
    );

    setExporting(null);
  };

  const handleExportExcel = () => {
    // Excel export = CSV with .xlsx extension hint
    // For true xlsx, integrate SheetJS — for now CSV works in Excel
    handleExportCSV();
  };

  const isLoading = loadingClaims || loadingRoster;
  const currentStats = summaryStats[reportType] || [];

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Reports</div>

        <div className="page-title-row">
          <div>
            <h2>Reports</h2>
            <p className="subtitle">Generate and export payroll, claims, roster and compliance reports.</p>
          </div>
        </div>

        {/* ===== Filters ===== */}
        <div className="report-filters">
          <div className="form-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayStr}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams?.map((t) => (
                <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Summary Stats ===== */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12, marginBottom: 20,
        }}>
          {currentStats.map(({ label, value, color }) => (
            <div key={label} style={{
              background: "white", border: "1px solid #e6edf5",
              borderRadius: 12, padding: "16px 18px",
            }}>
              <div style={{ fontSize: 12, color: "#667085", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>
                {isLoading ? <span style={{ fontSize: 13, color: "#d0d5dd" }}>Loading…</span> : value}
              </div>
            </div>
          ))}
        </div>

        <div className="reports-layout">

          {/* ===== Chart / Data Panel ===== */}
          <div className="panel">
            <div className="panel-header">
              <h3>
                {REPORT_TYPES.find((r) => r.value === reportType)?.label}
                <span style={{ fontSize: 12, color: "#667085", fontWeight: 400, marginLeft: 8 }}>
                  {rangeLabel}
                </span>
              </h3>
            </div>

            {isLoading ? (
              <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading data...</p>
            ) : (

              <>
                {/* ── Payroll chart ── */}
                {reportType === "payroll" && (
                  <>
                    <div className="bar-chart">
                      {chartData.map((week) => (
                        <div className="bar-column" key={week.label}>
                          <span style={{ fontSize: 10, color: "#667085", marginBottom: 4 }}>
                            {formatZAR(week.earnings)}
                          </span>
                          <div
                            className="chart-bar"
                            style={{ height: `${Math.max(week.heightPct, 4)}%` }}
                            title={`${week.count} claim${week.count !== 1 ? "s" : ""}`}
                          />
                          <span>{week.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Per-employee breakdown */}
                    <div style={{ marginTop: 20 }}>
                      <SectionTitle>Per-Employee Payroll</SectionTitle>
                      <table className="roster-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Team</th>
                            <th>Claims</th>
                            <th>Hours</th>
                            <th>OT Hours</th>
                            <th>Total Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(
                            approvedClaims.reduce((acc, c) => {
                              const id   = c.employee_id;
                              const rate = Number(c.employee?.hourly_rate || 0);
                              const { total } = calcClaimEarnings(c, rate, c.shift ?? null);
                              if (!acc[id]) acc[id] = { emp: c.employee, claims: 0, hours: 0, ot: 0, total: 0 };
                              acc[id].claims++;
                              acc[id].hours  += Number(c.hours_worked || 0);
                              acc[id].ot     += Number(c.overtime_hours || 0);
                              acc[id].total  += total;
                              return acc;
                            }, {})
                          ).map(({ emp, claims, hours, ot, total }) => (
                            <tr key={emp?.employee_id}>
                              <td><strong>{emp?.name}</strong></td>
                              <td style={{ color: "#667085" }}>{emp?.team?.team_name || "—"}</td>
                              <td>{claims}</td>
                              <td>{hours}h</td>
                              <td style={{ color: ot > 0 ? "#b54708" : "#667085" }}>{ot}h</td>
                              <td style={{ color: "#006fd6", fontWeight: 700 }}>{formatZAR(total)}</td>
                            </tr>
                          ))}
                          {!approvedClaims.length && (
                            <tr><td colSpan={6} style={{ textAlign: "center", color: "#667085", padding: "20px 0" }}>No approved claims in this period.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* ── Claims table ── */}
                {reportType === "claims" && (
                  <table className="roster-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Employee</th>
                        <th>Team</th>
                        <th>Date</th>
                        <th>Shift</th>
                        <th>Hours</th>
                        <th>OT</th>
                        <th>Holiday</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(claims || []).map((c) => (
                        <tr key={c.claim_id}>
                          <td style={{ fontFamily: "monospace", color: "#667085" }}>
                            #CLM{String(c.claim_id).padStart(4, "0")}
                          </td>
                          <td><strong>{c.employee?.name}</strong></td>
                          <td style={{ color: "#667085" }}>{c.employee?.team?.team_name || "—"}</td>
                          <td>{c.claim_date}</td>
                          <td>{c.shift_type}</td>
                          <td>{c.hours_worked}h</td>
                          <td style={{ color: Number(c.overtime_hours) > 0 ? "#b54708" : "#667085" }}>
                            {c.overtime_hours}h
                          </td>
                          <td>{c.is_holiday ? <span style={{ color: "#7a3aed", fontWeight: 700 }}>🌟 Yes</span> : <span style={{ color: "#d0d5dd" }}>No</span>}</td>
                          <td>
                            <span className={
                              c.status === "Approved" ? "status-approved" :
                              c.status === "Rejected" ? "status-rejected" : "status-pending"
                            }>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!claims?.length && (
                        <tr><td colSpan={9} style={{ textAlign: "center", color: "#667085", padding: "20px 0" }}>No claims in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* ── Roster table ── */}
                {reportType === "roster" && (
                  <table className="roster-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Team</th>
                        <th>Date</th>
                        <th>Shift</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Status</th>
                        <th>Holiday</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterList.map((r) => (
                        <tr key={r.roster_id}>
                          <td><strong>{r.employee?.name}</strong></td>
                          <td style={{ color: "#667085" }}>{r.employee?.team?.team_name || "—"}</td>
                          <td>{r.roster_date}</td>
                          <td>{r.shift?.shift_name || "—"}</td>
                          <td>{r.shift?.start_time?.slice(0, 5) || "—"}</td>
                          <td>{r.shift?.end_time?.slice(0, 5) || "—"}</td>
                          <td>
                            <span className={r.status === "Scheduled" ? "status-scheduled" : "status-off"}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.is_public_holiday
                              ? <span style={{ color: "#7a3aed", fontWeight: 700 }}>🌟 Yes</span>
                              : <span style={{ color: "#d0d5dd" }}>No</span>}
                          </td>
                        </tr>
                      ))}
                      {!rosterList.length && (
                        <tr><td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "20px 0" }}>No roster entries in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* ── Compliance table ── */}
                {reportType === "compliance" && (
                  <>
                    {/* Flag summary */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                      {[
                        { label: `${approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 3).length} High OT (>3h)`, bg: "#fee4e2", color: "#b42318" },
                        { label: `${holidayClaims.length} Holiday Claims`, bg: "#f1eaff", color: "#7a3aed" },
                        { label: `${overtimeClaims.length} OT Entries`, bg: "#fff3e5", color: "#b54708" },
                      ].map(({ label, bg, color }) => (
                        <span key={label} style={{ background: bg, color, padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                          {label}
                        </span>
                      ))}
                    </div>

                    <table className="roster-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Team</th>
                          <th>Date</th>
                          <th>Shift</th>
                          <th>Hours</th>
                          <th>OT Hours</th>
                          <th>Holiday</th>
                          <th>Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedClaims.map((c) => {
                          const ot      = Number(c.overtime_hours || 0);
                          const highOT  = ot > 3;
                          const flagBg  = highOT ? "#fee4e2"  : c.is_holiday ? "#f1eaff"  : "#f4f8fd";
                          const flagClr = highOT ? "#b42318"  : c.is_holiday ? "#7a3aed"  : "#667085";
                          const flag    = highOT ? "⚠ High OT" : c.is_holiday ? "🌟 Holiday" : "Normal";

                          return (
                            <tr key={c.claim_id} style={highOT ? { background: "#fff8f8" } : {}}>
                              <td><strong>{c.employee?.name}</strong></td>
                              <td style={{ color: "#667085" }}>{c.employee?.team?.team_name || "—"}</td>
                              <td>{c.claim_date}</td>
                              <td>{c.shift_type}</td>
                              <td>{c.hours_worked}h</td>
                              <td style={{ color: highOT ? "#b42318" : ot > 0 ? "#b54708" : "#667085", fontWeight: highOT ? 700 : 400 }}>
                                {c.overtime_hours}h
                              </td>
                              <td>{c.is_holiday ? <span style={{ color: "#7a3aed", fontWeight: 700 }}>🌟</span> : "—"}</td>
                              <td>
                                <span style={{ background: flagBg, color: flagClr, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                                  {flag}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {!approvedClaims.length && (
                          <tr><td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "20px 0" }}>No approved claims in this period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </div>

          {/* ===== Export Card ===== */}
          <div className="export-card">
            <h3>Export Report</h3>
            <p style={{ fontSize: 13, color: "#667085", marginBottom: 16 }}>
              {REPORT_TYPES.find((r) => r.value === reportType)?.label} · {rangeLabel}
            </p>

            <button
              className="export-btn pdf"
              onClick={handleExportPDF}
              disabled={isLoading || exporting === "pdf"}
            >
              {exporting === "pdf" ? "Exporting..." : "📄 Export as PDF"}
            </button>

            <button
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={isLoading || exporting === "csv"}
            >
              {exporting === "csv" ? "Exporting..." : "📊 Export as Excel"}
            </button>

            <button
              className="export-btn csv"
              onClick={handleExportCSV}
              disabled={isLoading || exporting === "csv"}
            >
              {exporting === "csv" ? "Exporting..." : "📁 Export as CSV"}
            </button>

            {/* Quick stats */}
            <div style={{ marginTop: 24, borderTop: "1px solid #edf2f7", paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: "#667085", fontWeight: 700, marginBottom: 10 }}>
                QUICK SUMMARY
              </p>
              {currentStats.map(({ label, value, color }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "7px 0", borderBottom: "1px solid #f4f8fd",
                  fontSize: 13,
                }}>
                  <span style={{ color: "#667085" }}>{label}</span>
                  <strong style={{ color }}>
                    {isLoading ? "…" : value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default AdminReports;