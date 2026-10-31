import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import api from '../utils/api';
import type { PublicProfile } from '../types/api';
import { queryKeys } from './queryKeys';

export function usePublicProfile(userId: string | undefined): UseQueryResult<PublicProfile> {
    return useQuery({
        queryKey: queryKeys.publicProfile(userId ?? ''),
        enabled: Boolean(userId),
        queryFn: async (): Promise<PublicProfile> => {
            const res = await api.get(`/api/v1/users/${userId}/public`);
            return res.data;
        },
    });
}
