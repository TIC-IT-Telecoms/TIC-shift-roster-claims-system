// src/hooks/useProfile.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useProfile = () =>
  useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileApi.getProfile,
    select: (d) => d.data,
  });

export const useUpdatePhone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updatePhone,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });
};

export const useChangePassword = () =>
  useMutation({ mutationFn: profileApi.changePassword });

export const useUpdatePicture = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updatePicture,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });
};
