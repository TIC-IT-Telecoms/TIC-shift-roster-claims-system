import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rosterApi } from '../api/rosterApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useRosters = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.ROSTERS(params),
    queryFn: () => rosterApi.getAll(params),
    select: (data) => data.data,
    enabled: !!params?.start_date && !!params?.end_date,
  });

export const useMyRoster = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_ROSTER(params),
    queryFn: () => rosterApi.getMyRoster(params),
    select: (data) => data.data,
    enabled: !!params?.start_date && !!params?.end_date,
  });

export const useGenerateRoster = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rosterApi.generate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rosters'] }),
  });
};

export const useUpdateRosterEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => rosterApi.updateEntry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rosters'] }),
  });
};