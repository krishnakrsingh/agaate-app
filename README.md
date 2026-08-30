# Agaate Farm Management PWA

Production-oriented Next.js application for multi-farm planning, agronomy activities, and field execution. Business state is stored in PostgreSQL; evidence is stored in S3-compatible object storage.

## Run locally

1. Copy `.env.example` to `.env` and replace every `change-me` value. Add `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (12+ characters), and optionally `INITIAL_ADMIN_NAME`.
2. Start the development infrastructure: `docker compose up -d postgres minio`.
3. Create the S3/MinIO bucket named by `S3_BUCKET`, grant the configured credentials access to it, and allow browser `PUT` requests for the app origin with `Content-Type` exposed. The upload flow uses short-lived signed URLs and verifies each object server-side.
4. Install dependencies with `npm install`, then run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
5. Start the app: `npm run dev`.

For production, set managed PostgreSQL and S3 credentials in the deployment environment, run `npm run db:migrate` as a release step, then run `npm run build` and `npm start`. Do not use the development Docker passwords or default session secret in production.

## Security and persistence

- Signed, HTTP-only sessions are issued only after a BCrypt password check.
- Every protected route verifies the active database user, role, and farm-level access server-side.
- Farm access is modeled separately from roles, supporting one admin/officer across many farms.
- API mutations use Zod validation, database transactions where multiple records change together, lifecycle transitions, and audit records. Crop planning edits replace varieties safely, retain required milestones, and synchronize pending system tasks.
- Browser uploads receive short-lived S3 URLs; a server-side completion call verifies the object exists and matches its declared type/size. Database records persist media metadata and object keys, never base64 payloads.
- Weather is fetched from the configured real provider and reports a service error when unavailable; it never fabricates weather data.

## Current coverage

The implementation includes real schema-backed APIs and UI for users/access, farm and plot CRUD, irrigation, crop cycles/varieties/milestones/support activities, activation, planned/system/daily-monitoring tasks, executions/materials/labour, attendance/geofence exceptions, location change approvals, secure evidence uploads, monitoring, incidents and follow-up status, filtered dashboards, daily reports, audit records, live weather, and PWA installability.

Run `npm test` for calculation rules. Integration and end-to-end tests require an isolated PostgreSQL/S3 environment and configured secrets; they should be run in the deployment pipeline against those services.
