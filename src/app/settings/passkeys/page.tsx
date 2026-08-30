import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WebAuthnRegister } from "@/components/webauthn/webauthn-register";
import { WebAuthnCredentials } from "@/components/webauthn/webauthn-credentials";
import { WebAuthnVerify } from "@/components/webauthn/webauthn-verify";

export const dynamic = "force-dynamic";

export default async function PasskeysPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Settings" }, { label: "Device Verification" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              IDENTITY VERIFICATION • STAGE 1 — WebAuthn
            </div>
            <h1>Device Verification (WebAuthn)</h1>
            <p className="muted">
              Stage 1 of Agaate identity verification. Registers your device’s platform authenticator (Face ID, Touch ID, Windows Hello).
              This proves possession of the enrolled authenticator — it does not perform Agaate facial recognition (Stage 2).
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h3>How it works</h3>
                <p className="muted" style={{ fontSize: "0.82rem" }}>
                  Your biometric never leaves the device. The authenticator signs a challenge with its private key; the server verifies
                  with the stored public key and checks the counter to prevent replay.
                </p>
              </div>
              <span className="role-badge" style={{ background: "var(--primary-50)", color: "var(--primary-700)", fontSize: "0.7rem" }}>
                Platform authenticator
              </span>
            </div>
            <ul style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>Requires secure context (HTTPS or localhost) — production needs HTTPS.</li>
              <li>Challenge expires in 5 minutes and is single-use (replay protected).</li>
              <li>Counter incremented on each authentication — clone detection via counter regression.</li>
              <li>Revocation marks credential revokedAt; audit logs enrollment & authentication.</li>
            </ul>
          </section>

          <WebAuthnRegister />

          <section className="card">
            <div className="card-header">
              <h3>Test Device Verification</h3>
              <p className="muted" style={{ fontSize: "0.82rem" }}>Verifies the registered authenticator without creating attendance.</p>
            </div>
            <WebAuthnVerify label="Test Verify with Registered Device" />
          </section>

          <section className="card">
            <div className="card-header">
              <h3>Registered Devices</h3>
              <p className="muted" style={{ fontSize: "0.82rem" }}>Manage devices enrolled for this account.</p>
            </div>
            <WebAuthnCredentials />
          </section>

          <section className="card" style={{ background: "var(--slate-50)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>Privacy & retention</h4>
            <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
              No biometric image is stored. Only credentialId, publicKey, counter, transports, deviceType, backedUp and timestamps are
              persisted. Revoke deletes verification capability immediately; audit retains actor/action/timestamp. Enrollment requires
              consent (Stage 2 face enrollment will add explicit consent before storing encrypted embedding).
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
