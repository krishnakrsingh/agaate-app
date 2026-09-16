# ADR-005 — Data access: Prisma as infrastructure, no generic repositories

- Status: accepted. Date: 2026-09-16.
- Context: Prisma imported in ~133 files (routes, pages, components). Full
  repository-per-model = abstraction without a problem; direct queries are
  fine for reads.
- Decision: `infrastructure/db.ts` is the sanctioned import path; simple
  reads stay as query modules; complex writes get use-cases with injected
  db. No `BaseRepository<T>`/`GenericService`. Components never query.
- Rejected: enterprise repository/CQRS ceremony; schema renames for aesthetics.
- Consequences: provider changes touch one file; query ownership becomes
  visible per module over time.
