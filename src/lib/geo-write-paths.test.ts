import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Structural guarantee for the "0 geometry mutation paths without
 * provenance" rule: any API route file that writes boundaryGeoJson via
 * Prisma MUST funnel through commitBoundary (which pairs every write with
 * a version + provenance in one transaction).
 *
 * This fails closed: a future route that writes geometry directly breaks
 * this test until it is routed through the helper (or explicitly exempted
 * here with justification).
 */
const API = path.join(process.cwd(), "src", "app", "api");

function collect(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("geo write-path guard", () => {
  it("every boundaryGeoJson writer goes through commitBoundary", () => {
    const offenders: string[] = [];
    for (const f of collect(API)) {
      const src = fs.readFileSync(f, "utf8");
      if (!/boundaryGeoJson\s*:/.test(src)) continue;
      const writes = /(farm\.update|plot\.create|plot\.update)\s*\(/.test(src);
      if (writes && !src.includes("commitBoundary(")) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no route computes acres from geometry by hand (server math lives in geo-core)", () => {
    const offenders: string[] = [];
    for (const f of collect(API)) {
      const src = fs.readFileSync(f, "utf8");
      if (/6378137|4046\.8564224|spherical/i.test(src)) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });
});
