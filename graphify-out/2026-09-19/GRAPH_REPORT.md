# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 511 files · ~377,498 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2586 nodes · 7445 edges · 148 communities (122 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e28d20a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useToast
- operations/index.ts
- apiError
- geo-map.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- plots/index.ts
- dependencies
- devDependencies
- requireSession
- onboarding-schema.ts
- scripts
- Rate Limiting in FastAPI
- tasks-ledger.tsx
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- accessibleFarmWhere
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- toast.tsx
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
- weekly-planner.tsx
- calendar-platform.tsx
- 20260830181349_init_mysql/migration.sql
- navbar.tsx
- crew/page.tsx
- No AI slop
- downloadUrl
- parseBoundaryToRing
- client-farms-map.tsx
- hq/incidents/route.ts
- security/index.ts
- incidents-command.tsx
- boundaries.test.ts
- hq/tasks/route.ts
- owner-chat.tsx
- desktop-sidebar.tsx
- operations-triage-console.tsx
- No AI slop eval
- farm-command-center.tsx
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
- reports/page.tsx
- hq/system/page.tsx
- icons.tsx
- AdminConsole
- Local Development & Setup Guide
- owner/farms/page.tsx
- walk-sync.test.ts
- currentActor
- officer-chat.tsx
- audit
- [cycleId]/edit/page.tsx
- owner/people/page.tsx
- estates/index.ts
- prisma
- 20260910170000_boundary_versions/migration.sql
- farm-registry.tsx
- onboarding-workspace.tsx
- crop-cycle-form.tsx
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- notification-bell.tsx
- app/operations/page.tsx
- crops/page.tsx
- hasPermission
- FarmForm
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
- owner/operations/page.tsx

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
- `HqProfilePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(control)/hq/profile/page.tsx → src/modules/auth/infrastructure/session.ts
- `OfficerChatPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(field)/officer/chat/page.tsx → src/modules/auth/infrastructure/session.ts
- `OfficerDayPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(field)/officer/day/page.tsx → src/modules/auth/infrastructure/session.ts
- `OfficerReportsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/(field)/officer/reports/page.tsx → src/modules/auth/infrastructure/session.ts
- `GET()` --indirect_call--> `serializeBoundaryVersion()`  [INFERRED]
  src/app/api/farms/[farmId]/boundary-versions/route.ts → src/modules/spatial/application/geo-versions.ts

## Import Cycles
- None detected.

## Communities (148 total, 26 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.07
Nodes (35): RFC-4180, useToast(), Farm, MobileCrewMuster(), MusterRecord, FarmSettingsConsole(), FarmSettingsData, Expense (+27 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (63): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+55 more)

### Community 2 - "apiError"
Cohesion: 0.10
Nodes (42): GET(), GET(), GET(), GET(), musterSchema, POST(), createSchema, GET() (+34 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.04
Nodes (54): Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, HqFarm360(), saveBoundary(), SETUP_STAGES (+46 more)

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

### Community 10 - "requireSession"
Cohesion: 0.06
Nodes (40): AttendancePage(), dynamic, ClientDetailPage(), dynamic, AgronomyChatPage(), dynamic, dynamic, HqAnalyticsPage() (+32 more)

### Community 11 - "onboarding-schema.ts"
Cohesion: 0.05
Nodes (65): dynamic, HqOnboardingNewPage(), Props, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard() (+57 more)

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

### Community 19 - "accessibleFarmWhere"
Cohesion: 0.10
Nodes (26): GET(), DayBucket, dayKey(), dynamic, emptyTotals(), GET(), parseDay(), dynamic (+18 more)

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
Cohesion: 0.07
Nodes (35): PATCH(), GET(), POST(), POST(), POST(), GET(), POST(), secret (+27 more)

### Community 24 - "toast.tsx"
Cohesion: 0.07
Nodes (23): StepWizard(), StepWizardProps, WizardStep, ToastContext, ToastContextType, ToastMessage, ToastType, CropCycleWizard() (+15 more)

### Community 25 - "farm-hub-client.tsx"
Cohesion: 0.05
Nodes (24): Weather, WeatherCard(), ActivateFarmButton(), AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm() (+16 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.10
Nodes (48): platformReadRoles, Actor, actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel (+40 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (21): dynamic, ServerTable(), ServerListState, useServerList(), Client, ClientsDirectory(), Farm, FarmsDirectory() (+13 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.11
Nodes (38): DELETE(), GET(), PATCH(), CropCycleDetailPage(), createCropCycle(), deleteCropCycle(), getCropCycleDetail(), getCropCycleDetailPageData() (+30 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.23
Nodes (16): ChatAttachment, ChatMessage, ChatRef, enqueueOutbox(), loadOutbox(), markOutboxStatus(), OutboxItem, outboxKey() (+8 more)

### Community 33 - "spatial/index.ts"
Cohesion: 0.19
Nodes (23): distanceMeters(), pathPerimeterM(), AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), assessTrack(), CleanedTrack, cleanSamples(), closureGapM() (+15 more)

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
Nodes (36): Db, endAttendance(), Db, getTodayShift(), Db, startAttendance(), assertEndAllowed(), assertStartAllowed() (+28 more)

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

### Community 51 - "client-360.tsx"
Cohesion: 0.24
Nodes (8): Skeleton(), Bundle, Client360(), FarmItem, formatPhone(), GeoMap, initials(), TeamMember

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.11
Nodes (42): irrigationItem, POST(), schema, normalizeToGeoJson(), ringAcres(), throwFirst(), BBox, bboxOfRing() (+34 more)

### Community 64 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 65 - "weekly-planner.tsx"
Cohesion: 0.06
Nodes (42): PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm, Officer (+34 more)

### Community 66 - "calendar-platform.tsx"
Cohesion: 0.13
Nodes (25): OfficerRow, HistoryItem, HistoryKind, addDays(), CalendarPayload, DayBucket, HqCalendarPlatform(), goToday() (+17 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "navbar.tsx"
Cohesion: 0.06
Nodes (34): AgronomyPlanningPage(), dynamic, dynamic, HqProfilePage(), dynamic, OwnerChatPage(), dynamic, FarmsPage() (+26 more)

### Community 70 - "crew/page.tsx"
Cohesion: 0.14
Nodes (13): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), CATEGORIES, Farm (+5 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "downloadUrl"
Cohesion: 0.21
Nodes (10): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), PATCH(), schema, GET() (+2 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.11
Nodes (27): POST(), centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema (+19 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 78 - "security/index.ts"
Cohesion: 0.08
Nodes (38): normalizePhone(), POST(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema, ShapedMessage (+30 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "boundaries.test.ts"
Cohesion: 0.16
Nodes (17): BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE, COMPONENT_PRISMA_GRANDFATHER, DELETED_PATHS, PURE_FILES, ROOT, SRC (+9 more)

### Community 81 - "hq/tasks/route.ts"
Cohesion: 0.31
Nodes (8): asIso(), asNum(), escapeLike(), GET(), LedgerDbRow, PRIORITIES, SORTS, TASK_STATUSES

### Community 82 - "owner-chat.tsx"
Cohesion: 0.28
Nodes (8): RefPlot, displayName(), FarmOption, OwnerChat(), OwnerChatProps, roleLabel(), RosterConversation, RosterPerson

### Community 83 - "desktop-sidebar.tsx"
Cohesion: 0.13
Nodes (13): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, ROLE_HOME_URLS, DesktopSidebar() (+5 more)

### Community 84 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "farm-command-center.tsx"
Cohesion: 0.05
Nodes (46): dynamic, Column, ServerTableProps, PriorityBadge(), RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton() (+38 more)

### Community 87 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 88 - "client-directory.tsx"
Cohesion: 0.13
Nodes (17): dynamic, HqClientsPage(), ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime() (+9 more)

### Community 89 - "attendance-geo.ts"
Cohesion: 0.12
Nodes (16): attendanceDisplayVerdict(), AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, FarmGeoInput, GeofenceBasis, MAX_GPS_ACCURACY_METERS, num() (+8 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "farm-demarcation-map.tsx"
Cohesion: 0.20
Nodes (7): FarmDemarcationMap, DemarcationFarm, DemarcationPlot, FarmDemarcationMap(), FarmDemarcationMapProps, PLOT_COLOR_PALETTE, toLeafletCoords()

### Community 93 - "getSession"
Cohesion: 0.11
Nodes (19): POST(), dynamic, GET(), passwordSchema, PUT(), PUT(), schema, dynamic (+11 more)

### Community 95 - "LngLat"
Cohesion: 0.16
Nodes (15): GET(), ValidatedPlotGeometry, getPlotVisits(), PlotVisitData, LngLat, fences, visits, computePlotVisits() (+7 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "agronomy-chat.tsx"
Cohesion: 0.33
Nodes (8): AgronomyChat(), daysInGround(), FarmDossier, FarmOption, humanize(), RosterPerson, seasonProgress(), newClientMessageId()

### Community 98 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.20
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), SystemAuditExplorer(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES (+2 more)

### Community 100 - "icons.tsx"
Cohesion: 0.05
Nodes (30): IconProps, Icons, getInitials(), ProfileMenu(), ThemeToggle(), cn(), Label, labelVariants (+22 more)

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "owner/farms/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, OwnerFarmsPage(), FarmCreateWizard(), OwnerFarmData, OwnerFarmsView(), OwnerFarmsViewProps

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "currentActor"
Cohesion: 0.10
Nodes (33): GET(), GET(), DELETE(), GET(), buildWhere(), bulkStatusSchema, ClientStats, emptyStats() (+25 more)

### Community 106 - "officer-chat.tsx"
Cohesion: 0.19
Nodes (10): chatApi(), ChatConversation, FarmOption, OfficerChat(), RosterConversation, RosterPerson, Agronomist, AgronomistConsole() (+2 more)

### Community 107 - "audit"
Cohesion: 0.08
Nodes (34): GET(), PATCH(), updateClientSchema, createClientSchema, GET(), POST(), POST(), onboardSchema (+26 more)

### Community 108 - "[cycleId]/edit/page.tsx"
Cohesion: 0.27
Nodes (6): dynamic, EditCropCyclePage(), getEditCropCyclePageData(), CropCycleEditForm(), Cycle, dateVal()

### Community 109 - "owner/people/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, OwnerPeoplePage(), Props, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (58): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), activateEstate(), createEstate() (+50 more)

### Community 111 - "prisma"
Cohesion: 0.11
Nodes (22): dynamic, GET(), GET(), dynamic, GET(), GET(), dynamic, GET() (+14 more)

### Community 113 - "farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 114 - "onboarding-workspace.tsx"
Cohesion: 0.25
Nodes (4): OnboardingWorkspace(), PipelineFarm, STAGE_META, StageCounts

### Community 115 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "notification-bell.tsx"
Cohesion: 0.50
Nodes (4): CHAT_ROLES, Item, NotificationBell(), formatChatTime()

### Community 130 - "app/operations/page.tsx"
Cohesion: 0.40
Nodes (4): DashboardPage(), dynamic, dynamic, OperationsPage()

### Community 131 - "crops/page.tsx"
Cohesion: 0.23
Nodes (10): dynamic, OwnerCropsPage(), CropCycleTargetPlot, FarmDemarcationMap, MilestoneItem, OwnerCropsView(), OwnerCropsViewProps, PrescriptionItem (+2 more)

### Community 132 - "hasPermission"
Cohesion: 0.10
Nodes (18): dynamic, HqAgronomistsPage(), dynamic, HqClientDetailPage(), dynamic, EditFarmPage(), dynamic, HqFarmDetailPage() (+10 more)

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.83
Nodes (3): checkPort(), main(), startWslDatabase()

### Community 183 - "owner/operations/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, OwnerOperationsPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+4 more)

## Knowledge Gaps
- **769 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+764 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `notification-bell.tsx`, `crops/page.tsx`, `hasPermission`, `geo-map.tsx`, `requireSession`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `toast.tsx`, `farm-hub-client.tsx`, `tasks-queue.tsx`, `chat-thread.tsx`, `boundary-walk.tsx`, `client-360.tsx`, `owner/operations/page.tsx`, `weekly-planner.tsx`, `navbar.tsx`, `crew/page.tsx`, `incidents-command.tsx`, `owner-chat.tsx`, `desktop-sidebar.tsx`, `operations-triage-console.tsx`, `farm-command-center.tsx`, `client-directory.tsx`, `farm-demarcation-map.tsx`, `agronomy-chat.tsx`, `owner/farms/page.tsx`, `officer-chat.tsx`, `[cycleId]/edit/page.tsx`, `owner/people/page.tsx`, `farm-registry.tsx`, `onboarding-workspace.tsx`, `crop-cycle-form.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma` to `operations/index.ts`, `apiError`, `crops/page.tsx`, `hasPermission`, `app/operations/page.tsx`, `plots/index.ts`, `requireSession`, `onboarding-schema.ts`, `accessibleFarmWhere`, `adversarial.test.ts`, `auth/index.ts`, `cropping/index.ts`, `endAttendance.ts`, `owner/operations/page.tsx`, `geo-core.ts`, `attendance-geo-route.test.ts`, `navbar.tsx`, `crew/page.tsx`, `downloadUrl`, `parseBoundaryToRing`, `hq/incidents/route.ts`, `security/index.ts`, `hq/tasks/route.ts`, `plot-geo.test.ts`, `getSession`, `LngLat`, `hq/system/page.tsx`, `owner/farms/page.tsx`, `walk-sync.test.ts`, `currentActor`, `audit`, `owner/people/page.tsx`, `estates/index.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `requireSession` to `app/operations/page.tsx`, `crops/page.tsx`, `hasPermission`, `onboarding-schema.ts`, `auth/index.ts`, `tasks-queue.tsx`, `cropping/index.ts`, `owner/operations/page.tsx`, `navbar.tsx`, `crew/page.tsx`, `farm-command-center.tsx`, `client-directory.tsx`, `getSession`, `reports/page.tsx`, `hq/system/page.tsx`, `owner/farms/page.tsx`, `[cycleId]/edit/page.tsx`, `owner/people/page.tsx`, `estates/index.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _769 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.07390648567119155 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059841047218326324 - nodes in this community are weakly interconnected._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.09575012800819252 - nodes in this community are weakly interconnected._