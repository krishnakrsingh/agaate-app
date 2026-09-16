/**
 * infrastructure/http — canonical HTTP transport helpers.
 *
 * Re-export only (strangler step 1). Response shaping, error mapping,
 * pagination envelope, and sort allow-listing live in src/lib/api.ts.
 * Domain code must NOT import this (no NextResponse in domain/).
 */

export { apiError, noStore, paginationParams, paginatedJson, parseSort } from "@/lib/api";
