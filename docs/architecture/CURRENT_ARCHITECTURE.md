# CURRENT_ARCHITECTURE (audited 2026-09-16)

Evidence-based. Every claim below was read from the repo, not inferred
from folder names.

## Stack

Next.js 16.3.3 (App Router) + React 19 + TypeScript 5 + Prisma 6 + MySQL,
Tailwind 4, JWT (`jose`) in HttpOnly cookies (8h), Zod validation,
S3-compatible storage, Vitest (unit, colocated `src/**/*.test.ts`) +
Playwright (`tests/e2e/agaate-critical.spec.ts`).

## Layout (actual)

- `src/app/` — 23 top-level route groups + `api/` with 31 route groups
  (~90 route handlers). Route groups mix three axes: **business**
  (`farms`, `plots`, `tasks`, `attendance`, `reports`), **role**
  (`hq`, `officer`, `owner`, `admin`, `agronomy`, `operations`, `work`),
  and **lifecycle** (`onboarding`, `dashboard`, `directory`, `spatial`, `system`).
  `hq`, `officer`, `owner` each re-implement farm/plot/task/incident views
  for their role — same entities, parallel trees.
- `src/lib/` — ~35 files, the de-facto "everything" layer: auth, RBAC,
  geometry, attendance, auditing, storage, rate-limit, business math, plus
  ~20 test files. No subfolders.
- `src/components/` — 12 folders (`admin`, `agronomy`, `hq`, `officer`,
  `owner`, `ops`, `map`, `calendar`, `data`, `layout`, `nav`, `ui`) mixing
  generic primitives (`ui/`) with business components.
- `prisma/schema.prisma` — 29 models, 17 enums (see DOMAIN_MAP). Well
  indexed. No schema change is proposed by this rescue.

## Measured coupling (the core problem)

- **~133 files import `@/lib/prisma`; ~150 reference `prisma.`** — virtually
  every API route plus many `page.tsx` (server components) and even
  `src/components/hq/overview-*.tsx` query Prisma directly.
  Database access is **uncontrolled**: route handler = auth + validation +
  business rules + Prisma + audit + response shaping inline
  (see `src/app/api/attendance/route.ts`, 311 lines).
- **Auth is split but sound**: `auth.ts` (who), `actor.ts` (who, enriched),
  `rbac.ts` (what, PURE permission catalog — the best boundary in the repo),
  `access.ts` (which farm scope). Problem is *usage*: routes call
  `requireRole` with raw role strings instead of `requirePermission`.
- **Spatial is the bright spot**: `geo-core.ts` (502 lines, pure, documented
  "ONE home for all boundary geometry math") with thin compat layers
  `geo.ts` (map UI) / `geo-server.ts` (API) + canonical
  `attendance-geo.ts` (the ONE location authorizer) + `track.ts` (pure GPS
  cleaning) + `geo-versions.ts` (atomic current-write + version insert) +
  `geo-policy.ts` (thresholds). Zero duplication found in geometry — the
  pattern the rest of the codebase should copy.
- **Business math** (`business.ts`: haversine, acres, task transitions,
  milestones) is pure and pinned — but imported ad-hoc; no owner module.
- **Error handling** is centralized in `lib/api.ts` (`apiError`) with a
  user-facing message allow-list (good: no leak). Every route re-implements
  the try/catch boilerplate around it.
- **Tests** are colocated and substantial (geo, attendance, RBAC, E2E flows)
  — they are the behavioral spec and must stay green.

## Top findings (ranked by future cost)

1. Prisma-everywhere (133 files) — any DB/provider change touches everything.
2. Fat routes (~90 handlers own full vertical slice) — untestable in isolation.
3. Role-parallel trees (`hq`/`officer`/`owner`/`admin` API+UI) — same domains
   implemented 2–3× behind different URLs; auth-by-URL instead of
   auth-over-domain.
4. `src/lib/` + `src/components/` as dumping grounds — no ownership signal.
5. No import boundaries — nothing stops UI importing Prisma (and it does).
6. Terminology drift: farm vs estate, worker/labour/crew/people, task/work
   order/activity, plot/field (see CANONICAL_DOMAIN_TERMS).
7. Infra health is SEPARATE from structure (see TARGET §8): no evidence of
   build failure; risk is cognitive + change cost, not runtime.
