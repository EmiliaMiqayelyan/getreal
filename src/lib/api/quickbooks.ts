import { getApiBaseUrl } from "./client";

/** Browser redirect URL for QuickBooks OAuth (GET /quickbooks/auth). */
export function getQuickBooksAuthUrl(): string {
  return `${getApiBaseUrl()}/quickbooks/auth`;
}

/** Callback URL handled by backend (GET /quickbooks/callback). */
export function getQuickBooksCallbackUrl(): string {
  return `${getApiBaseUrl()}/quickbooks/callback`;
}
