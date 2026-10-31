import {
    useMutation,
    useQuery,
    useQueryClient,
    type QueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { applicationsApi } from '../api/applications';
import type { BackendApplication, Dispute, DisputeCreateRequest, WorkSubmitRequest } from '../types/api';
import { queryKeys } from './queryKeys';

function refreshApplication(qc: QueryClient, tweakId: string): void {
    qc.invalidateQueries({ queryKey: queryKeys.tweak(tweakId) });
    qc.invalidateQueries({ queryKey: queryKeys.tweakApplications(tweakId) });
    qc.invalidateQueries({ queryKey: queryKeys.myApplications() });
    qc.invalidateQueries({ queryKey: queryKeys.wallet() });
}

export interface SubmitWorkArgs {
    applicationId: string;
    tweakId: string;
    data: WorkSubmitRequest;
}

/** Provider: mark accepted work done. */
export function useSubmitWork(): UseMutationResult<BackendApplication, Error, SubmitWorkArgs> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ applicationId, data }: SubmitWorkArgs) => applicationsApi.submitWork(applicationId, data),
        onSuccess: (_res, { tweakId }) => refreshApplication(qc, tweakId),
    });
}

export interface OpenDisputeArgs {
    applicationId: string;
    tweakId: string;
    data: DisputeCreateRequest;
}

/** Lister or provider: freeze escrow and ask support to decide. */
export function useOpenDispute(): UseMutationResult<Dispute, Error, OpenDisputeArgs> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ applicationId, data }: OpenDisputeArgs) => applicationsApi.openDispute(applicationId, data),
        onSuccess: (dispute, { applicationId, tweakId }) => {
            qc.setQueryData(queryKeys.dispute(applicationId), dispute);
            refreshApplication(qc, tweakId);
        },
    });
}

/** Latest dispute on an application (only fetch when the application is/was disputed). */
export function useDispute(applicationId: string | undefined, enabled: boolean): UseQueryResult<Dispute> {
    return useQuery({
        queryKey: queryKeys.dispute(applicationId ?? ''),
        enabled: Boolean(applicationId) && enabled,
        queryFn: (): Promise<Dispute> => applicationsApi.getDispute(applicationId as string),
    });
}
