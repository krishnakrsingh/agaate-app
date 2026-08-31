import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="auth-shell">
      {/* Left Dark Immersive Feature Panel */}
      <section className="auth-panel">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div className="brand-icon">
              <Icons.Sprout size={18} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "0.5px", color: "var(--text-base)" }}>
              AGAATE
            </span>
          </div>

          <div style={{ maxWidth: 520 }}>
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span className="eyebrow-dot" />
              <span className="mono-label" style={{ color: "var(--text-secondary)" }}>
                ENTERPRISE AGRI OPERATING SYSTEM
              </span>
            </div>
            <h1 style={{
              color: "var(--text-light)", fontSize: "clamp(30px, 3.5vw, 48px)",
              lineHeight: 1.15, fontWeight: 800, margin: "0 0 16px"
            }}>
              Controlled intelligence from soil to harvest<span style={{ color: "var(--spotify-green)" }}>.</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.5, maxWidth: 480 }}>
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
              <strong style={{ color: "var(--text-base)", display: "block", fontSize: 14 }}>Geofenced Attendance & Live Presence</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Front-camera live stream capture with 500m Haversine radar</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.Calendar size={16} />
            </div>
            <div>
              <strong style={{ color: "var(--text-base)", display: "block", fontSize: 14 }}>7-Day Rolling Agronomy Dispatch</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Fertigation, spraying, nutrition, and automatic milestone engine</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.FileText size={16} />
            </div>
            <div>
              <strong style={{ color: "var(--text-base)", display: "block", fontSize: 14 }}>Automated Daily Operations Intelligence</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Verified field attendance, task execution, and material consumption</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Agaate Precision Agriculture &bull; AES-256 Encrypted &bull; FIDO2 WebAuthn Passkeys
        </div>
      </section>

      {/* Right Form Card Side */}
      <section className="auth-form-side" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <ThemeToggle />
        </div>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
