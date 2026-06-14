import { useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayApi } from '../api/holidayApi';

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidayApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['holidays'],
      });
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) =>
      holidayApi.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['holidays'],
      });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      holidayApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['holidays'],
      });
    },
  });
};