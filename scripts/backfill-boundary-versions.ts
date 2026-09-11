/**
 * One-off backfill: create v1 LEGACY BoundaryVersion rows for Farm/Plot
 * boundaries that predate versioning. Rerunnable (skips entities that
 * already have versions). Provenance is explicit: source LEGACY, unknown
 * actor, timestamp = entity updatedAt (last-known-change proxy).
 * Usage: node --env-file=.env --import=tsx scripts/backfill-boundary-versions.ts
 */
import { prisma } from "../src/lib/prisma";
import { parseBoundaryToRing, ringAcres, toGeoJsonPolygon } from "../src/lib/geo-core";
import { commitBoundary } from "../src/lib/geo-versions";

async function backfill(entityType: "FARM" | "PLOT") {
  const table = entityType === "FARM" ? prisma.farm : prisma.plot;
  const rows = (await (table as typeof prisma.farm).findMany({
    where: { boundaryGeoJson: { not: null } },
    select: { id: true, boundaryGeoJson: true, measuredAcres: true, updatedAt: true },
  })) as { id: string; boundaryGeoJson: string | null; measuredAcres: unknown; updatedAt: Date }[];
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.boundaryGeoJson) continue;
    const existing = await prisma.boundaryVersion.count({ where: { entityType, entityId: row.id } });
    if (existing > 0) {
      skipped++;
      continue;
    }
    let ring;
    try {
      ring = parseBoundaryToRing(row.boundaryGeoJson);
    } catch (e) {
      console.log(`${entityType} ${row.id}: UNREADABLE (${(e as Error).message}) — skipped, needs redraw`);
      continue;
    }
    if (!ring) continue;
    const acres = row.measuredAcres === null ? ringAcres(ring) : Number(String(row.measuredAcres));
    const rounded = Math.round(acres * 100) / 100;
    await prisma.$transaction((tx) =>
      commitBoundary(
        tx,
        { type: entityType, id: row.id },
        { geoJson: toGeoJsonPolygon(ring!), acres: rounded },
        { source: "LEGACY" },
        async () => ({ id: row.id }),
        { createdAt: row.updatedAt }
      )
    );
    created++;
  }
  console.log(`${entityType}: ${created} v1 LEGACY versions created, ${skipped} already versioned, ${rows.length} fenced total`);
}

async function main() {
  await backfill("FARM");
  await backfill("PLOT");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
