# DEPENDENCY_MAP

## Allowed

```
app/* ──imports──▶ modules/*/index, infrastructure/*, shared/*
modules/* ──imports──▶ modules/*/index (via public API only), shared/*
infrastructure/* ──imports──▶ shared/* (+ domain types as needed)
shared/* ──imports──▶ nothing internal (stdlib + types only)
```

`estates` may use `spatial`. `attendance` may use `spatial` + `estates`
(types). `operations` may use `estates` + `cropping`. `reporting` may read
from any module's public query surface. No cycles: if A needs B and B
needs A, the shared concept moves to `shared/` or one direction is cut.

## Forbidden (enforced by tests/architecture/boundaries.test.ts)

- `src/app/**` importing `@/lib/prisma` directly (target; grandfathered
  existing routes — new routes must use `@/infrastructure/db`).
- `modules/spatial` importing Prisma/Next/React (pure forever).
- `src/lib/rbac.ts` importing Prisma/Next (pure forever).
- Any module importing another module's deep internals
  (`modules/X/domain/internal/*` from outside X).
- Client components importing server-only modules (`lib/auth`, `access`,
  `infrastructure/db`).

## Measured coupling (audit 2026-09-16)

- Fan-in king: `lib/prisma` (~133 importers), `lib/access` + `lib/api`
  (nearly every route), `lib/geo-core` (geo callers — healthy fan-in).
- Fan-out kings: `app/api/attendance/route.ts` (auth+prisma+audit+geo+
  ratelimit+security), `hq/*` routes (clients+farms+tasks+incidents).
- No import cycles detected at lib level (geo-core ← geo-server/geo/track
  is a DAG; business ← geo-core one edge). Risk is star-coupling on
  Prisma, not cycles.
