import { api } from "@/lib/api";
import type { TokenResponse, UserProfile } from "@/lib/types";

export async function login(
  countryCode: string,
  phoneNumber: string,
  password: string
): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", {
    country_code: countryCode,
    phone_number: phoneNumber,
    password,
  });
  return res.data;
}

export async function getMe(): Promise<UserProfile> {
  const res = await api.get<UserProfile>("/users/me");
  return res.data;
}
