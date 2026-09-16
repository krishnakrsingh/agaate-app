/**
 * COMPATIBILITY SHIM: canonical HTTP transport is @/infrastructure/http.
 * Do not add new callers.
 */
export {
  apiError,
  noStore,
  paginationParams,
  paginatedJson,
  parseSort,
} from "@/infrastructure/http";

