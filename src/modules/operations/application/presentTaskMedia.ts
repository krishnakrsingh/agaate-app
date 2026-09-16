import { downloadUrl } from "@/lib/storage";

/**
 * Task media presentation — the ONE place task rows gain URLs.
 *
 * Database record → signed/public URLs → API response fields. Provider
 * mechanics stay inside `downloadUrl` (infrastructure/storage pending);
 * the domain never sees storage SDKs. Byte contract (shared by list +
 * create responses, verified by tests): input order preserved,
 * `{id, url|null}` per item, primary = first non-null url, empties →
 * `media: []`, `primaryImageUrl: null`.
 */

export interface MediaIdentity {
  id: string;
  storageKey: string;
}

export interface PresentedMedia {
  media: Array<{ id: string; url: string | null }>;
  primaryImageUrl: string | null;
}

export async function presentTaskMedia(items: readonly MediaIdentity[]): Promise<PresentedMedia> {
  const media = await Promise.all(
    items.map(async (m) => {
      try {
        const url = await downloadUrl(m.storageKey);
        return { id: m.id, url };
      } catch {
        return { id: m.id, url: null };
      }
    })
  );
  return { media, primaryImageUrl: media.find((m) => m.url)?.url || null };
}
