import api from '../utils/api';
import type { CreateRefundRequest, Refund } from '../types/api';

export const refundsApi = {
    list: async (): Promise<Refund[]> => {
        const res = await api.get('/api/v1/refunds');
        return res.data;
    },

    request: async (data: CreateRefundRequest): Promise<Refund> => {
        const res = await api.post('/api/v1/refunds', data);
        return res.data;
    },
};
