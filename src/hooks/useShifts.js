import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../api/shiftApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useShifts = () =>
  useQuery({
    queryKey: QUERY_KEYS.SHIFTS,
    queryFn: shiftApi.getAll,
    select: (data) => data.data,
    staleTime: 1000 * 60 * 10,
  });

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shiftApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS }),
  });
};

export const useUpdateShift = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => shiftApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS }),
  });
};

export const useDeleteShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shiftApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SHIFTS }),
  });
};