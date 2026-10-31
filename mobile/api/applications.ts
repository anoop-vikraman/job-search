import api from '../utils/api';
import type {
    BackendApplication,
    CounterApplicationRequest,
    CreateApplicationRequest,
} from '../types/api';

export const applicationsApi = {
    apply: async (
        tweakId: string,
        data: CreateApplicationRequest
    ): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/${tweakId}/applications`, data);
        return res.data;
    },

    accept: async (id: string): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/applications/${id}/accept`);
        return res.data;
    },

    reject: async (id: string): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/applications/${id}/reject`);
        return res.data;
    },

    counter: async (
        id: string,
        data: CounterApplicationRequest
    ): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/applications/${id}/counter`, data);
        return res.data;
    },

    complete: async (id: string): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/applications/${id}/complete`);
        return res.data;
    },

    cancel: async (id: string): Promise<BackendApplication> => {
        const res = await api.post(`/api/v1/tweaks/applications/${id}/cancel`);
        return res.data;
    },
};
