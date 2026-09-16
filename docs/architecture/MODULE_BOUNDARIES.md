# MODULE_BOUNDARIES — one owner per capability

| Capability | Owner (target) | Current source of truth | Target | Status |
|---|---|---|---|---|
| Geometry math (area, containment, clipping) | `spatial` | `lib/geo-core.ts` ✅ single | `modules/spatial/domain/geo-core.ts` (git mv) | VERIFIED |
| Boundary validation / plot-in-farm | `spatial` | `lib/geo-server.ts` ✅ | `modules/spatial/application/geo-server.ts` (git mv) | VERIFIED |
| Geofence/attendance decision | `spatial` (decision) + `attendance` (state) | `lib/attendance-geo.ts` ✅ | `modules/spatial/domain/attendance-geo.ts` (git mv) | VERIFIED |
| Walk sampling/cleaning | `spatial` | `lib/track.ts` ✅ | `modules/spatial/domain/track.ts` (git mv) | VERIFIED |
| Walk outbox (client) | `spatial` | `lib/walk-queue.ts` | `modules/spatial/ui/walk-queue.ts` (git mv) | VERIFIED |
| Map UI helpers | `spatial` | `lib/geo.ts` | `modules/spatial/ui/geo.ts` (git mv; import via `@modules/spatial/ui/geo`) | VERIFIED |
| Field coverage (visits) | `spatial` | `lib/plot-visits.ts` + `lib/plot-visit-service.ts` (split across layers, one owner) | `modules/spatial/domain/plot-visits.ts` + `application/plot-visit-service.ts` (git mv) | VERIFIED |
| Boundary versions (atomic write) | `spatial` | `lib/geo-versions.ts` ✅ | `modules/spatial/application/geo-versions.ts` (git mv) | VERIFIED |
| Permission catalog | `auth` | `lib/rbac.ts` ✅ pure | `modules/auth` ✅ | MIGRATED (re-export) |
| Session / actor | `auth` | `lib/auth.ts` + `lib/actor.ts` | `modules/auth` ✅ | MIGRATED (re-export) |
| Farm scoping | `auth` | `lib/access.ts` | `modules/auth` | IN_PROGRESS |
| DB singleton | `infrastructure` | `lib/prisma.ts` | `infrastructure/db.ts` ✅ | MIGRATED (re-export) |
| HTTP envelope/errors | `infrastructure` | `lib/api.ts` | `infrastructure/http.ts` ✅ | MIGRATED (re-export) |
| Task state transitions | `operations` | `lib/business.ts` table + PATCH inline gates | `modules/operations/domain/taskTransitions.ts` canonical (business.ts = marked compat re-export); officer policy + update guards in `domain/taskUpdate.ts`; `updateTask()` use-case; hq PATCH keeps own checks | MIGRATED → VERIFIED (main path) |
| Task planning (create/assign) | `operations` | `app/api/tasks/route.ts` POST | `modules/operations`: `planTask()` + `domain/plannedTask.ts` + `schemas/plannedTask.ts`; route keeps edge role check + media-URL enrichment | MIGRATED → VERIFIED |
| Task listing (read) | `operations` | `app/api/tasks/route.ts` GET | `modules/operations`: `listTasks()` + `infrastructure/taskQueries.ts` (canonical include) + `presentTaskMedia` (shared with planning); route returns `paginatedJson` only | MIGRATED → VERIFIED |
| Task assignment eligibility | `operations` (future) | 3× inline copies: tasks POST, tasks PATCH, hq PATCH, incidents | Unconsolidated by design (one-capability rule); next slice consolidates | NOT_STARTED |
| Task completion (execution) | `operations` | `app/api/tasks/[taskId]/complete/route.ts` | `modules/operations`: `completeTask()` use-case + `domain/completion.ts` rules; route is thin adapter | MIGRATED → VERIFIED |
| Milestone templates | `cropping` | `lib/business.ts` | `modules/cropping` | NOT_STARTED |
| Haversine | `spatial` (reuse) | `lib/business.ts distanceMeters` | `modules/spatial` | NOT_STARTED |

Rules: geofence evaluation → spatial. Attendance status → attendance.
Task assignment → operations. Crop plan rules → cropping. If two modules
claim a rule, this table decides — update the table, not the code, first.
