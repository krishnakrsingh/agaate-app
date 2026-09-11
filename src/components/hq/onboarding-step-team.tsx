"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { MIN_PASSWORD_LENGTH, type TeamInput } from "./onboarding-schema";

const inp: React.CSSProperties = { width: "100%", height: "34px", fontSize: 13 };

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export function OnboardingStepTeam({ value, onChange, errors, clientName, clientEmail }: {
  value: TeamInput; onChange: (v: TeamInput) => void; errors: Record<string, string>;
  clientName: string; clientEmail: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const set = (p: Partial<TeamInput>) => onChange({ ...value, ...p });
  const create = value.mode === "create";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Mode */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>Credential mode</div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", overflow: "hidden", width: "fit-content" }}>
          {[{ v: "create", label: "Create login now" }, { v: "later", label: "Invite later" }].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              aria-pressed={value.mode === v}
              onClick={() => set({ mode: v as TeamInput["mode"] })}
              style={{
                padding: "9px 20px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background: value.mode === v ? "var(--ink)" : "transparent",
                color: value.mode === v ? "#fff" : "var(--muted)",
                transition: "all 0.1s",
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {create ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 0 }}>Admin account</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px" }}>
            <F label="Full name" error={errors["name"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={value.name ?? ""} maxLength={100} placeholder="Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
                {clientName.trim() && <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11 }} onClick={() => set({ name: clientName.trim() })}>Same as client</button>}
              </div>
            </F>
            <F label="Login email" error={errors["email"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="owner@example.com" onChange={(e) => set({ email: e.target.value })} />
                {clientEmail.trim() && <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11 }} onClick={() => set({ email: clientEmail.trim() })}>Same as client</button>}
              </div>
            </F>
            <F label="Phone (optional)" error={errors["phone"]}>
              <input style={inp} value={value.phone ?? ""} maxLength={20} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
            </F>
            <F label={`Password (min ${MIN_PASSWORD_LENGTH})`} error={errors["password"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...inp, flex: 1, fontFamily: "monospace" }} type={showPw ? "text" : "password"} value={value.password ?? ""} maxLength={128} autoComplete="new-password" onChange={(e) => set({ password: e.target.value })} />
                <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide" : "Show"}>
                  <Icons.Eye size={13} />
                </button>
              </div>
            </F>
            <F label="Confirm password" error={errors["confirmPassword"]}>
              <input style={{ ...inp, fontFamily: "monospace" }} type={showPw ? "text" : "password"} value={value.confirmPassword ?? ""} maxLength={128} autoComplete="new-password" onChange={(e) => set({ confirmPassword: e.target.value })} />
            </F>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Credentials are shown once on activation and never stored in plain text.</p>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          No login created. Client record stays active — send the FARM_ADMIN invite later from the client workspace.
        </p>
      )}
    </div>
  );
}
