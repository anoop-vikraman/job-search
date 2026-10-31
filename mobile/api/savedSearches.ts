import api from '../utils/api';
import type { SavedSearch, SavedSearchCreate } from '../types/api';

export const savedSearchesApi = {
    list: async (): Promise<SavedSearch[]> => {
        const res = await api.get('/api/v1/saved-searches');
        return res.data;
    },
    create: async (data: SavedSearchCreate): Promise<SavedSearch> => {
        const res = await api.post('/api/v1/saved-searches', data);
        return res.data;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/api/v1/saved-searches/${id}`);
    },
};
