// src/pages/MyProfile.jsx
import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import {
  formatDate,
  formatRole,
  formatSupervisor,
  getInitials,
} from "../utils/helpers";

// ===== Shared input style helper =====
const inputStyle = (focused = false) => ({
  width: "100%", padding: "6px 10px",
  border: `1px solid ${focused ? "#006fd6" : "#d0d5dd"}`,
  borderRadius: 6, fontSize: 13,
  outline: "none", marginTop: 4,
  fontFamily: "inherit", boxSizing: "border-box",
});

// ===== Reusable components =====
const InfoItem = ({ label, value, children }) => (
  <div className="info-item">
    <span>{label}</span>
    {children ?? <strong>{value || "—"}</strong>}
  </div>
);

const StatusPill = ({ status }) => (
  <span style={{
    background: status === "Active" ? "#e8f8ef" : "#fee4e2",
    color: status === "Active" ? "#157347" : "#b42318",
    padding: "3px 10px", borderRadius: 999,
    fontSize: 12, fontWeight: 700,
  }}>
    {status || "—"}
  </span>
);

const FeedbackBanner = ({ type, message }) => {
  if (!message) return null;
  const ok = type === "success";
  return (
    <div style={{
      background: ok ? "#e8f8ef" : "#fee4e2",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
      color: ok ? "#157347" : "#b42318",
      padding: "10px 16px", borderRadius: 8,
      marginBottom: 16, fontSize: 13,
    }}>
      {ok ? "✓" : "✕"} {message}
    </div>
  );
};

// ===== Main component =====
function MyProfile() {
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [phoneForm, setPhoneForm] = useState("");
  const [addressForm, setAddressForm] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    old_password: "", new_password: "", confirm_password: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ===== Fetch profile =====
  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  // API shape: { user_id, username, role, created_at, last_login, employee: { ... } }
  const user = profile;
  const emp = profile?.employee;
  const supervisor = emp?.supervisor;

  // ===== Mutations =====
  const updatePhone = useMutation({
    mutationFn: profileApi.updatePhone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
      setSuccessMsg("Profile updated successfully.");
      setEditMode(false);
      setErrorMsg("");
    },
    onError: (err) => { setErrorMsg(err.message); setSuccessMsg(""); },
  });

  const updateAddress = useMutation({
    mutationFn: profileApi.updateAddress,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
      setSuccessMsg("Profile updated successfully.");
      setEditMode(false);
      setErrorMsg("");
    },
    onError: (err) => { setErrorMsg(err.message); setSuccessMsg(""); },
  });

  const changePassword = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      setSuccessMsg("Password changed. Please log in again.");
      setShowPasswordSection(false);
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      setErrorMsg("");
    },
    onError: (err) => { setErrorMsg(err.message); setSuccessMsg(""); },
  });

  // ===== Handlers =====
  const openEdit = () => {
    setPhoneForm(emp?.phone || "");
    setAddressForm(emp?.address || "");
    setEditMode(true);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleSave = async () => {
    setErrorMsg("");
    const promises = [];
    if (phoneForm.trim() && phoneForm.trim() !== emp?.phone)
      promises.push(updatePhone.mutateAsync(phoneForm.trim()));
    if (addressForm.trim() && addressForm.trim() !== emp?.address)
      promises.push(updateAddress.mutateAsync(addressForm.trim()));
    if (!promises.length) { setEditMode(false); return; }
    try { await Promise.all(promises); }
    catch (err) { setErrorMsg(err.message); }
  };

  const handlePasswordChange = () => {
    setErrorMsg("");
    const { old_password, new_password, confirm_password } = passwordForm;
    if (!old_password || !new_password || !confirm_password) {
      setErrorMsg("All password fields are required."); return;
    }
    if (new_password !== confirm_password) {
      setErrorMsg("New passwords do not match."); return;
    }
    changePassword.mutate(passwordForm);
  };

  const isSaving = updatePhone.isPending || updateAddress.isPending;

  if (isLoading) {
    return (
      <Layout>
        <section className="content">
          <p style={{ color: "#667085", fontSize: 13 }}>Loading profile...</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Profile</div>

        <FeedbackBanner type="success" message={successMsg} />
        <FeedbackBanner type="error" message={errorMsg} />

        <div className="profile-design-grid">

          {/* ===== Personal Information ===== */}
          <div className="profile-info-card">
            <div className="card-title-row">
              <h3>Personal Information</h3>
              {!editMode ? (
                <button className="small-edit-btn" onClick={openEdit}>Edit</button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="small-edit-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ background: "#006fd6", color: "white", border: "none" }}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="small-edit-btn"
                    onClick={() => { setEditMode(false); setErrorMsg(""); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <InfoItem label="Full Name" value={emp?.name} />

            <InfoItem label="Employee ID">
              <strong>EMP{String(emp?.employee_id || "").padStart(3, "0")}</strong>
            </InfoItem>

            <InfoItem label="Email" value={emp?.email} />

            <InfoItem label="Phone">
              {editMode ? (
                <input
                  type="tel" value={phoneForm}
                  onChange={(e) => setPhoneForm(e.target.value)}
                  placeholder="e.g. 0821234567"
                  style={inputStyle(true)}
                />
              ) : (
                <strong>{emp?.phone || "Not set"}</strong>
              )}
            </InfoItem>

            <InfoItem label="ID Number" value={emp?.id_number} />

            <InfoItem label="Address">
              {editMode ? (
                <textarea
                  value={addressForm}
                  onChange={(e) => setAddressForm(e.target.value)}
                  placeholder="e.g. Polokwane, Limpopo, South Africa"
                  rows={2}
                  style={{ ...inputStyle(true), resize: "vertical" }}
                />
              ) : (
                <strong>{emp?.address || "Not set"}</strong>
              )}
            </InfoItem>

            <InfoItem label="Status">
              <StatusPill status={emp?.status} />
            </InfoItem>

            {/* ===== Change Password ===== */}
            <div style={{ marginTop: 20, borderTop: "1px solid #edf2f7", paddingTop: 16 }}>
              <button
                className="small-edit-btn"
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection);
                  setErrorMsg("");
                  setSuccessMsg("");
                  setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
                }}
              >
                {showPasswordSection ? "✕ Cancel" : "🔒 Change Password"}
              </button>

              {showPasswordSection && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "old_password", label: "Current Password" },
                    { key: "new_password", label: "New Password" },
                    { key: "confirm_password", label: "Confirm New Password" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
                        {label}
                      </label>
                      <input
                        type="password"
                        value={passwordForm[key]}
                        onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                        style={inputStyle()}
                        onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                        onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
                      />
                    </div>
                  ))}
                  <button
                    className="primary-btn"
                    onClick={handlePasswordChange}
                    disabled={changePassword.isPending}
                    style={{ marginTop: 4 }}
                  >
                    {changePassword.isPending ? "Updating..." : "Update Password"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===== Work Information ===== */}
          <div className="profile-info-card">
            <h3>Work Information</h3>

            <InfoItem label="Team" value={emp?.team?.team_name} />

            <InfoItem label="Role">
              <strong>{formatRole(user?.role)}</strong>
            </InfoItem>

            <InfoItem label="Hourly Rate">
              <strong>R{Number(emp?.hourly_rate || 0).toFixed(2)} / hour</strong>
            </InfoItem>

            <InfoItem label="Employment Type" value={emp?.employment_type} />

            <InfoItem label="Join Date">
              <strong>{formatDate(emp?.join_date)}</strong>
            </InfoItem>

            <InfoItem label="Member Since">
              <strong>{formatDate(user?.created_at)}</strong>
            </InfoItem>

            <InfoItem label="Supervisor">
              <strong>{formatSupervisor(supervisor)}</strong>
            </InfoItem>

            <InfoItem label="Username" value={user?.username} />

            <InfoItem label="Last Login">
              <strong>
                {user?.last_login
                  ? new Date(user.last_login).toLocaleString("en-ZA")
                  : "—"}
              </strong>
            </InfoItem>
          </div>

          {/* ===== Avatar Side Card ===== */}
          <div className="profile-side-card">
            <div className="profile-avatar big">
              {emp?.profile_picture ? (
                <img
                  src={emp.profile_picture}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                getInitials(emp?.name)
              )}
            </div>

            <h3>{emp?.name || "—"}</h3>
            <p style={{ textTransform: "capitalize", color: "#667085", margin: "4px 0 12px" }}>
              {emp?.employment_type || formatRole(user?.role)}
            </p>

            <StatusPill status={emp?.status} />

            

            <div style={{ marginTop: 20, borderTop: "1px solid #edf2f7", paddingTop: 16, textAlign: "left", width: "100%" }}>
              <InfoItem label="Employee ID">
                <strong>EMP{String(emp?.employee_id || "").padStart(3, "0")}</strong>
              </InfoItem>
              <InfoItem label="Team" value={emp?.team?.team_name} />
              <InfoItem label="Role">
                <strong>{formatRole(user?.role)}</strong>
              </InfoItem>
              <InfoItem label="Employment Type" value={emp?.employment_type} />
            </div>
          </div>

        </div>
      </section>
    </Layout>
  );
}

export default MyProfile;