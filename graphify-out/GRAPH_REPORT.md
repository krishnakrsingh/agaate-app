# Graph Report - agaateapp  (2026-09-18)

## Corpus Check
- 547 files · ~406,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2678 nodes · 7343 edges · 179 communities (129 shown, 50 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74f82735`
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
- spatial/index.ts
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
- geo-core.ts
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
- sync/route.ts
- client-360.tsx
- currentActor
- apiError
- incidents-command.tsx
- utcDateOnly
- login/page.tsx
- formatDateTime
- operations-triage-console.tsx
- No AI slop eval
- workforce-attendance-console.tsx
- owner/calendar/page.tsx
- client-directory.tsx
- officer-profile-view.tsx
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
- app/people/page.tsx
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
- plot-geo.test.ts
- components.json
- hq/incidents/route.ts
- cn
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
- @radix-ui/react-collapsible
- react
- zod
- @types/react-dom
- crop-cycles/new/page.tsx
- profile/edit/page.tsx
- security/page.tsx
- hq/settings/page.tsx

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

## Communities (179 total, 50 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.05
Nodes (57): RFC-4180, dynamic, HqAnalyticsPage(), dynamic, OwnerFinancialsPage(), ToastContext, ToastContextType, ToastMessage (+49 more)

### Community 1 - "operations/index.ts"
Cohesion: 0.06
Nodes (62): completeTask(), Db, persistCompletion(), ADR-0006, Tx, Db, listTasks(), Db (+54 more)

### Community 3 - "geo-map.tsx"
Cohesion: 0.04
Nodes (67): Farm360, Farm360Incident, Farm360Plot, Farm360Task, GeoMap, HqFarm360(), saveBoundary(), SETUP_STAGES (+59 more)

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
Nodes (49): DELETE(), GET(), PATCH(), GET(), POST(), dynamic, OwnerLandPage(), dynamic (+41 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, bcryptjs, class-variance-authority, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet, lucide-react (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test (+23 more)

### Community 10 - "Navbar"
Cohesion: 0.05
Nodes (44): AttendancePage(), dynamic, dynamic, EditClientPage(), AddClientFarmPage(), dynamic, dynamic, HqClientDetailPage() (+36 more)

### Community 11 - "onboarding-wizard.tsx"
Cohesion: 0.06
Nodes (59): dynamic, HqOnboardingNewPage(), Props, clearLocal(), emptyCrop(), emptyFarm(), emptyPlot(), emptyWizard() (+51 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, lint (+6 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "farm-hub-client.tsx"
Cohesion: 0.06
Nodes (23): Weather, WeatherCard(), ActivateFarmButton(), AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm() (+15 more)

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
Nodes (48): GET(), createClientSchema, GET(), POST(), GET(), PATCH(), GET(), GET() (+40 more)

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
Nodes (34): GET(), POST(), GET(), POST(), POST(), GET(), GET(), POST() (+26 more)

### Community 24 - "icons.tsx"
Cohesion: 0.04
Nodes (23): EditProfileForm(), EditProfileFormProps, dynamic, IconProps, Icons, getInitials(), ProfileMenu(), ThemeToggle() (+15 more)

### Community 25 - "desktop-sidebar.tsx"
Cohesion: 0.09
Nodes (23): dynamic, HqProfilePage(), AccountPopover(), getInitials(), getProfileHref(), UserInfo, BrandLogo(), BrandLogoProps (+15 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "auth/index.ts"
Cohesion: 0.15
Nodes (32): dynamic, EditFarmPage(), actorHasPermission(), buildActor(), parseRoleDefinition(), RoleDefinitionView, RoleDefRow, AccessLevelLabel (+24 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (22): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory(), Farm (+14 more)

### Community 29 - "cropping/index.ts"
Cohesion: 0.06
Nodes (56): DELETE(), GET(), PATCH(), dynamic, EditCropCyclePage(), CropCycleDetailPage(), dynamic, BANNED_APP_DIRS (+48 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "spatial/index.ts"
Cohesion: 0.08
Nodes (36): BoundaryWrite, CommittedVersion, NOTE: under the entity-row lock above, P2002 here is near-impossible;, SerializedBoundaryVersion, Tx, VersionProvenance, getPlotVisits(), PlotVisitData (+28 more)

### Community 33 - "db.ts"
Cohesion: 0.10
Nodes (17): dynamic, updateStageSchema, dynamic, dynamic, GET(), secret, asNum(), GET() (+9 more)

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
Cohesion: 0.08
Nodes (21): roleUsesFarmAccess(), InternalTeamConsole(), Tab, formatDate(), getInitials(), parseNameAndTitle(), PeopleDirectory(), SORT_LABELS (+13 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.21
Nodes (11): main(), prisma, backfillUserRoleDefinitions(), seedRoleDefinitions(), BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES (+3 more)

### Community 57 - "geo-core.ts"
Cohesion: 0.14
Nodes (36): irrigationItem, POST(), schema, normalizeToGeoJson(), ringAcres(), throwFirst(), ValidatedPlotGeometry, bboxOfRing() (+28 more)

### Community 64 - "tasks-ledger.tsx"
Cohesion: 0.09
Nodes (32): PriorityBadge(), StatusBadge(), AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES (+24 more)

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
Cohesion: 0.10
Nodes (16): dynamic, AgronomyRadarPage(), dynamic, dynamic, formatDate(), HqOnboardingListPage(), CommandPalette(), CommandPaletteProps (+8 more)

### Community 72 - "platform-map-console.tsx"
Cohesion: 0.09
Nodes (22): dropItem, dropStyle, floatInput, LAYERS, MissingFarm, overlayMsg, PlatformMapLeaflet, QaFlag (+14 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "sync/route.ts"
Cohesion: 0.13
Nodes (23): POST(), centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema (+15 more)

### Community 76 - "client-360.tsx"
Cohesion: 0.10
Nodes (18): ACTIVITY_ICON, ActivityEntry, buildActivity(), Bundle, Client360(), ClientFarmsMap, FarmItem, formatCoord() (+10 more)

### Community 77 - "currentActor"
Cohesion: 0.08
Nodes (41): GET(), PATCH(), updateClientSchema, POST(), bulkSchema, POST(), PATCH(), bulkSchema (+33 more)

### Community 78 - "apiError"
Cohesion: 0.10
Nodes (43): GET(), GET(), GET(), musterSchema, POST(), createSchema, GET(), POST() (+35 more)

### Community 79 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (17): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+9 more)

### Community 80 - "utcDateOnly"
Cohesion: 0.21
Nodes (11): GET(), GET(), GET(), officerTaskSchema, POST(), GET(), manualSchema, POST() (+3 more)

### Community 82 - "login/page.tsx"
Cohesion: 0.19
Nodes (11): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), LoginForm() (+3 more)

### Community 83 - "formatDateTime"
Cohesion: 0.43
Nodes (6): formatActionLabel(), OverviewActivity(), timeAgo(), formatNumber(), OverviewTriage(), formatDateTime()

### Community 84 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "workforce-attendance-console.tsx"
Cohesion: 0.05
Nodes (35): RoleBadge(), EmptyState(), CardSkeleton(), Skeleton(), Estate, RosterItem, Summary, WorkforceAttendanceConsole() (+27 more)

### Community 87 - "owner/calendar/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, OperationsCalendarPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+2 more)

### Community 88 - "client-directory.tsx"
Cohesion: 0.16
Nodes (15): ClientActionsMenu(), ClientMenuTarget, digitsOnly(), ClientDirectory(), ClientRow, fullTime(), paginationItems(), QUICK_VIEWS (+7 more)

### Community 89 - "officer-profile-view.tsx"
Cohesion: 0.32
Nodes (7): getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord, TaskRecord

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
Cohesion: 0.06
Nodes (31): ClientDetailPage(), dynamic, AgronomyPlanningPage(), dynamic, dynamic, HqCalendarPage(), PageSearch, dynamic (+23 more)

### Community 99 - "hq/system/page.tsx"
Cohesion: 0.14
Nodes (13): dynamic, HqSystemPage(), loadDataQuality(), dynamic, SystemPage(), AuditConsole(), SystemAuditExplorer(), DataQualityCounts (+5 more)

### Community 100 - "session.ts"
Cohesion: 0.18
Nodes (14): platformReadRoles, Actor, Session, LEGACY_ROLES, requireSecret(), secret, signSessionToken(), verifySessionToken() (+6 more)

### Community 101 - "app/people/page.tsx"
Cohesion: 0.18
Nodes (3): dynamic, PeoplePage(), AdminConsole()

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
Cohesion: 0.23
Nodes (8): dynamic, GET(), passwordSchema, PUT(), PUT(), schema, getSession(), readToken()

### Community 110 - "estates/index.ts"
Cohesion: 0.07
Nodes (54): DELETE(), GET(), POST(), GET(), dynamic, FarmDetailPage(), activateEstate(), Db (+46 more)

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

### Community 120 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 130 - "cn"
Cohesion: 0.52
Nodes (4): cn(), Label, labelVariants, Switch

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

### Community 142 - "roles/route.ts"
Cohesion: 0.29
Nodes (7): createSchema, GET(), POST(), secret, legacyRoleForDefinition(), slugifyRoleName(), loadRoleDefinitionForAssignment()

### Community 151 - "farm/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerFarmPage(), FarmProfile, MyFarmOverview()

### Community 152 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 154 - "security/index.ts"
Cohesion: 0.15
Nodes (16): onboardSchema, POST(), normalizePhone(), POST(), NotificationPayload, NotificationType, sendNotification(), acquireRateLimitSlot() (+8 more)

### Community 175 - "crop-cycles/new/page.tsx"
Cohesion: 0.67
Nodes (3): dynamic, NewCropCyclePage(), getNewCropCyclePageData()

## Knowledge Gaps
- **832 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+827 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `geo-map.tsx`, `Navbar`, `onboarding-wizard.tsx`, `farm-hub-client.tsx`, `farm/page.tsx`, `desktop-sidebar.tsx`, `tasks-queue.tsx`, `cropping/index.ts`, `boundary-walk.tsx`, `people-directory.tsx`, `tasks-ledger.tsx`, `officer-day.tsx`, `navbar.tsx`, `client-360.tsx`, `incidents-command.tsx`, `operations-triage-console.tsx`, `workforce-attendance-console.tsx`, `owner/calendar/page.tsx`, `client-directory.tsx`, `officer-profile-view.tsx`, `owner/dashboard/page.tsx`, `farm-registry.tsx`, `owner/people/page.tsx`, `crew/page.tsx`, `crop-cycle-form.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `useToast`, `hq/incidents/route.ts`, `operations/index.ts`, `plots/index.ts`, `Navbar`, `onboarding-wizard.tsx`, `attendance-geo-route.test.ts`, `overview-funnel.tsx`, `roles/route.ts`, `requireRole`, `adversarial.test.ts`, `farm/page.tsx`, `desktop-sidebar.tsx`, `security/index.ts`, `auth/index.ts`, `icons.tsx`, `cropping/index.ts`, `spatial/index.ts`, `endAttendance.ts`, `geo-core.ts`, `navbar.tsx`, `sync/route.ts`, `currentActor`, `apiError`, `utcDateOnly`, `login/page.tsx`, `formatDateTime`, `owner/calendar/page.tsx`, `owner/dashboard/page.tsx`, `requireSession`, `hq/system/page.tsx`, `session.ts`, `overview-alerts.tsx`, `walk-sync.test.ts`, `downloadUrl`, `getSession`, `estates/index.ts`, `owner/people/page.tsx`, `crew/page.tsx`, `plot-geo.test.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `tasks-ledger.tsx`, `officer-day.tsx`, `farm-registry.tsx`, `geo-map.tsx`, `attendance-geo-route.test.ts`, `onboarding-wizard.tsx`, `farm-hub-client.tsx`, `owner/people/page.tsx`, `crop-cycle-form.tsx`, `operations-triage-console.tsx`, `workforce-attendance-console.tsx`, `owner/calendar/page.tsx`, `icons.tsx`, `desktop-sidebar.tsx`, `client-directory.tsx`, `tasks-queue.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _832 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.0461357625624449 - nodes in this community are weakly interconnected._
- **Should `operations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06205311542390194 - nodes in this community are weakly interconnected._
- **Should `geo-map.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04144736842105263 - nodes in this community are weakly interconnected._