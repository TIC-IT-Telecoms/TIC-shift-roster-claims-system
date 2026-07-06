function HolidayModal({
  formData,
  setFormData,
  onClose,
  onSubmit,
  isPending,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: 560,
          boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#005bbb",
            }}
          >
            {formData.holiday_id ? "Edit Holiday" : "Add Holiday"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#667085",
                display: "block",
                marginBottom: 4,
              }}
            >
              Holiday Name
            </label>

            <input
              value={formData.holiday_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  holiday_name: e.target.value,
                })
              }
              placeholder="Youth Day"
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#667085",
                display: "block",
                marginBottom: 4,
              }}
            >
              Holiday Date
            </label>

            <input
              type="date"
              value={formData.holiday_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  holiday_date: e.target.value,
                })
              }
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#667085",
                display: "block",
                marginBottom: 4,
              }}
            >
              Description
            </label>

            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="South African public holiday"
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
                background: "white",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "10px 18px",
                background: "#006fd6",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              {
                isPending
                  ? "Saving..."
                  : formData.holiday_id
                    ? "Update Holiday"
                    : "Add Holiday"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




import { useState } from 'react';
import {
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from '../hooks/useHolidayMutations';


import Layout from "../components/Layout";
import { useHolidays } from '../hooks/useHolidays';

function Holidays() {

  const { data: holidays = [], isLoading } = useHolidays();

  const [showModal, setShowModal] = useState(false);

  const [editingHoliday, setEditingHoliday] = useState(null);

  const [formData, setFormData] = useState({
    holiday_name: '',
    holiday_date: '',
    description: '',
  });

  const [search, setSearch] = useState("");

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);

    setFormData({
      holiday_id: holiday.holiday_id,
      holiday_name: holiday.holiday_name,
      holiday_date: holiday.holiday_date,
      description: holiday.description || "",
    });

    setShowModal(true);
  };

  const handleDelete = async (holiday) => {
    const confirmed = window.confirm(
      `Delete ${holiday.holiday_name}?`
    );

    if (!confirmed) return;

    try {
      await deleteHoliday.mutateAsync(
        holiday.holiday_id
      );
    } catch (err) {
      alert('Failed to delete holiday');
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({
          id: editingHoliday.holiday_id,
          data: formData,
        });
      } else {
        await createHoliday.mutateAsync(formData);
      }

      setShowModal(false);

      setEditingHoliday(null);


      setFormData({
        holiday_name: '',
        holiday_date: '',
        description: '',
      });
    } catch (err) {
      alert(err.message || 'Failed to create holiday');
    }
  };




  const createHoliday = useCreateHoliday();

  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();



  if (isLoading) {
    return (
      <Layout>
        <div>Loading holidays...</div>
      </Layout>
    );
  }

  const filteredHolidays = holidays.filter((holiday) =>
    holiday.holiday_name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Holidays</div>

        <div className="page-title-row">
          <div>
            <h2>Holidays</h2>
            <p className="subtitle">
              Manage public holidays used for payroll and compliance.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              console.log("BUTTON CLICKED");
              setShowModal(true);
            }}
          >
            + Add Holiday
          </button>
        </div>

        <div className="employee-toolbar">
          <input
            placeholder="Search holidays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredHolidays.map((holiday) => (
                <tr key={holiday.holiday_id}>
                  <td>HOL{String(holiday.holiday_id).padStart(3, "0")}</td>
                  <td>{holiday.holiday_name}</td>
                  <td>{holiday.holiday_date}</td>
                  <td>Public Holiday</td>
                  <td>
                    <span className="status-approved">Active</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(holiday)}
                      >
                        ✎
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(holiday)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">Showing 1 to 5 of 5 entries</p>
        </div>
      </section>

      {showModal && (
        <HolidayModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createHoliday.isPending}
        />
      )}


    </Layout>
  );
}

export default Holidays;