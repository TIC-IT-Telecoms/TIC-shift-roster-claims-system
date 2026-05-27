import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useEmployees = () =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES,
    queryFn: employeeApi.getAll,
    select: (data) => data.data,
  });

export const useEmployee = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE(id),
    queryFn: () => employeeApi.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeeApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES }),
  });
};

export const useUpdateEmployee = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => employeeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE(id) });
    },
  });
};

export const useDeactivateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeeApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES }),
  });
};