import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { moderationApi } from '../api/moderation';
import type { BlockedUser, ReportCreateRequest, ReportResponse } from '../types/api';
import { queryKeys } from './queryKeys';

export function useReport(): UseMutationResult<ReportResponse, Error, ReportCreateRequest> {
    return useMutation({ mutationFn: (data: ReportCreateRequest) => moderationApi.report(data) });
}

export function useBlockedUsers(): UseQueryResult<BlockedUser[]> {
    return useQuery({
        queryKey: queryKeys.blockedUsers(),
        queryFn: (): Promise<BlockedUser[]> => moderationApi.listBlocked(),
    });
}

/** Block or unblock; refreshes everything a block affects (feed, chats, list). */
export function useSetBlocked(): UseMutationResult<void, Error, { userId: string; blocked: boolean }> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
            blocked ? moderationApi.block(userId) : moderationApi.unblock(userId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.blockedUsers() });
            qc.invalidateQueries({ queryKey: ['tweaks', 'feed'] });
            qc.invalidateQueries({ queryKey: queryKeys.conversations() });
        },
    });
}
