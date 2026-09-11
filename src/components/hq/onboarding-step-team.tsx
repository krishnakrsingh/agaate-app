"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { MIN_PASSWORD_LENGTH, type TeamInput } from "./onboarding-schema";

const inp: React.CSSProperties = { width: "100%", height: "36px", fontSize: 13 };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--body-strong)", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <span role="alert" style={{ color: "var(--semantic-error)", fontSize: 11, marginTop: 3, display: "block" }}>{error}</span>}
    </div>
  );
}

export function OnboardingStepTeam({
  value,
  onChange,
  errors,
  clientName,
  clientEmail,
}: {
  value: TeamInput;
  onChange: (v: TeamInput) => void;
  errors: Record<string, string>;
  clientName: string;
  clientEmail: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const set = (patch: Partial<TeamInput>) => onChange({ ...value, ...patch });
  const create = value.mode === "create";

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Mode toggle */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 12 }}>
          🔐 Credential mode
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} role="radiogroup" aria-label="Credential mode">
          <button
            type="button"
            aria-pressed={create}
            onClick={() => set({ mode: "create" })}
            style={{
              padding: "14px 16px",
              border: `1px solid ${create ? "var(--ink)" : "var(--hairline)"}`,
              borderRadius: "var(--radius-md)",
              background: create ? "var(--ink)" : "var(--surface-card)",
              color: create ? "#fff" : "var(--ink)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.12s",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>🔑 Create login now</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>Set a password — shown once on activation.</div>
          </button>
          <button
            type="button"
            aria-pressed={!create}
            onClick={() => set({ mode: "later" })}
            style={{
              padding: "14px 16px",
              border: `1px solid ${!create ? "var(--ink)" : "var(--hairline)"}`,
              borderRadius: "var(--radius-md)",
              background: !create ? "var(--ink)" : "var(--surface-card)",
              color: !create ? "#fff" : "var(--ink)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.12s",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>📨 Invite later</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>Send an invite link from the client workspace.</div>
          </button>
        </div>
      </div>

      {/* Create credentials form */}
      {create ? (
        <div style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 14 }}>
            👤 Admin account
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px 20px" }}>
            <Field label="Admin full name" error={errors["name"]}>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} value={value.name ?? ""} maxLength={100} placeholder="Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
                {clientName.trim() && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ name: clientName.trim() })} style={{ flexShrink: 0 }}>
                    Use client
                  </button>
                )}
              </div>
            </Field>

            <Field label="Admin email (login ID)" error={errors["email"]}>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="owner@example.com" onChange={(e) => set({ email: e.target.value })} />
                {clientEmail.trim() && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ email: clientEmail.trim() })} style={{ flexShrink: 0 }}>
                    Use client
                  </button>
                )}
              </div>
            </Field>

            <Field label="Admin phone (optional)" error={errors["phone"]}>
              <input style={inp} value={value.phone ?? ""} maxLength={20} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
            </Field>

            <div /> {/* spacer */}

            <Field label={`Password (min ${MIN_PASSWORD_LENGTH} chars)`} error={errors["password"]}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inp, flex: 1, fontFamily: "monospace" }}
                  type={showPassword ? "text" : "password"}
                  value={value.password ?? ""}
                  maxLength={128}
                  autoComplete="new-password"
                  onChange={(e) => set({ password: e.target.value })}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ flexShrink: 0 }}>
                  <Icons.Eye size={14} />
                </button>
              </div>
            </Field>

            <Field label="Confirm password" error={errors["confirmPassword"]}>
              <input style={{ ...inp, fontFamily: "monospace" }} type={showPassword ? "text" : "password"} value={value.confirmPassword ?? ""} maxLength={128} autoComplete="new-password" onChange={(e) => set({ confirmPassword: e.target.value })} />
            </Field>
          </div>

          <p style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
            Credentials are shown <strong>once</strong> on activation and are not stored in plain text.
          </p>
        </div>
      ) : (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ padding: "16px", background: "var(--surface-strong)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--body)" }}>
            No login will be created. The client record stays active and a FARM_ADMIN invite can be sent later from the client workspace.
          </div>
        </div>
      )}
    </div>
  );
}
