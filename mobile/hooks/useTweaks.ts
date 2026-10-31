import { useMemo } from 'react';
import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { tweaksApi, type TweakFeedParams } from '../api/tweaks';
import { applicationsApi } from '../api/applications';
import type {
    BackendApplication,
    BackendApplicationDetail,
    BackendMyApplication,
    CreateTweakRequest,
    UpdateTweakRequest,
} from '../types/api';
import type { Tweak, TweakApplication } from '../store/useTweaksStore';
import {
    backendApplicationToLocal,
    backendTweakToLocal,
} from '../utils/tweakAdapter';
import { queryKeys } from './queryKeys';

export type TweakFeedFilters = Omit<TweakFeedParams, 'page' | 'limit' | 'cursor'>;

const FEED_PAGE_SIZE = 20;

export interface TweaksFeed {
    tweaks: Tweak[];
    total: number;
    isFetching: boolean;
    isRefetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    /** Load the next page (no-op at the end or while loading). */
    loadMore: () => void;
    refetch: () => void;
}

/**
 * Infinite feed of tweaks from other users (GET /tweaks, keyset cursor), mapped to the
 * local shape. Search, location radius and sort run server-side; the previous results
 * stay on screen while a new filter combination loads.
 */
export function useTweaksFeed(filters: TweakFeedFilters = {}): TweaksFeed {
    const query = useInfiniteQuery({
        queryKey: queryKeys.tweaksFeed(filters),
        placeholderData: keepPreviousData,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) =>
            tweaksApi.feed({ limit: FEED_PAGE_SIZE, cursor: pageParam, ...filters }),
        getNextPageParam: (last) => last.next_cursor ?? undefined,
    });
    const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;
    const tweaks = useMemo(
        () => (data?.pages ?? []).flatMap((p) => p.items.map((t) => backendTweakToLocal(t))),
        [data]
    );
    return {
        tweaks,
        total: data?.pages[0]?.total ?? 0,
        isFetching: query.isFetching,
        isRefetching: query.isRefetching && !isFetchingNextPage,
        isFetchingNextPage,
        hasNextPage,
        loadMore: () => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        },
        refetch: () => void refetch(),
    };
}

/** The current user's tweaks (GET /tweaks/mine), mapped to the local shape. */
export function useMyTweaks(): UseQueryResult<Tweak[]> {
    return useQuery({
        queryKey: queryKeys.tweaksMine(),
        queryFn: async (): Promise<Tweak[]> => {
            const tweaks = await tweaksApi.mine();
            return tweaks.map((t) => backendTweakToLocal(t));
        },
    });
}

/** A single tweak with its applications attached, mapped to the local shape. */
export function useTweak(id: string | undefined): UseQueryResult<Tweak> {
    return useQuery({
        queryKey: queryKeys.tweak(id ?? ''),
        enabled: Boolean(id),
        queryFn: async (): Promise<Tweak> => {
            const tweak = await tweaksApi.get(id as string);
            let applications: BackendApplicationDetail[] | undefined;
            try {
                applications = await tweaksApi.listApplications(id as string);
            } catch {
                // Non-owners cannot list applications; omit them silently.
                applications = undefined;
            }
            return backendTweakToLocal(tweak, applications);
        },
    });
}

/** Applications for a tweak (owner view), mapped to the local shape. */
export function useTweakApplications(
    id: string | undefined
): UseQueryResult<TweakApplication[]> {
    return useQuery({
        queryKey: queryKeys.tweakApplications(id ?? ''),
        enabled: Boolean(id),
        queryFn: async (): Promise<TweakApplication[]> => {
            const apps = await tweaksApi.listApplications(id as string);
            return apps.map(backendApplicationToLocal);
        },
    });
}

/** Raw backend applications for a tweak (owner view) — carries the app `id` + provider detail. */
export function useTweakApplicationsRaw(
    id: string | undefined
): UseQueryResult<BackendApplicationDetail[]> {
    return useQuery({
        queryKey: queryKeys.tweakApplications(id ?? ''),
        enabled: Boolean(id),
        queryFn: (): Promise<BackendApplicationDetail[]> =>
            tweaksApi.listApplications(id as string),
    });
}

/** The current user's applications as a provider (GET /tweaks/applications/mine). */
export function useMyApplications(): UseQueryResult<BackendMyApplication[]> {
    return useQuery({
        queryKey: queryKeys.myApplications(),
        queryFn: (): Promise<BackendMyApplication[]> => tweaksApi.myApplications(),
    });
}

export function useCreateTweak(): UseMutationResult<
    Awaited<ReturnType<typeof tweaksApi.create>>,
    Error,
    CreateTweakRequest
> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTweakRequest) => tweaksApi.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.tweaksMine() });
            qc.invalidateQueries({ queryKey: ['tweaks', 'feed'] });
        },
    });
}

export function useUpdateTweak(): UseMutationResult<
    Awaited<ReturnType<typeof tweaksApi.update>>,
    Error,
    { id: string; data: UpdateTweakRequest }
> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateTweakRequest }) =>
            tweaksApi.update(id, data),
        onSuccess: (_result, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.tweak(variables.id) });
            qc.invalidateQueries({ queryKey: queryKeys.tweaksMine() });
        },
    });
}

export function useDeleteTweak(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tweaksApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.tweaksMine() });
            qc.invalidateQueries({ queryKey: ['tweaks', 'feed'] });
        },
    });
}

export interface ApplyArgs {
    tweakId: string;
    whyPreferMessage?: string;
    quotedPriceMinor?: number;
    selectedSlots: { date: string; start: string; end: string }[];
}

export function useApplyToTweak(): UseMutationResult<
    BackendApplication,
    Error,
    ApplyArgs
> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: ApplyArgs) =>
            applicationsApi.apply(args.tweakId, {
                why_prefer_message: args.whyPreferMessage,
                quoted_price_minor: args.quotedPriceMinor,
                selected_slots: args.selectedSlots,
            }),
        onSuccess: (_result, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.tweak(variables.tweakId) });
            qc.invalidateQueries({
                queryKey: queryKeys.tweakApplications(variables.tweakId),
            });
            qc.invalidateQueries({ queryKey: queryKeys.myApplications() });
        },
    });
}

export type ApplicationAction =
    | { type: 'accept' }
    | { type: 'reject' }
    | { type: 'complete' }
    | { type: 'cancel' }
    | { type: 'counter'; listerQuotedPriceMinor: number; message?: string };

export interface ApplicationActionArgs {
    applicationId: string;
    tweakId: string;
    action: ApplicationAction;
}

export function useApplicationAction(): UseMutationResult<
    BackendApplication,
    Error,
    ApplicationActionArgs
> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ applicationId, action }: ApplicationActionArgs) => {
            switch (action.type) {
                case 'accept':
                    return applicationsApi.accept(applicationId);
                case 'reject':
                    return applicationsApi.reject(applicationId);
                case 'complete':
                    return applicationsApi.complete(applicationId);
                case 'cancel':
                    return applicationsApi.cancel(applicationId);
                case 'counter':
                    return applicationsApi.counter(applicationId, {
                        lister_quoted_price_minor: action.listerQuotedPriceMinor,
                        message: action.message,
                    });
            }
        },
        onSuccess: (_result, variables) => {
            qc.invalidateQueries({
                queryKey: queryKeys.tweakApplications(variables.tweakId),
            });
            qc.invalidateQueries({ queryKey: queryKeys.tweak(variables.tweakId) });
        },
    });
}
