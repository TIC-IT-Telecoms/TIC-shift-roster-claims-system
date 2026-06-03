import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamApi } from "../api/teamApi";
import { employeeApi } from "../api/employeeApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import Pagination from "../components/Pagination";
import usePagination from "../hooks/usePagination";
import AddTeam from "./AddTeam";

function Teams() {
  const location = useLocation();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [viewTeam, setViewTeam] = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.success || "");

  // Clear location state after reading
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
  const { data: teams, isLoading } = useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (d) => d.data,
  });

  const { data: employees } = useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn: employeeApi.getAll,
    select: (d) => d.data,
  });

  // ===== Delete =====
  const deleteTeam = useMutation({
    mutationFn: teamApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS });
      setSuccessMsg("Team deleted successfully.");
    },
    onError: (err) => alert(err.message),
  });

  const handleDelete = (team) => {
    if (!confirm(`Delete "${team.team_name}"? Employees will be unassigned.`)) return;
    deleteTeam.mutate(team.team_id);
  };

  // ===== Modal handlers =====
  const openAdd = () => { setEditTeam(null); setShowModal(true); };
  const openEdit = (team) => { setEditTeam(team); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditTeam(null); };

  const handleModalSuccess = (msg) => {
    closeModal();
    setSuccessMsg(msg);
  };

  // ===== Filter =====
  const filtered = (teams || []).filter((t) =>
    t.team_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData,
    pageSize,
  } = usePagination(filtered, 4);

  // ===== Derive team lead from employees =====
  // Team lead = first admin/supervisor in the team, fallback to first member
  const getTeamLead = (team) => {
    const members = team.employees || [];
    if (!members.length) return "—";
    const lead = members.find((e) => e.user?.role === "admin") || members[0];
    return lead?.name || "—";
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Teams</div>

        <div className="page-title-row">
          <div>
            <h2>Teams</h2>
            <p className="subtitle">Manage teams and employee groupings.</p>
          </div>
          <button className="primary-btn" onClick={openAdd}>
            + Add Team
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
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              Loading teams...
            </p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Team Name</th>
                  <th>Members</th>
                  <th>Team Lead</th>
                  <th>Description</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((team) => (
                  <tr key={team.team_id}>
                    <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                      TEAM{String(team.team_id).padStart(3, "0")}
                    </td>
                    <td>
                      <strong style={{ color: "#1d2939" }}>{team.team_name}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Member avatars */}
                        <div style={{ display: "flex" }}>
                          {(team.employees || []).slice(0, 3).map((emp, i) => (
                            <div key={emp.employee_id} style={{
                              width: 26, height: 26, borderRadius: "50%",
                              background: "#006fd6", color: "white",
                              fontSize: 10, fontWeight: 700,
                              display: "flex", alignItems: "center",
                              justifyContent: "center",
                              marginLeft: i > 0 ? -8 : 0,
                              border: "2px solid white",
                              zIndex: 3 - i,
                            }}>
                              {emp.name?.charAt(0)}
                            </div>
                          ))}
                          {(team.employees?.length || 0) > 3 && (
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%",
                              background: "#eaf4ff", color: "#006fd6",
                              fontSize: 10, fontWeight: 700,
                              display: "flex", alignItems: "center",
                              justifyContent: "center",
                              marginLeft: -8,
                              border: "2px solid white",
                            }}>
                              +{team.employees.length - 3}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 13, color: "#344054" }}>
                          {team.employees?.length || 0}{" "}
                          {team.employees?.length === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "#344054", fontSize: 13 }}>
                      {getTeamLead(team)}
                    </td>
                    <td style={{ color: "#667085", fontSize: 13, maxWidth: 200 }}>
                      <span style={{
                        display: "block", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {team.description || "—"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {/* View members */}
                        <button
                          className="edit-btn"
                          onClick={() => setViewTeam(team)}
                          title="View members"
                        >
                          👁
                        </button>
                        {/* Edit */}
                        <button
                          className="edit-btn"
                          onClick={() => openEdit(team)}
                          title="Edit team"
                        >
                          ✎
                        </button>
                        {/* Delete */}
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(team)}
                          disabled={deleteTeam.isPending}
                          title="Delete team"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {search
                        ? "No teams match your search."
                        : "No teams yet. Click + Add Team to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between mt-4 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {filtered.length
                ? (currentPage - 1) * pageSize + 1
                : 0}
              -
              {Math.min(currentPage * pageSize, filtered.length)} of{" "}
              {filtered.length} teams
            </p>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* ===== View Members Modal ===== */}
        {viewTeam && (
          <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000, padding: 16,
          }}>
            <div style={{
              background: "white", borderRadius: 16,
              width: "100%", maxWidth: 480,
              maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
            }}>
              {/* Header */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "20px 24px 16px",
                borderBottom: "1px solid #e6edf5",
                position: "sticky", top: 0,
                background: "white", zIndex: 10,
              }}>
                <div>
                  <h3 style={{ margin: 0, color: "#005bbb", fontSize: 16 }}>
                    {viewTeam.team_name}
                  </h3>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#667085" }}>
                    {viewTeam.employees?.length || 0} member{viewTeam.employees?.length !== 1 ? "s" : ""}
                    {viewTeam.description && ` · ${viewTeam.description}`}
                  </p>
                </div>
                <button
                  onClick={() => setViewTeam(null)}
                  style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#667085" }}
                >
                  ✕
                </button>
              </div>

              {/* Members list */}
              <div style={{ padding: "16px 24px" }}>
                {!viewTeam.employees?.length ? (
                  <p style={{ color: "#667085", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                    No members assigned to this team.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {viewTeam.employees.map((emp) => (
                      <div key={emp.employee_id} style={{
                        display: "flex", alignItems: "center",
                        gap: 12, padding: "12px 14px",
                        background: "#f4f8fd", borderRadius: 10,
                        border: "1px solid #e6edf5",
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: "#006fd6", color: "white",
                          fontSize: 14, fontWeight: 800,
                          display: "flex", alignItems: "center",
                          justifyContent: "center", flexShrink: 0,
                        }}>
                          {emp.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>
                            {emp.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#667085" }}>
                            {emp.email}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className={emp.status === "Active" ? "status-approved" : "status-rejected"}
                            style={{ fontSize: 11 }}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  display: "flex", justifyContent: "flex-end",
                  gap: 10, marginTop: 20, paddingTop: 16,
                  borderTop: "1px solid #e6edf5",
                }}>
                  <button
                    onClick={() => setViewTeam(null)}
                    className="cancel-btn"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setViewTeam(null); openEdit(viewTeam); }}
                    className="primary-btn"
                  >
                    ✎ Edit Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== AddTeam Modal ===== */}
        {showModal && (
          <AddTeam
            team={editTeam}
            employees={employees}
            onClose={closeModal}
            onSuccess={handleModalSuccess}
          />
        )}

      </section>
    </Layout>
  );
}

export default Teams;