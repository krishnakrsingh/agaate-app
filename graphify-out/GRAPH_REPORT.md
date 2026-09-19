# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 511 files · ~375,119 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2584 nodes · 7437 edges · 147 communities (121 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c10f8c5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatDate
- updateTask.ts
- apiError
- geo-map.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- plots/index.ts
- dependencies
- devDependencies
- navbar.tsx
- onboarding-schema.ts
- scripts
- Rate Limiting in FastAPI
- tasks-ledger.tsx
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- http.ts
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- useToast
- farm-hub-client.tsx
- Debounce Search Input
- auth/index.ts
- tasks-queue.tsx
- cropping/index.ts
- graphify reference: query, path, explain
- csv-sum.md
- chat-thread.tsx
- spatial/index.ts
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
- completeTask.ts
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
- operations/index.ts
- weekly-planner.tsx
- calendar-platform.tsx
- 20260830181349_init_mysql/migration.sql
- planTask.ts
- crew/page.tsx
- No AI slop
- downloadUrl
- parseBoundaryToRing
- client-farms-map.tsx
- listTasks.ts
- db.ts
- incidents-command.tsx
- boundaries.test.ts
- LoginForm
- owner-chat.tsx
- desktop-sidebar.tsx
- operations-triage-console.tsx
- No AI slop eval
- officer-day.tsx
- plot-geo.test.ts
- client-directory.tsx
- attendance-geo.ts
- No AI Slop — Human Writing & Anti-Slop Guidelines
- farm-demarcation-map.tsx
- getSession
- design-guard.test.ts
- LngLat
- middleware.ts
- agronomy-chat.tsx
- requireSession
- hq/system/page.tsx
- icons.tsx
- AdminConsole
- Local Development & Setup Guide
- owner/farms/page.tsx
- walk-sync.test.ts
- prisma
- agronomist-console.tsx
- audit
- officer-chat.tsx
- owner/people/page.tsx
- estates/index.ts
- currentActor
- 20260910170000_boundary_versions/migration.sql
- cn
- command-palette.tsx
- business.test.ts
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- crops/page.tsx
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
- operations-calendar.tsx
- farm-registry.tsx

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 235 edges
2. `currentActor()` - 190 edges
3. `prisma` - 163 edges
4. `requireFarmAccess()` - 147 edges
5. `audit()` - 121 edges
6. `Icons` - 110 edges
7. `requireRole()` - 107 edges
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

## Communities (147 total, 26 thin omitted)

### Community 0 - "formatDate"
Cohesion: 0.07
Nodes (36): RFC-4180, Farm, MobileCrewMuster(), MusterRecord, WorkforceAttendanceConsole(), AuditConsole(), Expense, Farm (+28 more)

### Community 1 - "updateTask.ts"
Cohesion: 0.21
Nodes (15): Db, updateTask(), assertOfficerStatusPermitted(), assertOfficerTransitionAllowed(), canTransitionTask(), OFFICER_REQUESTABLE_STATUSES, TASK_TRANSITIONS, assertNotCompletion() (+7 more)

### Community 2 - "apiError"
Cohesion: 0.11
Nodes (33): GET(), GET(), GET(), GET(), GET(), GET(), musterSchema, POST() (+25 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.04
Nodes (53): Bundle, Client360(), FarmItem, formatPhone(), GeoMap, initials(), TeamMember, HqFarm360() (+45 more)

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

### Community 10 - "navbar.tsx"
Cohesion: 0.06
Nodes (42): AttendancePage(), dynamic, dynamic, HqAgronomistsPage(), dynamic, HqAnalyticsPage(), dynamic, EditClientPage() (+34 more)

### Community 11 - "onboarding-schema.ts"
Cohesion: 0.06
Nodes (60): dynamic, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard(), hydrate(), loadLocal() (+52 more)

### Community 12 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, db:seed, dev, lint, migrate (+5 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "tasks-ledger.tsx"
Cohesion: 0.05
Nodes (42): AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES, HqTask, HqTasksLedger() (+34 more)

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

### Community 19 - "http.ts"
Cohesion: 0.05
Nodes (60): dynamic, GET(), GET(), PATCH(), updateClientSchema, GET(), PATCH(), updateStageSchema (+52 more)

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
Nodes (26): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), createSchema (+18 more)

### Community 24 - "useToast"
Cohesion: 0.04
Nodes (40): ToastContext, ToastContextType, ToastMessage, ToastType, useToast(), ActivateFarmButton(), ClientEditForm(), EditableClient (+32 more)

### Community 25 - "farm-hub-client.tsx"
Cohesion: 0.05
Nodes (34): Weather, WeatherCard(), Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, SETUP_STAGES (+26 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.10
Nodes (48): platformReadRoles, Actor, actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel (+40 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (23): dynamic, Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory() (+15 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.07
Nodes (52): DELETE(), GET(), PATCH(), dynamic, EditCropCyclePage(), CropCycleDetailPage(), dynamic, NewCropCyclePage() (+44 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.22
Nodes (17): ChatAttachment, ChatMessage, ChatRef, enqueueOutbox(), loadOutbox(), markOutboxStatus(), newClientMessageId(), OutboxItem (+9 more)

### Community 33 - "spatial/index.ts"
Cohesion: 0.15
Nodes (27): distanceMeters(), pathPerimeterM(), AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS, assessTrack(), CleanedTrack, cleanSamples() (+19 more)

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
Cohesion: 0.11
Nodes (37): GET(), Db, endAttendance(), Db, getTodayShift(), Db, startAttendance(), assertEndAllowed() (+29 more)

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
Cohesion: 0.14
Nodes (26): GpsSample, BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList() (+18 more)

### Community 51 - "completeTask.ts"
Cohesion: 0.27
Nodes (12): completeTask(), Db, persistCompletion(), ADR-0006, Tx, assertActualsAllowed(), assertAssignee(), assertCompletableStatus() (+4 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.11
Nodes (40): OnboardingStepPlots(), normalizeToGeoJson(), parseBoundary(), ringAcres(), throwFirst(), ValidatedPlotGeometry, BBox, bboxOfRing() (+32 more)

### Community 64 - "operations/index.ts"
Cohesion: 0.18
Nodes (12): CompletableTask, OfficerEligibilityRow, UpdatableTask, CompletionInput, completionSchema, PlannedTaskInput, plannedTaskSchema, TaskListFilters (+4 more)

### Community 65 - "weekly-planner.tsx"
Cohesion: 0.06
Nodes (41): PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm, Officer (+33 more)

### Community 66 - "calendar-platform.tsx"
Cohesion: 0.13
Nodes (25): OfficerRow, HistoryItem, HistoryKind, addDays(), CalendarPayload, DayBucket, HqCalendarPlatform(), goToday() (+17 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "planTask.ts"
Cohesion: 0.26
Nodes (11): Db, persistPlannedTask(), planTask(), ADR-0006, Tx, assertCycleInScope(), assertFarmActive(), assertOfficerEligible() (+3 more)

### Community 70 - "crew/page.tsx"
Cohesion: 0.21
Nodes (8): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "downloadUrl"
Cohesion: 0.20
Nodes (17): canViewFarmMedia(), dynamic, GET(), GET(), GET(), ALLOWED_DIRECT_MIME, POST(), POST() (+9 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.11
Nodes (31): POST(), irrigationItem, POST(), schema, centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence() (+23 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "listTasks.ts"
Cohesion: 0.19
Nodes (11): Db, listTasks(), MediaIdentity, PresentedMedia, presentTaskMedia(), Db, findTasksPage(), TASK_LIST_INCLUDE (+3 more)

### Community 78 - "db.ts"
Cohesion: 0.08
Nodes (39): normalizePhone(), POST(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema, ShapedMessage (+31 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "boundaries.test.ts"
Cohesion: 0.17
Nodes (9): BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE, COMPONENT_PRISMA_GRANDFATHER, DELETED_PATHS, PURE_FILES, ROOT, SRC (+1 more)

### Community 81 - "LoginForm"
Cohesion: 0.83
Nodes (4): LoginForm(), performLogin(), quickLogin(), submit()

### Community 82 - "owner-chat.tsx"
Cohesion: 0.21
Nodes (10): CHAT_ROLES, Item, NotificationBell(), chatApi(), formatChatTime(), FarmOption, OwnerChat(), OwnerChatProps (+2 more)

### Community 83 - "desktop-sidebar.tsx"
Cohesion: 0.07
Nodes (22): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, ROLE_HOME_URLS, DesktopSidebar() (+14 more)

### Community 84 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "officer-day.tsx"
Cohesion: 0.06
Nodes (35): dynamic, PriorityBadge(), RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Skeleton(), Estate (+27 more)

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

### Community 92 - "farm-demarcation-map.tsx"
Cohesion: 0.18
Nodes (8): FarmDemarcationMap, FarmDemarcationMap, DemarcationFarm, DemarcationPlot, FarmDemarcationMap(), FarmDemarcationMapProps, PLOT_COLOR_PALETTE, toLeafletCoords()

### Community 93 - "getSession"
Cohesion: 0.12
Nodes (16): POST(), dynamic, GET(), passwordSchema, PUT(), PUT(), schema, dynamic (+8 more)

### Community 95 - "LngLat"
Cohesion: 0.12
Nodes (18): GET(), GET(), FARM_RING, PLOT_RING, secret, getPlotVisits(), PlotVisitData, LngLat (+10 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "agronomy-chat.tsx"
Cohesion: 0.36
Nodes (7): AgronomyChat(), daysInGround(), FarmDossier, FarmOption, humanize(), RosterPerson, seasonProgress()

### Community 98 - "requireSession"
Cohesion: 0.06
Nodes (31): ClientDetailPage(), dynamic, AgronomyChatPage(), dynamic, AgronomyPlanningPage(), dynamic, dynamic, HqProfilePage() (+23 more)

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.20
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), SystemAuditExplorer(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES (+2 more)

### Community 100 - "icons.tsx"
Cohesion: 0.07
Nodes (19): IconProps, Icons, getInitials(), ProfileMenu(), ThemeToggle(), Farm, FarmProfile, Farm (+11 more)

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "owner/farms/page.tsx"
Cohesion: 0.18
Nodes (11): dynamic, OwnerFarmsPage(), StepWizard(), StepWizardProps, WizardStep, FarmCreateWizard(), FarmCreateWizardProps, WIZARD_STEPS (+3 more)

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "prisma"
Cohesion: 0.07
Nodes (31): DELETE(), GET(), buildWhere(), bulkStatusSchema, ClientStats, emptyStats(), enrichPage(), formatRow() (+23 more)

### Community 106 - "agronomist-console.tsx"
Cohesion: 0.29
Nodes (5): ChatConversation, Agronomist, AgronomistConsole(), FarmChip, FarmOption

### Community 107 - "audit"
Cohesion: 0.10
Nodes (22): createClientSchema, POST(), POST(), onboardSchema, POST(), bulkSchema, POST(), PATCH() (+14 more)

### Community 108 - "officer-chat.tsx"
Cohesion: 0.33
Nodes (5): RefPlot, FarmOption, OfficerChat(), RosterConversation, RosterPerson

### Community 109 - "owner/people/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, OwnerPeoplePage(), Props, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (60): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), parseSort(), activateEstate() (+52 more)

### Community 111 - "currentActor"
Cohesion: 0.12
Nodes (29): GET(), dynamic, GET(), GET(), GET(), dynamic, GET(), num() (+21 more)

### Community 113 - "cn"
Cohesion: 0.52
Nodes (4): cn(), Label, labelVariants, Switch

### Community 114 - "command-palette.tsx"
Cohesion: 0.40
Nodes (4): CommandPalette(), CommandPaletteProps, SearchableItem, SearchResponse

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 131 - "crops/page.tsx"
Cohesion: 0.19
Nodes (13): dynamic, OwnerCropsPage(), CropCycleTargetPlot, CropCycleWizard(), CropCycleWizardProps, offsetIsoDate(), WIZARD_STEPS, MilestoneItem (+5 more)

### Community 132 - "hasPermission"
Cohesion: 0.09
Nodes (21): dynamic, HqClientDetailPage(), dynamic, HqClientsPage(), dynamic, EditFarmPage(), dynamic, HqFarmDetailPage() (+13 more)

### Community 134 - "app/farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.83
Nodes (3): checkPort(), main(), startWslDatabase()

### Community 183 - "operations-calendar.tsx"
Cohesion: 0.27
Nodes (8): CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption, OperationsCalendar(), OperationsCalendarProps, OwnerOperationsViewProps

### Community 185 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

## Knowledge Gaps
- **769 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+764 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `formatDate`, `crops/page.tsx`, `hasPermission`, `geo-map.tsx`, `navbar.tsx`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `useToast`, `farm-hub-client.tsx`, `tasks-queue.tsx`, `cropping/index.ts`, `chat-thread.tsx`, `boundary-walk.tsx`, `operations-calendar.tsx`, `farm-registry.tsx`, `geo-core.ts`, `weekly-planner.tsx`, `crew/page.tsx`, `incidents-command.tsx`, `owner-chat.tsx`, `desktop-sidebar.tsx`, `operations-triage-console.tsx`, `officer-day.tsx`, `client-directory.tsx`, `farm-demarcation-map.tsx`, `agronomy-chat.tsx`, `owner/farms/page.tsx`, `agronomist-console.tsx`, `officer-chat.tsx`, `owner/people/page.tsx`, `command-palette.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma` to `updateTask.ts`, `apiError`, `crops/page.tsx`, `hasPermission`, `app/farms/new/page.tsx`, `plots/index.ts`, `navbar.tsx`, `onboarding-schema.ts`, `http.ts`, `adversarial.test.ts`, `auth/index.ts`, `cropping/index.ts`, `endAttendance.ts`, `completeTask.ts`, `planTask.ts`, `crew/page.tsx`, `downloadUrl`, `parseBoundaryToRing`, `listTasks.ts`, `db.ts`, `desktop-sidebar.tsx`, `plot-geo.test.ts`, `getSession`, `LngLat`, `requireSession`, `hq/system/page.tsx`, `owner/farms/page.tsx`, `walk-sync.test.ts`, `audit`, `owner/people/page.tsx`, `estates/index.ts`, `currentActor`, `business.test.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `requireSession` to `hq/system/page.tsx`, `hasPermission`, `crops/page.tsx`, `app/farms/new/page.tsx`, `owner/farms/page.tsx`, `crew/page.tsx`, `navbar.tsx`, `onboarding-schema.ts`, `owner/people/page.tsx`, `estates/index.ts`, `getSession`, `officer-day.tsx`, `auth/index.ts`, `tasks-queue.tsx`, `cropping/index.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _769 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatDate` be split into smaller, more focused modules?**
  _Cohesion score 0.06823529411764706 - nodes in this community are weakly interconnected._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.11058823529411765 - nodes in this community are weakly interconnected._
- **Should `geo-map.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.043243243243243246 - nodes in this community are weakly interconnected._