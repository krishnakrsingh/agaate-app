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
      {/* Left Feature & Product Panel */}
      <section className="auth-panel">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div className="app-brand-mark">
              <Icons.Sprout size={16} />
            </div>
            <span style={{ fontWeight: 650, fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)" }}>
              AGAATE
            </span>
          </div>

          <div style={{ maxWidth: 480 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              <span className="eyebrow-dot" />
              <span>PRECISION AGRI OPERATIONS PLATFORM</span>
            </div>
            <h1 style={{
              fontSize: "clamp(24px, 3.2vw, 36px)",
              lineHeight: 1.15,
              fontWeight: 650,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}>
              Controlled intelligence from soil to harvest<span style={{ color: "var(--green)" }}>.</span>
            </h1>
            <p className="muted" style={{ fontSize: "14px", lineHeight: 1.6, maxWidth: 440 }}>
              Line-first operational system for precision estates: verified field presence, 7-day rolling agronomy matrix, and automated operations intelligence.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "32px 0" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-xs)", background: "var(--stone)", border: "1px solid var(--line)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>
              <Icons.MapPin size={16} />
            </div>
            <div>
              <strong style={{ color: "var(--ink)", display: "block", fontSize: "13px", fontWeight: 600 }}>Geofenced Attendance &amp; Live Presence</strong>
              <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: 2 }}>Front-camera live stream capture with 500m geofence radar</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-xs)", background: "var(--stone)", border: "1px solid var(--line)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>
              <Icons.Calendar size={16} />
            </div>
            <div>
              <strong style={{ color: "var(--ink)", display: "block", fontSize: "13px", fontWeight: 600 }}>7-Day Rolling Agronomy Dispatch</strong>
              <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: 2 }}>Fertigation, foliar spraying, nutrition, and automatic milestone engine</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-xs)", background: "var(--stone)", border: "1px solid var(--line)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>
              <Icons.FileText size={16} />
            </div>
            <div>
              <strong style={{ color: "var(--ink)", display: "block", fontSize: "13px", fontWeight: 600 }}>Automated Daily Operations Intelligence</strong>
              <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: 2 }}>Verified field attendance, task execution, and material consumption</span>
            </div>
          </div>
        </div>

        <div className="mono-label" style={{ color: "var(--muted)" }}>
          AGAATE PRECISION AGRICULTURE &bull; VERIFIED PRODUCTION BASELINE
        </div>
      </section>

      {/* Right Form Side */}
      <section className="auth-form-side" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <ThemeToggle />
        </div>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
