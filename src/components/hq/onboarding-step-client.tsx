"use client";
import { useEffect, useRef, useState } from "react";
import { previewClientCode, type ClientInput } from "./onboarding-schema";

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

const inputStyle = { width: "100%" } as const;

export function OnboardingStepClient({
  value,
  onChange,
  errors,
  idempotencyKey,
  asyncIssue,
  onAsyncIssue,
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  errors: Record<string, string>;
  idempotencyKey: string;
  asyncIssue: string | null;
  onAsyncIssue: (msg: string | null) => void;
}) {
  const set = (patch: Partial<ClientInput>) => onChange({ ...value, ...patch });
  const [checking, setChecking] = useState(false);
  const [holder, setHolder] = useState<{ phoneHolder: string | null; emailHolder: string | null }>({ phoneHolder: null, emailHolder: null });
  const lastQuery = useRef("");

  useEffect(() => {
    const phone = (value.phone ?? "").trim();
    const email = (value.email ?? "").trim();
    if (!phone && !email) {
      onAsyncIssue(null);
      setHolder({ phoneHolder: null, emailHolder: null });
      return;
    }
    const query = `${phone}::${email}`;
    lastQuery.current = query;
    setChecking(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (phone) params.set("phone", phone);
      if (email) params.set("email", email);
      fetch(`/api/hq/onboarding/check-unique?${params.toString()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (lastQuery.current !== query || !d) return;
          setHolder({ phoneHolder: d.phoneHolder ?? null, emailHolder: d.emailHolder ?? null });
          const clash = d.phoneTaken
            ? `Phone number already belongs to ${d.phoneHolder ?? "another record"}.`
            : d.emailTaken
              ? `Email address already belongs to ${d.emailHolder ?? "another record"}.`
              : null;
          onAsyncIssue(clash);
        })
        .catch(() => undefined)
        .finally(() => {
          if (lastQuery.current === query) setChecking(false);
        });
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(value.phone ?? "").trim(), (value.email ?? "").trim()]);

  return (
    <div className="section-block">
      <div className="form-section-title">Step 1. Client information</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Client ID preview: <strong style={{ color: "var(--ink)" }}>{previewClientCode(idempotencyKey)}</strong>
        <span style={{ marginLeft: 8 }}>The final ID is assigned on activation.</span>
      </p>
      <div className="two-column">
        <Field label="Client / owner full name" error={errors["name"]}>
          <input style={inputStyle} value={value.name} maxLength={120} placeholder="e.g., Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Company / entity name (optional)" error={errors["companyName"]}>
          <input style={inputStyle} value={value.companyName ?? ""} maxLength={180} placeholder="e.g., Greenfield Agro Pvt Ltd" onChange={(e) => set({ companyName: e.target.value })} />
        </Field>
        <Field label="Mobile number" error={errors["phone"]}>
          <input style={inputStyle} value={value.phone ?? ""} maxLength={20} inputMode="tel" placeholder="e.g., 9876543210" onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Email address" error={errors["email"]}>
          <input style={inputStyle} value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="e.g., owner@example.com" onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="PAN (optional)" error={errors["panNumber"]}>
          <input style={inputStyle} value={value.panNumber ?? ""} maxLength={20} placeholder="ABCDE1234F" onChange={(e) => set({ panNumber: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="GSTIN (optional)" error={errors["gstin"]}>
          <input style={inputStyle} value={value.gstin ?? ""} maxLength={25} placeholder="29ABCDE1234F1Z5" onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="State" error={errors["state"]}>
          <input style={inputStyle} value={value.state ?? ""} maxLength={100} placeholder="e.g., Karnataka" onChange={(e) => set({ state: e.target.value })} />
        </Field>
        <Field label="District" error={errors["district"]}>
          <input style={inputStyle} value={value.district ?? ""} maxLength={100} placeholder="e.g., Chikkaballapur" onChange={(e) => set({ district: e.target.value })} />
        </Field>
        <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
          <label>Billing address (optional)</label>
          <input style={inputStyle} value={value.billingAddress ?? ""} maxLength={500} placeholder="Door no, street, town, PIN" onChange={(e) => set({ billingAddress: e.target.value })} />
          {errors["billingAddress"] && (
            <span role="alert" style={{ color: "var(--semantic-error)", fontSize: 12 }}>
              {errors["billingAddress"]}
            </span>
          )}
        </div>
      </div>
      {checking && <p className="muted" style={{ fontSize: 12 }}>Checking phone and email uniqueness…</p>}
      {!checking && (holder.phoneHolder || holder.emailHolder) && !asyncIssue && (
        <p className="muted" style={{ fontSize: 12 }}>Phone and email are available.</p>
      )}
      {asyncIssue && (
        <div className="error" role="alert" style={{ marginTop: 8 }}>
          <span>{asyncIssue}</span>
        </div>
      )}
    </div>
  );
}
