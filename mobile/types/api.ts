// Request/response shapes for the backend API (/api/v1, snake_case JSON).
// These mirror the backend contract exactly. Money is integer minor units;
// timestamps are ISO-8601 Z strings.

/** Generic paginated collection returned by list endpoints. */
export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

// ─── Tweaks ───────────────────────────────────────────────────────────────

export type BackendTweakType = 'remote' | 'in_person';
export type BackendTweakStatus =
    | 'draft'
    | 'active'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'closed';
export type BackendPricingModel = 'hourly' | 'quantity' | 'fixed' | 'quote';

/** A media item attached to a tweak. */
export interface BackendMedia {
    url: string;
    type?: string;
}

/**
 * Pricing payload. Shape depends on `pricing_model`:
 * - fixed:    { amount_minor }
 * - hourly:   { rate_per_hour_minor, estimated_hours }
 * - quantity: { unit_label, unit_price_minor, quantity }
 * - quote:    null
 */
export interface BackendPricingData {
    amount_minor?: number;
    rate_per_hour_minor?: number;
    estimated_hours?: number;
    unit_label?: string;
    unit_price_minor?: number;
    quantity?: number;
}

/** Backend tweak record (response shape). */
export interface BackendTweak {
    id: string;
    created_by_user_id: string;
    title: string;
    description: string;
    category: string;
    tweak_type: BackendTweakType;
    status: BackendTweakStatus;
    address_id: string | null;
    skills: string[];
    languages: string[];
    media: BackendMedia[];
    schedule_preference: string | null;
    schedule_data: Record<string, unknown> | null;
    pricing_model: BackendPricingModel;
    pricing_data: BackendPricingData | null;
    price_minor: number | null;
    currency: string;
    created_at: string;
    /** Feed only: km from the caller's lat/lng; null when either side lacks coordinates. */
    distance_km?: number | null;
}

/** Feed ordering accepted by GET /tweaks. `distance` requires lat/lng. */
export type FeedSort = 'newest' | 'price_asc' | 'price_desc' | 'distance';

/** Body for creating a tweak. */
export interface CreateTweakRequest {
    title: string;
    description: string;
    category: string;
    tweak_type: BackendTweakType;
    status: 'active' | 'draft';
    skills: string[];
    languages: string[];
    media: BackendMedia[];
    schedule_preference: string | null;
    schedule_data: Record<string, unknown> | null;
    pricing_model: BackendPricingModel;
    pricing_data: BackendPricingData | null;
    address_id?: string | null;
}

export type UpdateTweakRequest = Partial<Omit<CreateTweakRequest, 'status'>> & {
    status?: BackendTweakStatus;
};

// ─── Applications ───────────────────────────────────────────────────────────

export type BackendApplicationStatus =
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'rejected'
    | 'withdrawn';

/** A single start/end time window the applicant selected. */
export interface BackendSelectedSlot {
    date: string;
    start: string;
    end: string;
}

export interface BackendApplication {
    id: string;
    tweak_id: string;
    provider_user_id: string;
    why_prefer_message: string | null;
    quoted_price_minor: number | null;
    agreed_price_minor: number | null;
    platform_fee_minor: number | null;
    selected_slots: BackendSelectedSlot[];
    status: BackendApplicationStatus;
    applied_at: string;
    responded_at: string | null;
}

export interface CreateApplicationRequest {
    why_prefer_message?: string;
    quoted_price_minor?: number;
    selected_slots: BackendSelectedSlot[];
}

export interface CounterApplicationRequest {
    lister_quoted_price_minor: number;
    message?: string;
}

export interface BackendOffer {
    id: string;
    application_id: string;
    lister_quoted_price_minor: number;
    message: string | null;
    created_at: string;
}

/** Public applicant info shown on applicant cards. */
export interface BackendProviderSummary {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
    skills: string[];
    completed_categories: string[];
    rating_avg: number;
    rating_count: number;
}

/** An application enriched with the applicant's profile + any counter-offer. */
export interface BackendApplicationDetail extends BackendApplication {
    provider: BackendProviderSummary;
    offer: BackendOffer | null;
}

/** An application the current user submitted, with the tweak's headline info. */
export interface BackendMyApplication extends BackendApplication {
    tweak_title: string;
    tweak_category: string;
    tweak_status: string;
}

// ─── Wallet ───────────────────────────────────────────────────────────────

export interface Wallet {
    balance_minor: number;
    held_minor: number;
    currency: string;
}

export interface TopupRequest {
    amount_minor: number;
    reference?: string;
}

export type TransactionType =
    | 'topup'
    | 'hold'
    | 'release'
    | 'refund'
    | 'payout'
    | 'fee';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    amount_minor: number;
    tweak_id: string | null;
    application_id: string | null;
    reference: string | null;
    created_at: string;
}

// ─── Refunds ───────────────────────────────────────────────────────────────

export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'processed';

export interface Refund {
    id: string;
    application_id: string;
    requested_by_user_id: string;
    amount_minor: number;
    reason: string | null;
    status: RefundStatus;
    processed_at: string | null;
    created_at: string;
}

export interface CreateRefundRequest {
    application_id: string;
    amount_minor: number;
    reason?: string;
}

// ─── Ratings ───────────────────────────────────────────────────────────────

export interface CreateRatingRequest {
    tweak_id: string;
    ratee_user_id: string;
    score: number;
    comment?: string;
}

export interface Rating {
    id: string;
    tweak_id: string;
    rater_user_id: string;
    ratee_user_id: string;
    score: number;
    comment: string | null;
    created_at: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    tweak_id: string | null;
    is_read: boolean;
    created_at: string;
}

export interface UnreadCount {
    count: number;
}

// ─── Media ───────────────────────────────────────────────────────────────

export interface MediaUploadResponse {
    url: string;
}
