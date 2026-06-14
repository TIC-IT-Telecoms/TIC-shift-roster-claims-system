import Layout from "../components/Layout";

const approvalsData = [
  ["#CLM2027", "20/05/2025", "Night Shift", "8", "2", "No", "Pending"],
  ["#CLM2026", "19/05/2025", "Day Shift", "8", "1", "No", "Pending"],
  ["#CLM2025", "18/05/2025", "Grave Shift", "8", "0", "Yes", "Pending"],
  ["#CLM2024", "16/05/2025", "Night Shift", "8", "2", "No", "Approved"],
];

function MyApprovals() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Approvals</div>

        <div className="page-title-row">
          <div>
            <h2>My Approvals</h2>
            <p className="subtitle">Review claims waiting for approval.</p>
          </div>

          <button className="primary-btn">Filter</button>
        </div>

        <div className="claims-tabs">
          <button className="active">Pending (3)</button>
          <button>Approved (1)</button>
          <button>Rejected (0)</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Hours</th>
                <th>OT Hours</th>
                <th>Holiday</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {approvalsData.map((claim, index) => (
                <tr key={index}>
                  <td>{claim[0]}</td>
                  <td>{claim[1]}</td>
                  <td>{claim[2]}</td>
                  <td>{claim[3]}</td>
                  <td>{claim[4]}</td>
                  <td>{claim[5]}</td>
                  <td>
                    <span
                      className={
                        claim[6] === "Approved"
                          ? "status-approved"
                          : "status-pending"
                      }
                    >
                      {claim[6]}
                    </span>
                  </td>
                  <td>
                    <div className="approval-actions">
                      <button className="approve-btn">✓</button>
                      <button className="reject-btn">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">Showing 1 to 4 of 4 entries</p>
        </div>
      </section>
    </Layout>
  );
}

export default MyApprovals;