import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { claimApi } from "../api/claimApi";
import { rosterApi } from "../api/rosterApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Date helpers =====
const today = new Date().toISOString().split("T")[0];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

// ===== CSV export helper =====
const exportCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ===== Print/PDF helper — opens printable window =====
const exportPDF = (title, htmlContent) => {
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Open Sans', Arial, sans-serif; padding: 32px; color: #1d2939; }
          h1 { color: #005bbb; font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #667085; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #006fd6; color: white; padding: 10px 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; }
          tr:nth-child(even) td { background: #f4f8fd; }
          .badge { padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; }
          .approved { background: #e8f8ef; color: #157347; }
          .pending { background: #fff3e5; color: #b54708; }
          .rejected { background: #fee4e2; color: #b42318; }
          .scheduled { background: #eaf4ff; color: #006fd6; }
          .off { background: #f2f4f7; color: #667085; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="sub">Generated on ${new Date().toLocaleDateString("en-ZA", { dateStyle: "full" })}</p>
        ${htmlContent}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
};

// ===== Date range picker =====
const DateRangePicker = ({ startDate, endDate, onStartChange, onEndChange }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <div>
      <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
        From
      </label>
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={(e) => onStartChange(e.target.value)}
        style={{
          padding: "8px 12px", border: "1px solid #d0d5dd",
          borderRadius: 8, fontSize: 13, outline: "none",
          color: "#344054",
        }}
      />
    </div>
    <div>
      <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
        To
      </label>
      <input
        type="date"
        value={endDate}
        min={startDate}
        max={today}
        onChange={(e) => onEndChange(e.target.value)}
        style={{
          padding: "8px 12px", border: "1px solid #d0d5dd",
          borderRadius: 8, fontSize: 13, outline: "none",
          color: "#344054",
        }}
      />
    </div>
  </div>
);

function MyReports() {
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [activeReport, setActiveReport] = useState(null);
  const [exporting, setExporting] = useState(null);

  // ===== Fetch profile =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const empName = profile?.employee?.name || "Employee";
  const empId = profile?.employee?.employee_id
    ? `EMP${String(profile.employee.employee_id).padStart(3, "0")}`
    : "";

  // ===== Fetch claims =====
  const { data: claims, isLoading: loadingClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ start_date: startDate, end_date: endDate }),
    queryFn: () => claimApi.getMyClaims({ start_date: startDate, end_date: endDate }),
    select: (d) => d.data,
    enabled: !!startDate && !!endDate,
  });

  // ===== Fetch roster =====
  const { data: rosterData, isLoading: loadingRoster } = useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER({ start_date: startDate, end_date: endDate }),
    queryFn: () => rosterApi.getMyRoster({ start_date: startDate, end_date: endDate }),
    select: (d) => d.data,
    enabled: !!startDate && !!endDate,
  });

  const rosterList = rosterData?.roster
    ? Array.isArray(rosterData.roster)
      ? rosterData.roster
      : Object.values(rosterData.roster).flat()
    : [];

  // ===== Stats =====
  const approvedClaims = claims?.filter((c) => c.status === "Approved") || [];
  const pendingClaims = claims?.filter((c) => c.status === "Pending") || [];
  const rejectedClaims = claims?.filter((c) => c.status === "Rejected") || [];
  const scheduledShifts = rosterList.filter((r) => r.status === "Scheduled");
  const totalHours = approvedClaims.reduce((s, c) => s + Number(c.hours_worked || 0), 0);
  const totalOT = approvedClaims.reduce((s, c) => s + Number(c.overtime_hours || 0), 0);
  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);
  const totalEarnings = approvedClaims.reduce((s, c) => {
    return s + (Number(c.hours_worked || 0) * hourlyRate)
      + (Number(c.overtime_hours || 0) * hourlyRate * 1.5)
      + (c.is_holiday ? Number(c.hours_worked || 0) * hourlyRate : 0);
  }, 0);

  // ===== Export: Roster PDF =====
  const handleRosterPDF = () => {
    setExporting("roster");
    const rows = rosterList.map((r) => `
      <tr>
        <td>${r.roster_date}</td>
        <td>${new Date(r.roster_date).toLocaleDateString("en", { weekday: "long" })}</td>
        <td>${r.shift?.shift_name || "—"}</td>
        <td>${r.shift?.start_time?.slice(0, 5) || "—"}</td>
        <td>${r.shift?.end_time?.slice(0, 5) || "—"}</td>
        <td><span class="badge ${r.status?.toLowerCase()}">${r.status}</span></td>
      </tr>
    `).join("");

    exportPDF(
      `Roster Report — ${empName}`,
      `
        <p><strong>Employee:</strong> ${empName} &nbsp; <strong>ID:</strong> ${empId}</p>
        <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
        <p><strong>Total Scheduled Shifts:</strong> ${scheduledShifts.length}</p>
        <br/>
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Shift</th><th>Start</th><th>End</th><th>Status</th></tr>
          </thead>
          <tbody>${rows || "<tr><td colspan='6'>No roster data</td></tr>"}</tbody>
        </table>
      `
    );
    setExporting(null);
  };

  // ===== Export: Claims CSV =====
  const handleClaimsCSV = () => {
    setExporting("claims");
    exportCSV(
      `claims_${empId}_${startDate}_${endDate}.csv`,
      ["Date", "Shift Type", "Hours Worked", "Overtime Hours", "Public Holiday", "Status"],
      (claims || []).map((c) => [
        c.claim_date,
        c.shift_type,
        c.hours_worked,
        c.overtime_hours,
        c.is_holiday ? "Yes" : "No",
        c.status,
      ])
    );
    setExporting(null);
  };

  // ===== Export: Payroll PDF =====
  const handlePayrollPDF = () => {
    setExporting("payroll");
    const rows = approvedClaims.map((c) => {
      const normal = Number(c.hours_worked || 0) * hourlyRate;
      const ot = Number(c.overtime_hours || 0) * hourlyRate * 1.5;
      const holiday = c.is_holiday ? Number(c.hours_worked || 0) * hourlyRate : 0;
      const total = normal + ot + holiday;
      return `
        <tr>
          <td>${c.claim_date}</td>
          <td>${c.shift_type}</td>
          <td>${c.hours_worked}h</td>
          <td>${c.overtime_hours}h</td>
          <td>${c.is_holiday ? "Yes" : "No"}</td>
          <td>R${total.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    exportPDF(
      `Payroll Report — ${empName}`,
      `
        <p><strong>Employee:</strong> ${empName} &nbsp; <strong>ID:</strong> ${empId}</p>
        <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
        <p><strong>Hourly Rate:</strong> R${hourlyRate.toFixed(2)}/hr</p>
        <br/>
        <table>
          <thead>
            <tr><th>Date</th><th>Shift</th><th>Hours</th><th>OT Hours</th><th>Holiday</th><th>Amount</th></tr>
          </thead>
          <tbody>${rows || "<tr><td colspan='6'>No approved claims</td></tr>"}</tbody>
        </table>
        <br/>
        <table style="width: 300px; margin-left: auto;">
          <tr><td><strong>Normal Pay</strong></td><td>R${(approvedClaims.reduce((s, c) => s + Number(c.hours_worked || 0) * hourlyRate, 0)).toFixed(2)}</td></tr>
          <tr><td><strong>Overtime Pay</strong></td><td>R${(approvedClaims.reduce((s, c) => s + Number(c.overtime_hours || 0) * hourlyRate * 1.5, 0)).toFixed(2)}</td></tr>
          <tr><td><strong>Holiday Pay</strong></td><td>R${(approvedClaims.reduce((s, c) => s + (c.is_holiday ? Number(c.hours_worked || 0) * hourlyRate : 0), 0)).toFixed(2)}</td></tr>
          <tr style="font-size: 16px;"><td><strong>Total</strong></td><td><strong>R${totalEarnings.toFixed(2)}</strong></td></tr>
        </table>
      `
    );
    setExporting(null);
  };

  // ===== Export: Compliance CSV =====
  const handleComplianceCSV = () => {
    setExporting("compliance");
    const overtimeClaims = approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 0);
    const holidayClaims = approvedClaims.filter((c) => c.is_holiday);

    exportCSV(
      `compliance_${empId}_${startDate}_${endDate}.csv`,
      ["Date", "Shift Type", "Hours Worked", "Overtime Hours", "Public Holiday", "Note"],
      approvedClaims.map((c) => [
        c.claim_date,
        c.shift_type,
        c.hours_worked,
        c.overtime_hours,
        c.is_holiday ? "Yes" : "No",
        Number(c.overtime_hours || 0) > 3
          ? "Overtime exceeds 3hrs"
          : c.is_holiday
            ? "Holiday claim"
            : "Normal",
      ])
    );
    setExporting(null);
  };

  const reports = [
    {
      key: "roster",
      icon: "📅",
      title: "Roster Report",
      description: "View your shift schedule for the selected date range.",
      btnLabel: "Export PDF",
      btnColor: "#dc2626",
      borderColor: "#fecaca",
      loading: loadingRoster,
      count: `${scheduledShifts.length} scheduled shifts`,
      action: handleRosterPDF,
    },
    {
      key: "claims",
      icon: "📝",
      title: "Claims Report",
      description: "Download your submitted claims and status history.",
      btnLabel: "Export CSV",
      btnColor: "#16a34a",
      borderColor: "#bbf7d0",
      loading: loadingClaims,
      count: `${claims?.length || 0} claims (${approvedClaims.length} approved)`,
      action: handleClaimsCSV,
    },
    {
      key: "payroll",
      icon: "💰",
      title: "Payroll Report",
      description: "Export your earnings summary based on approved claims.",
      btnLabel: "Export PDF",
      btnColor: "#dc2626",
      borderColor: "#fecaca",
      loading: loadingClaims,
      count: `R${totalEarnings.toFixed(2)} total earnings`,
      action: handlePayrollPDF,
    },
    {
      key: "compliance",
      icon: "⚠️",
      title: "Compliance Report",
      description: "View overtime, rest period and public holiday compliance.",
      btnLabel: "Export CSV",
      btnColor: "#006fd6",
      borderColor: "#bfdbfe",
      loading: loadingClaims,
      count: `${approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 0).length} overtime entries`,
      action: handleComplianceCSV,
    },
  ];

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Reports</div>

        <div className="page-title-row">
          <div>
            <h2>My Reports</h2>
            <p className="subtitle">
              Generate and export your roster, claims, and payroll reports.
            </p>
          </div>
        </div>

        {/* ===== Date Range Picker ===== */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header" style={{ marginBottom: 14 }}>
            <h3>Select Date Range</h3>
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />

          {/* Summary pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: `${scheduledShifts.length} Shifts`, color: "#eaf4ff", text: "#006fd6" },
              { label: `${claims?.length || 0} Claims`, color: "#fff3e5", text: "#b54708" },
              { label: `${approvedClaims.length} Approved`, color: "#e8f8ef", text: "#157347" },
              { label: `${totalHours}h Worked`, color: "#f1eaff", text: "#7a3aed" },
              { label: `${totalOT}h Overtime`, color: "#fee4e2", text: "#b42318" },
            ].map(({ label, color, text }) => (
              <span key={label} style={{
                background: color, color: text,
                padding: "5px 14px", borderRadius: 999,
                fontSize: 12, fontWeight: 700,
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ===== Report Cards ===== */}
        <div className="reports-grid">
          {reports.map((report) => (
            <div key={report.key} className="report-card">
              <div className="report-icon">{report.icon}</div>
              <h3>{report.title}</h3>
              <p>{report.description}</p>

              {/* Count badge */}
              <div className="flex items-start gap-2">
                <p className="text-center" style={{
                  fontSize: 12, fontWeight: 700, color: "#006fd6",
                  background: "#eaf4ff", padding: "10px",
                  borderRadius: 999, display: "inline-block"
                }}>
                  {report.loading ? "Loading..." : report.count}
                </p>

                <button
                  className="report-btn"
                  onClick={report.action}
                  disabled={report.loading || exporting === report.key}
                  style={{
                    border: `1px solid ${report.borderColor}`,
                    color: report.btnColor,
                    opacity: report.loading ? 0.6 : 1,
                    cursor: report.loading ? "not-allowed" : "pointer",
                  }}
                >
                  {exporting === report.key ? "Exporting..." : report.btnLabel}
                </button>
              </div>
            </div>
          ))}
        </div>

      </section>
    </Layout>
  );
}

export default MyReports;