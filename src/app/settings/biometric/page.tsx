import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FaceEnrollment } from "@/components/biometric/face-enrollment";
import { FaceVerify } from "@/components/biometric/face-verify";
import { WebAuthnRegister } from "@/components/webauthn/webauthn-register";
import { WebAuthnVerify } from "@/components/webauthn/webauthn-verify";
import { WebAuthnCredentials } from "@/components/webauthn/webauthn-credentials";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BiometricPage() {
  const session = await requireSession();

  const enrollment = await prisma.faceEnrollment.findUnique({
    where: { userId: session.userId },
    select: { status: true, modelId: true, modelVersion: true, thresholdVersion: true, enrollmentCount: true, createdAt: true, revokedAt: true },
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Settings" }, { label: "Biometric Identity" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              IDENTITY VERIFICATION • STAGES 1-2
            </div>
            <h1>Biometric Identity — Enrollment & Verification</h1>
            <p className="muted">
              Stage 1 WebAuthn (device) + Stage 2 face enrollment (128D embedding). Attendance integration (Stage 4) will require both plus GPS.
              Face reference is encrypted (AES-256-GCM) and versioned.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h3>Current Face Enrollment</h3>
                <p className="muted" style={{ fontSize: "0.82rem" }}>
                  {enrollment?.status === "ACTIVE"
                    ? `Enrolled ${enrollment.enrollmentCount} frames — ${enrollment.modelId}@${enrollment.modelVersion} (threshold ${enrollment.thresholdVersion}), ${new Date(enrollment.createdAt).toLocaleDateString()}`
                    : enrollment?.status === "REVOKED"
                    ? "Revoked — please re-enroll."
                    : "Not yet enrolled."}
                </p>
              </div>
              <span className={`status ${enrollment?.status?.toLowerCase() ?? "pending"}`} style={{ fontSize: "0.7rem" }}>
                {enrollment?.status ?? "NOT_ENROLLED"}
              </span>
            </div>
            {!enrollment || enrollment.status !== "ACTIVE" ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>Capture 3 valid frames with consent to create encrypted reference. Raw photos not retained by default.</p>
            ) : (
              <p className="muted" style={{ fontSize: "0.82rem" }}>Use verification below to test same-person match vs different person rejection. Distance ≤ threshold 0.6 = match (thresholdVersion {enrollment.thresholdVersion}); similarity derived honestly from distance.</p>
            )}
          </section>

          <FaceEnrollment />
          <FaceVerify />

          <section className="card">
            <h3>Stage 1 — WebAuthn Device (proven)</h3>
            <WebAuthnRegister />
            <div style={{ height: 12 }} />
            <WebAuthnVerify label="Test Device Verification" />
            <div style={{ marginTop: 12 }}>
              <WebAuthnCredentials />
            </div>
          </section>

          <section className="card" style={{ background: "var(--slate-50)" }}>
            <h4 style={{ margin: "0 0 6px" }}>Honest pipeline (Stage 2)</h4>
            <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
              Camera → Face detection (tinyFaceDetector) → Quality validation (score≥0.7, face≥80px, single face) → Face recognition model (128D) → Enrollment averaging (L2-normalized mean) → Encrypted storage (AES-256-GCM, key BIOMETRIC_ENCRYPTION_KEY, modelId@version stored) → Verification: Euclidean distance ≤ threshold (config, versioned) → Decision + audit (distance, similarity, model, thresholdVersion). No brightness, no fake progress.
            </p>
            <p className="muted" style={{ fontSize: "0.72rem", marginTop: 8 }}>
              Models: tinyFaceDetector 190KB + landmark68 350KB + recognition 6.2MB = 6.7MB, MIT (face-api), from /models. Inference ~400-800ms on mid-tier; WASM via tfjs. Limitations: no liveness yet (Stage 3), lighting/occlusion affects FRR, threshold requires validation dataset calibration (current 0.6 is face-api default, not yet tuned for Agaate farm conditions).
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
