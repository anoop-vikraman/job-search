import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { notificationsApi } from '../api/notifications';
import type { Notification, NotificationPreferences } from '../types/api';
import { queryKeys } from './queryKeys';

export function useNotifications(): UseQueryResult<Notification[]> {
    return useQuery({
        queryKey: queryKeys.notifications(),
        queryFn: async (): Promise<Notification[]> => {
            const page = await notificationsApi.list({ page: 1, limit: 50 });
            return page.items;
        },
    });
}

export function useUnreadCount(): UseQueryResult<number> {
    return useQuery({
        queryKey: queryKeys.notificationsUnread(),
        queryFn: async (): Promise<number> => {
            const res = await notificationsApi.unreadCount();
            return res.count;
        },
    });
}

export function useMarkAllRead(): UseMutationResult<void, Error, void> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.notifications() });
            qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread() });
        },
    });
}

export function useMarkRead(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationsApi.markRead(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.notifications() });
            qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread() });
        },
    });
}

export function useNotificationPreferences(): UseQueryResult<NotificationPreferences> {
    return useQuery({
        queryKey: queryKeys.notificationPreferences(),
        queryFn: (): Promise<NotificationPreferences> => notificationsApi.getPreferences(),
    });
}

/** Toggle push for one notification type, optimistically. */
export function useSetPushPreference(): UseMutationResult<
    NotificationPreferences,
    Error,
    { type: string; enabled: boolean },
    { previous?: NotificationPreferences }
> {
    const qc = useQueryClient();
    const key = queryKeys.notificationPreferences();
    return useMutation({
        mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
            notificationsApi.updatePreferences({ [type]: enabled }),
        onMutate: async ({ type, enabled }) => {
            await qc.cancelQueries({ queryKey: key });
            const previous = qc.getQueryData<NotificationPreferences>(key);
            if (previous) {
                qc.setQueryData<NotificationPreferences>(key, { push: { ...previous.push, [type]: enabled } });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSuccess: (prefs) => qc.setQueryData(key, prefs),
    });
}
