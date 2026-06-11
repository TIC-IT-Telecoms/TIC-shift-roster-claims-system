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
    mutationFn: claimApi.submitClaim,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useUpdateClaim = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => claimApi.updateClaim(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useResetClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimApi.resetClaim,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useDeleteClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimApi.deleteClaim,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};