import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { cleanSamples, assessTrack, type GpsSample } from "@/lib/track";
import {
  toGeoJsonPolygon,
  roundAcresForDb,
  representativePoint,
  parseBoundaryToRing,
  validatePlotGeometry,
  type LngLat,
} from "@/lib/geo-server";
import { commitBoundary } from "@/lib/geo-versions";

const sampleSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
  acc: z.number().finite(),
  t: z.number().finite(),
});

const schema = z.object({
  captureId: z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/, "captureId must be URL-safe"),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("FARM"), farmId: z.string() }),
    z.object({
      kind: z.literal("PLOT_NEW"),
      farmId: z.string(),
      name: z.string().min(1).max(120),
      soilType: z.string().max(100).optional().nullable(),
    }),
    z.object({ kind: z.literal("PLOT_EXISTING"), plotId: z.string() }),
  ]),
  samples: z.array(sampleSchema).min(1).max(2000),
});

function centroid(ring: LngLat[]): { lat: number; lng: number } {
  const [lng, lat] = representativePoint(ring);
  return { lat, lng };
}

function sameRing(a: LngLat[] | null, b: LngLat[]): boolean {
  return !!a && a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);
}

/**
 * Capture-identity reconciliation (runs AFTER authorization, so track
 * existence is never leaked to unauthorized callers). Returns a 409
 * response for genuine cross-entity reuse, heals stale evidence left by
 * deleted entities (audited), and passes through otherwise.
 */
async function reconcileCaptureTrack(
  captureId: string,
  expected: { entityType: "FARM" | "PLOT"; entityId: string } | null,
  actorId: string
): Promise<NextResponse | null> {
  const prior = await prisma.walkTrack.findUnique({ where: { id: captureId } });
  if (!prior) return null;
  if (expected && prior.entityType === expected.entityType && prior.entityId === expected.entityId) return null;
  const linkedGone =
    prior.entityType === "FARM"
      ? !(await prisma.farm.findUnique({ where: { id: prior.entityId }, select: { id: true } }))
      : !(await prisma.plot.findUnique({ where: { id: prior.entityId }, select: { id: true } }));
  if (linkedGone) {
    await prisma.walkTrack.delete({ where: { id: captureId } });
    await audit(actorId, "WALK_TRACK_EVICT", prior.entityType === "FARM" ? "Farm" : "Plot", prior.entityId, {
      captureId,
      reason: "orphaned evidence replaced by resync",
    });
    return null;
  }
  return NextResponse.json(
    { error: "This walk was already synced to a different farm/plot.", code: "CAPTURE_REUSED" },
    { status: 409 }
  );
}

/** Persist GPS evidence for an already-current geometry (no new version). */
async function recordWalkEvidence(args: {
  captureId: string;
  entityType: "FARM" | "PLOT";
  entityId: string;
  rawSamples: unknown;
  cleaned: { points: GpsSample[]; quality: string; acres: number };
  actorId: string;
}): Promise<void> {
  await prisma.walkTrack.upsert({
    where: { id: args.captureId },
    update: {},
    create: {
      id: args.captureId,
      entityType: args.entityType,
      entityId: args.entityId,
      rawSamples: args.rawSamples as object,
      cleanedSamples: args.cleaned.points as object,
      samplesKept: args.cleaned.points.length,
      samplesDropped: 0,
      quality: args.cleaned.quality,
      acres: args.cleaned.acres,
      actorId: args.actorId,
    },
  });
}

/**
 * Idempotent perimeter-walk ingest. The client submits RAW GPS samples plus
 * a stable captureId; the server re-cleans, re-validates, re-measures, and
 * persists through the SAME canonical farm/plot paths as drawn boundaries.
 * Client-computed polygons and acres are never trusted (not even accepted).
 *
 * - farm boundary PATCH with identical geometry → { already: true }
 * - plot create with a seen captureId → { deduped: true, plot }
 * - authz is re-checked at sync time: revoked access → 403, retryable later
 * POST /api/geo/captures/sync
 */
export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin, getClientIp } = await import("@/lib/security");
    assertSameOrigin(request);
    const { currentActor } = await import("@/lib/access");
    const syncActor = await currentActor();
    const { throttle } = await import("@/lib/rate-limit");
    const slot = throttle(`geo-sync:${getClientIp(request.headers)}:${syncActor.id}`, 30, 60_000);
    if (!slot.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    const input = schema.parse(await request.json());

    const cleaned = cleanSamples(input.samples);
    const report = assessTrack(cleaned);
    if (report.quality === "INVALID" || !report.ring) {
      return NextResponse.json(
        {
          error: `Walk cannot become a boundary: ${report.reasons.join(" ")}`,
          code: "TRACK_INVALID",
          quality: report.quality,
          reasons: report.reasons,
        },
        { status: 422 }
      );
    }
    const ring = report.ring;
    const acres = roundAcresForDb(report.acres);
    const geoJson = toGeoJsonPolygon(ring);

    if (input.target.kind === "FARM") {
      const { farmId } = input.target;
      const actor = await requireFarmAccess(farmId, true);
      const clash = await reconcileCaptureTrack(input.captureId, { entityType: "FARM", entityId: farmId }, actor.id);
      if (clash) return clash;
      const farm = await prisma.farm.findUniqueOrThrow({
        where: { id: farmId },
        select: { boundaryGeoJson: true },
      });
      if (farm.boundaryGeoJson) {
        try {
          if (sameRing(parseBoundaryToRing(farm.boundaryGeoJson), ring)) {
            // Geometry already current: no new version, but the new walk's
            // evidence is still worth keeping.
            await recordWalkEvidence({
              captureId: input.captureId,
              entityType: "FARM",
              entityId: farmId,
              rawSamples: input.samples,
              cleaned: { points: cleaned.points, quality: report.quality, acres },
              actorId: actor.id,
            });
            return NextResponse.json({ accepted: true, already: true, kind: "FARM", id: farmId, acres });
          }
        } catch {
          // unreadable existing fence: overwrite below
        }
      }
      await prisma.$transaction(async (tx) =>
        commitBoundary(
          tx,
          { type: "FARM", id: farmId },
          { geoJson, acres },
          {
            source: "GPS_WALK",
            actorId: actor.id,
            actorName: actor.name,
            captureId: input.captureId,
            track: {
              rawSamples: input.samples,
              cleanedSamples: cleaned.points,
              kept: cleaned.points.length,
              dropped: Object.values(cleaned.dropped).reduce((s, n) => s + (n ?? 0), 0),
              quality: report.quality,
            },
          },
          async (t) => t.farm.update({ where: { id: farmId }, data: { boundaryGeoJson: geoJson, measuredAcres: acres } })
        )
      );
      await audit(actor.id, "WALK_SYNC", "Farm", farmId, {
        captureId: input.captureId,
        acres,
        samples: cleaned.points.length,
        quality: report.quality,
      });
      return NextResponse.json(
        { accepted: true, kind: "FARM", id: farmId, acres, quality: report.quality, warnings: report.reasons },
        { status: 201 }
      );
    }

    if (input.target.kind === "PLOT_NEW") {
      const { farmId, name, soilType } = input.target;
      const actor = await requireFarmAccess(farmId, true);
      const seen = await prisma.plot.findUnique({ where: { captureId: input.captureId } });
      if (seen) {
        return NextResponse.json({ accepted: true, deduped: true, kind: "PLOT", id: seen.id, acres: Number(seen.measuredAcres ?? seen.area) });
      }
      // No plot carries this capture, but a track might (deleted-plot retry):
      // heal stale evidence or reject genuine reuse — after auth, never before.
      const clash = await reconcileCaptureTrack(input.captureId, null, actor.id);
      if (clash) return clash;
      const farm = await prisma.farm.findUniqueOrThrow({
        where: { id: farmId },
        select: { boundaryGeoJson: true },
      });
      let geo;
      try {
        geo = validatePlotGeometry(ring, farm.boundaryGeoJson);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Plot walk leaves the farm fence.", code: "PLOT_OUTSIDE_FARM" },
          { status: 422 }
        );
      }
      if (!geo) {
        return NextResponse.json({ error: "Walk produced no usable plot geometry.", code: "TRACK_INVALID" }, { status: 422 });
      }
      const c = centroid(ring);
      // Walked geometry is ground truth: no cultivable-area allocation cap
      // on this path (a real walk can exceed stale paperwork figures).
      const trackEvidence = {
        rawSamples: input.samples,
        cleanedSamples: cleaned.points,
        kept: cleaned.points.length,
        dropped: Object.values(cleaned.dropped).reduce((s, n) => s + (n ?? 0), 0),
        quality: report.quality,
      };
      let plot;
      try {
        const created = await prisma.$transaction((tx) =>
          commitBoundary(
            tx,
            { type: "PLOT" },
            { geoJson: geo.geoJson, acres: roundAcresForDb(geo.acres) },
            {
              source: "GPS_WALK",
              actorId: actor.id,
              actorName: actor.name,
              captureId: input.captureId,
              track: trackEvidence,
            },
            async (t) =>
              t.plot.create({
                data: {
                  farmId,
                  name,
                  area: roundAcresForDb(geo.acres),
                  latitude: Math.min(90, Math.max(-90, c.lat)),
                  longitude: Math.min(180, Math.max(-180, c.lng)),
                  soilType: soilType ?? null,
                  boundaryGeoJson: geo.geoJson,
                  measuredAcres: roundAcresForDb(geo.acres),
                  captureId: input.captureId,
                  status: "SETUP",
                },
              })
          )
        );
        plot = created.result;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "P2002") {
          // Either a simultaneous identical redelivery won the race (resolve
          // from its evidence → deduped) or the name is taken (explicit 409).
          const track = await prisma.walkTrack.findUnique({ where: { id: input.captureId } });
          if (track && track.entityType === "PLOT") {
            const p = await prisma.plot.findUnique({ where: { id: track.entityId } });
            if (p) {
              return NextResponse.json({ accepted: true, deduped: true, kind: "PLOT", id: p.id, acres: Number(p.measuredAcres ?? p.area) });
            }
          }
          const target = (e as { meta?: { target?: unknown } }).meta?.target;
          const hitsName = Array.isArray(target)
            ? target.includes("name")
            : typeof target === "string" && target.includes("name");
          if (hitsName) {
            return NextResponse.json(
              { error: `A plot named "${name}" already exists on this farm. Rename and sync again (same captureId stays idempotent).`, code: "PLOT_NAME_TAKEN" },
              { status: 409 }
            );
          }
        }
        throw e;
      }
      await audit(actor.id, "WALK_SYNC", "Plot", plot.id, {
        captureId: input.captureId,
        farmId,
        acres: Number(plot.measuredAcres),
        samples: cleaned.points.length,
        quality: report.quality,
      });
      return NextResponse.json(
        { accepted: true, kind: "PLOT", id: plot.id, acres: Number(plot.measuredAcres), quality: report.quality, warnings: report.reasons },
        { status: 201 }
      );
    }

    // PLOT_EXISTING
    const existing = await prisma.plot.findUnique({
      where: { id: input.target.plotId },
      include: { farm: { select: { boundaryGeoJson: true } } },
    });
    if (!existing) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    const actor = await requireFarmAccess(existing.farmId, true);
    const clash = await reconcileCaptureTrack(input.captureId, { entityType: "PLOT", entityId: existing.id }, actor.id);
    if (clash) return clash;
    if (existing.boundaryGeoJson) {
      try {
        if (sameRing(parseBoundaryToRing(existing.boundaryGeoJson), ring)) {
          // Geometry already current: no new version, but keep this walk's evidence.
          await recordWalkEvidence({
            captureId: input.captureId,
            entityType: "PLOT",
            entityId: existing.id,
            rawSamples: input.samples,
            cleaned: { points: cleaned.points, quality: report.quality, acres },
            actorId: actor.id,
          });
          return NextResponse.json({ accepted: true, already: true, kind: "PLOT", id: existing.id, acres: Number(existing.measuredAcres ?? existing.area) });
        }
      } catch {
        // fall through to overwrite
      }
    }
    let geo;
    try {
      geo = validatePlotGeometry(ring, existing.farm.boundaryGeoJson);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Plot walk leaves the farm fence.", code: "PLOT_OUTSIDE_FARM" },
        { status: 422 }
      );
    }
    if (!geo) {
      return NextResponse.json({ error: "Walk produced no usable plot geometry.", code: "TRACK_INVALID" }, { status: 422 });
    }
    await prisma.$transaction((tx) =>
      commitBoundary(
        tx,
        { type: "PLOT", id: existing.id },
        { geoJson: geo.geoJson, acres: roundAcresForDb(geo.acres) },
        {
          source: "GPS_WALK",
          actorId: actor.id,
          actorName: actor.name,
          captureId: input.captureId,
          track: {
            rawSamples: input.samples,
            cleanedSamples: cleaned.points,
            kept: cleaned.points.length,
            dropped: Object.values(cleaned.dropped).reduce((s, n) => s + (n ?? 0), 0),
            quality: report.quality,
          },
        },
        async (t) =>
          t.plot.update({
            where: { id: existing.id },
            data: {
              boundaryGeoJson: geo.geoJson,
              measuredAcres: roundAcresForDb(geo.acres),
              area: roundAcresForDb(geo.acres),
            },
          })
      )
    );
    await audit(actor.id, "WALK_SYNC", "Plot", existing.id, {
      captureId: input.captureId,
      acres: roundAcresForDb(geo.acres),
      samples: cleaned.points.length,
      quality: report.quality,
    });
    return NextResponse.json(
      { accepted: true, kind: "PLOT", id: existing.id, acres: roundAcresForDb(geo.acres), quality: report.quality, warnings: report.reasons },
      { status: 200 }
    );
  } catch (error) {
    return apiError(error);
  }
}
