import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { walletApi } from '../api/wallet';
import type {
    RazorpaySuccess,
    TopupOrder,
    TopupVerifyResponse,
    Transaction,
    Wallet,
} from '../types/api';
import { queryKeys } from './queryKeys';

export function useWallet(): UseQueryResult<Wallet> {
    return useQuery({
        queryKey: queryKeys.wallet(),
        queryFn: (): Promise<Wallet> => walletApi.getWallet(),
    });
}

export function useWalletTransactions(): UseQueryResult<Transaction[]> {
    return useQuery({
        queryKey: queryKeys.walletTransactions(),
        queryFn: async (): Promise<Transaction[]> => {
            const page = await walletApi.listTransactions({ page: 1, limit: 50 });
            return page.items;
        },
    });
}

/** Create a Razorpay order for `amountMinor`. */
export function useCreateTopupOrder(): UseMutationResult<TopupOrder, Error, number> {
    return useMutation({
        mutationFn: (amountMinor: number) => walletApi.createTopupOrder(amountMinor),
    });
}

/** Verify a completed Checkout payment; refreshes wallet + ledger on success. */
export function useVerifyTopup(): UseMutationResult<TopupVerifyResponse, Error, RazorpaySuccess> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (result: RazorpaySuccess) => walletApi.verifyTopup(result),
        onSuccess: (res) => {
            qc.setQueryData(queryKeys.wallet(), res.wallet);
            qc.invalidateQueries({ queryKey: queryKeys.wallet() });
            qc.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
            qc.invalidateQueries({ queryKey: queryKeys.notifications() });
        },
    });
}
