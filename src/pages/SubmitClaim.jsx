import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "../api/claimApi";
import { rosterApi } from "../api/rosterApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  getTodayStr,
  getMonthStart,
  formatZAR,
  calcClaimEarnings,
} from "../utils/helpers";

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

// ===== Holiday detection via API =====
const checkHolidayApi = async (dateStr) => {
  const res = await fetch(`/api/holidays/check/${dateStr}`, { credentials: "include" });
  const json = await res.json();
  return json?.data?.is_holiday ? json.data.holiday : null;
};

// ===== Get next calendar day =====
const getNextDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
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
  const [nextDayHoliday, setNextDayHoliday] = useState(null);
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

  // ===== When date changes: fetch roster + holiday (+ next day for grave) =====
  useEffect(() => {
    if (!form.claim_date) return;

    const run = async () => {
      setCheckingDate(true);
      setRosterEntry(null);
      setHolidayInfo(null);
      setNextDayHoliday(null);
      setError("");

      try {
        // 1. Roster for this date
        const rosterRes = await rosterApi.getMyRoster({
          start_date: form.claim_date,
          end_date: form.claim_date,
        });

        const raw = rosterRes?.data?.roster || [];
        const entry = Array.isArray(raw)
          ? raw[0]
          : Object.values(raw).flat()[0];

        setRosterEntry(entry || null);

        // Auto-fill shift type from roster
        if (entry?.shift?.shift_name) {
          setForm((f) => ({ ...f, shift_type: entry.shift.shift_name }));
        }

        // 2. Holiday check for the claim date
        const todayHol = await checkHolidayApi(form.claim_date);
        setHolidayInfo(todayHol);

        // 3. For grave shifts also check next day
        if (entry?.shift?.is_grave) {
          const nextDay = getNextDay(form.claim_date);
          const nextDayHol = await checkHolidayApi(nextDay);
          setNextDayHoliday(nextDayHol);
        }
      } catch (err) {
        setCheckingDate(false);
        setError("Failed to fetch roster or holiday info for this date.");
        console.error(err);
      } finally {
        setCheckingDate(false);
      }
    };

    run();
  }, [form.claim_date]);

  // ===== Submit =====
  const submitMutation = useMutation({
    mutationFn: claimApi.submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      setSuccess("Claim submitted successfully!");
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

    if (!form.shift_type) {
      setError("Please select a shift type."); return;
    }
    if (!form.hours_worked || Number(form.hours_worked) <= 0) {
      setError("Hours worked must be greater than 0."); return;
    }

    submitMutation.mutate({
      claim_date: form.claim_date,
      shift_type: form.shift_type,
      hours_worked: Number(form.hours_worked),
      overtime_hours: Number(form.overtime_hours || 0),
      description: form.description.trim() || null,
    });
  };

  // ===== Live earnings preview =====
  // Passes the shift and next-day holiday flag so calcClaimEarnings
  // can apply the grave-shift midnight split correctly
  const previewClaim = {
    hours_worked: Number(form.hours_worked || 0),
    overtime_hours: Number(form.overtime_hours || 0),
    is_holiday: !!(holidayInfo || nextDayHoliday),
  };
  const { normal, overtime, holiday, total } = calcClaimEarnings(
    previewClaim,
    hourlyRate,
    rosterEntry?.shift ?? null,      // shift detail for grave split
    !!nextDayHoliday                 // is next day a holiday?
  );

  const isOff = rosterEntry?.status === "Off";
  const rosterShift = rosterEntry?.shift?.shift_name;
  const isGrave = rosterEntry?.shift?.is_grave;

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
          <div className="claim-form-card">
            <h3>Claim Details</h3>

            {/* ===== Roster Banner ===== */}
            {checkingDate && (
              <div style={{ padding: "10px 14px", background: "#f4f8fd", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#667085" }}>
                Checking your roster for this date...
              </div>
            )}

            {!checkingDate && rosterEntry && !isOff && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: "#e8f8ef", border: "1px solid #bbf7d0",
                color: "#157347", fontSize: 13, fontWeight: 700,
              }}>
                ✓ Roster match: {rosterShift} · {rosterEntry.shift?.start_time?.slice(0, 5)} – {rosterEntry.shift?.end_time?.slice(0, 5)}
                {isGrave && " 🌙 (Overnight)"}
              </div>
            )}

            {!checkingDate && isOff && (
              <div style={{
                padding: "10px 14px", background: "#fff3e5",
                border: "1px solid #fed7aa", borderRadius: 8,
                marginBottom: 14, fontSize: 13, color: "#b54708", fontWeight: 700,
              }}>
                ⚠️ You are scheduled Off on this date. Claims cannot be submitted for Off days.
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

            {/* ===== Holiday Banners ===== */}
            {holidayInfo && (
              <div style={{
                padding: "10px 14px", background: "#f1eaff",
                border: "1px solid #d8b4fe", borderRadius: 8,
                marginBottom: 10, fontSize: 13, color: "#7a3aed", fontWeight: 700,
              }}>
                🌟 Public Holiday: {holidayInfo.holiday_name}
                {isGrave && " — Holiday pay applies to 22:00–00:00 portion."}
              </div>
            )}

            {nextDayHoliday && isGrave && (
              <div style={{
                padding: "10px 14px", background: "#f1eaff",
                border: "1px solid #d8b4fe", borderRadius: 8,
                marginBottom: 14, fontSize: 13, color: "#7a3aed", fontWeight: 700,
              }}>
                🌟 Tomorrow is a public holiday: {nextDayHoliday.holiday_name}
                {" "}— Holiday pay applies to 00:00–06:00 portion of your grave shift.
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
                      ⚠ Mismatch: your roster shows "{rosterShift}"
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

              {/* Public holiday — read-only, auto-detected */}
              <div className="form-group">
                <label>Public Holiday</label>
                <div style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 13,
                  background: (holidayInfo || nextDayHoliday) ? "#f1eaff" : "#f4f8fd",
                  border: `1px solid ${(holidayInfo || nextDayHoliday) ? "#d8b4fe" : "#e6edf5"}`,
                  color: (holidayInfo || nextDayHoliday) ? "#7a3aed" : "#667085",
                  fontWeight: (holidayInfo || nextDayHoliday) ? 700 : 400,
                }}>
                  {checkingDate ? "Checking..." : (
                    holidayInfo && nextDayHoliday ? `🌟 Both today (${holidayInfo.holiday_name}) and tomorrow (${nextDayHoliday.holiday_name}) are public holidays` :
                      holidayInfo ? `🌟 Yes — ${holidayInfo.holiday_name}` :
                        nextDayHoliday ? `🌟 Next day is a holiday — ${nextDayHoliday.holiday_name}` :
                          "No — auto-detected from system"
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Description / Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional — e.g. Network incident, extra hours worked..."
                  style={{
                    width: "100%", padding: 11, border: "1px solid #d0d5dd",
                    borderRadius: 8, fontSize: 13, outline: "none",
                    minHeight: 90, resize: "vertical",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* ===== Earnings Preview ===== */}
              {hourlyRate > 0 && Number(form.hours_worked) > 0 && (
                <div style={{
                  border: "1px solid #e6edf5", borderRadius: 10,
                  overflow: "hidden", marginBottom: 4,
                }}>
                  <div style={{
                    background: "#f4f8fd", padding: "10px 14px",
                    fontSize: 12, fontWeight: 700, color: "#667085",
                    textTransform: "uppercase",
                  }}>
                    Estimated Earnings Preview
                    {isGrave && (holidayInfo || nextDayHoliday) && (
                      <span style={{ marginLeft: 8, color: "#7a3aed", textTransform: "none", fontSize: 11 }}>
                        (midnight split applied)
                      </span>
                    )}
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
                  disabled={submitMutation.isPending || isOff}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>

          {/* ===== Recent Claims Panel ===== */}
          <div className="recent-claims-card">
            <h3>My Recent Claims</h3>

            {!recentClaims?.length ? (
              <p style={{ color: "#667085", fontSize: 13 }}>No recent claims this month.</p>
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
              View All Claims
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default SubmitClaim;