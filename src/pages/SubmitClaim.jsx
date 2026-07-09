import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi }   from "../api/claimApi";
import { rosterApi }  from "../api/rosterApi";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  getTodayStr, getMonthStart, formatZAR, calcClaimEarnings,
} from "../utils/helpers";

const todayStr   = getTodayStr();
const monthStart = getMonthStart();
const SHIFT_TYPES = ["Early Shift", "Night Shift", "Grave Shift"];

// ===== Helpers =====
const StatusBadge = ({ status }) => {
  const map = { Pending: "status-pending", Approved: "status-approved", Rejected: "status-rejected" };
  return <span className={map[status] || "status-pending"}>{status}</span>;
};

const checkHolidayApi = async (dateStr) => {
  try {
    const res = await fetch(`/api/holidays/check/${dateStr}`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.is_holiday ? json.data.holiday : null;
  } catch { return null; }
};

const getNextDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const getYesterday = () => {
  const d = new Date(getTodayStr());
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const toMinutes = (t) => { const [h, m] = (t || "00:00").split(":").map(Number); return h * 60 + m; };

const checkShiftAvailability = (shift, claimDate) => {
  if (!shift || !claimDate) return { blocked: false };
  const todayD = getTodayStr();
  const yesterD = getYesterday();
  if (claimDate < yesterD) return { blocked: false };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (shift.is_grave) {
    const startMin = toMinutes(shift.start_time || "22:00");
    const endMin   = toMinutes(shift.end_time   || "06:00");
    if (claimDate === todayD) {
      if (nowMin < startMin) return { blocked: true, reason: "not_started", startsAt: `${shift.start_time?.slice(0,5)} today` };
      return { blocked: true, reason: "in_progress", endsAt: `${shift.end_time?.slice(0,5)} tomorrow` };
    }
    if (claimDate === yesterD) {
      if (nowMin < endMin) return { blocked: true, reason: "in_progress", endsAt: `${shift.end_time?.slice(0,5)} today` };
      return { blocked: false };
    }
    return { blocked: false };
  }
  if (claimDate !== todayD) return { blocked: false };
  const startMin = toMinutes(shift.start_time || "00:00");
  const endMin   = toMinutes(shift.end_time   || "00:00");
  if (nowMin < startMin) return { blocked: true, reason: "not_started", startsAt: `${shift.start_time?.slice(0,5)} today` };
  if (nowMin < endMin)   return { blocked: true, reason: "in_progress", endsAt:   `${shift.end_time?.slice(0,5)} today` };
  return { blocked: false };
};

// ===== Input style =====
const inp = "w-full px-3 py-2.5 border border-[#d0d5dd] rounded-lg text-sm outline-none focus:border-[#006fd6] box-border font-[inherit]";

function SubmitClaim() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [form, setForm] = useState({
    claim_date: todayStr, shift_type: "", hours_worked: 8, overtime_hours: 0, description: "",
  });
  const [rosterEntry,    setRosterEntry]    = useState(null);
  const [holidayInfo,    setHolidayInfo]    = useState(null);
  const [nextDayHoliday, setNextDayHoliday] = useState(null);
  const [checkingDate,   setCheckingDate]   = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");

  const { data: profile } = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: profileApi.getProfile, select: (d) => d.data });
  const hourlyRate = Number(profile?.employee?.hourly_rate || 0);

  const { data: recentClaims } = useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS({ start_date: monthStart, end_date: todayStr }),
    queryFn:  () => claimApi.getMyClaims({ start_date: monthStart, end_date: todayStr }),
    select:   (d) => d.data?.slice(0, 4),
  });

  useEffect(() => {
    if (!form.claim_date) return;
    const run = async () => {
      setCheckingDate(true);
      setRosterEntry(null); setHolidayInfo(null); setNextDayHoliday(null);
      let entry = null;
      try {
        const res = await rosterApi.getMyRoster({ start_date: form.claim_date, end_date: form.claim_date });
        const raw = res?.data?.roster || [];
        entry = Array.isArray(raw) ? raw[0] ?? null : Object.values(raw).flat()[0] ?? null;
        setRosterEntry(entry);
        if (entry?.shift?.shift_name && SHIFT_TYPES.includes(entry.shift.shift_name))
          setForm((f) => ({ ...f, shift_type: entry.shift.shift_name }));
      } catch { setRosterEntry(null); }
      setHolidayInfo(await checkHolidayApi(form.claim_date));
      if (entry?.shift?.is_grave) setNextDayHoliday(await checkHolidayApi(getNextDay(form.claim_date)));
      setCheckingDate(false);
    };
    run();
  }, [form.claim_date]);

  const submitMutation = useMutation({
    mutationFn: claimApi.submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      setSuccess("Claim submitted successfully!");
      setTimeout(() => navigate("/claims"), 1500);
    },
    onError: (err) => { setError(err.message || "Failed to submit claim."); },
  });

  const isOff       = rosterEntry?.status === "Off";
  const rosterShift = rosterEntry?.shift?.shift_name;
  const isGrave     = rosterEntry?.shift?.is_grave;
  const shiftStatus = checkShiftAvailability(rosterEntry?.shift ?? null, form.claim_date);
  const submitBlocked = submitMutation.isPending || isOff || shiftStatus.blocked;

  const previewClaim = {
    hours_worked: Number(form.hours_worked || 0),
    overtime_hours: Number(form.overtime_hours || 0),
    is_holiday: !!(holidayInfo || nextDayHoliday),
  };
  const { normal, overtime, holiday, total } = calcClaimEarnings(previewClaim, hourlyRate, rosterEntry?.shift ?? null, !!nextDayHoliday);

  const submitLabel = submitMutation.isPending ? "Submitting..."
    : shiftStatus.reason === "not_started" ? `Opens at ${shiftStatus.startsAt}`
    : shiftStatus.reason === "in_progress" ? `Available after ${shiftStatus.endsAt}`
    : "Submit Claim";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.shift_type) { setError("Please select a shift type."); return; }
    if (!form.hours_worked || Number(form.hours_worked) <= 0) { setError("Hours worked must be greater than 0."); return; }
    if (shiftStatus.blocked) {
      setError(shiftStatus.reason === "not_started"
        ? `Your shift hasn't started yet. It starts at ${shiftStatus.startsAt}.`
        : `Shift still in progress. Submit after ${shiftStatus.endsAt}.`);
      return;
    }
    submitMutation.mutate({
      claim_date: form.claim_date, shift_type: form.shift_type,
      hours_worked: Number(form.hours_worked), overtime_hours: Number(form.overtime_hours || 0),
      description: form.description.trim() || null,
    });
  };

  return (
    <Layout>
      <section className="p-4 md:p-5">
        <div className="text-xs text-[#667085] mb-3">
          <span className="text-[#006fd6] cursor-pointer" onClick={() => navigate("/claims")}>My Claims</span>
          {" "}&gt; Submit New Claim
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 bg-[#fee4e2] border border-[#fecaca] text-[#b42318] px-4 py-3 rounded-lg mb-4 text-sm">
            ✕ {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-[#e8f8ef] border border-[#bbf7d0] text-[#157347] px-4 py-3 rounded-lg mb-4 text-sm">
            ✓ {success}
          </div>
        )}

        {/* ===== Layout: stacked on mobile, side-by-side on lg ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

          {/* ===== Form card ===== */}
          <div className="bg-white border border-[#e6edf5] rounded-xl p-4 md:p-5">
            <h3 className="m-0 mb-4 text-base font-bold text-[#1d2939]">Claim Details</h3>

            {/* Status Banners */}
            {checkingDate && (
              <div className="bg-[#f4f8fd] rounded-lg px-4 py-3 text-sm text-[#667085] mb-3">
                Checking your roster...
              </div>
            )}
            {!checkingDate && rosterEntry && !isOff && !shiftStatus.blocked && (
              <div className="bg-[#e8f8ef] border border-[#bbf7d0] rounded-lg px-4 py-3 text-sm font-bold text-[#157347] mb-3">
                ✓ {rosterShift} · {rosterEntry.shift?.start_time?.slice(0,5)} – {rosterEntry.shift?.end_time?.slice(0,5)}
                {isGrave && " 🌙"}
              </div>
            )}
            {!checkingDate && isOff && (
              <div className="bg-[#fff3e5] border border-[#fed7aa] rounded-lg px-4 py-3 text-sm font-bold text-[#b54708] mb-3">
                ⚠️ You are scheduled Off on this date.
              </div>
            )}
            {!checkingDate && form.claim_date && !rosterEntry && (
              <div className="bg-[#fff3e5] border border-[#fed7aa] rounded-lg px-4 py-3 text-sm text-[#b54708] mb-3">
                ⚠️ No roster found for this date.
              </div>
            )}

            {/* Shift timing banner */}
            {!checkingDate && rosterEntry && !isOff && shiftStatus.blocked && (
              <div className={`rounded-lg px-4 py-3 mb-3 flex gap-3 items-start text-sm border ${
                shiftStatus.reason === "not_started"
                  ? "bg-[#fffbeb] border-[#fde68a]"
                  : "bg-[#f0f9ff] border-[#bae6fd]"
              }`}>
                <span className="text-lg shrink-0">
                  {shiftStatus.reason === "not_started" ? "🕐" : "⏳"}
                </span>
                <div>
                  <strong style={{ color: shiftStatus.reason === "not_started" ? "#92400e" : "#0369a1" }}>
                    {shiftStatus.reason === "not_started" ? "Shift hasn't started yet" : "Shift still in progress"}
                  </strong>
                  <p className="m-0 mt-1 text-xs leading-relaxed" style={{ color: shiftStatus.reason === "not_started" ? "#92400e" : "#0369a1" }}>
                    {shiftStatus.reason === "not_started"
                      ? `Your ${rosterShift} starts at ${shiftStatus.startsAt}.`
                      : `Your ${rosterShift} ends at ${shiftStatus.endsAt}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Holiday banners */}
            {holidayInfo && (
              <div className="bg-[#f1eaff] border border-[#d8b4fe] rounded-lg px-4 py-3 text-sm font-bold text-[#7a3aed] mb-2">
                🌟 {holidayInfo.holiday_name}{isGrave ? " — Holiday pay: 22:00–00:00" : ""}
              </div>
            )}
            {nextDayHoliday && isGrave && (
              <div className="bg-[#f1eaff] border border-[#d8b4fe] rounded-lg px-4 py-3 text-sm font-bold text-[#7a3aed] mb-3">
                🌟 Tomorrow: {nextDayHoliday.holiday_name} — Holiday pay: 00:00–06:00
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Date + Shift — 2-col on sm, stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Claim Date</label>
                  <input type="date" max={todayStr} value={form.claim_date}
                    onChange={(e) => setForm({ ...form, claim_date: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Shift Type</label>
                  <select value={form.shift_type} onChange={(e) => setForm({ ...form, shift_type: e.target.value })} className={inp}>
                    <option value="">Select shift type</option>
                    {SHIFT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {rosterShift && form.shift_type && rosterShift !== form.shift_type && (
                    <p className="text-xs text-[#b42318] mt-1">⚠ Roster shows "{rosterShift}"</p>
                  )}
                </div>
              </div>

              {/* Hours + OT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Hours Worked</label>
                  <input type="number" min="0.5" max="24" step="0.5" value={form.hours_worked}
                    onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Overtime Hours</label>
                  <input type="number" min="0" max="12" step="0.5" value={form.overtime_hours}
                    onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })} className={inp} />
                </div>
              </div>

              {/* Holiday read-only */}
              <div>
                <label className="block text-xs font-bold text-[#344054] mb-1.5">Public Holiday</label>
                <div className={`px-3 py-2.5 rounded-lg text-sm border ${
                  (holidayInfo || nextDayHoliday)
                    ? "bg-[#f1eaff] border-[#d8b4fe] text-[#7a3aed] font-bold"
                    : "bg-[#f4f8fd] border-[#e6edf5] text-[#667085]"
                }`}>
                  {checkingDate ? "Checking..." :
                    holidayInfo && nextDayHoliday ? `🌟 Both today & tomorrow are holidays` :
                    holidayInfo     ? `🌟 Yes — ${holidayInfo.holiday_name}` :
                    nextDayHoliday  ? `🌟 Next day — ${nextDayHoliday.holiday_name}` :
                    "No — auto-detected"}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#344054] mb-1.5">Description / Notes</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional..." rows={3} className={`${inp} resize-y`} />
              </div>

              {/* Earnings preview */}
              {hourlyRate > 0 && Number(form.hours_worked) > 0 && (
                <div className="border border-[#e6edf5] rounded-xl overflow-hidden">
                  <div className="bg-[#f4f8fd] px-4 py-2.5 text-[10px] font-bold text-[#667085] uppercase flex justify-between items-center">
                    <span>Estimated Earnings</span>
                    {isGrave && (holidayInfo || nextDayHoliday) && (
                      <span className="text-[#7a3aed] normal-case">midnight split</span>
                    )}
                  </div>
                  {[
                    { label: "Normal Pay",   value: formatZAR(normal) },
                    { label: "Overtime ×1.5", value: formatZAR(overtime) },
                    { label: "Holiday Pay",  value: formatZAR(holiday) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between px-4 py-2.5 border-t border-[#edf2f7] text-sm">
                      <span className="text-[#667085]">{label}</span>
                      <span className="font-bold text-[#344054]">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 bg-[#eaf4ff] font-extrabold text-[15px]">
                    <span className="text-[#005bbb]">Total</span>
                    <span className="text-[#005bbb]">{formatZAR(total)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" className="cancel-btn flex-1 sm:flex-none" onClick={() => navigate("/claims")}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn flex-1 sm:flex-none"
                  disabled={submitBlocked}
                  style={shiftStatus.blocked ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>

          {/* ===== Recent claims panel — below form on mobile ===== */}
          <div className="bg-white border border-[#e6edf5] rounded-xl p-4 md:p-5">
            <h3 className="m-0 mb-4 text-base font-bold text-[#1d2939]">Recent Claims</h3>

            {!recentClaims?.length ? (
              <p className="text-sm text-[#667085]">No recent claims this month.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentClaims.map((claim) => (
                  <div key={claim.claim_id} className="flex justify-between items-start border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                    <div>
                      <strong className="block text-sm text-[#1d2939]">{claim.claim_date}</strong>
                      <span className="text-xs text-[#667085]">{claim.shift_type}</span>
                      <div className="text-xs text-[#667085] mt-0.5">
                        {claim.hours_worked}h
                        {Number(claim.overtime_hours) > 0 && ` · ${claim.overtime_hours}h OT`}
                        {claim.is_holiday && " · 🌟"}
                      </div>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate("/claims")}
              className="block w-full text-center text-sm font-bold text-[#006fd6] mt-4 bg-transparent border-none cursor-pointer"
            >
              View All Claims →
            </button>
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default SubmitClaim;