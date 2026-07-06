import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { complianceApi } from '../api/complianceApi';

const KEY = 'compliance';

export const useComplianceFlags = (params = {}) => {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => complianceApi.getAll(params),
    select: (d) => d.data,
  });
};

export const useMyComplianceFlags = () => {
  return useQuery({
    queryKey: [KEY, 'me'],
    queryFn: complianceApi.getMine,
    select: (d) => d.data,
  });
};

export const useRunComplianceCheck = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: complianceApi.check,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useRunBulkCheck = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: complianceApi.checkAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useResolveFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }) => complianceApi.resolve(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => complianceApi.delete(id),
    onMutate: async (id) => {
      // Optimistic removal
      await qc.cancelQueries({ queryKey: [KEY] });
      const snap = qc.getQueriesData({ queryKey: [KEY] });
      qc.setQueriesData({ queryKey: [KEY] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((f) => f.compliance_id !== id);
      });
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};