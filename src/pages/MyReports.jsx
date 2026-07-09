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

// ===== Print/PDF helper =====
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
  <div className="flex flex-wrap items-center gap-4">
    <div>
      <label className="block text-xs text-gray-500 mb-1">From</label>
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:border-blue-600 focus:ring focus:ring-blue-200"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">To</label>
      <input
        type="date"
        value={endDate}
        min={startDate}
        max={today}
        onChange={(e) => onEndChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:border-blue-600 focus:ring focus:ring-blue-200"
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
      btnColor: "bg-red-600 hover:bg-red-700",
      loading: loadingRoster,
      count: `${scheduledShifts.length} scheduled shifts`,
      action: handleRosterPDF
    },
    {
      key: "claims",
      icon: "📝",
      title: "Claims Report",
      description: "Download your submitted claims and status history.",
      btnLabel: "Export CSV",
      btnColor: "bg-green-600 hover:bg-green-700",
      loading: loadingClaims,
      count: `${claims?.length || 0} claims (${approvedClaims.length} approved)`,
      action: handleClaimsCSV
    },
    {
      key: "payroll",
      icon: "💰",
      title: "Payroll Report",
      description: "Export your earnings summary based on approved claims.",
      btnLabel: "Export PDF",
      btnColor: "bg-red-600 hover:bg-red-700",
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
      btnColor: "bg-green-600 hover:bg-green-700",
      loading: loadingClaims,
      count: `${approvedClaims.filter((c) => Number(c.overtime_hours || 0) > 0).length} overtime entries`,
      action: handleComplianceCSV,
    },
  ];

  return (
    <Layout>
      <section className="p-6">
        <div className="text-sm text-gray-500 mb-4">Dashboard &gt; My Reports</div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold">My Reports</h2>
          <p className="text-gray-500 text-sm">
            Generate and export your roster, claims, and payroll reports.
          </p>
        </div>

        {/* ===== Date Range Picker ===== */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select Date Range</h3>
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />

          {/* Summary pills */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: `${scheduledShifts.length} Shifts`, bg: "bg-blue-50", text: "text-blue-600" },
              { label: `${claims?.length || 0} Claims`, bg: "bg-orange-50", text: "text-orange-600" },
              { label: `${approvedClaims.length} Approved`, bg: "bg-green-50", text: "text-green-600" },
              { label: `${totalHours}h Worked`, bg: "bg-purple-50", text: "text-purple-600" },
              { label: `${totalOT}h Overtime`, bg: "bg-red-50", text: "text-red-600" },
            ].map(({ label, bg, text }) => (
              <span
                key={label}
                className={`${bg} ${text} px-4 py-1 rounded-full text-xs font-bold`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ===== Report Cards ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reports.map((report) => (
            <div
              key={report.key}
              className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{report.icon}</span>
                  <h3 className="text-lg font-semibold">{report.title}</h3>
                </div>
                <p className="text-gray-500 text-sm mb-3">{report.description}</p>
                <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                  {report.loading ? "Loading..." : report.count}
                </p>
              </div>

              <button
                className={`mt-4 px-4 py-2 rounded-lg font-bold text-sm border transition 
                ${report.btnColor} text-white disabled:opacity-50`}
                onClick={report.action}
                disabled={report.loading || exporting === report.key}
              >
                {exporting === report.key ? "Exporting..." : report.btnLabel}
              </button>
            </div>
          ))}
        </div>

      </section>
    </Layout>
  );
}

export default MyReports;