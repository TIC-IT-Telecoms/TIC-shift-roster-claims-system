// src/pages/AddShift.jsx
// Exported as a modal component — imported by Shifts.jsx
// Handles both Add and Edit in one component

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftApi } from "../api/shiftApi";
import { QUERY_KEYS } from "../utils/queryKeys";

// ===== Shift presets =====
const PRESETS = [
  { label: "Early Shift", start_time: "06:00", end_time: "14:00", is_grave: false },
  { label: "Night Shift", start_time: "14:00", end_time: "22:00", is_grave: false },
  { label: "Grave Shift", start_time: "22:00", end_time: "06:00", is_grave: true },
];

const defaultForm = {
  shift_name: "",
  start_time: "",
  end_time: "",
  is_grave: false,
  description: "",
};

// ===== Shared styles =====
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d5dd", borderRadius: 8,
  fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
const onFocus = (e) => (e.target.style.borderColor = "#006fd6");
const onBlur = (e) => (e.target.style.borderColor = "#d0d5dd");

// ===== Sub-components =====
const Field = ({ label, required, children }) => (
  <div>
    <label style={{ fontSize: 12, color: "#667085", display: "block", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#b42318" }}> *</span>}
    </label>
    {children}
  </div>
);

// ===== Shift color by type =====
const getShiftColor = (name = "", isGrave = false) => {
  if (isGrave || name.toLowerCase().includes("grave"))
    return { bg: "#f1eaff", color: "#7a3aed", border: "#d8b4fe" };
  if (name.toLowerCase().includes("night") || name.toLowerCase().includes("14"))
    return { bg: "#e8f8ef", color: "#157347", border: "#bbf7d0" };
  return { bg: "#eaf4ff", color: "#006fd6", border: "#bfdbfe" };
};

// ===== Modal Component =====
function AddShift({ shift, onClose, onSuccess }) {
  const isEdit = !!shift;
  const qc = useQueryClient();

  const [form, setForm] = useState(
    isEdit ? {
      shift_name: shift.shift_name || "",
      start_time: shift.start_time?.slice(0, 5) || "",
      end_time: shift.end_time?.slice(0, 5) || "",
      is_grave: shift.is_grave || false,
      description: shift.description || "",
    } : defaultForm
  );

  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const applyPreset = (preset) => {
    setForm((f) => ({
      ...f,
      start_time: preset.start_time,
      end_time: preset.end_time,
      is_grave: preset.is_grave,
      shift_name: f.shift_name || preset.label,
    }));
  };

  const createShift = useMutation({
    mutationFn: shiftApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS });
      onSuccess("Shift created successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const updateShift = useMutation({
    mutationFn: (data) => shiftApi.update(shift.shift_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS });
      onSuccess("Shift updated successfully.");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.shift_name.trim()) { setError("Shift name is required."); return; }
    if (!form.start_time) { setError("Start time is required."); return; }
    if (!form.end_time) { setError("End time is required."); return; }
    isEdit ? updateShift.mutate(form) : createShift.mutate(form);
  };

  const isPending = createShift.isPending || updateShift.isPending;
  const colors = getShiftColor(form.shift_name, form.is_grave);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: "100%", maxWidth: 500,
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
              {isEdit ? "Edit Shift" : "Add Shift"}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#667085" }}>
              {isEdit
                ? "Update shift details."
                : "Define a new shift window."}
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

          {/* ===== Presets — only on create ===== */}
          {!isEdit && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: "#667085", marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>
                Quick Presets
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {PRESETS.map((p) => {
                  const pc = getShiftColor(p.label, p.is_grave);
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      style={{
                        flex: 1, padding: "8px 10px",
                        background: pc.bg, color: pc.color,
                        border: `1px solid ${pc.border}`,
                        borderRadius: 8, fontSize: 12,
                        fontWeight: 700, cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                    >
                      {p.label}
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                        {p.start_time} – {p.end_time}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Shift Name */}
            <Field label="Shift Name" required>
              <input
                style={inp} placeholder="e.g. Early Shift"
                value={form.shift_name} onChange={set("shift_name")}
                onFocus={onFocus} onBlur={onBlur}
              />
            </Field>

            {/* Time Range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Start Time" required>
                <input
                  type="time" style={inp}
                  value={form.start_time} onChange={set("start_time")}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </Field>
              <Field label="End Time" required>
                <input
                  type="time" style={inp}
                  value={form.end_time} onChange={set("end_time")}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </Field>
            </div>

            {/* Grave Shift Flag */}
            <label style={{
              display: "flex", alignItems: "center",
              gap: 10, cursor: "pointer",
              padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${form.is_grave ? "#d8b4fe" : "#e6edf5"}`,
              background: form.is_grave ? "#f1eaff" : "#f4f8fd",
              transition: "all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={form.is_grave}
                onChange={(e) => setForm((f) => ({ ...f, is_grave: e.target.checked }))}
                style={{ accentColor: "#7a3aed", width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: form.is_grave ? "#7a3aed" : "#344054" }}>
                  Grave Shift (crosses midnight)
                </div>
                <div style={{ fontSize: 11, color: "#667085" }}>
                  Mark this if the shift ends the following day (e.g. 22:00 – 06:00)
                </div>
              </div>
            </label>

            {/* Description */}
            <Field label="Description">
              <textarea
                style={{ ...inp, minHeight: 70, resize: "vertical" }}
                placeholder="Optional description..."
                value={form.description} onChange={set("description")}
              />
            </Field>

            {/* ===== Live Preview ===== */}
            {(form.shift_name || form.start_time) && (
              <div style={{
                padding: "14px 16px", borderRadius: 10,
                background: colors.bg, border: `1px solid ${colors.border}`,
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: colors.color, fontWeight: 700, textTransform: "uppercase" }}>
                  Preview
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    padding: "6px 14px", borderRadius: 999,
                    background: colors.color, color: "white",
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {form.shift_name || "Shift Name"}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.color }}>
                    {form.start_time || "--:--"} → {form.end_time || "--:--"}
                  </div>
                  {form.is_grave && (
                    <span style={{ fontSize: 11, color: "#7a3aed", fontWeight: 700 }}>
                      🌙 Overnight
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ===== Actions ===== */}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              gap: 10, marginTop: 8, paddingTop: 16,
              borderTop: "1px solid #e6edf5",
            }}>
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Shift"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default AddShift;