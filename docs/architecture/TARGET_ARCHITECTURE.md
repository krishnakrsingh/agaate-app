# TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite)

## Principle

`app/` defines routes and composition. `modules/` defines business
capabilities. `infrastructure/` defines technology integrations. `shared/`
holds only genuinely cross-domain primitives. Roles CUT ACROSS modules.

```
src/
├── app/                  # URLs only. Thin: parse → auth → use-case → respond
├── modules/              # business capabilities, each with index.ts public API
│   ├── spatial/          # ✅ ESTABLISHED (pilot) — geometry, geofence, walks, versions
│   ├── auth/             # ✅ ESTABLISHED (re-export) — identity + authorization
│   ├── organization/     # TARGET — clients, users, farm access, onboarding
│   ├── estates/          # TARGET — farms + plots + boundaries (uses spatial)
│   ├── cropping/         # TARGET — crop cycles, varieties, milestones, plans
│   ├── operations/       # TARGET — tasks, executions, labour/material
│   ├── attendance/       # TARGET — check-in/out, exceptions, musters
│   ├── agronomy/         # TARGET — monitoring, prescriptions, diagnostics
│   ├── incidents/        # TARGET — incidents + follow-ups
│   ├── harvest/          # TARGET — harvest logs
│   ├── inventory/        # TARGET — items + transactions
│   ├── finance/          # TARGET — expenses
│   ├── reporting/        # TARGET — dashboards, analytics, daily reports
│   ├── audit/            # TARGET — audit log writer/reader
│   └── media/            # TARGET — uploads, presign, verification
├── infrastructure/       # ✅ STARTED — db.ts, http.ts (Prisma, S3, mail next)
├── shared/               # ✅ STARTED — errors.ts (framework-free only)
└── components/ui/        # generic primitives only (Button/Input/Dialog/Table)
```

## Rules that make it real

- Every module exposes `index.ts` as its public API. Cross-module imports
  go through the entrypoint, never deep internals.
- Module size is earned: small domains stay one file; only complex domains
  get `domain/ application/ infrastructure/ ui/ schemas/ tests/`.
- Dependency direction: UI → application → domain → infrastructure.
  Domain imports NOTHING framework-specific (no React/Next/Prisma/HTTP).
- Prisma is infrastructure: new code imports from `@/infrastructure/db`.
- No `shared/utils.ts` dumping ground. "Put code where its meaning lives."
- No role modules: `hq/officer/owner` become route composition over the
  same domain capabilities, with `requirePermission` at the edge.

## Why these boundaries

Derived from Prisma relations + API behavior + import graph (see
DOMAIN_MAP + DEPENDENCY_MAP), not from current folder names. `spatial`
went first because it is already pure, already single-sourced, already
tested — lowest risk, highest proof that the pattern works. `auth`
second because every route depends on it and `rbac.ts` is already pure.

## What we explicitly do NOT add

Microservices, Kafka/queues, CQRS infra, generic repositories, DI
frameworks, 15 packages. Simple query modules for reads; use-cases only
where business operations need orchestration.

## Infra health (§28, separate from structure)

No build/runtime emergency found during audit (clean `tsc`, tests
colocated, Prisma indexed). Watch items, not blockers: `.next/` size,
Prisma generate on fresh clones, in-memory rate-limit (single-instance
only), client/server boundary discipline. Do not "fix" these by hiding
symptoms; track in MIGRATION_STATUS.
