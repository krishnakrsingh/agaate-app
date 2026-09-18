# Graph Report - agaateapp  (2026-09-18)

## Corpus Check
- 548 files · ~407,323 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2683 nodes · 7349 edges · 183 communities (131 shown, 52 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1b75dbe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useToast
- operations/index.ts
- app/insights/page.tsx
- geo-map.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- plots/index.ts
- dependencies
- devDependencies
- Navbar
- onboarding-wizard.tsx
- scripts
- Rate Limiting in FastAPI
- farm-hub-client.tsx
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- requireRole
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- icons.tsx
- desktop-sidebar.tsx
- Debounce Search Input
- auth/index.ts
- tasks-queue.tsx
- cropping/index.ts
- graphify reference: query, path, explain
- csv-sum.md
- LngLat
- db.ts
- ponytail-audit/SKILL.md
- Ponytail Gain
- ponytail-review/SKILL.md
- endAttendance.ts
- Agaate Farm Management PWA
- AGENTS.md
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- ponytail-debt/SKILL.md
- Deep Clone
- Group By
- Infinite Scroll
- Modal Dialog
- Number Formatting
- URL Parameters
- boundary-walk.tsx
- people-directory.tsx
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed-scale.ts
- clients/page.tsx
- spatial/index.ts
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- tasks-ledger.tsx
- officer-day.tsx
- calendar-platform.tsx
- 20260830181349_init_mysql/migration.sql
- agaate-critical.spec.ts
- navbar.tsx
- platform-map-console.tsx
- No AI slop
- build-docs-html.mjs
- parseBoundaryToRing
- client-360.tsx
- currentActor
- apiError
- incidents-command.tsx
- audit
- login/page.tsx
- formatDateTime
- app/operations/page.tsx
- No AI slop eval
- badge.tsx
- owner/calendar/page.tsx
- client-directory.tsx
- attendance-geo.ts
- No AI Slop — Human Writing & Anti-Slop Guidelines
- ADDING_A_FEATURE — "I need to add a new crop operation"
- owner/dashboard/page.tsx
- design-guard.test.ts
- track.ts
- middleware.ts
- farm-registry.tsx
- requireSession
- hq/system/page.tsx
- session.ts
- AdminConsole
- Local Development & Setup Guide
- overview-alerts.tsx
- walk-sync.test.ts
- downloadUrl
- TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite)
- UI Technical Debt (checkpoint 4 — identified, NOT fixed here)
- CURRENT_ARCHITECTURE (audited 2026-09-16)
- getSession
- estates/index.ts
- owner/people/page.tsx
- 20260910170000_boundary_versions/migration.sql
- crew/page.tsx
- crop-cycle-form.tsx
- directory/page.tsx
- operations/tasks/page.tsx
- work/page.tsx
- geo-write-paths.test.ts
- layout.tsx
- boundary-history.tsx
- components.json
- hq/tasks/route.ts
- onboarding-workspace.tsx
- BEFORE → AFTER (checkpoint 3)
- CURRENT_TREE_SNAPSHOT (2026-09-16, pre-checkpoint-3)
- DEPENDENCY_MAP
- UI BEFORE → AFTER (checkpoint 4)
- Naming Conventions (checkpoint 4 — as-built, not aspirational)
- UI Information Architecture (checkpoint 4 — audited, then built)
- daily/page.tsx
- attendance-geo-route.test.ts
- validation.ts
- DOMAIN_MAP — derived from schema + routes + imports
- roles/route.ts
- backfill-boundary-versions.ts
- backfill-role-definitions.mjs
- approvals/page.tsx
- admin/attendance/page.tsx
- audit/page.tsx
- users/page.tsx
- hq/page.tsx
- officer/calendar/page.tsx
- farm/page.tsx
- reports/page.tsx
- @aws-sdk/s3-request-presigner
- security/index.ts
- ADR-001-modular-monolith.md
- ADR-002-domain-boundaries.md
- ADR-003-spatial-domain.md
- ADR-004-authorization-boundary.md
- ADR-005-data-access-strategy.md
- ADR-006-operations-completion-slice.md
- ARCHITECTURE_RULES.md
- CANONICAL_DOMAIN_TERMS.md
- MIGRATION_PLAN.md
- MIGRATION_STATUS.md
- tailwind-merge
- MODULE_BOUNDARIES.md
- architecture/README.md
- @paper-design/shaders-react
- client-edit-form.tsx
- client-workspace.tsx
- zod
- ensure-db.mjs
- [clientId]/edit/page.tsx
- profile/edit/page.tsx
- security/page.tsx
- hq/settings/page.tsx
- hq/farms/[farmId]/page.tsx
- overview-farms.tsx
- @prisma/client
- react-leaflet

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 208 edges
2. `prisma` - 166 edges
3. `currentActor()` - 163 edges
4. `requireFarmAccess()` - 140 edges
5. `requireSession()` - 123 edges
6. `audit()` - 113 edges
7. `Icons` - 107 edges
8. `useToast()` - 97 edges
9. `requireRole()` - 83 edges
10. `accessibleFarmWhere()` - 70 edges

## Surprising Connections (you probably didn't know these)
- `HqAnalyticsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/analytics/page.tsx → src/modules/auth/infrastructure/session.ts
- `EditClientPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/clients/[clientId]/edit/page.tsx → src/modules/auth/infrastructure/session.ts
- `AddClientFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/clients/[clientId]/farms/new/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqIncidentsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/incidents/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqProfilePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/profile/page.tsx → src/modules/auth/infrastructure/session.ts

## Import Cycles
- None detected.

## Communities (183 total, 52 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.06
Nodes (46): RFC-4180, ToastContext, ToastContextType, ToastMessage, ToastType, useToast(), CropRadar(), DiagnosticsWorkbench() (+38 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (62): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+54 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.05
Nodes (48): GeoMap, FarmCommandCenter(), GeoMap, ClientOnboardingWizardV2(), GeoMap, HandoverData, STEPS, GeoMap (+40 more)

### Community 4 - "compilerOptions"
Cohesion: 0.06
Nodes (33): dom, dom.iterable, es2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, ./src/infrastructure/* (+25 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 6 - "Agaate Design System v1.0"
Cohesion: 0.17
Nodes (11): 1. Color Palette, 2. Typography, 3. Spacing, Radii, Borders, and Elevation, 4. Visual Language & Structural Rules, 5. Navigation & Layout, Agaate Design System v1.0, Border Radii, Borders (+3 more)

### Community 7 - "plots/index.ts"
Cohesion: 0.08
Nodes (48): DELETE(), GET(), PATCH(), GET(), dynamic, OwnerLandPage(), dynamic, dynamic (+40 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, bcryptjs, class-variance-authority, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet, lucide-react (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test (+25 more)

### Community 10 - "Navbar"
Cohesion: 0.05
Nodes (44): AttendancePage(), dynamic, dynamic, HqAnalyticsPage(), AddClientFarmPage(), dynamic, dynamic, HqClientDetailPage() (+36 more)

### Community 11 - "onboarding-wizard.tsx"
Cohesion: 0.06
Nodes (59): dynamic, HqOnboardingNewPage(), Props, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard() (+51 more)

### Community 12 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, lint (+7 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "farm-hub-client.tsx"
Cohesion: 0.05
Nodes (36): Weather, WeatherCard(), ActivateFarmButton(), Farm360, Farm360Incident, Farm360Plot, Farm360Task, SETUP_STAGES (+28 more)

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 16 - "React Countdown Timer Component"
Cohesion: 0.22
Nodes (9): Advanced Timer with Formatted Display, Basic Countdown Timer, CSS Styling, Custom Hook Version, Features, React Countdown Timer Component, Styled Component with Animations, Usage Examples (+1 more)

### Community 17 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 18 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 19 - "requireRole"
Cohesion: 0.07
Nodes (45): GET(), GET(), num(), DayBucket, dayKey(), dynamic, emptyTotals(), GET() (+37 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "adversarial.test.ts"
Cohesion: 0.09
Nodes (25): GET(), POST(), GET(), POST(), POST(), GET(), POST(), dynamic (+17 more)

### Community 24 - "icons.tsx"
Cohesion: 0.06
Nodes (27): EditProfileForm(), EditProfileFormProps, IconProps, Icons, getInitials(), ProfileMenu(), ThemeToggle(), cn() (+19 more)

### Community 25 - "desktop-sidebar.tsx"
Cohesion: 0.09
Nodes (23): dynamic, HqProfilePage(), AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps (+15 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.17
Nodes (28): actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel, AccessScope, ALL_PERMISSIONS (+20 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.07
Nodes (25): dynamic, dynamic, Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), PriorityBadge() (+17 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.06
Nodes (56): DELETE(), GET(), PATCH(), dynamic, EditCropCyclePage(), CropCycleDetailPage(), dynamic, BANNED_APP_DIRS (+48 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "LngLat"
Cohesion: 0.13
Nodes (17): GET(), GET(), getPlotVisits(), PlotVisitData, LngLat, fences, visits, computePlotVisits() (+9 more)

### Community 33 - "db.ts"
Cohesion: 0.09
Nodes (26): dynamic, GET(), dynamic, GET(), dynamic, dynamic, asNum(), GET() (+18 more)

### Community 34 - "ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 35 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 36 - "ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 37 - "endAttendance.ts"
Cohesion: 0.09
Nodes (41): Db, endAttendance(), Db, startAttendance(), assertEndAllowed(), assertStartAllowed(), assertStartPresent(), AttendanceFault (+33 more)

### Community 38 - "Agaate Farm Management PWA"
Cohesion: 0.33
Nodes (5): Agaate Farm Management PWA, Current coverage, Documentation Suite, Run locally, Security and persistence

### Community 39 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): Graphify — Codebase Knowledge Graph, No AI Slop — Sharp, Human Prose & Anti-Slop Editor, Ponytail — Lazy Senior Dev Mode, This is NOT the Next.js you know

### Community 40 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 41 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 42 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 43 - "ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 44 - "Deep Clone"
Cohesion: 0.50
Nodes (3): Deep Clone, With Ponytail, Without Ponytail

### Community 45 - "Group By"
Cohesion: 0.50
Nodes (3): Group By, With Ponytail, Without Ponytail

### Community 46 - "Infinite Scroll"
Cohesion: 0.50
Nodes (3): Infinite Scroll, With Ponytail, Without Ponytail

### Community 47 - "Modal Dialog"
Cohesion: 0.50
Nodes (3): Modal Dialog, With Ponytail, Without Ponytail

### Community 48 - "Number Formatting"
Cohesion: 0.50
Nodes (3): Number Formatting, With Ponytail, Without Ponytail

### Community 49 - "URL Parameters"
Cohesion: 0.50
Nodes (3): URL Parameters, With Ponytail, Without Ponytail

### Community 50 - "boundary-walk.tsx"
Cohesion: 0.13
Nodes (27): GpsSample, BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList() (+19 more)

### Community 51 - "people-directory.tsx"
Cohesion: 0.07
Nodes (24): describeUserAccess(), PERMISSION_GROUPS, roleUsesFarmAccess(), InternalTeamConsole(), Tab, formatDate(), getInitials(), parseNameAndTitle() (+16 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "spatial/index.ts"
Cohesion: 0.15
Nodes (35): normalizeToGeoJson(), ringAcres(), throwFirst(), ValidatedPlotGeometry, BBox, bboxOfRing(), clipPolygonToRect(), closeRing() (+27 more)

### Community 64 - "tasks-ledger.tsx"
Cohesion: 0.13
Nodes (24): AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES, HqTask, HqTasksLedger() (+16 more)

### Community 65 - "officer-day.tsx"
Cohesion: 0.06
Nodes (46): PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm, Officer (+38 more)

### Community 66 - "calendar-platform.tsx"
Cohesion: 0.13
Nodes (25): OfficerRow, HistoryItem, HistoryKind, addDays(), CalendarPayload, DayBucket, HqCalendarPlatform(), goToday() (+17 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.14
Nodes (34): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+26 more)

### Community 70 - "navbar.tsx"
Cohesion: 0.11
Nodes (16): dynamic, dynamic, formatDate(), HqOnboardingListPage(), dynamic, NewCropCyclePage(), CommandPalette(), CommandPaletteProps (+8 more)

### Community 72 - "platform-map-console.tsx"
Cohesion: 0.09
Nodes (22): dropItem, dropStyle, floatInput, LAYERS, MissingFarm, overlayMsg, PlatformMapLeaflet, QaFlag (+14 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.07
Nodes (38): POST(), irrigationItem, POST(), schema, centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence() (+30 more)

### Community 76 - "client-360.tsx"
Cohesion: 0.09
Nodes (19): Skeleton(), ACTIVITY_ICON, ActivityEntry, buildActivity(), Bundle, Client360(), ClientFarmsMap, FarmItem (+11 more)

### Community 77 - "currentActor"
Cohesion: 0.10
Nodes (29): GET(), PATCH(), updateStageSchema, DELETE(), GET(), buildWhere(), bulkStatusSchema, ClientStats (+21 more)

### Community 78 - "apiError"
Cohesion: 0.10
Nodes (42): GET(), GET(), GET(), GET(), GET(), musterSchema, POST(), createSchema (+34 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "audit"
Cohesion: 0.08
Nodes (27): GET(), PATCH(), updateClientSchema, createClientSchema, GET(), POST(), POST(), onboardSchema (+19 more)

### Community 82 - "login/page.tsx"
Cohesion: 0.19
Nodes (11): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), LoginForm() (+3 more)

### Community 83 - "formatDateTime"
Cohesion: 0.24
Nodes (8): HqFarm360(), saveBoundary(), formatActionLabel(), OverviewActivity(), timeAgo(), formatNumber(), OverviewTriage(), formatDateTime()

### Community 84 - "app/operations/page.tsx"
Cohesion: 0.14
Nodes (10): DashboardPage(), dynamic, dynamic, OperationsPage(), loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind (+2 more)

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "badge.tsx"
Cohesion: 0.05
Nodes (41): RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Estate, RosterItem, Summary, WorkforceAttendanceConsole() (+33 more)

### Community 87 - "owner/calendar/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, OperationsCalendarPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+2 more)

### Community 88 - "client-directory.tsx"
Cohesion: 0.16
Nodes (15): ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS (+7 more)

### Community 89 - "attendance-geo.ts"
Cohesion: 0.20
Nodes (8): AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, GeofenceBasis, MAX_GPS_ACCURACY_METERS, num(), parseRingTolerant(), PlotGeoInput

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "ADDING_A_FEATURE — "I need to add a new crop operation""
Cohesion: 0.20
Nodes (9): 1. Name it (vocabulary first), 2. Domain rule (pure, testable), 3. Use-case (orchestration), 4. Validation (layered, deliberately), 5. Route (thin — today's actual pattern, slimmed), 6. UI, 7. Auth, 8. Tests + docs (+1 more)

### Community 93 - "owner/dashboard/page.tsx"
Cohesion: 0.28
Nodes (7): dynamic, Farm, InitialTelemetry, OwnerCockpit(), OwnerCockpitProps, TelemetryAttendance, TelemetryPhoto

### Community 95 - "track.ts"
Cohesion: 0.17
Nodes (21): distanceMeters(), pathPerimeterM(), radians(), assessTrack(), CleanedTrack, cleanSamples(), closureGapM(), decideSample() (+13 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 98 - "requireSession"
Cohesion: 0.05
Nodes (34): ClientDetailPage(), dynamic, AgronomyPlanningPage(), dynamic, AgronomyRadarPage(), dynamic, dynamic, HqCalendarPage() (+26 more)

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.20
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), SystemAuditExplorer(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES (+2 more)

### Community 100 - "session.ts"
Cohesion: 0.18
Nodes (15): platformReadRoles, Actor, loadActiveUser(), LEGACY_ROLES, requireSecret(), secret, signSessionToken(), verifySessionToken() (+7 more)

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "overview-alerts.tsx"
Cohesion: 0.36
Nodes (6): OverviewAlert, OverviewAlertList(), SEVERITY_RANK, severityClass(), OverviewAlerts(), SEVERITY_RANK

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "downloadUrl"
Cohesion: 0.17
Nodes (20): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), PATCH(), schema, GET() (+12 more)

### Community 106 - "TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite)"
Cohesion: 0.29
Nodes (6): Infra health (§28, separate from structure), Principle, Rules that make it real, TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite), What we explicitly do NOT add, Why these boundaries

### Community 107 - "UI Technical Debt (checkpoint 4 — identified, NOT fixed here)"
Cohesion: 0.29
Nodes (6): Cross-page logic (business code beside routes), Dead / orphaned (moved, never deleted — prove usage before deleting), God components (over complexity threshold — split in domain slices), Naming (flagged, not renamed), Stale E2E, UI Technical Debt (checkpoint 4 — identified, NOT fixed here)

### Community 108 - "CURRENT_ARCHITECTURE (audited 2026-09-16)"
Cohesion: 0.33
Nodes (5): CURRENT_ARCHITECTURE (audited 2026-09-16), Layout (actual), Measured coupling (the core problem), Stack, Top findings (ranked by future cost)

### Community 109 - "getSession"
Cohesion: 0.21
Nodes (9): dynamic, GET(), passwordSchema, PUT(), PUT(), schema, loadUserForSession(), getSession() (+1 more)

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (60): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), parseSort(), FARM_RING (+52 more)

### Community 111 - "owner/people/page.tsx"
Cohesion: 0.27
Nodes (7): dynamic, OwnerPeoplePage(), Props, dynamic, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 113 - "crew/page.tsx"
Cohesion: 0.21
Nodes (8): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 114 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 120 - "boundary-history.tsx"
Cohesion: 0.29
Nodes (7): AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS, BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "hq/tasks/route.ts"
Cohesion: 0.31
Nodes (8): asIso(), asNum(), escapeLike(), GET(), LedgerDbRow, PRIORITIES, SORTS, TASK_STATUSES

### Community 130 - "onboarding-workspace.tsx"
Cohesion: 0.25
Nodes (4): OnboardingWorkspace(), PipelineFarm, STAGE_META, StageCounts

### Community 131 - "BEFORE → AFTER (checkpoint 3)"
Cohesion: 0.40
Nodes (4): BEFORE → AFTER (checkpoint 3), Deliberately NOT moved (with reason), Root, Spatial (the surgery)

### Community 132 - "CURRENT_TREE_SNAPSHOT (2026-09-16, pre-checkpoint-3)"
Cohesion: 0.40
Nodes (4): CURRENT_TREE_SNAPSHOT (2026-09-16, pre-checkpoint-3), Key configs, Root (boring target: only config/tooling/docs entrypoints), src/ (361 files)

### Community 133 - "DEPENDENCY_MAP"
Cohesion: 0.40
Nodes (4): Allowed, DEPENDENCY_MAP, Forbidden (enforced by tests/architecture/boundaries.test.ts), Measured coupling (audit 2026-09-16)

### Community 134 - "UI BEFORE → AFTER (checkpoint 4)"
Cohesion: 0.40
Nodes (4): Components (110+ files → domain homes), Navigation, Routes (URLs byte-stable — groups don't affect URLs), UI BEFORE → AFTER (checkpoint 4)

### Community 136 - "Naming Conventions (checkpoint 4 — as-built, not aspirational)"
Cohesion: 0.50
Nodes (3): Concepts (see CANONICAL_DOMAIN_TERMS for the full model), Files, Naming Conventions (checkpoint 4 — as-built, not aspirational)

### Community 137 - "UI Information Architecture (checkpoint 4 — audited, then built)"
Cohesion: 0.50
Nodes (3): Current (found), Target (built this checkpoint), UI Information Architecture (checkpoint 4 — audited, then built)

### Community 138 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 139 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 142 - "roles/route.ts"
Cohesion: 0.36
Nodes (6): createSchema, GET(), POST(), secret, normalizePermissions(), slugifyRoleName()

### Community 151 - "farm/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerFarmPage(), FarmProfile, MyFarmOverview()

### Community 152 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, Farm, LocationRequestForm()

### Community 154 - "security/index.ts"
Cohesion: 0.24
Nodes (11): normalizePhone(), POST(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore, resetRateLimit(), throttle() (+3 more)

### Community 169 - "client-edit-form.tsx"
Cohesion: 0.33
Nodes (3): ClientEditForm(), EditableClient, ENTITY_TYPES

### Community 170 - "client-workspace.tsx"
Cohesion: 0.33
Nodes (4): ClientData, ClientWorkspace(), FarmSummary, UserSummary

### Community 172 - "ensure-db.mjs"
Cohesion: 0.83
Nodes (3): checkPort(), main(), startWslDatabase()

## Knowledge Gaps
- **833 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+828 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `onboarding-workspace.tsx`, `geo-map.tsx`, `Navbar`, `onboarding-wizard.tsx`, `farm-hub-client.tsx`, `farm/page.tsx`, `reports/page.tsx`, `desktop-sidebar.tsx`, `tasks-queue.tsx`, `cropping/index.ts`, `client-edit-form.tsx`, `client-workspace.tsx`, `boundary-walk.tsx`, `people-directory.tsx`, `tasks-ledger.tsx`, `officer-day.tsx`, `navbar.tsx`, `client-360.tsx`, `incidents-command.tsx`, `app/operations/page.tsx`, `badge.tsx`, `owner/calendar/page.tsx`, `client-directory.tsx`, `owner/dashboard/page.tsx`, `farm-registry.tsx`, `owner/people/page.tsx`, `crew/page.tsx`, `crop-cycle-form.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `hq/tasks/route.ts`, `operations/index.ts`, `plots/index.ts`, `Navbar`, `onboarding-wizard.tsx`, `attendance-geo-route.test.ts`, `roles/route.ts`, `requireRole`, `adversarial.test.ts`, `farm/page.tsx`, `desktop-sidebar.tsx`, `security/index.ts`, `auth/index.ts`, `cropping/index.ts`, `LngLat`, `endAttendance.ts`, `[clientId]/edit/page.tsx`, `hq/farms/[farmId]/page.tsx`, `overview-farms.tsx`, `navbar.tsx`, `parseBoundaryToRing`, `currentActor`, `apiError`, `audit`, `login/page.tsx`, `formatDateTime`, `app/operations/page.tsx`, `owner/calendar/page.tsx`, `owner/dashboard/page.tsx`, `requireSession`, `hq/system/page.tsx`, `session.ts`, `overview-alerts.tsx`, `walk-sync.test.ts`, `downloadUrl`, `getSession`, `estates/index.ts`, `owner/people/page.tsx`, `crew/page.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `requireSession` to `plots/index.ts`, `Navbar`, `onboarding-wizard.tsx`, `daily/page.tsx`, `requireRole`, `farm/page.tsx`, `reports/page.tsx`, `desktop-sidebar.tsx`, `auth/index.ts`, `tasks-queue.tsx`, `cropping/index.ts`, `db.ts`, `[clientId]/edit/page.tsx`, `hq/farms/[farmId]/page.tsx`, `navbar.tsx`, `login/page.tsx`, `app/operations/page.tsx`, `owner/calendar/page.tsx`, `owner/dashboard/page.tsx`, `hq/system/page.tsx`, `session.ts`, `getSession`, `estates/index.ts`, `owner/people/page.tsx`, `crew/page.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _833 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.05674044265593561 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06205311542390194 - nodes in this community are weakly interconnected._
- **Should `geo-map.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._