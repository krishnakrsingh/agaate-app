"use client";
import { useEffect, useRef, useState } from "react";
import { previewClientCode, type ClientInput } from "./onboarding-schema";
import { Icons } from "@/components/icons";

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

export function OnboardingStepClient({ value, onChange, errors, idempotencyKey, asyncIssue, onAsyncIssue, existingClientId }: {
  value: ClientInput; onChange: (v: ClientInput) => void; errors: Record<string, string>;
  idempotencyKey: string; asyncIssue: string | null; onAsyncIssue: (msg: string | null) => void;
  existingClientId?: string;
}) {
  const set = (p: Partial<ClientInput>) => onChange({ ...value, ...p });
  const [checking, setChecking] = useState(false);
  const lastQ = useRef("");

  useEffect(() => {
    const phone = (value.phone ?? "").trim(), email = (value.email ?? "").trim();
    if (!phone && !email) { onAsyncIssue(null); return; }
    const q = `${phone}::${email}::${existingClientId ?? ""}`; lastQ.current = q; setChecking(true);
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (phone) p.set("phone", phone);
      if (email) p.set("email", email);
      if (existingClientId) p.set("clientId", existingClientId);
      fetch(`/api/hq/onboarding/check-unique?${p}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (lastQ.current !== q) return;
          if (d.phoneExists) onAsyncIssue("Phone belongs to another client.");
          else if (d.emailExists) onAsyncIssue("Email belongs to another user.");
          else onAsyncIssue(null);
        })
        .catch(() => { if (lastQ.current === q) onAsyncIssue(null); })
        .finally(() => { if (lastQ.current === q) setChecking(false); });
    }, 450);
    return () => clearTimeout(t);
  }, [value.phone, value.email, existingClientId, onAsyncIssue]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Existing Client Alert Banner */}
      {existingClientId && (
        <div style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
              ✓
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Onboarding Estate for {value.name || "Existing Client"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                Client profile pre-filled from HQ Directory (<span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{existingClientId}</span>)
              </div>
            </div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.03em" }}>
            ACTIVE CLIENT
          </span>
        </div>
      )}

      {/* Identity Card */}
      <div style={{
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-card)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
              Identity & Primary Contact
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)" }}>
            <span>Preview ID:</span>
            <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 700, fontSize: 11, background: "var(--surface-strong)", border: "1px solid var(--hairline)", padding: "2px 6px", borderRadius: 4 }}>
              {previewClientCode(idempotencyKey)}
            </code>
          </div>
        </div>

        <div className="ob-grid-2">
          <F label="Full Name *" error={errors["name"]}>
            <input className="input-field" value={value.name} maxLength={120} placeholder="e.g., Ramesh Patel" onChange={(e) => set({ name: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="Business Name" error={errors["companyName"]}>
            <input className="input-field" value={value.companyName ?? ""} maxLength={180} placeholder="e.g., Greenfield Agro Pvt Ltd" onChange={(e) => set({ companyName: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label={`Mob (Mobile Number)${checking ? " — checking…" : ""}`} error={errors["phone"] ?? (asyncIssue?.startsWith("Phone") ? asyncIssue : undefined)}>
            <input className="input-field" value={value.phone ?? ""} maxLength={20} inputMode="tel" placeholder="e.g., 9876543210" onChange={(e) => set({ phone: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Whatsapp No</label>
              <button
                type="button"
                onClick={() => set({ whatsappNo: value.phone ?? "" })}
                disabled={!value.phone}
                style={{
                  background: value.whatsappNo && value.phone && value.whatsappNo === value.phone ? "var(--green-light, #dcfce7)" : "var(--surface-strong)",
                  color: value.whatsappNo && value.phone && value.whatsappNo === value.phone ? "var(--green, #15803d)" : "var(--ink)",
                  border: `1px solid ${value.whatsappNo && value.phone && value.whatsappNo === value.phone ? "var(--green, #86efac)" : "var(--hairline)"}`,
                  borderRadius: 4,
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "1px 6px",
                  cursor: value.phone ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  opacity: value.phone ? 1 : 0.5,
                }}
                title="Copy Mobile number to Whatsapp number"
              >
                <span>{value.whatsappNo && value.phone && value.whatsappNo === value.phone ? "✓ Same as Mob" : "Option to add same as Mob"}</span>
              </button>
            </div>
            <input className="input-field" value={value.whatsappNo ?? ""} maxLength={20} inputMode="tel" placeholder="e.g., 9876543210" onChange={(e) => set({ whatsappNo: e.target.value })} style={{ borderRadius: 8 }} />
            {errors["whatsappNo"] && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{errors["whatsappNo"]}</div>}
          </div>
          <F label="Email ID" error={errors["email"] ?? (asyncIssue && !asyncIssue.startsWith("Phone") ? asyncIssue : undefined)}>
            <input className="input-field" value={value.email ?? ""} maxLength={254} inputMode="email" placeholder="e.g., owner@example.com" onChange={(e) => set({ email: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="GST (GSTIN)" error={errors["gstin"]}>
            <input className="input-field" value={value.gstin ?? ""} maxLength={25} placeholder="e.g., 29ABCDE1234F1Z5" onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} style={{ borderRadius: 8 }} />
          </F>
        </div>
      </div>

      {/* Location & Address Card */}
      <div style={{
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        padding: "20px 24px",
        boxShadow: "var(--shadow-card)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
          <Icons.MapPin size={14} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
            Client Address & Billing Location
          </span>
        </div>

        <div className="ob-grid-2">
          <F label="Village" error={errors["village"]}>
            <input className="input-field" value={value.village ?? ""} maxLength={100} placeholder="e.g., Solur" onChange={(e) => set({ village: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="City" error={errors["city"]}>
            <input className="input-field" value={value.city ?? ""} maxLength={100} placeholder="e.g., Bengaluru" onChange={(e) => set({ city: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="State" error={errors["state"]}>
            <input className="input-field" value={value.state ?? ""} maxLength={100} placeholder="e.g., Karnataka" onChange={(e) => set({ state: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="PIN Code" error={errors["pincode"]}>
            <input className="input-field" value={value.pincode ?? ""} maxLength={20} placeholder="e.g., 562127" onChange={(e) => set({ pincode: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
          <F label="Billing Location" error={errors["billingAddress"]} span>
            <input className="input-field" value={value.billingAddress ?? ""} maxLength={500} placeholder="Door / Survey no, street name, layout" onChange={(e) => set({ billingAddress: e.target.value })} style={{ borderRadius: 8 }} />
          </F>
        </div>
      </div>
    </div>
  );
}
