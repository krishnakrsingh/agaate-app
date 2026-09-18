# Graph Report - agaateapp  (2026-09-18)

## Corpus Check
- 533 files · ~415,888 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2615 nodes · 7217 edges · 175 communities (124 shown, 51 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `98947bd1`
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
- navbar.tsx
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
- spatial/index.ts
- prisma
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
- geo-core.ts
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- tasks-ledger.tsx
- officer-day.tsx
- history/route.ts
- 20260830181349_init_mysql/migration.sql
- agaate-critical.spec.ts
- hasPermission
- platform-map-console.tsx
- No AI slop
- build-docs-html.mjs
- parseBoundaryToRing
- client-360.tsx
- apiError
- http.ts
- incidents-command.tsx
- attendance-geo.ts
- login/page.tsx
- formatDateTime
- app/operations/page.tsx
- No AI slop eval
- badge.tsx
- owner/calendar/page.tsx
- client-directory.tsx
- officer/profile/page.tsx
- No AI Slop — Human Writing & Anti-Slop Guidelines
- ADDING_A_FEATURE — "I need to add a new crop operation"
- owner/dashboard/page.tsx
- design-guard.test.ts
- boundary-history.tsx
- middleware.ts
- farm-registry.tsx
- requireSession
- hq/system/page.tsx
- onboarding-workspace.tsx
- AdminConsole
- dashboard-client.tsx
- overview-alerts.tsx
- walk-sync.test.ts
- requireFarmAccess
- TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite)
- UI Technical Debt (checkpoint 4 — identified, NOT fixed here)
- CURRENT_ARCHITECTURE (audited 2026-09-16)
- land/page.tsx
- estates/index.ts
- owner/people/page.tsx
- 20260910170000_boundary_versions/migration.sql
- crop-cycle-edit-form.tsx
- crop-cycle-form.tsx
- directory/page.tsx
- operations/tasks/page.tsx
- work/page.tsx
- geo-write-paths.test.ts
- layout.tsx
- client-edit-form.tsx
- components.json
- client-workspace.tsx
- farm-edit-page-form.tsx
- BEFORE → AFTER (checkpoint 3)
- CURRENT_TREE_SNAPSHOT (2026-09-16, pre-checkpoint-3)
- DEPENDENCY_MAP
- UI BEFORE → AFTER (checkpoint 4)
- Naming Conventions (checkpoint 4 — as-built, not aspirational)
- UI Information Architecture (checkpoint 4 — audited, then built)
- overview-funnel.tsx
- attendance-geo-route.test.ts
- validation.ts
- DOMAIN_MAP — derived from schema + routes + imports
- db.ts
- backfill-boundary-versions.ts
- backfill-role-definitions.mjs
- approvals/page.tsx
- admin/attendance/page.tsx
- audit/page.tsx
- users/page.tsx
- hq/page.tsx
- officer/calendar/page.tsx
- overview-farms.tsx
- overview-kpis.tsx
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
- @radix-ui/react-collapsible
- react
- zod
- @types/react-dom

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 207 edges
2. `currentActor()` - 162 edges
3. `prisma` - 160 edges
4. `requireFarmAccess()` - 140 edges
5. `requireSession()` - 121 edges
6. `audit()` - 111 edges
7. `Icons` - 103 edges
8. `useToast()` - 93 edges
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
- `HqTasksPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/tasks/page.tsx → src/modules/auth/infrastructure/session.ts

## Import Cycles
- None detected.

## Communities (175 total, 51 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.05
Nodes (51): RFC-4180, ToastContext, ToastContextType, ToastMessage, ToastType, useToast(), CropRadar(), CropRadarItem (+43 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.05
Nodes (68): BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE, COMPONENT_PRISMA_GRANDFATHER, DELETED_PATHS, PURE_FILES, ROOT, SRC (+60 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.05
Nodes (56): GeoMap, FarmCommandCenter(), GeoMap, ClientOnboardingWizardV2(), GeoMap, HandoverData, STEPS, FarmInput (+48 more)

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
Cohesion: 0.07
Nodes (50): DELETE(), GET(), PATCH(), GET(), POST(), archivePlot(), createPlot(), Db (+42 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, bcryptjs, class-variance-authority, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet, lucide-react (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test (+23 more)

### Community 10 - "navbar.tsx"
Cohesion: 0.05
Nodes (49): AttendancePage(), dynamic, dynamic, HqAnalyticsPage(), dynamic, EditClientPage(), AddClientFarmPage(), dynamic (+41 more)

### Community 11 - "onboarding-wizard.tsx"
Cohesion: 0.07
Nodes (51): clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard(), hydrate(), loadLocal(), saveLocal() (+43 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, lint (+6 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "farm-hub-client.tsx"
Cohesion: 0.04
Nodes (38): Weather, WeatherCard(), Farm360, Farm360Incident, Farm360Plot, Farm360Task, HqFarm360(), saveBoundary() (+30 more)

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
Cohesion: 0.08
Nodes (35): DayBucket, dayKey(), dynamic, emptyTotals(), GET(), parseDay(), dynamic, GET() (+27 more)

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
Cohesion: 0.06
Nodes (34): GET(), POST(), POST(), GET(), POST(), GET(), PATCH(), GET() (+26 more)

### Community 24 - "icons.tsx"
Cohesion: 0.05
Nodes (24): IconProps, Icons, FarmOption, FarmSwitcher(), ProfileMenu(), ThemeToggle(), cn(), Label (+16 more)

### Community 25 - "desktop-sidebar.tsx"
Cohesion: 0.13
Nodes (12): BrandLogo(), BrandLogoProps, isActiveItem(), NAV_ITEMS, NavItem, ROLE_HOME_URLS, ROLE_LABELS, DesktopSidebar() (+4 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.10
Nodes (47): platformReadRoles, Actor, actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel (+39 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.09
Nodes (22): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), PriorityBadge(), Client, ClientsDirectory() (+14 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.11
Nodes (39): DELETE(), GET(), PATCH(), createCropCycle(), deleteCropCycle(), getCropCycleDetail(), getCropCycleDetailPageData(), getEditCropCyclePageData() (+31 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "spatial/index.ts"
Cohesion: 0.08
Nodes (41): POLICIES, Policy, SystemPolicyCards(), ValidatedPlotGeometry, getPlotVisits(), PlotVisitData, BBox, DEFAULT_GEOFENCE_RADIUS_METERS (+33 more)

### Community 33 - "prisma"
Cohesion: 0.13
Nodes (23): GET(), dynamic, GET(), GET(), createSchema, GET(), POST(), dynamic (+15 more)

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
Cohesion: 0.12
Nodes (34): Db, endAttendance(), Db, startAttendance(), assertEndAllowed(), assertStartAllowed(), assertStartPresent(), AttendanceFault (+26 more)

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
Nodes (29): cleanSamples(), decideSample(), GpsSample, BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed() (+21 more)

### Community 51 - "people-directory.tsx"
Cohesion: 0.08
Nodes (18): InternalTeamConsole(), Tab, formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS, SortOption (+10 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.18
Nodes (27): normalizeToGeoJson(), parseBoundary(), ringAcres(), throwFirst(), bboxOfRing(), clipPolygonToRect(), closeRing(), cross() (+19 more)

### Community 64 - "tasks-ledger.tsx"
Cohesion: 0.13
Nodes (24): AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES, HqTask, HqTasksLedger() (+16 more)

### Community 65 - "officer-day.tsx"
Cohesion: 0.06
Nodes (46): PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm, Officer (+38 more)

### Community 66 - "history/route.ts"
Cohesion: 0.10
Nodes (32): OfficerRow, ALL_KINDS, decodeCursor(), dynamic, encodeCursor(), endOfDayUTC(), GET(), HistoryItem (+24 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.14
Nodes (34): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+26 more)

### Community 70 - "hasPermission"
Cohesion: 0.09
Nodes (21): dynamic, HqClientDetailPage(), dynamic, HqClientsPage(), dynamic, EditFarmPage(), dynamic, HqFarmDetailPage() (+13 more)

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
Cohesion: 0.11
Nodes (31): POST(), irrigationItem, POST(), schema, centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence() (+23 more)

### Community 76 - "client-360.tsx"
Cohesion: 0.09
Nodes (19): Skeleton(), ACTIVITY_ICON, ActivityEntry, buildActivity(), Bundle, Client360(), ClientFarmsMap, FarmItem (+11 more)

### Community 77 - "apiError"
Cohesion: 0.09
Nodes (40): dynamic, GET(), GET(), PATCH(), updateClientSchema, GET(), PATCH(), updateStageSchema (+32 more)

### Community 78 - "http.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), GET(), musterSchema, POST(), GET(), GET() (+15 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "attendance-geo.ts"
Cohesion: 0.12
Nodes (16): attendanceDisplayVerdict(), AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, FarmGeoInput, GeofenceBasis, MAX_GPS_ACCURACY_METERS, num() (+8 more)

### Community 82 - "login/page.tsx"
Cohesion: 0.18
Nodes (13): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), getSession() (+5 more)

### Community 83 - "formatDateTime"
Cohesion: 0.20
Nodes (11): ACTION_OPTIONS, AuditConsole(), AuditLog, ENTITY_OPTIONS, SystemAuditExplorer(), formatActionLabel(), OverviewActivity(), timeAgo() (+3 more)

### Community 84 - "app/operations/page.tsx"
Cohesion: 0.19
Nodes (7): dynamic, loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "badge.tsx"
Cohesion: 0.06
Nodes (33): RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Estate, RosterItem, Summary, WorkforceAttendanceConsole() (+25 more)

### Community 87 - "owner/calendar/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, OperationsCalendarPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+2 more)

### Community 88 - "client-directory.tsx"
Cohesion: 0.22
Nodes (12): ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS, QuickView, relativeTime(), SORT_OPTIONS (+4 more)

### Community 89 - "officer/profile/page.tsx"
Cohesion: 0.24
Nodes (9): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+1 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "ADDING_A_FEATURE — "I need to add a new crop operation""
Cohesion: 0.20
Nodes (9): 1. Name it (vocabulary first), 2. Domain rule (pure, testable), 3. Use-case (orchestration), 4. Validation (layered, deliberately), 5. Route (thin — today's actual pattern, slimmed), 6. UI, 7. Auth, 8. Tests + docs (+1 more)

### Community 93 - "owner/dashboard/page.tsx"
Cohesion: 0.24
Nodes (8): dynamic, OwnerDashboardPage(), Farm, InitialTelemetry, OwnerCockpit(), OwnerCockpitProps, TelemetryAttendance, TelemetryPhoto

### Community 95 - "boundary-history.tsx"
Cohesion: 0.29
Nodes (7): AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS, BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 98 - "requireSession"
Cohesion: 0.05
Nodes (50): ClientDetailPage(), dynamic, AgronomyDiagnosticsPage(), dynamic, AgronomyPlanningPage(), dynamic, AgronomyRadarPage(), dynamic (+42 more)

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.36
Nodes (6): dynamic, HqSystemPage(), loadDataQuality(), DataQualityCounts, METRICS, SystemDataQuality()

### Community 100 - "onboarding-workspace.tsx"
Cohesion: 0.25
Nodes (4): OnboardingWorkspace(), PipelineFarm, STAGE_META, StageCounts

### Community 102 - "dashboard-client.tsx"
Cohesion: 0.25
Nodes (7): ClientDirectoryItem, DashboardClient(), DashboardClientProps, MacroTelemetry, SetupPipelineItem, STAGE_METADATA, STAGES_ORDER

### Community 103 - "overview-alerts.tsx"
Cohesion: 0.36
Nodes (6): OverviewAlert, OverviewAlertList(), SEVERITY_RANK, severityClass(), OverviewAlerts(), SEVERITY_RANK

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "requireFarmAccess"
Cohesion: 0.10
Nodes (32): canViewFarmMedia(), dynamic, GET(), createSchema, GET(), POST(), dynamic, GET() (+24 more)

### Community 106 - "TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite)"
Cohesion: 0.29
Nodes (6): Infra health (§28, separate from structure), Principle, Rules that make it real, TARGET_ARCHITECTURE — modular monolith (strangler, not rewrite), What we explicitly do NOT add, Why these boundaries

### Community 107 - "UI Technical Debt (checkpoint 4 — identified, NOT fixed here)"
Cohesion: 0.29
Nodes (6): Cross-page logic (business code beside routes), Dead / orphaned (moved, never deleted — prove usage before deleting), God components (over complexity threshold — split in domain slices), Naming (flagged, not renamed), Stale E2E, UI Technical Debt (checkpoint 4 — identified, NOT fixed here)

### Community 108 - "CURRENT_ARCHITECTURE (audited 2026-09-16)"
Cohesion: 0.33
Nodes (5): CURRENT_ARCHITECTURE (audited 2026-09-16), Layout (actual), Measured coupling (the core problem), Stack, Top findings (ranked by future cost)

### Community 109 - "land/page.tsx"
Cohesion: 0.47
Nodes (4): dynamic, OwnerLandPage(), dynamic, getOwnerLandData()

### Community 110 - "estates/index.ts"
Cohesion: 0.08
Nodes (57): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), activateEstate(), createEstate() (+49 more)

### Community 111 - "owner/people/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerPeoplePage(), Props, dynamic

### Community 113 - "crop-cycle-edit-form.tsx"
Cohesion: 0.40
Nodes (3): CropCycleEditForm(), Cycle, dateVal()

### Community 114 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 120 - "client-edit-form.tsx"
Cohesion: 0.33
Nodes (3): ClientEditForm(), EditableClient, ENTITY_TYPES

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "client-workspace.tsx"
Cohesion: 0.33
Nodes (4): ClientData, ClientWorkspace(), FarmSummary, UserSummary

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

### Community 139 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 142 - "db.ts"
Cohesion: 0.11
Nodes (21): createClientSchema, GET(), POST(), POST(), bulkSchema, POST(), PATCH(), bulkSchema (+13 more)

### Community 154 - "security/index.ts"
Cohesion: 0.10
Nodes (24): onboardSchema, POST(), normalizePhone(), POST(), createSchema, GET(), POST(), POST() (+16 more)

## Knowledge Gaps
- **810 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+805 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `client-workspace.tsx`, `farm-edit-page-form.tsx`, `geo-map.tsx`, `navbar.tsx`, `onboarding-wizard.tsx`, `farm-hub-client.tsx`, `desktop-sidebar.tsx`, `tasks-queue.tsx`, `boundary-walk.tsx`, `people-directory.tsx`, `tasks-ledger.tsx`, `officer-day.tsx`, `hasPermission`, `client-360.tsx`, `incidents-command.tsx`, `formatDateTime`, `app/operations/page.tsx`, `badge.tsx`, `owner/calendar/page.tsx`, `client-directory.tsx`, `officer/profile/page.tsx`, `owner/dashboard/page.tsx`, `farm-registry.tsx`, `requireSession`, `onboarding-workspace.tsx`, `dashboard-client.tsx`, `crop-cycle-edit-form.tsx`, `crop-cycle-form.tsx`, `client-edit-form.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma` to `operations/index.ts`, `plots/index.ts`, `navbar.tsx`, `attendance-geo-route.test.ts`, `overview-funnel.tsx`, `db.ts`, `requireRole`, `adversarial.test.ts`, `overview-farms.tsx`, `overview-kpis.tsx`, `security/index.ts`, `auth/index.ts`, `cropping/index.ts`, `spatial/index.ts`, `endAttendance.ts`, `history/route.ts`, `hasPermission`, `parseBoundaryToRing`, `apiError`, `http.ts`, `login/page.tsx`, `formatDateTime`, `app/operations/page.tsx`, `owner/calendar/page.tsx`, `officer/profile/page.tsx`, `owner/dashboard/page.tsx`, `requireSession`, `hq/system/page.tsx`, `overview-alerts.tsx`, `walk-sync.test.ts`, `requireFarmAccess`, `estates/index.ts`, `owner/people/page.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `client-workspace.tsx`, `farm-edit-page-form.tsx`, `geo-map.tsx`, `navbar.tsx`, `attendance-geo-route.test.ts`, `onboarding-wizard.tsx`, `farm-hub-client.tsx`, `icons.tsx`, `tasks-queue.tsx`, `tasks-ledger.tsx`, `officer-day.tsx`, `app/operations/page.tsx`, `badge.tsx`, `owner/calendar/page.tsx`, `client-directory.tsx`, `farm-registry.tsx`, `onboarding-workspace.tsx`, `dashboard-client.tsx`, `crop-cycle-form.tsx`, `client-edit-form.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _810 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.05297297297297297 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `geo-map.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04728604728604729 - nodes in this community are weakly interconnected._