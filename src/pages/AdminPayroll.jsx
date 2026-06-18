import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../api/payrollApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatZAR, formatDate, getMonthStart,
  getTodayStr, exportCSV, exportPDF,
} from "../utils/helpers";
import usePagination from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import ConfirmationModal from "../components/ui/ConfirmationModal";

const todayStr = getTodayStr();
const monthStart = getMonthStart();

// ===== Month quick-select presets (last 6 months) =====
const buildPresets = () => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().split("T")[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    list.push({
      label: d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" }),
      start, end,
    });
  }
  return list;
};
const PRESETS = buildPresets();

// ===== Inline stat card =====
const StatCard = ({ label, value, sub, color = "#006fd6" }) => (
  <div style={{
    background: "white", border: "1px solid #e6edf5",
    borderRadius: 12, padding: "16px 18px",
  }}>
    <div style={{ fontSize: 12, color: "#667085", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 4 }}>{sub}</div>}
  </div>
);

// ===== View Detail Modal =====
function DetailModal({ record, onClose, onDelete }) {
  if (!record) return null;
  const period = `${formatDate(record.pay_period_start)} – ${formatDate(record.pay_period_end)}`;

  const rows = [
    { label: "Normal Pay", value: formatZAR(record.normal_pay), color: "#344054" },
    { label: "Overtime Pay (×1.5)", value: formatZAR(record.overtime_pay), color: Number(record.overtime_pay) > 0 ? "#b54708" : "#344054" },
    { label: "Holiday Pay", value: formatZAR(record.holiday_pay), color: Number(record.holiday_pay) > 0 ? "#7a3aed" : "#344054" },
    { label: "Grave Shift Allowance", value: formatZAR(record.grave_allowance), color: "#344054" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, width: "100%", maxWidth: 460,
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "#006fd6", color: "white", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Payroll #{record.payroll_id}</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.85 }}>
              {record.employee?.name} · {period}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Employee info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Employee", value: record.employee?.name || "—" },
              { label: "Team", value: record.employee?.team?.team_name || "—" },
              { label: "Pay Period", value: period },
              { label: "Generated", value: formatDate(record.generated_at || record.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#667085", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            {rows.map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #edf2f7", fontSize: 13 }}>
                <span style={{ color: "#667085" }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#eaf4ff", fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: "#005bbb" }}>Total Pay</span>
              <span style={{ color: "#005bbb" }}>{formatZAR(record.total_pay)}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => { onClose(); onDelete(record.payroll_id); }}
              style={{ padding: "9px 16px", background: "#fee4e2", color: "#b42318", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              🗑 Delete
            </button>
            <button onClick={onClose} className="cancel-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main =====
function AdminPayroll() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [teamFilter, setTeamFilter] = useState("");
  const [viewRecord, setViewRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  // ===== Queries =====
  const { data: payroll, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.PAYROLL({ start: startDate, end: endDate, team: teamFilter }),
    queryFn: () =>
      payrollApi.getAll({
        pay_period_start: startDate,
        pay_period_end: endDate,
        team_id: teamFilter || undefined,
      }).then((res) => res.data || []),
    enabled: !!startDate && !!endDate,
  });

  const payrolls = Array.isArray(payroll) ? payroll : [];

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (d) => d.data,
  });

  // ===== Delete mutation =====
  const deleteMutation = useMutation({
    mutationFn: (id) => payrollApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      setDeleteTarget(null);
      showSuccess("Payroll record deleted.");
    },
  });

  // ===== Pagination =====
  const { currentPage, setCurrentPage, totalPages,
    paginatedData, startIndex, endIndex } = usePagination(payrolls, 5);

  // ===== Summary =====
  const totalPay = payrolls.reduce((s, r) => s + Number(r.total_pay || 0), 0);
  const totalOT = payrolls.reduce((s, r) => s + Number(r.overtime_pay || 0), 0);
  const totalHoliday = payrolls.reduce((s, r) => s + Number(r.holiday_pay || 0), 0);
  const totalGrave = payrolls.reduce((s, r) => s + Number(r.grave_allowance || 0), 0);
  const periodLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  // ===== Export =====
  const handleCSV = () => {
    exportCSV(`payroll_${startDate}_${endDate}.csv`, [
      "ID", "Employee", "Team", "Period", "Normal Pay", "OT Pay", "Holiday Pay", "Grave Allow", "Total Pay",
    ], payrolls.map((r) => [
      r.payroll_id, r.employee?.name, r.employee?.team?.team_name || "—",
      `${r.pay_period_start} → ${r.pay_period_end}`,
      r.normal_pay, r.overtime_pay, r.holiday_pay, r.grave_allowance, r.total_pay,
    ]));
  };

  const handlePDF = () => {
    const rows = payrolls.map((r) =>
      `<tr><td>${r.payroll_id}</td><td>${r.employee?.name}</td><td>${r.employee?.team?.team_name || "—"}</td><td>${formatZAR(r.normal_pay)}</td><td>${formatZAR(r.overtime_pay)}</td><td>${formatZAR(r.holiday_pay)}</td><td>${formatZAR(r.grave_allowance)}</td><td><strong>${formatZAR(r.total_pay)}</strong></td></tr>`
    ).join("");
    exportPDF(
      `Payroll Summary — ${periodLabel}`,
      `<table><thead><tr><th>ID</th><th>Employee</th><th>Team</th><th>Normal</th><th>OT</th><th>Holiday</th><th>Grave</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
       <br/><table style="width:280px;margin-left:auto;font-size:14px">
         <tr><td>Normal Pay Total</td><td align="right"><strong>${formatZAR(payrolls.reduce((s, r) => s + Number(r.normal_pay || 0), 0))}</strong></td></tr>
         <tr><td>Overtime Total</td><td align="right"><strong>${formatZAR(totalOT)}</strong></td></tr>
         <tr><td>Holiday Pay Total</td><td align="right"><strong>${formatZAR(totalHoliday)}</strong></td></tr>
         <tr><td>Grave Allowance</td><td align="right"><strong>${formatZAR(totalGrave)}</strong></td></tr>
         <tr style="font-size:16px"><td><strong>Grand Total</strong></td><td align="right"><strong>${formatZAR(totalPay)}</strong></td></tr>
       </table>`
    );
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Payroll</div>

        <div className="page-title-row">
          <div>
            <h2>Payroll</h2>
            <p className="subtitle">Generate and review employee payroll summaries.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleCSV}
              disabled={!payrolls.length}
              style={{ padding: "10px 16px", border: "1px solid #e6edf5", background: "white", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: payrolls.length ? "pointer" : "not-allowed", color: "#344054", opacity: payrolls.length ? 1 : 0.5 }}
            >
              📁 CSV
            </button>
            <button
              onClick={handlePDF}
              disabled={!payrolls.length}
              style={{ padding: "10px 16px", border: "1px solid #e6edf5", background: "white", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: payrolls.length ? "pointer" : "not-allowed", color: "#344054", opacity: payrolls.length ? 1 : 0.5 }}
            >
              📄 PDF
            </button>
            <button
              className="primary-btn"
              onClick={() => navigate("/admin-payroll/generate")}
            >
              + Generate Payroll
            </button>
          </div>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div style={{ background: "#e8f8ef", border: "1px solid #bbf7d0", color: "#157347", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            ✓ {successMsg}
          </div>
        )}

        {/* ===== Period quick select ===== */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#667085", fontWeight: 700, marginRight: 4 }}>Period:</span>
          {PRESETS.map((p) => {
            const active = p.start === startDate && p.end === endDate;
            return (
              <button
                key={p.start}
                onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  border: `1px solid ${active ? "#006fd6" : "#e6edf5"}`,
                  background: active ? "#eaf4ff" : "white",
                  color: active ? "#006fd6" : "#667085",
                }}
              >
                {p.label}
              </button>
            );
          })}
          {/* Custom range */}
          <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "5px 10px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 12, outline: "none" }}
            />
            <span style={{ color: "#667085", alignSelf: "center", fontSize: 12 }}>→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayStr}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "5px 10px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 12, outline: "none" }}
            />
          </div>

          {/* Team filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            style={{ padding: "5px 10px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 12, outline: "none", marginLeft: 4 }}
          >
            <option value="">All Teams</option>
            {teams?.map((t) => (
              <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
            ))}
          </select>
        </div>

        {/* ===== Summary Stats ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Employees" value={isLoading ? "…" : payrolls.length} sub={periodLabel} color="#1d2939" />
          <StatCard label="Total Payroll" value={isLoading ? "…" : formatZAR(totalPay)} sub="All employees combined" color="#006fd6" />
          <StatCard label="Overtime Pay" value={isLoading ? "…" : formatZAR(totalOT)} sub="Overtime across all employees" color="#b54708" />
          <StatCard label="Holiday Pay" value={isLoading ? "…" : formatZAR(totalHoliday)} sub="Holiday claims total" color="#7a3aed" />
        </div>

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading payroll records...</p>
          ) : isError ? (
            <p style={{ color: "#b42318", fontSize: 13, padding: "20px 0" }}>Failed to load payroll records. Please try again.</p>
          ) : payrolls.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#667085" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
              <p style={{ fontWeight: 700, margin: "0 0 6px", fontSize: 14 }}>No payroll records for this period</p>
              <p style={{ fontSize: 13, margin: "0 0 16px" }}>Generate payroll from approved claims to see records here.</p>
              <button className="primary-btn" onClick={() => navigate("/admin-payroll/generate")}>
                Generate Payroll
              </button>
            </div>
          ) : (
            <>
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Team</th>
                    <th>Period</th>
                    <th>Normal Pay</th>
                    <th>OT Pay</th>
                    <th>Holiday Pay</th>
                    <th>Grave Allow</th>
                    <th>Total Pay</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((record) => (
                    <tr key={record.payroll_id}>
                      <td style={{ fontFamily: "monospace", color: "#667085", fontSize: 12 }}>
                        #{record.payroll_id}
                      </td>
                      <td>
                        <strong style={{ fontSize: 13, color: "#1d2939" }}>{record.employee?.name || "—"}</strong>
                      </td>
                      <td style={{ fontSize: 13, color: "#667085" }}>
                        {record.employee?.team?.team_name || "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "#667085", whiteSpace: "nowrap" }}>
                        {formatDate(record.pay_period_start)}<br />
                        <span style={{ color: "#98a2b3" }}>→ {formatDate(record.pay_period_end)}</span>
                      </td>
                      <td style={{ fontSize: 13, color: "#344054" }}>{formatZAR(record.normal_pay)}</td>
                      <td style={{ fontSize: 13, color: Number(record.overtime_pay) > 0 ? "#b54708" : "#344054", fontWeight: Number(record.overtime_pay) > 0 ? 700 : 400 }}>
                        {formatZAR(record.overtime_pay)}
                      </td>
                      <td style={{ fontSize: 13, color: Number(record.holiday_pay) > 0 ? "#7a3aed" : "#344054", fontWeight: Number(record.holiday_pay) > 0 ? 700 : 400 }}>
                        {formatZAR(record.holiday_pay)}
                      </td>
                      <td style={{ fontSize: 13, color: "#344054" }}>
                        {Number(record.grave_allowance) > 0 ? formatZAR(record.grave_allowance) : <span style={{ color: "#d0d5dd" }}>—</span>}
                      </td>
                      <td>
                        <strong style={{ color: "#006fd6", fontSize: 14 }}>{formatZAR(record.total_pay)}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            title="View details"
                            onClick={() => setViewRecord(record)}
                            style={{ background: "#eaf4ff", color: "#006fd6", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}
                          >
                            👁
                          </button>
                          <button
                            title="Delete record"
                            onClick={() => setDeleteTarget(record.payroll_id)}
                            style={{ background: "#fee4e2", color: "#b42318", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totals footer row */}
                <tfoot>
                  <tr style={{ background: "#f4f8fd", fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: "10px 12px", fontSize: 13, color: "#344054" }}>
                      Totals ({payrolls.length} employee{payrolls.length !== 1 ? "s" : ""})
                    </td>
                    <td style={{ fontSize: 13, color: "#344054" }}>
                      {formatZAR(payrolls.reduce((s, r) => s + Number(r.normal_pay || 0), 0))}
                    </td>
                    <td style={{ fontSize: 13, color: "#b54708" }}>{formatZAR(totalOT)}</td>
                    <td style={{ fontSize: 13, color: "#7a3aed" }}>{formatZAR(totalHoliday)}</td>
                    <td style={{ fontSize: 13, color: "#344054" }}>{formatZAR(totalGrave)}</td>
                    <td style={{ fontSize: 14, color: "#006fd6" }}>{formatZAR(totalPay)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              {/* Pagination footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid #edf2f7", paddingTop: 12 }}>
                <p className="roster-note" style={{ margin: 0 }}>
                  Showing {startIndex}–{endIndex} of {payrolls.length} records
                </p>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </>
          )}
        </div>

        {/* ===== Modals ===== */}
        {viewRecord && (
          <DetailModal
            record={viewRecord}
            onClose={() => setViewRecord(null)}
            onDelete={(id) => { setViewRecord(null); setDeleteTarget(id); }}
          />
        )}

        {deleteTarget && (
          <ConfirmationModal
            title="Delete Payroll Record"
            message="Permanently delete this payroll record? This action cannot be undone and may affect payroll reporting."
            confirmText="Delete"
            confirmColor="#dc2626"
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </section>
    </Layout>
  );
}

export default AdminPayroll;
