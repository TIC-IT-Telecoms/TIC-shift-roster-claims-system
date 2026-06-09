import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { QUERY_KEYS } from '../utils/queryKeys';

/**
 * @param {Object}  options
 * @param {number}  options.limit 
 * @param {boolean} options.unreadOnly
 * @param {boolean} options.enabled
 */
const useNotifications = ({
  limit = 50,
  unreadOnly = false,
  enabled = true,
} = {}) => {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, { limit, unreadOnly }],
    queryFn: () =>
      notificationApi.getAll({
        limit,
        ...(unreadOnly ? { unread_only: 'true' } : {}),
      }),
    select: (d) => d.data,
    refetchInterval: 30_000,
    enabled,
  });

  // ===== Mutations =====
  const markRead = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS }),
  });

  const markAllRead = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      const prev = qc.getQueryData(QUERY_KEYS.NOTIFICATIONS);
      qc.setQueryData(QUERY_KEYS.NOTIFICATIONS, (old) => {
        if (!old?.data?.notifications) return old;
        return {
          ...old,
          data: {
            ...old.data,
            notifications: old.data.notifications.filter(
              (n) => n.notification_id !== id
            ),
          },
        };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEYS.NOTIFICATIONS, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS }),
  });

  const clearRead = useMutation({
    mutationFn: notificationApi.clearRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS }),
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,
    total: data?.total || 0,
    isLoading,
    isError,
    markRead,
    markAllRead,
    deleteNotif,
    clearRead,
  };
};

export default useNotifications;
