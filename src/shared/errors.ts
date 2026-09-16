/**
 * shared/errors — framework-free error primitives.
 *
 * Only what is GENUINELY cross-domain lives here. Domain-specific
 * messages stay in their modules. HTTP mapping lives in
 * infrastructure/http (src/lib/api.ts), not here.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "business_rule"
  | "infrastructure"
  | "unexpected";

export function categorizeStatus(status: number): ErrorCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 404) return "not_found";
  if (status === 409 || status === 422) return "business_rule";
  if (status >= 500) return "infrastructure";
  return "unexpected";
}
