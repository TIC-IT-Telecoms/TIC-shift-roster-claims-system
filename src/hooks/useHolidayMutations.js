import { useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayApi } from '../api/holidayApi';
import { QUERY_KEYS } from '../utils/queryKeys';

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
    mutationFn: ({ id, data }) => holidayApi.update(id, data),

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['holidays'],
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.HOLIDAY(id),
      });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidayApi.remove,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['holidays'],
      });
    },
  });
};