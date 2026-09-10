# Graph Report - agaateapp  (2026-09-10)

## Corpus Check
- 333 files · ~300,794 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1815 nodes · 4550 edges · 129 communities (102 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35073932`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatDate
- icons.tsx
- app/insights/page.tsx
- requireSession
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
- login/route.ts
- examples/README.md
- Email Validation Function
- Ponytail Help
- audit
- boundary-walk.tsx
- [plotId]/page.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- unified-directory.tsx
- useToast
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
- requireRole
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed-scale.ts
- clients/page.tsx
- apiError
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- officer/calendar/page.tsx
- incident-report-form.tsx
- onboarding/page.tsx
- migration.sql
- currentActor
- geo-core.ts
- No AI slop
- build-docs-html.mjs
- parseBoundaryToRing
- client-onboarding-wizard-v2.tsx
- AdminConsole
- prisma.ts
- land/page.tsx
- login/page.tsx
- geo-server.ts
- validation.ts
- No AI slop eval
- workforce-attendance-console.tsx
- geo-map.tsx
- Documentation Index
- tasks-queue.tsx
- No AI Slop — Human Writing & Anti-Slop Guidelines
- approvals/page.tsx
- owner/calendar/page.tsx
- design-guard.test.ts
- edit/page.tsx
- middleware.ts
- owner/people/page.tsx
- storage.ts
- plot-visits.ts
- attendance/page.tsx
- sync/route.ts
- plot-geo.test.ts
- parseBoundary
- boundary-history.tsx
- weekly-planner.tsx
- app/operations/page.tsx
- diagnostics/page.tsx
- layout.tsx
- CropCycleForm
- task-map-card.tsx
- toGeoJsonPolygon
- 20260910170000_boundary_versions/migration.sql
- audit/page.tsx
- users/page.tsx
- directory/page.tsx
- operations/tasks/page.tsx
- work/page.tsx
- geo-write-paths.test.ts
- agaate-critical.spec.ts
- leaflet
- tsx

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 158 edges
2. `requireFarmAccess()` - 127 edges
3. `currentActor()` - 116 edges
4. `prisma` - 115 edges
5. `audit()` - 95 edges
6. `requireSession()` - 83 edges
7. `Icons` - 80 edges
8. `useToast()` - 71 edges
9. `requireRole()` - 59 edges
10. `accessibleFarmWhere()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `backfill()` --calls--> `parseBoundaryToRing()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `ringAcres()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `commitBoundary()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-versions.ts
- `backfill()` --calls--> `toGeoJsonPolygon()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `GET()` --indirect_call--> `serializeBoundaryVersion()`  [INFERRED]
  src/app/api/farms/[farmId]/boundary-versions/route.ts → src/lib/geo-versions.ts

## Import Cycles
- None detected.

## Communities (129 total, 27 thin omitted)

### Community 0 - "formatDate"
Cohesion: 0.08
Nodes (29): RFC-4180, dynamic, OfficerHarvestPage(), dynamic, OwnerInventoryPage(), Farm, MobileCrewMuster(), MusterRecord (+21 more)

### Community 1 - "icons.tsx"
Cohesion: 0.05
Nodes (37): dynamic, FarmSetupStageKey, SETUP_STAGES, FarmRow, AccessResponse, FarmAccessManager(), Person, Farm (+29 more)

### Community 3 - "requireSession"
Cohesion: 0.05
Nodes (67): AgronomyPlanningPage(), dynamic, AgronomyRadarPage(), dynamic, ClientDetailPage(), dynamic, DashboardPage(), dynamic (+59 more)

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
Nodes (23): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, @geoman-io/leaflet-geoman-free, jose, next, dependencies, @aws-sdk/client-s3 (+15 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, @types/bcryptjs (+15 more)

### Community 10 - "navbar.tsx"
Cohesion: 0.07
Nodes (24): dynamic, OfficerReportsPage(), BrandLogo(), BrandLogoProps, FieldReports(), DesktopSidebar(), DesktopSidebarProps, NavSection (+16 more)

### Community 11 - "Agaate Farm Management PWA — Design Brief"
Cohesion: 0.05
Nodes (42): 1.1 Core Principles, 1.2 Design Tone, 1. Design Philosophy, 2.1 Color Palette, 2.2 Typography, 2.3 Spacing System, 2. Brand Identity, 3.1 Shell Layout (+34 more)

### Community 12 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, lint (+4 more)

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

### Community 19 - "login/route.ts"
Cohesion: 0.21
Nodes (11): normalizePhone(), POST(), ALLOWED_DIRECT_MIME, POST(), acquireRateLimitSlot(), RateLimitRecord, rateLimitStore, resetRateLimit() (+3 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "audit"
Cohesion: 0.09
Nodes (36): PATCH(), GET(), POST(), schema, today(), GET(), POST(), validActivationFrom (+28 more)

### Community 24 - "boundary-walk.tsx"
Cohesion: 0.07
Nodes (52): BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList(), ringAcresSafe() (+44 more)

### Community 25 - "[plotId]/page.tsx"
Cohesion: 0.18
Nodes (7): dynamic, PlotPage(), GeoMap, INDIA_CENTER, options, Plot, PlotEditForm()

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "unified-directory.tsx"
Cohesion: 0.11
Nodes (13): ServerListState, useServerList(), Client, ClientsDirectory(), FarmsDirectory(), ClientRow, DirectoryTab, FarmRow (+5 more)

### Community 29 - "useToast"
Cohesion: 0.06
Nodes (32): ActivateFarmButton(), ClientDirectoryItem, DashboardClient(), DashboardClientProps, MacroTelemetry, SetupPipelineItem, STAGE_METADATA, STAGES_ORDER (+24 more)

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
Cohesion: 0.07
Nodes (37): dynamic, OwnerDashboardPage(), CropCycleDetailPage(), Farm, InitialTelemetry, OwnerCockpit(), OwnerCockpitProps, TelemetryAttendance (+29 more)

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

### Community 50 - "requireRole"
Cohesion: 0.09
Nodes (28): GET(), PATCH(), updateClientSchema, POST(), onboardSchema, POST(), GET(), PATCH() (+20 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.24
Nodes (9): main(), prisma, BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES, LAST_NAMES, REGIONS (+1 more)

### Community 57 - "apiError"
Cohesion: 0.07
Nodes (44): bulkSchema, POST(), canViewFarmMedia(), dynamic, GET(), DELETE(), GET(), POST() (+36 more)

### Community 65 - "incident-report-form.tsx"
Cohesion: 0.06
Nodes (40): AttendanceForm(), basisText(), handleClockIn(), handleClockOut(), AttendanceRecord, Farm, cropStages, Cycle (+32 more)

### Community 66 - "onboarding/page.tsx"
Cohesion: 0.22
Nodes (5): dynamic, OnboardingPage(), OnboardingWorkspace(), PipelineFarm, StageCounts

### Community 68 - "migration.sql"
Cohesion: 0.26
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 69 - "currentActor"
Cohesion: 0.12
Nodes (32): GET(), GET(), GET(), GET(), GET(), musterSchema, createSchema, GET() (+24 more)

### Community 72 - "geo-core.ts"
Cohesion: 0.19
Nodes (27): POST(), BBox, bboxOfRing(), clipPolygonToRect(), closeRing(), cross(), extractRing(), GridCell (+19 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "parseBoundaryToRing"
Cohesion: 0.16
Nodes (18): POST(), farmTransitions, PATCH(), patchSchema, parseBoundaryToRing(), BoundaryWrite, commitBoundary(), CommittedVersion (+10 more)

### Community 76 - "client-onboarding-wizard-v2.tsx"
Cohesion: 0.21
Nodes (10): ClientOnboardingWizardV2(), GeoMap, HandoverData, STEPS, GeoMap(), save(), PlotForm(), submit() (+2 more)

### Community 78 - "prisma.ts"
Cohesion: 0.12
Nodes (21): dynamic, GET(), createClientSchema, POST(), dynamic, GET(), GET(), GET() (+13 more)

### Community 79 - "land/page.tsx"
Cohesion: 0.28
Nodes (6): dynamic, OwnerLandPage(), dynamic, Farm, Plot, PlotsExplorer()

### Community 82 - "login/page.tsx"
Cohesion: 0.12
Nodes (20): POST(), dynamic, LoginPage(), dynamic, Home(), ALTERNATIVE_OFFICERS, LoginForm(), handleQuickLogin() (+12 more)

### Community 83 - "geo-server.ts"
Cohesion: 0.16
Nodes (16): irrigationItem, schema, EARTH_RADIUS_M, LngLat, MAX_BOUNDARY_POINTS, MIN_BOUNDARY_ACRES, roundAcresForDb(), SQM_PER_ACRE (+8 more)

### Community 84 - "validation.ts"
Cohesion: 0.29
Nodes (6): dateStr, farmId, irrigationType, lat, lng, soilType

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "workforce-attendance-console.tsx"
Cohesion: 0.05
Nodes (40): dynamic, PeoplePage(), AssignedFarm, ClientInfo, FarmAccessInfo, FarmSearchResult, ROLES, User (+32 more)

### Community 87 - "geo-map.tsx"
Cohesion: 0.16
Nodes (14): GeoMap, GeoMap, BaseLayer, GeomanController(), GeoMapPin, GeoMapProps, layerToRing(), IMPORTANT: import via `next/dynamic` with `{ ssr: false }`. This component (+6 more)

### Community 89 - "tasks-queue.tsx"
Cohesion: 0.18
Nodes (9): dynamic, OwnerOperationsPage(), dynamic, TasksPage(), PRIORITY_OPTIONS, STATUS_OPTIONS, Summary, Task (+1 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 93 - "owner/calendar/page.tsx"
Cohesion: 0.21
Nodes (9): dynamic, Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption, OperationsCalendar() (+1 more)

### Community 95 - "edit/page.tsx"
Cohesion: 0.28
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "owner/people/page.tsx"
Cohesion: 0.27
Nodes (7): dynamic, OwnerPeoplePage(), Props, dynamic, FarmWorker, WorkersConsole(), WorkersConsoleProps

### Community 98 - "storage.ts"
Cohesion: 0.18
Nodes (15): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+7 more)

### Community 99 - "plot-visits.ts"
Cohesion: 0.17
Nodes (12): fences, visits, getPlotVisits(), PlotVisitData, computePlotVisits(), planVisitRoute(), PlotVisit, ringOf() (+4 more)

### Community 101 - "sync/route.ts"
Cohesion: 0.27
Nodes (11): centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema, schema, PATCH() (+3 more)

### Community 102 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 103 - "parseBoundary"
Cohesion: 0.22
Nodes (7): FarmCommandCenter(), FlaggedVersion, GeoMap, SpatialConsole(), SpatialFarm, WalkTrackItem, parseBoundary()

### Community 104 - "boundary-history.tsx"
Cohesion: 0.31
Nodes (7): BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion, AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS

### Community 105 - "weekly-planner.tsx"
Cohesion: 0.25
Nodes (7): PrintableSpraySheet(), PrintableTask, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask

### Community 106 - "app/operations/page.tsx"
Cohesion: 0.32
Nodes (3): dynamic, OperationsTriageConsole(), TriageData

### Community 107 - "diagnostics/page.tsx"
Cohesion: 0.43
Nodes (5): AgronomyDiagnosticsPage(), dynamic, DiagnosticCase, DiagnosticsWorkbench(), DispatchedRx

### Community 108 - "layout.tsx"
Cohesion: 0.40
Nodes (3): metadata, viewport, ToastProvider()

### Community 109 - "CropCycleForm"
Cohesion: 0.60
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 110 - "task-map-card.tsx"
Cohesion: 0.50
Nodes (4): GeoMap, pinColor(), TaskMapCard(), TaskPin

### Community 111 - "toGeoJsonPolygon"
Cohesion: 0.83
Nodes (3): backfill(), main(), toGeoJsonPolygon()

## Knowledge Gaps
- **758 isolated node(s):** `config`, `nextConfig`, `name`, `version`, `private` (+753 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `formatDate`, `requireSession`, `navbar.tsx`, `boundary-walk.tsx`, `[plotId]/page.tsx`, `unified-directory.tsx`, `useToast`, `business.ts`, `incident-report-form.tsx`, `onboarding/page.tsx`, `client-onboarding-wizard-v2.tsx`, `land/page.tsx`, `login/page.tsx`, `workforce-attendance-console.tsx`, `tasks-queue.tsx`, `owner/calendar/page.tsx`, `edit/page.tsx`, `owner/people/page.tsx`, `storage.ts`, `parseBoundary`, `weekly-planner.tsx`, `app/operations/page.tsx`, `diagnostics/page.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `requireSession` to `formatDate`, `business.ts`, `storage.ts`, `onboarding/page.tsx`, `owner/people/page.tsx`, `icons.tsx`, `navbar.tsx`, `diagnostics/page.tsx`, `app/operations/page.tsx`, `land/page.tsx`, `login/page.tsx`, `workforce-attendance-console.tsx`, `tasks-queue.tsx`, `owner/calendar/page.tsx`, `[plotId]/page.tsx`, `edit/page.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `formatDate`, `icons.tsx`, `requireSession`, `login/route.ts`, `audit`, `boundary-walk.tsx`, `[plotId]/page.tsx`, `business.ts`, `requireRole`, `apiError`, `incident-report-form.tsx`, `currentActor`, `parseBoundaryToRing`, `land/page.tsx`, `login/page.tsx`, `geo-server.ts`, `owner/calendar/page.tsx`, `edit/page.tsx`, `owner/people/page.tsx`, `storage.ts`, `plot-visits.ts`, `sync/route.ts`, `plot-geo.test.ts`, `app/operations/page.tsx`, `diagnostics/page.tsx`, `toGeoJsonPolygon`, `agaate-critical.spec.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `name` to the rest of the system?**
  _758 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatDate` be split into smaller, more focused modules?**
  _Cohesion score 0.07926829268292683 - nodes in this community are weakly interconnected._
- **Should `icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.049689440993788817 - nodes in this community are weakly interconnected._
- **Should `requireSession` be split into smaller, more focused modules?**
  _Cohesion score 0.04736842105263158 - nodes in this community are weakly interconnected._