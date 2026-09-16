# ADR-001 — Modular monolith via strangler re-exports (not rewrite)

- Status: accepted. Date: 2026-09-16.
- Context: 361-file Next.js app, functionally working; Prisma accessed from
  ~133 files; role-parallel trees. Big-bang move = unacceptable prod risk.
- Decision: establish `modules/*/index.ts` public APIs as RE-EXPORTS over
  current single sources of truth; migrate callers incrementally; move files
  physically only after callers point at the entrypoint.
- Alternatives rejected: big-bang folder move (breaks 150 importers, no
  behavior gain); microservices (no scaling evidence); generic
  repository/CQRS/DI layers (no problem they solve here).
- Consequences: temporary dual paths (`@/lib/*` compat + `@modules/*`
  canonical). Tracked in MIGRATION_STATUS. Arch tests prevent new deep imports.
