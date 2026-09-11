# Graph Report - agaateapp  (2026-09-11)

## Corpus Check
- 404 files · ~364,007 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2252 nodes · 5729 edges · 145 communities (119 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `79d9e920`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useToast
- farm-hub-client.tsx
- app/insights/page.tsx
- onboarding-wizard.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- 4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)
- dependencies
- devDependencies
- navbar.tsx
- Agaate Farm Management PWA — Design Brief
- scripts
- Rate Limiting in FastAPI
- 4. Feature Specifications
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- prisma.ts
- examples/README.md
- Email Validation Function
- Ponytail Help
- api-integration.test.ts
- track.ts
- accessibleFarmWhere
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- tasks-queue.tsx
- dashboard-client.tsx
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- business.ts
- ponytail-audit/SKILL.md
- Ponytail Gain
- ponytail-review/SKILL.md
- 3. Model Specifications
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
- currentActor
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed-scale.ts
- clients/page.tsx
- requireFarmAccess
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- officer/calendar/page.tsx
- officer-day.tsx
- history/route.ts
- 20260830181349_init_mysql/migration.sql
- apiError
- geo-core.ts
- No AI slop
- build-docs-html.mjs
- parseBoundaryToRing
- platform-map-console.tsx
- AdminConsole
- security.ts
- plot-edit-form.tsx
- auth.ts
- login-form.tsx
- validation.ts
- No AI slop eval
- badge.tsx
- parseBoundary
- Documentation Index
- requireSession
- No AI Slop — Human Writing & Anti-Slop Guidelines
- approvals/page.tsx
- operations-calendar.tsx
- design-guard.test.ts
- crop-cycle-edit-form.tsx
- middleware.ts
- owner/people/page.tsx
- profile/page.tsx
- LngLat
- attendance/page.tsx
- sync/route.ts
- plot-geo.test.ts
- geo-map.tsx
- boundary-history.tsx
- layout.tsx
- operations-triage-console.tsx
- crew/page.tsx
- onboarding-workspace.tsx
- crop-cycle-form.tsx
- people-directory.tsx
- tasks-ledger.tsx
- 20260910170000_boundary_versions/migration.sql
- audit/page.tsx
- users/page.tsx
- directory/page.tsx
- operations/tasks/page.tsx
- work/page.tsx
- geo-write-paths.test.ts
- hq/tasks/route.ts
- app/farms/page.tsx
- tsx
- reports/page.tsx
- farm/page.tsx
- icons.tsx
- incidents-command.tsx
- boundary-walk.tsx
- hq/system/page.tsx
- task-map-card.tsx
- extractRing
- hq/page.tsx
- client-360.tsx
- attendance-geo-route.test.ts
- hq/farm-registry.tsx
- hq/incidents/route.ts
- jose
- farms/new/page.tsx
- daily/page.tsx

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 200 edges
2. `currentActor()` - 158 edges
3. `prisma` - 142 edges
4. `requireFarmAccess()` - 129 edges
5. `requireSession()` - 113 edges
6. `requireRole()` - 101 edges
7. `audit()` - 101 edges
8. `Icons` - 95 edges
9. `useToast()` - 85 edges
10. `accessibleFarmWhere()` - 67 edges

## Surprising Connections (you probably didn't know these)
- `backfill()` --calls--> `ringAcres()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `toGeoJsonPolygon()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `parseBoundaryToRing()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `commitBoundary()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-versions.ts
- `GET()` --indirect_call--> `serializeBoundaryVersion()`  [INFERRED]
  src/app/api/farms/[farmId]/boundary-versions/route.ts → src/lib/geo-versions.ts

## Import Cycles
- None detected.

## Communities (145 total, 26 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.06
Nodes (47): RFC-4180, CropRadar(), DiagnosticsWorkbench(), AnalyticsConsole(), ClientOption, CycleRow, daysAgoIso(), FarmOption (+39 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.04
Nodes (38): ActivateFarmButton(), FarmSetupStageKey, SETUP_STAGES, AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm() (+30 more)

### Community 3 - "onboarding-wizard.tsx"
Cohesion: 0.07
Nodes (45): dynamic, HqOnboardingDraftPage(), clearLocal(), emptyFarm(), emptyWizard(), hydrate(), loadLocal(), saveLocal() (+37 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, es2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, src/**/*.ts (+19 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 6 - "Agaate Design System v1.0"
Cohesion: 0.17
Nodes (11): 1. Color Palette, 2. Typography, 3. Spacing, Radii, Borders, and Elevation, 4. Visual Language & Structural Rules, 5. Navigation & Layout, Agaate Design System v1.0, Border Radii, Borders (+3 more)

### Community 7 - "4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)"
Cohesion: 0.04
Nodes (45): 1. `/admin/estates` (Global Estates Directory), 1. `/agronomy/radar` (Multi-Estate Crop Telemetry), 1. Executive Summary & The Four Authorities, 1. `/officer/today` (High-Speed Operational Feed), 1. `/owner/dashboard` (Executive Orientation Cockpit), 2.1 Super Admin (Agaate Operations Directorate), 2.2 Farm Admin (The Client / Farm Owner), 2.3 Central Agronomist (Agaate Crop Specialist) (+37 more)

### Community 8 - "dependencies"
Cohesion: 0.09
Nodes (23): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, @geoman-io/leaflet-geoman-free, leaflet, next, dependencies, @aws-sdk/client-s3 (+15 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, @types/bcryptjs (+15 more)

### Community 10 - "navbar.tsx"
Cohesion: 0.09
Nodes (22): BrandLogo(), BrandLogoProps, DesktopSidebar(), DesktopSidebarProps, NavLinkItem, NavSection, CommandPalette(), CommandPaletteProps (+14 more)

### Community 11 - "Agaate Farm Management PWA — Design Brief"
Cohesion: 0.05
Nodes (42): 1.1 Core Principles, 1.2 Design Tone, 1. Design Philosophy, 2.1 Color Palette, 2.2 Typography, 2.3 Spacing System, 2. Brand Identity, 3.1 Shell Layout (+34 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, lint (+6 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "4. Feature Specifications"
Cohesion: 0.05
Nodes (39): 1. Executive Summary, 2. Platform Hierarchy, 3.1 Super Admin (Agaate), 3.2 Farm Admin, 3.3 Agronomist (Central Agaate Team), 3.4 Farm Officer, 3. User Roles & Permissions, 4. Feature Specifications (+31 more)

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

### Community 19 - "prisma.ts"
Cohesion: 0.09
Nodes (32): createClientSchema, POST(), POST(), bulkSchema, POST(), bulkSchema, POST(), DELETE() (+24 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "api-integration.test.ts"
Cohesion: 0.07
Nodes (37): PATCH(), GET(), POST(), schema, today(), GET(), POST(), validActivationFrom (+29 more)

### Community 24 - "track.ts"
Cohesion: 0.19
Nodes (17): pathPerimeterM(), assessTrack(), CleanedTrack, closureGapM(), DropReason, finiteNum(), nearStart(), SampleDecision (+9 more)

### Community 25 - "accessibleFarmWhere"
Cohesion: 0.06
Nodes (30): AgronomyDiagnosticsPage(), dynamic, AgronomyPlanningPage(), dynamic, AgronomyRadarPage(), dynamic, dynamic, OperationsCalendarPage() (+22 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.08
Nodes (23): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory(), Farm (+15 more)

### Community 29 - "dashboard-client.tsx"
Cohesion: 0.25
Nodes (7): ClientDirectoryItem, DashboardClient(), DashboardClientProps, MacroTelemetry, SetupPipelineItem, STAGE_METADATA, STAGES_ORDER

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "business.ts"
Cohesion: 0.06
Nodes (41): dynamic, GET(), dynamic, OwnerDashboardPage(), POLICIES, Policy, SystemPolicyCards(), Farm (+33 more)

### Community 34 - "ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 35 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 36 - "ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 37 - "3. Model Specifications"
Cohesion: 0.08
Nodes (23): 1. Entity-Relationship Diagram, 2.1 User & Access, 2.2 Farm & Plot, 2.3 Crop & Agronomy, 2.4 Task Workflow, 2.5 Attendance & Approvals, 2.6 Monitoring & Incidents, 2. Enumerations (+15 more)

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

### Community 50 - "currentActor"
Cohesion: 0.07
Nodes (54): dynamic, GET(), GET(), PATCH(), updateClientSchema, GET(), GET(), PATCH() (+46 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.24
Nodes (9): main(), prisma, BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES, LAST_NAMES, REGIONS (+1 more)

### Community 57 - "requireFarmAccess"
Cohesion: 0.10
Nodes (33): canViewFarmMedia(), dynamic, GET(), dynamic, GET(), PATCH(), schema, GET() (+25 more)

### Community 65 - "officer-day.tsx"
Cohesion: 0.07
Nodes (42): Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask, WeeklyPlanner(), cropStages, Cycle (+34 more)

### Community 66 - "history/route.ts"
Cohesion: 0.10
Nodes (32): OfficerRow, ALL_KINDS, decodeCursor(), dynamic, encodeCursor(), endOfDayUTC(), GET(), HistoryItem (+24 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.16
Nodes (33): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+25 more)

### Community 69 - "apiError"
Cohesion: 0.12
Nodes (32): GET(), GET(), GET(), GET(), GET(), GET(), musterSchema, GET() (+24 more)

### Community 72 - "geo-core.ts"
Cohesion: 0.14
Nodes (38): irrigationItem, POST(), schema, BBox, bboxOfRing(), clipPolygonToRect(), closeRing(), cross() (+30 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.14
Nodes (21): backfill(), main(), POST(), PATCH(), PATCH(), parseBoundaryToRing(), validatePlotGeometry(), validatePolygon() (+13 more)

### Community 76 - "platform-map-console.tsx"
Cohesion: 0.08
Nodes (26): metadata, dropItemStyle, dropStyle, h2Style, inputStyle, LAYERS, miniBtnStyle, MissingFarm (+18 more)

### Community 78 - "security.ts"
Cohesion: 0.07
Nodes (34): onboardSchema, POST(), normalizePhone(), POST(), POST(), createSchema, GET(), POST() (+26 more)

### Community 79 - "plot-edit-form.tsx"
Cohesion: 0.20
Nodes (6): GeoMap, INDIA_CENTER, options, Plot, PlotEditForm(), save()

### Community 82 - "auth.ts"
Cohesion: 0.15
Nodes (18): POST(), dynamic, LoginPage(), dynamic, Home(), clearSession(), cookieName(), createSession() (+10 more)

### Community 83 - "login-form.tsx"
Cohesion: 0.32
Nodes (7): ALTERNATIVE_OFFICERS, LoginForm(), handleQuickLogin(), performLogin(), submit(), TEST_PROFILES, TestProfile

### Community 84 - "validation.ts"
Cohesion: 0.29
Nodes (6): dateStr, farmId, irrigationType, lat, lng, soilType

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "badge.tsx"
Cohesion: 0.07
Nodes (33): AssignedFarm, ClientInfo, FarmAccessInfo, FarmSearchResult, ROLES, User, ApprovalsConsole(), Attendance (+25 more)

### Community 87 - "parseBoundary"
Cohesion: 0.15
Nodes (16): FarmCommandCenter(), ClientOnboardingWizardV2(), GeoMap, HandoverData, STEPS, FlaggedVersion, GeoMap, SpatialConsole() (+8 more)

### Community 89 - "requireSession"
Cohesion: 0.05
Nodes (59): AttendancePage(), dynamic, ClientDetailPage(), dynamic, DashboardPage(), dynamic, dynamic, HqAnalyticsPage() (+51 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 93 - "operations-calendar.tsx"
Cohesion: 0.22
Nodes (7): CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption, OperationsCalendar(), OperationsCalendarProps

### Community 95 - "crop-cycle-edit-form.tsx"
Cohesion: 0.40
Nodes (3): CropCycleEditForm(), Cycle, dateVal()

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "owner/people/page.tsx"
Cohesion: 0.33
Nodes (5): dynamic, OwnerPeoplePage(), Props, dynamic, FarmWorker

### Community 98 - "profile/page.tsx"
Cohesion: 0.24
Nodes (9): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+1 more)

### Community 99 - "LngLat"
Cohesion: 0.11
Nodes (21): GET(), GET(), GeoMapProps, LngLat, ValidatedPlotGeometry, FARM_RING, PLOT_RING, secret (+13 more)

### Community 101 - "sync/route.ts"
Cohesion: 0.18
Nodes (12): centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema, FARM_RING (+4 more)

### Community 102 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 103 - "geo-map.tsx"
Cohesion: 0.15
Nodes (14): GeoMap, GeoMap, GeoMap, BaseLayer, GeomanController(), GeoMapPin, layerToRing(), IMPORTANT: import via `next/dynamic` with `{ ssr: false }`. This component (+6 more)

### Community 104 - "boundary-history.tsx"
Cohesion: 0.31
Nodes (7): BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion, AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS

### Community 105 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 106 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 107 - "crew/page.tsx"
Cohesion: 0.21
Nodes (8): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 108 - "onboarding-workspace.tsx"
Cohesion: 0.29
Nodes (3): OnboardingWorkspace(), PipelineFarm, StageCounts

### Community 109 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 110 - "people-directory.tsx"
Cohesion: 0.11
Nodes (16): formatDate(), LabourData, PeopleDirectory(), SORT_LABELS, SortOption, sortParams(), AssignedFarm, CreateAccountDrawer() (+8 more)

### Community 111 - "tasks-ledger.tsx"
Cohesion: 0.13
Nodes (24): useFarmSearch(), AssignControl(), assignmentText(), DetailTask, HistoryEntry, TaskDetailDrawer(), BULK_STATUSES, HqTask (+16 more)

### Community 119 - "hq/tasks/route.ts"
Cohesion: 0.31
Nodes (8): asIso(), asNum(), escapeLike(), GET(), LedgerDbRow, PRIORITIES, SORTS, TASK_STATUSES

### Community 120 - "app/farms/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, FarmsPage(), FarmRegistry()

### Community 129 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 130 - "farm/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerFarmPage(), FarmProfile, MyFarmOverview()

### Community 131 - "icons.tsx"
Cohesion: 0.07
Nodes (22): PrintableSpraySheet(), PrintableTask, AttendanceRecord, Farm, ClientDirectory(), ClientRow, loadViews(), SavedView (+14 more)

### Community 132 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (16): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+8 more)

### Community 133 - "boundary-walk.tsx"
Cohesion: 0.13
Nodes (29): BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList(), ringAcresSafe() (+21 more)

### Community 134 - "hq/system/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, HqSystemPage(), loadDataQuality(), dynamic, SystemPage(), AuditConsole(), SystemAuditExplorer(), DataQualityCounts (+2 more)

### Community 135 - "task-map-card.tsx"
Cohesion: 0.50
Nodes (4): GeoMap, pinColor(), TaskMapCard(), TaskPin

### Community 136 - "extractRing"
Cohesion: 0.67
Nodes (4): extractRing(), legacyPointToLngLat(), ringPositionsToLngLat(), toFiniteNumber()

### Community 137 - "hq/page.tsx"
Cohesion: 0.13
Nodes (15): dynamic, HqOverviewPage(), OverviewActivity(), OverviewAlert, OverviewAlertList(), SEVERITY_RANK, severityClass(), OverviewAlerts() (+7 more)

### Community 138 - "client-360.tsx"
Cohesion: 0.13
Nodes (9): Bundle, card, Client360(), FarmItem, Pin, PlotItem, Tab, TABS (+1 more)

### Community 139 - "attendance-geo-route.test.ts"
Cohesion: 0.18
Nodes (9): AttendanceForm(), basisText(), handleClockIn(), handleClockOut(), FARM_GEOJSON, FARM_RING, PLOT_RING, secret (+1 more)

### Community 140 - "hq/farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 141 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 145 - "farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 146 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

## Knowledge Gaps
- **885 isolated node(s):** `config`, `nextConfig`, `name`, `version`, `private` (+880 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `farm-hub-client.tsx`, `farm/page.tsx`, `onboarding-wizard.tsx`, `boundary-walk.tsx`, `client-360.tsx`, `navbar.tsx`, `hq/farm-registry.tsx`, `accessibleFarmWhere`, `tasks-queue.tsx`, `dashboard-client.tsx`, `business.ts`, `officer-day.tsx`, `plot-edit-form.tsx`, `auth.ts`, `login-form.tsx`, `badge.tsx`, `parseBoundary`, `requireSession`, `operations-calendar.tsx`, `crop-cycle-edit-form.tsx`, `profile/page.tsx`, `operations-triage-console.tsx`, `crew/page.tsx`, `onboarding-workspace.tsx`, `crop-cycle-form.tsx`, `people-directory.tsx`, `tasks-ledger.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `farm/page.tsx`, `onboarding-wizard.tsx`, `hq/system/page.tsx`, `hq/page.tsx`, `attendance-geo-route.test.ts`, `hq/incidents/route.ts`, `farms/new/page.tsx`, `api-integration.test.ts`, `accessibleFarmWhere`, `business.ts`, `currentActor`, `requireFarmAccess`, `history/route.ts`, `apiError`, `geo-core.ts`, `parseBoundaryToRing`, `security.ts`, `auth.ts`, `requireSession`, `owner/people/page.tsx`, `profile/page.tsx`, `LngLat`, `sync/route.ts`, `plot-geo.test.ts`, `crew/page.tsx`, `hq/tasks/route.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `requireSession` to `reports/page.tsx`, `profile/page.tsx`, `onboarding-wizard.tsx`, `business.ts`, `farm/page.tsx`, `hq/system/page.tsx`, `owner/people/page.tsx`, `hq/page.tsx`, `crew/page.tsx`, `farms/new/page.tsx`, `daily/page.tsx`, `auth.ts`, `app/farms/page.tsx`, `accessibleFarmWhere`, `requireFarmAccess`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `name` to the rest of the system?**
  _885 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.05711849957374254 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04296698326549073 - nodes in this community are weakly interconnected._
- **Should `onboarding-wizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07364114552893045 - nodes in this community are weakly interconnected._