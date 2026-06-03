import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../api/payrollApi";

/**
 * Hook to stream payroll logs from the database
 */
export const usePayrollHistory = () => {
  return useQuery({
    queryKey: ['payroll', 'history'],
    queryFn: payrollApi.getHistory,
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook for Admin to trigger calculations for an employee period
 */
export const useGeneratePayroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payrollApi.generate,
    onSuccess: (response) => {
      // Invalidate payroll states to automatically re-fetch totals across panels
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      console.log("Payroll engine calculation finalized:", response.message);
    },
    onError: (err) => {
      console.error("Payroll calculation failed:", err.message);
      alert(`Calculation Engine Error: ${err.message}`);
    },
  });
};