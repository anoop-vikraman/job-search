// Types mirror the backend Pydantic schemas (app/schemas). Do not invent fields.

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type UserRole = "admin" | "user";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string;
  country_code: string;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  skills: string[];
  completed_categories: string[];
  rating_avg: number;
  rating_count: number;
  role: UserRole;
  is_banned: boolean;
  created_at: string;
}

export type TweakStatus = "draft" | "active" | "closed";
export type TweakType = "remote" | "in_person";
export type PricingModel = "hourly" | "quantity" | "fixed" | "quote";

export interface Tweak {
  id: string;
  created_by_user_id: string;
  title: string;
  description: string;
  category: string;
  tweak_type: TweakType;
  status: TweakStatus;
  pricing_model: PricingModel;
  price_minor: number | null;
  currency: string;
  created_at: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  tweak_id: string;
  provider_user_id: string;
  quoted_price_minor: number | null;
  status: ApplicationStatus;
  applied_at: string;
  responded_at: string | null;
}

export type TxnType = "topup" | "hold" | "release" | "refund" | "payout" | "fee";
export type TxnStatus = "pending" | "completed" | "failed" | "reversed";

export interface Transaction {
  id: string;
  type: TxnType;
  status: TxnStatus;
  amount_minor: number;
  tweak_id: string | null;
  application_id: string | null;
  reference: string | null;
  created_at: string;
}

export type RefundStatus = "requested" | "approved" | "rejected" | "processed";

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

export type DisputeStatus = "open" | "resolved";
export type DisputeOutcome = "release" | "refund" | "partial";

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

export type ReportTarget = "user" | "tweak" | "message";
export type ReportStatus = "open" | "actioned" | "dismissed";

export interface Report {
  id: string;
  reporter_user_id: string;
  target_type: ReportTarget;
  target_id: string;
  target_user_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
  open_reports_against_user: number;
}

export type KycStatus = "pending" | "approved" | "rejected";

export interface KycSubmission {
  id: string;
  status: KycStatus;
  full_name: string;
  id_type: string;
  id_number_last4: string;
  upi_id: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  document_count: number;
}

export type PayoutStatus = "requested" | "paid" | "rejected";

export interface Payout {
  id: string;
  user_id: string;
  amount_minor: number;
  currency: string;
  upi_id: string;
  status: PayoutStatus;
  reference: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export type PaymentStatus = "created" | "paid" | "failed";

export interface PaymentOrder {
  id: string;
  user_id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
  last_checked_at: string | null;
}

export interface ReconcileReport {
  checked: number;
  credited: number;
  captured: number;
  still_unpaid: number;
  errors: number;
  paid_without_ledger: number;
  credited_order_ids: string[];
}
