import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { walletApi } from '../api/wallet';
import type { TopupRequest, Transaction, Wallet } from '../types/api';
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

export function useTopup(): UseMutationResult<Wallet, Error, TopupRequest> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: TopupRequest) => walletApi.topup(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.wallet() });
            qc.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
        },
    });
}
