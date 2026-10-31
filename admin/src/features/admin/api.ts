import { api } from "@/lib/api";
import type {
  Application,
  Dispute,
  DisputeOutcome,
  KycSubmission,
  Page,
  Payout,
  Refund,
  Report,
  Transaction,
  Tweak,
  UserProfile,
} from "@/lib/types";

type Params = Record<string, string | number | boolean | undefined>;

function withPage(page: number, extra: Params = {}, limit = 20): { params: Params } {
  const params: Params = { page, limit };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") params[k] = v;
  }
  return { params };
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_banned?: boolean;
}

export async function listUsers(page: number, filters: UserFilters = {}): Promise<Page<UserProfile>> {
  const res = await api.get<Page<UserProfile>>("/admin/users", withPage(page, { ...filters }));
  return res.data;
}

export async function banUser(userId: string, isBanned: boolean, reason?: string): Promise<void> {
  await api.post(`/admin/users/${userId}/ban`, { is_banned: isBanned, banned_reason: reason });
}

export interface TweakFilters {
  search?: string;
  status?: string;
}

export async function listTweaks(page: number, filters: TweakFilters = {}): Promise<Page<Tweak>> {
  const res = await api.get<Page<Tweak>>("/admin/tweaks", withPage(page, { ...filters }));
  return res.data;
}

export async function closeTweak(tweakId: string): Promise<void> {
  await api.post(`/admin/tweaks/${tweakId}/close`);
}

export async function listApplications(page: number): Promise<Page<Application>> {
  const res = await api.get<Page<Application>>("/admin/applications", withPage(page));
  return res.data;
}

export async function listTransactions(page: number): Promise<Page<Transaction>> {
  const res = await api.get<Page<Transaction>>("/admin/transactions", withPage(page));
  return res.data;
}

export async function listRefunds(page: number, status?: string): Promise<Page<Refund>> {
  const res = await api.get<Page<Refund>>("/admin/refunds", withPage(page, { status }));
  return res.data;
}

export async function decideRefund(refundId: string, approve: boolean): Promise<void> {
  await api.post(`/admin/refunds/${refundId}/decide`, { approve });
}

export async function listDisputes(page: number, status?: string): Promise<Page<Dispute>> {
  const res = await api.get<Page<Dispute>>("/admin/disputes", withPage(page, { status }));
  return res.data;
}

export interface DisputeResolution {
  outcome: DisputeOutcome;
  provider_amount_minor?: number;
  note?: string;
}

export async function resolveDispute(disputeId: string, body: DisputeResolution): Promise<Dispute> {
  const res = await api.post<Dispute>(`/admin/disputes/${disputeId}/resolve`, body);
  return res.data;
}

export interface ReportFilters {
  status?: string;
  target_type?: string;
}

export async function listReports(page: number, filters: ReportFilters = {}): Promise<Page<Report>> {
  const res = await api.get<Page<Report>>("/admin/reports", withPage(page, { ...filters }));
  return res.data;
}

export interface ReportResolution {
  action: "actioned" | "dismissed";
  note?: string;
  ban_user?: boolean;
  close_tweak?: boolean;
}

export async function resolveReport(reportId: string, body: ReportResolution): Promise<void> {
  await api.post(`/admin/reports/${reportId}/resolve`, body);
}

export async function listKyc(page: number, status?: string): Promise<Page<KycSubmission>> {
  const res = await api.get<Page<KycSubmission>>("/admin/kyc", withPage(page, { status }));
  return res.data;
}

/** Fetch a private KYC document with the admin token and open it in a new tab. */
export async function openKycDocument(submissionId: string, index: number): Promise<void> {
  const res = await api.get<Blob>(`/admin/kyc/${submissionId}/documents/${index}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank", "noopener");
  // Give the new tab time to load before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function reviewKyc(submissionId: string, approve: boolean, reason?: string): Promise<void> {
  await api.post(`/admin/kyc/${submissionId}/review`, { approve, reason });
}

export async function listPayouts(page: number, status?: string): Promise<Page<Payout>> {
  const res = await api.get<Page<Payout>>("/admin/payouts", withPage(page, { status }));
  return res.data;
}

export async function decidePayout(
  payoutId: string,
  body: { approve: boolean; reference?: string; reason?: string },
): Promise<void> {
  await api.post(`/admin/payouts/${payoutId}/decide`, body);
}
