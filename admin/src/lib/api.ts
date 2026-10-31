import axios, { type AxiosError } from "axios";

import { useAuthStore } from "@/features/auth/store";

export interface ApiError {
  detail: string;
  code: string;
}

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach the admin access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the session (admin re-logs in).
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error: unknown): string {
  const err = error as AxiosError<ApiError>;
  return err.response?.data?.detail ?? "Something went wrong.";
}
