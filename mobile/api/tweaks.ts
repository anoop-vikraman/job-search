import api from '../utils/api';
import type {
    BackendApplicationDetail,
    BackendMyApplication,
    BackendTweak,
    CreateTweakRequest,
    FeedSort,
    Page,
    UpdateTweakRequest,
} from '../types/api';

export interface TweakFeedParams {
    page?: number;
    limit?: number;
    category?: string;
    /** Matches title, description, category and skills (case-insensitive). */
    search?: string;
    lat?: number;
    lng?: number;
    radius_km?: number;
    sort?: FeedSort;
}

export const tweaksApi = {
    feed: async (params: TweakFeedParams = {}): Promise<Page<BackendTweak>> => {
        const res = await api.get('/api/v1/tweaks', { params });
        return res.data;
    },

    /** All of the caller's tweaks (any status). Unpaginated: the backend returns a plain list. */
    mine: async (): Promise<BackendTweak[]> => {
        const res = await api.get('/api/v1/tweaks/mine');
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

    listApplications: async (id: string): Promise<BackendApplicationDetail[]> => {
        const res = await api.get(`/api/v1/tweaks/${id}/applications`);
        return res.data;
    },

    myApplications: async (): Promise<BackendMyApplication[]> => {
        const res = await api.get('/api/v1/tweaks/applications/mine');
        return res.data;
    },
};
