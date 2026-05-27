import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamApi } from '../api/teamApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useTeams = () =>
  useQuery({
    queryKey: QUERY_KEYS.TEAMS,
    queryFn: teamApi.getAll,
    select: (data) => data.data,
  });

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS }),
  });
};

export const useUpdateTeam = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => teamApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAM(id) });
    },
  });
};

export const useDeleteTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teamApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAMS }),
  });
};