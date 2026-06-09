import { useState } from "react";
import Layout from "../components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftApi } from "../api/shiftApi";
import { QUERY_KEYS } from "../utils/queryKeys";
import AddShift from "./AddShift";
import ConfirmationModal from "../components/ui/ConfirmationModal";

// ===== Shift color badge =====
const ShiftBadge = ({ shift }) => {
  const name = shift.shift_name?.toLowerCase() || "";
  const isGrave = shift.is_grave;

  let bg, color;
  if (isGrave || name.includes("grave")) {
    bg = "#ffc00026"; color = "#ffc000";
  } else if (name.includes("night")) {
    bg = "#44b3e126"; color = "#44b3e1";
  } else {
    bg = "#f7c7ac36"; color = "#f7c7ac";
  }

  return (
    <span style={{
      background: bg, color,
      padding: "4px 12px", borderRadius: 999,
      fontSize: 12, fontWeight: 700,
      display: "inline-block",
    }}>
      {shift.shift_name}
    </span>
  );
};

function Shifts() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteShiftId, setDeleteShiftId] = useState(null);

  // Auto-dismiss success message
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ===== Queries =====
  const { data: shifts, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SHIFTS,
    queryFn: shiftApi.getAll,
    select: (d) => d.data,
  });

  // ===== Delete =====
  const deleteShift = useMutation({
    mutationFn: shiftApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS });
      showSuccess("Shift deleted successfully.");
    },
    onError: (err) => alert(err.message),
  });

  const handleDelete = (shift) => {
    setDeleteShiftId(shift.shift_id);
  };

  const confirmDelete = () => {
    if (!deleteShiftId) return;

    deleteShift.mutate(deleteShiftId, {
      onSuccess: () => {
        setDeleteShiftId(null);
      },
    });
  };

  // ===== Modal handlers =====
  const openAdd = () => { setEditShift(null); setShowModal(true); };
  const openEdit = (shift) => { setEditShift(shift); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditShift(null); };

  const handleModalSuccess = (msg) => {
    closeModal();
    showSuccess(msg);
  };

  // ===== Filter =====
  const filtered = (shifts || []).filter((s) =>
    s.shift_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Shifts</div>

        <div className="page-title-row">
          <div>
            <h2>Shifts</h2>
            <p className="subtitle">Manage shift types, start times, and end times.</p>
          </div>
          <button className="primary-btn" onClick={openAdd}>
            + Add Shift
          </button>
        </div>

        {/* ===== Success Banner ===== */}
        {successMsg && (
          <div style={{
            background: "#e8f8ef", border: "1px solid #bbf7d0",
            color: "#157347", padding: "10px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* ===== Shift Cards — visual overview ===== */}
        {!isLoading && filtered.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12, marginBottom: 20,
          }}>
            {filtered.map((shift) => {
              const name = shift.shift_name?.toLowerCase() || "";
              const isGrave = shift.is_grave;
              let bg, color, border;
              if (isGrave || name.includes("grave")) {
                bg = "#ffc00026"; color = "#ffc000"; border = "#ffc00026";
              } else if (name.includes("night")) {
                bg = "#44b3e126"; color = "#44b3e1"; border = "#44b3e126";
              } else {
                bg = "#f7c7ac26"; color = "#f7c7ac"; border = "#f7c7ac26";
              }

              return (
                <div key={shift.shift_id} style={{
                  background: bg, border: `1px solid ${border}`,
                  borderRadius: 12, padding: "14px 18px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color, marginBottom: 4 }}>
                    {shift.shift_name}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 2 }}>
                    {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                  </div>
                  {shift.description && (
                    <div style={{ fontSize: 11, color, marginTop: 4 }}>
                      {shift.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== Toolbar ===== */}
        <div className="employee-toolbar">
          <input
            placeholder="Search shifts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ===== Table ===== */}
        <div className="roster-table-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              Loading shifts...
            </p>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Shift Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Grave Shift</th>
                  <th>Description</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((shift) => {
                  // Calculate duration
                  const calcDuration = () => {
                    if (!shift.start_time || !shift.end_time) return "—";
                    const [sh, sm] = shift.start_time.split(":").map(Number);
                    const [eh, em] = shift.end_time.split(":").map(Number);
                    let mins = (eh * 60 + em) - (sh * 60 + sm);
                    if (mins <= 0) mins += 24 * 60;
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return m > 0 ? `${h}h ${m}m` : `${h}h`;
                  };

                  return (
                    <tr key={shift.shift_id}>
                      <td style={{ color: "#667085", fontSize: 12, fontFamily: "monospace" }}>
                        SH{String(shift.shift_id).padStart(3, "0")}
                      </td>
                      <td>
                        <ShiftBadge shift={shift} />
                      </td>
                      <td style={{ color: "#344054", fontSize: 13, fontWeight: 700 }}>
                        {shift.start_time?.slice(0, 5) || "—"}
                      </td>
                      <td style={{ color: "#344054", fontSize: 13, fontWeight: 700 }}>
                        {shift.end_time?.slice(0, 5) || "—"}
                      </td>
                      <td style={{ color: "#667085", fontSize: 13 }}>
                        {calcDuration()}
                      </td>
                      <td>
                        {shift.is_grave ? (
                          <span style={{
                            background: "#f1eaff", color: "#7a3aed",
                            padding: "3px 10px", borderRadius: 999,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            🌙 Yes
                          </span>
                        ) : (
                          <span style={{ color: "#667085", fontSize: 13 }}>No</span>
                        )}
                      </td>
                      <td style={{ color: "#667085", fontSize: 13, maxWidth: 180 }}>
                        <span style={{
                          display: "block", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {shift.description || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="edit-btn"
                            onClick={() => openEdit(shift)}
                            title="Edit shift"
                          >
                            ✎
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(shift)}
                            disabled={deleteShift.isPending}
                            title="Delete shift"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#667085", padding: "32px 0" }}>
                      {search
                        ? "No shifts match your search."
                        : "No shifts yet. Click + Add Shift to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p className="roster-note">
            Showing {filtered.length} of {shifts?.length || 0} shifts
          </p>
        </div>

        {/* ===== AddShift Modal ===== */}
        {showModal && (
          <AddShift
            shift={editShift}
            onClose={closeModal}
            onSuccess={handleModalSuccess}
          />
        )}

        {/* ===== Delete Confirmation Modal ===== */}
        {deleteShiftId && (
          <ConfirmationModal
            title="Delete Shift"
            message={`Are you sure you want to delete this shift? This cannot be undone.`}
            confirmText="Delete"
            confirmColor="#dc2626"
            isPending={deleteShift.isPending}
            onConfirm={confirmDelete}
            onClose={() => setDeleteShiftId(null)}
          />
        )}

      </section>
    </Layout>
  );
}

export default Shifts;