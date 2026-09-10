/**
 * geo-versions — the ONLY way authoritative geometry changes.
 *
 * Every geometry mutation MUST go through `commitBoundary` inside the
 * caller's transaction. It performs current-state write + version insert
 * (+ optional GPS track) atomically: any failure rolls back everything,
 * so "geometry without version" and "version without geometry" are
 * structurally impossible. Callers never call update + createVersion
 * separately — that two-call pattern is banned by design.
 *
 * Version numbers are sequential per entity (gaps possible under
 * contention; uniqueness guaranteed by compound unique + retry).
 * Last-writer-wins on current geometry; history is always complete.
 */

import type { Prisma, PrismaClient, BoundaryEntityType, BoundarySource } from "@prisma/client";
import { parseBoundaryToRing, pathPerimeterM, closeRing, representativePoint, ringWithinRing, type LngLat } from "./geo-core";
import { AREA_CHANGE_FLAG_THRESHOLD } from "./geo-policy";

type Tx = Prisma.TransactionClient;

export interface BoundaryWrite {
  /** Canonical GeoJSON Polygon string, or null to clear the fence. */
  geoJson: string | null;
  /** Server-computed acres (null iff geoJson is null). */
  acres: number | null;
}

export interface VersionProvenance {
  source: BoundarySource;
  actorId?: string | null;
  actorName?: string | null;
  captureId?: string | null;
  restoredFromVersionId?: string | null;
  track?: {
    rawSamples: unknown;
    cleanedSamples: unknown;
    kept: number;
    dropped: number;
    quality: string;
  } | null;
}

export interface CommittedVersion {
  id: string;
  version: number;
  prevAcres: number | null;
  acres: number | null;
  deltaAcres: number | null;
  deltaPct: number | null;
  areaFlagged: boolean;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Farm-shrink safety (read-only): given a proposed new farm ring (or null
 * for fence removal), returns fenced, non-archived plots that would fall
 * outside it, plus plots whose stored fence is unreadable (unverifiable).
 * Routes reject orphaning changes unless explicitly forced (audited).
 *
 * Best-effort against concurrent plot creation (documented residual race);
 * fully accurate for the sequential operator flows that dominate.
 */
export async function plotsOutsideRing(
  db: Prisma.TransactionClient | PrismaClient,
  farmId: string,
  newRing: LngLat[] | null
): Promise<{ outside: string[]; unverifiable: string[] }> {
  const plots = await (db as Prisma.TransactionClient).plot.findMany({
    where: { farmId, deletedAt: null, status: { not: "ARCHIVED" }, boundaryGeoJson: { not: null } },
    select: { id: true, name: true, boundaryGeoJson: true },
  });
  const outside: string[] = [];
  const unverifiable: string[] = [];
  for (const p of plots) {
    let plotRing: LngLat[] | null = null;
    try {
      plotRing = parseBoundaryToRing(p.boundaryGeoJson);
    } catch {
      plotRing = null;
    }
    if (!plotRing) {
      unverifiable.push(p.name);
      continue;
    }
    if (newRing === null || !ringWithinRing(plotRing, newRing)) {
      outside.push(p.name);
    }
  }
  return { outside, unverifiable };
}

/** Plain-JSON shape for API responses (Prisma Decimals → numbers). */
export interface SerializedBoundaryVersion {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  boundaryGeoJson: string | null;
  measuredAcres: number | null;
  perimeterM: number | null;
  centroidLat: number | null;
  centroidLng: number | null;
  prevAcres: number | null;
  areaFlagged: boolean;
  source: string;
  actorId: string | null;
  actorName: string | null;
  captureId: string | null;
  restoredFromVersionId: string | null;
  createdAt: string;
}

export function serializeBoundaryVersion(v: {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  boundaryGeoJson: string | null;
  measuredAcres: unknown;
  perimeterM: unknown;
  centroidLat: unknown;
  centroidLng: unknown;
  prevAcres: unknown;
  areaFlagged: boolean;
  source: string;
  actorId: string | null;
  actorName: string | null;
  captureId: string | null;
  restoredFromVersionId: string | null;
  createdAt: Date;
}): SerializedBoundaryVersion {
  return {
    ...v,
    measuredAcres: toNum(v.measuredAcres),
    perimeterM: toNum(v.perimeterM),
    centroidLat: toNum(v.centroidLat),
    centroidLng: toNum(v.centroidLng),
    prevAcres: toNum(v.prevAcres),
    createdAt: v.createdAt.toISOString(),
  };
}

function flagForChange(prev: number | null, next: number | null): { delta: number | null; pct: number | null; flagged: boolean } {
  if (prev === null || next === null) return { delta: null, pct: null, flagged: false };
  const delta = next - prev;
  if (prev === 0) return { delta, pct: null, flagged: delta !== 0 };
  const pct = delta / prev;
  return { delta, pct, flagged: Math.abs(pct) >= AREA_CHANGE_FLAG_THRESHOLD };
}

export async function commitBoundary<T extends { id: string }>(
  tx: Tx,
  entity: { type: BoundaryEntityType; id?: string },
  boundary: BoundaryWrite,
  prov: VersionProvenance,
  writeCurrent: (tx: Tx) => Promise<T>,
  opts?: { createdAt?: Date }
): Promise<CommittedVersion & { result: T }> {
  // Serialize concurrent writers of THIS entity BEFORE reading anything:
  // the entity row lock is acquired first, then the latest version is read
  // with a LOCKING read (sees latest committed data, never a stale
  // repeatable-read snapshot). A plain read-then-retry loop DIVERGES here
  // (proven: versions [1,3,6,10,15] under 5-way concurrency) — the P2002
  // retry below remains only as last-resort armor.
  let prev: { version: number; measuredAcres: unknown } | null = null;
  if (entity.id) {
    const table = entity.type === "FARM" ? "Farm" : "Plot";
    await tx.$queryRawUnsafe(`SELECT id FROM \`${table}\` WHERE id = ? FOR UPDATE`, entity.id);
    const latest = await tx.$queryRawUnsafe<{ version: number; measuredAcres: unknown }[]>(
      "SELECT version, measuredAcres FROM `BoundaryVersion` WHERE entityType = ? AND entityId = ? ORDER BY version DESC LIMIT 1 FOR UPDATE",
      entity.type,
      entity.id
    );
    prev = latest[0] ?? null;
  }
  const prevAcres = prev ? toNum(prev.measuredAcres) : null;
  // Flag laundering defense: a clear (null acres) must not reset the
  // baseline. Compare against the last KNOWN acres for the flag, while
  // prevAcres stays truthfully null on the row itself.
  let flagBase = prevAcres;
  if (flagBase === null && boundary.acres !== null && entity.id) {
    const lastKnown = await tx.$queryRawUnsafe<{ a: unknown }[]>(
      "SELECT measuredAcres AS a FROM `BoundaryVersion` WHERE entityType = ? AND entityId = ? AND measuredAcres IS NOT NULL ORDER BY version DESC LIMIT 1",
      entity.type,
      entity.id
    );
    flagBase = toNum(lastKnown[0]?.a);
  }

  let ring: LngLat[] | null = null;
  if (boundary.geoJson !== null) {
    try {
      ring = parseBoundaryToRing(boundary.geoJson);
    } catch {
      ring = null;
    }
    if (!ring) throw new Error("Boundary polygon is unreadable at commit time.");
  }
  const perimeter = ring ? pathPerimeterM(ring) : null;
  const centroid = ring ? representativePoint(ring) : null;
  const { delta, pct, flagged } = flagForChange(flagBase, boundary.acres);

  // 1. current state first (2. version second) — same tx, atomic either way.
  // writeCurrent runs first so generated IDs (new plots) exist for the version row.
  const result = await writeCurrent(tx);
  const id = entity.id ?? result.id;

  // 2. version with conflict retry (concurrent writers).
  // NOTE: under the entity-row lock above, P2002 here is near-impossible;
  // the re-read below is itself locking (plain reads could be snapshot-stale).
  let base = (prev?.version ?? 0) + 1;
  let created: { id: string; version: number } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      created = await tx.boundaryVersion.create({
        data: {
          entityType: entity.type,
          entityId: id,
          version: base + attempt,
          boundaryGeoJson: boundary.geoJson,
          measuredAcres: boundary.acres,
          perimeterM: perimeter,
          centroidLat: centroid ? centroid[1] : null,
          centroidLng: centroid ? centroid[0] : null,
          prevAcres,
          areaFlagged: flagged,
          source: prov.source,
          actorId: prov.actorId ?? null,
          actorName: prov.actorName ?? null,
          captureId: prov.captureId ?? null,
          restoredFromVersionId: prov.restoredFromVersionId ?? null,
          ...(opts?.createdAt ? { createdAt: opts.createdAt } : {}),
        },
        select: { id: true, version: true },
      });
      break;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002" && attempt < 4) {
        const relatest = await tx.$queryRawUnsafe<{ version: number }[]>(
          "SELECT version FROM `BoundaryVersion` WHERE entityType = ? AND entityId = ? ORDER BY version DESC LIMIT 1 FOR UPDATE",
          entity.type,
          entity.id ?? ""
        );
        base = (relatest[0]?.version ?? base + attempt) + 1;
        continue;
      }
      throw e;
    }
  }
  if (!created) throw new Error("Could not allocate a boundary version after retries.");

  // 3. GPS evidence (natural key = captureId: redelivery is a no-op read).
  // Stale-orphan healing and cross-entity conflicts are resolved by callers
  // (sync route) BEFORE the tx, where actor context exists for auditing;
  // this is the backstop, and it stays loud.
  if (prov.track && prov.captureId) {
    const prior = await tx.walkTrack.findUnique({ where: { id: prov.captureId } });
    if (prior) {
      if (prior.entityType !== entity.type || prior.entityId !== id) {
        throw new Error("This capture is already linked to a different farm/plot.");
      }
    } else {
      await tx.walkTrack.create({
        data: {
          id: prov.captureId,
          entityType: entity.type,
          entityId: id,
          rawSamples: prov.track.rawSamples as object,
          cleanedSamples: prov.track.cleanedSamples as object,
          samplesKept: prov.track.kept,
          samplesDropped: prov.track.dropped,
          quality: prov.track.quality,
          acres: boundary.acres,
          actorId: prov.actorId ?? null,
        },
      });
    }
  }

  return {
    id: created.id,
    version: created.version,
    prevAcres,
    acres: boundary.acres,
    deltaAcres: delta,
    deltaPct: pct,
    areaFlagged: flagged,
    result,
  };
}
