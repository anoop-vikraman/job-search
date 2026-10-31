import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { watchlistApi } from '../api/watchlist';
import type { Tweak } from '../store/useTweaksStore';
import { backendTweakToLocal } from '../utils/tweakAdapter';
import { queryKeys } from './queryKeys';

export function useWatchlist(): UseQueryResult<Tweak[]> {
    return useQuery({
        queryKey: queryKeys.watchlist(),
        queryFn: async (): Promise<Tweak[]> => {
            const items = await watchlistApi.list();
            return items.map((t) => backendTweakToLocal(t));
        },
    });
}

export function useAddToWatchlist(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (tweakId: string) => watchlistApi.add(tweakId),
        onSuccess: (_result, tweakId) => {
            qc.invalidateQueries({ queryKey: queryKeys.watchlist() });
            qc.invalidateQueries({ queryKey: queryKeys.tweak(tweakId) });
        },
    });
}

export function useRemoveFromWatchlist(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (tweakId: string) => watchlistApi.remove(tweakId),
        onSuccess: (_result, tweakId) => {
            qc.invalidateQueries({ queryKey: queryKeys.watchlist() });
            qc.invalidateQueries({ queryKey: queryKeys.tweak(tweakId) });
        },
    });
}
