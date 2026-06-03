import React, { useState } from "react";
import Layout from "../components/Layout";
import { useComplianceFlags, useResolveComplianceFlag } from "../hooks/useCompliance";
import { formatDate } from "../utils/helpers";

function Compliance() {
  // State filter to toggle between All, Open, or Resolved flags
  const [resolvedFilter, setResolvedFilter] = useState("all");

  // Build backend query payload based on active interactive tab selection
  const queryParams = {};
  if (resolvedFilter === "open") queryParams.resolved = "false";
  if (resolvedFilter === "resolved") queryParams.resolved = "true";

  // Stream live database records
  const { data: response, isLoading, isError } = useComplianceFlags(queryParams);
  const resolveFlagMutation = useResolveComplianceFlag();

  const handleResolve = (flagId) => {
    if (window.confirm("Are you sure you want to log a manual resolution override for this flag?")) {
      resolveFlagMutation.mutate(flagId);
    }
  };

  const flagsList = response?.data || [];

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Compliance Exceptions</div>

        {/* Filter Toolbar controls */}
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setResolvedFilter("all")}
              className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${
                resolvedFilter === "all" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Flags
            </button>
            <button
              onClick={() => setResolvedFilter("open")}
              className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${
                resolvedFilter === "open" ? "bg-white shadow-sm text-red-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Active Exceptions
            </button>
            <button
              onClick={() => setResolvedFilter("resolved")}
              className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${
                resolvedFilter === "resolved" ? "bg-white shadow-sm text-green-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Resolved Exceptions
            </button>
          </div>
        </div>

        <div className="roster-table-card">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 font-medium">Loading statutory exceptions matrix...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 font-medium">Failed to retrieve compliance records from database.</div>
          ) : flagsList.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No statutory rule exceptions found matching this filter criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Date Checked</th>
                    <th>Statutory Rule Violated</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th className="text-center">Action Overrides</th>
                  </tr>
                </thead>

                <tbody>
                  {flagsList.map((flag) => (
                    <tr key={flag.compliance_id}>
                      <td className="font-semibold text-gray-700">CMP-{String(flag.compliance_id).padStart(3, "0")}</td>
                      <td>
                        <div className="font-medium text-gray-900">{flag.employee?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{flag.employee?.email || `ID: ${flag.employee_id}`}</div>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(flag.flag_date)}</td>
                      <td className="font-medium text-amber-900">{flag.rule_violated}</td>
                      <td className="text-xs max-w-xs text-gray-600 line-clamp-2" title={flag.description}>
                        {flag.description}
                      </td>
                      <td>
                        <span
                          className={
                            flag.severity === "High"
                              ? "severity-high"
                              : flag.severity === "Medium"
                              ? "severity-medium"
                              : "severity-low"
                          }
                        >
                          {flag.severity}
                        </span>
                      </td>
                      <td>
                        <span className={flag.resolved ? "status-approved" : "status-rejected"}>
                          {flag.resolved ? "Resolved" : "Open Exceptions"}
                        </span>
                      </td>
                      <td className="text-center">
                        {flag.resolved ? (
                          <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                            ✅ Complete
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleResolve(flag.compliance_id)}
                            disabled={resolveFlagMutation.isPending}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded transition-colors border border-blue-200 disabled:opacity-50"
                            title="Mark as resolved with administrative manager override"
                          >
                            {resolveFlagMutation.isPending && resolveFlagMutation.variables === flag.compliance_id 
                              ? "Saving..." 
                              : "Resolve Override"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && (
            <p className="roster-note">
              Showing {flagsList.length} exception {flagsList.length === 1 ? "entry" : "entries"} logged in system.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default Compliance;