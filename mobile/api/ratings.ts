import api from '../utils/api';
import type { CreateRatingRequest, Rating } from '../types/api';

export const ratingsApi = {
    create: async (data: CreateRatingRequest): Promise<Rating> => {
        const res = await api.post('/api/v1/ratings', data);
        return res.data;
    },
};
