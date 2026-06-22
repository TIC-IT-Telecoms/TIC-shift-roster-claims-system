import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import { formatRole, formatDisplayDate } from "../utils/helpers";

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Intern"];

const defaultForm = {
  name: "", email: "", phone: "", team_id: "",
  hourly_rate: "", role: "Employee", password: "",
  employment_type: "Full Time", id_number: "",
};

// ===== Shared input style =====
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d5dd", borderRadius: 8,
  fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
const onFocus = (e) => (e.target.style.borderColor = "#006fd6");
const onBlur = (e) => (e.target.style.borderColor = "#d0d5dd");

// ===== Reusable sub-components =====
const Field = ({ label, required, children }) => (
  <div>
    <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#b42318" }}> *</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ borderBottom: "1px solid #e6edf5", paddingBottom: 10, marginBottom: 16 }}>
    <h4 style={{ margin: 0, color: "#005bbb", fontSize: 14 }}>{title}</h4>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#667085" }}>{sub}</p>}
  </div>
);

// ===== Modal Component =====
function AddEmployee({ employee, teams, employees, onClose, onSuccess }) {
  const isEdit = !!employee;
  const qc = useQueryClient();

  const [form, setForm] = useState(
    isEdit ? {
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      team_id: employee.team_id || "",
      hourly_rate: employee.hourly_rate || "",
      role: employee.role || "employee",
      password: "",
      employment_type: employee.employment_type || "Full Time",
      id_number: employee.id_number || "",
      join_date: formatDisplayDate(employee.created_at) || "",
      address: employee.address || "",
      supervisor_id: employee.supervisor_id || "",
    } : defaultForm
  );

  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const createEmployee = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      onSuccess("Employee created successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const updateEmployee = useMutation({
    mutationFn: (data) => employeeApi.update(employee.employee_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      onSuccess("Employee updated successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!isEdit && !form.password.trim()) { setError("Password is required."); return; }

    const payload = {
      ...form,
      team_id: form.team_id || null,
      supervisor_id: form.supervisor_id || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
    };
    if (isEdit) delete payload.password;
    isEdit ? updateEmployee.mutate(payload) : createEmployee.mutate(payload);
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  // Admins only as supervisors, exclude self
const supervisors = (employees || []).filter((e) => {
  // const supervisor = employees.find((s) => s.employee_id === e.supervisor_id); //|| supervisor?.role === "Admin"
  return (e.role === "Admin" &&
    e.employee_id !== employee?.employee_id
  );
});

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 640,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
      }}>

        {/* ===== Sticky Header ===== */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "20px 28px 16px",
          borderBottom: "1px solid #e6edf5",
          position: "sticky", top: 0,
          background: "white", zIndex: 10,
        }}>
          <div>
            <h3 style={{ margin: 0, color: "#005bbb", fontSize: 17 }}>
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#667085" }}>
              {isEdit
                ? "Update employee record and account."
                : "Create a new employee and system account."}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: "#667085",
          }}>✕</button>
        </div>

        {/* ===== Body ===== */}
        <div style={{ padding: "24px 28px" }}>

          {error && (
            <div style={{
              background: "#fee4e2", border: "1px solid #fecaca",
              color: "#b42318", padding: "10px 14px",
              borderRadius: 8, marginBottom: 20, fontSize: 13,
            }}>
              ✕ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ===== Personal Details ===== */}
            <SectionTitle title="Personal Details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <Field label="Full Name" required>
                <input style={inp} placeholder="John Doe"
                  value={form.name} onChange={set("name")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <Field label="Email" required>
                <input type="email" style={inp} placeholder="john@company.co.za"
                  value={form.email} onChange={set("email")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <Field label="Phone">
                <input type="tel" style={inp} placeholder="0621234567"
                  value={form.phone} onChange={set("phone")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <Field label="ID Number">
                <input style={inp} placeholder="0001011234089"
                  value={form.id_number} onChange={set("id_number")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Field label="Address">
                <textarea
                  style={{ ...inp, minHeight: 70, resize: "vertical" }}
                  placeholder="e.g. JHB, Gauteng, South Africa"
                  value={form.address} onChange={set("address")}
                />
              </Field>
            </div>

            {/* ===== Work Details ===== */}
            <SectionTitle title="Work Details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <Field label="Team">
                <select style={inp} value={form.team_id} onChange={set("team_id")}>
                  <option value="">No team assigned</option>
                  {teams?.map((t) => (
                    <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <select style={inp} value={form.role} onChange={set("role")}>
                  <option value="employee">Employee</option>
                  <option value="Admin">Admin</option>
                </select>
              </Field>
              <Field label="Employment Type">
                <select style={inp} value={form.employment_type} onChange={set("employment_type")}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Hourly Rate (R)">
                <input type="number" step="0.01" min="0" style={inp}
                  placeholder="50.00" value={form.hourly_rate} onChange={set("hourly_rate")}
                  onFocus={onFocus} onBlur={onBlur} />
              </Field>
              {isEdit && (<Field label="Join Date">
                <input type="text" style={inp}
                  value={form.join_date} disabled />
              </Field>)}
              <Field label="Supervisor">
                <select style={inp} value={form.supervisor_id} onChange={set("supervisor_id")}>
                  <option value="">No supervisor</option>
                  {supervisors.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.name} ({formatRole(e.role)})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* ===== Account Details ===== */}
            <SectionTitle
              title="Account Details"
              sub={isEdit
                ? "Password can be changed by the employee via My Profile."
                : "Email will be used as the login username."}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <Field label="Username (auto — email)">
                <input
                  style={{ ...inp, background: "#f4f8fd", color: "#667085" }}
                  value={form.email || "Will match email"}
                  disabled
                />
              </Field>
              {!isEdit && (
                <Field label="Password" required>
                  <input type="password" style={inp} placeholder="••••••••"
                    value={form.password} onChange={set("password")}
                    onFocus={onFocus} onBlur={onBlur} />
                </Field>
              )}
            </div>

            {!isEdit && (
              <div style={{
                background: "#eaf4ff", border: "1px solid #bfdbfe",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 12, color: "#006fd6", marginBottom: 8,
              }}>
                ℹ️ Employee can change their password after first login via Settings.
              </div>
            )}

            {/* ===== Actions ===== */}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              gap: 10, marginTop: 24, paddingTop: 16,
              borderTop: "1px solid #e6edf5",
            }}>
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEmployee;