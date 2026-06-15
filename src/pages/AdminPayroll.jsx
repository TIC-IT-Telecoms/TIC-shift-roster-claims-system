import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { usePayrolls } from "../hooks/usePayrollQueries";
import { formatZAR, getMonthRange } from "../utils/helpers";

function AdminPayroll() {
  const navigate = useNavigate();

  const { start_date, end_date } = getMonthRange();

  const {
    data: payrolls = [],
    isLoading,
    isError,
  } = usePayrolls({
    pay_period_start: start_date,
    pay_period_end: end_date,
  });

  // ===== Summary =====
  const totalEmployees = payrolls.length;

  const totalPayroll = payrolls.reduce(
    (sum, payroll) => sum + Number(payroll.total_pay || 0),
    0
  );

  const totalOvertime = payrolls.reduce(
    (sum, payroll) => sum + Number(payroll.overtime_pay || 0),
    0
  );

  const totalHolidayPay = payrolls.reduce(
    (sum, payroll) => sum + Number(payroll.holiday_pay || 0),
    0
  );

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">
          Dashboard &gt; Payroll
        </div>

        <div className="page-title-row">
          <div>
            <h2>Payroll</h2>
            <p className="subtitle">
              Generate and review employee payroll summaries.
            </p>
          </div>

          <div className="page-actions">
            <button
              className="primary-btn"
              onClick={() => navigate("/payroll-admin/generate")}
            >
              Generate Payroll
            </button>

            <button className="filter-btn">
              Export ⌄
            </button>
          </div>
        </div>

        {/* ===== Summary Cards ===== */}
        <div className="payroll-admin-summary">
          <div className="claim-summary-card">
            <span>Total Employees</span>
            <h3>{totalEmployees}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Total Payroll</span>
            <h3>{formatZAR(totalPayroll)}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Overtime Pay</span>
            <h3>{formatZAR(totalOvertime)}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Holiday Pay</span>
            <h3>{formatZAR(totalHolidayPay)}</h3>
          </div>
        </div>

        {/* ===== Payroll Table ===== */}
        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Team</th>
                <th>Normal Pay</th>
                <th>Overtime Pay</th>
                <th>Holiday Pay</th>
                <th>Grave Allowance</th>
                <th>Total Pay</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    Loading payroll records...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "#b42318",
                    }}
                  >
                    Failed to load payroll records.
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    No payroll records found.
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll.payroll_id}>
                    <td>
                      {payroll.employee?.name || "—"}
                    </td>

                    <td>
                      {payroll.employee?.team?.team_name || "—"}
                    </td>

                    <td>
                      {formatZAR(payroll.normal_pay)}
                    </td>

                    <td>
                      {formatZAR(payroll.overtime_pay)}
                    </td>

                    <td>
                      {formatZAR(payroll.holiday_pay)}
                    </td>

                    <td>
                      {formatZAR(payroll.grave_allowance)}
                    </td>

                    <td>
                      <strong>
                        {formatZAR(payroll.total_pay)}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="view-link"
                        onClick={() =>
                          navigate(
                            `/payroll/${payroll.payroll_id}`
                          )
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p className="roster-note">
            Showing {payrolls.length} payroll record
            {payrolls.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default AdminPayroll;