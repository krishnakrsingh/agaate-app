# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 517 files · ~380,927 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2620 nodes · 7500 edges · 147 communities (121 shown, 26 thin omitted)
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
- Navbar
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
- security/index.ts
- navbar.tsx
- people-directory.tsx
- Debounce Search Input
- auth/index.ts
- sync/route.ts
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
- formatDate
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
- history/route.ts
- 20260830181349_init_mysql/migration.sql
- requireSession
- crew/page.tsx
- No AI slop
- downloadUrl
- parseBoundaryToRing
- client-farms-map.tsx
- tasks-queue.tsx
- chat-phase1.test.ts
- incidents-command.tsx
- accessibleFarmWhere
- people-drawers.tsx
- session.ts
- conversations/stream/route.ts
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
- spatial/index.ts
- middleware.ts
- geo-map.tsx
- officer/profile/page.tsx
- hq/system/page.tsx
- profile-settings-console.tsx
- app/people/page.tsx
- Local Development & Setup Guide
- cn
- walk-sync.test.ts
- daily/page.tsx
- ProfileMenu
- currentActor
- [cycleId]/edit/page.tsx
- farm-demarcation-map.tsx
- estates/index.ts
- db.ts
- 20260910170000_boundary_versions/migration.sql
- owner/operations/page.tsx
- owner/people/page.tsx
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- onboard-client/route.ts
- crops/page.tsx
- crop-cycles/new/page.tsx
- app/farms/new/page.tsx
- reverse/route.ts
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
- `AgronomyChatPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/agronomy/chat/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqAnalyticsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/analytics/page.tsx → src/modules/auth/infrastructure/session.ts
- `EditClientPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/clients/[clientId]/edit/page.tsx → src/modules/auth/infrastructure/session.ts
- `AddClientFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/clients/[clientId]/farms/new/page.tsx → src/modules/auth/infrastructure/session.ts
- `HqIncidentsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/incidents/page.tsx → src/modules/auth/infrastructure/session.ts

## Import Cycles
- None detected.

## Communities (147 total, 26 thin omitted)

### Community 0 - "icons.tsx"
Cohesion: 0.04
Nodes (45): IconProps, Icons, ThemeToggle(), ToastContext, ToastContextType, ToastMessage, ToastType, useToast() (+37 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (62): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+54 more)

### Community 2 - "apiError"
Cohesion: 0.09
Nodes (45): GET(), GET(), GET(), GET(), GET(), GET(), musterSchema, POST() (+37 more)

### Community 3 - "farm-hub-client.tsx"
Cohesion: 0.08
Nodes (18): Weather, WeatherCard(), ActivateFarmButton(), CropCycle, Farm, FarmHubClient(), FarmSetupStageKey, Incident (+10 more)

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

### Community 10 - "Navbar"
Cohesion: 0.06
Nodes (37): AttendancePage(), dynamic, AgronomyChatPage(), dynamic, dynamic, HqAgronomistsPage(), dynamic, HqAnalyticsPage() (+29 more)

### Community 11 - "onboarding-schema.ts"
Cohesion: 0.05
Nodes (62): dynamic, HqOnboardingNewPage(), Props, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard() (+54 more)

### Community 12 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, db:seed, dev, lint, migrate (+5 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "tasks-ledger.tsx"
Cohesion: 0.13
Nodes (24): AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES, HqTask, HqTasksLedger() (+16 more)

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
Nodes (34): dynamic, GET(), GET(), dynamic, GET(), num(), DayBucket, dayKey() (+26 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "security/index.ts"
Cohesion: 0.06
Nodes (40): GET(), POST(), normalizePhone(), POST(), POST(), GET(), POST(), GET() (+32 more)

### Community 24 - "navbar.tsx"
Cohesion: 0.08
Nodes (26): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, CommandPalette(), CommandPaletteProps (+18 more)

### Community 25 - "people-directory.tsx"
Cohesion: 0.10
Nodes (14): InternalTeamConsole(), Tab, formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS, SortOption (+6 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.16
Nodes (32): actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel, AccessScope, ALL_PERMISSIONS (+24 more)

### Community 28 - "sync/route.ts"
Cohesion: 0.13
Nodes (28): centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema, distanceMeters() (+20 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.08
Nodes (49): DELETE(), GET(), PATCH(), CropCycleDetailPage(), dynamic, BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE (+41 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.08
Nodes (46): CHAT_ROLES, Item, NotificationBell(), AgronomyChat(), daysInGround(), FarmDossier, FarmOption, humanize() (+38 more)

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

### Community 51 - "formatDate"
Cohesion: 0.07
Nodes (34): RFC-4180, Farm, MobileCrewMuster(), MusterRecord, Expense, Farm, FinancialsConsole(), Farm (+26 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.12
Nodes (39): irrigationItem, POST(), schema, OnboardingStepPlots(), normalizeToGeoJson(), ringAcres(), throwFirst(), bboxOfRing() (+31 more)

### Community 64 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 65 - "weekly-planner.tsx"
Cohesion: 0.06
Nodes (43): dynamic, PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm (+35 more)

### Community 66 - "history/route.ts"
Cohesion: 0.10
Nodes (32): OfficerRow, ALL_KINDS, decodeCursor(), dynamic, encodeCursor(), endOfDayUTC(), GET(), HistoryItem (+24 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "requireSession"
Cohesion: 0.07
Nodes (25): ClientDetailPage(), dynamic, AgronomyPlanningPage(), dynamic, dynamic, HqClientsPage(), dynamic, HqFarmsPage() (+17 more)

### Community 70 - "crew/page.tsx"
Cohesion: 0.21
Nodes (8): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "downloadUrl"
Cohesion: 0.17
Nodes (20): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), PATCH(), schema, GET() (+12 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.19
Nodes (13): POST(), ActivationSummary, POST(), parseBoundary(), validatePlotGeometry(), commitBoundary(), plotsOutsideRing(), serializeBoundaryVersion() (+5 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (23): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), PriorityBadge(), Client, ClientsDirectory() (+15 more)

### Community 78 - "chat-phase1.test.ts"
Cohesion: 0.08
Nodes (33): GET(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema, ShapedMessage, shapeMessages() (+25 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "accessibleFarmWhere"
Cohesion: 0.13
Nodes (17): GET(), ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter() (+9 more)

### Community 81 - "people-drawers.tsx"
Cohesion: 0.17
Nodes (8): roleUsesFarmAccess(), AssignedFarm, CreateAccountDrawer(), EditAccessDrawer(), FarmAccessInfo, FarmAssigner(), RoleDefinitionInfo, useHqRoles()

### Community 82 - "session.ts"
Cohesion: 0.18
Nodes (15): platformReadRoles, Actor, loadActiveUser(), Session, LEGACY_ROLES, requireSecret(), secret, signSessionToken() (+7 more)

### Community 83 - "conversations/stream/route.ts"
Cohesion: 0.21
Nodes (6): dynamic, runtime, BroadcastPayload, ChatBroadcaster, ConversationPayload, ChatMessage

### Community 84 - "app/operations/page.tsx"
Cohesion: 0.14
Nodes (10): DashboardPage(), dynamic, dynamic, OperationsPage(), loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind (+2 more)

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "officer-day.tsx"
Cohesion: 0.05
Nodes (49): RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Skeleton(), Estate, RosterItem, Summary (+41 more)

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
Cohesion: 0.09
Nodes (31): ValidatedPlotGeometry, BoundaryWrite, CommittedVersion, flagForChange(), NOTE: under the entity-row lock above, P2002 here is near-impossible;, SerializedBoundaryVersion, Tx, VersionProvenance (+23 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "geo-map.tsx"
Cohesion: 0.04
Nodes (62): Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, HqFarm360(), saveBoundary(), SETUP_STAGES (+54 more)

### Community 98 - "officer/profile/page.tsx"
Cohesion: 0.24
Nodes (9): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+1 more)

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.20
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), SystemAuditExplorer(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES (+2 more)

### Community 100 - "profile-settings-console.tsx"
Cohesion: 0.36
Nodes (6): dynamic, HqProfilePage(), formatDate(), getInitials(), ProfileSettingsConsole(), ProfileUser

### Community 101 - "app/people/page.tsx"
Cohesion: 0.18
Nodes (3): dynamic, PeoplePage(), AdminConsole()

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "cn"
Cohesion: 0.52
Nodes (4): cn(), Label, labelVariants, Switch

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 107 - "currentActor"
Cohesion: 0.07
Nodes (50): GET(), PATCH(), updateClientSchema, createClientSchema, GET(), POST(), POST(), GET() (+42 more)

### Community 108 - "[cycleId]/edit/page.tsx"
Cohesion: 0.24
Nodes (7): dynamic, EditCropCyclePage(), getEditCropCyclePageData(), findPlotForEditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 109 - "farm-demarcation-map.tsx"
Cohesion: 0.20
Nodes (7): FarmDemarcationMap, DemarcationFarm, DemarcationPlot, FarmDemarcationMap(), FarmDemarcationMapProps, PLOT_COLOR_PALETTE, toLeafletCoords()

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (60): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), parseSort(), activateEstate() (+52 more)

### Community 111 - "db.ts"
Cohesion: 0.14
Nodes (17): GET(), dynamic, GET(), GET(), GET(), quickLogSchema, officerTaskSchema, POST() (+9 more)

### Community 113 - "owner/operations/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, OwnerOperationsPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+4 more)

### Community 114 - "owner/people/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerPeoplePage(), Props, FarmWorker

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 130 - "onboard-client/route.ts"
Cohesion: 0.33
Nodes (6): onboardSchema, POST(), POST(), NotificationPayload, NotificationType, sendNotification()

### Community 131 - "crops/page.tsx"
Cohesion: 0.09
Nodes (25): dynamic, OwnerCropsPage(), dynamic, OwnerFarmsPage(), StepWizard(), StepWizardProps, WizardStep, CropCycleTargetPlot (+17 more)

### Community 133 - "crop-cycles/new/page.tsx"
Cohesion: 0.32
Nodes (7): dynamic, NewCropCyclePage(), CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 134 - "app/farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.60
Nodes (4): checkPort(), isPostgres, main(), startWslDatabase()

## Knowledge Gaps
- **785 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+780 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `crops/page.tsx`, `farm-hub-client.tsx`, `Navbar`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `navbar.tsx`, `people-directory.tsx`, `cropping/index.ts`, `chat-thread.tsx`, `boundary-walk.tsx`, `formatDate`, `geo-core.ts`, `weekly-planner.tsx`, `requireSession`, `crew/page.tsx`, `tasks-queue.tsx`, `incidents-command.tsx`, `people-drawers.tsx`, `app/operations/page.tsx`, `officer-day.tsx`, `client-directory.tsx`, `geo-map.tsx`, `officer/profile/page.tsx`, `profile-settings-console.tsx`, `[cycleId]/edit/page.tsx`, `farm-demarcation-map.tsx`, `owner/operations/page.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `operations/index.ts`, `apiError`, `onboard-client/route.ts`, `crops/page.tsx`, `app/farms/new/page.tsx`, `plots/index.ts`, `Navbar`, `onboarding-schema.ts`, `requireRole`, `security/index.ts`, `auth/index.ts`, `sync/route.ts`, `cropping/index.ts`, `endAttendance.ts`, `geo-core.ts`, `attendance-geo-route.test.ts`, `history/route.ts`, `requireSession`, `crew/page.tsx`, `downloadUrl`, `parseBoundaryToRing`, `chat-phase1.test.ts`, `accessibleFarmWhere`, `session.ts`, `app/operations/page.tsx`, `plot-geo.test.ts`, `getSession`, `login/page.tsx`, `spatial/index.ts`, `officer/profile/page.tsx`, `hq/system/page.tsx`, `profile-settings-console.tsx`, `walk-sync.test.ts`, `currentActor`, `estates/index.ts`, `owner/operations/page.tsx`, `owner/people/page.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `useToast()` connect `icons.tsx` to `chat-thread.tsx`, `weekly-planner.tsx`, `attendance-geo-route.test.ts`, `crops/page.tsx`, `farm-hub-client.tsx`, `crop-cycles/new/page.tsx`, `geo-map.tsx`, `profile-settings-console.tsx`, `onboarding-schema.ts`, `tasks-queue.tsx`, `tasks-ledger.tsx`, `owner/operations/page.tsx`, `formatDate`, `app/operations/page.tsx`, `officer-day.tsx`, `client-directory.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _785 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.038662486938349006 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06205311542390194 - nodes in this community are weakly interconnected._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.09336016096579478 - nodes in this community are weakly interconnected._