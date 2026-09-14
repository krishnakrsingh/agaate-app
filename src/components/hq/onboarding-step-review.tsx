"use client";
import { Icons } from "@/components/icons";
import { previewClientCode, type WizardData } from "./onboarding-schema";

export type ActivationResult = {
  success: boolean; deduped: boolean;
  client: { id: string; code: string; name: string };
  farms: { id: string; name: string }[];
  plots: { id: string; name: string; farmId: string }[];
  credential: { status: "ACTIVE" | "PENDING_INVITE"; loginEmail: string | null; loginUrl: string };
};

function Row({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
      <td style={{ padding: "9px 0", color: "var(--muted)", width: 160, verticalAlign: "top", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "9px 0", fontSize: 13, color: warn ? "var(--amber)" : "var(--ink)", fontWeight: warn ? 600 : undefined }}>{value}</td>
    </tr>
  );
}

export function OnboardingStepReview({ data, submitting, submitError, onActivate }: {
  data: WizardData; submitting: boolean; submitError: string | null; onActivate: () => void;
}) {
  const totalArea = data.farms.reduce((s, f) => s + (Number(f.totalArea) || 0), 0);
  const fencedFarms = data.farms.filter((f) => (f.boundaryRing?.length ?? 0) >= 4).length;
  const fencedPlots = data.plots.filter((p) => (p.boundaryRing?.length ?? 0) >= 4).length;
  const farmNameByRow = new Map(data.farms.map((f, i) => [f.rowId ?? `index:${i}`, f.name.trim() || `Farm ${i + 1}`]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Summary Card */}
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
              Client Overview
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Review Details</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <Row label="Preview ID" value={<code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12, background: "var(--surface-strong)", border: "1px solid var(--hairline)", padding: "2px 6px", borderRadius: 4 }}>{previewClientCode(data.idempotencyKey)}</code>} />
            <Row label="Client" value={<>{data.client.name || "—"}{data.client.companyName ? <span style={{ color: "var(--muted)", marginLeft: 8 }}>({data.client.companyName})</span> : ""}</>} warn={!data.client.name} />
            <Row label="Contact" value={[data.client.phone, data.client.email].filter(Boolean).join(" · ") || "—"} />
            <Row label="Tax Identifiers" value={[data.client.panNumber, data.client.gstin].filter(Boolean).join(" · ") || "—"} />
            <Row label="Location" value={[data.client.district, data.client.state].filter(Boolean).join(", ") || "—"} />
            <Row label="Farms" value={`${data.farms.length} farm${data.farms.length !== 1 ? "s" : ""}${data.farms.length > 0 ? ` — ${totalArea.toFixed(2)} ac total · ${fencedFarms} fenced` : ""}`} warn={data.farms.length === 0} />
            <Row label="Plots" value={`${data.plots.length} plot${data.plots.length !== 1 ? "s" : ""}${data.plots.length > 0 ? ` · ${fencedPlots} fenced` : ""}`} />
            <Row label="Credentials" value={data.team.mode === "create" ? `Login for ${data.team.email || "—"}` : "Invite later"} />
          </tbody>
        </table>
      </div>

      {/* Farm manifest */}
      {data.farms.length > 0 && (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "18px 20px",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                Estate Manifest ({data.farms.length})
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{totalArea.toFixed(2)} Total Acres</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                {["Farm Name", "Location", "Cultivable / Total", "Demarcation", "Water Source"].map((h) => (
                  <th key={h} style={{ padding: "6px 10px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.farms.map((f, i) => (
                <tr key={f.rowId ?? i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{f.name}</td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{f.location}</td>
                  <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{Number(f.cultivableArea)} / {Number(f.totalArea)} ac</td>
                  <td style={{ padding: "10px", fontSize: 12 }}>
                    {(f.boundaryRing?.length ?? 0) >= 4 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        ✓ Fenced
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>Pin only</span>
                    )}
                  </td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{f.waterSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot manifest */}
      {data.plots.length > 0 && (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "18px 20px",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                Allocated Plots ({data.plots.length})
              </span>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                {["Plot Name", "Assigned Farm", "Cultivable Area", "Demarcation"].map((h) => (
                  <th key={h} style={{ padding: "6px 10px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.plots.map((p, i) => (
                <tr key={p.rowId ?? i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{farmNameByRow.get(p.farmRowId) ?? "Missing farm"}</td>
                  <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{Number(p.area)} ac</td>
                  <td style={{ padding: "10px", fontSize: 12 }}>
                    {(p.boundaryRing?.length ?? 0) >= 4 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        ✓ Fenced
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>Pin only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warnings & Errors */}
      {data.farms.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--amber-light, #fffbeb)", border: "1px solid var(--amber, #f59e0b)", borderRadius: 10, fontSize: 12.5, color: "#92400e" }}>
          <Icons.AlertTriangle size={15} style={{ flexShrink: 0 }} />
          Activating with zero farms — client record will have no estate attached.
        </div>
      )}
      {submitError && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--red-light, #fef2f2)", border: "1px solid var(--semantic-error, #dc2626)", borderRadius: 10, fontSize: 12.5, color: "var(--semantic-error)" }}>
          <Icons.AlertCircle size={15} style={{ flexShrink: 0 }} />
          {submitError}
        </div>
      )}
    </div>
  );
}
