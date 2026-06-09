import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatDate, formatZAR, calcClaimEarnings } from "../utils/helpers";

// ===== Status badge =====
const StatusBadge = ({ status }) => {
  const map = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected",
  };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

// ===== View & Edit Claim Modal =====
function ClaimModal({ claim, onClose, hourlyRate, isEditing, onSave, isSaving }) {
  if (!claim) return null;

  // Local state for editing form inputs
  const [formData, setFormData] = useState({
    claim_date: claim.claim_date || "",
    shift_type: claim.shift_type || "Day",
    hours_worked: claim.hours_worked || 0,
    overtime_hours: claim.overtime_hours || 0,
    is_holiday: claim.is_holiday || false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Re-calculate mock earnings live if they change values in the edit panel
  const currentEarningsContext = isEditing 
    ? calcClaimEarnings(formData, hourlyRate) 
    : calcClaimEarnings(claim, hourlyRate);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 480,
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: isEditing ? "#b54708" : "#006fd6", color: "white",
          padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {isEditing ? `Modify Claim #${String(claim.claim_id).padStart(4, "0")}` : `Claim #${String(claim.claim_id).padStart(4, "0")}`}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.85 }}>
              Status: {claim.status}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            color: "white", width: 28, height: 28, borderRadius: "50%",
            cursor: "pointer", fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", maxHeight: "80vh", overflowY: "auto" }}>
          
          {isEditing ? (
            /* ===== EDIT FORM MODE ===== */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ block: "true", fontSize: 12, fontWeight: 600, color: "#344054", marginBottom: 4 }}>Claim Date</label>
                <input 
                  type="date" 
                  name="claim_date"
                  value={formData.claim_date}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d0d5dd", borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ block: "true", fontSize: 12, fontWeight: 600, color: "#344054", marginBottom: 4 }}>Shift Type</label>
                <select 
                  name="shift_type"
                  value={formData.shift_type}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d0d5dd", borderRadius: 8 }}
                >
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                  <option value="Grave">Grave Shift</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ block: "true", fontSize: 12, fontWeight: 600, color: "#344054", marginBottom: 4 }}>Hours Worked</label>
                  <input 
                    type="number" 
                    name="hours_worked"
                    min="0"
                    max="24"
                    value={formData.hours_worked}
                    onChange={handleInputChange}
                    required
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d0d5dd", borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ block: "true", fontSize: 12, fontWeight: 600, color: "#344054", marginBottom: 4 }}>Overtime Hours</label>
                  <input 
                    type="number" 
                    name="overtime_hours"
                    min="0"
                    max="24"
                    value={formData.overtime_hours}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d0d5dd", borderRadius: 8 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <input 
                  type="checkbox" 
                  name="is_holiday"
                  id="is_holiday"
                  checked={formData.is_holiday}
                  onChange={handleInputChange}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="is_holiday" style={{ fontSize: 13, color: "#344054", cursor: "pointer" }}>
                  This shift was worked on a Public Holiday 🌟
                </label>
              </div>
            </div>
          ) : (
            /* ===== READ ONLY VIEW MODE ===== */
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                Shift Details
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Shift Type", value: claim.shift_type },
                  { label: "Claim Date", value: claim.claim_date },
                  { label: "Hours Worked", value: `${claim.hours_worked}h` },
                  { label: "Overtime Hours", value: `${claim.overtime_hours}h` },
                  { label: "Public Holiday", value: claim.is_holiday ? "Yes 🌟" : "No" },
                  { label: "Submitted", value: formatDate(claim.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#667085", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earnings Live Breakdown Summary Panel */}
          <div style={{ margin: "18px 0 16px" }}>
            <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
              Estimated Earnings Breakdown
            </p>
            <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden" }}>
              {[
                { label: "Normal Pay", value: formatZAR(currentEarningsContext.normal) },
                { label: "Overtime Pay (×1.5)", value: formatZAR(currentEarningsContext.overtime) },
                { label: "Holiday Pay", value: formatZAR(currentEarningsContext.holiday) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 14px", borderBottom: "1px solid #edf2f7", fontSize: 13,
                }}>
                  <span style={{ color: "#667085" }}>{label}</span>
                  <span style={{ color: "#344054", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "12px 14px", background: isEditing ? "#fff9f5" : "#eaf4ff",
                fontSize: 14, fontWeight: 800,
              }}>
                <span style={{ color: isEditing ? "#b54708" : "#005bbb" }}>Total Estimate</span>
                <span style={{ color: isEditing ? "#b54708" : "#005bbb" }}>{formatZAR(currentEarningsContext.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f2f4f7", paddingTop: 14, marginTop: 14 }}>
            <button type="button" onClick={onClose} className="cancel-btn" disabled={isSaving}>
              Cancel
            </button>
            {isEditing && (
              <button type="submit" className="primary-btn" style={{ background: "#b54708" }} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}

// ===== Main Employee Dashboard Component =====
const TABS = ["All", "Pending", "Approved", "Rejected"];

function MyClaims() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All");
  
  // Modal tracking state contexts
  const [modalContext, setModalContext] = useState({ claim: null, isEditing: false });

  // ===== Fetch profile for hourly rate calculations =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);

  // ===== Fetch all user claims =====
  const { data: allClaims, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({}),
    queryFn: () => claimApi.getMyClaims(),
    select: (d) => d.data,
  });

  // ===== Update Claim Mutation (PUT /api/claims/:id) =====
  const updateClaimMutation = useMutation({
    mutationFn: ({ claimId, data }) => claimApi.update(claimId, data),
    onSuccess: (res) => {
      alert(res?.message || "Claim updated successfully!");
      setModalContext({ claim: null, isEditing: false }); // Close modal safely
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_CLAIMS({}) }); // Refresh lists
    },
    onError: (error) => {
      alert(`Update failed: ${error?.response?.data?.message || error.message}`);
    }
  });

  const handleUpdateSave = (updatedData) => {
    updateClaimMutation.mutate({
      claimId: modalContext.claim.claim_id,
      data: updatedData
    });
  };

  // Breakdown status category counters
  const counts = {
    All: allClaims?.length || 0,
    Pending: allClaims?.filter((c) => c.status === "Pending").length || 0,
    Approved: allClaims?.filter((c) => c.status === "Approved").length || 0,
    Rejected: allClaims?.filter((c) => c.status === "Rejected").length || 0,
  };

  const filtered = activeTab === "All"
    ? allClaims || []
    : (allClaims || []).filter((c) => c.status === activeTab);

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Claims</div>

        <div className="page-title-row">
          <div>
            <h2>My Claims</h2>
            <p className="subtitle">Submit and track your shift claims.</p>
          </div>
          <button
            className="primary-btn"
            onClick={() => navigate("/submit-claim")}
          >
            + Submit Claim
          </button>
        </div>

        {/* ===== Tabs Row ===== */}
        <div className="claims-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        {/* ===== Data Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              Loading claims...
            </p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Hours</th>
                  <th>OT Hours</th>
                  <th>Holiday</th>
                  <th>Est. Pay</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((claim) => {
                  const { total } = calcClaimEarnings(claim, hourlyRate);
                  return (
                    <tr key={claim.claim_id}>
                      <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                        #CLM{String(claim.claim_id).padStart(4, "0")}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.claim_date}</td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.shift_type}</td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.hours_worked}h</td>
                      <td style={{ color: Number(claim.overtime_hours) > 0 ? "#b54708" : "#667085", fontSize: 13, fontWeight: Number(claim.overtime_hours) > 0 ? 700 : 400 }}>
                        {claim.overtime_hours}h
                      </td>
                      <td>
                        {claim.is_holiday ? (
                          <span style={{ color: "#7a3aed", fontWeight: 700, fontSize: 12 }}>🌟 Yes</span>
                        ) : (
                          <span style={{ color: "#667085", fontSize: 13 }}>No</span>
                        )}
                      </td>
                      <td style={{ color: "#006fd6", fontSize: 13, fontWeight: 700 }}>
                        {formatZAR(total)}
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            className="view-link"
                            onClick={() => setModalContext({ claim, isEditing: false })}
                          >
                            View
                          </button>
                          
                          {/* CRITICAL FEATURE: Only display the Edit action if the status is exactly 'Pending' */}
                          {claim.status === "Pending" && (
                            <button
                              className="view-link"
                              style={{ color: "#b54708", fontWeight: 600 }}
                              onClick={() => setModalContext({ claim, isEditing: true })}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      No claims matches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filtered.length} of {allClaims?.length || 0} claims
          </p>
        </div>

        {/* ===== Unified Modal Context Handler (View / Edit Form) ===== */}
        {modalContext.claim && (
          <ClaimModal
            claim={modalContext.claim}
            isEditing={modalContext.isEditing}
            hourlyRate={hourlyRate}
            isSaving={updateClaimMutation.isPending}
            onClose={() => setModalContext({ claim: null, isEditing: false })}
            onSave={handleUpdateSave}
          />
        )}
      </section>
    </Layout>
  );
}

export default MyClaims;