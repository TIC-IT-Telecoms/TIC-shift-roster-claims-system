import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  formatDate, formatRole, formatSupervisor,
  getInitials, formatDateTime,
} from "../utils/helpers";

// ===== Reusable components =====
const InfoItem = ({ label, value, children }) => (
  <div className="py-3 border-b border-[#edf2f7] last:border-0">
    <span className="block text-xs text-[#667085] mb-1">{label}</span>
    {children ?? <strong className="text-sm text-[#101828]">{value || "—"}</strong>}
  </div>
);

const StatusPill = ({ status }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status === "Active"
      ? "bg-[#e8f8ef] text-[#157347]"
      : "bg-[#fee4e2] text-[#b42318]"
    }`}>
    {status || "—"}
  </span>
);

const FeedbackBanner = ({ type, message }) => {
  if (!message) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium border ${type === "success"
        ? "bg-[#e8f8ef] border-[#bbf7d0] text-[#157347]"
        : "bg-[#fee4e2] border-[#fecaca] text-[#b42318]"
      }`}>
      {type === "success" ? "✓" : "✕"} {message}
    </div>
  );
};

const inp = "w-full mt-1 px-3 py-2 border border-[#d0d5dd] rounded-md text-sm outline-none focus:border-[#006fd6] font-[inherit] box-border";

// ===== Main =====
function MyProfile() {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [phoneForm, setPhoneForm] = useState("");
  const [addressForm, setAddressForm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const user = profile;
  const emp = profile?.employee;
  const supervisor = emp?.supervisor;

  const updatePhone = useMutation({
    mutationFn: profileApi.updatePhone,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }); setSuccessMsg("Profile updated."); setEditMode(false); setErrorMsg(""); },
    onError: (e) => { setErrorMsg(e.message); setSuccessMsg(""); },
  });

  const updateAddress = useMutation({
    mutationFn: profileApi.updateAddress,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }); setSuccessMsg("Profile updated."); setEditMode(false); setErrorMsg(""); },
    onError: (e) => { setErrorMsg(e.message); setSuccessMsg(""); },
  });

  const openEdit = () => { setPhoneForm(emp?.phone || ""); setAddressForm(emp?.address || ""); setEditMode(true); setSuccessMsg(""); setErrorMsg(""); };

  const handleSave = async () => {
    setErrorMsg("");
    const promises = [];
    if (phoneForm.trim() && phoneForm.trim() !== emp?.phone)
      promises.push(updatePhone.mutateAsync(phoneForm.trim()));
    if (addressForm.trim() && addressForm.trim() !== emp?.address)
      promises.push(updateAddress.mutateAsync(addressForm.trim()));
    if (!promises.length) { setEditMode(false); return; }
    try { await Promise.all(promises); } catch (e) { setErrorMsg(e.message); }
  };

  const isSaving = updatePhone.isPending || updateAddress.isPending;

  if (isLoading) return (
    <Layout>
      <section className="p-4">
        <p className="text-sm text-[#667085]">Loading profile...</p>
      </section>
    </Layout>
  );

  return (
    <Layout>
      <section className="p-4 md:p-5">
        <p className="text-xs text-[#667085] mb-4">Dashboard &gt; My Profile</p>

        <FeedbackBanner type="success" message={successMsg} />
        <FeedbackBanner type="error" message={errorMsg} />

        {/* ===== Avatar card — always full-width, centred on mobile ===== */}
        <div className="bg-white border border-[#e6edf5] rounded-xl p-5 mb-4 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#eaf4ff] text-[#006fd6] flex items-center justify-center text-2xl font-extrabold mb-3">
            {emp?.profile_picture
              ? <img src={emp.profile_picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
              : getInitials(emp?.name)}
          </div>
          <h3 className="m-0 text-base font-bold text-[#1d2939]">{emp?.name || "—"}</h3>
          <p className="text-sm text-[#667085] mt-1 mb-2 capitalize">
            {emp?.employment_type || formatRole(user?.role)}
          </p>
          <StatusPill status={emp?.status} />

          {/* Quick info strip */}
          <div className="mt-4 pt-4 border-t border-[#edf2f7] w-full grid grid-cols-2 gap-x-4 text-left">
            {[
              { label: "Employee ID", value: `EMP${String(emp?.employee_id || "").padStart(3, "0")}` },
              { label: "Team", value: emp?.team?.team_name },
              { label: "Role", value: formatRole(user?.role) },
              { label: "Type", value: emp?.employment_type },
            ].map(({ label, value }) => (
              <div key={label} className="py-2">
                <span className="block text-[10px] text-[#667085]">{label}</span>
                <strong className="text-xs text-[#1d2939]">{value || "—"}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Main grid: stacked mobile, 2-col desktop ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Personal Information */}
          <div className="bg-white border border-[#e6edf5] rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="m-0 text-[15px] font-bold text-[#1d2939]">Personal Information</h3>
              {!editMode ? (
                <button
                  onClick={openEdit}
                  className="bg-[#eaf4ff] text-[#006fd6] border border-[#cfe6ff] rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave} disabled={isSaving}
                    className="bg-[#006fd6] text-white border-none rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setErrorMsg(""); }}
                    className="bg-[#eaf4ff] text-[#006fd6] border border-[#cfe6ff] rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <InfoItem label="Full Name" value={emp?.name} />
            <InfoItem label="Employee ID"><strong className="text-sm text-[#101828]">EMP{String(emp?.employee_id || "").padStart(3, "0")}</strong></InfoItem>
            <InfoItem label="Email" value={emp?.email} />

            <InfoItem label="Phone">
              {editMode
                ? <input type="tel" value={phoneForm} onChange={(e) => setPhoneForm(e.target.value)} placeholder="e.g. 0821234567" className={inp} />
                : <strong className="text-sm text-[#101828]">{emp?.phone || "Not set"}</strong>}
            </InfoItem>

            <InfoItem label="ID Number" value={emp?.id_number} />

            <InfoItem label="Address">
              {editMode
                ? <textarea value={addressForm} onChange={(e) => setAddressForm(e.target.value)} placeholder="e.g. Polokwane, Limpopo" rows={2} className={`${inp} resize-y`} />
                : <strong className="text-sm text-[#101828]">{emp?.address || "Not set"}</strong>}
            </InfoItem>

            <InfoItem label="Status"><StatusPill status={emp?.status} /></InfoItem>
          </div>

          {/* Work Information */}
          <div className="bg-white border border-[#e6edf5] rounded-xl p-5">
            <h3 className="m-0 text-[15px] font-bold text-[#1d2939] mb-3">Work Information</h3>

            <InfoItem label="Team" value={emp?.team?.team_name} />
            <InfoItem label="Role"><strong className="text-sm text-[#101828]">{formatRole(user?.role)}</strong></InfoItem>
            <InfoItem label="Hourly Rate"><strong className="text-sm text-[#101828]">R{Number(emp?.hourly_rate || 0).toFixed(2)} / hour</strong></InfoItem>
            <InfoItem label="Employment Type" value={emp?.employment_type} />
            <InfoItem label="Join Date"><strong className="text-sm text-[#101828]">{formatDate(emp?.created_at)}</strong></InfoItem>
            <InfoItem label="Supervisor"><strong className="text-sm text-[#101828]">{formatSupervisor(supervisor)}</strong></InfoItem>
            <InfoItem label="Username" value={user?.username} />
            <InfoItem label="Last Login"><strong className="text-sm text-[#101828]">{user?.last_login ? formatDateTime(user.last_login) : "—"}</strong></InfoItem>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default MyProfile;