# Graph Report - agaateapp  (2026-09-08)

## Corpus Check
- 225 files · ~191,039 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1244 nodes · 2828 edges · 95 communities (74 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e60d0e68`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- inventory-console.tsx
- farm-hub-client.tsx
- requireSession
- Icons
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- 4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)
- dependencies
- devDependencies
- login/route.ts
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
- apiError
- icons.tsx
- task-form.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- dashboard-client.tsx
- field-reports.tsx
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- toast.tsx
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
- approvals-console.tsx
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed.ts
- crop-cycle-form.tsx
- officer-signals-console.tsx
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- useToast
- incident-report-form.tsx
- auth.ts
- migration.sql
- client-onboarding-wizard-v2.tsx
- downloadUrl
- operations-calendar.tsx
- build-docs-html.mjs
- accessibleFarmWhere
- admin-console.tsx
- Face Recognition Models
- agaate-critical.spec.ts
- fetch-bins.mjs
- business.ts
- weekly-planner.tsx
- calendar/page.tsx
- radar/page.tsx
- owner/dashboard/page.tsx
- @types/bcryptjs
- Documentation Index
- mobile-audit.mjs
- owner/harvest/page.tsx
- daily/page.tsx
- quick-log/page.tsx
- navbar.tsx

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 108 edges
2. `requireFarmAccess()` - 96 edges
3. `currentActor()` - 83 edges
4. `prisma` - 80 edges
5. `audit()` - 68 edges
6. `requireSession()` - 65 edges
7. `Icons` - 62 edges
8. `useToast()` - 49 edges
9. `accessibleFarmWhere()` - 47 edges
10. `Navbar()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `AdminUsersPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/users/page.tsx → src/lib/auth.ts
- `DailyReportPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/reports/daily/page.tsx → src/lib/auth.ts
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts
- `WorkforceAttendancePage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/attendance/page.tsx → src/lib/auth.ts
- `AdminAuditPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/audit/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (95 total, 21 thin omitted)

### Community 0 - "inventory-console.tsx"
Cohesion: 0.12
Nodes (17): RFC-4180, Farm, MobileCrewMuster(), MusterRecord, Expense, Farm, FinancialsConsole(), Farm (+9 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.07
Nodes (19): AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm(), CropCycle, Farm, Incident (+11 more)

### Community 2 - "requireSession"
Cohesion: 0.09
Nodes (27): AdminApprovalsPage(), dynamic, dynamic, WorkforceAttendancePage(), AdminAuditPage(), dynamic, dynamic, NewFarmPage() (+19 more)

### Community 3 - "Icons"
Cohesion: 0.11
Nodes (17): dynamic, Icons, DesktopSidebar(), DesktopSidebarProps, NavLinkItem, NavSection, ALTERNATIVE_OFFICERS, LoginForm() (+9 more)

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

### Community 10 - "login/route.ts"
Cohesion: 0.23
Nodes (7): POST(), createSession(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore, resetRateLimit()

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
Nodes (13): DailyReport(), Farm, Report, OfficerDay(), Task, Farm, OwnerCockpit(), OwnerCockpitProps (+5 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "apiError"
Cohesion: 0.05
Nodes (124): onboardSchema, POST(), PATCH(), GET(), GET(), dynamic, GET(), GET() (+116 more)

### Community 24 - "icons.tsx"
Cohesion: 0.12
Nodes (6): FarmForm(), IconProps, Farm, CommandPalette(), CommandPaletteProps, SearchableItem

### Community 25 - "task-form.tsx"
Cohesion: 0.09
Nodes (11): CropCycleEditForm(), Cycle, dateVal(), options, Plot, PlotEditForm(), Access, categories (+3 more)

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "dashboard-client.tsx"
Cohesion: 0.14
Nodes (14): Alert, DashboardClient(), Farm, Incident, MetricData, PendingException, PendingLocation, RosterPreviewItem (+6 more)

### Community 29 - "field-reports.tsx"
Cohesion: 0.17
Nodes (12): cropStages, Cycle, Farm, FieldReports(), submitIncident(), submitMonitoring(), incidentTypes, Plot (+4 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "toast.tsx"
Cohesion: 0.22
Nodes (7): metadata, viewport, ToastContext, ToastContextType, ToastMessage, ToastProvider(), ToastType

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

### Community 50 - "approvals-console.tsx"
Cohesion: 0.21
Nodes (8): ApprovalsConsole(), Attendance, Exception, LocationRequest, AuditConsole(), AuditLog, EmptyState(), formatDateTime()

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 56 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 57 - "officer-signals-console.tsx"
Cohesion: 0.29
Nodes (4): LocationRequestForm(), CropStage, IncidentItem, OfficerSignalsConsole()

### Community 64 - "useToast"
Cohesion: 0.08
Nodes (27): dynamic, ActivateFarmButton(), CropRadar(), CropRadarItem, DiagnosticCase, DiagnosticsWorkbench(), DispatchedRx, Farm (+19 more)

### Community 65 - "incident-report-form.tsx"
Cohesion: 0.23
Nodes (10): Cycle, Farm, IncidentReportForm(), handleSubmit(), incidentTypes, Plot, PhotoItem, PhotoUploadZone() (+2 more)

### Community 66 - "auth.ts"
Cohesion: 0.27
Nodes (10): POST(), LoginPage(), dynamic, Home(), clearSession(), getSession(), requireActiveUser(), requireSecret() (+2 more)

### Community 68 - "migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 69 - "client-onboarding-wizard-v2.tsx"
Cohesion: 0.28
Nodes (7): ClientOnboardingWizardV2(), HandoverData, STEPS, BoundaryPoint, InteractiveFarmMap(), InteractiveFarmMapProps, REGION_PRESETS

### Community 72 - "downloadUrl"
Cohesion: 0.27
Nodes (11): dynamic, GET(), dynamic, FarmDetailPage(), FarmHubClient(), bucket(), client(), downloadUrl() (+3 more)

### Community 73 - "operations-calendar.tsx"
Cohesion: 0.22
Nodes (7): CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption, OperationsCalendar(), OperationsCalendarProps

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "accessibleFarmWhere"
Cohesion: 0.11
Nodes (17): AgronomyDiagnosticsPage(), DashboardPage(), dynamic, dynamic, OfficerHarvestPage(), dynamic, OwnerFinancialsPage(), dynamic (+9 more)

### Community 76 - "admin-console.tsx"
Cohesion: 0.25
Nodes (5): AdminConsole(), Farm, roles, User, RoleBadge()

### Community 82 - "business.ts"
Cohesion: 0.14
Nodes (19): loginAndGetCookie(), record(), reports, runAcceptanceProof(), TestReport, uploadAndVerifyMedia(), AttendanceForm(), AttendanceRecord (+11 more)

### Community 83 - "weekly-planner.tsx"
Cohesion: 0.22
Nodes (8): PrintableSpraySheet(), PrintableTask, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask, WeeklyPlanner()

### Community 84 - "calendar/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, OperationsCalendarPage(), Props

### Community 98 - "navbar.tsx"
Cohesion: 0.18
Nodes (13): AdminUsersPage(), dynamic, AgronomyPlanningPage(), dynamic, dynamic, OfficerCrewPage(), getMobileNavForRole(), getNavForRole() (+5 more)

## Knowledge Gaps
- **588 isolated node(s):** `urls`, `nextConfig`, `name`, `version`, `private` (+583 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `Icons` to `inventory-console.tsx`, `farm-hub-client.tsx`, `requireSession`, `officer-day.tsx`, `icons.tsx`, `task-form.tsx`, `dashboard-client.tsx`, `field-reports.tsx`, `toast.tsx`, `approvals-console.tsx`, `crop-cycle-form.tsx`, `officer-signals-console.tsx`, `useToast`, `incident-report-form.tsx`, `client-onboarding-wizard-v2.tsx`, `operations-calendar.tsx`, `admin-console.tsx`, `business.ts`, `weekly-planner.tsx`, `navbar.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `prisma` connect `apiError` to `useToast`, `navbar.tsx`, `requireSession`, `Icons`, `auth.ts`, `downloadUrl`, `login/route.ts`, `accessibleFarmWhere`, `agaate-critical.spec.ts`, `business.ts`, `calendar/page.tsx`, `radar/page.tsx`, `owner/dashboard/page.tsx`, `owner/harvest/page.tsx`, `quick-log/page.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `requireFarmAccess()` connect `apiError` to `downloadUrl`, `requireSession`, `business.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `urls`, `nextConfig`, `name` to the rest of the system?**
  _588 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inventory-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `requireSession` be split into smaller, more focused modules?**
  _Cohesion score 0.09487179487179487 - nodes in this community are weakly interconnected._