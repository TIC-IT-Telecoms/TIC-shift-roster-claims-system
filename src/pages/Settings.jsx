import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { useAuthStore } from "../store/authStore";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatEmpId, formatRole } from "../utils/helpers";

// ===== Toggle Switch (Tailwind peer-based) =====
const Toggle = ({ label, checked, onChange }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-100">
    <span className="text-sm text-gray-700">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transform transition-transform"></div>
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
      <section className="p-6">
        <div className="text-sm text-gray-500 mb-4">Dashboard &gt; Settings</div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-gray-500 text-sm">Manage your account preferences.</p>
        </div>

        {/* ===== Feedback ===== */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 
                          p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            ✓ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 
                          p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            ✕ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ===== Change Password ===== */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold">Change Password</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              You will be logged out after changing your password.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {[
                { key: "old_password", label: "Current Password" },
                { key: "new_password", label: "New Password" },
                { key: "confirm_password", label: "Confirm New Password" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-700 mb-1">{label}</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm 
                               focus:border-blue-600 focus:ring focus:ring-blue-200"
                    placeholder="••••••••"
                    value={passwordForm[key]}
                    onChange={setPass(key)}
                  />
                </div>
              ))}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold 
                           hover:bg-blue-700 disabled:opacity-50"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* ===== Notification Preferences & Account Info ===== */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">
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

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold">Account Information</h3>
              {[
                { label: "Employee ID", value: emp ? formatEmpId(emp.employee_id) : "—" },
                { label: "Username", value: user?.username || "—" },
                { label: "Role", value: formatRole(user?.role) },
                { label: "Team", value: emp?.team?.team_name || "—" },
                { label: "Employment Type", value: emp?.employment_type || "—" },
                {
                  label: "Account Status",
                  value: null,
                  custom: <strong className="text-green-700">{emp?.status || "Active"}</strong>,
                },
              ].map(({ label, value, custom }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">{label}</span>
                  {custom || <strong className="text-sm">{value}</strong>}
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
