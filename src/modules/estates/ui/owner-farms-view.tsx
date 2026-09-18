"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { FarmCreateWizard } from "./farm-create-wizard";

export interface OwnerFarmData {
  id: string;
  name: string;
  location: string;
  surveyNumber?: string | null;
  state?: string | null;
  district?: string | null;
  totalArea: number | string;
  cultivableArea: number | string;
  waterSource: string;
  soilType?: string | null;
  status: string;
  plotCount: number;
  activeCropCount: number;
  crops: string[];
}

interface OwnerFarmsViewProps {
  farms: OwnerFarmData[];
  clientName?: string;
}

export function OwnerFarmsView({ farms, clientName }: OwnerFarmsViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Derive unique states
  const uniqueStates = useMemo(() => {
    const s = new Set<string>();
    farms.forEach((f) => {
      if (f.state) s.add(f.state);
    });
    return Array.from(s);
  }, [farms]);

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchesSearch =
        !search.trim() ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.location.toLowerCase().includes(search.toLowerCase()) ||
        (f.surveyNumber && f.surveyNumber.toLowerCase().includes(search.toLowerCase()));

      const matchesState = stateFilter === "ALL" || f.state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [farms, search, stateFilter]);

  const totalAcres = useMemo(() => {
    return farms.reduce((acc, f) => acc + Number(f.totalArea || 0), 0);
  }, [farms]);

  const totalPlots = useMemo(() => {
    return farms.reduce((acc, f) => acc + f.plotCount, 0);
  }, [farms]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header with KPI ribbon and Establish Estate button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 24px",
          backgroundColor: "var(--surface-card, #ffffff)",
          borderRadius: 14,
          border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Agricultural Estates Portfolio
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                backgroundColor: "var(--green-tint)",
                color: "var(--green-ink)",
              }}
            >
              {farms.length} Estates Active
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Commercial landholdings, plot demarcations, and agronomy infrastructure under {clientName || "your management"}.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Aggregate KPI Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "6px 14px",
              backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
              borderRadius: 8,
              border: "1px solid var(--hairline)",
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>Total Land: </span>
              <strong>{totalAcres.toFixed(1)} ac</strong>
            </div>
            <div style={{ width: 1, height: 16, backgroundColor: "var(--hairline)" }} />
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>Demarcated Plots: </span>
              <strong>{totalPlots}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38 }}
          >
            <Icons.Plus size={16} />
            <span>Establish New Estate</span>
          </button>
        </div>
      </div>

      {/* Search and Regional Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search estates by name, location, survey number…"
            style={{ paddingLeft: 36 }}
          />
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          >
            <Icons.Search size={16} />
          </div>
        </div>

        {uniqueStates.length > 0 && (
          <select
            className="input"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="ALL">All States ({uniqueStates.length})</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid of Farm Estates */}
      {filteredFarms.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: "var(--surface-card, #ffffff)",
            borderRadius: 14,
            border: "1px dashed var(--hairline)",
            color: "var(--muted)",
          }}
        >
          <Icons.Farm size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>
            No matching farm estates
          </h3>
          <p style={{ fontSize: 13, margin: 0 }}>
            Try clearing your search query or establish a new farm estate above.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {filteredFarms.map((farm) => (
            <div
              key={farm.id}
              style={{
                backgroundColor: "var(--surface-card, #ffffff)",
                borderRadius: 14,
                border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>
                      {farm.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <Icons.Navigation size={12} />
                      <span>{farm.location}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: farm.status === "ACTIVE" ? "var(--green-tint)" : "var(--amber-light)",
                      color: farm.status === "ACTIVE" ? "var(--green-ink)" : "var(--amber)",
                    }}
                  >
                    {farm.status}
                  </span>
                </div>

                {/* Acreage & Plot Metrics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    margin: "14px 0",
                    padding: "10px 12px",
                    backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
                    borderRadius: 8,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>Total Area</div>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>{farm.totalArea} ac</strong>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>Cultivable</div>
                    <strong style={{ fontSize: 14, color: "var(--emerald-strong)" }}>{farm.cultivableArea} ac</strong>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>Plots</div>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>{farm.plotCount}</strong>
                  </div>
                </div>

                {/* Soil & Water Tags */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  {farm.soilType && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-secondary)" }}>
                      <span style={{ color: "var(--muted)" }}>Soil:</span>
                      <span>{farm.soilType}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-secondary)" }}>
                    <span style={{ color: "var(--muted)" }}>Water:</span>
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {farm.waterSource}
                    </span>
                  </div>
                </div>

                {/* Active Crops Chips */}
                {farm.crops.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
                    {farm.crops.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 4,
                          backgroundColor: "var(--green-tint)",
                          color: "var(--green-ink)",
                        }}
                      >
                        🌱 {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  paddingTop: 12,
                  borderTop: "1px solid var(--hairline)",
                }}
              >
                <Link
                  href={`/owner/plots?farmId=${farm.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Icons.Plot size={14} />
                  <span>Demarcate Land</span>
                </Link>

                <Link
                  href={`/owner/crops?farmId=${farm.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Icons.TrendingUp size={14} />
                  <span>Crop Cycles</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Step Zero-Scroll Farm Creation Wizard */}
      <FarmCreateWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        clientName={clientName}
      />
    </div>
  );
}
