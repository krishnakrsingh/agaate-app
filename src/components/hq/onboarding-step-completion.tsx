"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import type { WizardData } from "./onboarding-schema";
import type { ActivationResult } from "./onboarding-step-review";

interface OnboardingStepCompletionProps {
  data: WizardData;
  result: ActivationResult;
  onReset?: () => void;
}

export function OnboardingStepCompletion({ data, result }: OnboardingStepCompletionProps) {
  const primaryFarm = result.farms[0] ?? data.farms[0];
  const primaryFarmId = primaryFarm && "id" in primaryFarm ? (primaryFarm as { id: string }).id : null;
  const dashboardUrl = primaryFarmId ? `/hq/farms/${primaryFarmId}` : "/hq/farms";

  const totalAcres = data.farms.reduce((acc, f) => acc + (Number(f.area) || Number(f.totalArea) || 0), 0);
  const totalPlots = result.plots.length || data.plots.length;
  const totalCrops = data.crops.length;

  const showCredentials =
    data.team.mode === "create" &&
    result.credential.status === "ACTIVE" &&
    !result.deduped;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680, margin: "0 auto", padding: "12px 0 32px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg, 16px)",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--green-light, #dcfce7)",
            border: "2px solid var(--green, #15803d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--green-ink, #166534)",
          }}
        >
          <Icons.CheckCircle size={32} />
        </div>

        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--green-ink, #166534)",
              background: "var(--green-light, #dcfce7)",
              padding: "3px 10px",
              borderRadius: 20,
              display: "inline-block",
              marginBottom: 8,
            }}
          >
            {result.deduped ? "Already Active" : "Onboarding Complete"}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Farm is ready
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", maxWidth: 440 }}>
            {data.client.companyName ? `${data.client.companyName} (${data.client.name})` : data.client.name} has been set up with all farms, plots, team allocations, and initial field tasks.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href={dashboardUrl}
            className="btn btn-green"
            style={{
              height: 42,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <span>Go to Farm Dashboard</span>
            <Icons.ArrowRight size={16} />
          </Link>
          <Link
            href="/hq/clients"
            className="btn btn-secondary"
            style={{
              height: 42,
              padding: "0 18px",
              fontSize: 14,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
          >
            <span>Clients Directory</span>
          </Link>
        </div>
      </div>

      {/* Summary Card */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg, 16px)",
          padding: "24px",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--hairline)", paddingBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
            Onboarding Summary
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--surface-strong)", padding: "2px 8px", borderRadius: 6 }}>
            ID: {result.client.code}
          </span>
        </div>

        {/* Client & Farm Block */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div style={{ padding: "12px 14px", background: "var(--surface-strong)", borderRadius: "var(--radius-md, 10px)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Client</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{data.client.name}</div>
            {data.client.companyName && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{data.client.companyName}</div>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {data.client.phone} {data.client.email ? `• ${data.client.email}` : ""}
            </div>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--surface-strong)", borderRadius: "var(--radius-md, 10px)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Farm & Area</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              {data.farms.map((f) => f.name).join(", ") || "Main Farm"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {totalAcres} {data.farms[0]?.areaUnit || "Acres"} total across {data.farms.length} farm{data.farms.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {data.farms[0]?.city ? `${data.farms[0].city}, ` : ""}{data.farms[0]?.state || data.farms[0]?.location || "Location saved"}
            </div>
          </div>
        </div>

        {/* Plots & Crops Block */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div style={{ padding: "12px 14px", background: "var(--surface-strong)", borderRadius: "var(--radius-md, 10px)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
              Plots ({totalPlots})
            </div>
            {data.plots.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {data.plots.slice(0, 3).map((p, idx) => (
                  <div key={p.rowId || idx} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: "var(--muted)" }}>{p.area} Acre {p.irrigationSetup ? `• ${p.irrigationSetup}` : ""}</span>
                  </div>
                ))}
                {data.plots.length > 3 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    +{data.plots.length - 3} more plots registered
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>No plots added yet</div>
            )}
          </div>

          <div style={{ padding: "12px 14px", background: "var(--surface-strong)", borderRadius: "var(--radius-md, 10px)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
              Crops ({totalCrops})
            </div>
            {data.crops.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {data.crops.slice(0, 3).map((c, idx) => (
                  <div key={c.rowId || idx} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{c.cropName}</span>
                    <span style={{ color: "var(--muted)" }}>{c.plantingMethod || "Planned"}</span>
                  </div>
                ))}
                {data.crops.length > 3 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    +{data.crops.length - 3} more crops configured
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>No crops added yet</div>
            )}
          </div>
        </div>

        {/* Assigned Team & Field Task */}
        <div style={{ padding: "14px 16px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md, 10px)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10 }}>
            Assigned Field Team & First Task
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Agronomist</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                {data.team.agronomistName || "Pending allocation"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Field Officer</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                {data.team.fieldOfficerName || "Pending allocation"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>First Field Task</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green-ink, #166534)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Icons.CheckCircle size={13} />
                <span>{data.team.firstTaskTitle || "Initial Demarcation & Soil Testing"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Show-once credentials if created */}
        {showCredentials && (
          <div style={{ padding: "14px 16px", border: "1px solid var(--amber, #b45309)", borderRadius: "var(--radius-md, 10px)", background: "var(--amber-light, #fef3c7)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber, #b45309)", marginBottom: 8 }}>
              Show-once credentials — please share with the client admin:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <div>Login Email: <strong>{result.credential.loginEmail}</strong></div>
              <div>Temporary Password: <code style={{ background: "var(--surface-card)", padding: "2px 6px", borderRadius: 4 }}>{data.team.password}</code></div>
              <div>Portal: <span>{result.credential.loginUrl}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
        <Link href="/hq/onboarding" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", color: "var(--muted)" }}>
          ← Back to Onboarding List
        </Link>
        <Link href="/hq/onboarding/new" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
          + Onboard Another Client
        </Link>
      </div>
    </div>
  );
}
