# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 517 files · ~380,894 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2621 nodes · 7501 edges · 152 communities (123 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04c7f80e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- icons.tsx
- operations/index.ts
- apiError
- farm-hub-client.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- plots/index.ts
- dependencies
- devDependencies
- breadcrumbs.tsx
- onboarding-schema.ts
- scripts
- Rate Limiting in FastAPI
- tasks-ledger.tsx
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- requireRole
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- desktop-sidebar.tsx
- people-directory.tsx
- Debounce Search Input
- auth/index.ts
- spatial/index.ts
- cropping/index.ts
- graphify reference: query, path, explain
- csv-sum.md
- chat-thread.tsx
- 2. The 5 Specific Technical Failures of MySQL in Agaate
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
- parseBoundary
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
- attendance-geo-route.test.ts
- weekly-planner.tsx
- calendar-platform.tsx
- 20260830181349_init_mysql/migration.sql
- requireSession
- harvest/page.tsx
- No AI slop
- downloadUrl
- parseBoundaryToRing
- client-farms-map.tsx
- farm-360.tsx
- security/index.ts
- incidents-command.tsx
- geo-map.tsx
- farm-registry.tsx
- session.ts
- navbar.tsx
- app/operations/page.tsx
- No AI slop eval
- officer-day.tsx
- plot-geo.test.ts
- client-directory.tsx
- attendance-geo.ts
- No AI Slop — Human Writing & Anti-Slop Guidelines
- getSession
- login/page.tsx
- design-guard.test.ts
- LngLat
- middleware.ts
- geo.ts
- reports/page.tsx
- hq/system/page.tsx
- profile-settings-console.tsx
- AdminConsole
- Local Development & Setup Guide
- boundary-history.tsx
- walk-sync.test.ts
- crop-cycles/new/page.tsx
- hq/people/page.tsx
- currentActor
- [cycleId]/edit/page.tsx
- farm-demarcation-map.tsx
- estates/index.ts
- db.ts
- 20260910170000_boundary_versions/migration.sql
- tasks-queue.tsx
- owner/people/page.tsx
- OnboardingWorkspace
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- owner/farms/page.tsx
- onboard-client/route.ts
- crops/page.tsx
- hq/onboarding/page.tsx
- CropCycleForm
- client-onboarding-wizard-v2.tsx
- [clientId]/farms/new/page.tsx
- reverse/route.ts
- [farmId]/edit/page.tsx
- validation.ts
- setup-postgres.sh
- backfill-boundary-versions.ts
- backfill-role-definitions.mjs
- hq/page.tsx
- tailwind-merge
- @paper-design/shaders-react
- zod
- ensure-db.mjs
- @prisma/client

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 235 edges
2. `currentActor()` - 194 edges
3. `prisma` - 163 edges
4. `requireFarmAccess()` - 149 edges
5. `audit()` - 121 edges
6. `requireRole()` - 111 edges
7. `Icons` - 109 edges
8. `requireSession()` - 105 edges
9. `useToast()` - 99 edges
10. `Navbar()` - 52 edges

## Surprising Connections (you probably didn't know these)
- `HqAnalyticsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/analytics/page.tsx → src/modules/auth/infrastructure/session.ts
- `AddClientFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/clients/[clientId]/farms/new/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqIncidentsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/incidents/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqProfilePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/profile/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqTasksPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/tasks/page.tsx → src/modules/auth/infrastructure/session.ts

## Import Cycles
- None detected.

## Communities (152 total, 29 thin omitted)

### Community 0 - "icons.tsx"
Cohesion: 0.03
Nodes (71): RFC-4180, dynamic, OfficerCrewPage(), IconProps, Icons, ToastContext, ToastContextType, ToastMessage (+63 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (63): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+55 more)

### Community 2 - "apiError"
Cohesion: 0.10
Nodes (45): GET(), GET(), GET(), GET(), GET(), musterSchema, POST(), createSchema (+37 more)

### Community 3 - "farm-hub-client.tsx"
Cohesion: 0.07
Nodes (22): Weather, WeatherCard(), ActivateFarmButton(), FarmSetupStageKey, GeoMap, SETUP_STAGES, FarmEditForm(), CropCycle (+14 more)

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
Cohesion: 0.10
Nodes (43): DELETE(), GET(), PATCH(), GET(), POST(), dynamic, PlotPage(), archivePlot() (+35 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, class-variance-authority, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, eslint-config-next, devDependencies, autoprefixer, eslint-config-next, @playwright/test, postcss, prisma (+23 more)

### Community 10 - "breadcrumbs.tsx"
Cohesion: 0.07
Nodes (24): AttendancePage(), dynamic, dynamic, HqAnalyticsPage(), dynamic, HqIncidentsPage(), dynamic, HqOnboardingDraftPage() (+16 more)

### Community 11 - "onboarding-schema.ts"
Cohesion: 0.05
Nodes (66): GET(), dynamic, HqOnboardingNewPage(), Props, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot() (+58 more)

### Community 12 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, db:seed, dev, lint, migrate (+5 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "tasks-ledger.tsx"
Cohesion: 0.06
Nodes (41): ServerTable(), ServerListState, useServerList(), Client, ClientsDirectory(), Farm, FarmsDirectory(), ClientRow (+33 more)

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
Cohesion: 0.06
Nodes (50): GET(), GET(), num(), DayBucket, dayKey(), dynamic, emptyTotals(), GET() (+42 more)

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
Cohesion: 0.08
Nodes (30): PATCH(), GET(), POST(), GET(), POST(), POST(), GET(), POST() (+22 more)

### Community 24 - "desktop-sidebar.tsx"
Cohesion: 0.07
Nodes (27): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, ROLE_HOME_URLS, DesktopSidebar() (+19 more)

### Community 25 - "people-directory.tsx"
Cohesion: 0.08
Nodes (21): describeUserAccess(), roleUsesFarmAccess(), Tab, formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS (+13 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.16
Nodes (33): actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel, AccessScope, ALL_PERMISSIONS (+25 more)

### Community 28 - "spatial/index.ts"
Cohesion: 0.18
Nodes (24): distanceMeters(), pathPerimeterM(), AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), planVisitRoute(), assessTrack(), CleanedTrack, cleanSamples() (+16 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.07
Nodes (50): DELETE(), GET(), PATCH(), CropCycleDetailPage(), dynamic, BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE (+42 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.06
Nodes (53): dynamic, runtime, dynamic, OfficerChatPage(), CHAT_ROLES, Item, NotificationBell(), AgronomyChat() (+45 more)

### Community 33 - "2. The 5 Specific Technical Failures of MySQL in Agaate"
Cohesion: 0.14
Nodes (13): 1. The BigBasket Argument: "If BigBasket Runs on MySQL, Why Can't We?", 2. The 5 Specific Technical Failures of MySQL in Agaate, 3. Concrete Code Evidence: What We Had to Fix During Migration, 4. Verification & Parity Scorecard, 5. Conclusion, A. E-Commerce vs Precision Agriculture, Architecture Report: Why MySQL Failed Agaate's Workload & The PostgreSQL Migration, B. The Infrastructure Reality (+5 more)

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
Nodes (27): GpsSample, BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList() (+19 more)

### Community 51 - "parseBoundary"
Cohesion: 0.13
Nodes (13): dynamic, HqClientDetailPage(), Bundle, Client360(), FarmItem, formatPhone(), GeoMap, initials() (+5 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.12
Nodes (37): irrigationItem, POST(), schema, normalizeToGeoJson(), ringAcres(), throwFirst(), BBox, bboxOfRing() (+29 more)

### Community 64 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 65 - "weekly-planner.tsx"
Cohesion: 0.07
Nodes (39): AgronomyPlanningPage(), dynamic, PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), Farm (+31 more)

### Community 66 - "calendar-platform.tsx"
Cohesion: 0.13
Nodes (25): OfficerRow, HistoryItem, HistoryKind, addDays(), CalendarPayload, DayBucket, HqCalendarPlatform(), goToday() (+17 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "requireSession"
Cohesion: 0.08
Nodes (22): ClientDetailPage(), dynamic, AgronomyChatPage(), dynamic, dynamic, EditClientPage(), dynamic, HqClientsPage() (+14 more)

### Community 70 - "harvest/page.tsx"
Cohesion: 0.28
Nodes (6): dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "downloadUrl"
Cohesion: 0.20
Nodes (17): canViewFarmMedia(), dynamic, GET(), GET(), GET(), ALLOWED_DIRECT_MIME, POST(), POST() (+9 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.11
Nodes (28): POST(), centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema (+20 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "farm-360.tsx"
Cohesion: 0.13
Nodes (11): Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, SETUP_STAGES, TabKey, AccessResponse (+3 more)

### Community 78 - "security/index.ts"
Cohesion: 0.06
Nodes (45): normalizePhone(), POST(), GET(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema (+37 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "geo-map.tsx"
Cohesion: 0.13
Nodes (16): GeoMap, pinColor(), TaskMapCard(), TaskPin, GeoMap, BaseLayer, GeomanController(), GeoMapPin (+8 more)

### Community 81 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 82 - "session.ts"
Cohesion: 0.20
Nodes (13): platformReadRoles, Actor, LEGACY_ROLES, requireSecret(), secret, signSessionToken(), verifySessionToken(), cookieName() (+5 more)

### Community 83 - "navbar.tsx"
Cohesion: 0.11
Nodes (21): dynamic, HqAgronomistsPage(), dynamic, PeoplePage(), dynamic, NewTaskPage(), CommandPalette(), CommandPaletteProps (+13 more)

### Community 84 - "app/operations/page.tsx"
Cohesion: 0.14
Nodes (10): DashboardPage(), dynamic, dynamic, OperationsPage(), loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind (+2 more)

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "officer-day.tsx"
Cohesion: 0.05
Nodes (48): Column, ServerTableProps, PriorityBadge(), RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Skeleton() (+40 more)

### Community 87 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 88 - "client-directory.tsx"
Cohesion: 0.16
Nodes (15): ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS (+7 more)

### Community 89 - "attendance-geo.ts"
Cohesion: 0.13
Nodes (15): attendanceDisplayVerdict(), AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, FarmGeoInput, MAX_GPS_ACCURACY_METERS, num(), parseRingTolerant() (+7 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "getSession"
Cohesion: 0.23
Nodes (8): dynamic, GET(), passwordSchema, PUT(), PUT(), schema, getSession(), readToken()

### Community 93 - "login/page.tsx"
Cohesion: 0.19
Nodes (11): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), LoginForm() (+3 more)

### Community 95 - "LngLat"
Cohesion: 0.16
Nodes (14): ValidatedPlotGeometry, getPlotVisits(), PlotVisitData, LngLat, pointInRing(), fences, visits, computePlotVisits() (+6 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "geo.ts"
Cohesion: 0.09
Nodes (23): saveBoundary(), DemarcationTargetFarm, GeoMap, PlotDemarcateWizard(), PlotDemarcateWizardProps, WIZARD_STEPS, GeoMap, INDIA_CENTER (+15 more)

### Community 98 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.23
Nodes (9): dynamic, HqSystemPage(), loadDataQuality(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES, Policy (+1 more)

### Community 100 - "profile-settings-console.tsx"
Cohesion: 0.36
Nodes (6): dynamic, HqProfilePage(), formatDate(), getInitials(), ProfileSettingsConsole(), ProfileUser

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "boundary-history.tsx"
Cohesion: 0.38
Nodes (5): SOURCE_LABELS, BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "crop-cycles/new/page.tsx"
Cohesion: 0.50
Nodes (4): dynamic, NewCropCyclePage(), getNewCropCyclePageData(), findPlotForNewCropCyclePage()

### Community 106 - "hq/people/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, HqPeoplePage(), InternalTeamConsole()

### Community 107 - "currentActor"
Cohesion: 0.06
Nodes (54): GET(), GET(), PATCH(), updateClientSchema, POST(), POST(), GET(), PATCH() (+46 more)

### Community 108 - "[cycleId]/edit/page.tsx"
Cohesion: 0.28
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 109 - "farm-demarcation-map.tsx"
Cohesion: 0.20
Nodes (7): FarmDemarcationMap, DemarcationFarm, DemarcationPlot, FarmDemarcationMap(), FarmDemarcationMapProps, PLOT_COLOR_PALETTE, toLeafletCoords()

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (60): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), parseSort(), activateEstate() (+52 more)

### Community 111 - "db.ts"
Cohesion: 0.11
Nodes (21): dynamic, createClientSchema, GET(), dynamic, GET(), dynamic, dynamic, asNum() (+13 more)

### Community 113 - "tasks-queue.tsx"
Cohesion: 0.12
Nodes (19): dynamic, OwnerOperationsPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+11 more)

### Community 114 - "owner/people/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, OwnerPeoplePage(), Props, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "owner/farms/page.tsx"
Cohesion: 0.38
Nodes (5): dynamic, OwnerFarmsPage(), OwnerFarmData, OwnerFarmsView(), OwnerFarmsViewProps

### Community 130 - "onboard-client/route.ts"
Cohesion: 0.39
Nodes (5): onboardSchema, POST(), NotificationPayload, NotificationType, sendNotification()

### Community 131 - "crops/page.tsx"
Cohesion: 0.12
Nodes (20): dynamic, OwnerCropsPage(), StepWizard(), StepWizardProps, WizardStep, CropCycleTargetPlot, CropCycleWizard(), CropCycleWizardProps (+12 more)

### Community 132 - "hq/onboarding/page.tsx"
Cohesion: 0.67
Nodes (3): dynamic, formatDate(), HqOnboardingListPage()

### Community 133 - "CropCycleForm"
Cohesion: 0.60
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 134 - "client-onboarding-wizard-v2.tsx"
Cohesion: 0.20
Nodes (6): dynamic, FarmForm(), ClientOnboardingWizardV2(), GeoMap, HandoverData, STEPS

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.60
Nodes (4): checkPort(), isPostgres, main(), startWslDatabase()

## Knowledge Gaps
- **786 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+781 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `owner/farms/page.tsx`, `crops/page.tsx`, `hq/onboarding/page.tsx`, `farm-hub-client.tsx`, `client-onboarding-wizard-v2.tsx`, `breadcrumbs.tsx`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `desktop-sidebar.tsx`, `people-directory.tsx`, `cropping/index.ts`, `chat-thread.tsx`, `boundary-walk.tsx`, `parseBoundary`, `weekly-planner.tsx`, `harvest/page.tsx`, `farm-360.tsx`, `incidents-command.tsx`, `farm-registry.tsx`, `navbar.tsx`, `app/operations/page.tsx`, `officer-day.tsx`, `client-directory.tsx`, `geo.ts`, `profile-settings-console.tsx`, `[cycleId]/edit/page.tsx`, `farm-demarcation-map.tsx`, `tasks-queue.tsx`, `owner/people/page.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `icons.tsx`, `owner/farms/page.tsx`, `apiError`, `onboard-client/route.ts`, `hq/onboarding/page.tsx`, `crops/page.tsx`, `client-onboarding-wizard-v2.tsx`, `[clientId]/farms/new/page.tsx`, `operations/index.ts`, `[farmId]/edit/page.tsx`, `breadcrumbs.tsx`, `onboarding-schema.ts`, `plots/index.ts`, `requireRole`, `adversarial.test.ts`, `auth/index.ts`, `cropping/index.ts`, `endAttendance.ts`, `parseBoundary`, `geo-core.ts`, `attendance-geo-route.test.ts`, `weekly-planner.tsx`, `requireSession`, `harvest/page.tsx`, `downloadUrl`, `parseBoundaryToRing`, `security/index.ts`, `session.ts`, `app/operations/page.tsx`, `plot-geo.test.ts`, `getSession`, `login/page.tsx`, `LngLat`, `hq/system/page.tsx`, `profile-settings-console.tsx`, `walk-sync.test.ts`, `currentActor`, `estates/index.ts`, `tasks-queue.tsx`, `owner/people/page.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useToast()` connect `icons.tsx` to `crops/page.tsx`, `farm-hub-client.tsx`, `CropCycleForm`, `client-onboarding-wizard-v2.tsx`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `chat-thread.tsx`, `parseBoundary`, `attendance-geo-route.test.ts`, `weekly-planner.tsx`, `farm-360.tsx`, `farm-registry.tsx`, `navbar.tsx`, `app/operations/page.tsx`, `officer-day.tsx`, `client-directory.tsx`, `geo.ts`, `profile-settings-console.tsx`, `tasks-queue.tsx`, `owner/people/page.tsx`, `OnboardingWorkspace`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _786 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0312258064516129 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06092384519350812 - nodes in this community are weakly interconnected._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._