// src/pages/AdminClaims.jsx
import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatZAR, calcClaimEarnings } from "../utils/helpers";

// ===== Status badge =====
const StatusBadge = ({ status }) => {
  const map = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected",
  };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

// ===== Reject modal with notes =====
function RejectModal({ claim, onClose, onConfirm, isPending }) {
  const [notes, setNotes] = useState("");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: "100%", maxWidth: 420,
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        <h3 style={{ margin: "0 0 6px", color: "#b42318" }}>Reject Claim</h3>
        <p style={{ fontSize: 13, color: "#667085", marginBottom: 16 }}>
          Rejecting claim #{String(claim.claim_id).padStart(4, "0")} for{" "}
          <strong>{claim.employee?.name}</strong>. Please provide a reason.
        </p>
        <div>
          <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 6 }}>
            Rejection Reason *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Hours claimed do not match roster records..."
            rows={3}
            style={{
              width: "100%", padding: "9px 12px",
              border: "1px solid #d0d5dd", borderRadius: 8,
              fontSize: 13, outline: "none", resize: "vertical",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#b42318")}
            onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={!notes.trim() || isPending}
            style={{
              padding: "10px 18px", background: "#dc2626",
              color: "white", border: "none", borderRadius: 8,
              fontWeight: 700, cursor: "pointer", fontSize: 13,
              opacity: !notes.trim() || isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Rejecting..." : "Reject Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== View Claim Modal =====
function ViewModal({ claim, onClose, onApprove, onReject, reviewing }) {
  if (!claim) return null;
  const rate = Number(claim.employee?.hourly_rate || 0);
  const { normal, overtime, holiday, total } = calcClaimEarnings(claim, rate);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 520,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>
        {/* Header */}
        <div style={{
          background: "#006fd6", color: "white",
          padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Claim #{String(claim.claim_id).padStart(4, "0")}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.85 }}>
              {claim.employee?.name} · {claim.claim_date}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={claim.status} />
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "white", width: 28, height: 28,
              borderRadius: "50%", cursor: "pointer",
              fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* Employee info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Employee", value: claim.employee?.name },
              { label: "Team", value: claim.employee?.team?.team_name || "—" },
              { label: "Email", value: claim.employee?.email },
              { label: "Hourly Rate", value: `R${Number(claim.employee?.hourly_rate || 0).toFixed(2)}/hr` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#667085", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Claim details */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
              Claim Details
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Shift Type", value: claim.shift_type },
                { label: "Claim Date", value: claim.claim_date },
                { label: "Hours Worked", value: `${claim.hours_worked}h` },
                { label: "Overtime Hours", value: `${claim.overtime_hours}h` },
                { label: "Public Holiday", value: claim.is_holiday ? "Yes 🌟" : "No" },
                { label: "Submitted", value: claim.created_at?.slice(0, 10) || "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#667085", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
              Earnings Breakdown
            </p>
            <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden" }}>
              {[
                { label: "Normal Pay", value: formatZAR(normal) },
                { label: "Overtime Pay (×1.5)", value: formatZAR(overtime) },
                { label: "Holiday Pay", value: formatZAR(holiday) },
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
                padding: "12px 14px", background: "#eaf4ff",
                fontSize: 14, fontWeight: 800,
              }}>
                <span style={{ color: "#005bbb" }}>Total Payable</span>
                <span style={{ color: "#005bbb" }}>{formatZAR(total)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {claim.description && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Description
              </p>
              <p style={{ fontSize: 13, color: "#344054", background: "#f4f8fd", padding: "10px 14px", borderRadius: 8, margin: 0 }}>
                {claim.description}
              </p>
            </div>
          )}

          {/* Approval notes */}
          {claim.approval?.notes && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Review Notes
              </p>
              <p style={{ fontSize: 13, color: "#344054", background: "#f4f8fd", padding: "10px 14px", borderRadius: 8, margin: 0 }}>
                {claim.approval.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #e6edf5" }}>
            <button onClick={onClose} className="cancel-btn">Close</button>
            {claim.status === "Pending" && (
              <>
                <button
                  onClick={() => onReject(claim)}
                  disabled={reviewing}
                  style={{
                    padding: "10px 18px", background: "white",
                    color: "#b42318", border: "1px solid #fecaca",
                    borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13,
                  }}
                >
                  {reviewing ? "Processing..." : "✕ Reject"}
                </button>
                <button
                  onClick={() => onApprove(claim)}
                  disabled={reviewing}
                  className="primary-btn"
                >
                  {reviewing ? "Processing..." : "✓ Approve"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main Component =====
const TABS = ["Pending", "Approved", "Rejected"];

function AdminClaims() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [viewClaim, setViewClaim] = useState(null);
  const [rejectClaim, setRejectClaim] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ===== Fetch all claims (no status filter — tabs handle it client-side) =====
  const { data: allClaims, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CLAIMS({}),
    queryFn: () => claimApi.getAll({}),
    select: (d) => d.data,
  });

  // ===== Tab counts =====
  const counts = {
    Pending: allClaims?.filter((c) => c.status === "Pending").length || 0,
    Approved: allClaims?.filter((c) => c.status === "Approved").length || 0,
    Rejected: allClaims?.filter((c) => c.status === "Rejected").length || 0,
  };

  // ===== Filter by tab + search =====
  const filtered = (allClaims || [])
    .filter((c) => c.status === activeTab)
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        !q ||
        c.employee?.name?.toLowerCase().includes(q) ||
        c.claim_date?.includes(q) ||
        String(c.claim_id).includes(q)
      );
    });

  // ===== Review mutation (approve or reject) =====
  const reviewClaim = useMutation({
    mutationFn: ({ id, status, notes }) =>
      claimApi.review ? claimApi.review(id, { status, notes })
        : fetch(`/api/claims/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status, notes }),
          }).then((r) => r.json()),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      setViewClaim(null);
      setRejectClaim(null);
      showSuccess(`Claim ${variables.status.toLowerCase()} successfully.`);
    },
    onError: (err) => {
      setErrorMsg(err.message || "Action failed. Please try again.");
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const handleApprove = (claim) => {
    if (!confirm(`Approve claim #${claim.claim_id} for ${claim.employee?.name}?`)) return;
    reviewClaim.mutate({ id: claim.claim_id, status: "Approved", notes: "Claim approved." });
  };

  const handleRejectConfirm = (notes) => {
    reviewClaim.mutate({ id: rejectClaim.claim_id, status: "Rejected", notes });
  };

  // ===== Reset claim to pending =====
  const resetClaim = useMutation({
    mutationFn: (id) => claimApi.reset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      showSuccess("Claim reset to Pending.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Claims Approvals</div>

        <div className="page-title-row" style={{ marginBottom: 0 }}>
          <div>
            <h2>Claims Approvals</h2>
            <p className="subtitle">Review and action employee shift claims.</p>
          </div>
        </div>

        {/* ===== Feedback ===== */}
        {successMsg && (
          <div style={{ background: "#e8f8ef", border: "1px solid #bbf7d0", color: "#157347", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            ✓ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: "#fee4e2", border: "1px solid #fecaca", color: "#b42318", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            ✕ {errorMsg}
          </div>
        )}

        {/* ===== Tabs ===== */}
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

        {/* ===== Search ===== */}
        <div className="employee-toolbar">
          <input
            placeholder="Search by employee, date or claim ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading claims...</p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
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
                  const rate = Number(claim.employee?.hourly_rate || 0);
                  const { total } = calcClaimEarnings(claim, rate);

                  return (
                    <tr key={claim.claim_id}>
                      <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                        #CLM{String(claim.claim_id).padStart(4, "0")}
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: "#1d2939", fontSize: 13 }}>
                            {claim.employee?.name}
                          </strong>
                          <div style={{ fontSize: 11, color: "#667085" }}>
                            {claim.employee?.team?.team_name || "—"}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {claim.claim_date}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {claim.shift_type}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>
                        {claim.hours_worked}h
                      </td>
                      <td style={{
                        color: Number(claim.overtime_hours) > 0 ? "#b54708" : "#667085",
                        fontWeight: Number(claim.overtime_hours) > 0 ? 700 : 400,
                        fontSize: 13,
                      }}>
                        {claim.overtime_hours}h
                      </td>
                      <td>
                        {claim.is_holiday ? (
                          <span style={{ color: "#7a3aed", fontWeight: 700, fontSize: 12 }}>
                            🌟 Yes
                          </span>
                        ) : (
                          <span style={{ color: "#667085", fontSize: 13 }}>No</span>
                        )}
                      </td>
                      <td style={{ color: "#006fd6", fontWeight: 700, fontSize: 13 }}>
                        {formatZAR(total)}
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td>
                        <div className="approval-actions">
                          {/* View */}
                          <button
                            title="View details"
                            onClick={() => setViewClaim(claim)}
                            style={{
                              background: "#eaf4ff", color: "#006fd6",
                              border: "none", borderRadius: 6,
                              width: 28, height: 28, cursor: "pointer",
                              fontWeight: 700, fontSize: 13,
                            }}
                          >
                            👁
                          </button>

                          {/* Approve — Pending only */}
                          {claim.status === "Pending" && (
                            <button
                              className="approve-btn"
                              title="Approve"
                              onClick={() => handleApprove(claim)}
                              disabled={reviewClaim.isPending}
                            >
                              ✓
                            </button>
                          )}

                          {/* Reject — Pending only */}
                          {claim.status === "Pending" && (
                            <button
                              className="reject-btn"
                              title="Reject"
                              onClick={() => { setRejectClaim(claim); setViewClaim(null); }}
                              disabled={reviewClaim.isPending}
                            >
                              ✕
                            </button>
                          )}

                          {/* Reset — Rejected only */}
                          {claim.status === "Rejected" && (
                            <button
                              title="Reset to Pending"
                              onClick={() => resetClaim.mutate(claim.claim_id)}
                              disabled={resetClaim.isPending}
                              style={{
                                background: "#fff3e5", color: "#b54708",
                                border: "none", borderRadius: 6,
                                width: 28, height: 28, cursor: "pointer",
                                fontWeight: 700, fontSize: 13,
                              }}
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {search
                        ? "No claims match your search."
                        : `No ${activeTab.toLowerCase()} claims.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filtered.length} of {counts[activeTab]} {activeTab.toLowerCase()} claims
          </p>
        </div>

        {/* ===== View Modal ===== */}
        {viewClaim && (
          <ViewModal
            claim={viewClaim}
            onClose={() => setViewClaim(null)}
            onApprove={(c) => { setViewClaim(null); handleApprove(c); }}
            onReject={(c) => { setViewClaim(null); setRejectClaim(c); }}
            reviewing={reviewClaim.isPending}
          />
        )}

        {/* ===== Reject Modal ===== */}
        {rejectClaim && (
          <RejectModal
            claim={rejectClaim}
            onClose={() => setRejectClaim(null)}
            onConfirm={handleRejectConfirm}
            isPending={reviewClaim.isPending}
          />
        )}

      </section>
    </Layout>
  );
}

export default AdminClaims;