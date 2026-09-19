"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const primaryFarm = result.farms[0] ?? data.farms[0];
  const primaryFarmId = primaryFarm && "id" in primaryFarm ? (primaryFarm as { id: string }).id : null;
  const dashboardUrl = primaryFarmId ? `/hq/farms/${primaryFarmId}` : "/hq/farms";

  const totalAcres = data.farms.reduce(
    (acc, f) => acc + (Number(f.area) || Number(f.totalArea) || 0),
    0
  );

  const loginEmail = result.credential.loginEmail || data.team.email;
  const password = data.team.password;
  const portalUrl = result.credential.loginUrl || "/login";

  const copyCredentials = async () => {
    const text = `Agaate Portal Login\nPortal: ${window.location.origin}${portalUrl}\nEmail: ${loginEmail}\nPassword: ${password}\nRole: Farm Admin`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1060,
        margin: "0 auto",
        padding: "8px 0 16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1.35fr",
          gap: 20,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* ── LEFT COLUMN: STATUS & PRIMARY NAVIGATION ──────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: 16,
            borderRight: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Success badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#166534",
                }}
              >
                <Icons.Check size={18} strokeWidth={3} />
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#15803d",
                  background: "#f0fdf4",
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: "1px solid #bbf7d0",
                }}
              >
                {result.deduped ? "Already Activated" : "Estate Live & Active"}
              </span>
            </div>

            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 6px",
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {data.client.companyName || data.client.name}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Client estate and Farm Admin authentication have been successfully configured and activated.
              </p>
            </div>

            {/* Client summary pills */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 12px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #f1f5f9",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Client ID</span>
                <strong style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                  {result.client.code}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Primary Contact</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  {data.client.name} ({data.client.phone})
                </span>
              </div>
              {data.client.billingAddress && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "#64748b", flexShrink: 0 }}>Location</span>
                  <span
                    style={{
                      color: "#334155",
                      textAlign: "right",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[data.client.city, data.client.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Direct Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
            <Link
              href={dashboardUrl}
              style={{
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
                transition: "opacity 0.15s",
              }}
            >
              <span>Go to Farm Dashboard</span>
              <Icons.ArrowRight size={15} />
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Link
                href="/hq/clients"
                style={{
                  height: 34,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <span>Clients List</span>
              </Link>
              <Link
                href="/hq/onboarding/new"
                style={{
                  height: 34,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <span>+ New Client</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: CREDENTIALS & GOVERNED FARMS ────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Credentials Card */}
          <div
            style={{
              padding: 16,
              background: "#fafafa",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Shield size={16} style={{ color: "#15803d" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  Farm Admin Login Credentials
                </span>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#e2e8f0",
                  padding: "2px 8px",
                  borderRadius: 6,
                  letterSpacing: "0.02em",
                }}
              >
                ROLE: FARM ADMIN
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 10,
                background: "#ffffff",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #f1f5f9",
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                  Login Email
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginTop: 2,
                    wordBreak: "break-all",
                  }}
                >
                  {loginEmail}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                  Password
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{showPassword ? password : "••••••••••••"}</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#64748b",
                      display: "flex",
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Portal URL: <span style={{ color: "#0f172a", fontWeight: 600 }}>{portalUrl}</span>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                style={{
                  height: 28,
                  padding: "0 12px",
                  background: copied ? "#dcfce7" : "#0f172a",
                  color: copied ? "#166534" : "#ffffff",
                  border: copied ? "1px solid #bbf7d0" : "none",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {copied ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
                <span>{copied ? "Copied to Clipboard" : "Copy Credentials"}</span>
              </button>
            </div>
          </div>

          {/* Governed Farms Card */}
          <div
            style={{
              padding: 14,
              background: "#fafafa",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.MapPin size={14} style={{ color: "#15803d" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  Governed Farms ({data.farms.length})
                </span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>
                Total: {totalAcres} {data.farms[0]?.areaUnit || "Acres"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.farms.map((f, i) => (
                <div
                  key={f.rowId || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "#ffffff",
                    borderRadius: 6,
                    border: "1px solid #f1f5f9",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#15803d",
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </strong>
                    <span style={{ color: "#64748b", fontSize: 11.5 }}>
                      {[f.village, f.city, f.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#0f172a",
                      flexShrink: 0,
                      marginLeft: 10,
                    }}
                  >
                    {f.area || f.totalArea || "—"} {f.areaUnit || "Acres"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
