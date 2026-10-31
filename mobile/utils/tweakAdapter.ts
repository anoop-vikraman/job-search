import type {
    BackendApplication,
    BackendApplicationDetail,
    BackendPricingData,
    BackendTweak,
    CreateTweakRequest,
} from '../types/api';
import type { Tweak, TweakApplication } from '../store/useTweaksStore';
import type {
    PricingData,
    ScheduleData,
    ScheduleSlot,
    TweakAddress,
} from '../types/tweak';
import { minorToMajor, toMinor } from './money';

// The screens and TweakTile consume the local `Tweak`/`TweakApplication` shape
// (camelCase, rupee amounts, embedded scheduleData/pricingData). The backend
// speaks snake_case with minor-unit money. These adapters translate between the
// two so the existing JSX keeps working unchanged.

/** Map a backend pricing_data payload (minor units) to local PricingData (rupees). */
function pricingDataToLocal(
    model: BackendTweak['pricing_model'],
    data: BackendPricingData | null,
    priceMinor: number | null
): PricingData | null {
    if (!data && priceMinor == null) return null;

    if (model === 'fixed') {
        const amount = data?.amount_minor ?? priceMinor ?? 0;
        return { price: minorToMajor(amount) };
    }
    if (model === 'hourly') {
        const rate = data?.rate_per_hour_minor ?? priceMinor ?? 0;
        return {
            price: minorToMajor(rate),
            ratePerHour: minorToMajor(rate),
            estimatedHours: data?.estimated_hours,
        };
    }
    if (model === 'quantity') {
        const unitPrice = data?.unit_price_minor ?? 0;
        const quantity = data?.quantity ?? 1;
        return {
            itemName: data?.unit_label,
            unitLabel: data?.unit_label,
            pricePerItem: minorToMajor(unitPrice),
            unitPrice: minorToMajor(unitPrice),
            quantity,
            totalPrice: minorToMajor(unitPrice * quantity),
        };
    }
    return null;
}

/** Derive the local rupee `price` the tile/detail header displays. */
function derivePrice(
    model: BackendTweak['pricing_model'],
    local: PricingData | null,
    priceMinor: number | null
): number {
    if (model === 'quote') return 0;
    if (model === 'quantity') return local?.totalPrice ?? 0;
    if (local?.price != null) return local.price;
    return priceMinor != null ? minorToMajor(priceMinor) : 0;
}

/** Map a backend tweak to the local Tweak shape consumed by the UI. */
export function backendTweakToLocal(
    b: BackendTweak,
    applications?: (BackendApplication | BackendApplicationDetail)[]
): Tweak {
    const pricingData = pricingDataToLocal(b.pricing_model, b.pricing_data, b.price_minor);
    const scheduleData = (b.schedule_data as ScheduleData | null) ?? null;

    const status: Tweak['status'] =
        b.status === 'draft' ? 'draft' : b.status === 'active' ? 'active' : 'closed';

    return {
        id: b.id,
        title: b.title,
        description: b.description,
        category: b.category,
        images: b.media.map((m) => ({ uri: m.url })),
        audioUri: null,
        address: null,
        skills: b.skills,
        languages: b.languages,
        schedulePreference: b.schedule_preference ?? '',
        scheduleData,
        pricingModel: b.pricing_model,
        pricingData,
        tweakType: b.tweak_type,
        price: derivePrice(b.pricing_model, pricingData, b.price_minor),
        pricingType: b.pricing_model,
        createdAt: b.created_at,
        distanceKm: b.distance_km ?? null,
        status,
        createdByUserId: b.created_by_user_id,
        applications: applications?.map(backendApplicationToLocal),
    };
}

/**
 * Map a backend application to the local TweakApplication shape. When given the
 * detailed variant (with `provider`), the applicant's name/skills/rating/avatar
 * and any counter-offer are populated.
 */
export function backendApplicationToLocal(
    a: BackendApplication | BackendApplicationDetail
): TweakApplication {
    const detail = 'provider' in a ? a : undefined;
    const provider = detail?.provider;
    const providerName = provider
        ? [provider.first_name, provider.last_name].filter(Boolean).join(' ').trim()
        : '';
    const localStatus: TweakApplication['status'] =
        a.status === 'accepted' || a.status === 'completed'
            ? 'accepted'
            : a.status === 'rejected' || a.status === 'withdrawn'
              ? 'rejected'
              : 'pending';

    const selectedSlots: ScheduleSlot[] = a.selected_slots.map((s) => ({
        date: s.date,
        start: s.start,
        end: s.end,
    }));

    const counterMinor =
        detail?.offer?.lister_quoted_price_minor ?? a.agreed_price_minor ?? undefined;

    return {
        userId: a.provider_user_id,
        userName: providerName || a.provider_user_id,
        profilePictureUrl: provider?.profile_picture_url ?? undefined,
        userSkills: provider?.skills ?? [],
        completedCategories: provider?.completed_categories,
        rating: provider?.rating_avg,
        whyPreferMessage: a.why_prefer_message ?? '',
        quotedPrice: a.quoted_price_minor != null ? minorToMajor(a.quoted_price_minor) : undefined,
        selectedSlots,
        appliedAt: a.applied_at,
        status: localStatus,
        listerQuotedPrice: counterMinor != null ? minorToMajor(counterMinor) : undefined,
    };
}

/**
 * Build the backend pricing_data payload (minor units) from the local
 * create-tweak store's PricingData (rupees), per the selected model.
 */
export function pricingDataToBackend(
    model: Exclude<Tweak['pricingModel'], ''> | string,
    data: PricingData | null
): BackendPricingData | null {
    if (model === 'quote' || !data) return null;

    if (model === 'fixed') {
        return { amount_minor: toMinor(data.price ?? 0) };
    }
    if (model === 'hourly') {
        return {
            rate_per_hour_minor: toMinor(data.ratePerHour ?? data.price ?? 0),
            estimated_hours: data.estimatedHours,
        };
    }
    if (model === 'quantity') {
        return {
            unit_label: data.unitLabel ?? data.itemName,
            unit_price_minor: toMinor(data.pricePerItem ?? data.unitPrice ?? 0),
            quantity: data.quantity ?? 1,
        };
    }
    return null;
}

/** Narrow the create-tweak store address into a backend address_id (if any). */
export function addressToBackendId(address: TweakAddress | null): string | null {
    return address?.id ?? null;
}

export interface BuildCreateTweakArgs {
    title: string;
    description: string;
    category: string;
    tweakType: string;
    status: 'active' | 'draft';
    skills: string[];
    languages: string[];
    images: { uri: string }[];
    schedulePreference: string | null;
    scheduleData: ScheduleData | null;
    pricingModel: string;
    pricingData: PricingData | null;
    address: TweakAddress | null;
}

/** Assemble the POST /tweaks body from create-tweak store fields. */
export function buildCreateTweakRequest(args: BuildCreateTweakArgs): CreateTweakRequest {
    const tweakType: CreateTweakRequest['tweak_type'] =
        args.tweakType === 'remote' ? 'remote' : 'in_person';
    const pricingModel: CreateTweakRequest['pricing_model'] =
        args.pricingModel === 'hourly' ||
        args.pricingModel === 'quantity' ||
        args.pricingModel === 'fixed'
            ? args.pricingModel
            : 'quote';

    return {
        title: args.title,
        description: args.description,
        category: args.category,
        tweak_type: tweakType,
        status: args.status,
        skills: args.skills,
        languages: args.languages,
        media: args.images.map((img) => ({ url: img.uri })),
        schedule_preference: args.schedulePreference,
        schedule_data: args.scheduleData as Record<string, unknown> | null,
        pricing_model: pricingModel,
        pricing_data: pricingDataToBackend(pricingModel, args.pricingData),
        address_id: addressToBackendId(args.address),
    };
}
