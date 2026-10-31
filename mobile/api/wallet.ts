import api from '../utils/api';
import type {
    Page,
    Payout,
    RazorpaySuccess,
    TopupOrder,
    TopupVerifyResponse,
    Transaction,
    Wallet,
} from '../types/api';

export interface TransactionListParams {
    page?: number;
    limit?: number;
}

export const walletApi = {
    getWallet: async (): Promise<Wallet> => {
        const res = await api.get('/api/v1/wallet');
        return res.data;
    },
    /** Step 1 of a gateway top-up: create the Razorpay order. */
    createTopupOrder: async (amountMinor: number): Promise<TopupOrder> => {
        const res = await api.post('/api/v1/wallet/topup/order', { amount_minor: amountMinor });
        return res.data;
    },
    /** Step 2: hand Checkout's result to the backend, which verifies and credits (idempotent). */
    verifyTopup: async (result: RazorpaySuccess): Promise<TopupVerifyResponse> => {
        const res = await api.post('/api/v1/wallet/topup/verify', result);
        return res.data;
    },
    /** Withdraw to the verified UPI id (requires approved KYC). */
    requestPayout: async (amountMinor: number): Promise<Payout> => {
        const res = await api.post('/api/v1/wallet/payouts', { amount_minor: amountMinor });
        return res.data;
    },
    listPayouts: async (): Promise<Page<Payout>> => {
        const res = await api.get('/api/v1/wallet/payouts', { params: { page: 1, limit: 20 } });
        return res.data;
    },
    listTransactions: async (
        params: TransactionListParams = {}
    ): Promise<Page<Transaction>> => {
        const res = await api.get('/api/v1/wallet/transactions', { params });
        return res.data;
    },
};
