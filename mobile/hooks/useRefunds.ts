import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { refundsApi } from '../api/refunds';
import type { CreateRefundRequest, Refund } from '../types/api';
import { queryKeys } from './queryKeys';

export function useRefunds(): UseQueryResult<Refund[]> {
    return useQuery({
        queryKey: queryKeys.refunds(),
        queryFn: (): Promise<Refund[]> => refundsApi.list(),
    });
}

export function useRequestRefund(): UseMutationResult<
    Refund,
    Error,
    CreateRefundRequest
> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateRefundRequest) => refundsApi.request(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.refunds() });
        },
    });
}
