# Graph Report - agaateapp  (2026-09-09)

## Corpus Check
- 250 files · ~243,781 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1396 nodes · 3318 edges · 98 communities (83 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eb9dae50`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- business.ts
- farm-hub-client.tsx
- requireSession
- planning/page.tsx
- compilerOptions
- What You Must Do When Invoked
- Agaate Design System v1.0
- 4.2 Farm Admin Surfaces (Client / Farm Owner Cockpit)
- dependencies
- devDependencies
- Icons
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
- prisma.ts
- officer-day.tsx
- plot-edit-form.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- tasks-queue.tsx
- useToast
- graphify reference: query, path, explain
- csv-sum.md
- Agaate Farm Management PWA — Engineering Plan
- storage.ts
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
- seed-scale.ts
- diagnostics/page.tsx
- requireFarmAccess
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- officer/calendar/page.tsx
- weekly-planner.tsx
- auth.ts
- migration.sql
- apiError
- utcDateOnly
- No AI slop
- build-docs-html.mjs
- farms/new/page.tsx
- icons.tsx
- admin-console.tsx
- agaate-critical.spec.ts
- plots/page.tsx
- accessibleFarmWhere
- [cycleId]/page.tsx
- validation.ts
- No AI slop eval
- workforce-attendance-console.tsx
- @types/bcryptjs
- Documentation Index
- crop-cycle-form.tsx
- No AI Slop — Human Writing & Anti-Slop Guidelines
- location-request-form.tsx
- LoginForm
- design-guard.test.ts
- edit/page.tsx
- middleware.ts
- Navbar

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 131 edges
2. `requireFarmAccess()` - 109 edges
3. `currentActor()` - 108 edges
4. `prisma` - 91 edges
5. `audit()` - 86 edges
6. `requireSession()` - 71 edges
7. `Icons` - 66 edges
8. `useToast()` - 57 edges
9. `requireRole()` - 52 edges
10. `accessibleFarmWhere()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/dashboard/page.tsx → src/lib/auth.ts
- `NewFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/farms/new/page.tsx → src/lib/auth.ts
- `OfficerDayPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/officer/day/page.tsx → src/lib/auth.ts
- `OfficerReportsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/officer/reports/page.tsx → src/lib/auth.ts
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (98 total, 15 thin omitted)

### Community 0 - "business.ts"
Cohesion: 0.05
Nodes (49): RFC-4180, dynamic, GET(), dynamic, OwnerDashboardPage(), dynamic, OwnerInventoryPage(), Farm (+41 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.06
Nodes (23): dynamic, FarmDetailPage(), AccessResponse, FarmAccessManager(), Person, Farm, FarmEditForm(), CropCycle (+15 more)

### Community 2 - "requireSession"
Cohesion: 0.08
Nodes (30): AdminApprovalsPage(), dynamic, dynamic, WorkforceAttendancePage(), AdminAuditPage(), dynamic, AdminUsersPage(), dynamic (+22 more)

### Community 3 - "planning/page.tsx"
Cohesion: 0.50
Nodes (3): AgronomyPlanningPage(), dynamic, WeeklyPlanner()

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

### Community 10 - "Icons"
Cohesion: 0.10
Nodes (22): dynamic, BrandLogo(), BrandLogoProps, Icons, DesktopSidebar(), DesktopSidebarProps, NavLinkItem, NavSection (+14 more)

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
Cohesion: 0.19
Nodes (12): normalizePhone(), POST(), ALLOWED_DIRECT_MIME, POST(), acquireRateLimitSlot(), clearRateLimitStore(), RateLimitRecord, rateLimitStore (+4 more)

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
Nodes (33): PATCH(), GET(), POST(), validActivationFrom, POST(), schema, dynamic, PATCH() (+25 more)

### Community 24 - "officer-day.tsx"
Cohesion: 0.14
Nodes (12): dynamic, OfficerDayPage(), AttendanceForm(), AttendanceRecord, Farm, getCategoryEmoji(), getCategoryShortLabel(), OfficerDay() (+4 more)

### Community 25 - "plot-edit-form.tsx"
Cohesion: 0.25
Nodes (3): options, Plot, PlotEditForm()

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "tasks-queue.tsx"
Cohesion: 0.13
Nodes (14): Column, ServerTable(), ServerTableProps, ServerListState, useServerList(), Client, ClientsDirectory(), Farm (+6 more)

### Community 29 - "useToast"
Cohesion: 0.09
Nodes (20): metadata, viewport, ActivateFarmButton(), CalendarEventsData, CalendarHarvest, CalendarIncident, CalendarTask, FarmOption (+12 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 32 - "Agaate Farm Management PWA — Engineering Plan"
Cohesion: 0.08
Nodes (25): 1.1 What's Built, 1.2 Tech Debt & Known Limitations, 1. Current Implementation Status, 2.1 Page Inventory (17 pages), 2.2 API Inventory (44 endpoints), 2.3 Component Inventory (34+ components), 2. Architecture Inventory, 3.1 Local Setup (+17 more)

### Community 33 - "storage.ts"
Cohesion: 0.18
Nodes (15): dynamic, OfficerProfilePage(), getCategoryEmoji(), getCategoryShortLabel(), IncidentRecord, OfficerProfileProps, OfficerProfileView(), ShiftRecord (+7 more)

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

### Community 50 - "audit"
Cohesion: 0.09
Nodes (31): POST(), onboardSchema, POST(), PATCH(), updateStageSchema, bulkSchema, POST(), bulkSchema (+23 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Presence & Geofence Verification Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 55 - "seed-scale.ts"
Cohesion: 0.24
Nodes (9): main(), prisma, BIZ_SUFFIXES, chunkedInsert(), ENTITY_TYPES, FIRST_NAMES, LAST_NAMES, REGIONS (+1 more)

### Community 56 - "diagnostics/page.tsx"
Cohesion: 0.43
Nodes (5): AgronomyDiagnosticsPage(), dynamic, DiagnosticCase, DiagnosticsWorkbench(), DispatchedRx

### Community 57 - "requireFarmAccess"
Cohesion: 0.09
Nodes (33): canViewFarmMedia(), dynamic, GET(), DELETE(), GET(), POST(), schema, farmTransitions (+25 more)

### Community 65 - "weekly-planner.tsx"
Cohesion: 0.08
Nodes (33): PrintableSpraySheet(), PrintableTask, Farm, Officer, Plot, RECIPE_PRESETS, ScheduledTask, cropStages (+25 more)

### Community 66 - "auth.ts"
Cohesion: 0.16
Nodes (17): POST(), LoginPage(), dynamic, Home(), clearSession(), cookieName(), createSession(), getSession() (+9 more)

### Community 68 - "migration.sql"
Cohesion: 0.25
Nodes (21): `AgronomyPlan`, `Attendance`, `AttendanceException`, `AuditLog`, `CropCycle`, `CropMonitoring`, `CropVariety`, `Farm` (+13 more)

### Community 69 - "apiError"
Cohesion: 0.12
Nodes (42): createClientSchema, GET(), POST(), GET(), GET(), GET(), GET(), GET() (+34 more)

### Community 72 - "utcDateOnly"
Cohesion: 0.31
Nodes (8): GET(), POST(), schema, today(), GET(), manualSchema, POST(), utcDateOnly()

### Community 73 - "No AI slop"
Cohesion: 0.25
Nodes (7): Editing principles, No AI slop, Patterns to cut, Two jobs, What to ask for, Words to cut, Workflow

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 76 - "icons.tsx"
Cohesion: 0.16
Nodes (7): ClientOnboardingWizardV2(), HandoverData, STEPS, BoundaryPoint, InteractiveFarmMap(), InteractiveFarmMapProps, IconProps

### Community 77 - "admin-console.tsx"
Cohesion: 0.12
Nodes (8): AdminConsole(), AssignedFarm, ClientInfo, FarmAccessInfo, FarmSearchResult, ROLES, User, RoleBadge()

### Community 79 - "plots/page.tsx"
Cohesion: 0.33
Nodes (5): dynamic, OwnerPlotsPage(), Farm, Plot, PlotsExplorer()

### Community 82 - "accessibleFarmWhere"
Cohesion: 0.08
Nodes (25): AgronomyRadarPage(), dynamic, dynamic, OfficerCrewPage(), dynamic, OfficerHarvestPage(), dynamic, OfficerQuickLogPage() (+17 more)

### Community 83 - "[cycleId]/page.tsx"
Cohesion: 0.11
Nodes (18): CropCycleDetailPage(), dynamic, ApprovalsConsole(), Attendance, Exception, LocationRequest, ClientDirectoryItem, DashboardClientProps (+10 more)

### Community 84 - "validation.ts"
Cohesion: 0.29
Nodes (6): dateStr, farmId, irrigationType, lat, lng, soilType

### Community 85 - "No AI slop eval"
Cohesion: 0.33
Nodes (5): Editing principles, Final read, No AI slop eval, Patterns to cut, Words to cut

### Community 86 - "workforce-attendance-console.tsx"
Cohesion: 0.13
Nodes (16): AuditConsole(), AuditLog, DailyReport(), Farm, Report, CropStage, FollowUp, IncidentItem (+8 more)

### Community 89 - "crop-cycle-form.tsx"
Cohesion: 0.53
Nodes (5): CropCycleForm(), addPresetSupport(), submit(), validate(), iso()

### Community 90 - "No AI Slop — Human Writing & Anti-Slop Guidelines"
Cohesion: 0.40
Nodes (4): Banned Words & Cliches, Core Rules, No AI Slop — Human Writing & Anti-Slop Guidelines, Two Modes (Skill `/no-ai-slop`)

### Community 93 - "LoginForm"
Cohesion: 0.83
Nodes (4): LoginForm(), handleQuickLogin(), performLogin(), submit()

### Community 95 - "edit/page.tsx"
Cohesion: 0.28
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateVal()

### Community 96 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isApiMutation(), middleware(), originAllowed()

### Community 98 - "Navbar"
Cohesion: 0.12
Nodes (15): DashboardPage(), dynamic, dynamic, OfficerReportsPage(), dynamic, OperationsCalendarPage(), Props, DashboardClient() (+7 more)

## Knowledge Gaps
- **653 isolated node(s):** `config`, `nextConfig`, `name`, `version`, `private` (+648 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `Icons` to `business.ts`, `farm-hub-client.tsx`, `requireSession`, `officer-day.tsx`, `plot-edit-form.tsx`, `tasks-queue.tsx`, `useToast`, `storage.ts`, `diagnostics/page.tsx`, `weekly-planner.tsx`, `farms/new/page.tsx`, `icons.tsx`, `admin-console.tsx`, `plots/page.tsx`, `accessibleFarmWhere`, `[cycleId]/page.tsx`, `workforce-attendance-console.tsx`, `crop-cycle-form.tsx`, `location-request-form.tsx`, `edit/page.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `business.ts`, `farm-hub-client.tsx`, `requireSession`, `planning/page.tsx`, `Icons`, `login/route.ts`, `storage.ts`, `audit`, `diagnostics/page.tsx`, `requireFarmAccess`, `auth.ts`, `apiError`, `utcDateOnly`, `farms/new/page.tsx`, `agaate-critical.spec.ts`, `plots/page.tsx`, `accessibleFarmWhere`, `[cycleId]/page.tsx`, `edit/page.tsx`, `Navbar`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `requireFarmAccess()` connect `requireFarmAccess` to `business.ts`, `farm-hub-client.tsx`, `requireSession`, `apiError`, `utcDateOnly`, `audit`, `login/route.ts`, `[cycleId]/page.tsx`, `prisma.ts`, `edit/page.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `name` to the rest of the system?**
  _653 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `business.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054274084124830396 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05731707317073171 - nodes in this community are weakly interconnected._
- **Should `requireSession` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._