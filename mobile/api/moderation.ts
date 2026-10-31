import api from '../utils/api';
import type { BlockedUser, ReportCreateRequest, ReportResponse } from '../types/api';

export const moderationApi = {
    report: async (data: ReportCreateRequest): Promise<ReportResponse> => {
        const res = await api.post('/api/v1/reports', data);
        return res.data;
    },
    block: async (userId: string): Promise<void> => {
        await api.post(`/api/v1/users/${userId}/block`);
    },
    unblock: async (userId: string): Promise<void> => {
        await api.delete(`/api/v1/users/${userId}/block`);
    },
    listBlocked: async (): Promise<BlockedUser[]> => {
        const res = await api.get('/api/v1/users/me/blocks');
        return res.data;
    },
};
