// src/pages/Employees.jsx
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { teamApi } from "../api/teamApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatEmpId, formatRate } from "../utils/helpers";
import AddEmployee from "./AddEmployee";

// ===== Status Badge =====
const StatusBadge = ({ status }) => (
  <span className={status === "Active" ? "status-approved" : "status-rejected"}>
    {status}
  </span>
);

function Employees() {
  const location = useLocation();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.success || "");

  // Clear location state success message after reading
  useEffect(() => {
    if (location.state?.success) {
      window.history.replaceState({}, "");
      const t = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ===== Queries =====
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

  // ===== Deactivate =====
  const deactivate = useMutation({
    mutationFn: employeeApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      setSuccessMsg("Employee deactivated successfully.");
    },
    onError: (err) => alert(err.message),
  });
  
  const activate = useMutation({
    mutationFn: employeeApi.activate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      setSuccessMsg("Employee activated successfully.");
    },
    onError: (err) => alert(err.message),
  });

  const handleDeactivate = (emp) => {
    if (!confirm(`Deactivate ${emp.name}? They will lose system access.`)) return;
    deactivate.mutate(emp.employee_id);
  };

  const handleActivate = (emp) => {
    if (!confirm(`Activate ${emp.name}? They will regain system access.`)) return;
    activate.mutate(emp.employee_id);
  };

  // ===== Modal handlers =====
  const openAdd = () => { setEditEmployee(null); setShowModal(true); };
  const openEdit = (emp) => { setEditEmployee(emp); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditEmployee(null); };

  const handleModalSuccess = (msg) => {
    closeModal();
    setSuccessMsg(msg);
  };

  // ===== Filter =====
  const filtered = (employees || []).filter((emp) => {
    const q = search.toLowerCase();
    const matchSearch =
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      formatEmpId(emp.employee_id).toLowerCase().includes(q);
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
          <button className="primary-btn" onClick={openAdd}>
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
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              Loading employees...
            </p>
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
                      <strong style={{ color: "#1d2939" }}>{emp.name}</strong>
                      <div style={{ fontSize: 11, color: "#667085" }}>{emp.email}</div>
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
                    <td><StatusBadge status={emp.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="edit-btn"
                          onClick={() => openEdit(emp)}
                          title="Edit employee"
                        >
                          ✎
                        </button>
                        {emp.status === "Active" ? (
                          <button
                            className="delete-btn"
                            onClick={() => handleDeactivate(emp)}
                            disabled={deactivate.isPending}
                            title="Deactivate"
                          >
                            🚫
                          </button>
                        ) : (
                          <button
                            className="delete-btn"
                            onClick={() => handleActivate(emp)}
                            disabled={activate?.isPending || deactivate.isPending}
                            title="Activate"
                          >
                            ✅
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
                        : "No employees yet. Click + Add Employee to get started."}
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

        {/* ===== AddEmployee Modal ===== */}
        {showModal && (
          <AddEmployee
            employee={editEmployee}
            teams={teams}
            employees={employees}
            onClose={closeModal}
            onSuccess={handleModalSuccess}
          />
        )}

      </section>
    </Layout>
  );
}

export default Employees;