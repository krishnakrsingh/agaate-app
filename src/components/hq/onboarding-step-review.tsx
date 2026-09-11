"use client";
import { Icons } from "@/components/icons";
import { previewClientCode, type WizardData } from "./onboarding-schema";

export type ActivationResult = {
  success: boolean;
  deduped: boolean;
  client: { id: string; code: string; name: string };
  farms: { id: string; name: string }[];
  plots: { id: string; name: string; farmId: string }[];
  credential: { status: "ACTIVE" | "PENDING_INVITE"; loginEmail: string | null; loginUrl: string };
};

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hairline)" }}>
      <div style={{ width: 160, flexShrink: 0, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "var(--canvas-floor)" }}>{label}</div>
      <div style={{ flex: 1, padding: "10px 16px", fontSize: 13, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

export function OnboardingStepReview({
  data,
  submitting,
  submitError,
  onActivate,
}: {
  data: WizardData;
  submitting: boolean;
  submitError: string | null;
  onActivate: () => void;
}) {
  const totalArea = data.farms.reduce((s, f) => s + (Number(f.totalArea) || 0), 0);
  const farmNameByRow = new Map(data.farms.map((f, i) => [f.rowId ?? `index:${i}`, f.name.trim() || `Farm ${i + 1}`]));

  const checks = [
    { ok: !!data.client.name.trim(), label: "Client name", value: data.client.name || "—" },
    { ok: !!(data.client.phone || data.client.email), label: "Contact", value: [data.client.phone, data.client.email].filter(Boolean).join(" · ") || "—" },
    { ok: data.farms.length > 0, label: "Farms", value: `${data.farms.length} farm${data.farms.length !== 1 ? "s" : ""}, ${totalArea.toFixed(2)} ac` },
    { ok: data.team.mode === "invite" || (!!data.team.email && !!data.team.password), label: "Credentials", value: data.team.mode === "create" ? `Login for ${data.team.email || "—"}` : "Send invite later" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Client ID preview */}
      <div style={{ padding: "10px 24px", background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <span style={{ color: "var(--muted)" }}>Client ID preview:</span>
        <code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--ink)", background: "var(--surface-card)", padding: "2px 7px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
          {previewClientCode(data.idempotencyKey)}
        </code>
      </div>

      {/* Readiness checklist */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 12 }}>
          ✅ Readiness checklist
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checks.map((c) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: c.ok ? "var(--green-tint)" : "var(--amber-light)", border: `1px solid ${c.ok ? "var(--green-ink)" : "var(--amber)"}` }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.ok ? "var(--green-ink)" : "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {c.ok ? <Icons.Check size={12} style={{ color: "#fff" }} /> : <Icons.AlertTriangle size={12} style={{ color: "#fff" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.ok ? "var(--green-ink)" : "var(--amber)" }}>{c.label}</div>
                <div style={{ fontSize: 12, color: c.ok ? "var(--body)" : "var(--amber)", marginTop: 1 }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 12 }}>
          📋 Summary dossier
        </div>
        <div style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <ReviewRow label="Client" value={<><strong>{data.client.name || "—"}</strong>{data.client.companyName ? <span style={{ color: "var(--muted)", marginLeft: 8 }}>({data.client.companyName})</span> : ""}</>} />
          <ReviewRow label="Contact" value={[data.client.phone, data.client.email].filter(Boolean).join(" · ") || "—"} />
          <ReviewRow label="Tax" value={[data.client.panNumber, data.client.gstin].filter(Boolean).join(" · ") || "—"} />
          <ReviewRow label="Location" value={[data.client.district, data.client.state].filter(Boolean).join(", ") || "—"} />
          <ReviewRow label="Farms" value={`${data.farms.length} farm${data.farms.length !== 1 ? "s" : ""} — ${totalArea.toFixed(2)} total acres`} />
          <ReviewRow label="Plots" value={`${data.plots.length} plot${data.plots.length !== 1 ? "s" : ""}`} />
          <ReviewRow label="Credentials" value={data.team.mode === "create" ? `FARM_ADMIN login for ${data.team.email || "—"}` : "Invite later"} />
        </div>
      </div>

      {/* Farm manifest */}
      {data.farms.length > 0 && (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 10 }}>
            🌾 Farm manifest ({data.farms.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.farms.map((f, i) => (
              <div key={f.rowId ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", fontSize: 13 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--canvas-floor)", border: "1px solid var(--hairline-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{f.name}</span>
                <span style={{ color: "var(--muted)", flex: 1 }}>— {f.location} — {Number(f.cultivableArea)}/{Number(f.totalArea)} ac</span>
                <span style={{ fontSize: 11, color: "var(--muted-soft)", fontFamily: "var(--font-mono)" }}>{f.waterSource}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plot manifest */}
      {data.plots.length > 0 && (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 10 }}>
            📐 Plot manifest ({data.plots.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {data.plots.map((p, i) => (
              <div key={p.rowId ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                <span style={{ color: "var(--muted)" }}>— {Number(p.area)} ac — {farmNameByRow.get(p.farmRowId) ?? "Missing farm"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings & errors */}
      {data.farms.length === 0 && (
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "var(--amber-light)", border: "1px solid var(--amber)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <Icons.AlertTriangle size={15} style={{ color: "var(--amber)", flexShrink: 0 }} />
          <span style={{ color: "var(--amber)" }}>Warning: activating with zero farms. Client record will have no estate attached.</span>
        </div>
      )}
      {submitError && (
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "var(--red-light)", border: "1px solid var(--red)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <Icons.AlertCircle size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
          <span style={{ color: "var(--red)" }}>{submitError}</span>
        </div>
      )}

      {/* Activate CTA */}
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-green btn-lg"
          onClick={onActivate}
          disabled={submitting}
          style={{ minWidth: 220 }}
        >
          <span>{submitting ? "Activating client…" : "Confirm & Activate Client"}</span>
          <Icons.ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
