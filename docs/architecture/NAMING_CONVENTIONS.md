# Naming Conventions (checkpoint 4 — as-built, not aspirational)

## Files

- `kebab-case.tsx` — React components (137/137 as-found; kept deliberately).
- `camelCase.ts` — functions/modules (`completeTask.ts`, `geo-core.ts`…).
- kebab-case route segments — URL-facing (`crop-cycles`, `[farmId]`).
- `*.schema.ts` — Zod transport validation (`completion.ts` pending rename
  at its slice; no churn now).
- `*.test.ts` — colocated tests.
- `index.ts` — ONLY deliberate module public APIs (never barrel-everywhere).

## Concepts (see CANONICAL_DOMAIN_TERMS for the full model)

- Internal code: FARM (not estate), PLOT (not field), TASK (not activity),
  PEOPLE (not labour/crew), CROP CYCLE, INCIDENT, MONITORING, PRESCRIPTION.
- UI labels may say Estate/Field/Activity for users — labels ≠ identifiers.
- Workspaces: CONTROL (`(control)`), ESTATE (`(estate)`), FIELD (`(field)`).
  Roles (SUPER_ADMIN…) appear ONLY in authz code + nav config, never as
  business module names.
- URLs are stable contracts (`/farms`, `/owner/*`, `/officer/*`, `/hq/*`);
  filesystem grouping must never rename them (route groups only).
