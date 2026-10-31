import api from '../utils/api';
import type { Notification, NotificationPreferences, Page, UnreadCount } from '../types/api';

export interface NotificationListParams {
    page?: number;
    limit?: number;
}

export const notificationsApi = {
    list: async (
        params: NotificationListParams = {}
    ): Promise<Page<Notification>> => {
        const res = await api.get('/api/v1/notifications', { params });
        return res.data;
    },

    unreadCount: async (): Promise<UnreadCount> => {
        const res = await api.get('/api/v1/notifications/unread-count');
        return res.data;
    },

    markAllRead: async (): Promise<void> => {
        await api.post('/api/v1/notifications/read-all');
    },

    markRead: async (id: string): Promise<void> => {
        await api.post(`/api/v1/notifications/${id}/read`);
    },
    getPreferences: async (): Promise<NotificationPreferences> => {
        const res = await api.get('/api/v1/notifications/preferences');
        return res.data;
    },
    /** Send only the types to change; the response has every type. */
    updatePreferences: async (push: Record<string, boolean>): Promise<NotificationPreferences> => {
        const res = await api.put('/api/v1/notifications/preferences', { push });
        return res.data;
    },
};
