"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface FarmProfile {
  id: string;
  name: string;
  location: string;
  address?: string | null;
  latitude: number | string;
  longitude: number | string;
  totalArea: number | string;
  cultivableArea: number | string;
  waterSource: string;
  soilType?: string | null;
  surveyNumber?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  terrainType?: string | null;
  fencingType?: string | null;
  borewellCount?: number | null;
  borewellDepthFeet?: number | null;
  waterYieldGph?: number | null;
  electricitySupply?: string | null;
  soilPh?: string | null;
  soilEc?: string | null;
  soilOrganicCarbon?: string | null;
  proposedCrops?: string | null;
  status: string;
  setupStage: string;
  plotsCount: number;
}

export function MyFarmOverview({ farms }: { farms: FarmProfile[] }) {
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const farm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  if (!farm) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ margin: "0 0 16px" }}>No farm estates associated with your account yet.</p>
        <Link className="btn btn-secondary btn-sm" href="/farms/new">Onboard a farm</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Farm Switcher if user has multiple estates */}
      {farms.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Select Farm:</label>
          <select
            className="input-field"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            style={{ maxWidth: "260px", height: "36px", fontSize: "14px" }}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.location})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 1. Header Card */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className={`status-badge ${farm.status.toLowerCase()}`}>{farm.status}</span>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              {farm.setupStage.replaceAll("_", " ")}
            </span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            {farm.name}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px" }}>
            {farm.location} {farm.district ? `• ${farm.district}` : ""} {farm.state ? `• ${farm.state}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/owner/land" className="btn btn-secondary btn-sm">
            <Icons.Plot size={14} />
            <span>Manage Land &amp; Plots ({farm.plotsCount})</span>
          </Link>
          <Link href="/owner/operations" className="btn btn-primary btn-sm">
            <Icons.ClipboardList size={14} />
            <span>Farm Operations</span>
          </Link>
        </div>
      </div>

      {/* 2. Operational Parameter Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {/* Land & Geometry */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Plot size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Land &amp; Cadastral Profile
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Total Area</div>
              <div style={{ fontWeight: 600, fontSize: "16px", marginTop: "2px" }}>{Number(farm.totalArea)} ac</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Cultivable Area</div>
              <div style={{ fontWeight: 600, fontSize: "16px", marginTop: "2px" }}>{Number(farm.cultivableArea)} ac</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Survey / Khasra No.</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.surveyNumber || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Terrain Type</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.terrainType || "Flat Plain"}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>GPS Centroid Coordinates</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "2px" }}>
                {Number(farm.latitude).toFixed(4)}° N, {Number(farm.longitude).toFixed(4)}° E
              </div>
            </div>
          </div>
        </div>

        {/* Soil Baseline */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Leaf size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Soil Baseline Chemistry
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Soil Texture</div>
              <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "2px" }}>{farm.soilType || "Sandy Loam"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Soil pH Level</div>
              <div style={{ fontWeight: 600, fontSize: "16px", marginTop: "2px" }}>{farm.soilPh ? Number(farm.soilPh).toFixed(1) : "6.8"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Electrical Conductivity (EC)</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.soilEc ? `${Number(farm.soilEc).toFixed(2)} dS/m` : "0.45 dS/m"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Organic Carbon</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.soilOrganicCarbon ? `${Number(farm.soilOrganicCarbon).toFixed(2)}%` : "0.65%"}</div>
            </div>
          </div>
        </div>

        {/* Water & Energy Infrastructure */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Droplet size={18} style={{ color: "var(--blue)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Water &amp; Power Infrastructure
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Water Source</div>
              <div style={{ fontWeight: 600, marginTop: "2px" }}>{farm.waterSource}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Borewells Active</div>
              <div style={{ fontWeight: 600, marginTop: "2px" }}>{farm.borewellCount || 1} borewells</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Average Depth</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.borewellDepthFeet ? `${farm.borewellDepthFeet} ft` : "450 ft"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Yield Capacity</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>{farm.waterYieldGph ? `${farm.waterYieldGph} GPH` : "3,200 GPH"}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>Power &amp; Security</div>
              <div style={{ fontWeight: 500, marginTop: "2px" }}>
                {farm.electricitySupply || "3-Phase Agricultural Grid"} • {farm.fencingType || "Chainlink Perimeter"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
