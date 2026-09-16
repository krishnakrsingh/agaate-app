/**
 * COMPATIBILITY SHIM: canonical storage infrastructure is @/infrastructure/storage.
 * Do not add new callers.
 */
export {
  uploadUrl,
  downloadUrl,
  headObject,
  putObject,
  isStorageConfigured,
} from "@/infrastructure/storage";

