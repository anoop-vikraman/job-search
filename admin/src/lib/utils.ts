import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format integer minor units + currency as a display string. */
export function formatMoney(amountMinor: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : "";
  return `${symbol}${(amountMinor / 100).toLocaleString()}`;
}

/** Format an ISO-8601 timestamp for display. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
