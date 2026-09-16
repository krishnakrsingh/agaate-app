# BEFORE → AFTER (checkpoint 3)

## Root

```
BEFORE                                    AFTER
/components/ui/{auth-section-1,demo}  →   DELETED (unimported re-export shims)
cookies.txt, server.log               →   DELETED (+ .gitignore hardened)
public/{init_migration,migrations_     →   DELETED (unreferenced; canonical
  upgrade,schema_full}.sql, erd.html      history is prisma/migrations/)
public/uploads/evidence/*.jpg (2)     →   DELETED (unreferenced; S3 is store)
prisma/migrations_upgrade.sql         →   KEPT (beside schema, drift evidence)
scripts/ (4 files, flat)              →   KEPT (verified live: tailwind builder
                                          feeds layout.tsx; backfills are one-shots)
graphify-out/, docs/index.html        →   KEPT (tracked generated history/portal)
```

## Spatial (the surgery)

```
BEFORE (src/lib/, flat)                   AFTER (src/modules/spatial/)
geo-core.ts + test                    →   domain/geo-core.ts + test
attendance-geo.ts + test              →   domain/attendance-geo.ts + test
geo-policy.ts                         →   domain/geo-policy.ts
track.ts + test                       →   domain/track.ts + test
plot-visits.ts + 2 tests              →   domain/plot-visits.ts + tests
geo-server.ts + geo-boundary.test     →   application/geo-server.ts + test
geo-versions.ts + test                →   application/geo-versions.ts + test
plot-visit-service.ts                 →   application/plot-visit-service.ts
walk-sync.test, plot-geo.test         →   application/ (route-level tests)
geo.ts + test                         →   ui/geo.ts + test
walk-queue.ts + test                  →   ui/walk-queue.ts + test
modules/spatial/index.ts (re-export)  →   index.ts (direct local exports)
```

34 external importers rewired (`@/lib/geo*` → `@modules/spatial`,
`@/lib/geo` → `@modules/spatial/ui/geo`, `@/lib/walk-queue` →
`@modules/spatial/ui/walk-queue`). Zero behavior change (move + import
rewire only; one relative import fixed in walk-sync.test).

## Deliberately NOT moved (with reason)

- `lib/business.ts` (~50 importers; haversine + task machine + milestones +
  formatting) — split is an operations/cropping/shared slice, not a move.
- Auth cluster, `lib/api|storage|audit|…` — own slices, entrypoints exist.
- `app/{hq,officer,owner,…}` role trees — collapse LAST (stable domains first).
- `src/components/*` business components — move with their domains.
- `plot-tasks.test`, `attendance-geo-route.test`, `geolocation.test`,
  `geo-write-paths.test` — stay in lib until their routes migrate.
