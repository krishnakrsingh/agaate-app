# AGAATE — Repository Reality Audit (2026-08-30)

> **Scope:** Complete end-to-end authenticity audit. Codebase is source of truth. All prior “VERIFIED / production-ready” claims treated as untrusted.
> **Audit mode:** Read-only trace (UI → handler → API → auth → validation → business → DB → UI refresh). No fixes applied before recording.
> **Build verified:** `npm test` 46/46 passed (2026-08-30 16:32), `npm run build` 23 routes compiled cleanly. Postgres + S3/MinIO required for runtime.

---

## EXECUTIVE SUMMARY

**How much of the application is actually real?**

| Category | Count | % of inventoried capabilities (42) |
|---|:---:|---|
| **REAL** | **33** | ~79% |
| **PARTIAL** | 5 | ~12% |
| **FRONTEND ONLY** | 0 | 0% |
| **BACKEND ONLY** | 0 | 0% |
| **MOCKED** | 0 distinct feature (1 sub-component mocked — biometric confidence) | — |
| **HARDCODED** | 1 metric stub + design tokens | — |
| **MISREPRESENTED** | **2** | — |
| **BROKEN** | 0 confirmed dead (1 fragile path when S3 unavailable) | — |
| **UNKNOWN** | 1 (S3/live weather liveness without running infra) | — |

**Headline finding:** The system is a **real, database-backed, auth-enforced farm management application** for ~79% of its claimed domains. CRUD, rbac, geofence, task state machine, milestone math, attendance, monitoring, incidents, dashboards and daily reports are all wired end-to-end and proven by schema, API, and passing integration tests. The primary **misrepresentation is biometric face verification** (`src/components/biometric-face-scanner.tsx:80-92`) — a brightness-analysis with spoofable 88-99% “confidence” presented as AI facial recognition. A second misrepresentation risk is the `delayedAlerts: 0` hardcode in the dashboard page. No wholesale fake, but trust in geographic/storage-dependent flows collapses when the backing service is unavailable, and tests give false confidence because they bypass HTTP/S3.

**Current state: NOT PRODUCTION READY** (default per §24 — until S3 secrets, weather provider, and biometric claims are remediated and proven against a real production build/profile).

---

## FEATURE MATRIX

| Feature | UI | Backend | DB | Auth | Integration | Verdict | Evidence (trace) | Severity |
|---|---|---|---|---|---|---|---|---|
| **Session & JWT** | `src/components/login-form.tsx` form → `POST /api/auth/login` | `src/lib/auth.ts:4-20` SignJWT HS256 8h, httpOnly cookie | `User.active` | `requireActiveUser:43` checked on every `currentActor` | `jose` + `bcryptjs` | **REAL** | login → bcrypt.compare + createSession (`src/app/api/auth/login/route.ts:11`) → `Set-Cookie agaate_session` → `getSession` jwtVerify; `clearSession` on logout; 46 tests pass | Low |
| **RBAC / Farm Access** | `src/components/navbar.tsx`, `src/components/admin-console.tsx` | `src/lib/access.ts:6-21` `requireRole`, `requireFarmAccess`, `accessibleFarmWhere` | `User.role` + `FarmAccess` | Server-enforced per API | DB | **REAL** | Every mutating API calls `requireRole`/`requireFarmAccess`; `SUPER_ADMIN`+`AGRONOMIST` platform bypass (`src/lib/access.ts:7`) is intentional; penetration tests `src/lib/auth-penetration.test.ts:113-152` prove isolation | Medium |
| **Evidence Storage (S3/MinIO)** | `src/components/task-completion-form.tsx:40-72`, `field-reports.tsx:31-66`, `attendance-form.tsx:169-198` → presign→PUT→complete | `src/app/api/uploads/presign/route.ts:10` + `complete/route.ts:6` `headObject` verify size/mime, `verifiedAt` | `MediaAsset.storageKey,verifiedAt` unique | `requireFarmAccess(farmId)` + `uploadedById` match | `@aws-sdk/client-s3` | **REAL** | Presigned PUT 300s (`src/lib/storage.ts:7`), HEAD check (`complete:16-22`), minio-setup in `docker-compose.yml:10` creates bucket. Fragile when S3 down (see Production Gaps). Final proof harness bypasses HEAD (`scripts/final-acceptance-proof.ts:76-82`) → false confidence | High (fragile) |
| **System Audit Logging** | `src/components/approvals-console.tsx` log tab | `src/lib/audit.ts` → `prisma.auditLog.create`, `src/app/api/audit-logs/route.ts:6` | `AuditLog` | SUPER_ADMIN/FARM_ADMIN | DB | **REAL** | 18+ `audit()` calls (create farm/task/attendance etc.); `GET /api/audit-logs?farmId=` JSON path query `src/app/api/audit-logs/route.ts:6`; domain tests verify | Low |
| **User Provisioning** | `src/components/admin-console.tsx:223-309` | `src/app/api/users/route.ts:10` `POST` bcrypt12, `src/app/api/users/[userId]/route.ts:*` | `User` | `requireRole SUPER_ADMIN` | DB | **REAL** | `createUserSchema` farmIds validation (`src/app/api/users/route.ts:8`), tx creates `FarmAccess`; GET paginated `src/lib/api.ts:15` | Low |
| **Multi-Farm Access Scoping** | `AdminConsole` chips + `FarmAccessManager` | `accessibleFarmWhere()` `src/lib/access.ts:18` + `GET /api/farms` `src/app/api/farms/route.ts:9` | `FarmAccess` | Per-request | DB | **REAL** | `GET /api/farms` returns `where: {access:{some:{userId}}}` for non-platform roles; seed assigns FarmAdmin 3 farms `prisma/seed.ts:163-180` | Low |
| **Farm Creation & Modification** | `src/components/farm-form.tsx` → `POST /api/farms`; `src/components/farm-edit-form.tsx` → `PATCH /api/farms/[farmId]` | `src/app/api/farms/route.ts:8-10` zod, cultivable≤total, `src/app/api/farms/[farmId]/route.ts:9` PATCH status machine | `Farm` | `FARM_ADMIN,SUPER_ADMIN` + `requireFarmAccess(farmId,true)` | Geolocation `navigator.geolocation` capture | **REAL** | Full CRUD: `farmSchema` `src/app/api/farms/route.ts:8`; `PATCH` transitions map `src/app/api/farms/[farmId]/route.ts:9` SETUP→ACTIVE etc.; audit; reload preserves | Low |
| **Plot Creation & GPS** | `src/components/plot-form.tsx` + `plot-edit-form.tsx` | `src/app/api/farms/[farmId]/plots/route.ts:8` total area ≤ cultivable, `src/app/api/plots/[plotId]/route.ts:9` | `Plot+ IrrigationConfiguration` soft delete | `requireFarmAccess(...,true)` | `navigator.geolocation` | **REAL** | `POST` creates tx with irrigation createMany `src/app/api/farms/[farmId]/plots/route.ts:8`; `PATCH`/`DELETE` guard archived + area check; GPS capture button `src/components/plot-form.tsx:141` | Low |
| **Multi-Irrigation Config** | Checkbox + per-type details `src/components/plot-form.tsx:195` | `superRefine` uniqueness + Other→details required `src/app/api/farms/[farmId]/plots/route.ts:7` | `IrrigationConfiguration.details` | same | — | **REAL** | Frontend selected Set + details map; backend 422 `Details are required for Other`; display `src/app/farms/[farmId]/page.tsx` maps `${type} (${details})`; live proof in seed: Drip+Rain Pipe | Low |
| **Crop Cycle Wizard (varieties/beds/mulch)** | `src/components/crop-cycle-form.tsx` 5-step wizard | `src/app/api/plots/[plotId]/crop-cycles/route.ts:10` `superRefine` beds/mulch guards | `CropCycle, CropVariety` | `requireFarmAccess(...,true)` | — | **REAL** | Calculations `src/lib/business.ts:9` `expectedTotalBeds=area*bedsPerAcre` etc. HIT at `.../crop-cycles/route.ts:11` `calc=`; supports single vs double zigzag; `prisma/seed.ts:254` 890 beds `12.5284` etc. | Low |
| **Bed/Mulch Calculations** | Preview hints `src/components/crop-cycle-form.tsx:391-460` | `src/lib/business.ts:9-11` pure functions | `CropCycle.expectedTotalBeds/expectedPlants` persisted | — | — | **REAL** | Unit tests `src/lib/business.test.ts:17-36`; integration `domain-verification.test.ts:223-229` proves 5*400=2000; variance `src/lib/business.ts:12` | Low |
| **Dynamic Milestone Generation** | `src/components/crop-cycle-form.tsx:126-131` dynamic titles | `src/lib/business.ts:33` `milestoneTemplates` + `.../crop-cycles/route.ts:11` auto `task.createMany` per milestone | `Milestone+ Task SYSTEM` | same | — | **REAL** | Creates 4 standard + supportActivities; `seed.ts:295-326` 4 milestones; `business.test.ts:87-116` both mulch combos; PATCH syncs task titles `src/app/api/plots/[plotId]/crop-cycles/[cycleId]/route.ts:64` | Low |
| **Crop Cycle Edit** | `src/components/crop-cycle-edit-form.tsx` | `PATCH /api/plots/[plotId]/crop-cycles/[cycleId]` `src/app/api/plots/[plotId]/crop-cycles/[cycleId]/route.ts:34` | Same + varieties recreate | `requireFarmAccess(...,true)` | — | **REAL** | Effective beds/mulch validation `route.ts:40-45`, required 4 milestones retained, tx deletes/creates varieties+milestones, cascades task CANCEL | Low |
| **Farm Activation Gatekeeper** | `src/components/activate-farm-button.tsx` + `farm-status-control.tsx` | `POST /api/farms/[farmId]/activate` `src/app/api/farms/[farmId]/activate/route.ts:6` | `Farm.status` + plot/cycle status | `requireFarmAccess(...,true)` | — | **REAL** | Requires ≥1 plot with planned cycle + 4 standard milestones `route.ts:6` ready check via `milestoneTemplates`; atomically ACTIVE plots/cycles; then `FarmStatusControl` allows ACTIVE→INACTIVE/COMPLETED | Low |
| **7-Day Rolling Agronomy Plan** | `src/components/task-form.tsx` → `POST /api/tasks` | `src/app/api/tasks/route.ts:33` `isWithinRollingSevenDays` + AgronomyPlan upsert | `AgronomyPlan+ Task ASSIGNED` | AGRONOMIST,SUPER_ADMIN + `requireFarmAccess` + officer farmAccess check | — | **REAL** | `isWithinRollingSevenDays` `src/lib/business.ts:24` UTC date-only; `task-board.tsx:55-67` rolling strip shows counts; rejects >7d `HttpError 422`; farm ACTIVE guard | Low |
| **Weather (Live)** | `src/components/weather-card.tsx` + `manual-weather-form.tsx` auto line | `GET /api/weather/route.ts:6` proxies `WEATHER_PROVIDER_URL` ?latitude/longitude + current/daily | `Farm.latitude/longitude` | `requireFarmAccess` | `https://api.open-meteo.com/v1/forecast` (env) | **REAL** | No static fallback: if `WEATHER_PROVIDER_URL` missing → 503 (`route.ts:6`), provider not ok → 503, UI shows error string not live values `weather-card.tsx:63-64`; `next:{revalidate:900}` cache | Medium |
| **Manual Weather Override** | `src/components/manual-weather-form.tsx` | `src/app/api/weather/manual/route.ts:48` GET/POST upsert `AgronomyPlan.manual*` | `AgronomyPlan.manualTemperature…remarks` | SUPER_ADMIN/AGRONOMIST/FARM_ADMIN | — | **REAL** | Zod gte/lte ranges `route.ts:9`, `utcDateOnly`, audit UPSERT_MANUAL_WEATHER; UI shows Auto vs Stored Manual block `manual-weather-form.tsx:148-169` | Low |
| **Task Board & 7-Day Strip** | `src/components/task-board.tsx` filters/search/edit | `GET /api/tasks` `src/app/api/tasks/route.ts:11` + `PATCH /api/tasks/[taskId]` `src/app/api/tasks/[taskId]/route.ts:9` | `Task` | SUPER_ADMIN/AGRONOMIST unrestricted; FARM_OFFICER scoped to assignedOfficerId | — | **REAL** | Pagination `src/lib/api.ts:15` limit 1-200; filter day+status+search; inline edit limited for officers (`hasPlanningFields` 403). Builds daily: dueDate string compare | Low |
| **Task State Machine** | `src/components/officer-day.tsx:51` Start, `task-completion-form.tsx` | `src/lib/business.ts:31` `taskTransitions` + `PATCH` `canTransitionTask` guard | `Task.status` | Officials only IN_PROGRESS/BLOCKED/CANCELLED; managers full | — | **REAL** | Tests `src/lib/business.test.ts:119-138` exhaustive; API returns 409 `is not a valid transition` | Low |
| **Officer Daily Task Generation** | `src/components/officer-day.tsx:35` `GET /api/tasks?date=...` | `GET /api/tasks` lazy per-officer creation `src/app/api/tasks/route.ts:16` DAILY_MONITORING | `Task DAILY_MONITORING` | FARM_OFFICER only | — | **PARTIAL** | Real but trigger is lazy on first GET per day per cycle, not cron/push. Works when officer opens My Day, but misses if never opened. Seed creates explicit daily task `seed.ts:366-381` to guarantee visibility. Acceptable but non-obvious. | Medium |
| **Task Execution + Labour/Materials** | `src/components/task-completion-form.tsx` | `POST /api/tasks/[taskId]/complete` `src/app/api/tasks/[taskId]/complete/route.ts:11` tx upsert execution + material/labour create + media link + milestone complete + task COMPLETED + crop variance | `TaskExecution, MaterialUsage, LabourUsage, MediaAsset` | Assigned officer only + media verifiedAt guard | S3 evidence | **REAL** | Labour `labourHours = labourers*hours` `src/lib/business.ts:16` verified 4*5=20; materials max 30, labour max 20; seed proves flow `domain-verification.test.ts:380-458` | Low |
| **Bed/Plant Variance** | `task-completion-form.tsx:144-170` bed/plant inputs conditional on title regex | `POST .../complete` `route.ts:21-22` regex gate + `tx.cropCycle.update` | `CropCycle.actualBedsCreated/actualPlants` | same | — | **REAL** | Only on `/(land|bed) preparation/i` and `/(transplantation|direct sowing)/i` titles; `farm-hub-client.tsx:373-392` displays Expected/Actual variance | Low |
| **Attendance Start/End + Selfie upload** | `src/components/attendance-form.tsx:143` submit → presign→PUT→complete→POST /api/attendance | `POST /api/attendance` `src/app/api/attendance/route.ts:40` validates media verifiedAt, distance via `distanceMeters`, reason required outside, tx creates/updates Attendance+AttendanceException | `Attendance+ AttendanceException, MediaAsset SELFIE` | FARM_OFFICER,SUPER_ADMIN + `requireFarmAccess` + media owned | `navigator.geolocation` highAccuracy | **REAL** | Duplicate prevention via `userId_farmId_attendanceDate` unique (`prisma/schema.prisma:331` + api tx check 77); end requires start; GPS 15s timeout + permission error handling `attendance-form.tsx:124-141` | High |
| **Geofence Haversine** | `attendance-form.tsx:29-48` proximity radar live; `biometric-face-scanner` not used for distance | `src/lib/business.ts:4` distanceMeters + `src/app/api/attendance/route.ts:56-65` threshold `farm.geofenceRadiusMeters` (default 500 `src/lib/business.ts:1`) | `Farm.geofenceRadiusMeters` per farm (seed 500/600/800) | — | Haversine | **REAL** | Server decision authoritative, not client; `dashboard` also shows distance; tests `business.test.ts:62-84` zero and 1.1km cases; exception queue `src/app/api/attendance-exceptions/route.ts:5` | Medium |
| **Biometric Face Scanner** | `src/components/biometric-face-scanner.tsx` Launch Camera / Scan & Verify | NONE — client-only `analyzeImageAndComplete` computes brightness | None persisted except `MediaAsset SELFIE` blob (same as plain upload) | None (confidence not verified server-side) | `getUserMedia` + Canvas `getImageData` | **MISREPRESENTED** | See dedicated section below. Ui shows `96% Match`, `94% Match`, `biometricConfidence% Match Verified` (`attendance-form.tsx:532,547`) without face detection, embedding, or comparison. | **CRITICAL** |
| **Exception Approval Flow** | `src/components/approvals-console.tsx:178-198` Approve/Reject buttons | `PATCH /api/attendance-exceptions/[exceptionId]` `src/app/api/attendance-exceptions/[exceptionId]/route.ts:*` 409 if not PENDING, tx updates both tables | `AttendanceException + Attendance.status` | FARM_ADMIN/SUPER_ADMIN + `requireFarmAccess(...,true)` | — | **REAL** | Status maps OPEN→EXCEPTION_PENDING→APPROVED/REJECTED; `prisma/seed.ts` not needed, domain test `domain-verification.test.ts:532-589` full cycle | Low |
| **Location Change Request** | `src/components/location-request-form.tsx` Capture GPS + reason | `POST/GET /api/location-change-requests` + `PATCH [requestId]` applies `farm.update latitude/longitude` on APPROVED `src/app/api/location-change-requests/[requestId]/route.ts:*` | `LocationChangeRequest` | Any authenticated user can request; review FARM_ADMIN/SUPER_ADMIN+manage | — | **REAL** | Zod 5-1000 reason; pagination; audit `LOCATION_CHANGE_APPROVED`; UI approval via `approvals-console.tsx:237` | Low |
| **Crop Monitoring (Good/Poor + photo)** | `src/components/field-reports.tsx:126-164` | `POST /api/monitoring/route.ts:11` health/stage/impact/mediaIds, auto-completes DAILY_MONITORING task+execution `route.ts:23-26` | `CropMonitoring+ MediaAsset CROP_PHOTO` | FARM_OFFICER,SUPER_ADMIN + cycle ACTIVE guard | S3 | **REAL** | impact required if POOR `superRefine` `route.ts:9`; media must be verified owned CROP_PHOTO; `farm-hub-client.tsx:491-544` evidence gallery; domain test GO0D/POOR 15% `domain-verification.test.ts:614-659` | Low |
| **Incident Multi-Level + Lifecycle** | `field-reports.tsx:166-204` + `incident-status-control.tsx` + `incident-followup.tsx` | `POST /api/incidents` `src/app/api/incidents/route.ts:8` level guards; `PATCH /api/incidents/[incidentId]` `src/app/api/incidents/[incidentId]/route.ts:*` ; `POST /api/incidents/[id]/follow-ups` increments | `Incident + IncidentFollowUp` (m. `20260830093112`) | Officer submit; review AGRONOMIST/FARM_ADMIN (follow-up any with farm access) | S3 INCIDENT_PHOTO | **REAL** | Level validation `superRefine` farm vs plot vs crop (`src/app/api/incidents/route.ts:7`); severity enum; status workflow OPEN→ACKNOWLEDGED→RESOLVED→CLOSED; `incident-followup.tsx` handles paginated GET, CLOSED guard, auto OPEN→ACKNOWLEDGED | Low |
| **Dashboard Metrics** | `src/components/dashboard-client.tsx` metric cards + `src/components/daily-report.tsx` | `GET /api/dashboard` `src/app/api/dashboard/route.ts:6` counts 9 KPIs with farmScope/linked scopes; `src/app/dashboard/page.tsx:14` server page | All models live | `accessibleFarmWhere()` scoping | — | **PARTIAL** | API is real (`api/dashboard` correct). But page `src/app/dashboard/page.tsx:53` hardcodes `delayedAlerts: 0` instead of querying; `DashboardClient` shows inclusive Metrics but delayed count always zero — hides overdue tasks. API itself correctly computes `delayed` as `dueDate < utcDateOnly(today)` (`route.ts:6`). | Medium |
| **Daily Operations Report** | `src/components/daily-report.tsx` + print button `window.print()` | `GET /api/reports/daily/route.ts:6` 4 parallel queries + labour sum + photoCount, officer scoping | `Attendance, Task Execution, CropMonitoring, Incident` | `requireFarmAccess` + officer sees own only | — | **REAL** | `date` via `utcDateOnly` + end+1 day; materials flatMap; `resources.labourHours` sum of `Number(l.labourHours)`; photoCount sum of media lengths; tests `domain-verification.test.ts:700-741` prove projection | Low |
| **Farm Access Manager** | `src/components/farm-access-manager.tsx` assign/remove officers | `GET/POST/DELETE /api/farms/[farmId]/access/route.ts:8` | `FarmAccess` | FARM_ADMIN/SUPER_ADMIN + ACTIVE farm guard + auto-assign AVAILABLE→ASSIGNED | — | **REAL** | POST upserts access + `task.updateMany` system available to assigned `route.ts:9` ; DELETE validates role FARM_OFFICER only | Low |
| **User Admin (Super Admin)** | `src/components/admin-console.tsx` | `src/app/api/users/route.ts:8` GET list + pagination; PATCH `src/app/api/users/[userId]/route.ts:*` | `User.farmAccess` | SUPER_ADMIN only | — | **REAL** | `HttpError 403` if not SUPER_ADMIN; password still min12 at create | Low |
| **Media Url Retrieval** | `src/components/evidence-gallery.tsx:1` | `GET /api/media/[mediaId]/url/route.ts:6` `verifiedAt` check + presigned downloadUrl | `MediaAsset` | `requireFarmAccess(farmId)` | S3 `GetObject` presign 300s | **REAL** | Returns `url+expiresInSeconds`; caller spreads `idsKey` batch; UI uses `next/image unoptimized` due to signed URL | Low |
| **Farm Hub (server page)** | `src/app/farms/[farmId]/page.tsx:6` + `farm-hub-client.tsx` tabs | Server `prisma.farm.findUnique` include plots→cycles→varieties→milestones, monitoring 10, incidents | All farm aggregates | `requireFarmAccess(farmId)` else `notFound()` | — | **REAL** | Serializes Decimal->string, Date->ISO for client; `canManage` derived `SUPER_ADMIN || access.canManage`; onboarding pipeline SETUP vs ACTIVE `farm-hub-client.tsx:160-199` | Low |
| **Spec §6 Irrigation Details upgrade** | `plot-form.tsx:108` + `plot-edit-form.tsx` | Backend `superRefine` above | See Irrigation | — | — | **REAL** | Listed as hardened `docs/IMPLEMENTATION_STATUS.md:5` end-to-end live verified Other without details → 422 | Low |

---

## BIOMETRIC FACE SCANNER — SPECIAL AUDIT

### Documented claim vs actual behavior

| Claim surface | Location | Actual implementation |
|---|---|---|
| **“Biometric Face Scan”, “Biometric Face Scanner”, “Instant AI Face Alignment”, “Live facial landmark scan to verify officer identity”** | `src/components/biometric-face-scanner.tsx:197`, `src/components/attendance-form.tsx:522,531,655` | Camera preview + oval dashed guide + laser animation are purely CSS; no face detection model (no MediaPipe, no face-api, no WebAssembly). |
| **“96% Match”, “94% Match Verified”, “88–99% confidence”** | `scanner.tsx:49 qualityScore 96 / 94`, `attendance-form.tsx:547 {biometricConfidence}% Match Verified`, `scanner.tsx:89-92 Math.min(99, Math.max(88, …85+(avgBrightness%14)))` | Confidence is **averaged pixel brightness modulo 14**. `getImageData` then `totalBrightness / (len/16)` → `85 + (avgBrightness %14)` clamped 88-99. Dark vs light image changes score; a photo of a wall scores ~same as a face. `setInterval 120ms *5 = 600ms` fake scan progress (`scanner.tsx:72-111`). |
| **“Verifying face biometrics … X%”, “Face detected. Hold still for biometric alignment”** | `scanner.tsx:47,295` | Strings set immediately on `startCamera` success (`faceDetected=true` unconditionally after `play()`), not from detector. `faceDetected` also set true on file upload `scanner.tsx:148` without analysis. |
| **Identity binding** | Expect enrolled reference template + similarity + threshold | **None.** No `User.faceEmbedding` column (`prisma/schema.prisma:92-111` User has no face fields), no enrollment flow, no comparison, no liveness (blink/3D/depth). Captured file is saved as generic `SELFIE` `MediaAsset` `kind: SELFIE` (`attendance-form.tsx:174`) and only checked for `verifiedAt != null` and `uploadedById == actor` (`src/app/api/attendance/route.ts:47-55`). Any selfie passes. |
| **Server-side verification** | Expect server face match | **None.** `POST /api/attendance` never inspects `selfieMediaId` image contents; confidence value (`biometricConfidence` state) is never sent to server (`attendance-form.tsx:201-211` body has `farmId,action,latitude,longitude,selfieMediaId,reason` only). Client confidence is display-only. |
| **Spoof / liveness** | Expect challenge | **Absent.** Uploaded still image trivially accepted via `fileInputRef` fallback `scanner.tsx:130-156` or `attendance-form.tsx:105 handleSelfieChange` preview path. |

**Classification: MISREPRESENTED / FAKE BIOMETRIC VERIFICATION**

> The component provides **image quality sampling, not facial recognition**. Descriptive language (“AI verified”, “Match Verified”, “liveness”, “identity alignment”) overstates technical reality by multiple abstraction levels. Correct labeling would be “Selfie capture with image brightness check” until a real detector/embed/ compare pipeline with enrollment, threshold, and server verification is implemented.

**What would be required to fix honestly:**
- Add `User.faceTemplate` (embedding bytes) + enrollment flow (multiple captures → embedding mean).
- Client or server face detection (e.g., `face-api.js`, Mediapipe, or server Rekognition) + embedding generation.
- Upload accompanies embedding or server generates embedding from stored key (S3 GetObject) and compares (`cosine similarity > threshold 0.42`) tied to `userId`; persist `confidence` and decision.
- Liveness: blink / head pose / depth or server anti-spoof model.
- UI must not show “Match Verified” until server returns decision.

---

## ATTENDANCE AUDIT — Full Trace

| Step | Code path | Real? | Notes |
|---|---|---|---|
| UI control (Start / End) | `src/components/attendance-form.tsx:487-779` START form ; active-shift drawer `303-429` END | Real | Travels via `handleAttendanceSubmit(action)` bound to both forms; disabled when no farm selected `770`. |
| Event handler | `handleAttendanceSubmit:143` `e.preventDefault()` → `acquireLocation()` → `presign` → `PUT uploadUrl` → `complete` → `POST /api/attendance` | Real | Uses `capturedSelfieFile || formSelfie` `152`; missing selfie → early `message` and return `161-164`. |
| Selfie capture | `biometric-face-scanner.tsx:114 captureLiveSnapshot` draws video frame to hidden canvas then `analyzeImageAndComplete` → `canvas.toBlob` → `File` → `onCapture` OR file input preview `attendance-form.tsx:105` | Partial (capture real, verification fake) | Video `getUserMedia facingMode:user 640x640` real; but analysis is brightness (see scanner audit). Selfie blob still uploaded as valid JPEG, so attendance succeeds with fake analysis — misrepresented confidence does not block. |
| Upload | `attendance-form.tsx:169-196` presign JSON (`farmId,kind SELFIE,mimeType,sizeBytes`) → PUT `presign.uploadUrl` with `Content-Type` → POST `.../complete` | Real | Errors propagate to `message+toast`; `document/DOM` preview URL created `URL.createObjectURL` but storage persistence depends on S3. |
| GPS acquisition | `acquireLocation:115` `navigator.geolocation.getCurrentPosition {enableHighAccuracy:true, timeout:15000}` → `setCoords` | Real | Handles `code 1 permission denied` and generic failure `131-136` with retry button `747-754`; live radar `calculateDistanceMeters` `30-48` duplicates business haversine for UX feedback only. |
| Server validation | `src/app/api/attendance/route.ts:40` zod `latitude/longitude/selfieMediaId`, `requireFarmAccess`, `prisma.farm.findUnique`, `media.findFirst {uploadedById:actor,kind:SELFIE,verifiedAt:not null}`, `distanceMeters` server, `outside = distance>farm.geofenceRadiusMeters`, reason required outside `62`, tx unique + statuses | Real | Server authoritative — client radar is informational (`distanceMeters` recomputed server). |
| Geofence decision | `outside → EXCEPTION_PENDING + AttendanceException.create distance/reason` vs `OPEN`; end `EXCEPTION_PENDING` vs `COMPLETED` | Real | Produces exception row with `distanceMeters` Decimal `src/app/api/attendance/route.ts:92-93` and later approve/reject table. |
| Attendance record | `prisma.attendance.create` START with `startAt, startLatitude/Longitude, startSelfieKey = media.storageKey` ; `update` END with `end*` | Real | Column `attendanceDate` is `utcDateOnly(new Date())` `route.ts:18, today()` — IST device date not used, validated `business.test.ts:157-187`. |
| Duplicate clock-in guard | `tx.attendance.findUnique {userId_farmId_attendanceDate}` + unique DB index `userId_farmId_attendanceDate` `prisma/schema.prisma:331` ; `existing -> throw "Day has already been started"` `route.ts:77`, second create rejects with Prisma 409 in tests `auth-penetration.test.ts:194-204` | Real | Prevents double start and double end (`existing.endAt` check `98`). |
| Cross-farm & cross-user | `await requireFarmAccess(input.farmId)` blocks unassigned farm 403; `media.uploadedById !== actor.id` blocks чужое selfie `54`; GET `.../attendance/route.ts:20` scopes by `userId: actor.id` only | Real | Proven by proof harness `final-acceptance-proof.ts:445-473` Officer B cannot see task, cannot patch. Attendance isolation analogous. |
| UI refresh | `await loadAttendance()` `226` + `onShiftChange` callback + toast success; state `currentAttendance` drives conditional rendering `240-482` (active vs completed vs start) | Real | `GET /api/attendance` returns most recent by today after tx commit. |

**Valid location:** status OPEN, no exception row. **Invalid location:** reason required `422 {distanceMeters}`, creates `EXCEPTION_PENDING` + exception row distance stored, visible in `ApprovalsConsole`. **GPS failure/permission denial:** error shown, `pending` stays false, attendance POST never fired (await acquires location first `167`). **Missing selfie:** early return `A live biometric… mandatory`. **Upload failure:** PUT not ok → throw; complete HEAD mismatch 422 `Uploaded file size does not match` — attendance not attempted. **Duplicate:** 409. **Cross-farm:** 403 at presign or attendance depending on entry.

**Partial/cert caveat:** Biometric confidence displayed (96/94) is *not* part of server validation; any uploaded selfie passes server if verified. GPS can be spoofed by DevTools override (no server anti-spoof like IP or device attestation).

---

## TASK AUDIT

### Agronomist task

| Step | Path | Real |
|---|---|---|
| Create | `src/components/task-form.tsx:257` submit POST `/api/tasks` + `src/app/tasks/new/page.tsx` wrapper | Real |
| Persist | `src/app/api/tasks/route.ts:38` tx `AgronomyPlan.upsert {farmId_planDate}` + `task.create {farmId,plotId,cropCycleId,planId,AGRONOMIST,category,title, ASSIGNED}` | Real |
| Validation | zod schema `route.ts:9` cuid + categories 10 + title 3-160 + priority enum, `isWithinRollingSevenDays` `33`, farm ACTIVE `34`, officer FARM_OFFICER+farmAccess `35`, plot/cycle belonging `36-37` | Real |
| Retrieve | GET `/api/tasks` scoped `taskScoped` `route.ts:24` pagination, officer sees only assigned, others farm-scoped `26-27` | Real |
| Officer visibility + Isolation | Officer B attack returns 403 `final-acceptance-proof.ts:453-471` | Real |
| Execution (start) | Officer `PATCH /api/tasks/[taskId] {status:IN_PROGRESS}` `src/components/officer-day.tsx:51` → `src/app/api/tasks/[taskId]/route.ts:9` guards `canTransitionTask`, officer ownership, planning fields forbidden | Real |
| Completion | `TaskCompletionForm:31` gathers mediaIds via presign loop `39-72` + `POST /api/tasks/[taskId]/complete` materials/labour/media + actualBeds/plants regex guards `route.ts:21-22` tx execution upsert + media link + cropCycle patch + milestone COMPLETED + task COMPLETED | Real |
| Reporting | `GET /api/reports/daily` + dashboard counts include this origin | Real |

### Milestone task

| Aspect | Reality |
|---|---|
| Automatic generation | **REAL** — `POST /api/plots/[plotId]/crop-cycles` `src/app/api/plots/[plotId]/crop-cycles/route.ts:11` `task.createMany` per milestone `{origin:SYSTEM, category:MILESTONE, title:m.name, dueDate:m.targetDate, status:AVAILABLE}`. Also edit path syncs `.../crop-cycles/[cycleId]/route.ts:58-66`. Domain test `domain-verification.test.ts:282-302` 4 tasks generated. |
| Retrieval | Same GET with `origin SYSTEM` filter (`officer-day.tsx:168-174` tabs). |
| Assignment auto-link | `POST /api/farms/[farmId]/access` assigns available system tasks `AVAILABLE→ASSIGNED` `src/app/api/farms/[farmId]/access/route.ts:9`. |
| Completion | Same execution endpoint; `task.milestoneId` drives `tx.milestone.update COMPLETED` `.../complete/route.ts:30`. |

### Daily monitoring task

| Aspect | Reality |
|---|---|
| Generation | **REAL but lazy** — `GET /api/tasks` `route.ts:16-23` if `actor.role===FARM_OFFICER && !farmId` iterates ACTIVE farms cycles and for each `exists = task.findFirst {origin DAILY_MONITORING, assignedOfficerId, cropCycleId, dueDate:requestedDate}` then creates `{ASSIGNED, title: Daily monitoring · ${cropName}}`. Means creation is triggered by officer opening list or day view, not a cron. |
| Execution | Completes via `POST /api/monitoring` path `src/app/api/monitoring/route.ts:23-26` which finds DAILY_MONITORING task for officer+cycle+today and marks COMPLETED + execution upsert, unless already completed. Direct completion also allowed via `.../complete` like agronomist tasks. |

State/assignment/authorization/duplicate prevention are enforced as above; status transitions centralized `src/lib/business.ts:31`.

---

## FARM / PLOT / CROP AUDIT

**CRUD trace:**

| Operation | UI | API | DB persist | Reload | Verdict |
|---|---|---|---|---|---|
| Create Farm | `src/components/farm-form.tsx:31` → `POST /api/farms` | zod 2-120 names, geofence 50-10000, cultivable≤total `src/app/api/farms/route.ts:8` | `prisma.farm.create {geofenceRadiusMeters default 500}` + `farmAccess create manager` | `GET /api/farms` `accessibleFarmWhere` lists; `GET /api/farms/[farmId]` shows plots/cycles | **REAL** |
| Edit Farm | `src/components/farm-edit-form.tsx` → `PATCH /api/farms/[farmId]` | status state machine `SETUP→(none)/ACTIVE→INACTIVE/COMPLETED/INACTIVE→ACTIVE` `src/app/api/farms/[farmId]/route.ts:9`; area reduction guard vs allocated plots | `prisma.farm.update` | reload shows updated; `farm-hub-client` status badge reflects | **REAL** |
| Delete/Archive Farm | Not exposed (status COMPLETED/INACTIVE via `FarmStatusControl` `src/components/farm-status-control.tsx:18`) | PATCH above; no DELETE route for Farm | status transition enforced (SETUP cannot via PATCH, only via activate) | UI reflects | **REAL (archive-only)** |
| Create Plot | `src/components/plot-form.tsx` → `POST /api/farms/[farmId]/plots` | area ≤ cultivable `route.ts:8` + irrigation superRefine | `plot.create {status SETUP, irrigation createMany}` in tx | `GET /api/farms/[farmId]` join shows irrigation chips `farm-hub-client.tsx:298-314` | **REAL** |
| Edit Plot | `src/components/plot-edit-form.tsx` → `PATCH /api/plots/[plotId]` | area overflow recalc `route.ts:9` allocated+area≤cultivable, ARCHIVED guard | tx deleteMany+createMany irrigation, update data | `GET /api/plots/[plotId]` | **REAL** |
| Archive Plot | `plot-edit-form` archive button → `DELETE /api/plots/[plotId]` | `_count active/planned cycles` 409 guard `route.ts:10` | `status ARCHIVED, deletedAt` (soft) | filtered `deletedAt:null` in farm detail `src/app/farms/[farmId]/page.tsx:36` | **REAL** |
| Create Crop Cycle | 5-step wizard `src/components/crop-cycle-form.tsx:99` → `POST /api/plots/[plotId]/crop-cycles` | `calculatedInfrastructure` persists `expectedTotalBeds/Plants` `route.ts:11` + 4 standard milestones required | `prisma.$transaction` creates `CropCycle+varieties+milestones` + `task.createMany` per milestone | `GET /api/plots/[plotId]/crop-cycles/[cycleId]` + farm hub displays `farm-hub-client.tsx:337-435` | **REAL** |
| Edit Crop Cycle | `crop-cycle-edit-form.tsx` → `PATCH .../crop-cycles/[cycleId]` | effective beds/mulch guards `route.ts:39-48`, 4 milestones retained | tx varieties deleteMany/createMany, milestones diff+sync tasks `route.ts:50-67` | Reload shows varieties+milestones+calc `59-114` | **REAL** |
| Delete Cycle | hidden delete → `DELETE .../crop-cycles/[cycleId]` | `if ACTIVE → 409` `route.ts:80` else tx `CANCELLED` + task CANCEL | status CANCELLED, tasks CANCELLED | filter `status not CANCELLED` `src/app/dashboard/page.tsx:38` | **REAL** |
| Downstream task generation | Milestones→tasks as above | See Task audit | tasks linked `milestoneId` | — | **REAL** |

**Crop cycle formulas:** `src/lib/business.ts:9` `expectedTotalBeds = bedsPerAcre==null?null:area*bedsPerAcre`, `expectedPlants = plantsPerAcre*area` — persisted and verified 100*2=200 live (`final-acceptance-proof.ts:322-332`). Values are used downstream for telemetry variance display (`farm-hub-client.tsx:373-392` Expected/Actual) and only updated via bed/plant task completion — no drift. Varieties stored as `CropVariety` with `@@unique([cropCycleId,name])` prevents duplicates; wizard dedupes `[...new Set(varieties)]` `route.ts:11`.

**Empty seed-only?** New Farm→Plot→Cycle→Task flow works identically without seed: final proof harness created greenfield+farm with 2.0 acre plot and 200/8000 calculation from scratch, proving not seed-dependent.

---

## FORM AUDIT

For each significant form, trace control/validation/submit/persistence/reload:

| Form | Controlled? | Client val? | Backend val? | Submit calls backend? | Persist? | Reload preserves? | Failure honest? | Change works? | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Farm Form** `farm-form.tsx` | Yes `useState lat/lng` controlled inputs | required, minLength, number 0.01, 50-10000 | zod `farmSchema` `src/app/api/farms/route.ts:8` + cultivable≤total | `POST /api/farms` fetch JSON | `prisma.farm.create` | `GET /api/farms/[farmId]` loads | Error div + `body.error` shown `53-55` | `farm-edit-form` patched | REAL |
| **Plot Form** `plot-form.tsx` / Edit | Yes `selected Set` + details map | irrigation at least 1, Other details placeholder, area positive | zod + `superRefine` Other→details + unique types `route.ts:7` | `POST /api/farms/[farmId]/plots` / `PATCH /api/plots/[plotId]` | tx create `IrrigationConfiguration` | GET plot shows both types | 422 banner, success hint | Edit updates many-to-one | REAL |
| **Crop Cycle Wizard** `crop-cycle-form.tsx` | Step state 1-5, computed `calculatedTotalBeds` strings | step 1 validates cropName/varieties; bed/mulch conditional required | `superRefine` beds/mulch, 4 milestones required, est. type | `POST /api/plots/[plotId]/crop-cycles` | tx cycle+varieties+milestones+tasks | GET cycle + farm hub | setError+toast both `144-148` | Edit form patches with diff | REAL |
| **Task Form (agronomy)** `task-form.tsx` | Controlled selects/date | title 3-160, 7-day window hint strip `task-board.tsx:119-182` | zod 10 categories, 7-day guard `isWithinRollingSevenDays`, farm ACTIVE, officer farmAccess, plot/cycle belonging | `POST /api/tasks` | `AgronomyPlan.upsert`+`Task.create` | `GET /api/tasks` paginated | body.error toast + inline error | `TaskBoard` inline edit PATCH | REAL |
| **Attendance Selfie** `attendance-form.tsx` | SelfiePreview URL state + scanned File state + coords | selectedFarm required, selfie File+size check `160`, geolocation required before POST | zod farmId/action/lat/lng/selfieMediaId + media verifiedAt + distance check `route.ts:40-65` | presign→PUT→complete→POST | Attendance (+Exception) | `GET /api/attendance` drives conditional UI `240-482` | gpsError div + retry + error banner `418-424,740-765` truthful | End shift patch separate | REAL |
| **Task Completion** `task-completion-form.tsx` | labourers/hours state live calc | conditional bed/plant inputs required per regex `bedActivity` `plantActivity` | zod materials 30, labour 20, media verified; bed/plant only on matching title `route.ts:21` | presign loop then `POST /api/tasks/[id]/complete` | executions/materials/labour/media link+cycle patch+milestone | `GET /api/tasks` status COMPLETED; `daily-report` resources | error dive `99-101`, photo previews local only | Cannot revert COMPLETED (`canTransition 409`) | REAL |
| **Crop Monitoring** `field-reports.tsx:126` | healthStatus choice-cards + stage select | crop cycle required, impact required if POOR (conditional render `361-375`), 1 photo mandatory field `134` | zod status/stage/impact `superRefine` POOR→impact, cycle ACTIVE `route.ts:17-18`, media verified CROP_PHOTO | `POST /api/monitoring` after presign loop | `CropMonitoring.create` + `mediaAsset.updateMany` + auto-complete DAILY task | `farm-hub-client signals tab` `491-544` | throw if zero mediaIds, body.error shown `151-154` | Later stages via new submission | REAL |
| **Incident** `field-reports.tsx:166` | incidentLevel 3 cards + quick types | level vs plot/crop guards `route.ts:7` | zod same + description 5-2000 | `POST /api/incidents` | incident + media link tx | farm hub incidents list | same | Follow-up PATCH separate | REAL |
| **Manual Weather** `manual-weather-form.tsx` | farmId/date state + existing manual fetch | numbers gte/lte (`src/app/api/weather/manual/route.ts:9`), maxLength 500/2000 | same zod ranges + `requireRole SUPER_ADMIN/AGRONOMIST/FARM_ADMIN` | `POST /api/weather/manual` upsert | `AgronomyPlan.upsert` manual cols | `GET /api/weather/manual?farmId&date` shows stored `148-169` | message hint vs error `242-245` | Upsert overwrites same date `82` | REAL |
| **Farm Access** `farm-access-manager.tsx` | userId select | availableOfficers filtered `!access.some` | only ACTIVE farm, officer active FARM_OFFICER, auto-assign `route.ts:9` | `POST/DELETE /api/farms/[farmId]/access` | `FarmAccess upsert/delete` | `GET /api/farms/[farmId]/access` access array | confirm dialog on remove `65` | Re-assign possible | REAL |
| **Location Request** `location-request-form.tsx` | lat/lng state captured | farm, reason 5ch, coord ranges | same zod `route.ts:7` + `requireFarmAccess` | `POST /api/location-change-requests` | `LocationChangeRequest.create PENDING` | `approvals-console` locations tab | hint vs error `182-187` | Approval mutates farm coords `route.ts:patch` | REAL |
| **Admin Users** `admin-console.tsx` | role/search filters, create drawer | email, password 12, role enum, farmIds | `createUserSchema` `src/app/api/users/route.ts:8` farm existence check | `POST /api/users`, `PATCH /api/users/[id]` | `User.create` with tx `farmAccess.create` | `GET /api/users` | error vs hint banners | PATCH updates role/active/farms | REAL |

**No optimistic/client-only mutation bypass:** Every submit awaits fetch and parses error body before toast/state update; no local state pretended as persisted. Client calculations (beds per acre preview, labourHours hint) are recomputed server-side too.

---

## BUTTON AUDIT

Classification key: REAL = calls real API and changes DB; NAV = navigation; UI_STATE = drawer/toggle; DEAD = no-op; FAKE = success toast without persistence; PARTIAL = starts but does not finish.

| Button / Action | File:line | Handler | Effect | Classification |
|---|---|---|---|---|
| **Login** → Create session | `src/components/login-form.tsx:57` submit `POST /api/auth/login` → `Set-Cookie` → `router.replace("/dashboard")` | `fetch+createSession` | JWT 8h | **REAL** |
| **Logout** | `src/components/logout-button.tsx:*` `POST /api/auth/logout` → `router.replace("/login")` | `clearSession` | destroys cookie | **REAL** |
| **New Farm** (dashboard) → `/farms/new` | `src/components/dashboard-client.tsx:100` `<Link href="/farms/new">` | navigation | — | NAV |
| **Create Setup Farm Record** | `src/components/farm-form.tsx:43` `POST /api/farms` → `router.replace(/farms/${id})` | DB create | Farm row | **REAL** |
| **Capture GPS** (farm/plot/location) | `farm-form.tsx:15`, `plot-form.tsx: capture`, `location-request:26` `navigator.geolocation.getCurrentPosition` | local state | sets lat/lng string | UI_STATE (but enables real submit) |
| **Activate Farm** | `src/components/activate-farm-button.tsx:11` `POST /api/farms/${id}/activate` → `router.refresh()` | tx ACTIVE farm/plots/cycles | status ACTIVE | **REAL** |
| **Update Farm Status** (INACTIVE/COMPLETED) | `src/components/farm-status-control.tsx:18` `PATCH /api/farms/${id} {status}` | update status | persisted | **REAL** |
| **Create New Plot** drawer toggle | `src/components/farm-hub-client.tsx:263` `setShowAddPlot` | local | — | UI_STATE |
| **PlotForm submit** | `src/components/plot-form.tsx:78` `POST /api/farms/[farmId]/plots` | plot + irrigation | persisted | **REAL** |
| **Edit Plot** link | `farm-hub-client.tsx:319` `<Link href=/plots/${id}>` | nav | — | NAV |
| **Plan Crop** link | `farm-hub-client.tsx:325` link | nav | — | NAV |
| **Crop Cycle wizard steps Back/Continue** | `crop-cycle-form.tsx:88-97` `setCurrentStep` | local | — | UI_STATE |
| **Confirm & Launch Cycle** | `crop-cycle-form.tsx:99` `POST /api/plots/${plotId}/crop-cycles` → `/farms/${farmId}` | cycle+milestones+tasks | persisted | **REAL** |
| **Edit Milestones** link | `farm-hub-client.tsx:364` link | nav | — | NAV |
| **Save Crop Cycle Changes** | `crop-cycle-edit-form.tsx:57` `PATCH /api/plots/${plotId}/crop-cycles/${cycleId}` | update cycle+varieties+milestones | persisted | **REAL** |
| **Assign Officer** | `src/components/farm-access-manager.tsx:37` `POST /api/farms/${farmId}/access` → `load()` | FarmAccess + auto tasks | persisted | **REAL** |
| **Remove Officer** (+ confirm) | `farm-access-manager.tsx:64` `DELETE /api/farms/${farmId}/access` `confirm` | delete row | persisted | **REAL** |
| **Plan Activity** (tasks/new, task-board) | `src/components/task-board.tsx:241` `Link href="/tasks/new"` + `task-form.tsx: submit` `POST /api/tasks` | task + plan | persisted | **REAL** |
| **TaskBoard Save Changes** (inline edit) | `task-board.tsx:69` `PATCH /api/tasks/${id}` with title/desc/priority/dueDate | update | persisted | **REAL** |
| **Launch Face Scanner / Upload Photo** | `src/components/attendance-form.tsx:659-682` `setShowScanner` true / `fileInputRef click` | local scanner open / file picker | toggles `BiometricFaceScanner` | UI_STATE |
| **Scan & Verify Face** | `src/components/biometric-face-scanner.tsx:114` `captureLiveSnapshot` → canvas draw → `analyzeImageAndComplete` (brightness 600ms) → `onCapture(file,url,confidence)` | produces File + preview + fake confidence | **PARTIAL / fake confidence** | PARTIAL — starts real capture & produces real selfie file (used downstream), but confidence is fabricated; button labelled verification misleads |
| **Clock In & Start Field Shift** | `attendance-form.tsx:766` `handleAttendanceSubmit("START")` → geolocate→presign→PUT→complete→`POST /api/attendance` → `loadAttendance()+toast` | creates Attendance OPEN/Exception | persisted | **REAL** (confidence ignored) |
| **Refresh Queue / Retry GPS** | `officer-day.tsx:112` `load()` ; `attendance-form.tsx:747` `acquireLocation` | refetch or retry | — | UI_STATE/REAL |
| **Start Activity** | `src/components/officer-day.tsx:51` `PATCH /api/tasks/${id} {IN_PROGRESS}` → `load()` | status IN_PROGRESS + execution | persisted | **REAL** |
| **Record Completion** toggle | `officer-day.tsx:260` `setCompletionId` | toggles form | — | UI_STATE |
| **Complete Activity** | `task-completion-form.tsx:78` presign loop then `POST /api/tasks/${id}/complete` | execution+materials+labour+media | persisted | **REAL** |
| **Submit Daily Monitoring** | `src/components/field-reports.tsx:126` handler | monitoring create + auto task | persisted | **REAL** |
| **Transmit Incident** | `field-reports.tsx:166` handler | incident create | persisted | **REAL** |
| **IncidentStatusControl select** | `src/components/incident-status-control.tsx:16` `PATCH /api/incidents/${id} {status}` → `router.refresh` | status OPEN→… | persisted | **REAL** |
| **Add Follow-up / Save Follow-up** | `incident-followup.tsx:30` `POST /api/incidents/${id}/follow-ups` | follow-up row + status bump | persisted | **REAL** |
| **Approvals: Approve/Reject Exception** | `approvals-console.tsx:65` `PATCH /api/attendance-exceptions/${id} {APPROVED/REJECTED}` | exception + attendance status | persisted | **REAL** |
| **Approvals: Approve & Update Farm** | `approvals-console.tsx:237` `PATCH /api/location-change-requests/${id} APPROVED` → `farm.update lat/lng` | farm coordinates mutated | persisted | **REAL** |
| **Dashboard farm cards Open Hub** | `dashboard-client.tsx:237` `<Link href=/farms/${id}>` | nav | — | NAV |
| **Reports Print/PDF** | `daily-report.tsx:174` `window.print()` | browser print | — | UI_STATE (correct — no backend) |
| **Admin Create User / Manage Access** | `admin-console.tsx:42` `POST /api/users` + `update:93` `PATCH /api/users/${id}` | user + farmAccess | persisted | **REAL** |
| **Weather Manual Save** | `manual-weather-form.tsx:68` `POST /api/weather/manual` | upsert plan manual | persisted | **REAL** |
| **Location Request Submit** | `location-request-form.tsx:49` `POST /api/location-change-requests` | request row | persisted | **REAL** |

**No DEAD/FAKE success:** Every important action that shows a success toast or “recorded” message (`attendance-form.tsx:221 toast.success`, `task-completion-form.tsx: onComplete -> toast`, `field-reports.tsx:158 "synchronized"`) is gated behind `if (!res.ok) throw` and only after `await fetch` success plus `load()`/`router.refresh` revalidation. No `setTimeout` fake completions or `return {success:true}` stubs. Sole “FAKE success” risk is the scanner’s `96% Match` badge implying verification success without server check — visual but does not gate persistence.

---

## DASHBOARD AUDIT

For each KPI trace `UI number → API/query → DB`. Manual mutation test: changing underlying data (insert plot, complete task) changes KPI after refresh (proven in build & proof harness).

| KPI | UI (`DashboardClient` / `dashboard/page.tsx:45-54`) | API | Query source | Real? | Notes |
|---|---|---|---|---|---|
| Managed Farms (total / Active/Setup) | `metrics.totalFarms / activeFarms / setupFarms` `dashboard-client.tsx:143-147` | `GET /api/dashboard` `route.ts:6` Promise.all `farm.count` cluster OR `dashboard/page.tsx:35-43` server page equivalents | `prisma.farm.count {where:{status:"ACTIVE",...farmScope}}` | **REAL** | Server page counts match API counts when same actor/scope; live proof `final-acceptance-proof.ts:765-780` byte-for-byte. |
| Active Farms | `activeFarms` | same | `farm.count status ACTIVE` | REAL |
| Setup Farms | `setupFarms` | — (page only) `farm.count status SETUP` `dashboard/page.tsx:37` | verified against seed 8 plots | REAL |
| Plots & Crops | `metrics.totalPlots / totalCrops` `dashboard-client.tsx:149` | `api/dashboard` `activePlots,activeCropCycles` | `plot.count {status ACTIVE,deletedAt null, linkedFarmScope}` `cropCycle.count {status ACTIVE, cropScope}` | REAL |
| Activity Dispatch (total / completed) | `metrics.totalTasks / completedTasks` `dashboard-client.tsx:162` | `api/dashboard` `planned,completed` | `task.count {where:taskScoped}` + `status COMPLETED` | REAL |
| Pending & Delayed Activities | `dashboard/page` has `pendingIncidents` but `api/dashboard` adds `pendingActivities,delayedActivities` | `api/dashboard` `pending: status IN [ASSIGNED,AVAILABLE,IN_PROGRESS,BLOCKED]` `delayed: same + dueDate<utcDateOnly(today)` | `prisma.task.count` correctly; **but `src/app/dashboard/page.tsx:53` hardcodes `delayedAlerts:0`** never calls API pending/delayed | **HARDCODED (page)** — API is real, page masks it. Fix: read `GET /api/dashboard` or server query delayed properly. |
| Field Signals (open incidents) | `metrics.pendingIncidents` `dashboard-client.tsx:183` | `api/dashboard` `incidents: status IN [OPEN,ACKNOWLEDGED]` | `incident.count` | REAL |
| PoorCropUpdates | `api/dashboard` `poorUpdates` `cropMonitoring count status POOR` — not displayed on page cards (used internally) | API | REAL |
| Search & Status Tabs | Client filter `dashboard-client.tsx:55-65` | local filter of `farms` array | — | UI_STATE real |
| **Mutation reflection** | Insert plot `POST /api/farms/.../plots` → `totalPlots` increments on next fetch; completing task flips `completedActivities` | — | — | Verified by proof: `Green Valley` plot count 1 appears in counts. |

**Query precision:** Scoping `farmScope` `unrestricted?selected:{...access:{some:{userId}}}` and `taskScoped` `FARM_OFFICER→assignedOfficerId` (`src/app/api/dashboard/route.ts:6`) ensures non-admin sees only own farms/tasks — correct isolation.

---

## REPORT AUDIT

`GET /api/reports/daily?farmId&date` (`src/app/api/reports/daily/route.ts:6`) aggregates:

```ts
prisma.attendance.findMany {farmId, attendanceDate:date, ...(own?{userId})}
prisma.task.findMany {farmId, dueDate:date, ...(own?{assignedOfficerId})} include executions{materials,labour}
prisma.cropMonitoring.findMany {farmId, createdAt gte date lt end+1d, ...(own?{officerId})}
prisma.incident.findMany {farmId, createdAt gte date lt end+1d, ...(own?{reporterId})}
labourHours = flatMap → sum(Number(l.labourHours))
photoCount = sum monitoring.media+ incidents.media
```

Trace: DB rows → API JSON → `DailyReport` `src/components/daily-report.tsx:34-406` renders 4 cards (Attendance Roster, Task Execution, Resource & Labour, Crop Signals & Incidents) with metric grid `completed/total`, `labourHours hrs`, `photoCount`, materials list, stage remarks. **All numbers derived live**, no assembled fake object. `utcDateOnly` (`src/lib/business.ts:17`) ensures dueDate equality by date, not time — correct vs IST drift. Officer scoping (`own` flag) returns only own rows (verified by proof dual reports `todayStr` vs `taskDueDateStr` both correct counts `final-acceptance-proof.ts:796-832`). Totals match DB when re-queried within proof.

---

## WEATHER AUDIT

Provider: `process.env.WEATHER_PROVIDER_URL` (`.env:9` `https://api.open-meteo.com/v1/forecast` + `docker-compose` not needed). Request flow `src/app/api/weather/route.ts:6`:

1. `requireFarmAccess(farmId)` — authz real.
2. If no `WEATHER_PROVIDER_URL` env → `503 {error:"Weather integration has not been configured."}`.
3. Otherwise `new URL(base)` sets `latitude=farm.latitude`, `longitude=farm.longitude`, `current=temperature_2m,relative_humidity_2m,wind_speed_10m`, `daily=precipitation_probability_max`, `timezone=auto`.
4. `fetch(url,{next:{revalidate:900}})` (15min edge cache) → if not ok `503 "Weather provider is temporarily unavailable."` else return provider JSON verbatim (no mapping).
5. UI `src/components/weather-card.tsx:25-42` fetch shows `error` paragraph (no chart) if non-ok, loading `"Connecting to meteorological satellites…"` while pending, then renders `temperature_2m / humidity / wind / precipitation_probability_max`. No fake dataset.

**Classification: REAL API DATA** (when env configured + farm coords + network available), **503 error presentation** otherwise. The UI header `"Open-Meteo Live"` `weather-card.tsx:60` and `"Real-time coordinates synced from farm GPS."` `110` are honest — live flag is tied to API ok response, error view does **not** present stale data as live.

**Manual override:** separate upsert table (`AgronomyPlan.manual*` cols) displayed alongside Auto line `"Stored Manual Override: …"` `manual-weather-form.tsx:165-167` clearly distinguished from satellite.

**Failure behavior:** No silent fallback; explicit 503 → `error` state `setError(e.message)` keeps old weather nulled, not retained. Correct not to fabricate.

---

## MEDIA / UPLOAD AUDIT

| Kind | Browser → uploadRequest → storage → mediaRecord → association → retrieval | Result |
|---|---|---|
| **SELFIE** (attendance) | `attendance-form.tsx:169 presign POST {farmId, SELFIE, mime,size}` → S3 presign PUT `PUT uploadUrl` with Content-Type → `POST /api/uploads/${mediaId}/complete` HEAD verify `src/app/api/uploads/[mediaId]/complete/route.ts:16` size+type vs declared → `verifiedAt=now()` → `POST /api/attendance {selfieMediaId}` `findFirst {uploadedById, kind SELFIE, verifiedAt not null}` then `startSelfieKey = media.storageKey` on Attendance; `GET /api/media/${id}/url` requires `verifiedAt` + `requireFarmAccess` then `downloadUrl` presigned GET 300s `src/app/api/media/[mediaId]/url/route.ts:6` | **REAL end-to-end** |
| **CROP_PHOTO** (monitoring) | `field-reports.tsx:31 uploadPhotos` same presign loop kind CROP_PHOTO → after monitoring create `tx.mediaAsset.updateMany {in ids, uploadedById, kind CROP_PHOTO, monitoringId null, verifiedAt not null} data {monitoringId, farmId}` `src/app/api/monitoring/route.ts:21` else throw | REAL |
| **INCIDENT_PHOTO** | same but kind INCIDENT_PHOTO → `incidentId` link `src/app/api/incidents/route.ts:8` | REAL |
| **ACTIVITY_EVIDENCE** (task) | `task-completion-form.tsx:39` kind ACTIVITY_EVIDENCE → `.../complete` → `count.count !== length` throw + `executionId` link `route.ts:25` | REAL |

*Validation:* z `allowedMimeTypes` jpeg/png/webp, `sizeBytes <=10MB` `presign/route.ts:10`; verified size/type enforced on complete (409 if mismatch `complete:17-19`); `media.farmId` null → `throw Media is not attached` `complete:13`; `uploadedById !== actor && role !== SUPER_ADMIN →403` `complete:15`. Preview via `URL.createObjectURL` before upload is browser-only (`attendance-form.tsx:108, field-reports.tsx:386`) and correctly not considered proof; server guards persist separation.

*Failure tests:* `PUT not ok` → throw `"Photo upload failed."`; `complete not ok` → body.error; `updateMany count mismatch` → throw `"unavailable or unverified"` — transactions roll back (monitoring/incident/task not created when media link fails). Duplicate upload idempotent? Second complete would find already verified (size same) and return updated same row (not error) but attendance/tasks `executionId: null` guard prevents double-linking.

*Unauthorized media access:* `GET /api/media/:id/url` requires `requireFarmAccess(media.farmId)` and `verifiedAt` check — prevents cross-farm leak; `presign POST` also needs `requireFarmAccess(input.farmId)`.

---

## LOCATION AUDIT

| Stage | Impl | Real? |
|---|---|---|
| Browser capture | `navigator.geolocation.getCurrentPosition {enableHighAccuracy:true, timeout:15000}` `attendance-form.tsx:124` + plot/farm/location forms capture buttons | REAL |
| Coordinate state | `useState coords {lat,lng}` `attendance-form.tsx:63` updated only on success, nulled after submit `224` | REAL |
| Farm coordinates | `Farm.latitude/longitude Decimal(10,7)` + `geofenceRadiusMeters Int default 500` `prisma/schema.prisma:119-125` per-farm (seed varied 500/600/800) | REAL |
| Server coords | `POST /api/attendance {latitude, longitude}` zod coerce  -90..90 / -180..180 `route.ts:9` stored `startLatitude/Longitude` `Decimal(10,7)` | REAL |
| Geofence calc | `distanceMeters(a,b)` Haversine `src/lib/business.ts:4` Earth radius 6371000, radians convert, `2*R*atan2(sqrt...` reused client-side for UX `attendance-form.tsx:30` but **server authoritative** (`attendance/route.ts:56`) | REAL |
| Threshold | `farm.geofenceRadiusMeters` per farm; not hardcoded 500m — default constant `DEFAULT_GEOFENCE_RADIUS_METERS=500` only fallback `attendance-form.tsx:99` client & `src/app/api/farms/route.ts:10` create default | REAL |
| Exception & approval | `AttendanceException` model `prisma/schema.prisma:333` stores `distanceMeters Decimal(12,2)` + reason + PENDING/APPROVED/REJECTED; list `GET /api/attendance-exceptions` pending only, approvals page PATCH, location request APPROVED mutates `farm.latitude/longitude` | REAL |
| Hardcoded checks | None: `src/lib/business.test.ts:69` distance 12.9816 proves >500; no `500` string literal in attendance route threshold; client `maxRadius = selectedFarm.geofenceRadiusMeters ??500` correctly fallback only if null | REAL |
| Spoof risk | Not mitigated (no device attestation) — documented as caveat (can be spoofed via browser) | Partial threat |

No simulated coordinates, no client-only validation (server re-computes), no hardcoded 500m label without check — `proximityInfo.isWithin` correctly mirrors server decision but server never trusts it.

---

## SECURITY REALITY AUDIT

**Auth:** `jose` HS256 32char secret required (`src/lib/auth.ts:12` throws if <32), 8h expiry, httpOnly lax sameSite, secure flag env-tied `src/lib/auth.ts:18` `APP_SESSION_SECURE ? ==='true' : NODE_ENV==='production'` (fixes localhost http issue). `getSession` `jwtVerify` + `payload.userId/role/name` shape check; `requireSession` also verifies `user.active` else `clearSession+redirect` `src/lib/auth.ts:35`; `requireActiveUser` throws `Unauthenticated` → 401. Tests `business.test.ts` etc. hit DB directly, not HTTP — so route cookie validation not covered by unit tests; live harness proved via real `fetch Set-Cookie` in `final-acceptance-proof.ts:23`.

**Authorization matrix enforced:** Every route imports `currentActor` then explicit `requireRole` and/or `requireFarmAccess`. Spot checks:

- `POST /api/farms` SUPER_ADMIN,FARM_ADMIN (`src/app/api/farms/route.ts:10`); `PATCH /api/farms/[farmId]` manage=true (`src/app/api/farms/[farmId]/route.ts:9`).
- `POST /api/farms/[farmId]/plots` manage=true; `PATCH/DELETE plot` manage=true; irrigation uniqueness guard.
- `POST /api/plots/[plotId]/crop-cycles` manage=true + ARCHIVED guard.
- `POST /api/tasks` SUPER_ADMIN,AGRONOMIST only + farm ACTIVE + officer FARM_OFFICER+farmAccess (`src/app/api/tasks/route.ts:33-36`).
- `PATCH /api/tasks/[taskId]` officer can only update own tasks + planning fields 403 (`src/app/api/tasks/[taskId]/route.ts:9`).
- `POST /api/tasks/[taskId]/complete` FARM_OFFICER,SUPER_ADMIN + assignedOfficerId check (`route.ts:18`).
- `POST /api/attendance` FARM_OFFICER,SUPER_ADMIN + farmAccess + `uploadedById==actor` + verifiedAt (`route.ts:42-55`).
- `GET /api/attendance/list` SUPER_ADMIN,FARM_ADMIN only (`src/app/api/attendance/list/route.ts:5`) via `accessibleFarmWhere`.
- `GET /api/attendance-exceptions` same scoping (`src/app/api/attendance-exceptions/route.ts:5`) pending filter.
- `PATCH /api/attendance-exceptions/[id]` manage=true + role FARM_ADMIN,SUPER_ADMIN + PENDING guard (`route.ts:patch`).
- `GET/POST /api/monitoring, /api/incidents` FARM_OFFICER,SUPER_ADMIN + farmAccess.
- `GET /api/media/[id]/url` requires farm access + verifiedAt (`src/app/api/media/[mediaId]/url/route.ts:6`) — prevents cross-farm media leak.
- `POST /api/uploads/presign` requires farm access; `POST complete` checks uploadedById match unless SUPER_ADMIN.
- `GET /api/users` SUPER_ADMIN only; `POST` SUPER_ADMIN.
- Dashboard/reports use `accessibleFarmWhere / requireFarmAccess + own` flag for officers.

**Attempted attacks (static + harness):**

- *Cross-farm access:* FarmAdminA cannot see FarmSmall2; `prisma.farmAccess.findUnique` null → 403 proven (`auth-penetration.test.ts:128-137`, `final-acceptance-proof.ts:445 OfficerB cannot see Agronomist task` + direct PATCH 403).
- *ID substitution:* Task patch with other officer’s ID → “A Farm Officer may only update their own tasks.” 403; attendance media swap → “A valid uploaded selfie is required.” or 403 on complete’s uploadedById.
- *Direct API bypass:* Seed/admin endpoints correctly reject unauthenticated via `apiError` 401/`HttpError`.
- *Role escalation:* `requireRole("FARM_OFFICER",["SUPER_ADMIN"])` throws HttpError 403 (`auth-penetration.test.ts:121-124`); no client can set role — stored server DB.
- *Disabled account:* `requireSession` checks `user.active` and clears session + `auth-penetration.test.ts:146-153` proves active=false isolated; `login/route.ts:11` short-circuits `!user.active` → 401 before bcrypt.
- *Unauthorized media:* `GET /api/media/...` farm access gate + verifiedAt = not null prevents unauth fetch.
- *Unauthorized approvals:* `PATCH attendance-exceptions` requires manage=true + admin role, else 403; 409 if already reviewed.

**Gaps / Caveats:**

1. `platformRoles = SUPER_ADMIN,AGRONOMIST` (`src/lib/access.ts:7`) bypasses `requireFarmAccess` entirely. Agronomist is intentionally global prescriber but this also lets Agronomist read any farm’s plots/monitoring/incidents without explicit assignment — per BRD correct but reduces farm-isolation granularity for that role (documented).
2. `requireFarmAccess` trusts cookie session only; no CSRF token (sameSite lax mitigates most, but not same-site POST from attacker page within lax window).
3. Concurrent double start prevented by DB unique + tx findUnique, but race without tx isolation could still 409 gracefully — handled but not locking (Prisma error path tested via `apiError` 409).
4. Media presign kind enum is not further scoped by role (`presign/route.ts:10` kind enum includes SELFIE for all) — FARM_ADMIN can presign selfie; not exploited but broad.

No privilege escalation or farm escape discovered when checks are followed; seed data respects same constraints as new records.

---

## SEED-DATA DEPENDENCY AUDIT

Procedure: created new farm+plot+cycle+officer from scratch in proof harness without relying on seed IDs.

- `final-acceptance-proof.ts:165-206` created `Green Valley Estate ${timestamp}` (10 acres) + `Sunrise Organic ${timestamp}` (5 acre) freshly via `prisma.farm.create` with own access rows, not upserting `farm-greenfield-01`. Plot `North Block A1` 2.0 acres created via `POST /api/farms/${farmA.id}/plots` live API (`254-268`) with Drip+Sprinkler, proving non-seeded path.
- Crop cycle `Watermelon` 100 beds/acre *2 =200 beds, 4000 plants/acre *2=8000 created via `POST /api/plots/${plotId}/crop-cycles` `286-314` with 3 varieties + 5 milestones; db re-read proves calc matches.
- Activation of `Sunrise` without plot rejected 422, of Green Valley succeeds (`353-396`) — same gatekeeper as seeded.
- Agronomist task dispatched to Officer A via `POST /api/tasks` `406-420`, visibility cross-checked.
- All flows succeeded without referencing `farm-greenfield-01` / `plot-gf-01`. No workflow relies on pre-existing `seed.ts` IDs; hardcoded IDs in seed are only demo bootstrap (`greenfield/valley/sunrise`) but APIs accept any cuid.

**Verdict: REAL — new records behave identically to seeded. No seed-data dependency.**

Edge: `prisma/seed.ts:9` default password `LocalAdminPassword-ChangeMe-123` and 3 demo farms are idempotent `upsert`, not required.

---

## PRODUCTION VS DEVELOPMENT AUDIT

| Concern | Dev | Production |
|---|---|---|
| **Env required** | `.env:1-12` DATABASE_URL localhost + APP_SESSION_SECRET 32+ dev + S3 localhost:9000 change-me + WEATHER_PROVIDER_URL open-meteo | Must provide real Postgres, S3 (AWS/MinIO), APP_SESSION_SECRET 32+, WEATHER_PROVIDER_URL (optional but needed for live telemetry). No `.env.example` secrets enforcement. |
| **Cookie Secure** | `src/lib/auth.ts:18` `secure = APP_SESSION_SECURE==='true' ? true : NODE_ENV==='production'?true:false` — correctly allows `http://localhost` when `APP_SESSION_SECURE=false` (previously always true, fixed per `IMPLEMENTATION_STATUS.md hardening`); dev default `false` when NODE_ENV !== production | Production `NODE_ENV=production` → `secure true` + httpOnly + sameSite lax; requires HTTPS else browser drops cookie (correct, but breaks if behind non-HTTPS proxy). |
| **URL assumptions** | No localhost hardcoded in APIs (all relative `/api/...`); `src/lib/storage.ts:5` `S3_ENDPOINT` env only, not localhost string in code | Same relative URLs — correct for any host; `S3_ENDPOINT` must be absolute URL. |
| **Storage config** | `docker-compose.yml:10` minio + minio-setup creates bucket `agaate-evidence` private via `mc mb --ignore-existing`; healthcheck curl/wget; S3 creds `change-me` only for dev | Prod creds must be replaced; bucket policy private correct for presigned URLs (no public). No path-style hardcode — `S3_FORCE_PATH_STYLE` env flag. |
| **API base URLs** | All fetches use `"/api/..."` relative — no `localhost:3000` leak except proof harness `BASE_URL=http://localhost:3005` (`final-acceptance-proof.ts:5`) isolated to scripts/ not src | Safe. |
| **Production-only branches** | Only `prisma` log level `warn` vs `error` (`src/lib/prisma.ts:5`), global prisma caching (`globalForPrisma`) enabled when NOT production — standard. No feature flags. | No extra code path. |
| **Build output** | `npm run build` 23 routes, 20 static + ƒ dynamic via `dynamic="force-dynamic"` on dashboard/farm/officer pages (no ISR leaking). `next.config.ts:2` `serverExternalPackages` correctly externalizes prisma+s3. | Build passes in harness (2.4s compile). No `localhost assumptions`. |
| **Feature flags / debug bypasses** | None found (`grep mock/placeholder` only placeholder text, not feature flags). | — |
| **Risk** | Default `.env` contains `S3_ACCESS_KEY_ID=change-me`, `S3_SECRET_ACCESS_KEY=change-me-too` — insecure if copied verbatim to prod. `INITIAL_ADMIN_PASSWORD` default weak `LocalAdminPassword-ChangeMe-123` in seed fallback `prisma/seed.ts:9`. | Deploy guide must require rotation; not auto-enforced. |

**No dev-vs-prod behavioral divergence beyond cookie secure and log verbosity.** App is production-buildable; runtime failures will be due to missing env/storage provider, not code branching.

---

## HARDCODED FEATURES

| File:line | What is hardcoded | Why it matters / Correct impl |
|---|---|---|
| `src/app/dashboard/page.tsx:53-54` `delayedAlerts: 0` | Always zero; dashboard’s 4th subtext never shows overdue. API `GET /api/dashboard` correctly counts `delayedActivities: dueDate<utcDateOnly(today)` `src/app/api/dashboard/route.ts:6`. | Page must query same logic: `prisma.task.count({where:{farm:where, status:IN[ASSIGNED…], dueDate:{lt:utcDateOnly(today)}}})` or consume API. |
| `src/lib/business.ts:1` `DEFAULT_GEOFENCE_RADIUS_METERS=500` | Default only — not feature hardcode; per-farm `geofenceRadiusMeters` overrides (500/600/800 seed, editable `farm-form.tsx:163`). | Acceptable constant — document default. |
| `src/components/biometric-face-scanner.tsx:49 qualityScore 96`, `149 qualityScore 94`, `85+(avgBrightness%14)` range 88-99 | Simulated face confidence presented as biometric | Remove fake confidence; either remove badge or replace with real similarity score from server verification. |
| `src/app/globals.css` etc., design tokens `#059669` emerald, spacing scales, `metric-grid` 4 cards | Styling, not business data | Not functional hardcode. |
| `prisma/seed.ts:70-98` Demo farm lat/lng 12.5284/77.8341, areas 15.5, etc. | Demo bootstrap only, not runtime | Acceptable. |
| `src/components/task-board.tsx:148-179` 7-day rolling window hardcoded 7 | Per spec §19 | Acceptable constant via `isWithinRollingSevenDays`. |
| `scripts/final-acceptance-proof.ts:5` `BASE_URL=http://localhost:3005` | Script only, not src | N/A. |

No hardcoded KPI, coordinates, percentages, or status progress otherwise — all computed live.

---

## MOCKED / SIMULATED FEATURES

| Feature | File:line | Simulated behavior | Reality |
|---|---|---|---|
| **Biometric confidence / liveness** | `src/components/biometric-face-scanner.tsx:80-92`, `attendance-form.tsx:547 badge` | `getImageData` brightness mod 14 + 5×20% `setInterval 120ms` laser + `96% Match` badge | No face detection/embedding/liveness; any photo passes. See scanner audit. |
| **Proof-harness S3 bypass** | `scripts/final-acceptance-proof.ts:76-82` `catch (_) {}` on PUT then `if (!completeRes.ok) prisma.mediaAsset.update {verifiedAt:new Date()}` | Bypasses real HEAD verification when MinIO not running, to let acceptance pass | Test-only, not shipped (`scripts/` excluded from build). But it means acceptance proof is **not** a pure S3 integration proof in that environment. |
| _(None else)_ | — | Search `src/**/*.ts(x)` for `mock|simulate|Math.random` → only `src/components/ui/toast.tsx:31 Math.random` for toast ID (correct, non-business) + `.agents/skills/...` docs | No other mocked dataset, fake chart, fake notification, fake progress ring (progress ring `officer-day.tsx:124` is real `completed/total *100`). |

Charts/maps: none used (weather card is numbers, not chart).

---

## DEAD / BROKEN ACTIONS

**Important-button liveness audit (see BUTTON AUDIT):** No dead `onClick` found. Every primary workflow button fires a fetch, mutates DB, then revalidates.

**One broken-adjacent path — storage outage:**

- When S3/MinIO unreachable or creds invalid, `headObject` (`src/lib/storage.ts:9` → `HeadObjectCommand`) throws `not configured / provider temporarily unavailable` caught as 503 `src/lib/api.ts:10`. This correctly blocks `POST .../complete` (`verifiedAt` never set) and therefore all subsequent operations that require `verifiedAt != null` (attendance, monitoring, task completion) fail with `"A valid uploaded selfie... required."` / `"unavailable or unverified"` — operationally dead from user perspective though technically correct enforcement. User sees perpetual upload error, no hint to retry bucket setup.

- No handler leaves UI in dead success state: all error branches set `message`/`error` div and remain in form; none navigate on failure.

**Other dead-risk:** None. Search for `() => {}` `return true` stubs found only business helper truths, not handlers.

---

## MISREPRESENTED FEATURES

| Label / Claim | Location | Actual capability | Gap |
|---|---|---|---|
| **“Biometric Face Scan”, “Biometric Face Verification”, “AI Verified”, “Instant AI Face Alignment”, “Live facial landmark scan”, “{96/94}% Match Verified”** | `src/components/biometric-face-scanner.tsx:197`, `attendance-form.tsx:524-553,651-656,722` | Brightness check only, no detection/embedding/comparison | **CRITICAL misrepresentation** — UI and copy imply identity proof and spoof protection; exam shows trivial wall photo bypasses. |
| **“GPS Verified Field Presence”** (shift badge) | `src/components/attendance-form.tsx:279` `"GPS Verified Field Presence"` when `startAt && !endAt` | GPS server verification exists (distance vs farm radius), but badge shown immediately on start fetch before any server cross-check in UI state (derived from `currentAttendance.startAt` existence, not `withinGeofence` response). Server does set EXCEPTION_PENDING correctly, but UI copy overstates verification moment. | Medium — remove or gate on `withinGeofence` response + exception status. |
| **“Production ready”** (legacy docs) | `docs/IMPLEMENTATION_STATUS.md:5` claims 100% verified | Real readiness blocked by biometric claim, hardcoded delayed, S3 secret defaults, no prod env proof | Medium — docs overstate. |
| **“Live Telemetry Forecast — Open-Meteo Live”** subtitle | `src/components/weather-card.tsx:60` | Live when provider OK; error view (“Live weather is unavailable.”) correctly does not show live tag over stale data, but `ManualWeatherForm` auto line `auto` still shows error string `setAuto(e.message)` (`manual-weather-form.tsx:51`) which is acceptable. Not misrepresenting stale as live. | Low — currently honest. |
| **Dashboard “Field Signals — All Clear / Active Incidents”** | `src/components/dashboard-client.tsx:183` | Real `pendingIncidents>0` count drives color | Real. |
| **Reports “PhotoCount”** | `src/components/daily-report.tsx:245` `report.photoCount` | Real sum of monitoring+incident media lengths (`src/app/api/reports/daily/route.ts:6`) | Real. |

No other AI/fraud/encryption claims beyond above.

---

## DATABASE GAPS

| UI exists | Persistence missing or incomplete? | Detail |
|---|---|---|
| All Farm/Plot/CropCycle/Task/Attendance/Monitoring/Incident/IncidentFollowUp/LocationChangeRequest/Media/Audit flows | **NONE — persistence complete** | Every submit writes prisma row + validated; reload via `GET /api/...` or server `prisma.*.findMany` returns same; foreign keys cascading (`onDelete:Cascade` for FarmAccess, Irrigation, CropVariety, TaskExecution, Media) preserve integrity; soft deletes (`deletedAt`) respected; unique constraints (`Farm.name? no` but `Plot [farmId,name]` unique, `CropVariety [cropCycleId,name]`, `Attendance [userId,farmId,date]`) enforce duplicates. |
| Attendance `startSelfieKey`/`endSelfieKey` | Stores `media.storageKey` string, not `mediaId` relation | Intentional denormalization — associated media still queryable via `media.farmId` + `uploadedById`. No gap, but relation not FK-enforced to Attendance. |
| Biometric confidence | Never persisted (`biometricConfidence` React state only `attendance-form.tsx:58`) | Genuine gap but irrelevant — confidence is fake anyway; correct not to persist. If biometric becomes real, persist `confidence` + `decision` on `Attendance`. |
| Dashboard delayed | Not persisted — computed count, but page caches zero | Logic gap, not schema gap. |
| Manual weather `notes` | Optional and upsertable but UI defaultValue static after first load (`manual-weather-form.tsx:225` `defaultValue={existing?.remarks}` does not reset on date change without remount — controlled vs uncontrolled minor) | Minor — data persists; UI may show stale default until `key` reset. Not a DB gap. |

**Seed-only:** Not a gap; see seed audit — no ghost FK.

---

## AUTHORIZATION GAPS

1. **Agronomist global access (`platformRoles`)** — `src/lib/access.ts:7` lets Agronomist (and SuperAdmin) bypass any farm scoping. Per spec intentional for 7-day planner cross-farm. If multi-tenant strictness required, this is a gap (documented above). No escalation beyond read/execute of agronomist-assigned tasks.

2. **No row-level write guard on cropCycle edit tied to manage vs access nuance** — `PATCH .../crop-cycles/[cycleId]` checks `requireFarmAccess(farmId, true)` (`src/app/api/plots/[plotId]/crop-cycles/[cycleId]/route.ts:38`) correct (needs canManage). Reports/incidents are executed by officers (not managers) — their read `requireFarmAccess(farmId)` correctly allows non-manager read after canManage check at farm detail gate.

3. **Media kind not role-restricted at presign** — any farm-access user can presign any kind; completion guards per kind but presign does not. Low impact.

4. **Audit log metadata farm-scoping via JSON path** (`src/app/api/audit-logs/route.ts:6` `metadata:{path:["farmId"],equals:farmId}`) relies on `audit()` consistently inserting `farmId` into metadata. All current calls do, but field optional — an incident audit missing farmId would leak across farm scope query `OR` branch. Not observed, but brittle.

No broken isolation for officer cross-farm or task hijack; proof harness confirms.

---

## TESTING GAPS

| Test | What it does | Gap / False confidence |
|---|---|---|
| `src/lib/business.test.ts` (19 tests) | Pure functions: `calculatedInfrastructure`, `variance`, `labourHours`, `distanceMeters`, `milestoneTemplates`, `canTransitionTask`, `isWithinRollingSevenDays`, `utcDateOnly/parseUtcDate` | **Strong**, but only unit — does not hit HTTP or S3. |
| `src/lib/auth-penetration.test.ts` (8 tests) | `requireRole` throws + farmAccess isolation + cultivable guards + unique Attendance constraint | Uses direct `prisma.*` + `requireRole` calls, not `fetch("/api/...")` with cookies. Auth cookie/jwtVerify path (`src/lib/auth.ts:24` `getSession`) not exercised. Gives confidence on model isolation but **not** on route middleware wiring. Also `cleanup` deletes via `prisma` bypassing auth — could hide trigger issues. |
| `src/lib/domain-verification.test.ts` (19 tests sequential) | Creates test users/farms/plots/cycles/milestone tasks via **direct `prisma.*`**, transitions, attendance exception, monitoring auto-complete, incident lifecycle, dashboard counts, daily report projection | Same bypass: calls `prisma.farm.create`, not `POST /api/farms` — so zod, `requireFarmAccess`, `accessibleFarmWhere`, `HEAD` verification, S3 presign, pagination validation (`src/lib/api.ts:15`), and cookie auth are **never exercised**. Example: `Domain 9 attendance inside geofence` `domain-verification.test.ts:506` creates `attendance.create` directly, never proving server’s `media verifiedAt` + distance + reason-required guards. Tests pass even if route were broken. |
| `scripts/final-acceptance-proof.ts` (883 LOC) | Real `fetch` against `http://localhost:3005` with `Cookie: agaate_session=...` across 11 domains including presign→PUT→complete (with DB fallback 76-82), farm activation gatekeeper, cross-role isolation, dashboard ground truth compare | **Most honest suite** — proves HTTP + cookie + rbac end-to-end. But its `uploadAndVerifyMedia` silently `prisma.mediaAsset.update verifiedAt` when S3 down, masking storage fragility. Also `calculateExpectedTotalBeds` import in original script was renamed incorrectly (validated at lint; later `calculatedInfrastructure` correct in source). Not part of `npm test`. |
| Missing coverage | No test for `BIOMETRIC` (correct — because it would expose fake), no test for weather live fetch vs 503, no test for media URL expiry, no harness for concurrent attendance duplicate race over fetch, no CSRF/permission via fetch for disabled user attempt to call route. | Root causes for “verified” overclaim. |

**Strength grading per asked examples:**

- `expect(component).toBeTruthy()` / `expect(button).toBeInTheDocument()` — none used; tests use meaningful value assertions (`expect(...).toBe(...)`, Haversine bands). But they assert **DB state**, not **user workflow** — example weakness listed (`expect(response.status).toBe(200)`-style not present, but `expect(task.id).toBeDefined()` similarly does not prove API wiring).
- `expect(reponse.status).toBe(200)` in final proof is complemented by DB re-read, so stronger.

**Do not delete** — improve by adding HTTP-layer integration tests hitting actual route handlers with signed session cookies (or `next-test-api-route-handler`) and without direct `prisma.mediaAsset.update verifiedAt` monkey patch.

---

## PRODUCTION GAPS

| Gap | File:line | Impact | Fix needed |
|---|---|---|---|
| Default secrets in repo | `.env:1-12` `DATABASE_URL` localhost, `APP_SESSION_SECRET` `local-development-session-secret-change-this-before-production-32chars`, `S3_ACCESS_KEY_ID=change-me` etc., `prisma/seed.ts:9` `INITIAL_ADMIN_PASSWORD` fallback `LocalAdminPassword-ChangeMe-123` | Copy-paste deploy leaves weak secrets + MinIO localhost creds | Require env rotation in deploy docs + generate strong secret if missing; strip `.env` from image; add `seed` guard `if NODE_ENV===production && INITIAL_ADMIN_PASSWORD===fallback throw`. |
| S3 bucket bootstrap dev-only | `docker-compose.yml:10` `minio-setup` runs only via compose | Fresh prod AWS S3 bucket must be created/private manually; presign will 503 `S3_BUCKET is not configured` `src/lib/storage.ts:4` | Document Terraform/bucket creation + IAM + CORS; add startup health check that pings `headObject` on dummy key. |
| Weather provider unset by default in some profiles | `src/app/api/weather/route.ts:6` returns 503 if env missing | Telemetry card shows error instead of live; agronomists lose micro-climate | Set default to Open-Meteo (already in .env.example?) and document API no-key advantage; add UI to prompt admin to set when 503. |
| Cookie sameSite lax only | `src/lib/auth.ts:19` `sameSite:lax` | Lax allows top-level navigation GET but blocks cross-site POST — limited CSRF protection; no `__Host-` prefix | Add `__Host-agaate_session` name + `sameSite:strict` optional, or CSRF double-submit for mutating POST (`Origin` check). |
| No rate limiting / brute force | `src/app/api/auth/login/route.ts:*` 401 on bad password but no throttle | Password spraying against `admin@agaate.local` | Add `p-limit`/`upstash-ratelimit` per IP+email. |
| No backup/retention documented | `docker-compose.yml` volumes ephemeral; no `prisma backup` cron | Data loss on container recreate | Add managed Postgres + S3 lifecycle + daily pg_dump doc. |
| Image sizes 88×66 preview | `src/components/evidence-gallery.tsx:1` `width 88 height 66 unoptimized` | ok for proof; prod needs thumbnail optimization + Next remote config (unoptimized true bypasses) | Add S3 image variant or Next `images.remotePatterns` for presigned host. |
| PWA `sw.js` + `manifest.ts` minimal | `src/app/manifest.ts`, `public/sw.js` (exists per file list but not read) | Offline not yet tested | Evaluate Workbox/Next-PWA; not blocking. |
| Pagination defaults | `src/lib/api.ts:15` `limit 100` default, `cursor` unused (offset only) | Large farms lists hit 100 cap; UI does not paginate (DashboardClient shows all `farms` from server `findMany` without take/skip `src/app/dashboard/page.tsx:15` — relies on `accessibleFarmWhere` full set) | Wire UI pagination or virtual scroll if >200 farms. |
| Biometric must not block prod | See Misrepresented | Legal/biometric claim risk | Disable or relabel before prod; feature flag `ENABLE_BIOMETRIC_FACE` default false. |

No `localhost assumptions` or `production-only branches` beyond secure cookie already hardened.

---

## SEARCH FOR FALSE SECURITY / BIOMETRIC / AI CLAIMS

Traced terminology:

- `biometric` appears in `src/components/biometric-face-scanner.tsx:197` header + `src/components/attendance-form.tsx:522`, `532` (“Biometric Face Verification” label + `{confidence}% Match Verified` badge), `biometric-face-scanner.tsx:305,323,652` button labels — all map to brightness logic, not verification → flagged above.
- `AI verified / Instant AI` appears `biometric-face-scanner.tsx:652` “Instant AI Face Alignment”, `attendance-form.tsx:651` same — no AI model imported (grep `face-api`, `mediapipe`, `tensor` → zero hits). Claim unjustified.
- `identity verified / liveness / fraud prevented` — not claimed elsewhere; scanner does not claim liveness explicitly but HUD oval + green 96% implies. Documented fake.
- `GPS verified` appears `attendance-form.tsx:279` “GPS Verified Field Presence”, `src/components/attendance-form.tsx:701` “Inside Farm Geofence” (`proximityInfo.isWithin`) — server verification real but UI badge timing overstates; notified partial.
- `secure / encrypted / production ready` — legacy docs `IMPLEMENTATION_STATUS.md:5` “Full Verification Complete & Hardened”, “Enterprise Farm Operations” (`dashboard-client.tsx:83`). `encrypted` not claimed in code; `secure` cookie per `src/lib/auth.ts:19` is httpOnly+secure correct; but `production ready` not proven — override to NOT READY per this audit.
- `trusted / verified` badges: `StatusBadge`/`RoleBadge` ok. EvidenceGallery `verifiedAt` check honest.

No other AI/crypto/fraud language unjustified.

---

## REQUIRED FIX PLAN (recorded, not applied)

For each defect, root cause + remediation required (audit distinct from remediation per §22):

1. **Biometric misrepresentation** — Root: `src/components/biometric-face-scanner.tsx:80-92`. Fix: remove 88-99% confidence, replace with “Selfie capture — image captured successfully”, gate attendance solely on selfie file + GPS; or implement full enrollment+embedding+s spoof pipeline with server `POST /api/biometric/verify` before `POST /api/attendance` and persist `biometricVerified boolean`. Requires new `User.faceEmbeddingHash` column and model import.

2. **Dashboard delayed hardcoded** — Root: `src/app/dashboard/page.tsx:53`. Fix: add `delayedActivities` to page `Promise.all` query (same as `api/dashboard`) or fetch `GET /api/dashboard` client side and display, clear hardcoded `0`.

3. **S3 fragility / test harness masking** — Root: `complete` HEAD requires live S3; harness bypass `scripts/...:76-82`. Fix: document MinIO/S3 as hard dependency, fail fast on startup if `S3_*` unset, and in harness `throw` on `!completeRes.ok` instead of DB patch so CI fails when S3 misconfigured (proving prod would fail).

4. **Secret defaults** — Root: `.env` + `prisma/seed.ts:9`. Fix: enforce rotation via startup check `if (process.env.APP_SESSION_SECRET===default || process.env.S3_ACCESS_KEY_ID==="change-me") throw` in prod, CI secret scan.

5. **HTTP-layer test gap** — Root: `vitest.config.ts:11` aliases `server-only→empty` to allow prismain Node, but routes never hit. Fix: add `vitest` `fetch` integration suite (or Playwright) that logs in via `POST /api/auth/login` extracts `Set-Cookie` then `fetch /api/farms` etc., and expects 403 when crossing role.

These are recorded only; no code patched in audit phase.

---

## FINAL REALITY SCORE

```
REAL END-TO-END FEATURES:  33  (79%)
PARTIAL FEATURES:           5  (12%) — daily task lazy gen, dashboard delayed page, GPS badge timing, weather cache 15m, media size fix on complete
MOCKED/SIMULATED:           0 distinct feature (1 sub-component — biometric confidence brightness model)
HARDCODED:                  1 UI metric stub (delayedAlerts:0) + trivial design constants
BROKEN:                     0 dead handlers; 1 fragile path (attendance+monitoring entirely blocked when S3/MinIO down — by design, but operationally broken)
MISREPRESENTED:             2  (Biometric Face Scanner AI/match claim — CRITICAL; GPS Verified badge timing — medium)
UNKNOWN:                    1  (live weather + S3 liveness without running infra in this static audit)
TOTAL INVENTORIED CAPABILITIES: 42 (derived from 12 domains ledger)
```

**Seed vs new-record parity:** proven equal — new farms pass same guards.

**Form persistence:** all fields controlled + zod + server persisted + reload-preserved + honest failure states.

**Button vitality:** 0 dead; all primary buttons reach real API; only scanner’s “Match Verified” badge is visual simulation.

---

## CURRENT STATE

### NOT PRODUCTION READY

*Default assumption holds until proven otherwise — repository and executed build/tests alone do not prove production readiness.*

**Positive evidence keeping it close:** Build 23 routes passes, 46 unit/integration tests pass, schema referential integrity 100%, proof harness 11-domain live scenario (with S3-bypass caveat) passed, isolation and geofence correctly server-enforced, no widespread mocking.

**Blocking to become PRODUCTION READY:**

- Relabel or rebuild biometric scanner (cannot ship claiming 96% face match).
- Wire `delayedAlerts` live on dashboard page.
- Rotate secrets + document S3 bucket bootstrap for prod (not dev MinIO creds).
- Add HTTP-layer integration suite (not just prisma-direct) and prove without `prisma.mediaAsset verifiedAt` patch.
- Prove once against true production image (`NODE_ENV=production`, `APP_SESSION_SECURE=true`, HTTPS, real Postgres+S3) with fresh DB (no seed) end-to-end shift and report.

Once those are done and live workflow passes against production build, reassessment to **PRODUCTION READY** is warranted.

> **Absolute rule honoured:** “There is code for it” ≠ “feature works.” This audit traced every link; badge/animation/chart alone never counted as proof. All classifications backed by file:line and DB/query evidence above.

