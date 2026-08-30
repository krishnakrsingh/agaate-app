# Graph Report - agaateapp  (2026-08-30)

## Corpus Check
- 195 files · ~124,309 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1075 nodes · 2188 edges · 92 communities (75 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41da0835`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- apiError
- farm-hub-client.tsx
- requireSession
- icons.tsx
- compilerOptions
- What You Must Do When Invoked
- 202608300001_initial/migration.sql
- stage5-e2e.test.ts
- dependencies
- devDependencies
- auth.ts
- Agaate Farm Management PWA — Design Brief
- field-reports.tsx
- Rate Limiting in FastAPI
- 4. Feature Specifications
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- approvals/page.tsx
- officer-day.tsx
- examples/README.md
- Email Validation Function
- Ponytail Help
- edit/page.tsx
- admin-console.tsx
- [plotId]/page.tsx
- Debounce Search Input
- Agaate Farm Management PWA — Technical Design Document (TDD)
- tasks/new/page.tsx
- storage.ts
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
- toast.tsx
- Agaate Farm Management PWA — User Flows
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- seed.ts
- farms/new/page.tsx
- reports/page.tsx
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- biometric/page.tsx
- login/route.ts
- final-acceptance-proof.ts
- fetch-face-models.mjs
- build-docs-html.mjs
- LivenessChallenge
- attendance-form.tsx
- Face Recognition Models
- agaate-critical.spec.ts
- fetch-bins.mjs
- scripts
- navbar.tsx
- CropCycleForm
- package.json
- daily/page.tsx
- farm-access-manager.tsx
- Documentation Index
- mobile-audit.mjs
- next
- @simplewebauthn/server

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 103 edges
2. `currentActor()` - 78 edges
3. `requireFarmAccess()` - 77 edges
4. `audit()` - 71 edges
5. `prisma` - 63 edges
6. `Icons` - 41 edges
7. `requireSession()` - 35 edges
8. `requireRole()` - 28 edges
9. `4. Feature Specifications` - 23 edges
10. `utcDateOnly()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts
- `NewFarmPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/farms/new/page.tsx → src/lib/auth.ts
- `OfficerReportsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/officer/reports/page.tsx → src/lib/auth.ts
- `DailyReportPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/reports/daily/page.tsx → src/lib/auth.ts
- `BiometricPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/settings/biometric/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (92 total, 17 thin omitted)

### Community 0 - "apiError"
Cohesion: 0.06
Nodes (105): PATCH(), GET(), GET(), GET(), POST(), schema, today(), GET() (+97 more)

### Community 1 - "farm-hub-client.tsx"
Cohesion: 0.08
Nodes (16): EvidenceGallery(), Farm, FarmEditForm(), CropCycle, Farm, Incident, Milestone, Monitoring (+8 more)

### Community 2 - "requireSession"
Cohesion: 0.19
Nodes (13): AdminUsersPage(), dynamic, dynamic, OfficerDayPage(), CropCycleDetailPage(), dynamic, dynamic, NewCropCyclePage() (+5 more)

### Community 3 - "icons.tsx"
Cohesion: 0.10
Nodes (14): dynamic, VerifyResult, ActiveIncident, DashboardClient(), Farm, MetricData, PoorHealthAlert, IconProps (+6 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, es2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, src/**/*.ts (+19 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 6 - "202608300001_initial/migration.sql"
Cohesion: 0.16
Nodes (25): "AgronomyPlan", "Attendance", "AttendanceException", "AuditLog", "CropCycle", "CropMonitoring", "CropVariety", "Farm" (+17 more)

### Community 7 - "stage5-e2e.test.ts"
Cohesion: 0.06
Nodes (42): POST(), schema, POST(), schema, POST(), schema, POST(), schema (+34 more)

### Community 8 - "dependencies"
Cohesion: 0.09
Nodes (23): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, jose, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs (+15 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tsx (+15 more)

### Community 10 - "auth.ts"
Cohesion: 0.47
Nodes (4): POST(), clearSession(), secret, Session

### Community 11 - "Agaate Farm Management PWA — Design Brief"
Cohesion: 0.05
Nodes (42): 1.1 Core Principles, 1.2 Design Tone, 1. Design Philosophy, 2.1 Color Palette, 2.2 Typography, 2.3 Spacing System, 2. Brand Identity, 3.1 Shell Layout (+34 more)

### Community 12 - "field-reports.tsx"
Cohesion: 0.20
Nodes (10): cropStages, Cycle, Farm, FieldReports(), handleIncidentSubmit(), handleMonitoringSubmit(), FieldReportsProps, incidentTypes (+2 more)

### Community 13 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 14 - "4. Feature Specifications"
Cohesion: 0.05
Nodes (40): 1. Executive Summary, 2. Platform Hierarchy, 3.1 Super Admin (Agaate), 3.2 Farm Admin, 3.3 Agronomist (Central Agaate Team), 3.4 Farm Officer, 3. User Roles & Permissions, 4. Feature Specifications (+32 more)

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 16 - "React Countdown Timer Component"
Cohesion: 0.22
Nodes (9): Advanced Timer with Formatted Display, Basic Countdown Timer, CSS Styling, Custom Hook Version, Features, React Countdown Timer Component, Styled Component with Animations, Usage Examples (+1 more)

### Community 17 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 18 - "approvals/page.tsx"
Cohesion: 0.25
Nodes (6): AdminApprovalsPage(), dynamic, ApprovalsConsole(), Attendance, Exception, LocationRequest

### Community 19 - "officer-day.tsx"
Cohesion: 0.18
Nodes (9): Farm, Report, Task, Task, TaskCompletionForm(), PriorityBadge(), StatusBadge(), EmptyState() (+1 more)

### Community 20 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 21 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 22 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 23 - "edit/page.tsx"
Cohesion: 0.32
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateValue()

### Community 24 - "admin-console.tsx"
Cohesion: 0.25
Nodes (5): Access, AdminConsole(), Farm, roles, User

### Community 25 - "[plotId]/page.tsx"
Cohesion: 0.20
Nodes (5): dynamic, PlotPage(), options, Plot, PlotEditForm()

### Community 26 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 27 - "Agaate Farm Management PWA — Technical Design Document (TDD)"
Cohesion: 0.06
Nodes (35): 1.1 Tech Stack, 1.2 Architecture Pattern, 1.3 Key Architectural Decisions, 1. System Architecture Overview, 2. Directory Structure, 3.1 Entity-Relationship Overview, 3.2 Core Models (20 models), 3.3 Authentication Models (+27 more)

### Community 28 - "tasks/new/page.tsx"
Cohesion: 0.22
Nodes (7): dynamic, NewTaskPage(), Access, categories, Farm, Plot, TaskForm()

### Community 29 - "storage.ts"
Cohesion: 0.67
Nodes (6): bucket(), client(), downloadUrl(), env(), headObject(), uploadUrl()

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
Cohesion: 0.33
Nodes (4): metadata, viewport, ServiceWorker(), ToastProvider()

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

### Community 50 - "toast.tsx"
Cohesion: 0.12
Nodes (14): ActivateFarmButton(), FarmStatusControl(), Farm, Manual, ManualWeatherForm(), load(), submit(), OfficerDay() (+6 more)

### Community 51 - "Agaate Farm Management PWA — User Flows"
Cohesion: 0.09
Nodes (22): 10. Biometric Enrollment Flow, 11. Page Navigation Map, 1. High-Level System Flow, 2. Authentication Flow, 3.1 Create Farm, 3.2 Create User, 3. Super Admin: Farm & User Management, 4.1 Complete Farm Setup (+14 more)

### Community 56 - "farms/new/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, NewFarmPage(), FarmForm()

### Community 57 - "reports/page.tsx"
Cohesion: 0.33
Nodes (3): dynamic, OfficerReportsPage(), LocationRequestForm()

### Community 64 - "biometric/page.tsx"
Cohesion: 0.16
Nodes (7): BiometricPage(), dynamic, dynamic, PasskeysPage(), FaceVerify(), WebAuthnCredentials(), WebAuthnRegister()

### Community 66 - "login/route.ts"
Cohesion: 0.18
Nodes (14): POST(), LoginPage(), dynamic, Home(), createSession(), getSession(), requireActiveUser(), requireSecret() (+6 more)

### Community 72 - "final-acceptance-proof.ts"
Cohesion: 0.43
Nodes (6): loginAndGetCookie(), record(), reports, runAcceptanceProof(), TestReport, uploadAndVerifyMedia()

### Community 73 - "fetch-face-models.mjs"
Cohesion: 0.33
Nodes (4): bases, essential, files, outDir

### Community 74 - "build-docs-html.mjs"
Cohesion: 0.40
Nodes (4): docFiles, docsData, docsDir, outputFile

### Community 75 - "LivenessChallenge"
Cohesion: 0.50
Nodes (3): LivenessChallenge(), ensureModels(), startCamera()

### Community 76 - "attendance-form.tsx"
Cohesion: 0.16
Nodes (12): AttendanceForm(), acquireLocation(), handleAttendanceSubmit(), AttendanceRecord, calculateDistanceMeters(), Farm, BiometricFaceScanner(), captureLiveSnapshot() (+4 more)

### Community 82 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, build:docs, db:generate, db:migrate, db:seed, dev, fetch:face-models (+5 more)

### Community 83 - "navbar.tsx"
Cohesion: 0.24
Nodes (7): DashboardPage(), dynamic, dynamic, FarmDetailPage(), FarmHubClient(), LogoutButton(), Navbar()

### Community 84 - "CropCycleForm"
Cohesion: 0.38
Nodes (4): CropCycleForm(), nextStep(), validateStep(), iso()

### Community 85 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 86 - "daily/page.tsx"
Cohesion: 0.33
Nodes (3): DailyReportPage(), dynamic, DailyReport()

### Community 87 - "farm-access-manager.tsx"
Cohesion: 0.33
Nodes (3): AccessResponse, FarmAccessManager(), Person

## Knowledge Gaps
- **478 isolated node(s):** `urls`, `nextConfig`, `name`, `version`, `private` (+473 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icons` connect `icons.tsx` to `biometric/page.tsx`, `farm-hub-client.tsx`, `requireSession`, `stage5-e2e.test.ts`, `attendance-form.tsx`, `field-reports.tsx`, `approvals/page.tsx`, `toast.tsx`, `CropCycleForm`, `officer-day.tsx`, `farm-access-manager.tsx`, `edit/page.tsx`, `admin-console.tsx`, `navbar.tsx`, `tasks/new/page.tsx`, `[plotId]/page.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `requireFarmAccess()` connect `apiError` to `[plotId]/page.tsx`, `requireSession`, `navbar.tsx`, `edit/page.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `prisma` connect `apiError` to `biometric/page.tsx`, `login/route.ts`, `requireSession`, `stage5-e2e.test.ts`, `final-acceptance-proof.ts`, `auth.ts`, `agaate-critical.spec.ts`, `navbar.tsx`, `edit/page.tsx`, `[plotId]/page.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `urls`, `nextConfig`, `name` to the rest of the system?**
  _478 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.06252149982800137 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._
- **Should `icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09655172413793103 - nodes in this community are weakly interconnected._