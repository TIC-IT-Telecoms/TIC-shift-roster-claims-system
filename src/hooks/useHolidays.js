import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayApi } from '../api/holidayApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useHolidays = (year) =>
  useQuery({
    queryKey: QUERY_KEYS.HOLIDAYS(year),
    queryFn: () => holidayApi.getAll(year),
    select: (data) => data.data,
    staleTime: 1000 * 60 * 60,
  });

export const useCheckHoliday = (date) =>
  useQuery({
    queryKey: QUERY_KEYS.HOLIDAY_CHECK(date),
    queryFn: () => holidayApi.checkDate(date),
    select: (data) => data.data,
    enabled: !!date,
    staleTime: 1000 * 60 * 60,
  });

export const useCreateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holidayApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
};

export const useBulkCreateHolidays = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holidayApi.bulkCreate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
};