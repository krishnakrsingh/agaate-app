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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="section-block">
        <div className="form-section-title">Step 5. Review and activate</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Client ID preview: <strong style={{ color: "var(--ink)" }}>{previewClientCode(data.idempotencyKey)}</strong>
        </p>
        <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
          <dt className="muted">Client</dt>
          <dd style={{ margin: 0 }}>{data.client.name || "—"}{data.client.companyName ? ` (${data.client.companyName})` : ""}</dd>
          <dt className="muted">Contact</dt>
          <dd style={{ margin: 0 }}>{[data.client.phone, data.client.email].filter(Boolean).join(" · ") || "—"}</dd>
          <dt className="muted">Tax</dt>
          <dd style={{ margin: 0 }}>{[data.client.panNumber, data.client.gstin].filter(Boolean).join(" · ") || "—"}</dd>
          <dt className="muted">Farms</dt>
          <dd style={{ margin: 0 }}>{data.farms.length} farm{data.farms.length === 1 ? "" : "s"} — {totalArea.toFixed(2)} total acres</dd>
          <dt className="muted">Plots</dt>
          <dd style={{ margin: 0 }}>{data.plots.length} plot{data.plots.length === 1 ? "" : "s"}</dd>
          <dt className="muted">Credentials</dt>
          <dd style={{ margin: 0 }}>{data.team.mode === "create" ? `FARM_ADMIN login for ${data.team.email || "—"}` : "Invite later"}</dd>
        </dl>
      </div>

      {data.farms.length > 0 && (
        <div className="section-block">
          <div className="form-section-title">Farms ({data.farms.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.farms.map((f, i) => (
              <div key={f.rowId ?? i} style={{ fontSize: 13, border: "1px solid var(--hairline)", padding: "6px 10px", background: "var(--surface-card)" }}>
                <strong>{f.name}</strong>
                <span className="muted"> — {f.location} — {Number(f.cultivableArea)}/{Number(f.totalArea)} ac — {f.waterSource}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.plots.length > 0 && (
        <div className="section-block">
          <div className="form-section-title">Plots ({data.plots.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.plots.map((p, i) => (
              <div key={p.rowId ?? i} style={{ fontSize: 13, border: "1px solid var(--hairline)", padding: "6px 10px", background: "var(--surface-card)" }}>
                <strong>{p.name}</strong>
                <span className="muted"> — {Number(p.area)} ac — {farmNameByRow.get(p.farmRowId) ?? "Missing farm"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.farms.length === 0 && (
        <div className="error" role="alert">
          <Icons.AlertTriangle size={16} />
          <span>Warning: activating with zero farms. The client record is created with no estate attached.</span>
        </div>
      )}

      {submitError && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        <button type="button" className="btn btn-green btn-lg" onClick={onActivate} disabled={submitting}>
          <span>{submitting ? "Activating…" : "Review complete — Activate client"}</span>
          <Icons.ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
