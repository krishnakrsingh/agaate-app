# Graph Report - agaateapp  (2026-09-08)

## Corpus Check
- 220 files · ~172,170 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1217 nodes · 2711 edges · 102 communities (77 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40a21f71`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- apiError
- farm-hub-client.tsx
- requireSession
- icons.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- 4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)
- dependencies
- devDependencies
- admin-console.tsx
- Agaate Farm Management PWA — Design Brief
- scripts
- Rate Limiting in FastAPI
- 4. Feature Specifications
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- package.json
- [cycleId]/page.tsx
- examples/README.md
- Email Validation Function
- Ponytail Help
- app/dashboard/page.tsx
- dashboard-client.tsx
- [plotId]/page.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- task-form.tsx
- field-reports.tsx
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- layout.tsx
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
- incident-report-form.tsx
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed.ts
- CropCycleForm
- officer-signals-console.tsx
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- useToast
- auth.ts
- migration.sql
- sw.js
- business.ts
- owner/harvest/page.tsx
- build-docs-html.mjs
- weekly-planner.tsx
- inventory/page.tsx
- Face Recognition Models
- agaate-critical.spec.ts
- fetch-bins.mjs
- manual-weather-form.tsx
- attendance-form.tsx
- officer-day.tsx
- workforce-attendance-console.tsx
- @types/bcryptjs
- Documentation Index
- mobile-audit.mjs
- button.tsx
- farm-access-manager.tsx
- farm-edit-form.tsx
- plot-form.tsx
- incident-followup.tsx
- quick-log/page.tsx
- LoginForm
- ProfileMenu
- FarmForm
- DailyReport
- LocationRequestForm

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 107 edges
2. `requireFarmAccess()` - 96 edges
3. `currentActor()` - 82 edges
4. `prisma` - 74 edges
5. `audit()` - 69 edges
6. `requireSession()` - 61 edges
7. `Icons` - 58 edges
8. `useToast()` - 49 edges
9. `accessibleFarmWhere()` - 41 edges
10. `requireRole()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts
- `WorkforceAttendancePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/attendance/page.tsx → src/lib/auth.ts
- `AdminAuditPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/audit/page.tsx → src/lib/auth.ts
- `AdminUsersPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/users/page.tsx → src/lib/auth.ts
- `AgronomyDiagnosticsPage()` --calls--> `accessibleFarmWhere()`  [EXTRACTED]
  src/app/agronomy/diagnostics/page.tsx → src/lib/access.ts

## Import Cycles
- None detected.

## Communities (102 total, 25 thin omitted)

### Community 0 - "apiError"
Cohesion: 0.06
Nodes (119): onboardSchema, POST(), PATCH(), GET(), GET(), dynamic, GET(), DELETE() (+111 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.15
Nodes (10): CropCycle, Farm, Incident, Milestone, Monitoring, Plot, FarmStatusControl(), IncidentStatusControl() (+2 more)

### Community 2 - "requireSession"
Cohesion: 0.07
Nodes (45): AdminApprovalsPage(), dynamic, dynamic, WorkforceAttendancePage(), AdminAuditPage(), dynamic, AdminUsersPage(), dynamic (+37 more)

### Community 3 - "icons.tsx"
Cohesion: 0.16
Nodes (6): dynamic, IconProps, Icons, Farm, DEMO_ACCOUNTS, ThemeToggle()

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

### Community 10 - "admin-console.tsx"
Cohesion: 0.25
Nodes (5): AdminConsole(), Farm, roles, User, RoleBadge()

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

### Community 19 - "[cycleId]/page.tsx"
Cohesion: 0.16
Nodes (11): CropCycleDetailPage(), dynamic, ApprovalsConsole(), Attendance, Exception, LocationRequest, Farm, Task (+3 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "app/dashboard/page.tsx"
Cohesion: 0.15
Nodes (18): AgronomyDiagnosticsPage(), dynamic, dynamic, GET(), DashboardPage(), dynamic, dynamic, FarmDetailPage() (+10 more)

### Community 24 - "dashboard-client.tsx"
Cohesion: 0.22
Nodes (8): Alert, Farm, Incident, MetricData, PendingException, PendingLocation, RosterPreviewItem, WorkforceSummary

### Community 25 - "[plotId]/page.tsx"
Cohesion: 0.20
Nodes (5): dynamic, PlotPage(), options, Plot, PlotEditForm()

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "task-form.tsx"
Cohesion: 0.29
Nodes (5): Access, categories, Farm, Plot, TaskForm()

### Community 29 - "field-reports.tsx"
Cohesion: 0.23
Nodes (10): cropStages, Cycle, Farm, FieldReports(), submitIncident(), submitMonitoring(), incidentTypes, Plot (+2 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "layout.tsx"
Cohesion: 0.24
Nodes (11): metadata, viewport, ServiceWorker(), OfflineIndicator(), ToastProvider(), enqueueOfflineAction(), getOfflineQueue(), postWithOfflineQueue() (+3 more)

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

### Community 50 - "incident-report-form.tsx"
Cohesion: 0.23
Nodes (10): Cycle, Farm, IncidentReportForm(), handleSubmit(), incidentTypes, Plot, PhotoItem, PhotoUploadZone() (+2 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 56 - "CropCycleForm"
Cohesion: 0.60
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 57 - "officer-signals-console.tsx"
Cohesion: 0.22
Nodes (9): AuditConsole(), AuditLog, Farm, Report, CropStage, IncidentItem, EmptyState(), CardSkeleton() (+1 more)

### Community 64 - "useToast"
Cohesion: 0.07
Nodes (34): AgronomyRadarPage(), dynamic, dynamic, OfficerHarvestPage(), dynamic, OwnerFinancialsPage(), ActivateFarmButton(), Agronomist (+26 more)

### Community 66 - "auth.ts"
Cohesion: 0.09
Nodes (22): POST(), POST(), LoginPage(), dynamic, Home(), dynamic, EditCropCyclePage(), CropCycleEditForm() (+14 more)

### Community 68 - "migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 72 - "business.ts"
Cohesion: 0.15
Nodes (17): loginAndGetCookie(), record(), reports, runAcceptanceProof(), TestReport, uploadAndVerifyMedia(), AttendanceForm(), calculatedInfrastructure() (+9 more)

### Community 73 - "owner/harvest/page.tsx"
Cohesion: 0.29
Nodes (5): dynamic, OwnerHarvestPage(), Farm, HarvestConsole(), HarvestLog

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "weekly-planner.tsx"
Cohesion: 0.22
Nodes (8): AgronomyPlanningPage(), dynamic, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask, WeeklyPlanner()

### Community 76 - "inventory/page.tsx"
Cohesion: 0.29
Nodes (6): dynamic, OwnerInventoryPage(), Farm, InventoryConsole(), InventoryItem, InventoryTx

### Community 82 - "manual-weather-form.tsx"
Cohesion: 0.40
Nodes (5): Farm, Manual, ManualWeatherForm(), load(), submit()

### Community 83 - "attendance-form.tsx"
Cohesion: 0.29
Nodes (4): AttendanceRecord, Farm, CameraCapture(), CameraCaptureProps

### Community 85 - "officer-day.tsx"
Cohesion: 0.29
Nodes (3): OfficerDay(), Task, TaskCompletionForm()

### Community 86 - "workforce-attendance-console.tsx"
Cohesion: 0.33
Nodes (6): DashboardClient(), Estate, RosterItem, Summary, WorkforceAttendanceConsole(), formatTime()

### Community 92 - "farm-access-manager.tsx"
Cohesion: 0.33
Nodes (3): AccessResponse, FarmAccessManager(), Person

### Community 96 - "quick-log/page.tsx"
Cohesion: 0.25
Nodes (7): dynamic, OfficerQuickLogPage(), CATEGORIES, Farm, InventoryItem, Plot, QuickLogger()

### Community 97 - "LoginForm"
Cohesion: 0.83
Nodes (4): LoginForm(), handleQuickFill(), performLogin(), submit()

## Knowledge Gaps
- **572 isolated node(s):** `urls`, `nextConfig`, `name`, `version`, `private` (+567 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `farm-hub-client.tsx`, `requireSession`, `admin-console.tsx`, `[cycleId]/page.tsx`, `app/dashboard/page.tsx`, `dashboard-client.tsx`, `[plotId]/page.tsx`, `task-form.tsx`, `field-reports.tsx`, `layout.tsx`, `incident-report-form.tsx`, `officer-signals-console.tsx`, `useToast`, `auth.ts`, `owner/harvest/page.tsx`, `weekly-planner.tsx`, `inventory/page.tsx`, `manual-weather-form.tsx`, `attendance-form.tsx`, `officer-day.tsx`, `workforce-attendance-console.tsx`, `farm-access-manager.tsx`, `farm-edit-form.tsx`, `plot-form.tsx`, `incident-followup.tsx`, `quick-log/page.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `requireFarmAccess()` connect `apiError` to `requireSession`, `auth.ts`, `business.ts`, `[cycleId]/page.tsx`, `app/dashboard/page.tsx`, `[plotId]/page.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `prisma` connect `apiError` to `useToast`, `quick-log/page.tsx`, `auth.ts`, `requireSession`, `icons.tsx`, `business.ts`, `owner/harvest/page.tsx`, `weekly-planner.tsx`, `inventory/page.tsx`, `agaate-critical.spec.ts`, `[cycleId]/page.tsx`, `app/dashboard/page.tsx`, `[plotId]/page.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `urls`, `nextConfig`, `name` to the rest of the system?**
  _572 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.05567970204841713 - nodes in this community are weakly interconnected._
- **Should `requireSession` be split into smaller, more focused modules?**
  _Cohesion score 0.07093253968253968 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._