import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { useAuthStore } from "../store/authStore";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatEmpId, formatRole } from "../utils/helpers";

const inputStyle = {
  width: "100%", padding: "11px", border: "1px solid #d0d5dd",
  borderRadius: 8, outline: "none", fontSize: 13,
  fontFamily: "inherit", boxSizing: "border-box",
};

// ===== Toggle Switch =====
const Toggle = ({ label, checked, onChange }) => (
  <div className="toggle-row">
    <span>{label}</span>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <b />
    </label>
  </div>
);

function Settings() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [passwordForm, setPasswordForm] = useState({
    old_password: "", new_password: "", confirm_password: "",
  });
  const [notifications, setNotifications] = useState({
    email: true, sms: true, roster: true, claim_status: true,
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const setPass = (key) => (e) =>
    setPasswordForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleNotif = (key) =>
    setNotifications((n) => ({ ...n, [key]: !n[key] }));

  // ===== Fetch profile =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const emp = profile?.employee;
  const user = profile;

  // ===== Change password =====
  const changePassword = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      setSuccessMsg("Password changed. You will be logged out.");
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      setErrorMsg("");
      // Log out after password change
      setTimeout(() => {
        clearAuth();
        window.location.href = "/";
      }, 2000);
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setSuccessMsg("");
    },
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const { old_password, new_password, confirm_password } = passwordForm;
    if (!old_password || !new_password || !confirm_password) {
      setErrorMsg("All password fields are required."); return;
    }
    if (new_password !== confirm_password) {
      setErrorMsg("New passwords do not match."); return;
    }
    if (new_password === old_password) {
      setErrorMsg("New password must differ from current password."); return;
    }
    changePassword.mutate(passwordForm);
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Settings</div>

        <div className="page-title-row" style={{ marginBottom: 24 }}>
          <div>
            <h2>Settings</h2>
            <p className="subtitle">Manage your account preferences.</p>
          </div>
        </div>

        {/* ===== Feedback ===== */}
        {successMsg && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "10px 16px",
            borderRadius: 8, marginBottom: 18, fontSize: 13,
          }}>
            ✓ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{
            background: "#fee4e2", border: "1px solid #fecaca",
            color: "#b42318", padding: "10px 16px",
            borderRadius: 8, marginBottom: 18, fontSize: 13,
          }}>
            ✕ {errorMsg}
          </div>
        )}

        <div className="settings-grid">

          {/* ===== Change Password ===== */}
          <div className="settings-card">
            <h3>Change Password</h3>
            <p style={{ color: "#667085", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              You will be logged out after changing your password.
            </p>

            <form onSubmit={handlePasswordSubmit}>
              {[
                { key: "old_password", label: "Current Password" },
                { key: "new_password", label: "New Password" },
                { key: "confirm_password", label: "Confirm New Password" },
              ].map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <input
                    type="password"
                    style={inputStyle}
                    placeholder="••••••••"
                    value={passwordForm[key]}
                    onChange={setPass(key)}
                    onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                    onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
                  />
                </div>
              ))}

              <button
                type="submit"
                className="primary-btn"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          <div>
            {/* ===== Notification Preferences ===== */}
            <div className="settings-card" style={{ marginBottom: 18 }}>
              <h3>Notification Preferences</h3>
              <p style={{ color: "#667085", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                {/* TODO: Wire to backend notifications settings when built */}
                Preferences saved locally for now.
              </p>

              <Toggle
                label="Email Notifications"
                checked={notifications.email}
                onChange={() => toggleNotif("email")}
              />
              <Toggle
                label="SMS Notifications"
                checked={notifications.sms}
                onChange={() => toggleNotif("sms")}
              />
              <Toggle
                label="Roster Notifications"
                checked={notifications.roster}
                onChange={() => toggleNotif("roster")}
              />
              <Toggle
                label="Claim Status Notifications"
                checked={notifications.claim_status}
                onChange={() => toggleNotif("claim_status")}
              />
            </div>

            {/* ===== Account Information ===== */}
            <div className="settings-card">
              <h3>Account Information</h3>

              {[
                { label: "Employee ID", value: emp ? formatEmpId(emp.employee_id) : "—" },
                { label: "Username", value: user?.username || "—" },
                { label: "Role", value: formatRole(user?.role) },
                { label: "Team", value: emp?.team?.team_name || "—" },
                { label: "Employment Type", value: emp?.employment_type || "—" },
                {
                  label: "Account Status",
                  value: null,
                  custom: <strong className="active-text">{emp?.status || "Active"}</strong>,
                },
              ].map(({ label, value, custom }) => (
                <div className="account-row" key={label}>
                  <span>{label}</span>
                  {custom || <strong>{value}</strong>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Settings;