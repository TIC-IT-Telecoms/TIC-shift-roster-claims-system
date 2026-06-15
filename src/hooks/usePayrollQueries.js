import { useQuery } from "@tanstack/react-query";
import { payrollApi } from "../api/payrollApi";
import { QUERY_KEYS } from "../utils/queryKeys";

export const usePayrolls = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.PAYROLLS(params),
    queryFn: async () => {
      const res = await payrollApi.getAll(params);
      return res.data;
    },
    placeholderData: (previous) => previous,
  });