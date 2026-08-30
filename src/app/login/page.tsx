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

          <div style={{ maxWidth: 560 }}>
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--coral)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.28, textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                Farm operations platform • PWA
              </span>
            </div>
            <h1 style={{
              color: "white", fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 60px)",
              lineHeight: 1, letterSpacing: "-1.2px", fontWeight: 400, margin: "0 0 16px"
            }}>
              Centralized intelligence from soil to harvest<span style={{ color: "var(--coral-soft)" }}>.</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, lineHeight: 1.4, maxWidth: 520 }}>
              Manage multiple farms simultaneously with precision agronomy planning, geofenced attendance, and automated reporting — on a stark white canvas with deep green-black control.
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

        <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
          <span>© {new Date().getFullYear()} Agaate Technologies</span>
          <span style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>PWA v1.0.0 • Cohere system</span>
        </div>
      </section>

      <section className="auth-form-side">
        <LoginForm />
      </section>
    </main>
  );
}
