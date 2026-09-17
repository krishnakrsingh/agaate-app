# Graph Report - agaateapp  (2026-09-12)

## Corpus Check
- 416 files · ~372,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2378 nodes · 5929 edges · 158 communities (121 shown, 37 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31e27b14`
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
- hq/incidents/route.ts
- examples/README.md
- Email Validation Function
- Ponytail Help
- business.ts
- icons.tsx
- ProfileMenu
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- tasks-queue.tsx
- schema_full.sql
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- attendance-geo.ts
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
- owner/operations/page.tsx
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed-scale.ts
- clients/page.tsx
- owner/people/page.tsx
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
- agaate-critical.spec.ts
- geo-core.ts
- No AI slop
- build-docs-html.mjs
- sync/route.ts
- platform-map-console.tsx
- prisma.ts
- apiError
- init_migration.sql
- auth.ts
- geo-map.tsx
- validation.ts
- No AI slop eval
- badge.tsx
- geo.ts
- Documentation Index
- breadcrumbs.tsx
- No AI Slop — Human Writing & Anti-Slop Guidelines
- approvals/page.tsx
- owner/calendar/page.tsx
- design-guard.test.ts
- quick-logger.tsx
- middleware.ts
- 20260909000000_add_missing_fields_and_tables/migration.sql
- requireSession
- parseBoundaryToRing
- attendance/page.tsx
- login/route.ts
- plot-geo.test.ts
- prisma/migrations_upgrade.sql
- public/migrations_upgrade.sql
- selfie/route.ts
- operations-triage-console.tsx
- LoginForm
- tasks-ledger.tsx
- hq/clients/route.ts
- api/incidents/route.ts
- extractRing
- 20260910170000_boundary_versions/migration.sql
- audit/page.tsx
- users/page.tsx
- directory/page.tsx
- operations/tasks/page.tsx
- work/page.tsx
- geo-write-paths.test.ts
- layout.tsx
- app/farms/page.tsx
- components.json
- crew/page.tsx
- accessibleFarmWhere
- incidents-command.tsx
- boundary-walk.tsx
- hq/system/page.tsx
- onboarding-workspace.tsx
- hq/page.tsx
- client-360.tsx
- attendance-geo-route.test.ts
- hq/farm-registry.tsx
- requireFarmAccess
- `Attendance`
- `CropMonitoring`
- `Incident`
- `Farm`
- `Plot`
- `Plot`
- `TaskExecution`
- client-workspace.tsx
- currentActor
- crop-cycle-form.tsx
- boundary-history.tsx
- eslint-config-next
- @prisma/client
- tailwind-merge
- vitest
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 200 edges
2. `currentActor()` - 158 edges
3. `prisma` - 142 edges
4. `requireFarmAccess()` - 129 edges
5. `requireSession()` - 113 edges
6. `requireRole()` - 101 edges
7. `audit()` - 101 edges
8. `Icons` - 93 edges
9. `useToast()` - 85 edges
10. `accessibleFarmWhere()` - 67 edges

## Surprising Connections (you probably didn't know these)
- `backfill()` --calls--> `parseBoundaryToRing()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `ringAcres()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `toGeoJsonPolygon()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-core.ts
- `backfill()` --calls--> `commitBoundary()`  [EXTRACTED]
  scripts/backfill-boundary-versions.ts → src/lib/geo-versions.ts
- `AttendancePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/attendance/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (158 total, 37 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.05
Nodes (53): RFC-4180, dynamic, CropRadar(), CropRadarItem, DiagnosticCase, DiagnosticsWorkbench(), DispatchedRx, AnalyticsConsole() (+45 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.04
Nodes (36): ActivateFarmButton(), FarmSetupStageKey, SETUP_STAGES, AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm() (+28 more)

### Community 3 - "onboarding-wizard.tsx"
Cohesion: 0.08
Nodes (43): clearLocal(), emptyFarm(), emptyWizard(), hydrate(), loadLocal(), saveLocal(), storageKey(), StoredDraft (+35 more)

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
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, clsx, @geoman-io/leaflet-geoman-free, jose, leaflet, lucide-react (+21 more)

### Community 9 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, devDependencies, autoprefixer, eslint, @playwright/test, postcss, prisma (+21 more)

### Community 10 - "navbar.tsx"
Cohesion: 0.09
Nodes (22): dynamic, HqPeoplePage(), dynamic, OfficerDayPage(), dynamic, OfficerProfilePage(), dynamic, PeoplePage() (+14 more)

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

### Community 19 - "hq/incidents/route.ts"
Cohesion: 0.31
Nodes (8): ageLabel(), dynamic, GET(), HQ_INCIDENT_PAGE_SIZE, P0_SLA_HOURS, pClassOf(), severityFilter(), STATUSES

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "business.ts"
Cohesion: 0.06
Nodes (48): PATCH(), GET(), POST(), schema, today(), GET(), POST(), validActivationFrom (+40 more)

### Community 24 - "icons.tsx"
Cohesion: 0.05
Nodes (34): BrandLogo(), BrandLogoProps, CropCycleEditForm(), Cycle, dateVal(), FarmForm(), IconProps, Icons (+26 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.09
Nodes (22): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory(), Farm (+14 more)

### Community 29 - "schema_full.sql"
Cohesion: 0.19
Nodes (29): `AgronomyPlan`, `AgronomyPrescription`, `Attendance`, `AttendanceException`, `AuditLog`, `BoundaryVersion`, `CropCycle`, `CropMonitoring` (+21 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "attendance-geo.ts"
Cohesion: 0.08
Nodes (33): GET(), dynamic, OwnerDashboardPage(), Farm, InitialTelemetry, OwnerCockpit(), OwnerCockpitProps, TelemetryAttendance (+25 more)

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

### Community 50 - "owner/operations/page.tsx"
Cohesion: 0.25
Nodes (5): dynamic, OwnerOperationsPage(), dynamic, TasksPage(), TasksQueue()

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.24
Nodes (9): main(), prisma, BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES, LAST_NAMES, REGIONS (+1 more)

### Community 57 - "owner/people/page.tsx"
Cohesion: 0.40
Nodes (4): dynamic, OwnerPeoplePage(), Props, dynamic

### Community 65 - "officer-day.tsx"
Cohesion: 0.06
Nodes (43): PrintableSpraySheet(), PrintableTask, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask, WeeklyPlanner() (+35 more)

### Community 66 - "history/route.ts"
Cohesion: 0.10
Nodes (32): OfficerRow, ALL_KINDS, decodeCursor(), dynamic, encodeCursor(), endOfDayUTC(), GET(), HistoryItem (+24 more)

### Community 68 - "20260830181349_init_mysql/migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 72 - "geo-core.ts"
Cohesion: 0.17
Nodes (30): irrigationItem, POST(), schema, BBox, bboxOfRing(), clipPolygonToRect(), closeRing(), cross() (+22 more)

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "sync/route.ts"
Cohesion: 0.10
Nodes (22): backfill(), main(), centroid(), POST(), reconcileCaptureTrack(), recordWalkEvidence(), sameRing(), sampleSchema (+14 more)

### Community 76 - "platform-map-console.tsx"
Cohesion: 0.08
Nodes (26): metadata, dropItemStyle, dropStyle, h2Style, inputStyle, LAYERS, miniBtnStyle, MissingFarm (+18 more)

### Community 77 - "prisma.ts"
Cohesion: 0.06
Nodes (61): dynamic, GET(), GET(), PATCH(), updateClientSchema, createClientSchema, POST(), GET() (+53 more)

### Community 78 - "apiError"
Cohesion: 0.12
Nodes (31): GET(), GET(), GET(), GET(), GET(), GET(), GET(), farmSchema (+23 more)

### Community 79 - "init_migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 82 - "auth.ts"
Cohesion: 0.14
Nodes (19): POST(), dynamic, LoginPage(), dynamic, Home(), AgronomyShowcasePanel(), clearSession(), cookieName() (+11 more)

### Community 83 - "geo-map.tsx"
Cohesion: 0.12
Nodes (18): GeoMap, GeoMap, GeoMap, BaseLayer, GeomanController(), GeoMap(), GeoMapPin, layerToRing() (+10 more)

### Community 84 - "validation.ts"
Cohesion: 0.29
Nodes (6): dateStr, farmId, irrigationType, lat, lng, soilType

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "badge.tsx"
Cohesion: 0.05
Nodes (39): AdminConsole(), AssignedFarm, ClientInfo, FarmAccessInfo, FarmSearchResult, ROLES, User, ApprovalsConsole() (+31 more)

### Community 87 - "geo.ts"
Cohesion: 0.08
Nodes (31): FarmCommandCenter(), ClientOnboardingWizardV2(), HandoverData, STEPS, FlaggedVersion, GeoMap, SpatialConsole(), SpatialFarm (+23 more)

### Community 89 - "breadcrumbs.tsx"
Cohesion: 0.06
Nodes (28): AttendancePage(), dynamic, dynamic, NewFarmPage(), dynamic, HqAnalyticsPage(), dynamic, HqClientDetailPage() (+20 more)

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 93 - "owner/calendar/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, OperationsCalendarPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+2 more)

### Community 95 - "quick-logger.tsx"
Cohesion: 0.33
Nodes (5): CATEGORIES, Farm, InventoryItem, Plot, QuickLogger()

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "20260909000000_add_missing_fields_and_tables/migration.sql"
Cohesion: 0.36
Nodes (10): `AgronomyPrescription`, `DailyCrewMuster`, `ExpenseLog`, `HarvestLog`, `InventoryItem`, `InventoryTransaction`, `CropCycle`, `Farm` (+2 more)

### Community 98 - "requireSession"
Cohesion: 0.09
Nodes (22): ClientDetailPage(), dynamic, DashboardPage(), dynamic, dynamic, FarmDetailPage(), dynamic, HqCalendarPage() (+14 more)

### Community 99 - "parseBoundaryToRing"
Cohesion: 0.16
Nodes (16): GeoMapProps, LngLat, parseBoundaryToRing(), ValidatedPlotGeometry, fences, visits, getPlotVisits(), PlotVisitData (+8 more)

### Community 101 - "login/route.ts"
Cohesion: 0.24
Nodes (10): normalizePhone(), POST(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore, resetRateLimit(), throttle() (+2 more)

### Community 102 - "plot-geo.test.ts"
Cohesion: 0.17
Nodes (7): FARM_GEOJSON, FARM_RING, INSIDE, OUTSIDE, secret, STRADDLE, TOUCHING

### Community 103 - "prisma/migrations_upgrade.sql"
Cohesion: 0.36
Nodes (10): `AgronomyPrescription`, `DailyCrewMuster`, `ExpenseLog`, `HarvestLog`, `InventoryItem`, `InventoryTransaction`, `CropCycle`, `Farm` (+2 more)

### Community 104 - "public/migrations_upgrade.sql"
Cohesion: 0.36
Nodes (10): `AgronomyPrescription`, `DailyCrewMuster`, `ExpenseLog`, `HarvestLog`, `InventoryItem`, `InventoryTransaction`, `CropCycle`, `Farm` (+2 more)

### Community 105 - "selfie/route.ts"
Cohesion: 0.67
Nodes (3): canViewFarmMedia(), dynamic, GET()

### Community 106 - "operations-triage-console.tsx"
Cohesion: 0.20
Nodes (6): loadClaimed(), OperationsTriageConsole(), QueueItem, QueueKind, severityRank(), TriageData

### Community 107 - "LoginForm"
Cohesion: 0.83
Nodes (4): LoginForm(), performLogin(), quickLogin(), submit()

### Community 108 - "tasks-ledger.tsx"
Cohesion: 0.05
Nodes (47): OverviewActivity(), OverviewAlert, OverviewAlertList(), SEVERITY_RANK, severityClass(), OverviewAlerts(), SEVERITY_RANK, formatDate() (+39 more)

### Community 109 - "hq/clients/route.ts"
Cohesion: 0.31
Nodes (9): buildWhere(), bulkStatusSchema, ClientStats, emptyStats(), enrichPage(), formatRow(), GET(), PATCH() (+1 more)

### Community 110 - "api/incidents/route.ts"
Cohesion: 0.18
Nodes (8): GET(), GET(), dynamic, POST(), schema, FARM_RING, PLOT_RING, secret

### Community 111 - "extractRing"
Cohesion: 0.67
Nodes (4): extractRing(), legacyPointToLngLat(), ringPositionsToLngLat(), toFiniteNumber()

### Community 119 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, ThemeInitializer(), ToastProvider()

### Community 120 - "app/farms/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, FarmsPage(), FarmRegistry()

### Community 121 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 129 - "crew/page.tsx"
Cohesion: 0.21
Nodes (8): dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps

### Community 130 - "accessibleFarmWhere"
Cohesion: 0.07
Nodes (26): AgronomyDiagnosticsPage(), AgronomyPlanningPage(), dynamic, AgronomyRadarPage(), dynamic, dynamic, OwnerFarmPage(), dynamic (+18 more)

### Community 132 - "incidents-command.tsx"
Cohesion: 0.11
Nodes (16): AuditEntry, Detail, DrawerChanged, errMsg(), FollowUp, IncidentDrawer(), changeStatus(), load() (+8 more)

### Community 133 - "boundary-walk.tsx"
Cohesion: 0.07
Nodes (51): BoundaryTargetPicker(), FarmOpt, PlotOpt, BoundaryWalk(), fmtElapsed(), INDIA_CENTER, QueueList(), ringAcresSafe() (+43 more)

### Community 134 - "hq/system/page.tsx"
Cohesion: 0.14
Nodes (13): dynamic, HqSystemPage(), loadDataQuality(), dynamic, SystemPage(), AuditConsole(), SystemAuditExplorer(), DataQualityCounts (+5 more)

### Community 136 - "onboarding-workspace.tsx"
Cohesion: 0.25
Nodes (4): OnboardingWorkspace(), PipelineFarm, STAGE_META, StageCounts

### Community 137 - "hq/page.tsx"
Cohesion: 0.23
Nodes (8): dynamic, HqOverviewPage(), OverviewFunnel(), STAGE_LABELS, STAGE_ORDER, formatCompactAcres(), formatNumber(), OverviewKpis()

### Community 138 - "client-360.tsx"
Cohesion: 0.08
Nodes (16): ClientDirectoryItem, DashboardClient(), DashboardClientProps, MacroTelemetry, SetupPipelineItem, STAGE_METADATA, STAGES_ORDER, Bundle (+8 more)

### Community 139 - "attendance-geo-route.test.ts"
Cohesion: 0.14
Nodes (12): AttendanceForm(), basisText(), handleClockIn(), handleClockOut(), AttendanceRecord, Farm, FARM_GEOJSON, FARM_RING (+4 more)

### Community 140 - "hq/farm-registry.tsx"
Cohesion: 0.25
Nodes (7): FarmRow, GeoMap, HqFarmRegistry(), slaRisks(), STAGE_LABELS, STAGE_OPTIONS, STATUS_OPTIONS

### Community 142 - "requireFarmAccess"
Cohesion: 0.09
Nodes (40): POST(), bulkSchema, POST(), POST(), DELETE(), GET(), POST(), schema (+32 more)

### Community 153 - "client-workspace.tsx"
Cohesion: 0.33
Nodes (4): ClientData, ClientWorkspace(), FarmSummary, UserSummary

### Community 154 - "currentActor"
Cohesion: 0.09
Nodes (32): onboardSchema, POST(), GET(), musterSchema, POST(), createSchema, GET(), POST() (+24 more)

### Community 156 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 159 - "boundary-history.tsx"
Cohesion: 0.31
Nodes (7): BoundaryHistory(), fmtDate(), GeoMap, HistoryVersion, AREA_CHANGE_FLAG_THRESHOLD, areaChangeText(), SOURCE_LABELS

## Knowledge Gaps
- **909 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+904 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `useToast`, `farm-hub-client.tsx`, `accessibleFarmWhere`, `onboarding-wizard.tsx`, `crew/page.tsx`, `boundary-walk.tsx`, `onboarding-workspace.tsx`, `navbar.tsx`, `attendance-geo-route.test.ts`, `client-360.tsx`, `hq/farm-registry.tsx`, `client-workspace.tsx`, `tasks-queue.tsx`, `crop-cycle-form.tsx`, `attendance-geo.ts`, `owner/operations/page.tsx`, `officer-day.tsx`, `badge.tsx`, `geo.ts`, `breadcrumbs.tsx`, `owner/calendar/page.tsx`, `quick-logger.tsx`, `requireSession`, `operations-triage-console.tsx`, `tasks-ledger.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `useToast`, `crew/page.tsx`, `accessibleFarmWhere`, `boundary-walk.tsx`, `hq/system/page.tsx`, `hq/page.tsx`, `navbar.tsx`, `attendance-geo-route.test.ts`, `requireFarmAccess`, `hq/incidents/route.ts`, `business.ts`, `currentActor`, `attendance-geo.ts`, `owner/people/page.tsx`, `history/route.ts`, `agaate-critical.spec.ts`, `geo-core.ts`, `sync/route.ts`, `apiError`, `auth.ts`, `breadcrumbs.tsx`, `owner/calendar/page.tsx`, `requireSession`, `parseBoundaryToRing`, `login/route.ts`, `plot-geo.test.ts`, `selfie/route.ts`, `tasks-ledger.tsx`, `hq/clients/route.ts`, `api/incidents/route.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `farm-hub-client.tsx`, `officer-day.tsx`, `onboarding-wizard.tsx`, `accessibleFarmWhere`, `onboarding-workspace.tsx`, `operations-triage-console.tsx`, `attendance-geo-route.test.ts`, `client-360.tsx`, `hq/farm-registry.tsx`, `tasks-ledger.tsx`, `tasks-queue.tsx`, `owner/operations/page.tsx`, `badge.tsx`, `geo.ts`, `client-workspace.tsx`, `crop-cycle-form.tsx`, `owner/calendar/page.tsx`, `quick-logger.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _909 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.048618048618048616 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.044034818228366614 - nodes in this community are weakly interconnected._
- **Should `onboarding-wizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07581453634085213 - nodes in this community are weakly interconnected._