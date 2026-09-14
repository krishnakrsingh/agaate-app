"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { MIN_PASSWORD_LENGTH, type TeamInput } from "./onboarding-schema";

/* inp retired: global .input-field */

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Mode Selection Card */}
      <div style={{
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-card)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
              Access & Credential Provisioning
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Portal User Account</span>
        </div>

        <div style={{ display: "inline-flex", gap: 4, background: "var(--surface-strong)", padding: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
          {[{ v: "create", label: "Create login now" }, { v: "later", label: "Invite later" }].map(({ v, label }) => {
            const active = value.mode === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                onClick={() => set({ mode: v as TeamInput["mode"] })}
                style={{
                  padding: "7px 18px", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
                  borderRadius: "calc(var(--radius-md) - 2px)",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "#fff" : "var(--muted)",
                  boxShadow: active ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                  transition: "all 0.15s ease",
                }}
              >{label}</button>
            );
          })}
        </div>
      </div>

      {/* Create form */}
      {create ? (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "18px 20px",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                Owner Administrator Account
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Direct Portal Access</span>
          </div>

          <div className="ob-grid-2">
            <F label="Full name" error={errors["name"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input-field" style={{ flex: 1, borderRadius: 8 }} value={value.name ?? ""} maxLength={100} placeholder="Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
                {clientName.trim() && (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11, height: 38 }} onClick={() => set({ name: clientName.trim() })}>
                    Use Client
                  </button>
                )}
              </div>
            </F>
            <F label="Login email" error={errors["email"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input-field" style={{ flex: 1, borderRadius: 8 }} value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="owner@example.com" onChange={(e) => set({ email: e.target.value })} />
                {clientEmail.trim() && (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11, height: 38 }} onClick={() => set({ email: clientEmail.trim() })}>
                    Use Client
                  </button>
                )}
              </div>
            </F>
            <F label="Mobile Phone (Optional)" error={errors["phone"]}>
              <input className="input-field" value={value.phone ?? ""} maxLength={20} inputMode="tel" placeholder="9876543210" onChange={(e) => set({ phone: e.target.value })} style={{ borderRadius: 8 }} />
            </F>
            <div style={{ display: "flex", alignItems: "center", color: "var(--muted)", fontSize: 11.5, lineHeight: 1.4, padding: "8px 0" }}>
              Password will be shown once upon client activation for immediate handover.
            </div>
            <F label={`Password (min ${MIN_PASSWORD_LENGTH} chars)`} error={errors["password"]}>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input-field" style={{ flex: 1, fontFamily: "monospace", borderRadius: 8 }} type={showPw ? "text" : "password"} value={value.password ?? ""} maxLength={128} autoComplete="new-password" placeholder="••••••••" onChange={(e) => set({ password: e.target.value })} />
                <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, height: 38, width: 38, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide" : "Show"}>
                  <Icons.Eye size={14} />
                </button>
              </div>
            </F>
            <F label="Confirm password" error={errors["confirmPassword"]}>
              <input className="input-field" style={{ fontFamily: "monospace", borderRadius: 8 }} type={showPw ? "text" : "password"} value={value.confirmPassword ?? ""} maxLength={128} autoComplete="new-password" placeholder="••••••••" onChange={(e) => set({ confirmPassword: e.target.value })} />
            </F>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--hairline)", fontSize: 11.5, color: "var(--muted)" }}>
            Credentials are shown once on activation and never stored in plain text.
          </div>
        </div>
      ) : (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "28px 20px",
          textAlign: "center",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-strong)", border: "1px solid var(--hairline)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icons.Mail size={20} style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Invite link will be generated</div>
          <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 420, margin: "6px auto 0", lineHeight: 1.5 }}>
            No password required now. An email invitation can be dispatched directly from the Client Directory after estate activation.
          </div>
        </div>
      )}
    </div>
  );
}
