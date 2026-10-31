import api from '../utils/api';
import type { Page, TopupRequest, Transaction, Wallet } from '../types/api';

export interface TransactionListParams {
    page?: number;
    limit?: number;
}

export const walletApi = {
    getWallet: async (): Promise<Wallet> => {
        const res = await api.get('/api/v1/wallet');
        return res.data;
    },

    topup: async (data: TopupRequest): Promise<Wallet> => {
        const res = await api.post('/api/v1/wallet/topup', data);
        return res.data;
    },

    listTransactions: async (
        params: TransactionListParams = {}
    ): Promise<Page<Transaction>> => {
        const res = await api.get('/api/v1/wallet/transactions', { params });
        return res.data;
    },
};
