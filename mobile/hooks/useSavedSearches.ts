import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { savedSearchesApi } from '../api/savedSearches';
import i18n from '../utils/i18n';
import type { SavedSearch, SavedSearchCreate } from '../types/api';
import { queryKeys } from './queryKeys';

export function useSavedSearches(): UseQueryResult<SavedSearch[]> {
    return useQuery({
        queryKey: queryKeys.savedSearches(),
        queryFn: (): Promise<SavedSearch[]> => savedSearchesApi.list(),
    });
}

export function useCreateSavedSearch(): UseMutationResult<SavedSearch, Error, SavedSearchCreate> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SavedSearchCreate) => savedSearchesApi.create(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.savedSearches() }),
    });
}

export function useDeleteSavedSearch(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => savedSearchesApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.savedSearches() }),
    });
}

/** Human summary of a saved search's filters. */
export function describeSavedSearch(s: Pick<SavedSearch, 'search' | 'category' | 'tweak_type' | 'radius_km'>): string {
    const parts: string[] = [];
    if (s.search) parts.push(`“${s.search}”`);
    if (s.category) parts.push(s.category);
    if (s.tweak_type) parts.push(i18n.t(s.tweak_type === 'remote' ? 'common.remote' : 'common.onsite'));
    if (s.radius_km != null) parts.push(i18n.t('savedAlerts.withinKm', { km: s.radius_km }));
    return parts.join(' · ');
}
