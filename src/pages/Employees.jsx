// src/pages/Employees.jsx
import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Helpers =====
const formatEmpId = (id) => `EMP${String(id).padStart(3, "0")}`;
const formatRate = (rate) => `R${Number(rate || 0).toFixed(2)}`;

const StatusBadge = ({ status }) => (
  <span className={status === "Active" ? "status-approved" : "status-rejected"}>
    {status}
  </span>
);

// ===== Add / Edit Modal =====
const defaultForm = {
  name: "", email: "", phone: "", team_id: "",
  hourly_rate: "", role: "employee", password: "",
  employment_type: "Full Time", join_date: "",
  id_number: "", address: "",
};

function EmployeeModal({ employee, teams, onClose, onSuccess }) {
  const isEdit = !!employee;
  const [form, setForm] = useState(
    isEdit ? {
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      team_id: employee.team_id || "",
      hourly_rate: employee.hourly_rate || "",
      role: employee.role || "employee",
      password: "",
      employment_type: employee.employment_type || "Full Time",
      join_date: employee.join_date || "",
      id_number: employee.id_number || "",
      address: employee.address || "",
    } : defaultForm
  );
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const createEmployee = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES }); onSuccess(); },
    onError: (err) => setError(err.message),
  });

  const updateEmployee = useMutation({
    mutationFn: (data) => employeeApi.update(employee.employee_id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES }); onSuccess(); },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form };
    if (isEdit) delete payload.password;
    if (isEdit) {
      updateEmployee.mutate(payload);
    } else {
      if (!payload.password) { setError("Password is required."); return; }
      createEmployee.mutate(payload);
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
        onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
        onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,95,180,0.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#005bbb" }}>{isEdit ? "Edit Employee" : "Add Employee"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#667085" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {field("Full Name *", "name", "text", "John Doe")}
            {field("Email *", "email", "email", "john@company.com")}
            {field("Phone", "phone", "tel", "0821234567")}
            {field("Hourly Rate (R)", "hourly_rate", "number", "100.00")}
            {field("ID Number", "id_number", "text", "1001012345087")}
            {field("Join Date", "join_date", "date")}
          </div>

          {/* Team */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Team</label>
            <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}>
              <option value="">No team</option>
              {teams?.map((t) => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
            </select>
          </div>

          {/* Role + Employment Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Employment Type</label>
              <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}>
                {["Full Time", "Part Time", "Contract", "Intern"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. JHB, Gauteng, South Africa" rows={2}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          {/* Password — create only */}
          {!isEdit && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 18px", border: "1px solid #d0d5dd", borderRadius: 8, background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              style={{ padding: "10px 18px", background: "#006fd6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Main Component =====
function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: employees, isLoading } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn: employeeApi.getAll,
    select: (d) => d.data,
  });

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (d) => d.data,
  });

  const deactivate = useMutation({
    mutationFn: employeeApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      setSuccessMsg("Employee deactivated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const handleDeactivate = (emp) => {
    if (!confirm(`Deactivate ${emp.name}? They will lose system access.`)) return;
    deactivate.mutate(emp.employee_id);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditEmployee(null);
    setSuccessMsg(editEmployee ? "Employee updated successfully." : "Employee created successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ===== Filter =====
  const filtered = (employees || []).filter((emp) => {
    const matchSearch =
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      formatEmpId(emp.employee_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? emp.status === statusFilter : true;
    const matchTeam = teamFilter ? String(emp.team_id) === String(teamFilter) : true;
    return matchSearch && matchStatus && matchTeam;
  });

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Employees</div>

        <div className="page-title-row">
          <div>
            <h2>Employees</h2>
            <p className="subtitle">Manage employee records and roles.</p>
          </div>
          <button
            className="primary-btn"
            onClick={() => { setEditEmployee(null); setShowModal(true); }}
          >
            + Add Employee
          </button>
        </div>

        {/* ===== Success Banner ===== */}
        {successMsg && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "10px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* ===== Toolbar ===== */}
        <div className="employee-toolbar">
          <input
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-btn"
            style={{ cursor: "pointer" }}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Team filter */}
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

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading employees...</p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Role</th>
                  <th>Rate (R/h)</th>
                  <th>Employment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.employee_id}>
                    <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                      {formatEmpId(emp.employee_id)}
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: "#1d2939" }}>{emp.name}</strong>
                        <div style={{ fontSize: 11, color: "#667085" }}>{emp.email}</div>
                      </div>
                    </td>
                    <td style={{ color: "#344054", fontSize: 13 }}>
                      {emp.team?.team_name || <span style={{ color: "#d0d5dd" }}>—</span>}
                    </td>
                    <td style={{ color: "#344054", fontSize: 13, textTransform: "capitalize" }}>
                      {emp.role}
                    </td>
                    <td style={{ color: "#344054", fontSize: 13 }}>
                      {formatRate(emp.hourly_rate)}
                    </td>
                    <td style={{ color: "#344054", fontSize: 13 }}>
                      {emp.employment_type || "—"}
                    </td>
                    <td>
                      <StatusBadge status={emp.status} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="edit-btn"
                          onClick={() => { setEditEmployee(emp); setShowModal(true); }}
                          title="Edit employee"
                        >
                          ✎
                        </button>
                        {emp.status === "Active" && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDeactivate(emp)}
                            disabled={deactivate.isPending}
                            title="Deactivate employee"
                          >
                            🚫
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {search || statusFilter || teamFilter
                        ? "No employees match your filters."
                        : "No employees found. Add your first employee."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filtered.length} of {employees?.length || 0} employees
          </p>
        </div>

        {/* ===== Modal ===== */}
        {showModal && (
          <EmployeeModal
            employee={editEmployee}
            teams={teams}
            onClose={() => { setShowModal(false); setEditEmployee(null); }}
            onSuccess={handleModalSuccess}
          />
        )}
      </section>
    </Layout>
  );
}

export default Employees;