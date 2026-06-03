// src/pages/SubmitClaim.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { rosterApi } from "../api/rosterApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { getTodayStr, getMonthStart, formatZAR, calcClaimEarnings } from "../utils/helpers";

const todayStr = getTodayStr();
const monthStart = getMonthStart();

const SHIFT_TYPES = ["Early Shift", "Night Shift", "Grave Shift"];

// ===== Status Badge =====
const StatusBadge = ({ status }) => {
  const map = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected",
  };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

function SubmitClaim() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    claim_date: todayStr,
    shift_type: "",
    hours_worked: 8,
    overtime_hours: 0,
    description: "",
  });

  const [rosterEntry, setRosterEntry] = useState(null);
  const [holidayInfo, setHolidayInfo] = useState(null);
  const [checkingDate, setCheckingDate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ===== Fetch profile for hourly rate =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);

  // ===== Fetch recent claims =====
  const { data: recentClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ start_date: monthStart, end_date: todayStr }),
    queryFn: () => claimApi.getMyClaims({ start_date: monthStart, end_date: todayStr }),
    select: (d) => d.data?.slice(0, 5),
  });

  // ===== When date changes: fetch roster entry + check holiday =====
  useEffect(() => {
    if (!form.claim_date) return;

    const fetchDateInfo = async () => {
      setCheckingDate(true);
      setRosterEntry(null);
      setHolidayInfo(null);
      setError("");

      try {
        // Fetch roster for that date
        const rosterRes = await rosterApi.getMyRoster({
          start_date: form.claim_date,
          end_date: form.claim_date,
        });

        const entries = rosterRes?.data?.roster || [];
        const entry = Array.isArray(entries)
          ? entries[0]
          : Object.values(entries).flat()[0];

        setRosterEntry(entry || null);

        // Auto-fill shift type from roster
        if (entry?.shift?.shift_name) {
          setForm((f) => ({ ...f, shift_type: entry.shift.shift_name }));
        }

        // Check holiday
        const holidayRes = await fetch(
          `/api/holidays/check/${form.claim_date}`,
          { credentials: "include" }
        );
        const holidayData = await holidayRes.json();
        if (holidayData?.data?.is_holiday) {
          setHolidayInfo(holidayData.data.holiday);
        }
      } catch (err) {
        // Silent fail — user can still fill manually
      } finally {
        setCheckingDate(false);
      }
    };

    fetchDateInfo();
  }, [form.claim_date]);

  // ===== Submit =====
  const submitClaim = useMutation({
    mutationFn: claimApi.submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      setSuccess("Claim submitted successfully! Redirecting...");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => navigate("/claims"), 1500);
    },
    onError: (err) => {
      setError(err.message || "Failed to submit claim.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!form.shift_type) { setError("Please select a shift type."); return; }
    if (!form.hours_worked || Number(form.hours_worked) <= 0) {
      setError("Hours worked must be greater than 0."); return;
    }

    submitClaim.mutate({
      claim_date: form.claim_date,
      shift_type: form.shift_type,
      hours_worked: Number(form.hours_worked),
      overtime_hours: Number(form.overtime_hours || 0),
      description: form.description.trim() || null,
    });
  };

  // ===== Live earnings preview =====
  const previewClaim = {
    hours_worked: Number(form.hours_worked || 0),
    overtime_hours: Number(form.overtime_hours || 0),
    is_holiday: !!holidayInfo,
  };
  const { normal, overtime, holiday, total } = calcClaimEarnings(previewClaim, hourlyRate);

  // ===== Roster status helpers =====
  const isOff = rosterEntry?.status === "Off";
  const isScheduled = rosterEntry?.status === "Scheduled" || rosterEntry?.status === "Holiday";
  const rosterShift = rosterEntry?.shift?.shift_name;

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">
          <a href="/claims" style={{ color: "#006fd6" }}>My Claims</a> &gt; Submit New Claim
        </div>

        {/* ===== Feedback ===== */}
        {error && (
          <div style={{
            background: "#fee4e2", border: "1px solid #fecaca",
            color: "#b42318", padding: "10px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            ✕ {error}
          </div>
        )}
        {success && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "10px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            ✓ {success}
          </div>
        )}

        <div className="submit-claim-grid">

          {/* ===== Claim Form ===== */}
          <div className="claim-form-card">
            <h3>Claim Details</h3>

            {/* Roster status banner */}
            {checkingDate && (
              <div style={{ padding: "10px 14px", background: "#f4f8fd", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#667085" }}>
                Checking your roster for this date...
              </div>
            )}

            {!checkingDate && rosterEntry && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                fontSize: 13, fontWeight: 700,
                background: isOff ? "#fff3e5" : "#e8f8ef",
                border: `1px solid ${isOff ? "#fed7aa" : "#bbf7d0"}`,
                color: isOff ? "#b54708" : "#157347",
              }}>
                {isOff
                  ? "⚠️ You are scheduled Off on this date. Claims cannot be submitted for Off days."
                  : `✓ Roster match: ${rosterShift} · ${rosterEntry.shift?.start_time?.slice(0, 5)} – ${rosterEntry.shift?.end_time?.slice(0, 5)}`}
              </div>
            )}

            {!checkingDate && form.claim_date && !rosterEntry && (
              <div style={{
                padding: "10px 14px", background: "#fff3e5",
                border: "1px solid #fed7aa", borderRadius: 8,
                marginBottom: 14, fontSize: 13, color: "#b54708",
              }}>
                ⚠️ No roster found for this date. Ensure a roster has been generated.
              </div>
            )}

            {holidayInfo && (
              <div style={{
                padding: "10px 14px", background: "#f1eaff",
                border: "1px solid #d8b4fe", borderRadius: 8,
                marginBottom: 14, fontSize: 13, color: "#7a3aed", fontWeight: 700,
              }}>
                🌟 Public Holiday: {holidayInfo.holiday_name} — Holiday pay will be applied automatically.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="claim-form-row">
                <div className="form-group">
                  <label>Claim Date</label>
                  <input
                    type="date"
                    max={todayStr}
                    value={form.claim_date}
                    onChange={(e) => setForm({ ...form, claim_date: e.target.value })}
                    style={{ width: "100%", padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}
                  />
                </div>

                <div className="form-group">
                  <label>Shift Type</label>
                  <select
                    value={form.shift_type}
                    onChange={(e) => setForm({ ...form, shift_type: e.target.value })}
                    style={{ width: "100%", padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}
                  >
                    <option value="">Select shift type</option>
                    {SHIFT_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {rosterShift && form.shift_type && rosterShift !== form.shift_type && (
                    <p style={{ fontSize: 11, color: "#b42318", marginTop: 4 }}>
                      ⚠ Mismatch: your roster shows {rosterShift}
                    </p>
                  )}
                </div>
              </div>

              <div className="claim-form-row">
                <div className="form-group">
                  <label>Hours Worked</label>
                  <input
                    type="number" min="0.5" max="24" step="0.5"
                    value={form.hours_worked}
                    onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
                    style={{ width: "100%", padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}
                  />
                </div>

                <div className="form-group">
                  <label>Overtime Hours</label>
                  <input
                    type="number" min="0" max="12" step="0.5"
                    value={form.overtime_hours}
                    onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })}
                    style={{ width: "100%", padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>

              {/* Public Holiday — auto-detected, read only display */}
              <div className="form-group">
                <label>Public Holiday</label>
                <div style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 13,
                  background: holidayInfo ? "#f1eaff" : "#f4f8fd",
                  border: `1px solid ${holidayInfo ? "#d8b4fe" : "#e6edf5"}`,
                  color: holidayInfo ? "#7a3aed" : "#667085",
                  fontWeight: holidayInfo ? 700 : 400,
                }}>
                  {checkingDate
                    ? "Checking..."
                    : holidayInfo
                      ? `🌟 Yes — ${holidayInfo.holiday_name}`
                      : "No — auto-detected from system"}
                </div>
              </div>

              <div className="form-group">
                <label>Description / Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional — e.g. Network incident, extra hours worked..."
                  style={{ width: "100%", padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 13, outline: "none", minHeight: 90, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>

              {/* ===== Earnings Preview ===== */}
              {hourlyRate > 0 && Number(form.hours_worked) > 0 && (
                <div style={{
                  border: "1px solid #e6edf5", borderRadius: 10,
                  overflow: "hidden", marginBottom: 4,
                }}>
                  <div style={{ background: "#f4f8fd", padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#667085", textTransform: "uppercase" }}>
                    Estimated Earnings Preview
                  </div>
                  {[
                    { label: "Normal Pay", value: formatZAR(normal) },
                    { label: "Overtime Pay (×1.5)", value: formatZAR(overtime) },
                    { label: "Holiday Pay", value: formatZAR(holiday) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "9px 14px", borderTop: "1px solid #edf2f7", fontSize: 13,
                    }}>
                      <span style={{ color: "#667085" }}>{label}</span>
                      <span style={{ color: "#344054", fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "11px 14px", background: "#eaf4ff",
                    fontWeight: 800, fontSize: 14,
                  }}>
                    <span style={{ color: "#005bbb" }}>Total</span>
                    <span style={{ color: "#005bbb" }}>{formatZAR(total)}</span>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate("/claims")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitClaim.isPending || isOff}
                >
                  {submitClaim.isPending ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>

          {/* ===== Recent Claims Panel ===== */}
          <div className="recent-claims-card">
            <h3>My Recent Claims</h3>

            {!recentClaims?.length ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No recent claims.</p>
            ) : (
              recentClaims.map((claim) => (
                <div key={claim.claim_id} className="recent-claim-item">
                  <div>
                    <strong>{claim.claim_date}</strong>
                    <span>{claim.shift_type}</span>
                  </div>
                  <div>
                    <StatusBadge status={claim.status} />
                    <small>
                      {claim.hours_worked}h
                      {Number(claim.overtime_hours) > 0 && ` · ${claim.overtime_hours}h OT`}
                      {claim.is_holiday && " · 🌟"}
                    </small>
                  </div>
                </div>
              ))
            )}

            <a
              className="view-all-link"
              onClick={() => navigate("/claims")}
              style={{ cursor: "pointer" }}
            >
              View All
            </a>
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default SubmitClaim;