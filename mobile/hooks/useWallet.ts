import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { kycApi, type KycSubmitInput } from '../api/kyc';
import { walletApi } from '../api/wallet';
import type {
    KycStatusResponse,
    KycSubmission,
    Payout,
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

export function usePayouts(): UseQueryResult<Payout[]> {
    return useQuery({
        queryKey: queryKeys.payouts(),
        queryFn: async (): Promise<Payout[]> => (await walletApi.listPayouts()).items,
    });
}

export function useRequestPayout(): UseMutationResult<Payout, Error, number> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (amountMinor: number) => walletApi.requestPayout(amountMinor),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.payouts() });
            qc.invalidateQueries({ queryKey: queryKeys.wallet() });
            qc.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
        },
    });
}

export function useKycStatus(): UseQueryResult<KycStatusResponse> {
    return useQuery({
        queryKey: queryKeys.kyc(),
        queryFn: (): Promise<KycStatusResponse> => kycApi.status(),
    });
}

export function useSubmitKyc(): UseMutationResult<KycSubmission, Error, KycSubmitInput> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: KycSubmitInput) => kycApi.submit(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kyc() }),
    });
}
