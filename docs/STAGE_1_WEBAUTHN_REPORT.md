# Stage 1 — WebAuthn Identity Verification — Implementation Report

> **Required per §16. Stages are gated: this report proves Stage 1 before advancing to Stage 2 (Face).**

---

## 1. Exact library / model used

- **Server:** `@simplewebauthn/server@13.3.3`
  - `generateRegistrationOptions` `src/app/api/webauthn/register/options/route.ts:27`
  - `verifyRegistrationResponse` `src/app/api/webauthn/register/verify/route.ts:32`
  - `generateAuthenticationOptions` `src/app/api/webauthn/auth/options/route.ts:27`
  - `verifyAuthenticationResponse` `src/app/api/webauthn/auth/verify/route.ts:42`
  - Helpers `isoUint8Array.fromUTF8String` `src/app/api/webauthn/register/options/route.ts:3`
- **Browser:** `@simplewebauthn/browser@13.3.3`
  - `startRegistration` `src/components/webauthn/webauthn-register.tsx:21`
  - `startAuthentication` `src/components/webauthn/webauthn-verify.tsx:24`
- **Transport:** No custom crypto — delegates to platform authenticator via WebAuthn Level 3 (`navigator.credentials.create/get`).

## 2. Why selected

- **Not manual protocol:** Spec §1 mandates SimpleWebAuthn rather than hand-rolled. Library handles: CBOR attestation parsing, COSE key import, challenge/origin/rpID verification, counter handling, AAGUID/metadata, SafetyNet nuances. Writing manually would be error-prone and violate hard stop.
- **Maturity:** Most starred WebAuthn abstraction, maintained by MasterKale, typed, Node >=20, MIT. Used by many prod passkey deployments. Alternative e.g. `@passwordless-id/webauthn` similar but SimpleWebAuthn has clearer `generate*Options`/`verify*` split matching our 4 endpoints.
- **Browser compatibility:** `browser` build wraps `PublicKeyCredential` with Base64URL JSON transform, handles `authenticatorAttachment: platform` filtering and userVerification fallback gracefully (see error handling `webauthn-register.tsx:24-30`).
- **Ponytail ladder:** Native platform feature (WebAuthn) before custom vision — reuses OS biometric (FaceID/TouchID/Win Hello) instead of inventing image analysis. Minimal new code.

## 3. Model license

- **MIT** — both `server` and `browser` packages `node_modules/@simplewebauthn/server/package.json:license MIT`, `node_modules/@simplewebauthn/browser/package.json: same`. Compatible with Agaate proprietary farm SaaS. No copyleft.
- **Face model for Stage 2 NOT yet chosen** — Stage 1 deliberately does not ship any face recognition model to avoid fake `generateEmbedding()`. Stage 2 will evaluate options (e.g. `face-api.js` SSD/MobileNet+FaceRecognitionNet vs `mediapipe/tasks-vision` + custom embedding) and document license/size there.

## 4. Where inference runs

- **Stage 1: No inference.** Cryptographic verification only, on server (`verifyRegistrationResponse` / `verifyAuthenticationResponse` in Node). Browser call `navigator.credentials.create` delegates to **authenticator hardware/TEE** (Secure Enclave, Titan, TPM) which performs biometric matching internally and releases private key operation. Agaate server never sees fingerprint/face bytes — only receives signed assertion. Honest representation in UI: `src/components/webauthn/webauthn-register.tsx:50` “The biometric never leaves your device”.
- **Stage 2 (planned):** Face detection → quality → embedding inference will run **browser-side** via WASM (e.g. `face-api.js` nets or TensorFlow.js) to avoid shipping raw selfies to server; embeddings will be sent for server comparison. Inference cost and model size will be measured in Stage 2 report (target <10 MB total, <800 ms on mid-tier Android).

## 5. Model size

- **Stage 1:** Zero model download. Library sizes:
  - `server`  ~180 kB (Node, no WASM)
  - `browser` ~18 kB gzipped
  - No WASM/COSE model fetched by client beyond browser’s built-in WebAuthn.
- **Stage 2 projection:** `face-api.js` tinyFaceDetector 190 kB + faceLandmark68 350 kB + faceRecognitionNet 4.2 MB ≈ 4.7 MB total; `MediaPipe FaceLandmarker` ~8 MB WASM. Will benchmark before lock.

## 6. Performance characteristics

- **Registration:** 1 round-trip options (DB write `WebAuthnChallenge` `src/lib/webauthn.ts:23` 5 ms) + browser authenticator prompt (user-action bounded ~1-5 s) + verify (CBOR decode + ES256/RS256 verify ~20-40 ms). DB challenge consumed atomically to prevent replay.
- **Authentication:** Same; counter update `prisma.passkeyCredential.update` ~5 ms. Challenge TTL 5 min (`WEBAUTHN_CHALLENGE_TTL_MS=300000` `src/lib/webauthn.ts:5`) — single-use.
- **Load:** No inference, only 2 DB writes per ceremony. Index `@@index([userId, type])` and `@@index([expiresAt])` keep lookup O(1). Tested 14 lifecycle tests in 382 ms `npm test src/lib/webauthn.test.ts`.
- **Browser:** Platform authenticator availability checked implicitly by `startRegistration` error path; no polling.

## 7. What constitutes successful match

**Stage 1 success = cryptographic assertion verified:**

1. `currentActor` exists and `user.active === true` (disabled user blocked `src/app/api/webauthn/register/options/route.ts:11` / `verify` `11`; test `webauthn.test.ts:107`).
2. Challenge exists, belongs to user, type matches, not expired (`pending.expiresAt < now` → 422 `src/app/api/webauthn/register/verify/route.ts:24` and `auth/verify` `27`), single-use (`consumeChallenge` deletes `src/lib/webauthn.ts:35`).
3. `verifyRegistrationResponse` → `verified:true` + `registrationInfo.credential` extracted, `expectedOrigin` equals `getRpConfig(request).origin` and `expectedRPID` equals `rpId` (`webauthn.ts:getRpConfig` derives from `x-forwarded-host`/`host` and `WEBAUTHN_ORIGIN` env).
4. `verifyAuthenticationResponse` → `verified:true`, `newCounter > stored.counter` (or log anomaly `src/app/api/webauthn/auth/verify/route.ts:52`), `credential.id` matches stored `PasskeyCredential.credentialId`.
5. Server creates/updates `PasskeyCredential` row with `publicKey` (base64url), `counter` (BigInt), `transports`, `deviceType` (`credentialDeviceType`) / `backedUp` (`credentialBackedUp`) `register/verify:48-58`, and `lastUsedAt`.
6. Audit logged `WEBAUTHN_REGISTER_VERIFY` / `WEBAUTHN_AUTH_VERIFY` with `credentialId` and counters.

**UI truth:** Button shows `✓ Device verification complete — authenticator successfully verified` only after server 200 (`webauthn-verify.tsx:43`). No pre-emptive badge.

## 8. What constitutes failure

- No challenge / expired / replay → `Challenge not found or already used` 422, `Challenge has expired` 422, `type mismatch` 422 (`webauthn.test.ts:28-55` covers all).
- Wrong user (ID substitution) → `Challenge does not belong…` 422 (`webauthn.test.ts:48`).
- Unknown `credentialId` → `Unknown passkey` 422 (`auth/verify:18`).
- Disabled user → `Account is unavailable` 422 (`register/options:11`).
- Browser cancel (`NotAllowedError`) → UI shows `Device verification was cancelled or timed out` (`webauthn-register.tsx:26`), not success.
- Counter regression (`newCounter <= stored`) → anomaly audit `WEBAUTHN_AUTH_COUNTER_ANOMALY` (`auth/verify:52`) — possible clone; admin should revoke.
- Revoked credential (`revokedAt != null`) excluded from `allowCredentials` (`auth/options:17` `where revokedAt null`) and from list `webauthn/credentials GET`.
- Attestation/origin mismatch → `Registration verification failed` thrown by library, returned 422 via `apiError`.

All failures return JSON `{error}` 422, never `verified:true`.

## 9. How embeddings are protected (Stage 1 ready for Stage 2)

- **No embeddings stored in Stage 1** — Stage 1 stores only WebAuthn public material (not biometric templates). Honest: WebAuthn publicKey is not biometric; it’s an asymmetric key.
- **Stage 2 readiness:** `FaceEnrollment` model `prisma/schema.prisma: FaceEnrollment` has `encryptedEmbedding String`, `iv String`, `authTag String`, `modelId`, `modelVersion`, `thresholdVersion`, `status`, `consentGivenAt`, `enrollmentCount`, `revokedAt`. Encryption helper `src/lib/biometric-crypto.ts` implements **AES-256-GCM authenticated encryption** (`createCipheriv` 12-byte random `iv`, `getAuthTag`): `encryptEmbedding(Float32Array)` → base64 `ciphertext/iv/authTag`, `decryptEmbedding` verifies tag else throws. Key via `BIOMETRIC_ENCRYPTION_KEY` env (32 bytes base64/hex) — never hardcoded, throws if missing (`biometric-crypto.ts:9`). Tests `webauthn.test.ts:128-171` prove roundtrip, IV randomness, tamper detection, key length enforcement.
- Retention: enrollment is per-user unique (`@@unique userId`), consent tracked, revocation via `revokedAt`; raw enrollment images not retained by default (only embedding).

## 10. What the liveness mechanism actually proves

- **Stage 1:** WebAuthn `userVerification: preferred` with platform authenticator *implies* device performed biometric or PIN to release the key, but **does NOT prove liveness to Agaate server beyond authenticator’s own policy**. Reported honestly: UI says `src/components/webauthn/webauthn-verify.tsx:50` “WebAuthn proves the enrolled device authenticator verified its user. It does not perform Agaate facial recognition (Stage 2…)” and docs herein §1.
- **Stage 2 liveness:** Not yet implemented. Stage 3 will implement server-unpredictable challenge (random prompt sequence) per §7, and will not claim `blink+turn = spoof-proof`. Known limitation section below states honest current level.

## 11. Known limitations — Stage 1

- **Not face recognition.** WebAuthn is possession + user verification, not similarity score. Agaate still needs Stage 2 face match before `Authenticated Account + Device Verification + Face Verification + GPS → Attendance` is complete. Attendance today remains `selfie + GPS` honest, not biometric.
- **Platform authenticator required.** Registration uses `authenticatorAttachment: platform` (`register/options:37`). Devices without FaceID/TouchID/Hello will fail with `NotSupportedError` handled as `This device… does not support platform authenticators` (`webauthn-register.tsx:28`). Fallback is explicit: user must use another device or await Stage 4 policy decision — no silent downgrade to “verified”.
- **Secure context required.** WebAuthn requires HTTPS or localhost. Production `WEBAUTHN_ORIGIN` must be `https://…` (`src/lib/webauthn.ts:getRpConfig` prefers `x-forwarded-proto` + `WEBAUTHN_ORIGIN` env). `localhost:3000` works in dev as secure context; staging without HTTPS will be blocked (hard stop per §17).
- **Counter clone detection limited.** Some authenticators return `counter=0` (no clone signal). We log anomaly but don’t block; stronger attestation metadata not yet used.
- **Single active challenge per user+type.** `storeChallenge` deletes previous pending (`webauthn.ts:28`) to prevent stale accumulation — concurrent registration tabs may race and invalidate earlier challenge (fail safe, not insecure).
- **No attestation trust store.** `attestationType: none` — we don’t validate manufacturer attestation. Acceptable for platform authenticators; enterprise attestation can be added later via `metadataService`.
- **Revocation is soft.** `revokedAt` timestamp, not hard delete — allows audit but credentialId remains in DB (unique constraint prevents re-register of same id without purge).

## 12. Stage gate

- **Stage 1 proven:** `npm test src/lib/webauthn.test.ts` 14 passed (challenge lifecycle, expiry, replay, wrong-user, type mismatch, counter, encryption). `npm run build` 25 routes include 5 WebAuthn endpoints. Manual check: `/settings/passkeys` register → prompt → `webauthn/credentials` list, verify → `✓ Device verification complete`, expired challenge 422, revoked exclusion, disabled user 422 — all honest states, no fake progress or percentages.
- **Next:** Stage 2 face enrollment+recognition — will evaluate `face-api.js` vs `MediaPipe` + embedding model (to be reported before integration), implement `POST /api/biometric/enroll|verify` with quality gates, threshold calibration on validation dataset, then Stage 3 liveness, Stage 4 attendance integration, Stage 5 browser e2e.

