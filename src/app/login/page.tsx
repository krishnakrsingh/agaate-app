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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <div className="app-brand-mark">
              <Icons.Sprout size={18} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "0.05em", color: "var(--text-main)" }}>
              AGAATE
            </span>
          </div>

          <div style={{ maxWidth: 520 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              <span className="eyebrow-dot" />
              PRECISION AGRI OPERATIONS PLATFORM
            </div>
            <h1 style={{
              fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
              lineHeight: 1.15,
              fontWeight: 800,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}>
              Controlled intelligence from soil to harvest<span style={{ color: "var(--primary)" }}>.</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.55, maxWidth: 460 }}>
              Operate multi-estate farm portfolios with verified field attendance, 7-day rolling agronomy dispatch, and automated daily intelligence reports.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, margin: "32px 0" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
              <Icons.MapPin size={18} />
            </div>
            <div>
              <strong style={{ color: "var(--text-main)", display: "block", fontSize: "0.95rem" }}>Geofenced Attendance & Live Presence</strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Front-camera live stream capture with 500m geofence radar</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
              <Icons.Calendar size={18} />
            </div>
            <div>
              <strong style={{ color: "var(--text-main)", display: "block", fontSize: "0.95rem" }}>7-Day Rolling Agronomy Dispatch</strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Fertigation, foliar spraying, nutrition, and automatic milestone engine</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
              <Icons.FileText size={18} />
            </div>
            <div>
              <strong style={{ color: "var(--text-main)", display: "block", fontSize: "0.95rem" }}>Automated Daily Operations Intelligence</strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Verified field attendance, task execution, and material consumption</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Agaate Precision Agriculture &bull; Verified Production Baseline
        </div>
      </section>

      {/* Right Form Side */}
      <section className="auth-form-side" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <ThemeToggle />
        </div>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
