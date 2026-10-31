import api from '../utils/api';
import type {
    BackendApplication,
    BackendTweak,
    CreateTweakRequest,
    Page,
    UpdateTweakRequest,
} from '../types/api';

export interface TweakFeedParams {
    page?: number;
    limit?: number;
    category?: string;
}

export const tweaksApi = {
    feed: async (params: TweakFeedParams = {}): Promise<Page<BackendTweak>> => {
        const res = await api.get('/api/v1/tweaks', { params });
        return res.data;
    },

    mine: async (params: TweakFeedParams = {}): Promise<Page<BackendTweak>> => {
        const res = await api.get('/api/v1/tweaks/mine', { params });
        return res.data;
    },

    get: async (id: string): Promise<BackendTweak> => {
        const res = await api.get(`/api/v1/tweaks/${id}`);
        return res.data;
    },

    create: async (data: CreateTweakRequest): Promise<BackendTweak> => {
        const res = await api.post('/api/v1/tweaks', data);
        return res.data;
    },

    update: async (id: string, data: UpdateTweakRequest): Promise<BackendTweak> => {
        const res = await api.patch(`/api/v1/tweaks/${id}`, data);
        return res.data;
    },

    remove: async (id: string): Promise<void> => {
        await api.delete(`/api/v1/tweaks/${id}`);
    },

    listApplications: async (id: string): Promise<BackendApplication[]> => {
        const res = await api.get(`/api/v1/tweaks/${id}/applications`);
        return res.data;
    },
};
