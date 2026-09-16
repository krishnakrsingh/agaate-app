"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { newRowId, type FarmInput, type PlotInput } from "./onboarding-schema";
import { ringAcres } from "@/lib/geo";
import { ringWithinRing } from "@/lib/geo-core";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

export function OnboardingStepPlots({
  plots,
  farms,
  onChange,
  errors,
}: {
  plots: PlotInput[];
  farms: FarmInput[];
  onChange: (v: PlotInput[]) => void;
  errors: Record<string, string>;
}) {
  const [farmRowId, setFarmRowId] = useState(farms[0]?.rowId ?? "");
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(plots.length === 0);

  // Form inputs
  const [name, setName] = useState(`Plot 0${plots.length + 1}`);
  const [area, setArea] = useState("2.5");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [irrigationSetup, setIrrigationSetup] = useState("Drip Irrigation");
  const [valves, setValves] = useState("2 Valves");
  const [bedDetails, setBedDetails] = useState("1.2m Raised Beds (40cm furrow)");
  const [landPrepStatus, setLandPrepStatus] = useState("Beds Formed & Ready");
  const [fence, setFence] = useState<[number, number][] | null>(null);
  const [showFence, setShowFence] = useState(false);
  const [validationErr, setValidationErr] = useState("");

  const farmId = farmRowId || farms[0]?.rowId || "";
  const activeFarm = farms.find((f) => f.rowId === farmId);
  const farmRing = useMemo(() => (activeFarm?.boundaryRing ?? null) as [number, number][] | null, [activeFarm?.boundaryRing]);

  const fenceOutside = fence && fence.length >= 4 && farmRing && farmRing.length >= 4
    ? (() => { try { return !ringWithinRing(fence, farmRing); } catch { return true; } })()
    : false;

  const flat = Number(activeFarm?.latitude), flng = Number(activeFarm?.longitude);
  const farmCenter: [number, number] = Number.isFinite(flat) && Number.isFinite(flng) ? [flat, flng] : [13.0827, 77.5877];

  const resetForm = () => {
    setName(`Plot 0${plots.length + 1}`);
    setArea("2.5");
    setSoilType("Red Sandy Loam");
    setIrrigationSetup("Drip Irrigation");
    setValves("2 Valves");
    setBedDetails("1.2m Raised Beds (40cm furrow)");
    setLandPrepStatus("Beds Formed & Ready");
    setFence(null);
    setShowFence(false);
    setValidationErr("");
    setEditingPlotId(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setValidationErr("Plot Name/Number is required.");
      return;
    }
    const numArea = Number(area);
    if (!numArea || numArea <= 0) {
      setValidationErr("Please enter a valid plot area.");
      return;
    }
    if (!soilType.trim()) {
      setValidationErr("Soil Type is required.");
      return;
    }
    if (!irrigationSetup.trim()) {
      setValidationErr("Irrigation Setup is required.");
      return;
    }
    if (!valves.trim()) {
      setValidationErr("Valves & Control information is required.");
      return;
    }
    if (!bedDetails.trim()) {
      setValidationErr("Bed Details are required.");
      return;
    }
    if (!landPrepStatus.trim()) {
      setValidationErr("Land Preparation Status is required.");
      return;
    }
    if (fence && (fence.length < 4 || fenceOutside)) {
      setValidationErr("Plot fence lies outside the farm fence — redraw or clear.");
      return;
    }

    if (editingPlotId) {
      onChange(
        plots.map((p) =>
          p.rowId === editingPlotId
            ? {
                ...p,
                farmRowId: farmId,
                name: name.trim(),
                area: numArea,
                soilType: soilType.trim(),
                irrigationSetup: irrigationSetup.trim(),
                valves: valves.trim(),
                bedDetails: bedDetails.trim(),
                landPrepStatus: landPrepStatus.trim(),
                boundaryRing: fence,
              }
            : p
        )
      );
      resetForm();
      setIsAdding(false);
    } else {
      const newP: PlotInput = {
        rowId: newRowId(),
        farmRowId: farmId,
        name: name.trim(),
        area: numArea,
        soilType: soilType.trim(),
        irrigationSetup: irrigationSetup.trim(),
        valves: valves.trim(),
        bedDetails: bedDetails.trim(),
        landPrepStatus: landPrepStatus.trim(),
        boundaryRing: fence,
      };
      onChange([...plots, newP]);
      resetForm();
      setIsAdding(false);
    }
  };

  const startEdit = (p: PlotInput) => {
    setEditingPlotId(p.rowId ?? null);
    setFarmRowId(p.farmRowId);
    setName(p.name);
    setArea(String(p.area));
    setSoilType(p.soilType ?? "");
    setIrrigationSetup(p.irrigationSetup ?? "Drip Irrigation");
    setValves(p.valves ?? "");
    setBedDetails(p.bedDetails ?? "");
    setLandPrepStatus(p.landPrepStatus ?? "Beds Formed & Ready");
    setFence((p.boundaryRing ?? null) as [number, number][] | null);
    setShowFence(!!p.boundaryRing);
    setIsAdding(true);
  };

  const removePlot = (rowId?: string) => {
    if (!rowId) return;
    onChange(plots.filter((p) => p.rowId !== rowId));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header with quick stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Plot Demarcation & Zoning
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
            {plots.length} Plot{plots.length === 1 ? "" : "s"} Defined ·{" "}
            {plots.reduce((sum, p) => sum + Number(p.area || 0), 0).toFixed(2)} Acres Total
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            style={{ height: 32, padding: "0 14px", gap: 4 }}
          >
            <Icons.Plus size={14} />
            <span>Add Plot</span>
          </button>
        )}
      </div>

      {/* Plot Cards List */}
      {plots.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {plots.map((p, i) => {
            const fHolder = farms.find((f) => f.rowId === p.farmRowId);
            return (
              <div
                key={p.rowId ?? i}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-md)",
                  padding: "18px 20px",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {fHolder?.name || "Farm"} · <span style={{ fontWeight: 700, color: "var(--ink)" }}>{p.area} Acre</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: "var(--surface-strong)",
                        border: "1px solid var(--hairline)",
                        padding: "3px 8px",
                        borderRadius: 20,
                        color: "var(--ink)",
                      }}
                    >
                      {p.landPrepStatus || "Planned"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 11.5, color: "var(--muted)" }}>
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Soil</span>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{p.soilType || "Not specified"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Irrigation</span>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{p.irrigationSetup || "Drip"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Valves</span>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{p.valves || "Standard"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Bed Details</span>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{p.bedDetails || "Standard beds"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => startEdit(p)}
                    style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePlot(p.rowId)}
                    style={{ height: 28, padding: "0 8px", fontSize: 11, color: "var(--semantic-error)" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Plot Form Card */}
      {isAdding && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "22px 24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink)" }}>
                {editingPlotId ? `Edit ${name}` : "Add Plot Details"}
              </span>
            </div>
            {plots.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                }}
                style={{ fontSize: 11 }}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="ob-grid-3">
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Farm
              </label>
              <select
                className="input-field"
                value={farmId}
                onChange={(e) => setFarmRowId(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                {farms.map((f, i) => (
                  <option key={f.rowId ?? i} value={f.rowId}>
                    {f.name.trim() || `Farm ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Plot Name / Number <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <input
                className="input-field"
                value={name}
                maxLength={100}
                placeholder="e.g., Plot 01"
                onChange={(e) => setName(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Plot Area (Acres) <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                value={area}
                placeholder="e.g., 2.5"
                onChange={(e) => setArea(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Soil Type <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <input
                className="input-field"
                value={soilType}
                maxLength={100}
                placeholder="e.g., Loamy Soil / Red Clay"
                onChange={(e) => setSoilType(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Irrigation Setup <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <select
                className="input-field"
                value={irrigationSetup}
                onChange={(e) => setIrrigationSetup(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                <option value="">-- Select Irrigation --</option>
                <option value="Drip Irrigation">Drip Irrigation</option>
                <option value="Micro Sprinkler">Micro Sprinkler</option>
                <option value="Overhead Sprinkler">Overhead Sprinkler</option>
                <option value="Flood / Furrow">Flood / Furrow</option>
                <option value="Rain-Gun">Rain-Gun</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Valves & Control <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <input
                className="input-field"
                value={valves}
                maxLength={100}
                placeholder="e.g., 2 Solenoid Valves"
                onChange={(e) => setValves(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Bed Details <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <input
                className="input-field"
                value={bedDetails}
                maxLength={150}
                placeholder="e.g., 1.2m Raised Beds (40cm furrow)"
                onChange={(e) => setBedDetails(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Land Preparation Status <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
              </label>
              <select
                className="input-field"
                value={landPrepStatus}
                onChange={(e) => setLandPrepStatus(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                <option value="">-- Select Status --</option>
                <option value="Ready for Planting">Ready for Planting</option>
                <option value="Beds Formed & Ready">Beds Formed & Ready</option>
                <option value="Secondary Tillage">Secondary Tillage</option>
                <option value="Deep Ploughed">Deep Ploughed</option>
                <option value="Raw Land (Uncleared)">Raw Land (Uncleared)</option>
              </select>
            </div>
          </div>

          {/* Optional Boundary Fence Accordion */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
            {!showFence ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFence(true)}
                style={{ fontSize: 11.5, gap: 6 }}
              >
                <Icons.MapPin size={13} />
                <span>Draw Plot Boundary on Map (Optional)</span>
              </button>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Plot Boundary Demarcation</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setFence(null);
                      setShowFence(false);
                    }}
                    style={{ fontSize: 11 }}
                  >
                    Hide Map
                  </button>
                </div>
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--hairline)", height: 220 }}>
                  <GeoMap
                    center={farmCenter}
                    polygon={fence}
                    onChange={(r) => setFence(r)}
                    interactive
                    height={220}
                    pins={farmRing ? [{ key: "farm_center", lat: farmCenter[0], lng: farmCenter[1], color: "#15803d", label: "Farm Center" }] : null}
                  />
                </div>
                {fenceOutside && (
                  <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 4 }}>
                    Plot fence is outside farm boundary.
                  </div>
                )}
              </div>
            )}
          </div>

          {validationErr && (
            <div role="alert" style={{ fontSize: 12, color: "var(--semantic-error)", fontWeight: 600, marginTop: 12 }}>
              {validationErr}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            {plots.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                }}
                style={{ height: 34, padding: "0 16px" }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              style={{ height: 34, padding: "0 20px" }}
            >
              {editingPlotId ? "Update Plot" : "Save Plot"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
