# Agaate Farm Management PWA — Engineering Plan


<!-- cortex:toc -->
- [1. Current Implementation Status](#1-current-implementation-status)
  - [1.1 What's Built](#11-whats-built)
  - [1.2 Tech Debt & Known Limitations](#12-tech-debt--known-limitations)
- [2. Architecture Inventory](#2-architecture-inventory)
  - [2.1 Page Inventory (17 pages)](#21-page-inventory-17-pages)
  - [2.2 API Inventory (44 endpoints)](#22-api-inventory-44-endpoints)
  - [2.3 Component Inventory (34+ components)](#23-component-inventory-34-components)
- [3. Development Workflow](#3-development-workflow)
  - [3.1 Local Setup](#31-local-setup)
  - [3.2 Testing](#32-testing)
  - [3.3 Database Changes](#33-database-changes)
- [4. Deployment Strategy (Production Readiness)](#4-deployment-strategy-production-readiness)
  - [4.1 Pre-Production Checklist](#41-pre-production-checklist)
  - [4.2 Recommended Infrastructure](#42-recommended-infrastructure)
  - [4.3 Environment-Specific Config](#43-environment-specific-config)
- [5. Future Roadmap](#5-future-roadmap)
  - [Phase 2: Data Intelligence](#phase-2-data-intelligence)
  - [Phase 3: AI & Automation](#phase-3-ai--automation)
  - [Phase 4: Scale & Enterprise](#phase-4-scale--enterprise)
- [6. Code Quality Standards](#6-code-quality-standards)
  - [6.1 Conventions](#61-conventions)
  - [6.2 Security Practices](#62-security-practices)
  - [6.3 Testing Standards](#63-testing-standards)
- [7. Monitoring & Observability (Recommended)](#7-monitoring--observability-recommended)
<!-- cortex:toc:end -->

**Version:** 1.0  
**Date:** 2026-08-30  
**Status:** MVP Implementation

---

## 1. Current Implementation Status

### 1.1 What's Built

| Module | Status | Components |
|---|---|---|
| **Authentication** | ✅ Complete | Login/logout, JWT sessions, role-based redirects |
| **User Management** | ✅ Complete | CRUD users, role assignment, activate/deactivate |
| **Farm Management** | ✅ Complete | Create, edit, view, activate farms |
| **Farm Access Control** | ✅ Complete | Assign users to farms, canManage flag |
| **Plot Management** | ✅ Complete | Create, edit, soft-delete, GPS capture |
| **Irrigation Config** | ✅ Complete | Multiple irrigation types per plot |
| **Crop Cycles** | ✅ Complete | Full wizard: crop, varieties, infrastructure, milestones |
| **Milestone Planning** | ✅ Complete | Auto-generated from crop config, status tracking |
| **Task Management** | ✅ Complete | Create, assign, status transitions, board view |
| **Task Execution** | ✅ Complete | Materials, labour, photos, remarks |
| **Agronomy Plans** | ✅ Complete | 7-day plans, manual weather |
| **Attendance** | ✅ Complete | Start/end day, selfie, GPS, biometric verification |
| **Attendance Exceptions** | ✅ Complete | Create, approve/reject |
| **Location Change Requests** | ✅ Complete | Create, approve/reject |
| **Crop Monitoring** | ✅ Complete | Good/Poor with photos, stage, impact |
| **Incident Reporting** | ✅ Complete | Farm/Plot/Crop level, follow-ups |
| **Daily Reports** | ✅ Complete | Auto-generated from captured data |
| **Media Uploads** | ✅ Complete | Presigned URLs, S3/MinIO storage |
| **Weather** | ✅ Complete | Open-Meteo API + manual entry |
| **Dashboard** | ✅ Complete | Role-aware metrics, farm overview |
| **Biometric: Face** | ✅ Complete | TF.js enrollment, encrypted storage, verification |
| **Biometric: Liveness** | ✅ Complete | Challenge-based anti-spoofing |
| **Biometric: WebAuthn** | ✅ Complete | Passkey registration, auth, revocation |
| **Audit Logging** | ✅ Complete | Entity change tracking |
| **PWA** | ✅ Complete | Manifest, service worker, installable |
| **Approval Console** | ✅ Complete | Admin UI for exceptions and location changes |

### 1.2 Tech Debt & Known Limitations

| Item | Severity | Description |
|---|---|---|
| Rate limiting is in-memory | Medium | Resets on server restart; need Redis for production |
| No offline data queue | Medium | PWA caches assets but can't queue mutations offline |
| Face match threshold not empirically validated | High | Current 0.6 threshold needs real-world calibration |
| No email/push notifications | Medium | Users must open app to see new tasks/approvals |
| Single-server deployment | Medium | No horizontal scaling strategy yet |
| Manual weather entry UX | Low | Could auto-fetch on plan creation |
| No data export | Low | No CSV/Excel export for reports |
| No pagination on all list endpoints | Low | Some endpoints return all records |

---

## 2. Architecture Inventory

### 2.1 Page Inventory (17 pages)

| Route | Role(s) | Purpose |
|---|---|---|
| `/` | All | Redirect to dashboard/login |
| `/login` | Unauthenticated | Login form |
| `/dashboard` | All authenticated | Role-aware metrics + farm overview |
| `/farms/new` | SA, FA | Farm creation form |
| `/farms/[farmId]` | SA, FA, AG | Farm hub/detail page |
| `/plots/[plotId]` | SA, FA, AG | Plot detail page |
| `/plots/[plotId]/crop-cycles/new` | SA, FA | Crop cycle creation wizard |
| `/plots/[plotId]/crop-cycles/[id]/edit` | SA, FA | Edit crop cycle |
| `/tasks` | All | Task board (filterable) |
| `/tasks/new` | SA, FA, AG | Task creation form |
| `/officer/day` | FO | "My Day" daily execution screen |
| `/officer/reports` | FO | Field reports |
| `/reports/daily` | SA, FA, AG | Auto-generated daily reports |
| `/admin/users` | SA | User management console |
| `/admin/approvals` | SA, FA | Approval console |
| `/settings/biometric` | FO | Face enrollment |
| `/settings/passkeys` | All | WebAuthn credential management |

### 2.2 API Inventory (44 endpoints)

| Area | Count | Key Endpoints |
|---|---|---|
| Auth & Security | 12 | login, logout, webauthn (5), biometric (3), liveness (2) |
| Farm Management | 7 | farms CRUD, activate, access, plots |
| Plot & Crops | 4 | plot CRUD, crop cycles CRUD |
| Tasks | 3 | tasks CRUD, complete |
| Attendance | 5 | attendance, exceptions, location changes |
| Monitoring | 2 | crop monitoring CRUD |
| Incidents | 3 | incidents CRUD, follow-ups |
| Media | 3 | presign, complete, download URL |
| Reporting | 1 | daily report |
| Dashboard | 1 | aggregate metrics |
| Users | 2 | users CRUD |
| Weather | 2 | auto fetch, manual entry |
| Audit | 1 | audit log query |

### 2.3 Component Inventory (34+ components)

| Category | Components |
|---|---|
| **Layout** | Navbar, Breadcrumbs, ServiceWorker |
| **Forms** | FarmForm, FarmEditForm, PlotForm, PlotEditForm, CropCycleForm, CropCycleEditForm, TaskForm, TaskCompletionForm, AttendanceForm, ManualWeatherForm, LocationRequestForm, LoginForm |
| **Displays** | DashboardClient, FarmHubClient, TaskBoard, OfficerDay, DailyReport, FieldReports, WeatherCard, EvidenceGallery |
| **Admin** | AdminConsole, ApprovalsConsole, FarmAccessManager, FarmStatusControl, ActivateFarmButton, IncidentStatusControl, IncidentFollowup |
| **Biometric** | BiometricFaceScanner, LivenessChallenge |
| **UI Primitives** | Icons, Toast, (in ui/ folder) |
| **Auth** | LogoutButton, (in webauthn/ folder) |

---

## 3. Development Workflow

### 3.1 Local Setup

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with appropriate values

# 4. Setup database
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# 5. Download face recognition models
npm run fetch:face-models

# 6. Start dev server
npm run dev
```

### 3.2 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### 3.3 Database Changes

```bash
# After schema changes
npx prisma migrate dev --name <migration_name>
npx prisma generate

# Deploy migrations (production)
npx prisma migrate deploy
```

---

## 4. Deployment Strategy (Production Readiness)

### 4.1 Pre-Production Checklist

| Item | Status | Action Required |
|---|---|---|
| Environment variables | ⚠️ | Generate production secrets, configure real S3 |
| Face match threshold | ⚠️ | Calibrate with real user data |
| Database migrations | ✅ | Prisma migrate deploy |
| Rate limiting | ⚠️ | Switch to Redis-backed rate limiting |
| HTTPS | ⚠️ | Configure SSL certificate |
| WebAuthn RP ID | ⚠️ | Set to production domain |
| Session secure flag | ⚠️ | Set `APP_SESSION_SECURE=true` |
| Error monitoring | ❌ | Add Sentry or equivalent |
| Log aggregation | ❌ | Set up structured logging + aggregation |
| Database backups | ❌ | Configure automated PostgreSQL backups |

### 4.2 Recommended Infrastructure

```
┌───────────────┐     ┌──────────────┐     ┌──────────┐
│  Cloudflare   │────▶│  Next.js     │────▶│PostgreSQL│
│  CDN + SSL    │     │  App Server  │     │  (RDS)   │
└───────────────┘     │  (Vercel/    │     └──────────┘
                      │   EC2/ECS)   │
                      └──────┬───────┘     ┌──────────┐
                             │────────────▶│   S3     │
                             │             │ (Bucket) │
                             │             └──────────┘
                             │
                             │             ┌──────────┐
                             └────────────▶│  Redis   │
                                           │ (Rate    │
                                           │  Limit)  │
                                           └──────────┘
```

### 4.3 Environment-Specific Config

| Variable | Development | Production |
|---|---|---|
| `DATABASE_URL` | `localhost:5432` | RDS endpoint |
| `S3_ENDPOINT` | `localhost:9000` (MinIO) | `s3.amazonaws.com` |
| `S3_FORCE_PATH_STYLE` | `true` | `false` |
| `APP_SESSION_SECURE` | (not set) | `true` |
| `WEBAUTHN_RP_ID` | `localhost` | `app.agaate.com` |
| `WEBAUTHN_ORIGIN` | `http://localhost:3000` | `https://app.agaate.com` |
| `REQUIRE_BIOMETRIC_FOR_ATTENDANCE` | `false` | `true` |

---

## 5. Future Roadmap

### Phase 2: Data Intelligence

| Feature | Description | Effort |
|---|---|---|
| Report Export | CSV/Excel export for all reports | S |
| Push Notifications | Task assignments, approval requests | M |
| Email Alerts | Daily digest, incident notifications | M |
| Analytics Dashboard | Charts: labour trends, crop health, incident patterns | L |
| Offline Queue | Queue mutations offline, sync when online | L |

### Phase 3: AI & Automation

| Feature | Description | Effort |
|---|---|---|
| Crop Disease Detection | ML model on crop photos for auto-diagnosis | XL |
| Smart Scheduling | AI-assisted task scheduling based on weather + crop stage | L |
| Yield Prediction | Historical data-based yield forecasting | L |
| Multi-Language | Hindi, Marathi, Telugu support | M |
| Native Mobile Apps | React Native wrappers for iOS/Android | XL |

### Phase 4: Scale & Enterprise

| Feature | Description | Effort |
|---|---|---|
| Multi-Tenant | Separate Agaate instances per enterprise client | XL |
| Financial Module | Cost tracking, P&L per farm/crop | L |
| Market Integration | Market price feeds, harvest-to-market tracking | L |
| IoT Sensors | Soil moisture, weather station data ingestion | XL |
| GIS Integration | Map-based plot visualization and management | L |

---

## 6. Code Quality Standards

### 6.1 Conventions

| Area | Convention |
|---|---|
| File naming | `kebab-case.tsx` for components, `camelCase.ts` for libs |
| Component naming | PascalCase, named exports |
| API routes | REST conventions, centralized error handling via `apiError()` |
| Database | Prisma schema as source of truth, no raw SQL |
| Validation | Zod schemas for all API input |
| Auth | `requireSession()` / `requireActiveUser()` at route entry |
| Access control | `requireFarmAccess()` / `requireRole()` after auth |
| Error boundaries | `error.tsx` at app root |

### 6.2 Security Practices

| Practice | Implementation |
|---|---|
| No secrets in code | All secrets via environment variables |
| Input validation | Zod on every API endpoint |
| SQL injection | Prisma parameterized queries (ORM) |
| XSS | React auto-escaping + no `dangerouslySetInnerHTML` |
| CSRF | SameSite=Lax cookies |
| Auth bypass | `server-only` import guard on auth modules |
| Audit trail | AuditLog model for all mutations |
| Biometric data | AES-256-GCM encrypted, never stored raw |

### 6.3 Testing Standards

| Level | Coverage Expectation | Tools |
|---|---|---|
| Unit | Business logic, domain rules | Vitest |
| Integration | API routes, auth flows | Vitest + test context |
| Security | Auth bypass, role escalation | Vitest |
| E2E | Critical user journeys | Playwright |

---

## 7. Monitoring & Observability (Recommended)

| Layer | Tool | Purpose |
|---|---|---|
| Error Tracking | Sentry | Runtime errors, unhandled exceptions |
| APM | New Relic / Datadog | Request latency, DB query performance |
| Logging | Structured JSON logs | Searchable audit trail |
| Uptime | UptimeRobot / Pingdom | Availability monitoring |
| Database | pg_stat_statements | Slow query identification |
| Storage | S3 metrics | Upload/download patterns |
