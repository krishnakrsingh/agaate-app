# Graph Report - agaateapp  (2026-09-19)

## Corpus Check
- 516 files · ~380,987 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2629 nodes · 7512 edges · 153 communities (126 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70c20841`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toast.tsx
- operations/index.ts
- paginationParams
- useToast
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
- accessibleFarmWhere
- examples/README.md
- Email Validation Function
- Ponytail Help
- adversarial.test.ts
- icons.tsx
- people-directory.tsx
- Debounce Search Input
- auth/index.ts
- tasks-queue.tsx
- cropping/index.ts
- graphify reference: query, path, explain
- csv-sum.md
- chat-thread.tsx
- Engineering Report: MySQL vs PostgreSQL for Agaate
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
- officer-day.tsx
- calendar-platform.tsx
- 20260830181349_init_mysql/migration.sql
- requireSession
- crew/page.tsx
- No AI slop
- requireFarmAccess
- parseBoundaryToRing
- client-farms-map.tsx
- hq/incidents/route.ts
- chat-phase1.test.ts
- incidents-command.tsx
- geo-map.tsx
- security/index.ts
- session.ts
- navbar.tsx
- operations-triage-console.tsx
- No AI slop eval
- badge.tsx
- plot-geo.test.ts
- client-directory.tsx
- attendance-geo.ts
- No AI Slop — Human Writing & Anti-Slop Guidelines
- getSession
- login/page.tsx
- design-guard.test.ts
- spatial/index.ts
- middleware.ts
- ringAcres
- reports/page.tsx
- hq/system/page.tsx
- roles/route.ts
- AdminConsole
- Local Development & Setup Guide
- daily/page.tsx
- walk-sync.test.ts
- hq/clients/route.ts
- plot-demarcate-wizard.tsx
- apiError
- [cycleId]/edit/page.tsx
- farm-demarcation-map.tsx
- estates/index.ts
- db.ts
- 20260910170000_boundary_versions/migration.sql
- operations-calendar.tsx
- owner/people/page.tsx
- onboarding-workspace.tsx
- eslint
- @radix-ui/react-label
- geo-write-paths.test.ts
- layout.tsx
- react-dom
- components.json
- owner/farms/page.tsx
- sendNotification
- crops/page.tsx
- hasPermission
- crop-cycle-form.tsx
- app/farms/new/page.tsx
- client-edit-form.tsx
- reverse/route.ts
- farm-edit-page-form.tsx
- owner/operations/page.tsx
- task-map-card.tsx
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

## Communities (153 total, 27 thin omitted)

### Community 0 - "toast.tsx"
Cohesion: 0.07
Nodes (36): RFC-4180, ToastContext, ToastContextType, ToastMessage, ToastType, Farm, MobileCrewMuster(), MusterRecord (+28 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (61): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+53 more)

### Community 2 - "paginationParams"
Cohesion: 0.09
Nodes (30): GET(), GET(), GET(), GET(), musterSchema, POST(), createSchema, GET() (+22 more)

### Community 3 - "useToast"
Cohesion: 0.04
Nodes (51): useToast(), Weather, WeatherCard(), ActivateFarmButton(), Farm360, Farm360Incident, Farm360Plot, Farm360Task (+43 more)

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
Cohesion: 0.06
Nodes (37): AttendancePage(), dynamic, dynamic, HqAnalyticsPage(), dynamic, EditClientPage(), AddClientFarmPage(), dynamic (+29 more)

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

### Community 19 - "accessibleFarmWhere"
Cohesion: 0.08
Nodes (34): GET(), DayBucket, dayKey(), dynamic, emptyTotals(), GET(), parseDay(), dynamic (+26 more)

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
Nodes (28): GET(), POST(), GET(), POST(), POST(), GET(), PATCH(), GET() (+20 more)

### Community 24 - "icons.tsx"
Cohesion: 0.05
Nodes (30): IconProps, Icons, getInitials(), ProfileMenu(), ThemeToggle(), cn(), Label, labelVariants (+22 more)

### Community 25 - "people-directory.tsx"
Cohesion: 0.08
Nodes (20): roleUsesFarmAccess(), InternalTeamConsole(), Tab, formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS (+12 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.17
Nodes (28): buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel, AccessScope, ALL_PERMISSIONS, ALL_ROLES (+20 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (22): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory(), Farm (+14 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.08
Nodes (50): DELETE(), GET(), PATCH(), BANNED_APP_DIRS, BANNED_COMPONENT_DIRS, BANNED_IN_PURE, COMPONENT_PRISMA_GRANDFATHER, DELETED_PATHS (+42 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "chat-thread.tsx"
Cohesion: 0.07
Nodes (50): CHAT_ROLES, Item, NotificationBell(), AgronomyChat(), daysInGround(), FarmDossier, FarmOption, humanize() (+42 more)

### Community 33 - "Engineering Report: MySQL vs PostgreSQL for Agaate"
Cohesion: 0.09
Nodes (22): 1. Executive Summary & Straight Truth, 2. Deep Codebase Audit of Agaate's Database Footprint, 3. Detailed Comparison: MySQL vs PostgreSQL for Agaate, 4. Addressing the Fear: Why Postgres Feels Scary vs The Reality, 5. Concrete Decision Matrix: What Should You Do?, 6. Step-by-Step PostgreSQL Migration Blueprint (Reference Card), 7. Summary Conclusion, A. Data Models & Relationships (27 Models, 15 Enums) (+14 more)

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
Cohesion: 0.09
Nodes (44): assessTrack(), CleanedTrack, cleanSamples(), closureGapM(), decideSample(), DropReason, finiteNum(), GpsSample (+36 more)

### Community 51 - "client-360.tsx"
Cohesion: 0.28
Nodes (7): Skeleton(), Bundle, Client360(), FarmItem, formatPhone(), initials(), TeamMember

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.11
Nodes (38): OnboardingStepPlots(), normalizeToGeoJson(), parseBoundary(), ringAcres(), throwFirst(), BBox, bboxOfRing(), clipPolygonToRect() (+30 more)

### Community 64 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): FARM_GEOJSON, FARM_RING, PLOT_RING, secret, selfie(), AttendanceForm(), basisText(), handleClockIn() (+1 more)

### Community 65 - "officer-day.tsx"
Cohesion: 0.06
Nodes (46): PhotoItem, PhotoUploadZone(), PhotoUploadZoneProps, uploadEvidencePhotos(), PrintableSpraySheet(), PrintableTask, Farm, Officer (+38 more)

### Community 66 - "calendar-platform.tsx"
Cohesion: 0.13
Nodes (25): OfficerRow, HistoryItem, HistoryKind, addDays(), CalendarPayload, DayBucket, HqCalendarPlatform(), goToday() (+17 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.11
Nodes (40): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+32 more)

### Community 69 - "requireSession"
Cohesion: 0.08
Nodes (23): ClientDetailPage(), dynamic, AgronomyChatPage(), dynamic, AgronomyPlanningPage(), dynamic, dynamic, HqProfilePage() (+15 more)

### Community 70 - "crew/page.tsx"
Cohesion: 0.14
Nodes (13): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), CATEGORIES, Farm (+5 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "requireFarmAccess"
Cohesion: 0.11
Nodes (31): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), runtime, dynamic, GET() (+23 more)

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.11
Nodes (31): POST(), irrigationItem, POST(), schema, centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence() (+23 more)

### Community 76 - "client-farms-map.tsx"
Cohesion: 0.29
Nodes (4): buildClusters(), ClientFarmsMap(), ClientMapPin, Cluster

### Community 77 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 78 - "chat-phase1.test.ts"
Cohesion: 0.09
Nodes (26): GET(), GET(), DELETE(), ENTITY_TYPES, GET(), POST(), sendSchema, ShapedMessage (+18 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "geo-map.tsx"
Cohesion: 0.11
Nodes (18): GeoMap, GeoMap, GeoMap, GeoMap, GeoMap, GeoMap, GeoMap, BaseLayer (+10 more)

### Community 81 - "security/index.ts"
Cohesion: 0.24
Nodes (11): normalizePhone(), POST(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore, resetRateLimit(), throttle() (+3 more)

### Community 82 - "session.ts"
Cohesion: 0.18
Nodes (15): platformReadRoles, Actor, actorHasPermission(), loadActiveUser(), LEGACY_ROLES, requireSecret(), secret, signSessionToken() (+7 more)

### Community 83 - "navbar.tsx"
Cohesion: 0.08
Nodes (23): AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps, CommandPalette(), CommandPaletteProps (+15 more)

### Community 84 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "badge.tsx"
Cohesion: 0.04
Nodes (49): PriorityBadge(), RoleBadge(), StatusBadge(), EmptyState(), CardSkeleton(), Estate, RosterItem, Summary (+41 more)

### Community 87 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 88 - "client-directory.tsx"
Cohesion: 0.16
Nodes (15): ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS (+7 more)

### Community 89 - "attendance-geo.ts"
Cohesion: 0.11
Nodes (19): attendanceDisplayVerdict(), AttendanceLocationErr, AttendanceLocationOk, AttendanceLocationResult, FarmGeoInput, GeofenceBasis, MAX_GPS_ACCURACY_METERS, num() (+11 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 92 - "getSession"
Cohesion: 0.19
Nodes (10): dynamic, GET(), passwordSchema, PUT(), PUT(), schema, ROLE_LABELS, loadUserForSession() (+2 more)

### Community 93 - "login/page.tsx"
Cohesion: 0.19
Nodes (11): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), LoginForm() (+3 more)

### Community 95 - "spatial/index.ts"
Cohesion: 0.10
Nodes (26): GET(), GET(), FARM_RING, PLOT_RING, secret, ValidatedPlotGeometry, getPlotVisits(), PlotVisitData (+18 more)

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "ringAcres"
Cohesion: 0.15
Nodes (10): OnboardingStepFarms(), GeoMap, INDIA_CENTER, options, Plot, PlotEditForm(), save(), ringAcresSafe() (+2 more)

### Community 98 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.20
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), SystemAuditExplorer(), DataQualityCounts, METRICS, SystemDataQuality(), POLICIES (+2 more)

### Community 100 - "roles/route.ts"
Cohesion: 0.22
Nodes (8): secret, createSchema, GET(), POST(), secret, normalizePermissions(), slugifyRoleName(), testSessionContext

### Community 102 - "Local Development & Setup Guide"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Environment Configuration, 3. Database Setup, 4. Dependencies & Schema Synchronization, 5. Starting the Application, 6. Preconfigured Test Accounts, 7. Troubleshooting, Issue 1: `Can't reach database server at localhost:3306` (+6 more)

### Community 103 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 104 - "walk-sync.test.ts"
Cohesion: 0.32
Nodes (5): FARM_RING, mLat(), mLng(), secret, squareWalk()

### Community 105 - "hq/clients/route.ts"
Cohesion: 0.36
Nodes (8): buildWhere(), bulkStatusSchema, ClientStats, emptyStats(), enrichPage(), formatRow(), GET(), SortKey

### Community 106 - "plot-demarcate-wizard.tsx"
Cohesion: 0.21
Nodes (10): StepWizard(), StepWizardProps, WizardStep, FarmCreateWizard(), FarmCreateWizardProps, WIZARD_STEPS, DemarcationTargetFarm, GeoMap (+2 more)

### Community 107 - "apiError"
Cohesion: 0.09
Nodes (63): GET(), GET(), PATCH(), updateClientSchema, createClientSchema, GET(), POST(), GET() (+55 more)

### Community 108 - "[cycleId]/edit/page.tsx"
Cohesion: 0.28
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 109 - "farm-demarcation-map.tsx"
Cohesion: 0.20
Nodes (7): FarmDemarcationMap, DemarcationFarm, DemarcationPlot, FarmDemarcationMap(), FarmDemarcationMapProps, PLOT_COLOR_PALETTE, toLeafletCoords()

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (58): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), activateEstate(), createEstate() (+50 more)

### Community 111 - "db.ts"
Cohesion: 0.11
Nodes (20): dynamic, dynamic, GET(), schema, dynamic, GET(), num(), dynamic (+12 more)

### Community 113 - "operations-calendar.tsx"
Cohesion: 0.27
Nodes (8): CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption, OperationsCalendar(), OperationsCalendarProps, OwnerOperationsViewProps

### Community 114 - "owner/people/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, OwnerPeoplePage(), Props, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 115 - "onboarding-workspace.tsx"
Cohesion: 0.25
Nodes (4): OnboardingWorkspace(), PipelineFarm, STAGE_META, StageCounts

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "owner/farms/page.tsx"
Cohesion: 0.38
Nodes (5): dynamic, OwnerFarmsPage(), OwnerFarmData, OwnerFarmsView(), OwnerFarmsViewProps

### Community 130 - "sendNotification"
Cohesion: 0.60
Nodes (3): NotificationPayload, NotificationType, sendNotification()

### Community 131 - "crops/page.tsx"
Cohesion: 0.18
Nodes (14): dynamic, OwnerCropsPage(), CropCycleTargetPlot, CropCycleWizard(), CropCycleWizardProps, offsetIsoDate(), WIZARD_STEPS, FarmDemarcationMap (+6 more)

### Community 132 - "hasPermission"
Cohesion: 0.08
Nodes (23): dynamic, HqAgronomistsPage(), dynamic, HqClientDetailPage(), dynamic, HqClientsPage(), dynamic, EditFarmPage() (+15 more)

### Community 133 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 134 - "app/farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 135 - "client-edit-form.tsx"
Cohesion: 0.33
Nodes (3): ClientEditForm(), EditableClient, ENTITY_TYPES

### Community 138 - "owner/operations/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerOperationsPage(), Props, OwnerOperationsView()

### Community 139 - "task-map-card.tsx"
Cohesion: 0.50
Nodes (4): GeoMap, pinColor(), TaskMapCard(), TaskPin

### Community 140 - "validation.ts"
Cohesion: 0.50
Nodes (3): dateStr, lat, lng

### Community 172 - "ensure-db.mjs"
Cohesion: 0.60
Nodes (4): checkPort(), isPostgres, main(), startWslDatabase()

## Knowledge Gaps
- **793 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+788 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `toast.tsx`, `owner/farms/page.tsx`, `useToast`, `hasPermission`, `crop-cycle-form.tsx`, `crops/page.tsx`, `client-edit-form.tsx`, `farm-edit-page-form.tsx`, `Navbar`, `onboarding-schema.ts`, `tasks-ledger.tsx`, `people-directory.tsx`, `tasks-queue.tsx`, `chat-thread.tsx`, `boundary-walk.tsx`, `client-360.tsx`, `geo-core.ts`, `officer-day.tsx`, `crew/page.tsx`, `incidents-command.tsx`, `navbar.tsx`, `operations-triage-console.tsx`, `badge.tsx`, `client-directory.tsx`, `ringAcres`, `plot-demarcate-wizard.tsx`, `[cycleId]/edit/page.tsx`, `farm-demarcation-map.tsx`, `operations-calendar.tsx`, `owner/people/page.tsx`, `onboarding-workspace.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `owner/farms/page.tsx`, `paginationParams`, `crops/page.tsx`, `hasPermission`, `operations/index.ts`, `app/farms/new/page.tsx`, `plots/index.ts`, `Navbar`, `owner/operations/page.tsx`, `accessibleFarmWhere`, `adversarial.test.ts`, `auth/index.ts`, `cropping/index.ts`, `endAttendance.ts`, `attendance-geo-route.test.ts`, `requireSession`, `crew/page.tsx`, `requireFarmAccess`, `parseBoundaryToRing`, `hq/incidents/route.ts`, `chat-phase1.test.ts`, `security/index.ts`, `session.ts`, `plot-geo.test.ts`, `getSession`, `login/page.tsx`, `spatial/index.ts`, `hq/system/page.tsx`, `roles/route.ts`, `walk-sync.test.ts`, `hq/clients/route.ts`, `apiError`, `estates/index.ts`, `owner/people/page.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `apiError()` connect `apiError` to `paginationParams`, `roles/route.ts`, `plots/index.ts`, `hq/clients/route.ts`, `requireFarmAccess`, `parseBoundaryToRing`, `hq/incidents/route.ts`, `chat-phase1.test.ts`, `db.ts`, `estates/index.ts`, `security/index.ts`, `accessibleFarmWhere`, `adversarial.test.ts`, `cropping/index.ts`, `spatial/index.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _793 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toast.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06295715778474399 - nodes in this community are weakly interconnected._
- **Should `paginationParams` be split into smaller, more focused modules?**
  _Cohesion score 0.09371980676328502 - nodes in this community are weakly interconnected._