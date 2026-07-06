import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatDate, formatZAR, calcClaimEarnings } from "../utils/helpers";

// ===== Helpers ====
const StatusBadge = ({ status }) => {
  const map = { Pending: "status-pending", Approved: "status-approved", Rejected: "status-rejected" };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

const DetailCell = ({ label, value }) => (
  <div className="bg-[#f4f8fd] rounded-lg px-3 py-2.5">
    <div className="text-[10px] text-[#667085] mb-1">{label}</div>
    <div className="text-sm font-bold text-[#1d2939]">{value}</div>
  </div>
);

// ===== Claim Modal =====
function ClaimModal({ claim, onClose, hourlyRate }) {
  if (!claim) return null;
  const { normal, overtime, holiday, total } = calcClaimEarnings(claim, hourlyRate, claim.shift ?? null);
  const isRejected = claim.status === "Rejected";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-1000 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="bg-[#006fd6] text-white px-5 py-4 flex justify-between items-center rounded-t-2xl sm:rounded-t-2xl">
          <div>
            <h3 className="m-0 text-base font-bold">
              Claim #CLM{String(claim.claim_id).padStart(4, "0")}
            </h3>
            <p className="m-0 text-xs opacity-80 mt-0.5">{claim.claim_date}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={claim.status} />
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/20 border-none text-white cursor-pointer flex items-center justify-center text-base"
            >✕</button>
          </div>
        </div>

        <div className="p-5">
          {/* Shift details grid */}
          <p className="text-[10px] font-bold text-[#667085] uppercase mb-2">Shift Details</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <DetailCell label="Shift Type"     value={claim.shift_type} />
            <DetailCell label="Claim Date"     value={claim.claim_date} />
            <DetailCell label="Hours Worked"   value={`${claim.hours_worked}h`} />
            <DetailCell label="Overtime"       value={`${claim.overtime_hours}h`} />
            <DetailCell label="Public Holiday" value={claim.is_holiday ? "Yes 🌟" : "No"} />
            <DetailCell label="Submitted"      value={formatDate(claim.created_at)} />
          </div>

          {/* Earnings breakdown */}
          <p className="text-[10px] font-bold text-[#667085] uppercase mb-2">Earnings Breakdown</p>
          <div className="border border-[#e6edf5] rounded-lg overflow-hidden mb-4">
            {[
              { label: "Normal Pay",          value: formatZAR(normal) },
              { label: "Overtime Pay (×1.5)", value: formatZAR(overtime) },
              { label: "Holiday Pay",         value: formatZAR(holiday) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between px-4 py-2.5 border-b border-[#edf2f7] text-sm">
                <span className="text-[#667085]">{label}</span>
                <span className="font-bold text-[#344054]">{value}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-[#eaf4ff] text-[15px] font-extrabold">
              <span className="text-[#005bbb]">Total</span>
              <span className="text-[#005bbb]">{formatZAR(total)}</span>
            </div>
          </div>

          {/* Description */}
          {claim.description && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-[#667085] uppercase mb-1">Description</p>
              <p className="text-sm text-[#344054] bg-[#f4f8fd] px-4 py-2.5 rounded-lg m-0">{claim.description}</p>
            </div>
          )}

          {/* Admin notes */}
          {claim.approval?.notes && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-[#667085] uppercase mb-1">Admin Notes</p>
              <p className={`text-sm text-[#344054] px-4 py-2.5 rounded-lg m-0 border ${
                isRejected ? "bg-[#fff8f8] border-[#fecaca]" : "bg-[#f4f8fd] border-[#e6edf5]"
              }`}>{claim.approval.notes}</p>
            </div>
          )}

          {/* Rejected info */}
          {isRejected && (
            <div className="bg-[#fff3e5] border border-[#fed7aa] rounded-lg px-4 py-2.5 text-sm text-[#b54708] mb-4">
              ℹ️ Claim was rejected. An admin can reset it so you may edit and resubmit.
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={onClose} className="cancel-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main =====
const TABS = ["All", "Pending", "Approved", "Rejected"];

function MyClaims() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [viewClaim, setViewClaim] = useState(null);

  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn:  profileApi.getProfile,
    select:   (d) => d.data,
  });
  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);

  const { data: allClaims, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({}),
    queryFn:  () => claimApi.getMyClaims({}),
    select:   (d) => d.data,
  });

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
      <section className="p-4 md:p-5">
        <p className="text-xs text-[#667085] mb-3">Dashboard &gt; My Claims</p>

        {/* Title row */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div>
            <h2 className="m-0 text-xl font-bold text-[#1d2939]">My Claims</h2>
            <p className="text-sm text-[#667085] mt-1 m-0">Submit and track your shift claims.</p>
          </div>
          <button
            className="primary-btn shrink-0 text-sm"
            onClick={() => navigate("/submit-claim")}
          >
            + Submit
          </button>
        </div>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 mb-4">
          <div className="flex gap-0 border-b border-[#e6edf5] min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-bold bg-transparent border-none cursor-pointer whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "text-[#006fd6] border-b-2 border-[#006fd6]"
                    : "text-[#667085]"
                }`}
              >
                {tab} ({counts[tab]})
              </button>
            ))}
          </div>
        </div>

        {/* ===== Mobile: card list | Desktop: table ===== */}
        <div className="bg-white border border-[#e6edf5] rounded-xl p-4">
          {isLoading ? (
            <p className="text-sm text-[#667085] py-4">Loading claims...</p>
          ) : isError ? (
            <p className="text-sm text-[#b42318] py-4">Failed to load claims. Please try again.</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-[#667085]">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-bold m-0">
                {activeTab === "All" ? "No claims submitted yet." : `No ${activeTab.toLowerCase()} claims.`}
              </p>
            </div>
          ) : (
            <>
              {/* ── Mobile card view (hidden on md+) ── */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((claim) => {
                  const { total } = calcClaimEarnings(claim, hourlyRate, claim.shift ?? null);
                  return (
                    <div
                      key={claim.claim_id}
                      className="border border-[#e6edf5] rounded-xl p-4 cursor-pointer active:bg-[#f4f8fd]"
                      onClick={() => setViewClaim(claim)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono text-xs text-[#667085]">
                            #CLM{String(claim.claim_id).padStart(4, "0")}
                          </span>
                          <p className="text-sm font-bold text-[#1d2939] m-0 mt-0.5">{claim.claim_date}</p>
                          <p className="text-xs text-[#667085] m-0">{claim.shift_type}</p>
                        </div>
                        <StatusBadge status={claim.status} />
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#edf2f7]">
                        <div className="flex gap-3 text-xs text-[#667085]">
                          <span>{claim.hours_worked}h</span>
                          {Number(claim.overtime_hours) > 0 && (
                            <span className="text-[#b54708] font-bold">+{claim.overtime_hours}h OT</span>
                          )}
                          {claim.is_holiday && <span className="text-[#7a3aed] font-bold">🌟 Holiday</span>}
                        </div>
                        <span className="text-sm font-bold text-[#006fd6]">{formatZAR(total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop table (hidden on mobile) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Hours</th>
                      <th>OT</th>
                      <th>Holiday</th>
                      <th>Est. Pay</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((claim) => {
                      const { total } = calcClaimEarnings(claim, hourlyRate, claim.shift ?? null);
                      const hasOT = Number(claim.overtime_hours) > 0;
                      return (
                        <tr key={claim.claim_id}>
                          <td className="font-mono text-xs text-[#667085]">
                            #CLM{String(claim.claim_id).padStart(4, "0")}
                          </td>
                          <td className="text-sm text-[#344054]">{claim.claim_date}</td>
                          <td className="text-sm text-[#344054]">{claim.shift_type}</td>
                          <td className="text-sm text-[#344054]">{claim.hours_worked}h</td>
                          <td className={`text-sm ${hasOT ? "text-[#b54708] font-bold" : "text-[#667085]"}`}>
                            {claim.overtime_hours}h
                          </td>
                          <td>
                            {claim.is_holiday
                              ? <span className="text-[#7a3aed] font-bold text-xs">🌟 Yes</span>
                              : <span className="text-sm text-[#667085]">No</span>}
                          </td>
                          <td className="text-sm font-bold text-[#006fd6]">{formatZAR(total)}</td>
                          <td><StatusBadge status={claim.status} /></td>
                          <td>
                            <button className="view-link" onClick={() => setViewClaim(claim)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="roster-note mt-3">
            Showing {filtered.length} of {allClaims?.length || 0} claims
          </p>
        </div>

        {viewClaim && (
          <ClaimModal claim={viewClaim} hourlyRate={hourlyRate} onClose={() => setViewClaim(null)} />
        )}
      </section>
    </Layout>
  );
}

export default MyClaims;