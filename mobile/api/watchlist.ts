import api from '../utils/api';
import type { BackendTweak } from '../types/api';

export const watchlistApi = {
    list: async (): Promise<BackendTweak[]> => {
        const res = await api.get('/api/v1/watchlist');
        return res.data;
    },

    add: async (tweakId: string): Promise<void> => {
        await api.post(`/api/v1/watchlist/${tweakId}`);
    },

    remove: async (tweakId: string): Promise<void> => {
        await api.delete(`/api/v1/watchlist/${tweakId}`);
    },
};
