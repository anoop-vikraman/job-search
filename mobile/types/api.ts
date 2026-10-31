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

/** Page with a keyset cursor; send `next_cursor` back as `cursor` (null at the end). */
export interface CursorPage<T> extends Page<T> {
    next_cursor: string | null;
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
    /** Feed only: in-person location snapped to a ~550 m grid (for the map). */
    approx_lat?: number | null;
    approx_lng?: number | null;
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
    | 'withdrawn'
    /** Escrow frozen while support reviews a dispute. */
    | 'disputed';

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
    /** Set when the provider marks the work done. */
    work_submitted_at: string | null;
    completion_note: string | null;
    completion_photos: { url: string }[];
    /** Escrow releases automatically at this time unless the lister confirms or disputes. */
    auto_release_at: string | null;
}

export interface WorkSubmitRequest {
    note?: string;
    photo_urls: string[];
}

export type DisputeStatus = 'open' | 'resolved';
export type DisputeOutcome = 'release' | 'refund' | 'partial';

export interface Dispute {
    id: string;
    application_id: string;
    opened_by_user_id: string;
    reason: string;
    evidence: { url: string }[];
    status: DisputeStatus;
    outcome: DisputeOutcome | null;
    provider_amount_minor: number | null;
    admin_note: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface DisputeCreateRequest {
    reason: string;
    evidence_urls: string[];
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
    /** The lister's counter-offer, if any. */
    offer: BackendOffer | null;
}

// ─── Wallet ───────────────────────────────────────────────────────────────

export interface Wallet {
    balance_minor: number;
    held_minor: number;
    currency: string;
}

/** A Razorpay order for a wallet top-up; the fields Checkout needs. */
export interface TopupOrder {
    id: string;
    provider: string;
    provider_order_id: string;
    amount_minor: number;
    currency: string;
    key_id: string;
    test_mode: boolean;
}

/** Values Razorpay Checkout returns to its success handler. */
export interface RazorpaySuccess {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export type PayoutStatus = 'requested' | 'paid' | 'rejected';

export interface Payout {
    id: string;
    amount_minor: number;
    currency: string;
    upi_id: string;
    status: PayoutStatus;
    reference: string | null;
    failure_reason: string | null;
    created_at: string;
    processed_at: string | null;
}

export type KycIdType = 'aadhaar' | 'pan' | 'passport' | 'driving_licence' | 'voter_id';
export type KycStatus = 'pending' | 'approved' | 'rejected';

export interface KycSubmission {
    id: string;
    status: KycStatus;
    full_name: string;
    id_type: KycIdType;
    id_number_last4: string;
    upi_id: string;
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string;
}

export interface KycStatusResponse {
    verified: boolean;
    verified_at: string | null;
    latest: KycSubmission | null;
}

export interface TopupVerifyResponse {
    status: 'created' | 'paid' | 'failed';
    transaction: Transaction;
    wallet: Wallet;
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

/** Push on/off per notification type (every type present in responses). */
export interface NotificationPreferences {
    push: Record<string, boolean>;
}

// ─── Chat ───────────────────────────────────────────────────────────────

export interface ChatParticipant {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_user_id: string;
    /** May be empty when the message only has photos. */
    body: string;
    attachments: { url: string; type: 'image' }[];
    created_at: string;
}

/** One thread per accepted application, between the lister and the provider. */
export interface Conversation {
    id: string;
    application_id: string;
    tweak_id: string;
    tweak_title: string;
    other_user: ChatParticipant;
    my_role: 'lister' | 'provider';
    last_message: ChatMessage | null;
    unread_count: number;
    /** False once the work was cancelled, or if either side blocked the other. */
    can_send: boolean;
    /** Either side blocked the other. */
    blocked: boolean;
    /** When the other party last read the thread ("Seen"). */
    other_last_read_at: string | null;
    /** While the application is pending: messages you may still send (null after acceptance). */
    pre_accept_remaining: number | null;
    last_message_at: string | null;
    created_at: string;
}

// ─── Moderation ───────────────────────────────────────────────────────────

export type ReportTarget = 'user' | 'tweak' | 'message';
export type ReportReason = 'spam' | 'scam' | 'harassment' | 'inappropriate' | 'no_show' | 'other';

export interface ReportCreateRequest {
    target_type: ReportTarget;
    target_id: string;
    reason: ReportReason;
    details?: string;
}

export interface ReportResponse {
    id: string;
    target_type: ReportTarget;
    target_id: string;
    reason: ReportReason;
    status: 'open' | 'actioned' | 'dismissed';
    created_at: string;
}

export interface BlockedUser {
    user: ChatParticipant;
    blocked_at: string;
}

// ─── Media ───────────────────────────────────────────────────────────────

export interface MediaUploadResponse {
    url: string;
}
