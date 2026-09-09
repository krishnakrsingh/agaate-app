# Graph Report - agaateapp  (2026-09-09)

## Corpus Check
- 228 files · ~217,046 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1279 nodes · 2959 edges · 98 communities (84 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0056cda1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatDate
- farm-hub-client.tsx
- breadcrumbs.tsx
- profile/page.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- 4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)
- dependencies
- devDependencies
- auth.ts
- Agaate Farm Management PWA — Design Brief
- scripts
- Rate Limiting in FastAPI
- 4. Feature Specifications
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- officer-day.tsx
- examples/README.md
- Email Validation Function
- Ponytail Help
- prisma.ts
- login-form.tsx
- plot-edit-form.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- officer/harvest/page.tsx
- useToast
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- downloadUrl
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
- audit
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed.ts
- crop-cycles/new/page.tsx
- apiError
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- officer/calendar/page.tsx
- incident-report-form.tsx
- access.ts
- migration.sql
- requireSession
- business.ts
- owner/calendar/page.tsx
- build-docs-html.mjs
- currentActor
- navbar.tsx
- login/route.ts
- agaate-critical.spec.ts
- icons.tsx
- crew/page.tsx
- farms/new/page.tsx
- weekly-planner.tsx
- app/dashboard/page.tsx
- dashboard-client.tsx
- @types/bcryptjs
- Documentation Index
- radar/page.tsx
- accessibleFarmWhere
- brief/page.tsx
- task-form.tsx
- daily/page.tsx
- crop-cycle-edit-form.tsx
- middleware.ts
- approvals/page.tsx

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 112 edges
2. `requireFarmAccess()` - 102 edges
3. `currentActor()` - 89 edges
4. `prisma` - 83 edges
5. `audit()` - 72 edges
6. `Icons` - 65 edges
7. `requireSession()` - 65 edges
8. `useToast()` - 51 edges
9. `accessibleFarmWhere()` - 47 edges
10. `requireRole()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts
- `AdminUsersPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/users/page.tsx → src/lib/auth.ts
- `NewFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/farms/new/page.tsx → src/lib/auth.ts
- `OfficerProfilePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/officer/profile/page.tsx → src/lib/auth.ts
- `DailyReportPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/reports/daily/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (98 total, 14 thin omitted)

### Community 0 - "formatDate"
Cohesion: 0.14
Nodes (18): RFC-4180, Farm, MobileCrewMuster(), MusterRecord, Expense, Farm, FinancialsConsole(), Farm (+10 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.07
Nodes (18): AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm(), CropCycle, Farm, Incident (+10 more)

### Community 2 - "breadcrumbs.tsx"
Cohesion: 0.11
Nodes (14): dynamic, dynamic, AdminUsersPage(), dynamic, dynamic, EditCropCyclePage(), dynamic, dynamic (+6 more)

### Community 3 - "profile/page.tsx"
Cohesion: 0.14
Nodes (9): dynamic, OfficerProfilePage(), ProfileMenu(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord, TaskRecord (+1 more)

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
Cohesion: 0.11
Nodes (19): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, jose, next, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+11 more)

### Community 9 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tsx (+13 more)

### Community 10 - "auth.ts"
Cohesion: 0.15
Nodes (18): POST(), dynamic, LoginPage(), dynamic, Home(), clearSession(), cookieName(), createSession() (+10 more)

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

### Community 19 - "officer-day.tsx"
Cohesion: 0.12
Nodes (21): CropCycleDetailPage(), dynamic, Farm, roles, User, Attendance, Exception, LocationRequest (+13 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "prisma.ts"
Cohesion: 0.08
Nodes (35): PATCH(), POST(), validActivationFrom, POST(), schema, farmSchema, GET(), POST() (+27 more)

### Community 24 - "login-form.tsx"
Cohesion: 0.29
Nodes (6): ALTERNATIVE_OFFICERS, LoginForm(), performLogin(), submit(), TEST_PROFILES, TestProfile

### Community 25 - "plot-edit-form.tsx"
Cohesion: 0.25
Nodes (3): options, Plot, PlotEditForm()

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "officer/harvest/page.tsx"
Cohesion: 0.29
Nodes (6): dynamic, OfficerHarvestPage(), Farm, MobileHarvestLogger(), Plot, RecentHarvest

### Community 29 - "useToast"
Cohesion: 0.09
Nodes (19): metadata, viewport, ActivateFarmButton(), FarmStatusControl(), CreateTaskModal(), Farm, Plot, PRESETS (+11 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "downloadUrl"
Cohesion: 0.21
Nodes (15): AgronomyDiagnosticsPage(), dynamic, dynamic, FarmDetailPage(), DiagnosticCase, DiagnosticsWorkbench(), DispatchedRx, FarmHubClient() (+7 more)

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
Cohesion: 0.50
Nodes (3): Graphify — Codebase Knowledge Graph, Ponytail — Lazy Senior Dev Mode, This is NOT the Next.js you know

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

### Community 50 - "audit"
Cohesion: 0.10
Nodes (31): onboardSchema, POST(), GET(), musterSchema, POST(), createSchema, GET(), POST() (+23 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 56 - "crop-cycles/new/page.tsx"
Cohesion: 0.33
Nodes (7): dynamic, NewCropCyclePage(), CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 57 - "apiError"
Cohesion: 0.11
Nodes (30): canViewFarmMedia(), dynamic, GET(), DELETE(), GET(), POST(), schema, farmTransitions (+22 more)

### Community 65 - "incident-report-form.tsx"
Cohesion: 0.10
Nodes (23): cropStages, Cycle, Farm, FieldReports(), submitMonitoring(), Plot, ALL_TYPES, CATEGORIES (+15 more)

### Community 66 - "access.ts"
Cohesion: 0.16
Nodes (14): GET(), GET(), GET(), createSchema, GET(), POST(), GET(), POST() (+6 more)

### Community 68 - "migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 69 - "requireSession"
Cohesion: 0.09
Nodes (22): WorkforceAttendancePage(), AdminAuditPage(), AgronomyPlanningPage(), dynamic, dynamic, OfficerDayPage(), dynamic, OfficerReportsPage() (+14 more)

### Community 72 - "business.ts"
Cohesion: 0.32
Nodes (10): calculatedInfrastructure(), canTransitionTask(), dateFormatter, DEFAULT_GEOFENCE_RADIUS_METERS, isWithinRollingSevenDays(), labourHours(), milestoneTemplates(), taskTransitions (+2 more)

### Community 73 - "owner/calendar/page.tsx"
Cohesion: 0.19
Nodes (10): dynamic, OperationsCalendarPage(), Props, CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+2 more)

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "currentActor"
Cohesion: 0.17
Nodes (17): GET(), POST(), schema, today(), GET(), GET(), POST(), schema (+9 more)

### Community 76 - "navbar.tsx"
Cohesion: 0.12
Nodes (20): BrandLogo(), BrandLogoProps, DesktopSidebar(), DesktopSidebarProps, NavLinkItem, NavSection, CommandPalette(), CommandPaletteProps (+12 more)

### Community 77 - "login/route.ts"
Cohesion: 0.19
Nodes (12): normalizePhone(), POST(), ALLOWED_DIRECT_MIME, POST(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore (+4 more)

### Community 79 - "icons.tsx"
Cohesion: 0.11
Nodes (12): HandoverData, STEPS, BoundaryPoint, InteractiveFarmMap(), InteractiveFarmMapProps, REGION_PRESETS, IconProps, Icons (+4 more)

### Community 82 - "crew/page.tsx"
Cohesion: 0.16
Nodes (11): dynamic, OfficerCrewPage(), dynamic, OfficerQuickLogPage(), MobileOfficerHeader(), MobileOfficerHeaderProps, CATEGORIES, Farm (+3 more)

### Community 83 - "farms/new/page.tsx"
Cohesion: 0.29
Nodes (4): dynamic, NewFarmPage(), ClientOnboardingWizardV2(), FarmForm()

### Community 84 - "weekly-planner.tsx"
Cohesion: 0.25
Nodes (7): PrintableSpraySheet(), PrintableTask, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask

### Community 85 - "app/dashboard/page.tsx"
Cohesion: 0.18
Nodes (9): dynamic, GET(), DashboardPage(), dynamic, AttendanceForm(), AttendanceRecord, Farm, distanceMeters() (+1 more)

### Community 86 - "dashboard-client.tsx"
Cohesion: 0.15
Nodes (13): AuditConsole(), Alert, DashboardClient(), Farm, Incident, MetricData, PendingException, PendingLocation (+5 more)

### Community 89 - "radar/page.tsx"
Cohesion: 0.47
Nodes (4): AgronomyRadarPage(), dynamic, CropRadar(), CropRadarItem

### Community 90 - "accessibleFarmWhere"
Cohesion: 0.24
Nodes (8): dynamic, OwnerInventoryPage(), dynamic, OwnerPlotsPage(), Farm, Plot, PlotsExplorer(), accessibleFarmWhere()

### Community 92 - "brief/page.tsx"
Cohesion: 0.33
Nodes (5): dynamic, OwnerExecutiveBriefPage(), BriefData, ExecutiveBrief(), Farm

### Community 93 - "task-form.tsx"
Cohesion: 0.29
Nodes (5): Access, categories, Farm, Plot, TaskForm()

### Community 94 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 95 - "crop-cycle-edit-form.tsx"
Cohesion: 0.40
Nodes (3): CropCycleEditForm(), Cycle, dateVal()

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 97 - "approvals/page.tsx"
Cohesion: 0.40
Nodes (3): AdminApprovalsPage(), dynamic, ApprovalsConsole()

## Knowledge Gaps
- **603 isolated node(s):** `config`, `nextConfig`, `name`, `version`, `private` (+598 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `formatDate`, `farm-hub-client.tsx`, `breadcrumbs.tsx`, `profile/page.tsx`, `auth.ts`, `officer-day.tsx`, `login-form.tsx`, `plot-edit-form.tsx`, `officer/harvest/page.tsx`, `useToast`, `downloadUrl`, `crop-cycles/new/page.tsx`, `incident-report-form.tsx`, `owner/calendar/page.tsx`, `navbar.tsx`, `crew/page.tsx`, `weekly-planner.tsx`, `app/dashboard/page.tsx`, `dashboard-client.tsx`, `radar/page.tsx`, `accessibleFarmWhere`, `brief/page.tsx`, `task-form.tsx`, `crop-cycle-edit-form.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `requireFarmAccess()` connect `apiError` to `downloadUrl`, `access.ts`, `breadcrumbs.tsx`, `requireSession`, `currentActor`, `login/route.ts`, `audit`, `officer-day.tsx`, `prisma.ts`, `crop-cycles/new/page.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `breadcrumbs.tsx`, `profile/page.tsx`, `auth.ts`, `officer-day.tsx`, `officer/harvest/page.tsx`, `downloadUrl`, `audit`, `crop-cycles/new/page.tsx`, `apiError`, `access.ts`, `requireSession`, `business.ts`, `owner/calendar/page.tsx`, `currentActor`, `login/route.ts`, `agaate-critical.spec.ts`, `crew/page.tsx`, `farms/new/page.tsx`, `app/dashboard/page.tsx`, `radar/page.tsx`, `accessibleFarmWhere`, `brief/page.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `name` to the rest of the system?**
  _603 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatDate` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07196969696969698 - nodes in this community are weakly interconnected._
- **Should `breadcrumbs.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._