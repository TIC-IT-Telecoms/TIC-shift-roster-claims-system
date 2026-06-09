import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Dynamic Status Badge Component =====
const StatusBadge = ({ status }) => {
  const map = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected",
  };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

// Swapped order so Approved and Rejected claims are shown first
const TABS = ["Approved", "Rejected", "Pending"];

function MyApprovals() {
  const queryClient = useQueryClient();
  
  // FIX: Default view state set to show "Approved" claims first
  const [activeTab, setActiveTab] = useState("Approved");

  // ===== Fetch All Employee Claims from Backend =====
  const { data: claimsResponse, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ adminView: true }),
    queryFn: () => claimApi.getAll(), // Hits GET /api/claims
  });

  // Extract array safely from your backend's successResponse wrapper
  const allClaims = claimsResponse?.data?.data || claimsResponse?.data || [];

  // ===== Admin Status Review Mutation (PATCH /api/claims/:id/status) =====
  const reviewMutation = useMutation({
    mutationFn: ({ claimId, status, notes }) => 
      claimApi.reviewClaimStatus(claimId, { status, notes }),
    onSuccess: (response) => {
      alert(response?.message || "Claim processed successfully.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_CLAIMS({ adminView: true }) });
    },
    onError: (error) => {
      alert(`Review Error: ${error?.response?.data?.message || error.message}`);
    }
  });

  const handleReview = (claimId, status) => {
    const adminNotes = prompt(`Optional: Enter internal admin notes or reason for this action:`);
    if (adminNotes === null) return; 

    reviewMutation.mutate({ 
      claimId, 
      status, 
      notes: adminNotes 
    });
  };

  // Dynamic tab counting calculated straight from database rows
  const counts = {
    Pending: allClaims.filter((c) => c.status === "Pending").length,
    Approved: allClaims.filter((c) => c.status === "Approved").length,
    Rejected: allClaims.filter((c) => c.status === "Rejected").length,
  };

  // Filter the view down based on active navigation tab
  const filteredClaims = allClaims.filter((c) => c.status === activeTab);

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Claims Approvals</div>

        <div className="page-title-row">
          <div>
            <h2>Claims Approvals</h2>
            <p className="subtitle">Review and action employee shift claims.</p>
          </div>
          <button className="primary-btn">Filter</button>
        </div>

        {/* ===== Dynamic Tabs ===== */}
        <div className="claims-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({counts[tab] || 0})
            </button>
          ))}
        </div>

        {/* ===== Live Data Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              Loading live claims from registry...
            </p>
          ) : isError ? (
            <p style={{ color: "#d92d20", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              Failed to download records. Please refresh your session.
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
                  <th>Status</th>
                  <th>Review Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.claim_id}>
                    <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                      #CLM{String(claim.claim_id).padStart(4, "0")}
                    </td>
                    <td>{claim.claim_date}</td>
                    <td>{claim.shift_type}</td>
                    <td>{claim.hours_worked}h</td>
                    <td>{claim.overtime_hours}h</td>
                    <td>{claim.is_holiday ? "Yes 🌟" : "No"}</td>
                    <td>
                      <StatusBadge status={claim.status} />
                    </td>
                    <td>
                      {/* Interactive review panel only shows up if the admin switches tabs back to 'Pending' */}
                      {claim.status === "Pending" ? (
                        <div className="approval-actions">
                          <button 
                            className="approve-btn" 
                            title="Approve Claim"
                            onClick={() => handleReview(claim.claim_id, "Approved")}
                            disabled={reviewMutation.isPending}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="reject-btn" 
                            title="Reject Claim"
                            onClick={() => handleReview(claim.claim_id, "Rejected")}
                            disabled={reviewMutation.isPending}
                          >
                            × Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#98a2b3" }}>Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}

                {!filteredClaims.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      No claims found inside the {activeTab.toLowerCase()} status category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filteredClaims.length} of {allClaims.length} records in this registry list
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default MyApprovals;