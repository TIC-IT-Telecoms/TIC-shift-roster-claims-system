import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { claimApi } from '../api/claimApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useMyClaims = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_CLAIMS(params),
    queryFn: () => claimApi.getMyClaims(params),
    select: (data) => data.data,
  });

export const useAllClaims = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.CLAIMS(params),
    queryFn: () => claimApi.getAll(params),
    select: (data) => data.data,
  });

export const useSubmitClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimApi.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useUpdateClaim = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => claimApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useResetClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimApi.reset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useDeleteClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};