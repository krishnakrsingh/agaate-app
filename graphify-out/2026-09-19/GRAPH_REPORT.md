# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 514 files · ~378,993 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2604 nodes · 7489 edges · 141 communities (116 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e28d20a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatDate
- operations/index.ts
- apiError
- geo-map.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- plots/index.ts
- dependencies
- devDependencies
- Navbar
- onboarding-schema.ts
- scripts
- Rate Limiting in FastAPI
- tasks-ledger.tsx
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- HttpError
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- useToast
- people-directory.tsx
- Debounce Search Input
- auth/index.ts
- unified-directory.tsx
- cropping/index.ts
- graphify reference: query, path, explain
- csv-sum.md
- chat-thread.tsx
- boundary-history.tsx
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
- client-360.tsx
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
- Icons
- history/route.ts
- 20260830181349_init_mysql/migration.sql
- requireSession
- accessibleFarmWhere
- No AI slop
- downloadUrl
- parseBoundaryToRing
- client-farms-map.tsx
- hq/incidents/route.ts
- requireRole
- incidents-command.tsx
- roles-admin.tsx
- theme-toggle.tsx
- session.ts
- navbar.tsx
- operations-triage-console.tsx
- No AI slop eval
- workforce-attendance-console.tsx
- plot-geo.test.ts
- client-directory.tsx
- attendance-geo.ts
- No AI Slop — Human Writing & Anti-Slop Guidelines
- getSession
- login/page.tsx
- design-guard.test.ts
- spatial/index.ts
- middleware.ts
- officer/profile/page.tsx
- reports/page.tsx
- hq/system/page.tsx
- icons.tsx
- AdminConsole
- Local Development & Setup Guide
- daily/page.tsx
- sync/route.ts
- currentActor
- audit
- [cycleId]/edit/page.tsx
- estates/index.ts
- db.ts
- 20260910170000_boundary_versions/migration.sql
- farm-registry.tsx
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- plot-demarcate-wizard.tsx
- hasPermission
- app/farms/new/page.tsx
- reverse/route.ts
- validation.ts
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
7. `Icons` - 110 edges
8. `requireSession()` - 105 edges
9. `useToast()` - 99 edges
10. `Navbar()` - 52 edges

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

## Communities (141 total, 25 thin omitted)

### Community 0 - "formatDate"
Cohesion: 0.07
Nodes (34): RFC-4180, Farm, MobileCrewMuster(), MusterRecord, Expense, Farm, FinancialsConsole(), Farm (+26 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (61): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, Db, persistPlannedTask() (+53 more)

### Community 2 - "apiError"
Cohesion: 0.10
Nodes (40): GET(), GET(), bulkSchema, POST(), GET(), GET(), GET(), GET() (+32 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.03
Nodes (74): Weather, WeatherCard(), Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, HqFarm360() (+66 more)

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
Nodes (41): DELETE(), GET(), PATCH(), GET(), POST(), archivePlot(), createPlot(), Db (+33 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, class-variance-authority, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, eslint-config-next, devDependencies, autoprefixer, eslint-config-next, @playwright/test, postcss, prisma (+23 more)

### Community 10 - "Navbar"
Cohesion: 0.07
Nodes (33): AttendancePage(), dynamic, dynamic, HqAnalyticsPage(), dynamic, EditClientPage(), AddClientFarmPage(), dynamic (+25 more)

### Community 11 - "onboarding-schema.ts"
Cohesion: 0.06
Nodes (59): clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard(), hydrate(), loadLocal(), saveLocal() (+51 more)

### Community 12 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, db:seed, dev, lint, migrate (+5 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "tasks-ledger.tsx"
Cohesion: 0.07
Nodes (38): ServerTable(), ServerListState, useServerList(), PriorityBadge(), StatusBadge(), Client, ClientsDirectory(), Farm (+30 more)

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

### Community 19 - "HttpError"
Cohesion: 0.12
Nodes (21): DayBucket, dayKey(), dynamic, emptyTotals(), GET(), parseDay(), dynamic, GET() (+13 more)

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
Nodes (29): GET(), POST(), POST(), POST(), GET(), POST(), dynamic, POST() (+21 more)

### Community 24 - "useToast"
Cohesion: 0.04
Nodes (43): ToastContext, ToastContextType, ToastMessage, ToastType, useToast(), CropCycleForm(), addPresetSupport(), submit() (+35 more)

### Community 25 - "people-directory.tsx"
Cohesion: 0.10
Nodes (17): describeUserAccess(), roleUsesFarmAccess(), formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS, SortOption (+9 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.16
Nodes (31): platformReadRoles, Actor, actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel (+23 more)

### Community 28 - "unified-directory.tsx"
Cohesion: 0.18
Nodes (8): ClientRow, DirectoryTab, FarmRow, PlotRow, UnifiedDirectory(), downloadCsv(), exportSelectionCsv(), UserRow

### Community 29 - "cropping/index.ts"
Cohesion: 0.08
Nodes (49): DELETE(), GET(), PATCH(), BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE, COMPONENT_PRISMA_GRANDFATHER, DELETED_PATHS (+41 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.06
Nodes (51): CHAT_ROLES, Item, NotificationBell(), AgronomyChat(), daysInGround(), FarmDossier, FarmOption, humanize() (+43 more)

### Community 33 - "boundary-history.tsx"
Cohesion: 0.33
Nodes (6): AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS, BoundaryHistory(), fmtDate(), HistoryVersion

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
Cohesion: 0.11
Nodes (36): assessTrack(), closureGapM(), GpsSample, nearStart(), fix(), mLat(), mLng(), squareWalk() (+28 more)

### Community 51 - "client-360.tsx"
Cohesion: 0.24
Nodes (8): Skeleton(), Bundle, Client360(), FarmItem, formatPhone(), GeoMap, initials(), TeamMember

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.13
Nodes (38): irrigationItem, POST(), schema, OnboardingStepPlots(), normalizeToGeoJson(), ringAcres(), throwFirst(), bboxOfRing() (+30 more)

### Community 64 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 65 - "Icons"
Cohesion: 0.05
Nodes (56): Icons, PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm (+48 more)

### Community 66 - "history/route.ts"
Cohesion: 0.10
Nodes (32): OfficerRow, ALL_KINDS, decodeCursor(), dynamic, encodeCursor(), endOfDayUTC(), GET(), HistoryItem (+24 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "requireSession"
Cohesion: 0.10
Nodes (19): ClientDetailPage(), dynamic, AgronomyChatPage(), dynamic, dynamic, HqProfilePage(), DashboardPage(), dynamic (+11 more)

### Community 70 - "accessibleFarmWhere"
Cohesion: 0.08
Nodes (24): AgronomyPlanningPage(), dynamic, dynamic, OwnerChatPage(), OwnerCropsPage(), dynamic, OwnerFarmsPage(), dynamic (+16 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "downloadUrl"
Cohesion: 0.11
Nodes (25): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), PATCH(), schema, GET() (+17 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.16
Nodes (16): POST(), BoundaryWrite, commitBoundary(), CommittedVersion, flagForChange(), plotsOutsideRing(), NOTE: under the entity-row lock above, P2002 here is near-impossible;, serializeBoundaryVersion() (+8 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 78 - "requireRole"
Cohesion: 0.07
Nodes (46): normalizePhone(), POST(), GET(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema (+38 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "roles-admin.tsx"
Cohesion: 0.12
Nodes (10): ASSIGNABLE_INTERNAL_ROLES, INTERNAL_ROLES, PERMISSION_GROUPS, resolveManageFarmIds(), InternalTeamConsole(), Tab, PermissionChecklist(), RoleFormDrawer() (+2 more)

### Community 81 - "theme-toggle.tsx"
Cohesion: 0.24
Nodes (6): getInitials(), ProfileMenu(), cn(), Label, labelVariants, Switch

### Community 82 - "session.ts"
Cohesion: 0.26
Nodes (10): LEGACY_ROLES, requireSecret(), secret, signSessionToken(), verifySessionToken(), cookieName(), createSession(), isSecureContext() (+2 more)

### Community 83 - "navbar.tsx"
Cohesion: 0.08
Nodes (25): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, CommandPalette(), CommandPaletteProps (+17 more)

### Community 84 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "workforce-attendance-console.tsx"
Cohesion: 0.07
Nodes (32): Column, ServerTableProps, RoleBadge(), EmptyState(), CardSkeleton(), Estate, RosterItem, Summary (+24 more)

### Community 87 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 88 - "client-directory.tsx"
Cohesion: 0.16
Nodes (15): ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS (+7 more)

### Community 89 - "attendance-geo.ts"
Cohesion: 0.12
Nodes (16): attendanceDisplayVerdict(), AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, FarmGeoInput, GeofenceBasis, MAX_GPS_ACCURACY_METERS, num() (+8 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "getSession"
Cohesion: 0.23
Nodes (8): dynamic, GET(), passwordSchema, PUT(), PUT(), schema, getSession(), readToken()

### Community 93 - "login/page.tsx"
Cohesion: 0.19
Nodes (11): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), LoginForm() (+3 more)

### Community 95 - "spatial/index.ts"
Cohesion: 0.11
Nodes (31): GET(), GET(), ValidatedPlotGeometry, getPlotVisits(), PlotVisitData, BBox, DEFAULT_GEOFENCE_RADIUS_METERS, distanceMeters() (+23 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "officer/profile/page.tsx"
Cohesion: 0.24
Nodes (9): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+1 more)

### Community 98 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.14
Nodes (13): dynamic, HqSystemPage(), loadDataQuality(), dynamic, SystemPage(), AuditConsole(), SystemAuditExplorer(), DataQualityCounts (+5 more)

### Community 100 - "icons.tsx"
Cohesion: 0.08
Nodes (10): IconProps, Farm, FarmProfile, Farm, InitialTelemetry, OwnerCockpitProps, TelemetryAttendance, TelemetryPhoto (+2 more)

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 104 - "sync/route.ts"
Cohesion: 0.15
Nodes (18): centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema, ActivationSummary (+10 more)

### Community 105 - "currentActor"
Cohesion: 0.08
Nodes (36): GET(), PATCH(), updateStageSchema, dynamic, GET(), runtime, DELETE(), GET() (+28 more)

### Community 107 - "audit"
Cohesion: 0.09
Nodes (25): GET(), PATCH(), updateClientSchema, createClientSchema, POST(), POST(), onboardSchema, POST() (+17 more)

### Community 108 - "[cycleId]/edit/page.tsx"
Cohesion: 0.28
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (58): DELETE(), GET(), POST(), GET(), PATCH(), GET(), activateEstate(), createEstate() (+50 more)

### Community 111 - "db.ts"
Cohesion: 0.08
Nodes (32): dynamic, GET(), GET(), dynamic, GET(), GET(), createSchema, GET() (+24 more)

### Community 113 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 131 - "plot-demarcate-wizard.tsx"
Cohesion: 0.07
Nodes (33): dynamic, StepWizard(), StepWizardProps, WizardStep, FarmDemarcationMap, CropCycleTargetPlot, CropCycleWizard(), CropCycleWizardProps (+25 more)

### Community 132 - "hasPermission"
Cohesion: 0.08
Nodes (23): dynamic, HqAgronomistsPage(), dynamic, HqClientDetailPage(), dynamic, HqClientsPage(), dynamic, EditFarmPage() (+15 more)

### Community 134 - "app/farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.83
Nodes (3): checkPort(), main(), startWslDatabase()

## Knowledge Gaps
- **775 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+770 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `Icons` to `formatDate`, `plot-demarcate-wizard.tsx`, `hasPermission`, `geo-map.tsx`, `Navbar`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `useToast`, `people-directory.tsx`, `unified-directory.tsx`, `chat-thread.tsx`, `boundary-walk.tsx`, `client-360.tsx`, `geo-core.ts`, `accessibleFarmWhere`, `incidents-command.tsx`, `roles-admin.tsx`, `theme-toggle.tsx`, `navbar.tsx`, `operations-triage-console.tsx`, `workforce-attendance-console.tsx`, `client-directory.tsx`, `officer/profile/page.tsx`, `icons.tsx`, `[cycleId]/edit/page.tsx`, `farm-registry.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `operations/index.ts`, `apiError`, `plot-demarcate-wizard.tsx`, `hasPermission`, `app/farms/new/page.tsx`, `plots/index.ts`, `Navbar`, `HttpError`, `adversarial.test.ts`, `auth/index.ts`, `cropping/index.ts`, `endAttendance.ts`, `geo-core.ts`, `attendance-geo-route.test.ts`, `history/route.ts`, `requireSession`, `accessibleFarmWhere`, `downloadUrl`, `parseBoundaryToRing`, `hq/incidents/route.ts`, `requireRole`, `plot-geo.test.ts`, `getSession`, `login/page.tsx`, `spatial/index.ts`, `officer/profile/page.tsx`, `hq/system/page.tsx`, `sync/route.ts`, `currentActor`, `audit`, `estates/index.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `chat-thread.tsx`, `Icons`, `attendance-geo-route.test.ts`, `formatDate`, `plot-demarcate-wizard.tsx`, `geo-map.tsx`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `farm-registry.tsx`, `operations-triage-console.tsx`, `workforce-attendance-console.tsx`, `client-directory.tsx`, `unified-directory.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _775 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatDate` be split into smaller, more focused modules?**
  _Cohesion score 0.07227891156462585 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062434691745036575 - nodes in this community are weakly interconnected._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.09783183500793231 - nodes in this community are weakly interconnected._