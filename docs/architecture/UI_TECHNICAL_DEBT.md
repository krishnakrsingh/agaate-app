# UI Technical Debt (checkpoint 4 — identified, NOT fixed here)

## Dead / orphaned (moved, never deleted — prove usage before deleting)

1. `modules/reporting/ui/officer-signals-console.tsx` (`OfficerSignalsConsole`,
   zero importers).
2. `modules/reporting/ui/dashboard-client.tsx` + `overview-*` (6 server
   components with direct Prisma; zero page importers — legacy dashboard?).
3. `hq/page.tsx`-era shells: several `hq/*` pages may be thin wrappers —
   audit during reporting slice.

## God components (over complexity threshold — split in domain slices)

- `estates/ui/farm-hub-client.tsx` (871 lines: boundary + incidents +
  tasks + coverage + weather in one view).
- `estates/ui/farm-360.tsx`, `estates/ui/client-360.tsx` (multi-domain views).
- `admin/operations-triage-console` → now `reporting/ui` (1400+ lines).
- `people/ui/people-drawers.tsx`, `reporting/ui/daily-report.tsx`.

## Cross-page logic (business code beside routes)

- `(estate)/owner/plots` re-exports `land`; `team` re-exports `people`.
- `(estate)/owner/*` pages + 35 server pages read Prisma directly
  (pinned: PAGE_PRISMA_COUNT=35, shrink-only).
- `nav/config.ts` could split to control/estate/field nav files once workspaces
  grow distinct shells (one shared layout today — premature now).

## Naming (flagged, not renamed)

- `Overview*`, `*-console`, `*-command-center` are vague; rename when the
  owning domain slice touches the file (export renames = churn, no behavior gain).
- `admin-farm-registry.tsx` (estates/ui) is a one-line `basePath` wrapper
  around `farm-registry.tsx` — collapse during estates slice.

## Stale E2E

`tests/e2e` asserts literal `"AGAATE"` branding the login UI no longer
renders (pre-existing; page serves 200 with full form).
