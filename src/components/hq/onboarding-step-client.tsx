"use client";
import { useEffect, useRef, useState } from "react";
import { previewClientCode, type ClientInput } from "./onboarding-schema";

/* inp retired: global .input-field */

function F({ label, error, span, children }: { label: string; error?: string; span?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export function OnboardingStepClient({ value, onChange, errors, idempotencyKey, asyncIssue, onAsyncIssue }: {
  value: ClientInput; onChange: (v: ClientInput) => void; errors: Record<string, string>;
  idempotencyKey: string; asyncIssue: string | null; onAsyncIssue: (msg: string | null) => void;
}) {
  const set = (p: Partial<ClientInput>) => onChange({ ...value, ...p });
  const [checking, setChecking] = useState(false);
  const lastQ = useRef("");

  useEffect(() => {
    const phone = (value.phone ?? "").trim(), email = (value.email ?? "").trim();
    if (!phone && !email) { onAsyncIssue(null); return; }
    const q = `${phone}::${email}`; lastQ.current = q; setChecking(true);
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (phone) p.set("phone", phone); if (email) p.set("email", email);
      fetch(`/api/hq/onboarding/check-unique?${p}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (lastQ.current !== q || !d) return; const clash = d.phoneTaken ? `Phone belongs to ${d.phoneHolder ?? "another record"}.` : d.emailTaken ? `Email belongs to ${d.emailHolder ?? "another record"}.` : null; onAsyncIssue(clash); })
        .catch(() => undefined).finally(() => { if (lastQ.current === q) setChecking(false); });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(value.phone ?? "").trim(), (value.email ?? "").trim()]);

  return (
    <div className="ob-section">

      {/* Client ID */}
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        Preview ID: <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 700, fontSize: 13 }}>{previewClientCode(idempotencyKey)}</code>
        <span style={{ marginLeft: 8 }}>— finalised on activation</span>
      </div>

      {/* Identity */}
      <div>
        <div className="ob-section-title">Identity & Contact</div>
        <div className="ob-grid-3">
          <F label="Full name *" error={errors["name"]}>
            <input className="input-field" value={value.name} maxLength={120} placeholder="Ramesh Patel" onChange={(e) => set({ name: e.target.value })} />
          </F>
          <F label="Company name" error={errors["companyName"]}>
            <input className="input-field" value={value.companyName ?? ""} maxLength={180} placeholder="Greenfield Agro Pvt Ltd" onChange={(e) => set({ companyName: e.target.value })} />
          </F>
          <F label={`Mobile${checking ? " — checking…" : ""}`} error={errors["phone"] ?? (asyncIssue?.startsWith("Phone") ? asyncIssue : undefined)}>
            <input className="input-field" value={value.phone ?? ""} maxLength={20} inputMode="tel" placeholder="9876543210" onChange={(e) => set({ phone: e.target.value })} />
          </F>
          <F label="Email" error={errors["email"] ?? (asyncIssue && !asyncIssue.startsWith("Phone") ? asyncIssue : undefined)}>
            <input className="input-field" value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="owner@example.com" onChange={(e) => set({ email: e.target.value })} />
          </F>
        </div>
      </div>

      {/* Tax */}
      <details style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
        <summary style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", cursor: "pointer" }}>Tax & Location (optional)</summary>
        <div className="ob-grid-3" style={{ marginTop: 10 }}>
          <F label="PAN" error={errors["panNumber"]}>
            <input className="input-field" value={value.panNumber ?? ""} maxLength={20} placeholder="ABCDE1234F" onChange={(e) => set({ panNumber: e.target.value.toUpperCase() })} />
          </F>
          <F label="GSTIN" error={errors["gstin"]}>
            <input className="input-field" value={value.gstin ?? ""} maxLength={25} placeholder="29ABCDE1234F1Z5" onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
          </F>
          <F label="State" error={errors["state"]}>
            <input className="input-field" value={value.state ?? ""} maxLength={100} placeholder="Karnataka" onChange={(e) => set({ state: e.target.value })} />
          </F>
          <F label="District" error={errors["district"]}>
            <input className="input-field" value={value.district ?? ""} maxLength={100} placeholder="Chikkaballapur" onChange={(e) => set({ district: e.target.value })} />
          </F>
          <F label="Billing address" error={errors["billingAddress"]} span>
            <input className="input-field" value={value.billingAddress ?? ""} maxLength={500} placeholder="Door no, street, town, PIN" onChange={(e) => set({ billingAddress: e.target.value })} />
          </F>
        </div>
      </details>
    </div>
  );
}
