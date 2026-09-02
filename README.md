# Agaate Farm Management PWA

Production-oriented Next.js application for multi-farm planning, agronomy activities, and field execution. Business state is stored in MySQL 8 via Prisma ORM; evidence is stored in S3-compatible object storage.

## Documentation Suite

Comprehensive architecture, specifications, design briefs, and user flows are organized in the [`docs/`](file:///c:/Users/krish/Downloads/agaateapp/docs) directory:

- **[01. Product Requirements Document (PRD)](file:///c:/Users/krish/Downloads/agaateapp/docs/01_PRD.md)** — Complete 34-section BRD mapping, 4 user roles, and 22 feature specs.
- **[02. Technical Design Document (TDD)](file:///c:/Users/krish/Downloads/agaateapp/docs/02_TDD.md)** — System architecture, 44 API routes, security, biometric crypto, and S3 pipeline.
- **[03. User Flows & Diagrams](file:///c:/Users/krish/Downloads/agaateapp/docs/03_USER_FLOWS.md)** — 11 Mermaid-rendered end-to-end interactive workflows.
- **[04. Design Brief & UI Spec](file:///c:/Users/krish/Downloads/agaateapp/docs/04_DESIGN_BRIEF.md)** — Design tokens, color palette, mobile-first field UI, and component library.
- **[05. Data Model Reference](file:///c:/Users/krish/Downloads/agaateapp/docs/05_DATA_MODEL.md)** — Prisma schema, 20 models, 14 enums, ER diagram, and DB constraints.
- **[06. Engineering & Ops Plan](file:///c:/Users/krish/Downloads/agaateapp/docs/06_ENGINEERING_PLAN.md)** — Implementation audit, tech debt, production checklist, and AI roadmap.
- **[Interactive HTML Documentation Portal](file:///c:/Users/krish/Downloads/agaateapp/docs/index.html)** — Standalone HTML web portal containing all documents with live search, theme toggle, and rendered diagrams. Regenerate anytime with `npm run build:docs`.

## Run locally

1. Copy `.env.example` to `.env` and replace every `change-me` value. Add `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (12+ characters), and optionally `INITIAL_ADMIN_NAME`.
2. Start the development infrastructure: `docker compose up -d mysql minio`.
3. Create the S3/MinIO bucket named by `S3_BUCKET`, grant the configured credentials access to it, and allow browser `PUT` requests for the app origin with `Content-Type` exposed. The upload flow uses short-lived signed URLs and verifies each object server-side.
4. Install dependencies with `npm install`, then run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
5. Start the app: `npm run dev`.

For production, set managed MySQL 8 and S3 credentials in the deployment environment, run `npm run db:migrate` as a release step, then run `npm run build` and `npm start`. Do not use the development Docker passwords or default session secret in production.

## Security and persistence

- Signed, HTTP-only sessions are issued only after a BCrypt password check.
- Every protected route verifies the active database user, role, and farm-level access server-side.
- Farm access is modeled separately from roles, supporting one admin/officer across many farms.
- API mutations use Zod validation, database transactions where multiple records change together, lifecycle transitions, and audit records. Crop planning edits replace varieties safely, retain required milestones, and synchronize pending system tasks.
- Browser uploads receive short-lived S3 URLs; a server-side completion call verifies the object exists and matches its declared type/size. Database records persist media metadata and object keys, never base64 payloads.
- Weather is fetched from the configured real provider and reports a service error when unavailable; it never fabricates weather data.

## Current coverage

The implementation includes real schema-backed APIs and UI for users/access, farm and plot CRUD, irrigation, crop cycles/varieties/milestones/support activities, activation, planned/system/daily-monitoring tasks, executions/materials/labour, attendance/geofence exceptions, location change approvals, secure evidence uploads, monitoring, incidents and follow-up status, filtered dashboards, daily reports, audit records, live weather, and PWA installability.

Run `npm test` for calculation rules. Integration and end-to-end tests require an isolated MySQL/S3 environment and configured secrets; they should be run in the deployment pipeline against those services.
