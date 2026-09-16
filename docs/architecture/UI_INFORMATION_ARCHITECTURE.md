# UI Information Architecture (checkpoint 4 — audited, then built)

## Current (found)

- 69 `page.tsx`, ONE root `layout.tsx`, zero `loading.tsx`. Nearly all
  components are `"use client"`, fed by API routes — no systemic
  server/client violation. Server-side Prisma reads live in pages (35),
  8 components (6 `overview-*` + `dashboard-client` + nav `config.ts`
  type-only), and ~90 API routes.
- Role trees are URL prefixes with distinct UX: `/hq/*` (control staff),
  `/owner/*` (estate), `/officer/*` (field), `/admin/*`, `/agronomy/*`.
  Unprefixed routes are shared screens (`/farms /plots /tasks …`) or
  3-line legacy redirect shims (`/work→/farms`, `/directory→/farms`,
  `/insights→/operations` — bookmark compat, kept).
- `nav/config.ts` is already permission-aware (`roles: Role[]` per item,
  `getNavForRole`) and even anticipates `/field/today` in matchers.
  5 roles collapse to 3 workspaces (brief §2 grouping VERIFIED against nav
  + page redirects + ROLE_HOME_URLS):
  - **CONTROL** = SUPER_ADMIN + OPERATIONS_MANAGER + AGRONOMIST
    (`/hq /admin /agronomy`, homes `/hq/clients`, `/agronomy/radar`)
  - **ESTATE** = FARM_ADMIN (`/owner/*`, home `/owner/dashboard`)
  - **FIELD** = FARM_OFFICER (`/officer/*`, home `/officer/day`)
- Hooks: 3 real ones (`data/use-server-list`, `hq/tasks-lookups`,
  `ui/toast`) — no dumping ground. No `types.ts` anywhere. Forms, dialogs,
  tables already colocated with features.

## Target (built this checkpoint)

- `app/(control)/{hq,admin,agronomy}`, `app/(estate)/owner`,
  `app/(field)/officer` — workspace visible in filesystem, URLs byte-stable
  (route groups don't affect URLs). Shared/unprefixed routes stay at root
  (they're cross-workspace; forcing them into one group would lie).
  No new group layouts (inherit root layout → zero behavior change).
- `modules/*/ui/` owns domain components (flat, §22 Style); `components/`
  keeps generic `ui/`, `layout/`, `navigation/` (consolidated from
  `nav/ + navbar + desktop-sidebar + breadcrumbs`), `data/`, plus two
  documented shared primitives (`photo-upload-zone`, `weather-card`→agronomy?
  NO — see below).
- `weather-card` → `agronomy/ui` (single importer; agronomy owns weather).
  `photo-upload-zone` stays shared (3+ domains).
- Dead-flagged (moved, NOT deleted): `OfficerSignalsConsole`,
  `dashboard-client`, `overview-*` (zero importers; see UI_TECHNICAL_DEBT).
- Naming: repo convention is **kebab-case files** (137/137 consistent) —
  kept deliberately over the brief's PascalCase example (consistency beats
  example aesthetics). Components keep domain-explicit names; vague
  `Overview*` files flagged in debt list, not renamed (export renames =
  churn without behavior gain).
