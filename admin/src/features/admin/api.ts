import { api } from "@/lib/api";
import type {
  Application,
  Page,
  Refund,
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
