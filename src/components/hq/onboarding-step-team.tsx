"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { MIN_PASSWORD_LENGTH, type TeamInput } from "./onboarding-schema";

const inputStyle = { width: "100%" } as const;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label>{label}</label>
      {children}
      {error && (
        <span role="alert" style={{ color: "var(--semantic-error)", fontSize: 12 }}>
          {error}
        </span>
      )}
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
    <div className="section-block">
      <div className="form-section-title">Step 4. Team credentials</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Create the FARM_ADMIN login for the client now, or invite them later. Credentials are shown once on activation.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }} role="radiogroup" aria-label="Credential mode">
        <button type="button" className={`btn ${create ? "btn-green" : "btn-secondary"}`} onClick={() => set({ mode: "create" })} aria-pressed={create}>
          Create login now
        </button>
        <button type="button" className={`btn ${!create ? "btn-green" : "btn-secondary"}`} onClick={() => set({ mode: "later" })} aria-pressed={!create}>
          Invite later
        </button>
      </div>

      {create ? (
        <div className="two-column">
          <Field label="Admin full name" error={errors["name"]}>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={value.name ?? ""} maxLength={100} placeholder="e.g., Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
              {clientName.trim() && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ name: clientName.trim() })}>
                  Use client name
                </button>
              )}
            </div>
          </Field>
          <Field label="Admin email (login ID)" error={errors["email"]}>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="e.g., owner@example.com" onChange={(e) => set({ email: e.target.value })} />
              {clientEmail.trim() && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ email: clientEmail.trim() })}>
                  Use client email
                </button>
              )}
            </div>
          </Field>
          <Field label="Admin phone (optional)" error={errors["phone"]}>
            <input style={inputStyle} value={value.phone ?? ""} maxLength={20} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <div />
          <Field label={`Password (min ${MIN_PASSWORD_LENGTH} characters)`} error={errors["password"]}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                type={showPassword ? "text" : "password"}
                value={value.password ?? ""}
                maxLength={128}
                autoComplete="new-password"
                onChange={(e) => set({ password: e.target.value })}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"}>
                <Icons.Eye size={14} />
              </button>
            </div>
          </Field>
          <Field label="Confirm password" error={errors["confirmPassword"]}>
            <input style={inputStyle} type={showPassword ? "text" : "password"} value={value.confirmPassword ?? ""} maxLength={128} autoComplete="new-password" onChange={(e) => set({ confirmPassword: e.target.value })} />
          </Field>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>
          No login is created. The client record stays active and the FARM_ADMIN invite can be sent later from the client workspace.
        </p>
      )}
    </div>
  );
}
