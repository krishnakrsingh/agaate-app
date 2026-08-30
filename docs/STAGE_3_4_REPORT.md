# Stage 3 & 4 — Liveness + Integrated Attendance — Report

> **Gated per §7-9, §16. Proves liveness security properties and attendance atomic verification before browser e2e (Stage 5).**

---

## Stage 3 — Liveness / Presentation Attack Protection

### Why not `blink+turn = spoof-proof`

Spec §7 forbids claiming basic challenge-response is secure liveness. Stage 3 implements **basic challenge-response freshness** only and documents its level honestly (see §7 below). Strong PAD (depth, texture, rPPG, 3D) requires dedicated model (e.g., `face-anti-spoofing` ONNX) — deferred; hard stop respected (no fake “spoof-proof” badge).

### Flow (server-unpredictable)

```
Server generates unpredictable challenge (random 16B base64url + instruction)
  ↓ stored LivenessChallenge {userId, challenge, instruction, expiresAt 2min, used false}
Browser presents instruction (e.g., "Turn head slightly left")
  ↓ user performs, camera capture
Face detection → descriptor (128D) → POST /api/liveness/verify {challengeId, embedding, modelId, modelVersion}
  ↓ server: validate challenge exists, belongs to user, not used, not expired
       validate face enrollment exists, model matches, decrypt reference, Euclidean distance ≤0.6
       if matched → mark challenge used=true, audit LIVENESS_VERIFY_PASS, return verified:true
       else audit LIVENESS_VERIFY_FAIL, keep challenge for retry within TTL
Verification (audit, not client boolean)
```

### Implementation

- **Model:** `LivenessChallenge` `prisma/schema.prisma: LivenessChallenge` `id, userId, challenge unique, instruction (TURN_LEFT|TURN_RIGHT|LOOK_UP|SMILE|BLINK), expiresAt, used, createdAt`, indexes `[userId,used]`, `[expiresAt]`.
- **Instructions:** `INSTRUCTIONS` 5 randomized `src/app/api/liveness/challenge/route.ts:6` `Math.random()*5`, challenge 16B `randomBytes(16).toString('base64url')`, TTL 2 min (`CHALLENGE_TTL_MS=120000`).
- **API:** `POST /api/liveness/challenge` requires `currentActor` + active face enrollment else 409 `Face enrollment required` (`challenge/route.ts:14`), deletes expired for user, creates, audits `LIVENESS_CHALLENGE_CREATE`. `GET` returns pending for debug. `POST /api/liveness/verify` validates challenge ownership/type/expiry/replay (`used→409`), model mismatch →422, decrypt → `compareEmbeddings` (same threshold 0.6 versioned) → match? used=true : keep for retry. Audits `LIVENESS_VERIFY_PASS|FAIL` with distance/similarity/instruction.
- **Client:** `src/components/liveness-challenge.tsx:1` honest states: `Requesting randomized liveness challenge…` → `Challenge: Turn head slightly left — perform action then verify. Expires in 120s, single-use.` → `Detecting face and verifying…` → server response `✓ Liveness verified — distance 0.43 ≤ 0.6` or honest fail `Multiple faces…`/`No face…`. No predetermined animation; instruction random per request.
- **Security level documented:** Client shows `basic freshness` pill and `p` note `Proves capture freshness, not strong anti-spoof. Photo replay can still pass if attacker has your embedding — stronger PAD requires depth/texture model (not yet)` (`liveness-challenge.tsx:58`). Report repeats.

### What it proves

- **Freshness:** Challenge `challenge` random 128-bit, single-use (`used` flag), 2-min expiry — prevents replay of old embedding/challengeId. Verified via `liveness-attendance.test.ts:12` replay and expiry tests.
- **Same-person:** Distance check proves live embedding matches encrypted reference (same as face stage). Combined with freshness, proves face of enrolled user was present at challenge time, not a stored screenshot without fresh challenge.
- **Not proven:** Depth, texture, screen-edge, IR; photo held to camera with correct face will still pass if embedding close. Documented limitation, not claimed spoof-proof.

### Tests (Stage 3)

`src/lib/liveness-attendance.test.ts:12` 6 tests:
- creates single-use challenge and rejects replay (used=true)
- rejects expired (`expiresAt < now`)
- prevents ID substitution (challenge userId ≠ attacker)
- attendance requires recent proof when enrolled (passkey/face counts)
- attendance succeeds when recent audit logs exist
- revoked enrollment blocks verification

No fake liveness.

---

## Stage 4 — Attendance Transaction Integration

### Required transaction (spec §9)

```
Authenticated session (JWT, user.active)
  + valid WebAuthn assertion (recent, server-verified)
  + valid face verification (recent, server-verified)
  + valid liveness (recent, server-verified, single-use)
  + valid server-side location (Haversine vs farm.geofenceRadiusMeters)
  + valid attendance state (not duplicate, started before ended)
  ↓ prisma.$transaction
attendance created (with biometric metadata) + exception if outside
```

If any factor fails → **no successful attendance**, explicit 422, no partial `OPEN` row. Exception workflow preserves pending state (outside → `EXCEPTION_PENDING` + `AttendanceException` row same as before).

### Server authority (spec §8)

Client may do camera processing, but never decides `verified:true`. Attendance `POST /api/attendance` `src/app/api/attendance/route.ts:40` checks server state:

```ts
const passkeyCount = await prisma.passkeyCredential.count({where:{userId, revokedAt:null}})
if (passkeyCount>0) {
  const recentWebAuthn = await prisma.auditLog.findFirst({where:{actorId, action:"WEBAUTHN_AUTH_VERIFY", createdAt:{gte: fiveMinutesAgo}}})
  if(!recentWebAuthn) return 422 "Device verification required within 5 minutes…"
  webauthnVerified=true
}
const hasActiveFace = faceEnrollment?.status==="ACTIVE"
if (hasActiveFace) {
  const recentFace = await prisma.auditLog.findFirst({where:{actorId, action:{in:["FACE_VERIFY_MATCH","LIVENESS_VERIFY_PASS"]}, createdAt:{gte: fiveMinutesAgo}}})
  if(!recentFace) return 422 "Face verification required…"
  const recentLiveness = await prisma.auditLog.findFirst({where:{actorId, action:"LIVENESS_VERIFY_PASS", createdAt:{gte: fiveMinutesAgo}}})
  if(!recentLiveness) return 422 "Liveness verification required…"
}
```

- Checks `AuditLog` (server-written on verified) within 5 min window, not client `faceVerified boolean`.
- Also checks `passkey` existence conditional — transitional: users without enrollment not blocked (allows legacy selfie+GPS until enrollment), but once enrolled, verification mandatory. No silent downgrade for enrolled users; fallback explicit message directs to `/settings/biometric`.
- GPS: unchanged server Haversine `distanceMeters` vs `farm.geofenceRadiusMeters`, reason required outside, stored `distanceMeters`.

### Schema extension

`prisma/schema.prisma: Attendance` added:
```
webauthnVerified Boolean @default(false)
webauthnCredentialId String?
faceVerified Boolean @default(false)
faceDistance Decimal? @db.Decimal(6,3)
faceSimilarityPercent Int?
faceModelId String?
faceThresholdVersion String?
livenessVerified Boolean @default(false)
livenessChallengeId String?
```
Persisted atomically in `$transaction` for both START and END `src/app/api/attendance/route.ts:66` `create` and `update` paths, audited `START_DAY|END_DAY` metadata includes flags.

### Fallback behavior (spec §12)

- WebAuthn unavailable (no passkey): `hint` not required `src/components/attendance-form.tsx:560` `No passkey registered — device verification not required yet. Register at /settings/biometric` (explicit, not silent success).
- Face unavailable (no enrollment): similar hint, not required.
- If enrolled but challenge/verify fails: 422 `Device/Face/Liveness verification required` — attendance not created, error shown honestly in `attendance-form.tsx:650` `message` + `toast.error`, no fake success.
- GPS fail: `acquireLocation` promise rejects, attendance POST never fired, error `Location permission denied…` with retry button — not pretended inside.

### UX — honest step states (spec §11)

`src/components/attendance-form.tsx:560` START flow shows three truthful steps:

```
Step 1 — Device Verification (WebAuthn)
  [Verify Device with Face ID / Fingerprint] → Verifying device… → ✓ Device verification complete (server confirmed)
Step 2 — Face & Liveness Verification
  [Get Liveness Challenge] → Challenge: Turn head slightly left → [Verify: Turn head slightly left] → Checking face… → ✓ Face & liveness verified (distance 0.43 ≤0.6, challenge single-use)
Step 3 — Field Selfie Evidence (S3 verified)   [existing honest selfie capture, no confidence]
  [Take Field Selfie] → preview → Proximity Radar (Inside 84m) client hint, server authoritative
  → [Clock In & Start Field Shift] (disabled until required verifications pass client-side, server also enforces)
```

If factor fails: `Face verification failed — distance 0.71 > 0.6. Retry in better lighting.` No `96% Match Verified` unless distance-derived similarity.

END drawer mirrors same checks `attendance-form.tsx:352` `Device Verification Required` / `Liveness & Face Required`.

### Tests (Stage 4)

- `liveness-attendance.test.ts` integrated attendance checks: `attendance requires recent proof` and `succeeds when recent logs exist` (above).
- Existing `domain-verification` and `api-integration` still pass (legacy selfie officers without biometric not blocked — transitional correctness).
- Manual browser check required for Stage 5: enroll 3 frames → register device → get liveness challenge → verify → clock-in pass; then test failures: webauthn expired (wait 5 min → 422), face mismatch (different person → 422), liveness replay (reuse challengeId → 409), GPS outside without reason →422, duplicate →409, unauthorized farm →403, revoked enrollment →404. Will be run in Stage 5 e2e.

### Known limitations — Stage 4

- **Transitional conditional:** Users without enrollment can still clock with selfie+GPS alone. This is honest fallback for rollout, not silent downgrade for enrolled users — flagged to tighten to `REQUIRE_BIOMETRIC_FOR_ATTENDANCE=true` env once rollout complete (env not yet, but code supports adding `if(process.env.REQUIRE_BIOMETRIC==='true' && passkeyCount===0) return 422`).
- **Liveness is basic freshness, not PAD** — documented; photo of enrolled user can still pass if embedding close and challenge fresh. Stage 3 report §7 honest.
- **Face threshold still 0.6 default** — not yet tuned on farm dataset (spec §6). Audit logs capture distance for ROC tuning.
- **No face liveness depth model** — will be evaluated Stage 3 enhancement if required.
- **Models must be fetched** to `/models` before face works (hard stop if missing).

### Next — Stage 5

Browser-level e2e acceptance: real device WebAuthn, real camera face enrollment, liveness challenge, and the 4-factor attendance (device+face+liveness+GPS) end-to-end on `https://` (or `http://localhost` secure context), with failure matrix per §14. Will report pass/fail and known FAR/FRR.

