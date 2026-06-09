// src/pages/MyClaims.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatDate, formatZAR, calcClaimEarnings } from "../utils/helpers";

// ===== Status badge =====
const StatusBadge = ({ status }) => {
  const map = {
    Pending:  "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected",
  };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

// ===== Detail grid cell =====
const DetailCell = ({ label, value }) => (
  <div style={{ background: "#f4f8fd", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ fontSize: 11, color: "#667085", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939" }}>{value}</div>
  </div>
);

// ===== View Claim Modal =====
function ClaimModal({ claim, onClose, hourlyRate }) {
  if (!claim) return null;

  // Pass shift if available for accurate grave-shift holiday split
  const { normal, overtime, holiday, total } = calcClaimEarnings(
    claim,
    hourlyRate,
    claim.shift ?? null
  );

  const isRejected = claim.status === "Rejected";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 480,
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "#006fd6", color: "white",
          padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Claim #CLM{String(claim.claim_id).padStart(4, "0")}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.85 }}>
              {claim.claim_date}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusBadge status={claim.status} />
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "white", width: 28, height: 28, borderRadius: "50%",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>

          {/* Shift Details */}
          <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            Shift Details
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <DetailCell label="Shift Type"     value={claim.shift_type} />
            <DetailCell label="Claim Date"     value={claim.claim_date} />
            <DetailCell label="Hours Worked"   value={`${claim.hours_worked}h`} />
            <DetailCell label="Overtime Hours" value={`${claim.overtime_hours}h`} />
            <DetailCell label="Public Holiday" value={claim.is_holiday ? "Yes 🌟" : "No"} />
            <DetailCell label="Submitted"      value={formatDate(claim.created_at)} />
          </div>

          {/* Earnings Breakdown */}
          <p style={{ fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            Earnings Breakdown
          </p>
          <div style={{ border: "1px solid #e6edf5", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            {[
              { label: "Normal Pay",          value: formatZAR(normal) },
              { label: "Overtime Pay (×1.5)", value: formatZAR(overtime) },
              { label: "Holiday Pay",         value: formatZAR(holiday) },
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
              <span style={{ color: "#005bbb" }}>Total</span>
              <span style={{ color: "#005bbb" }}>{formatZAR(total)}</span>
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
                Admin Notes
              </p>
              <p style={{
                fontSize: 13, color: "#344054", padding: "10px 14px",
                borderRadius: 8, margin: 0,
                background: isRejected ? "#fff8f8" : "#f4f8fd",
                border: `1px solid ${isRejected ? "#fecaca" : "#e6edf5"}`,
              }}>
                {claim.approval.notes}
              </p>
            </div>
          )}

          {/* Rejected banner */}
          {isRejected && (
            <div style={{
              background: "#fff3e5", border: "1px solid #fed7aa",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#b54708", marginBottom: 16,
            }}>
              ℹ️ This claim was rejected. An admin can reset it so you may edit and resubmit.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="cancel-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main Component =====
const TABS = ["All", "Pending", "Approved", "Rejected"];

function MyClaims() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [viewClaim, setViewClaim] = useState(null);

  // ===== Fetch profile for hourly rate =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn:  profileApi.getProfile,
    select:   (d) => d.data,
  });

  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);

  // ===== Fetch all own claims =====
  const { data: allClaims, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({}),
    queryFn:  () => claimApi.getMyClaims({}),
    select:   (d) => d.data,
  });

  // ===== Tab counts =====
  const counts = {
    All:      allClaims?.length || 0,
    Pending:  allClaims?.filter((c) => c.status === "Pending").length  || 0,
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
          <button className="primary-btn" onClick={() => navigate("/submit-claim")}>
            + Submit Claim
          </button>
        </div>

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

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>Loading claims...</p>
          ) : isError ? (
            <p style={{ color: "#b42318", fontSize: 13, padding: "20px 0" }}>Failed to load claims. Please try again.</p>
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
                  const { total } = calcClaimEarnings(claim, hourlyRate, claim.shift ?? null);
                  const hasOT     = Number(claim.overtime_hours) > 0;

                  return (
                    <tr key={claim.claim_id}>
                      <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                        #CLM{String(claim.claim_id).padStart(4, "0")}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.claim_date}</td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.shift_type}</td>
                      <td style={{ color: "#344054", fontSize: 13 }}>{claim.hours_worked}h</td>
                      <td style={{ color: hasOT ? "#b54708" : "#667085", fontSize: 13, fontWeight: hasOT ? 700 : 400 }}>
                        {claim.overtime_hours}h
                      </td>
                      <td>
                        {claim.is_holiday
                          ? <span style={{ color: "#7a3aed", fontWeight: 700, fontSize: 12 }}>🌟 Yes</span>
                          : <span style={{ color: "#667085", fontSize: 13 }}>No</span>}
                      </td>
                      <td style={{ color: "#006fd6", fontSize: 13, fontWeight: 700 }}>
                        {formatZAR(total)}
                      </td>
                      <td><StatusBadge status={claim.status} /></td>
                      <td>
                        <button className="view-link" onClick={() => setViewClaim(claim)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {activeTab === "All" ? "No claims submitted yet." : `No ${activeTab.toLowerCase()} claims.`}
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

        {viewClaim && (
          <ClaimModal
            claim={viewClaim}
            hourlyRate={hourlyRate}
            onClose={() => setViewClaim(null)}
          />
        )}
      </section>
    </Layout>
  );
}

export default MyClaims;