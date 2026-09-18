# CURRENT_TREE_SNAPSHOT (2026-09-16, pre-checkpoint-3)

Commit: 207c86f. Branch: main. Tree clean except checkpoint-1/2 work
(modified: complete route, tsconfig, vitest; untracked: docs/architecture,
src/architecture, src/infrastructure, src/modules, src/shared).

## Root (boring target: only config/tooling/docs entrypoints)

| Path | Status | Verdict |
|---|---|---|
| `components/` (2 re-export shims → `@/components`) | tracked, ZERO importers | DELETE |
| `cookies.txt`, `server.log` | tracked, unreferenced dev leftovers | DELETE + gitignore |
| `public/*.sql` (init_migration, migrations_upgrade, schema_full), `public/erd.html` | tracked, ZERO code refs | DELETE public copies (keep `prisma/migrations_upgrade.sql` beside schema) |
| `public/uploads/evidence/*.jpg` (2 files) | tracked, ZERO refs (seed match is farm-id string, not file) | DELETE (R2 is the evidence store; `/uploads/` is dev fallback) |
| `public/` icons + logos | runtime assets | KEEP |
| `scripts/` (4 files, flat) | backfills + doc/tailwind builders; no subdirs needed for 4 files | KEEP, documented |
| `prisma/seed-roles.ts`, `seed-scale.ts` | beside schema = right home; wiring TBD by owner | KEEP (no move) |
| `docs/index.html` | generated portal (`npm run build:docs`) | KEEP (generated, documented) |
| `graphify-out/` dated snapshots | tracked knowledge-graph history | KEEP (do not delete tracked history) |
| `.agents/`, `.cortex/`, `test-results/` (ignored) | tooling | KEEP |

## src/ (361 files)

- `src/app/` — 23 route groups + `api/` (31 groups, ~90 handlers). Axes mixed:
  business (`farms plots tasks attendance reports`), role (`hq officer owner
  admin agronomy operations work`), lifecycle (`onboarding dashboard directory
  spatial system`). Role trees stay as URL composition (cleanup LAST).
- `src/lib/` — ~35 impl + ~20 test files, flat. Spatial cluster
  (geo-core, geo, geo-server, geo-policy, geo-versions, attendance-geo,
  track, walk-queue + 9 test files) → `src/modules/spatial/` THIS checkpoint.
  `business.ts` (mixed: haversine + task machine + milestones + formatting)
  stays pending split. Auth cluster stays pending (entrypoint exists).
- `src/components/` — 137 files, 12 folders (generic `ui/` + business).
  Business components move with their domains LATER; only the root
  `/components` dup dies now.
- `src/modules/` — spatial (re-export), auth (re-export), operations
  (completion slice), `src/shared/errors.ts`,
  `src/infrastructure/{db,http}.ts`, `src/architecture/` tests.

## Key configs

- `@/*` → `src/*` (+ `@modules @shared @infrastructure` aliases, tsconfig +
  vitest). No `apps/web` monorepo (single Next.js app — rejected as fashion).
- `middleware.ts` — CSRF guard for cookie-authed API mutations (keep).
- Prisma: schema ↔ localhost DB reconciled checkpoint 2
  (`migrate status: up to date`, `tsc: 0`, suite 339/342).
