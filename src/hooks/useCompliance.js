import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complianceApi } from "../api/complianceApi";

/**
 * Hook to stream compliance violation records from the database
 */
export const useComplianceFlags = (params = {}) => {
  return useQuery({
    queryKey: ['compliance', 'flags', params],
    queryFn: () => complianceApi.getFlags(params),
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook to dismiss/resolve active statutory exceptions
 */
export const useResolveComplianceFlag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: complianceApi.resolveFlag,
    onSuccess: (response) => {
      // Refresh compliance charts, alerts, and tables immediately across views
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      console.log("Exception dismissed successfully:", response.message);
    },
    onError: (err) => {
      console.error("Resolution override failed:", err.message);
      alert(`Override Error: ${err.message}`);
    },
  });
};