"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { parseBoundary } from "@modules/spatial/ui/geo";

const GeoMap = dynamic(() => import("@modules/spatial/ui/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        width: "100%",
        minHeight: 96,
        display: "grid",
        placeItems: "center",
        background: "#0f172a",
        color: "#94a3b8",
        fontSize: 10,
      }}
    >
      Loading map…
    </div>
  ),
});

interface FarmItem {
  id: string;
  name: string;
  status: string;
  setupStage: string;
  totalArea: number;
  cultivableArea: number;
  location?: string | null;
  village?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  soilType?: string | null;
  waterSource?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plotCount: number;
  hasBoundary: boolean;
  boundaryGeoJson?: string | null;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  farms: Array<{ id: string; name: string; canManage: boolean }>;
}

interface Bundle {
  client: {
    id: string;
    code: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    whatsappNo?: string | null;
    secondaryContact: string | null;
    entityType: string | null;
    panNumber: string | null;
    gstin: string | null;
    billingAddress: string | null;
    address: string | null;
    village?: string | null;
    city?: string | null;
    state: string | null;
    district: string | null;
    pincode?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  metrics: { farmCount: number; plotCount: number; officerCount: number; totalAcreage: number };
  farms: { items: FarmItem[]; total: number; limit: number; offset: number };
  team: TeamMember[];
}

function formatPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const in91 = digits.match(/^\+91(\d{10})$/);
  if (in91) return `+91 ${in91[1].slice(0, 5)} ${in91[1].slice(5)}`;
  const local = digits.match(/^(\d{10})$/);
  if (local) return `${local[1].slice(0, 5)} ${local[1].slice(5)}`;
  return raw;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label || text}`}
      style={{
        background: "none",
        border: "none",
        padding: "2px 4px",
        cursor: "pointer",
        color: copied ? "#15803d" : "#64748b",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        borderRadius: 4,
      }}
    >
      {copied ? <Icons.Check size={11} strokeWidth={2.5} /> : <Icons.Copy size={11} />}
      {copied && <span style={{ fontSize: 10, fontWeight: 600 }}>Copied</span>}
    </button>
  );
}

export function Client360({
  clientId,
  canOnboard = false,
  canEditClient: propCanEditClient,
  canCreateFarm: propCanCreateFarm,
  canEditFarm = false,
}: {
  clientId: string;
  canOnboard?: boolean;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
  canEditFarm?: boolean;
}) {
  const canEditClient = propCanEditClient ?? canOnboard;
  const canCreateFarm = propCanCreateFarm ?? canOnboard;
  const editClientHref = `/hq/clients/${clientId}/edit`;
  const addFarmHref = `/hq/clients/${clientId}/farms/new`;

  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmPage, setFarmPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      farmOffset: String((farmPage - 1) * 10),
    });
    fetch(`/api/hq/clients/${clientId}?${params.toString()}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("This client no longer exists.");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load client.");
        }
        return res.json();
      })
      .then((d: Bundle) => setData(d))
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load client.");
      })
      .finally(() => setLoading(false));
  }, [clientId, farmPage]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading && !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
        <Skeleton style={{ height: 100, borderRadius: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: 12 }}>
          <Skeleton style={{ height: 380, borderRadius: 10 }} />
          <Skeleton style={{ height: 380, borderRadius: 10 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          padding: 28,
          textAlign: "center",
          maxWidth: 480,
          margin: "32px auto",
        }}
      >
        <Icons.AlertCircle size={28} style={{ color: "var(--red, #b91c1c)", margin: "0 auto 10px" }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "#0f172a" }}>Unable to load client</h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px" }}>{error || "An unexpected error occurred."}</p>
        <button type="button" onClick={load} className="btn btn-secondary btn-sm" style={{ border: "1px solid #cbd5e1" }}>
          <Icons.Refresh size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { client, metrics, farms, team } = data;
  const farmAdmin = team.find((u) => u.role === "FARM_ADMIN");
  const farmPages = Math.ceil(farms.total / farms.limit);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* ── 1. UNIFIED CLIENT HEADER BAR ───────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          padding: "14px 18px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Top: Identity & Primary Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Avatar + Name + Core Tags */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 9,
                background: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initials(client.name)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {client.name}
                </h1>

                {client.companyName && (
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                    · {client.companyName}
                  </span>
                )}

                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    letterSpacing: "0.02em",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {client.code}
                </span>

                <StatusBadge status={client.status} />

                {client.entityType && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: "#475569",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      textTransform: "capitalize",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {client.entityType.toLowerCase()}
                  </span>
                )}
              </div>

              {/* Sub-line quick info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 11.5,
                  color: "#334155",
                  fontWeight: 500,
                  flexWrap: "wrap",
                }}
              >
                {client.phone && <span>{formatPhone(client.phone)}</span>}
                {client.email && <span>· {client.email}</span>}
                {(client.city || client.state) && (
                  <span>· {[client.city, client.state].filter(Boolean).join(", ")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canEditClient && (
              <Link
                href={editClientHref}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
              >
                <Icons.Edit size={12} />
                <span>Edit Client</span>
              </Link>
            )}

            {canCreateFarm && (
              <Link
                href={addFarmHref}
                style={{
                  height: 30,
                  padding: "0 14px",
                  borderRadius: 6,
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "1px solid #0f172a",
                  fontSize: 12,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  textDecoration: "none",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                }}
              >
                <Icons.Plus size={13} strokeWidth={2.5} />
                <span>Add Farm Estate</span>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom: Inline Stats Ribbon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingTop: 8,
            borderTop: "1px solid #f1f5f9",
            fontSize: 11.5,
            color: "#334155",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#475569" }}>Farms & Estates:</span>
            <strong style={{ color: "#0f172a", fontWeight: 600 }}>{metrics.farmCount}</strong>
          </div>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#475569" }}>Total Land Area:</span>
            <strong style={{ color: "#0f172a", fontWeight: 600 }}>{metrics.totalAcreage.toFixed(2)} ac</strong>
          </div>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#475569" }}>Demarcated Plots:</span>
            <strong style={{ color: "#0f172a", fontWeight: 600 }}>{metrics.plotCount}</strong>
          </div>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#475569" }}>Client Portal:</span>
            <span style={{ color: farmAdmin ? "#166534" : "#475569", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: farmAdmin ? "#15803d" : "#94a3b8",
                }}
              />
              <span>{farmAdmin ? "Credentials Active" : "No Account Assigned"}</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN 2-COLUMN LAYOUT (ZERO WINDOW SCROLL) ─────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 12,
          alignItems: "start",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ── LEFT COLUMN: CLIENT INFORMATION CARD ───────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: "100%",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* Section 1: Contacts */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Contact Details
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>Mobile</span>
                <span style={{ color: "#0f172a", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  {client.phone ? (
                    <>
                      <span>{client.phone}</span>
                      <CopyButton text={client.phone} />
                    </>
                  ) : (
                    <span style={{ color: "#64748b" }}>—</span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>WhatsApp</span>
                <span style={{ color: "#0f172a", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  {client.whatsappNo ? (
                    <>
                      <span>{client.whatsappNo}</span>
                      <CopyButton text={client.whatsappNo} />
                    </>
                  ) : client.phone ? (
                    <span style={{ color: "#166534", fontSize: 11, fontWeight: 500 }}>Same as mobile</span>
                  ) : (
                    <span style={{ color: "#64748b" }}>—</span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>Email</span>
                <span
                  style={{
                    color: "#0f172a",
                    fontWeight: 500,
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title={client.email || undefined}
                >
                  {client.email ? (
                    <>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{client.email}</span>
                      <CopyButton text={client.email} />
                    </>
                  ) : (
                    <span style={{ color: "#64748b" }}>—</span>
                  )}
                </span>
              </div>

              {client.secondaryContact && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>Secondary</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>{client.secondaryContact}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: "#f1f5f9" }} />

          {/* Section 2: Financial & Tax */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Tax & Registration
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>PAN Number</span>
                <span style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  {client.panNumber ? (
                    <>
                      <span>{client.panNumber}</span>
                      <CopyButton text={client.panNumber} />
                    </>
                  ) : (
                    <span style={{ color: "#64748b", fontFamily: "inherit" }}>Not provided</span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>GSTIN</span>
                <span style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  {client.gstin ? (
                    <>
                      <span>{client.gstin}</span>
                      <CopyButton text={client.gstin} />
                    </>
                  ) : (
                    <span style={{ color: "#64748b", fontFamily: "inherit" }}>Not provided</span>
                  )}
                </span>
              </div>

              {client.companyName && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>Company</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>{client.companyName}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: "#f1f5f9" }} />

          {/* Section 3: Registered Address & Billing */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Address & Billing
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5 }}>
              {client.billingAddress && (
                <div>
                  <span style={{ color: "#334155", fontSize: 10.5, fontWeight: 500 }}>Billing Location</span>
                  <div style={{ color: "#0f172a", fontWeight: 500, marginTop: 1, lineHeight: 1.35 }}>
                    {client.billingAddress}
                  </div>
                </div>
              )}

              {(client.village || client.city) && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>Village / City</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>
                    {[client.village, client.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {(client.state || client.pincode) && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>State & PIN</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>
                    {[client.state, client.pincode].filter(Boolean).join(" - ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Farm Admin Account */}
          {farmAdmin && (
            <>
              <div style={{ height: 1, background: "#f1f5f9" }} />
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Farm Admin Account</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: farmAdmin.active ? "#166534" : "#92400e",
                      background: farmAdmin.active ? "#f0fdf4" : "#fefce8",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {farmAdmin.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "#334155" }}>
                  <div style={{ fontWeight: 500, color: "#0f172a" }}>{farmAdmin.name}</div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 1 }}>{farmAdmin.email}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN: ESTATES LIST (ONLY THIS SCROLLS) ─────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Static Section Header (No Scroll) */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "2px 2px 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                Farms & Estates
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "1px 7px",
                  borderRadius: 9999,
                  minWidth: 18,
                  textAlign: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {farms.total}
              </span>
              <span style={{ fontSize: 11.5, color: "#64748b" }}>
                ({metrics.totalAcreage.toFixed(2)} ac total)
              </span>
            </div>
          </div>

          {/* ── SCROLLABLE ESTATES BAR LIST (ONLY THIS SCROLLS) ────────── */}
          {farms.items.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                padding: 32,
                textAlign: "center",
              }}
            >
              <Icons.Farm size={24} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 3 }}>
                No farms registered yet
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>
                Add a farm estate to track boundaries, soil, and plot demarcation.
              </p>
              {canCreateFarm && (
                <Link
                  href={addFarmHref}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "1px solid #0f172a",
                    borderRadius: 5,
                    fontSize: 11.5,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    textDecoration: "none",
                  }}
                >
                  <Icons.Plus size={12} />
                  <span>Add First Farm Estate</span>
                </Link>
              )}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingRight: 6,
              }}
            >
              {farms.items.map((f) => {
                const locationLabel = [f.village, f.city, f.state].filter(Boolean).join(", ") || f.location;
                const hasCoords = f.latitude && f.longitude;
                const lat = Number(f.latitude) || 12.9716;
                const lng = Number(f.longitude) || 77.5946;
                const center: [number, number] = [lat, lng];
                const ring = parseBoundary(f.boundaryGeoJson ?? null);
                const hasBoundary = !!f.boundaryGeoJson || f.hasBoundary;

                return (
                  <article
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      justifyContent: "space-between",
                      gap: 14,
                      padding: "4px 14px 4px 4px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      flexShrink: 0,
                    }}
                  >
                    {/* Left: Satellite Map Demarcation Thumbnail with uniform 4px padding across 3 sides */}
                    <div
                      style={{
                        width: 96,
                        minWidth: 96,
                        maxWidth: 96,
                        alignSelf: "stretch",
                        minHeight: 96,
                        borderRadius: 4,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid #cbd5e1",
                        background: "#0f172a",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ position: "absolute", inset: 0 }}>
                        <GeoMap
                          center={center}
                          polygon={ring}
                          compact
                          height="100%"
                          interactive={false}
                        />
                      </div>

                      {/* Demarcation status overlay badge */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 4,
                          left: 4,
                          right: 4,
                          zIndex: 400,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          pointerEvents: "none",
                        }}
                      >
                        {hasBoundary ? (
                          <span
                            style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              color: "#166534",
                              background: "rgba(240, 253, 244, 0.94)",
                              padding: "1.5px 5px",
                              borderRadius: 4,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                              backdropFilter: "blur(4px)",
                              letterSpacing: "0.03em",
                            }}
                          >
                            ✓ DEMARCATED
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              color: "#92400e",
                              background: "rgba(254, 252, 232, 0.94)",
                              padding: "1.5px 5px",
                              borderRadius: 4,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                              backdropFilter: "blur(4px)",
                              letterSpacing: "0.03em",
                            }}
                          >
                            ⚠️ UNMAPPED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Farm details (Clean structured 3-line layout) */}
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minWidth: 0, flex: 1, padding: "4px 0" }}>
                      {/* Line 1: Name + Status + Setup Stage Pill */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          href={`/hq/farms/${f.id}`}
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0f172a",
                            textDecoration: "none",
                          }}
                        >
                          {f.name}
                        </Link>

                        <StatusBadge status={f.status} />

                        {f.setupStage && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: "#475569",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              padding: "1.5px 8px",
                              borderRadius: 9999,
                              textTransform: "capitalize",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            {f.setupStage.replaceAll("_", " ").toLowerCase()}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Area (Black Pill), Plots, Location & Coords */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "#334155",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "#ffffff",
                            background: "#0f172a",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            fontFamily: "var(--font-mono, monospace)",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {f.totalArea.toFixed(2)} ac
                        </span>
                        <span style={{ color: "#475569", fontWeight: 500 }}>
                          {f.plotCount} demarcated {f.plotCount === 1 ? "plot" : "plots"}
                        </span>
                        {locationLabel && (
                          <>
                            <span style={{ color: "#cbd5e1" }}>·</span>
                            <span style={{ color: "#475569" }}>{locationLabel}</span>
                          </>
                        )}
                        {hasCoords && (
                          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10.5, color: "#64748b" }}>
                            ({f.latitude?.toFixed(4)}°, {f.longitude?.toFixed(4)}°)
                          </span>
                        )}
                      </div>

                      {/* Line 3: Soil, Water */}
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {f.waterSource && <span>Water: {f.waterSource}</span>}
                        {f.waterSource && f.soilType && <span style={{ color: "#cbd5e1" }}>·</span>}
                        {f.soilType && <span>Soil: {f.soilType}</span>}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, alignSelf: "center" }}>
                      {canEditFarm && (
                        <Link
                          href={`/hq/farms/${f.id}/edit`}
                          style={{
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 5,
                            background: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            fontSize: 11.5,
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            textDecoration: "none",
                          }}
                          title="Edit farm properties"
                        >
                          <Icons.Edit size={11} />
                          <span>Edit</span>
                        </Link>
                      )}

                      <Link
                        href={`/hq/farms/${f.id}`}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 5,
                          background: "#0f172a",
                          color: "#ffffff",
                          border: "1px solid #0f172a",
                          fontSize: 11.5,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          textDecoration: "none",
                        }}
                      >
                        <span>View Farm</span>
                        <Icons.ArrowRight size={11} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {/* Pagination */}
              {farms.total > farms.limit && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 2px",
                    fontSize: 11,
                    color: "#334155",
                    flexShrink: 0,
                  }}
                >
                  <span>
                    Showing {(farmPage - 1) * farms.limit + 1}–
                    {Math.min(farmPage * farms.limit, farms.total)} of {farms.total} farms
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled={farmPage <= 1}
                      onClick={() => setFarmPage((p) => p - 1)}
                      style={{
                        height: 24,
                        padding: "0 8px",
                        borderRadius: 4,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        fontSize: 11,
                        cursor: farmPage <= 1 ? "not-allowed" : "pointer",
                        opacity: farmPage <= 1 ? 0.5 : 1,
                      }}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={farmPage >= farmPages}
                      onClick={() => setFarmPage((p) => p + 1)}
                      style={{
                        height: 24,
                        padding: "0 8px",
                        borderRadius: 4,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        fontSize: 11,
                        cursor: farmPage >= farmPages ? "not-allowed" : "pointer",
                        opacity: farmPage >= farmPages ? 0.5 : 1,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
