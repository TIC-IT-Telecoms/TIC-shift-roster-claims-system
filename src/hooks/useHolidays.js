import { useQuery } from '@tanstack/react-query';
import { holidayApi } from '../api/holidayApi';
import { QUERY_KEYS } from '../utils/queryKeys';

export const useHolidays = (year) =>
  useQuery({
    queryKey: QUERY_KEYS.HOLIDAYS(year),
    queryFn: async () => {
      const { data } = await holidayApi.getAll(year);
      return data;
    },
  });

export const useHoliday = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.HOLIDAY(id),
    queryFn: async () => {
      const { data } = await holidayApi.getById(id);
      return data;
    },
    enabled: !!id,
  });

export const useHolidayCheck = (date) =>
  useQuery({
    queryKey: QUERY_KEYS.HOLIDAY_CHECK(date),
    queryFn: async () => {
      const { data } = await holidayApi.checkByDate(date);
      return data;
    },
    enabled: !!date,
  });