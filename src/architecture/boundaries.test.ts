/**
 * Architecture boundary tests — automated enforcement for docs/architecture/ARCHITECTURE_RULES.md.
 *
 * Strategy: static import scanning (no build graph needed, Windows-safe).
 * These tests FAIL on new violations, not on grandfathered ones — the
 * grandfather lists below shrink as migration proceeds (see MIGRATION_STATUS).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

function allSourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) allSourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

function importsOf(file: string): string[] {
  // Type-only imports (`import type ...`) are erased at runtime and do not
  // create a coupling edge — ignore them. Only value imports count.
  const src = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !/^\s*import\s+type\b/.test(line))
    .join("\n");
  const found: string[] = [];
  const re = /(?:import|from)\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) found.push(m[1]);
  const dyn = /import\(\s*["']([^"']+)["']\s*\)/g;
  let d: RegExpExecArray | null;
  while ((d = dyn.exec(src)) !== null) found.push(d[1]);
  return found;
}

// Files that MUST stay framework-free (pure domain). If you add an import
// of react/next/prisma here, this test fails — move the code instead.
const PURE_FILES = [
  "src/lib/business.ts",
  "src/lib/rbac.ts",
  "src/shared/errors.ts",
  "src/modules/spatial/index.ts",
  "src/modules/spatial/domain/geo-core.ts",
  "src/modules/spatial/domain/attendance-geo.ts",
  "src/modules/spatial/domain/geo-policy.ts",
  "src/modules/spatial/domain/track.ts",
  "src/modules/spatial/domain/plot-visits.ts",
  "src/modules/spatial/application/geo-server.ts",
  "src/modules/spatial/ui/geo.ts",
  "src/modules/operations/domain/completion.ts",
  "src/modules/operations/schemas/completion.ts",
  "src/modules/estates/domain/estatePolicy.ts",
  "src/modules/plots/domain/plotPolicy.ts",
  "src/modules/cropping/domain/cropCyclePolicy.ts",
];

// Physical locations killed by checkpoint 3 (git mv). If any reappears,
// the migration regressed — this fails.
const DELETED_PATHS = [
  "components",
  "src/lib/geo-core.ts",
  "src/lib/geo.ts",
  "src/lib/geo-server.ts",
  "src/lib/geo-policy.ts",
  "src/lib/geo-versions.ts",
  "src/lib/attendance-geo.ts",
  "src/lib/track.ts",
  "src/lib/walk-queue.ts",
  "src/lib/plot-visits.ts",
  "src/lib/plot-visit-service.ts",
  "public/init_migration.sql",
  "public/migrations_upgrade.sql",
  "public/schema_full.sql",
  "public/erd.html",
];

// Role-named component dumping grounds killed in checkpoint 4. Business
// components live in modules/*/ui; generic ones in components/{ui,layout,
// navigation,data}. If any of these dirs reappears, ownership regressed.
const BANNED_COMPONENT_DIRS = [
  "src/components/admin",
  "src/components/hq",
  "src/components/owner",
  "src/components/officer",
  "src/components/ops",
  "src/components/agronomy",
  "src/components/map",
  "src/components/calendar",
  "src/components/nav",
];

// Old ungrouped page trees (now under workspace route groups; URLs unchanged).
const BANNED_APP_DIRS = [
  "src/app/hq",
  "src/app/admin",
  "src/app/agronomy",
  "src/app/owner",
  "src/app/officer",
];

// Server pages with direct Prisma reads (checkpoint-4 audit: 35; checkpoint-8 estates/plots: 32; phase E cropping: 29). May only
// shrink as reporting/estates/operations/cropping slices introduce query modules.
// Exact-count pin: fails loudly on growth AND on unrecorded shrinkage.
const PAGE_PRISMA_COUNT = 29;

// UI components with direct Prisma access (checkpoint-3 audit, paths updated
// checkpoint 4). NOT allowed to grow: offenders must stay a subset of this
// list. Shrink it by migrating queries into modules, then delete the row.
const COMPONENT_PRISMA_GRANDFATHER = [
  "src/modules/reporting/ui/dashboard-client.tsx",
  "src/modules/reporting/ui/overview-activity.tsx",
  "src/modules/reporting/ui/overview-alerts.tsx",
  "src/modules/reporting/ui/overview-farms.tsx",
  "src/modules/reporting/ui/overview-funnel.tsx",
  "src/modules/reporting/ui/overview-kpis.tsx",
  "src/modules/reporting/ui/overview-triage.tsx",
  "src/components/navigation/config.ts",
];

// Routes already migrated to use-cases. They must stay thin adapters:
// no direct Prisma import (persistence lives in the module's application
// layer). Grandfathered fat routes are NOT on this list yet.
const THIN_ROUTES = [
  "src/app/api/tasks/[taskId]/complete/route.ts",
  "src/app/api/tasks/route.ts",
  "src/app/api/farms/route.ts",
  "src/app/api/farms/[farmId]/route.ts",
  "src/app/api/farms/[farmId]/activate/route.ts",
  "src/app/api/farms/[farmId]/access/route.ts",
  "src/app/api/farms/[farmId]/task-pins/route.ts",
  "src/app/api/plots/route.ts",
  "src/app/api/plots/[plotId]/route.ts",
  "src/app/api/farms/[farmId]/plots/route.ts",
  "src/app/api/plots/[plotId]/crop-cycles/route.ts",
  "src/app/api/plots/[plotId]/crop-cycles/[cycleId]/route.ts",
];

const BANNED_IN_PURE = ["react", "next/", "next-", "@prisma/", "@/lib/prisma", "server-only", "next/headers", "next/server"];

describe("architecture boundaries", () => {
  it("pure domain files import no framework/database modules", () => {
    const violations: string[] = [];
    for (const rel of PURE_FILES) {
      const f = join(ROOT, rel.split("/").join(sep));
      if (!existsSync(f)) continue;
      for (const imp of importsOf(f)) {
        if (BANNED_IN_PURE.some((b) => imp === b || imp.startsWith(b))) violations.push(`${rel} imports ${imp}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("no second earth-radius / haversine implementation outside spatial+business", () => {
    const offenders: string[] = [];
    for (const f of allSourceFiles(SRC)) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      if (/geo-core|geo-server|business|geo\.ts|track\.ts|attendance-geo/.test(rel)) continue;
      if (/\.test\.(ts|tsx)$/.test(rel)) continue;
      const src = readFileSync(f, "utf8");
      if (/6378137|6371000|6371_000/.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("shared/ contains no dumping-ground modules", () => {
    const banned = ["utils.ts", "helpers.ts", "common.ts", "misc.ts", "index.ts"];
    const found: string[] = [];
    const dir = join(SRC, "shared");
    if (existsSync(dir)) {
      for (const e of readdirSync(dir)) if (banned.includes(e)) found.push(e);
    }
    expect(found).toEqual([]);
  });

  it("filetree: one source tree, dead paths stay dead", () => {
    // ONE application source tree: no root components/ competing with src/.
    expect(existsSync(join(ROOT, "components"))).toBe(false);
    // Migrated / removed locations must not reappear.
    const resurrected = DELETED_PATHS.filter((rel) => existsSync(join(ROOT, ...rel.split("/"))));
    expect(resurrected).toEqual([]);
    // public/ serves runtime assets only — no SQL dumps, no ERD exports.
    const pub = join(ROOT, "public");
    const stray: string[] = [];
    if (existsSync(pub)) {
      for (const e of readdirSync(pub)) {
        if (/\.sql$/i.test(e) || /^erd\.html$/i.test(e)) stray.push(e);
      }
    }
    expect(stray).toEqual([]);
  });

  it("filetree: UI prisma access may only shrink", () => {
    const offenders: string[] = [];
    const scanRoots = [join(SRC, "components")];
    const mods = join(SRC, "modules");
    if (existsSync(mods)) {
      for (const mod of readdirSync(mods)) {
        const ui = join(mods, mod, "ui");
        if (existsSync(ui)) scanRoots.push(ui);
      }
    }
    for (const root of scanRoots) {
      for (const f of allSourceFiles(root)) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      for (const imp of importsOf(f)) {
        if (imp === "@/lib/prisma" || imp === "@infrastructure/db" || imp.startsWith("@prisma/")) {
          offenders.push(rel);
          break;
        }
      }
      }
    }
    const unexpected = offenders.filter((o) => !COMPONENT_PRISMA_GRANDFATHER.includes(o));
    expect(unexpected).toEqual([]);
  });

  it("ui: no role-named dumping grounds, no ungrouped page trees", () => {
    const resurrected = [...BANNED_COMPONENT_DIRS, ...BANNED_APP_DIRS].filter((rel) =>
      existsSync(join(ROOT, ...rel.split("/")))
    );
    expect(resurrected).toEqual([]);
  });

  it("ui: non-api routes contain only route files (no business modules)", () => {
    const bad: string[] = [];
    const app = join(SRC, "app");
    for (const f of allSourceFiles(app)) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      if (rel.startsWith("src/app/api/")) continue;
      if (/\/(page|layout|loading|error|not-found|template|default)\.tsx$/.test(rel)) continue;
      bad.push(rel);
    }
    expect(bad).toEqual([]);
  });

  it("ui: page-level Prisma reads may only shrink", () => {
    let count = 0;
    for (const f of allSourceFiles(join(SRC, "app"))) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      if (rel.startsWith("src/app/api/") || !rel.endsWith("page.tsx")) continue;
      if (importsOf(f).some((imp) => imp === "@/lib/prisma" || imp.startsWith("@prisma/"))) count++;
    }
    expect(count).toBe(PAGE_PRISMA_COUNT);
  });

  it("ui: navigation lives in components/navigation", () => {
    expect(existsSync(join(SRC, "components", "navigation", "config.ts"))).toBe(true);
    const stray: string[] = [];
    for (const f of allSourceFiles(SRC)) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      if (rel.startsWith("src/components/navigation/")) continue;
      const base = rel.split("/").pop() ?? "";
      if (/nav/i.test(base) && /\.(ts|tsx)$/.test(base) && !/\.test\./.test(base)) stray.push(rel);
    }
    expect(stray).toEqual([]);
  });

  it("filetree: every module domain/ stays framework-free", () => {
    const violations: string[] = [];
    const mods = join(SRC, "modules");
    if (existsSync(mods)) {
      for (const mod of readdirSync(mods)) {
        const domain = join(mods, mod, "domain");
        for (const f of allSourceFiles(domain)) {
          const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
          for (const imp of importsOf(f)) {
            if (
              imp === "react" ||
              imp.startsWith("next/") ||
              imp === "@/lib/prisma" ||
              imp === "@infrastructure/db" ||
              imp.startsWith("@prisma/")
            ) {
              violations.push(`${rel} imports ${imp}`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("modules expose a public entrypoint; no cross-module deep imports", () => {
    expect(existsSync(join(SRC, "modules", "spatial", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "auth", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "operations", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "attendance", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "estates", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "plots", "index.ts"))).toBe(true);
    expect(existsSync(join(SRC, "modules", "cropping", "index.ts"))).toBe(true);
    const violations: string[] = [];
    const modRe = /@\/(?:modules)\/([^/"']+)\/([^"']*)/;
    const aliasRe = /@(?:modules)\/([^/"']+)\/([^"']*)/;
    for (const f of allSourceFiles(join(SRC, "modules"))) {
      const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
      const owner = rel.split("/")[2]; // src/modules/<owner>/...
      for (const imp of importsOf(f)) {
        const m = modRe.exec(imp) ?? aliasRe.exec(imp);
        // domain/application/infrastructure are sealed; ui/ is compositional
        // (a farm view embedding a task calendar is composition, not coupling).
        if (m && m[1] !== owner && /^(domain|application|infrastructure)\//.test(m[2])) {
          violations.push(`${rel} deep-imports ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("migrated routes stay thin adapters (no direct Prisma)", () => {
    const violations: string[] = [];
    for (const rel of THIN_ROUTES) {
      const f = join(ROOT, rel.split("/").join(sep));
      if (!existsSync(f)) {
        violations.push(`${rel} MISSING`);
        continue;
      }
      for (const imp of importsOf(f)) {
        if (imp === "@/lib/prisma" || imp === "@infrastructure/db" || imp.startsWith("@prisma/")) {
          violations.push(`${rel} imports ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("filetree: every module application/ stays HTTP-free", () => {
    const violations: string[] = [];
    const mods = join(SRC, "modules");
    if (existsSync(mods)) {
      for (const mod of readdirSync(mods)) {
        for (const f of allSourceFiles(join(mods, mod, "application"))) {
          const rel = f.replace(ROOT + sep, "").replaceAll(sep, "/");
          for (const imp of importsOf(f)) {
            if (imp === "next/server" || imp.startsWith("next/")) {
              violations.push(`${rel} imports ${imp}`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("operations: PATCH delegates transition authority to the module", () => {
    const f = join(SRC, "app", "api", "tasks", "[taskId]", "route.ts");
    const imps = importsOf(f);
    expect(imps).toContain("@modules/operations");
    // No inline transition matrix, no inline eligibility predicates, no
    // completion redirect string in the route — all live in operations/.
    const src = readFileSync(f, "utf8");
    for (const needle of ["canTransitionTask", "planningFields", "farmAccess.length", "execution completion endpoint"]) {
      expect(src.includes(needle), `route still contains ${needle}`).toBe(false);
    }
    // Canonical table lives in exactly one place.
    expect(existsSync(join(SRC, "modules", "operations", "domain", "taskTransitions.ts"))).toBe(true);
  });

  it("canonical entrypoints re-export the single sources of truth", async () => {
    const spatial = (await import("@/modules/spatial")) as Record<string, unknown>;
    for (const key of ["ringAcres", "validateAttendanceLocation", "validatePlotGeometry", "TRACK"]) {
      expect(spatial[key], `modules/spatial missing ${key}`).toBeDefined();
    }
    const auth = (await import("@/modules/auth")) as Record<string, unknown>;
    for (const key of ["buildActor", "hasPermission", "requirePermission", "requireFarmAccess"]) {
      expect(auth[key], `modules/auth missing ${key}`).toBeDefined();
    }
    const db = (await import("@/infrastructure/db")) as Record<string, unknown>;
    expect(db["prisma"]).toBeDefined();
    const operations = (await import("@/modules/operations")) as Record<string, unknown>;
    for (const key of ["completeTask", "completionSchema", "CompletionFault", "planTask", "listTasks", "presentTaskMedia", "parseTaskListParams", "updateTask", "canTransitionTask", "TASK_TRANSITIONS"]) {
      expect(operations[key], `modules/operations missing ${key}`).toBeDefined();
    }
    const estates = (await import("@/modules/estates")) as Record<string, unknown>;
    for (const key of ["listEstates", "getEstateDetail", "getEstateCommandCenter", "createEstate", "updateEstate", "activateEstate", "listEstateAccess", "assignEstateOfficer", "unassignEstateOfficer", "getEstateTaskPins", "canTransitionEstate", "assertCultivableWithinTotal"]) {
      expect(estates[key], `modules/estates missing ${key}`).toBeDefined();
    }
    const plots = (await import("@/modules/plots")) as Record<string, unknown>;
    for (const key of ["listPlots", "getPlotDetail", "getPlotPageData", "getOwnerLandData", "createPlot", "updatePlot", "archivePlot", "assertPlotAreaWithinRemaining"]) {
      expect(plots[key], `modules/plots missing ${key}`).toBeDefined();
    }
    const cropping = (await import("@/modules/cropping")) as Record<string, unknown>;
    for (const key of [
      "createCropCycle",
      "getCropCycleDetail",
      "updateCropCycle",
      "deleteCropCycle",
      "getNewCropCyclePageData",
      "getCropCycleDetailPageData",
      "getEditCropCyclePageData",
      "canTransitionCropCycle",
      "calculatedInfrastructure",
      "milestoneTemplates",
      "assertStandardMilestones",
      "CropCycleFault",
    ]) {
      expect(cropping[key], `modules/cropping missing ${key}`).toBeDefined();
    }
  });
});
