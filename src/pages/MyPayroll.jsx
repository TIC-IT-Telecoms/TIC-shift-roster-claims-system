import React from "react";
import Layout from "../components/Layout";
import { usePayrollHistory } from "../hooks/usePayroll";
import { formatZAR, formatDate } from "../utils/helpers";

function MyPayroll() {
  const { data: response, isLoading, isError } = usePayrollHistory();

  const payrollList = response?.data || [];

  // Identify the most recent payroll transaction to highlight as the active summary block
  const currentPayRun = payrollList[0] || null;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-500 font-medium">Loading safe space payslip dashboard...</div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="p-8 text-center text-red-500 font-medium">Failed to read payroll history.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Payroll History</div>

        {payrollList.length === 0 ? (
          <div className="bg-white border p-6 rounded-lg text-center text-gray-500">
            No payroll summaries or historical payslips generated for your profile yet.
          </div>
        ) : (
          <div className="payroll-grid">
            
            {/* 1. Left Side: Highlight Card displaying active breakdown metrics */}
            <div className="payroll-summary-card">
              <h3>
                Period Breakdown: <span className="text-sm font-normal text-gray-500">({currentPayRun.pay_period_start} to {currentPayRun.pay_period_end})</span>
              </h3>

              <div className="payroll-row mt-4">
                <span>Normal Worked Pay</span>
                <strong>{formatZAR(currentPayRun.normal_pay)}</strong>
              </div>

              <div className="payroll-row">
                <span>Overtime Component (1.5x)</span>
                <strong>{formatZAR(currentPayRun.overtime_pay)}</strong>
              </div>

              <div className="payroll-row">
                <span>Holiday Premium Allocation (2.0x)</span>
                <strong>{formatZAR(currentPayRun.holiday_pay)}</strong>
              </div>

              <div className="payroll-row">
                <span>Grave Shift Allowance Premium</span>
                <strong>{formatZAR(currentPayRun.grave_allowance)}</strong>
              </div>

              <div className="payroll-total border-t pt-2 mt-2">
                <span>Total Gross Earnings</span>
                <strong className="text-green-700 text-lg">{formatZAR(currentPayRun.total_pay)}</strong>
              </div>

              <p className="roster-note mt-4">
                Note: Standard statutory deductions and tax allocations are applied to final net transactions during deposit handling.
              </p>
            </div>

            {/* 2. Right Side: History List Collection mapping into download buttons */}
            <div className="payslip-card">
              <h3>Historical Payslip Downloads</h3>
              <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-1">
                {payrollList.map((item) => (
                  <div className="payslip-item flex justify-between items-center border p-3 rounded-lg hover:bg-gray-50 transition-colors" key={item.payroll_id}>
                    <div>
                      <strong className="block text-gray-800 text-sm">
                        End Date: {formatDate(item.pay_period_end)}
                      </strong>
                      <span className="text-blue-600 font-semibold text-sm">{formatZAR(item.total_pay)}</span>
                      <small className="block text-gray-400 text-xs">Period Start: {item.pay_period_start}</small>
                    </div>

                    <button 
                      onClick={() => alert(`Initiating secure local device PDF export sequence for Row Entry #${item.payroll_id}...`)}
                      className="download-btn bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                      title="Download compliance payslip statement"
                    >
                      ⬇
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </section>
    </Layout>
  );
}

export default MyPayroll;