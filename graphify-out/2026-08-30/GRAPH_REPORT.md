# Graph Report - agaateapp  (2026-08-30)

## Corpus Check
- 141 files · ~67,202 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 681 nodes · 1402 edges · 72 communities (58 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c4cf126`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- apiError
- dependencies
- farm-hub-client.tsx
- compilerOptions
- business.ts
- devDependencies
- auth.ts
- FarmForm
- requireSession
- plot-edit-form.tsx
- approvals/page.tsx
- storage.ts
- task-form.tsx
- field-reports.tsx
- What You Must Do When Invoked
- edit/page.tsx
- daily/page.tsx
- admin-console.tsx
- day/page.tsx
- crop-cycle-form.tsx
- scripts
- icons.tsx
- layout.tsx
- seed.ts
- 202608300001_initial/migration.sql
- next.config.ts
- next-env.d.ts
- Rate Limiting in FastAPI
- graphify reference: extra exports and benchmark
- React Countdown Timer Component
- Ponytail
- examples/README.md
- Email Validation Function
- Ponytail Help
- Debounce Search Input
- AGAATE — Implementation Status Ledger & Traceability Matrix
- graphify reference: query, path, explain
- csv-sum.md
- package.json
- ponytail-audit/SKILL.md
- Ponytail Gain
- ponytail-review/SKILL.md
- AGAATE — BRD Spec Audit & Deep Comparison Report
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
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- react-countdown.md
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- dashboard-client.tsx
- LocationRequestForm
- @types/bcryptjs

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 80 edges
2. `requireFarmAccess()` - 75 edges
3. `currentActor()` - 57 edges
4. `audit()` - 54 edges
5. `prisma` - 43 edges
6. `Icons` - 32 edges
7. `requireSession()` - 29 edges
8. `requireRole()` - 28 edges
9. `paginationParams()` - 17 edges
10. `utcDateOnly()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AdminApprovalsPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/auth.ts
- `OfficerDayPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/officer/day/page.tsx → src/lib/auth.ts
- `DailyReportPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/reports/daily/page.tsx → src/lib/auth.ts
- `AdminUsersPage()` --calls--> `requireSession()`  [EXTRACTED]
  src/app/admin/users/page.tsx → src/lib/auth.ts
- `GET()` --calls--> `currentActor()`  [EXTRACTED]
  src/app/api/attendance/route.ts → src/lib/access.ts

## Import Cycles
- None detected.

## Communities (72 total, 14 thin omitted)

### Community 0 - "apiError"
Cohesion: 0.08
Nodes (80): PATCH(), GET(), GET(), GET(), POST(), GET(), DELETE(), GET() (+72 more)

### Community 1 - "dependencies"
Cohesion: 0.11
Nodes (19): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, jose, next, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+11 more)

### Community 2 - "farm-hub-client.tsx"
Cohesion: 0.05
Nodes (26): dynamic, FarmDetailPage(), ActivateFarmButton(), EvidenceGallery(), AccessResponse, FarmAccessManager(), Person, FarmEditForm() (+18 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, es2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, src/**/*.ts (+19 more)

### Community 4 - "business.ts"
Cohesion: 0.22
Nodes (17): GET(), POST(), schema, today(), POST(), calculatedInfrastructure(), canTransitionTask(), DEFAULT_GEOFENCE_RADIUS_METERS (+9 more)

### Community 5 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tsx, @types/node (+11 more)

### Community 6 - "auth.ts"
Cohesion: 0.16
Nodes (13): POST(), dynamic, LoginPage(), dynamic, Home(), LoginForm(), clearSession(), createSession() (+5 more)

### Community 8 - "requireSession"
Cohesion: 0.14
Nodes (21): AdminUsersPage(), dynamic, DashboardPage(), dynamic, dynamic, NewFarmPage(), dynamic, OfficerReportsPage() (+13 more)

### Community 9 - "plot-edit-form.tsx"
Cohesion: 0.25
Nodes (3): options, Plot, PlotEditForm()

### Community 10 - "approvals/page.tsx"
Cohesion: 0.25
Nodes (6): AdminApprovalsPage(), dynamic, ApprovalsConsole(), Attendance, Exception, LocationRequest

### Community 11 - "storage.ts"
Cohesion: 0.67
Nodes (6): bucket(), client(), downloadUrl(), env(), headObject(), uploadUrl()

### Community 12 - "task-form.tsx"
Cohesion: 0.29
Nodes (5): Access, categories, Farm, Plot, TaskForm()

### Community 13 - "field-reports.tsx"
Cohesion: 0.22
Nodes (9): cropStages, Cycle, Farm, FieldReports(), handleIncidentSubmit(), handleMonitoringSubmit(), incidentTypes, Plot (+1 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "edit/page.tsx"
Cohesion: 0.32
Nodes (5): dynamic, EditCropCyclePage(), CropCycleEditForm(), Cycle, dateValue()

### Community 16 - "daily/page.tsx"
Cohesion: 0.25
Nodes (5): DailyReportPage(), dynamic, DailyReport(), Farm, Report

### Community 17 - "admin-console.tsx"
Cohesion: 0.25
Nodes (5): Access, AdminConsole(), Farm, roles, User

### Community 18 - "day/page.tsx"
Cohesion: 0.20
Nodes (8): dynamic, OfficerDayPage(), AttendanceForm(), acquireLocation(), handleAttendanceSubmit(), AttendanceRecord, Farm, OfficerDay()

### Community 20 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, db:generate, db:migrate, db:seed, dev, lint, start (+2 more)

### Community 21 - "icons.tsx"
Cohesion: 0.10
Nodes (11): Farm, IconProps, Icons, FollowUp, Farm, DEMO_ACCOUNTS, Task, irrigationOptions (+3 more)

### Community 22 - "layout.tsx"
Cohesion: 0.40
Nodes (3): metadata, viewport, ServiceWorker()

### Community 24 - "202608300001_initial/migration.sql"
Cohesion: 0.23
Nodes (21): "AgronomyPlan", "Attendance", "AttendanceException", "AuditLog", "CropCycle", "CropMonitoring", "CropVariety", "Farm" (+13 more)

### Community 27 - "Rate Limiting in FastAPI"
Cohesion: 0.20
Nodes (10): 1. **Using `slowapi` (Recommended - Easiest)**, 2. **Using `limits` Library (More Control)**, 3. **Custom Middleware (Full Control)**, 4. **Per-User Rate Limiting (With Authentication)**, 5. **Redis-Based Rate Limiting (Production)**, 6. **Complete Example with Multiple Endpoints**, Comparison Table, Rate Limiting in FastAPI (+2 more)

### Community 29 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 32 - "React Countdown Timer Component"
Cohesion: 0.22
Nodes (9): Advanced Timer with Formatted Display, Basic Countdown Timer, CSS Styling, Custom Hook Version, Features, React Countdown Timer Component, Styled Component with Animations, Usage Examples (+1 more)

### Community 33 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 34 - "examples/README.md"
Cohesion: 0.25
Nodes (5): Debounce, Without Ponytail, 116 lines of code, Rate Limiting, Without Ponytail, 128 lines of code, Examples

### Community 35 - "Email Validation Function"
Cohesion: 0.25
Nodes (7): Comparison, Email Validation, Email Validation Function, More Robust Version (with additional checks), Using a Third-Party Library (Recommended for Production), With Ponytail, 3 lines of code, Without Ponytail, 75 lines of code

### Community 36 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 37 - "Debounce Search Input"
Cohesion: 0.29
Nodes (7): Advanced: Debounce with Cancel & Immediate Options, Basic Debounce Function, Debounce Search Input, Enhanced Version with Loading State, HTML Example, Key Benefits, With Ponytail, 10 lines of code

### Community 38 - "AGAATE — Implementation Status Ledger & Traceability Matrix"
Cohesion: 0.29
Nodes (6): 1. Domain Capability-by-Capability Ledger, 2. Requirement Traceability Matrix (BRD vs Implementation), 3. Verification Test Suite Results, 4. Hardening & Debt Resolution — 2026-08-30 Continuation (AUDIT → RESTRUCTURE → COMPLETE → INTEGRATE → VERIFY), 5. End-to-End Completion — Takeover Continuation 2026-08-30 (finish all features), AGAATE — Implementation Status Ledger & Traceability Matrix

### Community 39 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 40 - "csv-sum.md"
Cohesion: 0.33
Nodes (5): Alternative methods:, CSV Sum, Python code to read sales.csv and sum the 'amount' column, With Ponytail, 3 lines of code, Without Ponytail, 20 lines of code

### Community 41 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 42 - "ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 43 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 44 - "ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 45 - "AGAATE — BRD Spec Audit & Deep Comparison Report"
Cohesion: 0.40
Nodes (4): 1. Executive Summary & Verification Matrix, 2. Detailed Gap Analysis Findings, 3. Verification Commands & Outputs, AGAATE — BRD Spec Audit & Deep Comparison Report

### Community 46 - "Agaate Farm Management PWA"
Cohesion: 0.40
Nodes (4): Agaate Farm Management PWA, Current coverage, Run locally, Security and persistence

### Community 47 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Graphify — Codebase Knowledge Graph, Ponytail — Lazy Senior Dev Mode, This is NOT the Next.js you know

### Community 48 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 49 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 50 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 51 - "ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 52 - "Deep Clone"
Cohesion: 0.50
Nodes (3): Deep Clone, With Ponytail, Without Ponytail

### Community 53 - "Group By"
Cohesion: 0.50
Nodes (3): Group By, With Ponytail, Without Ponytail

### Community 54 - "Infinite Scroll"
Cohesion: 0.50
Nodes (3): Infinite Scroll, With Ponytail, Without Ponytail

### Community 55 - "Modal Dialog"
Cohesion: 0.50
Nodes (3): Modal Dialog, With Ponytail, Without Ponytail

### Community 56 - "Number Formatting"
Cohesion: 0.50
Nodes (3): Number Formatting, With Ponytail, Without Ponytail

### Community 57 - "URL Parameters"
Cohesion: 0.50
Nodes (3): URL Parameters, With Ponytail, Without Ponytail

### Community 69 - "dashboard-client.tsx"
Cohesion: 0.50
Nodes (3): DashboardClient(), Farm, MetricData

## Knowledge Gaps
- **281 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+276 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireFarmAccess()` connect `apiError` to `requireSession`, `farm-hub-client.tsx`, `business.ts`, `edit/page.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Icons` connect `icons.tsx` to `farm-hub-client.tsx`, `dashboard-client.tsx`, `auth.ts`, `requireSession`, `plot-edit-form.tsx`, `approvals/page.tsx`, `task-form.tsx`, `field-reports.tsx`, `edit/page.tsx`, `daily/page.tsx`, `admin-console.tsx`, `day/page.tsx`, `crop-cycle-form.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `prisma` connect `apiError` to `farm-hub-client.tsx`, `business.ts`, `auth.ts`, `requireSession`, `edit/page.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _281 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `apiError` be split into smaller, more focused modules?**
  _Cohesion score 0.07871064467766117 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `farm-hub-client.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05426356589147287 - nodes in this community are weakly interconnected._