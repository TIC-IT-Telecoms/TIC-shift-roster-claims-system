import React from "react";
import Layout from "../components/Layout";
import { usePayrollHistory } from "../hooks/usePayroll";
import { formatZAR, formatDateTime } from "../utils/helpers";

function AdminPayroll() {
  const { data: response, isLoading, isError } = usePayrollHistory();

  const payrollList = response?.data || [];

  // Compute live aggregate metadata for summary metric rows
  const uniqueEmployeeIds = new Set(payrollList.map((p) => p.employee_id));
  const aggregateTotal = payrollList.reduce((acc, curr) => acc + Number(curr.total_pay || 0), 0);
  const aggregateOvertime = payrollList.reduce((acc, curr) => acc + Number(curr.overtime_pay || 0), 0);
  const aggregateHoliday = payrollList.reduce((acc, curr) => acc + Number(curr.holiday_pay || 0), 0);

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Payroll Management</div>

        <div className="page-title-row">
          <div>
            <h2>System Payroll Logs</h2>
            <p className="subtitle">Review and manage consolidated statutory worker payroll runs.</p>
          </div>

          <div className="page-actions">
            <a href="/payroll-admin/generate" className="primary-btn">Generate Payroll</a>
            <button className="filter-btn">Export Log ⌄</button>
          </div>
        </div>

        {/* Dynamic Metric Display Panels */}
        <div className="payroll-admin-summary">
          <div className="claim-summary-card">
            <span>Active Employees Paid</span>
            <h3>{uniqueEmployeeIds.size}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Total Gross Expense</span>
            <h3>{formatZAR(aggregateTotal)}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Overtime Component</span>
            <h3>{formatZAR(aggregateOvertime)}</h3>
          </div>

          <div className="claim-summary-card">
            <span>Holiday Premium</span>
            <h3>{formatZAR(aggregateHoliday)}</h3>
          </div>
        </div>

        <div className="roster-table-card">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 font-medium">Streaming payroll records...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 font-medium">Failed to read calculation states from backend database.</div>
          ) : payrollList.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No generated payroll instances found in the log history.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Pay Period</th>
                    <th>Normal Pay</th>
                    <th>Overtime Pay (1.5x)</th>
                    <th>Holiday Pay (2.0x)</th>
                    <th>Grave Shift Allowance</th>
                    <th>Total Gross Pay</th>
                    <th>Calculation Timestamp</th>
                  </tr>
                </thead>

                <tbody>
                  {payrollList.map((record) => (
                    <tr key={record.payroll_id}>
                      <td>
                        <div className="font-semibold text-gray-900">{record.employee?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{record.employee?.email || `ID: ${record.employee_id}`}</div>
                      </td>
                      <td className="text-sm whitespace-nowrap">
                        {record.pay_period_start} to {record.pay_period_end}
                      </td>
                      <td>{formatZAR(record.normal_pay)}</td>
                      <td>{formatZAR(record.overtime_pay)}</td>
                      <td>{formatZAR(record.holiday_pay)}</td>
                      <td>{formatZAR(record.grave_allowance)}</td>
                      <td>
                        <strong className="text-blue-700">{formatZAR(record.total_pay)}</strong>
                      </td>
                      <td className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(record.generated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && (
            <p className="roster-note mt-2">
              Showing {payrollList.length} processed pay slip item execution logs.<br />
              Note: Base rates configured individually on internal profiles. Holiday pay evaluates at double-time.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default AdminPayroll;