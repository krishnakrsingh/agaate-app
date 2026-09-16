# ARCHITECTURE_RULES (enforced, not aspirational)

1. Routes are thin: `route.ts` parses (Zod) → authenticates → authorizes
   (`requirePermission`) → calls a use-case/query → responds via
   `infrastructure/http`. No Prisma math, no geofence inline, no audit inline
   beyond the `audit()` helper. **Check:** review + arch test (Prisma import
   grandfather list).
2. Domain purity: files under `modules/*/domain` (and `lib/geo-core`,
   `lib/business`, `lib/rbac`, `lib/attendance-geo`, `lib/track`) must not
   import `react`, `next/*`, `@prisma/*`, `@/lib/prisma`. **Check:**
   `tests/architecture/boundaries.test.ts`.
3. Public APIs only: cross-module imports reference `modules/<d>/index.ts`.
   **Check:** arch test scans for `modules/<other>/domain|application/internals`.
4. Spatial monopoly: area/containment/distance/geofence math lives in
   `modules/spatial` (impl: `geo-core`). New copies are a defect.
   **Check:** arch test greps for `6378137|6371000` outside spatial/business.
5. Permissions, not roles: new code uses `requirePermission(actor, "x:y")`.
   Raw `requireRole` calls are legacy. **Check:** review checklist.
6. DB via infrastructure: new code imports Prisma from
   `@/infrastructure/db`. **Check:** arch test (new files).
7. Shared minimalism: `shared/` holds framework-free primitives only.
   No `utils.ts`/`helpers.ts`/`common.ts`. **Check:** review; test fails if
   those filenames appear under `shared/`.
8. No behavior change without a test proving the old behavior first.
   Architecture PRs keep all existing `src/**/*.test.ts` green.
