# ADR-002 — Domain boundaries from schema relations, not folder names

- Status: accepted. Date: 2026-09-16.
- Context: `app/` mixes business/role/lifecycle axes (`hq` vs `farms` vs
  `onboarding`). Naive `app/farms → modules/farms` would bless the mess.
- Decision: boundaries derived from Prisma relations + API behavior +
  import graph (see DOMAIN_MAP): merge farm+estate, merge crop+planning,
  keep spatial cross-cutting, reporting table-less, onboarding as orchestration.
- Rejected: 1:1 folder rename; role-owned modules (HQ/Officer/Owner).
- Consequences: `estates`, `cropping`, `operations`, `attendance`,
  `agronomy` as decided; MODULE_BOUNDARIES is the tiebreaker.
