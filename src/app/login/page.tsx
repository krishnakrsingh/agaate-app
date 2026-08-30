import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div className="brand-icon">
              <Icons.Sprout size={20} />
            </div>
            <span style={{ fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.02em" }}>
              AGAATE
            </span>
          </div>

          <div style={{ maxWidth: 520 }}>
            <div className="eyebrow" style={{ color: "var(--primary-300)" }}>
              <span className="eyebrow-dot" style={{ background: "var(--primary-300)" }}></span>
              FARM OPERATIONS PLATFORM
            </div>
            <h1 style={{ color: "white", fontSize: "clamp(2rem, 4vw, 2.75rem)", marginTop: 12, marginBottom: 16 }}>
              Centralized intelligence from soil to harvest.
            </h1>
            <p style={{ color: "var(--slate-300)", fontSize: "1.05rem", lineHeight: 1.6 }}>
              Manage multiple farms simultaneously with precision agronomy planning, geofenced officer attendance, and automated operational reporting.
            </p>
          </div>
        </div>

        <div className="auth-features-list">
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.MapPin size={18} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block" }}>Geofenced Field Attendance</strong>
              <span style={{ fontSize: "0.85rem", color: "var(--slate-300)" }}>Selfie verification with Haversine distance calculations</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.Calendar size={18} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block" }}>7-Day Rolling Agronomy Planning</strong>
              <span style={{ fontSize: "0.85rem", color: "var(--slate-300)" }}>Categorized spray, fertigation & crop protection schedules</span>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <Icons.Camera size={18} />
            </div>
            <div>
              <strong style={{ color: "white", display: "block" }}>Visual Crop Health Telemetry</strong>
              <span style={{ fontSize: "0.85rem", color: "var(--slate-300)" }}>Good vs poor status tracking with impact stages and photo evidence</span>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255, 255, 255, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "var(--slate-400)" }}>
          <span>© {new Date().getFullYear()} Agaate Technologies</span>
          <span>PWA v1.0.0</span>
        </div>
      </section>

      <section className="auth-form-side">
        <LoginForm />
      </section>
    </main>
  );
}
