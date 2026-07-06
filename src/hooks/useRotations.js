import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rotationApi } from '../api/rotationApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useRotations = () =>
  useQuery({
    queryKey: QUERY_KEYS.ROTATIONS,
    queryFn: rotationApi.getAll,
    select: (d) => d.data,
  });

export const useRotation = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.ROTATION(id),
    queryFn: () => rotationApi.getById(id),
    select: (d) => d.data,
    enabled: !!id,
  });

export const useActiveRotations = () =>
  useQuery({
    queryKey: QUERY_KEYS.ROTATION_ACTIVE,
    queryFn: rotationApi.getActive,
    select: (d) => d.data,
  });

export const useCreateRotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rotationApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS }),
  });
};

export const useUpdateRotation = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => rotationApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATION(id) });
    },
  });
};

export const useUpdateRotationDetails = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (details) => rotationApi.updateDetails(id, details),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATION(id) }),
  });
};

export const useDeleteRotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rotationApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.ROTATIONS }),
  });
};