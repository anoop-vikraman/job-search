import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { notificationsApi } from '../api/notifications';
import type { Notification } from '../types/api';
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
