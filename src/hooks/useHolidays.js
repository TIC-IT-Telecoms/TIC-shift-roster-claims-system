import { useQuery } from '@tanstack/react-query';
import { holidayApi } from '../api/holidayApi';

export const useHolidays = () =>
  useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidayApi.getAll(),
    select: (res) => res.data,
  });