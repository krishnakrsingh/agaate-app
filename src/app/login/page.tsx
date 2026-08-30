import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="auth-shell">
      {/* Left Deep Green Feature Band */}
      <section className="auth-panel">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div className="brand-icon" style={{ background: "white", color: "var(--deep-green)" }}>
              <Icons.Sprout size={18} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: "white" }}>
              AGAATE
            </span>
          </div>

          <div style={{ maxWidth: 520 }}>
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)" }} />
              <span className="mono-label" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                ENTERPRISE AGRI OPERATING SYSTEM
              </span>
            </div>
            <h1 style={{
              color: "white", fontSize: "clamp(32px, 4vw, 54px)",
              lineHeight: 1.05, fontWeight: 400, margin: "0 0 16px"
            }}>
              Controlled intelligence from soil to harvest<span style={{ color: "var(--coral)" }}>.</span>
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 16, lineHeight: 1.45, maxWidth: 480 }}>
              Operate multi-farm portfolios with precision agronomy, geofenced presence verification, and automated daily intelligence reports.
            </p>
          </div>
        </div>

        <div className="auth-features-list">
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.MapPin size={16} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: 14 }}>Geofenced Attendance & Live Presence</strong>
              <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)" }}>Front-camera live stream capture with 500m Haversine radar</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.Calendar size={16} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: 14 }}>7-Day Rolling Agronomy Dispatch</strong>
              <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)" }}>Fertigation, spraying, nutrition, and automatic milestone engine</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.FileText size={16} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: 14 }}>Automated Daily Operations Intelligence</strong>
              <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)" }}>Verified field attendance, task execution, and material consumption</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>
          Agaate Precision Agriculture &bull; AES-256 Encrypted &bull; FIDO2 WebAuthn Passkeys
        </div>
      </section>

      {/* Right Canvas White Form Card */}
      <section className="auth-form-side">
        <div style={{ width: "100%", maxWidth: 440 }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
