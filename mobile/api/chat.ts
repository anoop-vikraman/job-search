import api from '../utils/api';
import type { ChatMessage, Conversation, Page, UnreadCount } from '../types/api';

export interface ChatPageParams {
    page?: number;
    limit?: number;
}

export const chatApi = {
    list: async (params: ChatPageParams = {}): Promise<Page<Conversation>> => {
        const res = await api.get('/api/v1/conversations', { params });
        return res.data;
    },
    /** Get-or-create the conversation for an accepted application. */
    open: async (applicationId: string): Promise<Conversation> => {
        const res = await api.post('/api/v1/conversations', { application_id: applicationId });
        return res.data;
    },
    get: async (id: string): Promise<Conversation> => {
        const res = await api.get(`/api/v1/conversations/${id}`);
        return res.data;
    },
    /** Newest first. */
    messages: async (id: string, params: ChatPageParams = {}): Promise<Page<ChatMessage>> => {
        const res = await api.get(`/api/v1/conversations/${id}/messages`, { params });
        return res.data;
    },
    /** Text and/or up to 4 photos (URLs from POST /media/upload). */
    send: async (id: string, body: string, attachmentUrls: string[] = []): Promise<ChatMessage> => {
        const res = await api.post(`/api/v1/conversations/${id}/messages`, {
            body,
            attachment_urls: attachmentUrls,
        });
        return res.data;
    },
    markRead: async (id: string): Promise<void> => {
        await api.post(`/api/v1/conversations/${id}/read`);
    },
    unreadCount: async (): Promise<UnreadCount> => {
        const res = await api.get('/api/v1/conversations/unread-count');
        return res.data;
    },
};
