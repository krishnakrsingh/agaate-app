# MIGRATION_STATUS

| Area | State | Notes |
|---|---|---|
| spatial (entrypoint) | VERIFIED (physical) | Checkpoint 3: 21 files git-mv'd `lib/` → `modules/spatial/{domain,application,ui}/`; 34 importers rewired; old paths deleted (arch-test pinned). 131/131 spatial+arch+operations tests green. Remaining edge: domain reads haversine from `@/lib/business` (pending business.ts split). |
| root cleanup | MIGRATED | Checkpoint 3: deleted root `/components` shims, `cookies.txt`, `server.log`, `public/*.sql`+`erd.html`, unreferenced evidence jpgs; `.gitignore` hardened. `prisma/migrations_upgrade.sql` kept beside schema. |
| auth (entrypoint) | MIGRATED (re-export) | `src/modules/auth/index.ts`; `rbac.ts` purity enforced by test |
| infrastructure/db, http | MIGRATED (re-export) | New code must use these paths |
| shared/errors | MIGRATED | Framework-free; `lib/api.ts` remains HTTP mapper |
| operations/completion | MIGRATED → VERIFIED | Checkpoint 2: `POST /api/tasks/[taskId]/complete` thinned to adapter; rules in `modules/operations/domain/completion.ts`, orchestration in `application/completeTask.ts`, zod in `schemas/completion.ts`. Route keeps edge role check + response shaping for CompletionFault. Full suite green incl. DB-backed api-integration completion test (339/342; 3 fails are pre-existing design-guard CSS). See ADR-006. |
| operations (rest) | IN_PROGRESS | Checkpoint 5: planning migrated. Checkpoint 6: list migrated (route GET+POST thin, Prisma-free). Checkpoint 7: PATCH migrated (`updateTask` + canonical `domain/taskTransitions` + `domain/taskUpdate`; business.ts compat re-export marked for removal). Eligibility copies 3→2 (hq/tasks keeps its own until its slice). Remaining: bulk/quick-log/hq-tasks, GET [taskId] detail. Known preserved defect: invalid date strings → 500 (not 422). |
| lib boundary rule | ESTABLISHED | Business logic leaves lib; infra stays; shared only when justified. Read path adds: query mechanics → operations, envelope/pagination/date-truncation stay (transport/shared pending). |
| operations | NOT_STARTED | Next up (task machine) |
| attendance | NOT_STARTED | After operations |
| estates | VERIFIED (complete) | Phase C + D + D.1: `src/modules/estates/{domain,application,infrastructure,schemas}` complete. Primary CRUD + sub-resources (`/activate`, `/access`, `/task-pins`) modularized to pure adapters; `src/app/farms/[farmId]/page.tsx` Prisma removed; pure policy tests green; pinned by THIN_ROUTES. |
| cropping | VERIFIED (slice 1) | Phase E: `src/modules/cropping/{domain,application,infrastructure,schemas,ui}` established. `POST /api/plots/[plotId]/crop-cycles` and `GET/PATCH/DELETE /api/plots/[plotId]/crop-cycles/[cycleId]` modularized to thin adapters. Direct Prisma removed from crop pages (`new`, `[cycleId]`, `[cycleId]/edit`). Pure policy unit tests & boundaries tests green; pinned in `THIN_ROUTES` and `PAGE_PRISMA_COUNT: 29`. |
| agronomy/incidents/harvest/inventory/finance/reporting/audit/media/organization | NOT_STARTED | In plan order |
| Role-tree collapse (hq/officer/owner) | IN_PROGRESS (filesystem) | Checkpoint 4: pages nested under `(control)/(estate)/(field)` groups — URLs byte-stable, no group layouts (inherit root). Business-rule collapse still LAST. |
| Components → domain ui/ | MIGRATED | Checkpoint 4: ~114 components git-mv'd to `modules/*/ui/`; nav consolidated to `components/navigation/`; 9 empty role dirs removed. Debt (gods/dead/duplicates) in UI_TECHNICAL_DEBT.md. |
| Legacy | — | No `modules/legacy` created: nothing is abandoned yet; nothing dumped |

States: NOT_STARTED / IN_PROGRESS / MIGRATED / VERIFIED / REMOVAL_READY / REMOVED.
