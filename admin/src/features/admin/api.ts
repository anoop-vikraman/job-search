import { api } from "@/lib/api";
import type {
  Application,
  Page,
  Refund,
  Transaction,
  Tweak,
  UserProfile,
} from "@/lib/types";

function pageParams(page: number, limit = 20): { params: { page: number; limit: number } } {
  return { params: { page, limit } };
}

export async function listUsers(page: number): Promise<Page<UserProfile>> {
  const res = await api.get<Page<UserProfile>>("/admin/users", pageParams(page));
  return res.data;
}

export async function banUser(userId: string, isBanned: boolean, reason?: string): Promise<void> {
  await api.post(`/admin/users/${userId}/ban`, { is_banned: isBanned, banned_reason: reason });
}

export async function listTweaks(page: number): Promise<Page<Tweak>> {
  const res = await api.get<Page<Tweak>>("/admin/tweaks", pageParams(page));
  return res.data;
}

export async function closeTweak(tweakId: string): Promise<void> {
  await api.post(`/admin/tweaks/${tweakId}/close`);
}

export async function listApplications(page: number): Promise<Page<Application>> {
  const res = await api.get<Page<Application>>("/admin/applications", pageParams(page));
  return res.data;
}

export async function listTransactions(page: number): Promise<Page<Transaction>> {
  const res = await api.get<Page<Transaction>>("/admin/transactions", pageParams(page));
  return res.data;
}

export async function listRefunds(page: number): Promise<Page<Refund>> {
  const res = await api.get<Page<Refund>>("/admin/refunds", pageParams(page));
  return res.data;
}

export async function decideRefund(refundId: string, approve: boolean): Promise<void> {
  await api.post(`/admin/refunds/${refundId}/decide`, { approve });
}
