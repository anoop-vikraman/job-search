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
