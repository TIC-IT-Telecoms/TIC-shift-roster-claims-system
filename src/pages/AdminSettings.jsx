import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
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

function AdminSettings() {
  // ===== System settings (local state — no backend yet) =====
  const [systemSettings, setSystemSettings] = useState({
    company_name: "NOC Roster & Claims",
    default_hourly_rate: "100.00",
    overtime_multiplier: "1.5",
    holiday_multiplier: "1.0",
  });

  const [notifications, setNotifications] = useState({
    claim_approval: true,
    compliance: true,
    payroll: true,
    roster_publish: true,
  });

  const [saved, setSaved] = useState(false);

  // ===== Fetch admin profile =====
  const { data: profile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

  const emp = profile?.employee;
  const user = profile;

  const setSystem = (key) => (e) =>
    setSystemSettings((s) => ({ ...s, [key]: e.target.value }));

  const toggleNotif = (key) =>
    setNotifications((n) => ({ ...n, [key]: !n[key] }));

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: Wire to backend settings endpoint when built
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Settings</div>

        <div className="page-title-row" style={{ marginBottom: 24 }}>
          <div>
            <h2>Settings</h2>
            <p className="subtitle">Manage system configuration and preferences.</p>
          </div>
        </div>

        {saved && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "10px 16px",
            borderRadius: 8, marginBottom: 18, fontSize: 13,
          }}>
            ✓ Settings saved successfully.
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="settings-grid">

            {/* ===== System Settings ===== */}
            <div className="settings-card">
              <h3>System Settings</h3>

              {[
                { label: "Company Name", key: "company_name", type: "text" },
                { label: "Default Hourly Rate (R)", key: "default_hourly_rate", type: "number" },
                { label: "Overtime Multiplier (×)", key: "overtime_multiplier", type: "number" },
                { label: "Holiday Pay Multiplier (×)", key: "holiday_multiplier", type: "number" },
              ].map(({ label, key, type }) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <input
                    type={type}
                    step="0.01"
                    style={inputStyle}
                    value={systemSettings[key]}
                    onChange={setSystem(key)}
                    onFocus={(e) => (e.target.style.borderColor = "#006fd6")}
                    onBlur={(e) => (e.target.style.borderColor = "#d0d5dd")}
                  />
                </div>
              ))}

              <div style={{
                background: "#eaf4ff", border: "1px solid #bfdbfe",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#006fd6", marginBottom: 16,
              }}>
                ℹ️ Overtime and holiday multipliers are used in payroll calculations.
              </div>

              <button type="submit" className="primary-btn">Save Settings</button>
            </div>

            <div>
              {/* ===== Notification Preferences ===== */}
              <div className="settings-card" style={{ marginBottom: 18 }}>
                <h3>Admin Notifications</h3>

                <Toggle
                  label="Claim Approval Alerts"
                  checked={notifications.claim_approval}
                  onChange={() => toggleNotif("claim_approval")}
                />
                <Toggle
                  label="Compliance Alerts"
                  checked={notifications.compliance}
                  onChange={() => toggleNotif("compliance")}
                />
                <Toggle
                  label="Payroll Alerts"
                  checked={notifications.payroll}
                  onChange={() => toggleNotif("payroll")}
                />
                <Toggle
                  label="Roster Publish Alerts"
                  checked={notifications.roster_publish}
                  onChange={() => toggleNotif("roster_publish")}
                />
              </div>

              {/* ===== Account Information ===== */}
              <div className="settings-card">
                <h3>Account Information</h3>

                {[
                  { label: "Admin ID", value: emp ? formatEmpId(emp.employee_id) : "—" },
                  { label: "Username", value: user?.username || "—" },
                  { label: "Role", value: formatRole(user?.role) },
                  { label: "Team", value: emp?.team?.team_name || "—" },
                  {
                    label: "Status",
                    value: null,
                    custom: (
                      <strong className="active-text">
                        {emp?.status || "Active"}
                      </strong>
                    ),
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
        </form>
      </section>
    </Layout>
  );
}

export default AdminSettings;