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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Summary table */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>Summary</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <Row label="Preview ID" value={<code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>{previewClientCode(data.idempotencyKey)}</code>} />
            <Row label="Client" value={<>{data.client.name || "—"}{data.client.companyName ? <span style={{ color: "var(--muted)", marginLeft: 8 }}>({data.client.companyName})</span> : ""}</>} warn={!data.client.name} />
            <Row label="Contact" value={[data.client.phone, data.client.email].filter(Boolean).join(" · ") || "—"} />
            <Row label="Tax" value={[data.client.panNumber, data.client.gstin].filter(Boolean).join(" · ") || "—"} />
            <Row label="Location" value={[data.client.district, data.client.state].filter(Boolean).join(", ") || "—"} />
            <Row label="Farms" value={`${data.farms.length} farm${data.farms.length !== 1 ? "s" : ""}${data.farms.length > 0 ? ` — ${totalArea.toFixed(2)} ac total · ${fencedFarms} fenced` : ""}`} warn={data.farms.length === 0} />
            <Row label="Plots" value={`${data.plots.length} plot${data.plots.length !== 1 ? "s" : ""}${data.plots.length > 0 ? ` · ${fencedPlots} fenced` : ""}`} />
            <Row label="Credentials" value={data.team.mode === "create" ? `Login for ${data.team.email || "—"}` : "Invite later"} />
          </tbody>
        </table>
      </div>

      {/* Farm manifest */}
      {data.farms.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 10 }}>Farms ({data.farms.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                {["Name", "Location", "Area", "Fence", "Water source"].map((h) => (
                  <th key={h} style={{ padding: "4px 8px 8px 0", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.farms.map((f, i) => (
                <tr key={f.rowId ?? i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "7px 8px 7px 0", fontWeight: 600 }}>{f.name}</td>
                  <td style={{ padding: "7px 8px 7px 0", color: "var(--muted)" }}>{f.location}</td>
                  <td style={{ padding: "7px 8px 7px 0", fontFamily: "var(--font-mono)" }}>{Number(f.cultivableArea)}/{Number(f.totalArea)} ac</td>
                  <td style={{ padding: "7px 8px 7px 0", fontSize: 12, color: (f.boundaryRing?.length ?? 0) >= 4 ? "var(--green)" : "var(--muted-soft)" }}>{(f.boundaryRing?.length ?? 0) >= 4 ? "Fenced" : "Pin only"}</td>
                  <td style={{ padding: "7px 0", color: "var(--muted-soft)" }}>{f.waterSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot manifest */}
      {data.plots.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 10 }}>Plots ({data.plots.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                {["Name", "Farm", "Area", "Fence"].map((h) => (
                  <th key={h} style={{ padding: "4px 8px 8px 0", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.plots.map((p, i) => (
                <tr key={p.rowId ?? i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "7px 8px 7px 0", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "7px 8px 7px 0", color: "var(--muted)" }}>{farmNameByRow.get(p.farmRowId) ?? "Missing farm"}</td>
                  <td style={{ padding: "7px 8px 7px 0", fontFamily: "var(--font-mono)" }}>{Number(p.area)} ac</td>
                  <td style={{ padding: "7px 0", fontSize: 12, color: (p.boundaryRing?.length ?? 0) >= 4 ? "var(--green)" : "var(--muted-soft)" }}>{(p.boundaryRing?.length ?? 0) >= 4 ? "Fenced" : "Pin only"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warnings */}
      {data.farms.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--amber)" }}>
          <Icons.AlertTriangle size={14} style={{ flexShrink: 0 }} />
          Activating with zero farms — client record will have no estate attached.
        </div>
      )}
      {submitError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--semantic-error)" }}>
          <Icons.AlertCircle size={14} style={{ flexShrink: 0 }} />{submitError}
        </div>
      )}
    </div>
  );
}
