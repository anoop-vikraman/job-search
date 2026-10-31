import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import { tweaksApi } from '../api/tweaks';
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

/** Feed of tweaks from other users (GET /tweaks), mapped to the local shape. */
export function useTweaksFeed(category?: string): UseQueryResult<Tweak[]> {
    return useQuery({
        queryKey: queryKeys.tweaksFeed(category),
        queryFn: async (): Promise<Tweak[]> => {
            const page = await tweaksApi.feed({ page: 1, limit: 50, category });
            return page.items.map((t) => backendTweakToLocal(t));
        },
    });
}

/** The current user's tweaks (GET /tweaks/mine), mapped to the local shape. */
export function useMyTweaks(): UseQueryResult<Tweak[]> {
    return useQuery({
        queryKey: queryKeys.tweaksMine(),
        queryFn: async (): Promise<Tweak[]> => {
            const page = await tweaksApi.mine({ page: 1, limit: 50 });
            return page.items.map((t) => backendTweakToLocal(t));
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
