"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { CropCycleWizard, CropCycleTargetPlot } from "@modules/crops/ui/crop-cycle-wizard";

// Dynamic import of Demarcation Map for SSR safety
const FarmDemarcationMap = dynamic(
  () => import("@modules/spatial/ui/farm-demarcation-map").then((mod) => mod.FarmDemarcationMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 380,
          background: "var(--surface-canvas)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Loading satellite demarcation map...
      </div>
    ),
  }
);

export interface MilestoneItem {
  id: string;
  name: string;
  targetDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | string;
  completedAt?: string | null;
  remarks?: string | null;
}

export interface PrescriptionItem {
  id: string;
  targetIssue: string;
  instructions: string;
  priority: string;
  status: string;
  createdAt: string;
}

export interface SerializedCropCycle {
  id: string;
  cropName: string;
  startDate: string;
  expectedFirstHarvestDate?: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ABANDONED" | string;
  establishmentType: string;
  plantingMethod?: string | null;
  spacing?: string | null;
  bedPreparationEnabled: boolean;
  bedWidthCm?: number | null;
  bedCenterDistanceCm?: number | null;
  expectedBedsPerAcre?: number | null;
  mulchEnabled: boolean;
  mulchHolePattern?: string | null;
  plantDistanceCm?: number | null;
  expectedPlantsPerAcre?: number | null;
  varieties: string[];
  milestones: MilestoneItem[];
  prescriptions: PrescriptionItem[];
  plotId: string;
  plotName: string;
  plotArea: string;
  plotBoundaryGeoJson?: string | null;
  farmId: string;
  farmName: string;
  farmLatitude: string;
  farmLongitude: string;
  farmBoundaryGeoJson?: string | null;
}

export interface OwnerCropsViewProps {
  cropCycles: SerializedCropCycle[];
  availablePlots: CropCycleTargetPlot[];
  farms: { id: string; name: string }[];
}

const STAGE_STEPS = [
  "Land Preparation",
  "Transplantation / Sowing",
  "Vegetative & Irrigation",
  "Flowering & Fruit Setting",
  "First Harvest",
];

export function OwnerCropsView({ cropCycles: initialCycles, availablePlots, farms }: OwnerCropsViewProps) {
  const router = useRouter();
  const [cycles, setCycles] = useState<SerializedCropCycle[]>(initialCycles);
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPlotForNewCycle, setSelectedPlotForNewCycle] = useState<string | undefined>(undefined);

  // Demarcation map modal state
  const [demarcationModalCycle, setDemarcationModalCycle] = useState<SerializedCropCycle | null>(null);

  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      if (selectedFarmFilter !== "ALL" && c.farmId !== selectedFarmFilter) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCrop = c.cropName.toLowerCase().includes(q);
        const matchesPlot = c.plotName.toLowerCase().includes(q);
        const matchesFarm = c.farmName.toLowerCase().includes(q);
        const matchesVariety = c.varieties.some((v) => v.toLowerCase().includes(q));
        if (!matchesCrop && !matchesPlot && !matchesFarm && !matchesVariety) return false;
      }
      return true;
    });
  }, [cycles, selectedFarmFilter, statusFilter, searchQuery]);

  // Aggregate metrics
  const activeCount = cycles.filter((c) => c.status === "ACTIVE").length;
  const plannedCount = cycles.filter((c) => c.status === "PLANNED").length;
  const totalCultivatedAcres = cycles
    .filter((c) => c.status === "ACTIVE")
    .reduce((acc, c) => acc + (parseFloat(c.plotArea) || 0), 0);

  const handleCycleCreated = () => {
    setIsWizardOpen(false);
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header & Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Crop Cycles &amp; Production Management
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--primary-subtle, rgba(22, 101, 52, 0.1))",
                color: "var(--primary)",
              }}
            >
              {activeCount} Active Commercial Cycles
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0 0" }}>
            Monitor crop development stages, agronomy schedules, and milestone delivery across all plots.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedPlotForNewCycle(undefined);
              setIsWizardOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icons.Plus size={16} />
            <span>Launch New Crop Cycle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
            Active Production
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {activeCount}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", marginLeft: 6 }}>cycles</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Currently in-field</div>
        </div>

        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
            Cultivated Acreage
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {totalCultivatedAcres.toFixed(1)}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", marginLeft: 6 }}>acres</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Under active canopy</div>
        </div>

        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
            Planned Next Season
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {plannedCount}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", marginLeft: 6 }}>cycles</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Bed prep scheduled</div>
        </div>

        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
            Active Estates
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {farms.length}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", marginLeft: 6 }}>farms</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Multi-estate portfolio</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 200 }}>
          <Icons.Search size={16} style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Search crop, variety, plot or estate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              width: "100%",
              color: "var(--ink)",
            }}
          />
        </div>

        <div style={{ height: 20, width: 1, background: "var(--hairline)" }} />

        {/* Farm Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Estate:</span>
          <select
            value={selectedFarmFilter}
            onChange={(e) => setSelectedFarmFilter(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: "4px 8px", height: 32 }}
          >
            <option value="ALL">All Estates ({farms.length})</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: "4px 8px", height: 32 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNED">Planned</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Crop Cycles List */}
      {filteredCycles.length === 0 ? (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--green-tint)",
              color: "var(--green-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icons.Layers size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px 0" }}>
            No Crop Cycles Found
          </h3>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 440, margin: "0 auto 20px" }}>
            {cycles.length === 0
              ? "Start your first crop production cycle to track land preparation, planting, irrigation schedules, and harvest milestones."
              : "No crop cycles match your selected filters. Adjust your search or estate filter."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsWizardOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Icons.Plus size={16} />
            <span>Launch New Crop Cycle</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredCycles.map((cycle) => {
            const hasDemarcation = !!cycle.plotBoundaryGeoJson;
            const startDateFormatted = new Date(cycle.startDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const harvestDateFormatted = cycle.expectedFirstHarvestDate
              ? new Date(cycle.expectedFirstHarvestDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "TBD";

            return (
              <div
                key={cycle.id}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-xl)",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                        {cycle.cropName}
                      </span>
                      {cycle.varieties.map((v) => (
                        <span
                          key={v}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "var(--green-tint)",
                            color: "var(--green-ink)",
                          }}
                        >
                          {v}
                        </span>
                      ))}

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            cycle.status === "ACTIVE"
                              ? "var(--green-tint)"
                              : cycle.status === "PLANNED"
                                ? "var(--blue-light)"
                                : "var(--surface-strong)",
                          color:
                            cycle.status === "ACTIVE"
                              ? "var(--green-ink)"
                              : cycle.status === "PLANNED"
                                ? "var(--blue)"
                                : "var(--muted)",
                        }}
                      >
                        {cycle.status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 6,
                        fontSize: 13,
                        color: "var(--muted)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        🏡 {cycle.farmName}
                      </span>
                      <span>•</span>
                      <span>
                        📍 Plot: <strong>{cycle.plotName}</strong> ({cycle.plotArea} ac)
                      </span>
                      <span>•</span>
                      <span>
                        Sown / TP: <strong>{startDateFormatted}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Target Harvest: <strong>{harvestDateFormatted}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Demarcation View Trigger */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {hasDemarcation && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDemarcationModalCycle(cycle)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--green-ink)",
                          borderColor: "var(--hairline)",
                        }}
                      >
                        <Icons.MapPin size={14} />
                        <span>View Demarcation Map</span>
                      </button>
                    )}

                    <Link
                      href={`/owner/chat?farmId=${cycle.farmId}&plotId=${cycle.plotId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
                    >
                      <Icons.MessageSquare size={14} />
                      <span>Consult Agronomist</span>
                    </Link>

                    <Link
                      href={`/plots/${cycle.plotId}/crop-cycles/${cycle.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12 }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>

                {/* Agronomy Configuration Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                    background: "var(--surface-canvas)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--hairline)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ color: "var(--muted)", marginBottom: 2 }}>Establishment</div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {cycle.establishmentType === "NURSERY_TRANSPLANTATION"
                        ? "Nursery Transplantation"
                        : "Direct Sowing"}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "var(--muted)", marginBottom: 2 }}>Bed Setup</div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {cycle.bedPreparationEnabled
                        ? `${cycle.expectedBedsPerAcre || 40} beds/ac (${cycle.bedWidthCm || 90}cm)`
                        : "Flat Ground"}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "var(--muted)", marginBottom: 2 }}>Mulching Pattern</div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {cycle.mulchEnabled
                        ? cycle.mulchHolePattern === "DOUBLE_LINE_ZIGZAG"
                          ? "Double Line Zigzag"
                          : "Single Line"
                        : "Unmulched"}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "var(--muted)", marginBottom: 2 }}>Plant Density</div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {cycle.expectedPlantsPerAcre
                        ? `${cycle.expectedPlantsPerAcre.toLocaleString()} plants/ac`
                        : "Standard density"}
                    </div>
                  </div>
                </div>

                {/* Milestone Stages Visual Progress */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" }}>
                      Production Stage Progression
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {cycle.milestones.length} milestone checks recorded
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {(cycle.milestones.length > 0
                      ? cycle.milestones
                      : STAGE_STEPS.map((name, i) => ({
                          id: `default-${i}`,
                          name,
                          targetDate: cycle.startDate,
                          status: i === 0 ? "COMPLETED" : i === 1 ? "IN_PROGRESS" : "PENDING",
                        }))
                    ).map((m, idx) => {
                      const isCompleted = m.status === "COMPLETED";
                      const isInProgress = m.status === "IN_PROGRESS";
                      return (
                        <div
                          key={m.id || idx}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "var(--radius-md)",
                            background: isCompleted
                              ? "var(--green-tint)"
                              : isInProgress
                                ? "var(--blue-light)"
                                : "var(--surface-canvas)",
                            border: `1px solid ${
                              isCompleted
                                ? "var(--hairline)"
                                : isInProgress
                                  ? "var(--hairline)"
                                  : "var(--hairline)"
                            }`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: isCompleted ? "var(--green-ink)" : isInProgress ? "var(--blue)" : "var(--hairline)",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: isCompleted ? "var(--green-ink)" : isInProgress ? "var(--blue)" : "var(--muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={m.name}
                            >
                              {m.name}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginLeft: 14 }}>
                            {m.targetDate ? new Date(m.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Scheduled"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Agronomy Prescriptions if any */}
                {cycle.prescriptions && cycle.prescriptions.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--hairline)",
                      paddingTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                      Active Prescriptions:
                    </span>
                    {cycle.prescriptions.map((p) => (
                      <span
                        key={p.id}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(245, 158, 11, 0.1)",
                          color: "#b45309",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        💊 {p.targetIssue} ({p.priority})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Demarcation Satellite Map Modal */}
      {demarcationModalCycle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setDemarcationModalCycle(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 860,
              background: "var(--surface-card)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-canvas)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.MapPin size={16} style={{ color: "#047857" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    Demarcation View: {demarcationModalCycle.plotName}
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {demarcationModalCycle.farmName} • {demarcationModalCycle.cropName} ({demarcationModalCycle.plotArea} acres)
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDemarcationModalCycle(null)}
                style={{ padding: 4 }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Map Area */}
            <div style={{ height: 440, position: "relative" }}>
              <FarmDemarcationMap
                farm={{
                  id: demarcationModalCycle.farmId,
                  name: demarcationModalCycle.farmName,
                  latitude: demarcationModalCycle.farmLatitude,
                  longitude: demarcationModalCycle.farmLongitude,
                  boundaryGeoJson: demarcationModalCycle.farmBoundaryGeoJson,
                }}
                plots={[
                  {
                    id: demarcationModalCycle.plotId,
                    name: demarcationModalCycle.plotName,
                    area: demarcationModalCycle.plotArea,
                    boundaryGeoJson: demarcationModalCycle.plotBoundaryGeoJson,
                    cropName: demarcationModalCycle.cropName,
                    variety: demarcationModalCycle.varieties[0],
                  },
                ]}
                selectedPlotId={demarcationModalCycle.plotId}
                height="440px"
              />
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--hairline)",
                background: "var(--surface-canvas)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Demarcated perimeter boundary verified for agronomy application and drone telemetry.
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDemarcationModalCycle(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Scroll Multi-Step Crop Cycle Creation Wizard */}
      <CropCycleWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleCycleCreated}
        plots={availablePlots}
        initialPlotId={selectedPlotForNewCycle}
      />
    </div>
  );
}
