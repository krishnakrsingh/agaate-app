# ADR-006 — Operations slice: use-case with transaction, no repository (checkpoint 2)

- Status: accepted. Date: 2026-09-16.
- Context: `POST /api/tasks/[taskId]/complete` owned its full vertical
  (auth, geofence, milestone gates, 5-table transaction, audit) inline.
  Candidate alternatives: generic TaskRepository, DI container, CQRS command bus.
- Decision:
  1. Rules → `modules/operations/domain/completion.ts` (pure; throws
     framework-free `CompletionFault{status, body}` so the route renders
     byte-identical legacy responses without the domain knowing HTTP).
  2. Orchestration + persistence → `application/completeTask.ts`, with the
     Prisma `$transaction` body moved verbatim. The transaction IS the
     persistence boundary; `db` param defaults to the singleton (testable
     seam, no repository class). Cross-table writes (milestone, cropCycle)
     stay inside the transaction for atomicity — cropping owns those tables
     long-term; operations orchestrates this write today (explicit, not hidden).
  3. Transport validation (Zod) stays at the route edge in
     `schemas/completion.ts`. Edge role allow-list stays in the route;
     resource policy (farm scope, assignee) lives in the use-case — one
     decision each, no duplication.
- Rejected: BaseRepository/GenericService (would obscure the transaction);
  splitting milestone/crop writes into cross-module calls (breaks atomicity);
  moving the OTHER COMPLETED writers (monitoring auto-complete, quick-log,
  generate-daily — semantically different paths, not duplicates).
- Consequences: `THIN_ROUTES` arch-test pins the route Prisma-free;
  `canTransitionTask` remains the PATCH-path source of truth until its own slice.
