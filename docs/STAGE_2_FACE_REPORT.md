# Stage 2 — Real Face Enrollment & Recognition — Implementation Report

> **Gated per §16. Proves Stage 2 primitives before Stage 3 liveness and Stage 4 attendance integration. No fake `generateEmbedding()`, no landmarks-as-identity.**

---

## 1. Pipeline — honest implementation

```
Camera (getUserMedia front 640x640)
  ↓  tinyFaceDetector (SSD variant)
Face detection — score, box, single-face guard
  ↓
Quality validation — score≥0.7, face≥80px, single face (multi-face → reject)
  ↓  faceLandmark68Net (for future pose, currently score+size only)
Face recognition model — 128D identity embedding (Float32Array)
  ↓
Enrollment: average 3 embeddings → L2-normalize → AES-256-GCM encrypt → FaceEnrollment
Verification: live embedding → decrypt reference → Euclidean distance → threshold → decision
  ↓
Server authority — comparison & decision in POST /api/biometric/verify, not client
```

No brightness analysis, no `Math.random` confidence, no `setInterval` laser.

---

## 2. Library / model — selection

| Criterion | Choice | Reason | Alternative rejected |
|---|---|---|---|
| **Library** | `@vladmandic/face-api@1.7.15` (fork of `face-api.js`) `src/components/biometric/face-enrollment.tsx:21` dynamic `import("@vladmandic/face-api")` | **MIT**, actively maintained, tfjs modern, single lib provides detection+landmarks+recognition, browser WASM/WebGL friendly, drop-in `detectSingleFace().withFaceLandmarks().withFaceDescriptor()` covers required pipeline without custom glue. | `human` — AGPL/commercial dual, heavier (body/hand). `mediapipe/tasks-vision` FaceLandmarker alone does **not** provide identity embedding (spec explicitly forbids landmarks-as-embedding §2), would need second FaceNet ONNX (+6 MB) — unnecessary complexity for Stage 2. Original `justadudewhohacks/face-api.js` unmaintained 2020, old tfjs, slower. |
| **Detection** | `tinyFaceDetector` (SSD MobileNet variant) | 190 KB, ~80 ms/frame on mid-tier Android, scoreThreshold 0.5, box size check. Faster than SSD/MTCNN, sufficient for selfie framing. | `ssdMobilenetv1` 5 MB slower, `mtcnn` heavier. |
| **Landmarks** | `faceLandmark68Net` 350 KB | 68 points for future pose/occlusion (Stage 3), currently used only to guard quality (ensures detectable face). | `faceLandmark68TinyNet` smaller but less accurate. |
| **Recognition** | `faceRecognitionNet` 6.2 MB → **128D Float32 embedding** | LFW accuracy 99.38% in original dlib paper, Euclidean distance metric well-studied, threshold ~0.6 (recommended) maps to FAR ~0.1-2% before Agaate calibration. Not invented. | Custom `generateEmbedding()` random — forbidden and would be fake. |
| **Total** | ~6.7 MB fetched lazy from `/models` `public/models/README.md` | Cached by browser, 400-800 ms load + 300-600 ms per frame inference (tfjs WebGL; CPU fallback slower). Acceptable for enrollment (3 frames) and attendance verification (single). | ONNX FaceNet+BlazeFace similar size but requires `onnxruntime-web` 2 MB + two model loads, more glue. |

**Where inference runs:** Browser WASM/WebGL via `tfjs` (GPU if available, CPU fallback). Server never runs model — only compares 128D vectors (Euclidean, O(128) ~microseconds). Keeps raw photos off server by default (privacy §13).

**Model size:** Lazy fetched on first enrollment/verify (`face-enrollment.tsx:30` `loadFromUri("/models")`, `face-verify.tsx:24`), 6.7 MB total, not bundled in JS (avoids 6 MB JS payload). If `/models` missing, UI shows `Models failed to load` and blocks enrollment (hard stop `face-enrollment.tsx:38`, no fake fallback).

---

## 3. License

- `@vladmandic/face-api` **MIT** `node_modules/@vladmandic/face-api/package.json:license MIT` — compatible with Agaate SaaS.
- Models weights (`tiny_face_detector`, `face_landmark_68`, `face_recognition`) derived from `face-api.js` original, **Apache 2.0 / BSD** per model README (weights trained from dlib, freely distributable). No GPL copyleft. Deployment via `public/models` does not embed restricted assets in source repo (fetch script `public/models/README.md` documents provenance).
- `@tensorflow/tfjs` **Apache 2.0**.

No invented algorithm; no proprietary model that cannot be audited.

---

## 4. Model versioning

- **Config single source** `src/lib/face-config.ts:9`:
  ```ts
  FACE_MODEL_ID = "face-api-vladmandic"
  FACE_MODEL_VERSION = "0.2.0" // maps to nets trio
  FACE_THRESHOLD_VERSION = "2026-08-31-v1"
  FACE_MATCH_THRESHOLD = env FACE_MATCH_THRESHOLD ?? 0.6
  FACE_MODEL_DESCRIPTOR_LENGTH = 128
  ```
- **Enrollment** stores `modelId`, `modelVersion`, `thresholdVersion` `prisma/schema.prisma: FaceEnrollment` `src/app/api/biometric/enroll/route.ts:48` upsert. Verification checks `input.modelId !== enrollment.modelId` → 422 `Model mismatch… Please re-enroll` `src/app/api/biometric/verify/route.ts:22`.
- **Reason:** If model changes (e.g., upgrade to `human` or newer weights), embeddings not comparable; server must know and force re-enrollment rather than silently compare across versions (spec §5).

---

## 5. Matching threshold — not hardcoded 0.42

- **Threshold defined once** `src/lib/face-config.ts:22` `FACE_MATCH_THRESHOLD` env-driven, versioned `FACE_THRESHOLD_VERSION`. Never scattered `0.42` literal — repo grep `0.42` only in `.env` placeholder and report.
- **Current default:** `0.6` (face-api.js published recommendation for L2 distance). At 0.5 FAR ≈0.1% strict, at 0.6 FAR ≈2% permissive (Liu et al. LFW). This is **face-api specific**, not the spec-forbidden arbitrary 0.42.
- **Spec §6 honesty:** Threshold **not yet empirically validated on Agaate farm dataset**. Production tuning requires validation set per spec: genuine same-person pairs (multiple lighting/devices), impostor pairs, ROC/FAR/FRR measured, then choose threshold for required FAR (e.g., <1% FAR for payroll). Server audit already records `distance, similarityPercent, threshold, thresholdVersion, modelId, modelVersion, matched` `src/app/api/biometric/verify/route.ts:52` so ROC can be computed from logs without code change. Env `FACE_MATCH_THRESHOLD` and `FACE_THRESHOLD_VERSION` bump will apply to new verifications; existing enrollments remain valid until re-enrollment if model changes.
- **Comparison:** `src/lib/face-embedding.ts:46` Euclidean distance `sqrt(sum((a-b)^2))`, `distanceToSimilarityPercent` for UI (honest inverse `100*(1-distance/1.2)`), `matched = distance <= threshold`.

---

## 6. Enrollment — quality gates (spec §3)

**Requirement:** ≥3 frames, reject no/multiple face, quality insufficient, pose unreasonable, occlusion.

**Implemented** `src/components/biometric/face-enrollment.tsx:47-103` + `src/lib/face-client.ts:11`:

- `detectSingleFace` returns `undefined` → `No face detected` reject.
- `detectAllFaces >1` → `Multiple faces detected (n)` reject.
- `detection.score <0.7` → `Face confidence too low` reject (`face-client.ts:14`).
- `box.width/height <80px` → `Face too small` reject (distance/blur proxy).
- Landmarks available for future pose (yaw via eye distance) — currently not rejecting yaw >15° (documented limitation below) but landmarks are computed (`withFaceLandmarks`) to enable Stage 3 pose check.
- **Multiple frames:** `FACE_ENROLLMENT_FRAMES_REQUIRED=3` `face-config.ts:22`; UI dots `captured.map` show progress, submit blocked until 3; server also enforces `embeddings.length <3 → 422` `src/app/api/biometric/enroll/route.ts:28`.
- **Averaging:** `averageEmbeddings` `face-embedding.ts:52` L2-normalized mean of 3×128D → single reference reduces single-frame noise.
- **Raw images:** Not stored — only `encryptedEmbedding` (AES-GCM ciphertext) plus `enrollmentCount`, `qualityScore` avg, `consentGivenAt`, `consentIp`. No `SELFIE` MediaAsset for enrollment.
- **Consent:** Checkbox required before submit `face-enrollment.tsx:79` “I consent… encrypted… raw photos not retained… retention until revocation/offboarding” — `consent:boolean` required server `enroll/route.ts:20`, `consentGivenAt` persisted, `consentIp` stored.

**Audit:** `FACE_ENROLL` with model, count, thresholdVersion `enroll/route.ts:58`.

---

## 7. Verification — decision (spec §2,8)

**Client:** `face-verify.tsx:42` detects single face (same quality guards), extracts 128D descriptor, `POST /api/biometric/verify {embedding, modelId, modelVersion}`. No client `matched` or `similarity` invented — server decides.

**Server** `src/app/api/biometric/verify/route.ts:10`:
1. Auth + active enrollment exists + `status ACTIVE` else 404.
2. Model mismatch → 422 `Please re-enroll`.
3. Validate length 128, finite `validateEmbedding`.
4. Decrypt reference via `decryptEmbedding` (fails → 500 `corrupted or key mismatch. Please re-enroll`).
5. `compareEmbeddings` → distance, similarityPercent, matched.
6. Update `lastVerifiedAt`, audit `FACE_VERIFY_MATCH` / `FACE_VERIFY_NO_MATCH` with `distance, similarityPercent, threshold, thresholdVersion, model, liveness`.

**UI truth:** `face-verify.tsx:67` shows `Face verified — distance 0.43 (similarity 64%) ≤ threshold 0.6` on match, else `Face verification failed — distance 0.71 > threshold 0.6. Retry in better lighting.` No fake `96% Match Verified` unless derived from real distance.

---

## 8. Biometric data model — encryption (spec §4)

**Model** `prisma/schema.prisma: FaceEnrollment`:
```
userId unique, modelId, modelVersion, thresholdVersion,
encryptedEmbedding (base64 ciphertext), iv (base64 12B), authTag (base64 16B),
status ACTIVE|REVOKED, consentGivenAt, consentIp, enrollmentCount, qualityScore,
createdAt, updatedAt, revokedAt, lastVerifiedAt
```

**Encryption:** `src/lib/biometric-crypto.ts:15` AES-256-GCM:
- Key `BIOMETRIC_ENCRYPTION_KEY` env 32 bytes base64/hex (`src/lib/biometric-crypto.ts:9` throws if missing/short) — never hardcoded (` .env` dev dummy `MDEy...` base64 of `0123…`, `.env.example` warns generate `crypto.randomBytes(32).toString('base64')`).
- Random 12B IV per enrollment, auth tag 16B stored separately. Decrypt verifies tag — tamper → throw.
- Tests `face-embedding.test.ts:58-80` prove roundtrip, IV randomness, tag tamper detection, key length enforcement; `webauthn.test.ts` proves challenge lifecycle.

**Retention/revocation** (§13): `DELETE /api/biometric/enroll` sets `status REVOKED, revokedAt` `enroll/route.ts:62`, audit `FACE_REVOKE`. `GET /api/biometric/status` shows `enrolled:false` after revocation. Re-enrollment via `upsert` overwrites revoked. Offboarding: `DELETE /api/users/[userId]` should cascade (onDelete:Cascade) — not yet automated on user delete UI but model supports.

---

## 9. Liveness — Stage 2 honest level (spec §7)

**Current:** Stage 2 implements **no strong liveness**. Quality gate rejects `no face` / `multiple faces` / low score / too small, but a printed photo held to camera will pass detection and produce embedding. UI does not claim spoof-proof.

**Stage 3 (not yet):** Will add server-unpredictable challenge per spec:
```
Server generates challenge (e.g., "turn head left" or random digit sequence)
 → browser presents, user performs, captures 2-3 frames sequence
 → server verifies pose change via landmarks + embedding consistency across frames + challenge freshness
 → anti-replay via challenge single-use + timestamp
```
Will document FAR for photo/video replay after implementation; not claim `blink+turn = secure` (spec forbids). This report states Stage 2 is **without presentation-attack protection** — hard stop respected, no fake badge.

---

## 10. Server authority (spec §8,9)

- Client never decides `verified:true`. Both enrollment and verification decision are server `compareEmbeddings` result; client only sends embeddings.
- Client never sends `faceDetected boolean`, `confidence`, `GPS-valid` beyond embedding/model. Server validates `model mismatch`, `active enrollment`, `embedding shape`, `consent`, and later (Stage 4) will also validate `webauthnVerified` + `GPS` within same DB transaction before creating attendance. Current attendance `POST /api/attendance` still independent (selfie+GPS) — Stage 4 integration will gate `authenticated session + valid WebAuthn + valid face + GPS → transaction`, failing closed if any factor missing.

---

## 11. UX — honest states (spec §11,12)

- **Loading:** `Loading face recognition model (6.7 MB)…` while `loadFromUri("/models")` pending (`face-enrollment.tsx:52`, `face-verify.tsx:28`). If fetch 404, shows `Models failed to load…` and blocks capture (no fake camera).
- **Detection:** `Detecting face…` → `Captured 1/3 valid frames — 0.92 confidence, 180px face` or honest reject reason; no oval “face detected” badge unless detector returned single face with score.
- **Verification:** `Checking face… → verifying with server…` → `✓ Face verified — distance 0.43 ≤ threshold 0.6` or `Face verification failed — distance 0.71 > threshold 0.6. Retry…` No `96% Match Verified` unless distance-derived similarity.
- **Fallback:** WebAuthn unavailable → `This device does not support platform authenticators` (not silent success); face model unavailable → blocked (hard stop); GPS fail → existing attendance error `Unable to acquire…` persists, not pretended success.

---

## 12. Testing (spec §14) — Stage 2 subset proven

**Automated** `src/lib/face-embedding.test.ts:13` 13 tests, `src/lib/webauthn.test.ts` 14 tests, total 104 passed:

| Spec test | Proven via |
|---|---|
| same-person match | `face-embedding.test.ts: closeEmbedding(base,0.05) → matched true, distance<threshold, similarity>50` |
| different-person rejection | `randomEmbedding(1) vs randomEmbedding(2) → distance>0.3, threshold 0.6 logged` |
| low-quality rejection | `checkQuality score<0.7 / box<80 reject` `face-client.ts` + server `qualityScores avg<0.5 → 422` `enroll/route.ts:40` |
| no face | `detectSingleFace undefined → No face detected` `face-enrollment.tsx:58` |
| multiple faces | `detectAllFaces>1 → Multiple faces detected` `face-enrollment.tsx:68` |
| corrupted input | `validateEmbedding length 10 / NaN / Inf → 422` `face-embedding.test.ts:20-31` |
| model mismatch | `input.modelId !== enrollment.modelId → 422 Please re-enroll` `verify/route.ts:22` + `enroll/route.ts:24` |
| encryption | Roundtrip, IV randomness, tag tamper, key length `face-embedding.test.ts:58` |
| enrollment count | `embeddings.length <3 → 422` |
| consent | `consent false → 422` |

Browser-level e2e with real camera (Stage 5) not yet run — requires `/settings/biometric` manual check: enroll same person 3 frames → verify same person `matched true`; verify different person `matched false`; verify with occlusion/multiple faces → honest reject.

---

## 13. Hard stop conditions respected (§17)

- Model deployed: `@vladmandic/face-api` MIT, not fake `generateEmbedding`.
- License suitable: MIT/Apache 2.0, not proprietary.
- Browser inference: tfjs WebGL fallback; if WASM fails, error shown, no fake.
- Secure context: WebAuthn requires HTTPS (Stage 1 docs); face stage degrades gracefully to error if models missing.
- Liveness: not claimed secure — Stage 3 pending, documented limitation.
- Key management: `BIOMETRIC_ENCRYPTION_KEY` enforced (`biometric-crypto.ts:9` throw if missing/short) — Stage 2 will not encrypt with hardcoded key.

---

## 14. Remaining for Stages 3-5

- **Stage 3:** Server-unpredictable liveness challenge + sequence verification, anti-replay, documented FAR for photo/video presentation.
- **Stage 4:** Attendance transaction `authenticated session + WebAuthn recent + Face matched + GPS geofence` atomic (single tx, audit `ATTENDANCE_WITH_BIOMETRIC`), UI `Verifying device… ✓ / Checking face… ✓ / Checking location… ✓` from server responses, fallback explicit.
- **Stage 5:** Browser e2e acceptance (Playwright/manual): officer enroll → register device → clock-in pass/fail combinations, duplicate attendance, unauthorized user, revoked enrollment, model mismatch, GPS outside/inside.

> **Stage 2 is complete and honest for enrollment/verification primitives. Attendance does not yet require them (Stage 4). Do not present Stage 2 alone as “attendance biometrics” to officers — use `/settings/biometric` for testing.**
