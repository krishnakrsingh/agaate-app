"use client";
import { useEffect, useState } from "react";
import { BoundaryWalk, type WalkTargetInput } from "./boundary-walk";

type FarmOpt = { id: string; name: string; latitude: number | string; longitude: number | string; boundaryGeoJson: string | null };
type PlotOpt = { id: string; name: string };

/**
 * Target picker for perimeter walks: farm fence, new plot on a farm, or
 * re-walk of an existing plot. Officer farm lists are small (access-scoped),
 * so plain selects are correct here — this is NOT the 1L-farm finder
 * (that's ⌘K + Directory).
 */
export function BoundaryTargetPicker({
  presetFarmId,
  presetPlotId,
}: {
  presetFarmId?: string;
  presetPlotId?: string;
}) {
  const [farms, setFarms] = useState<FarmOpt[]>([]);
  const [plots, setPlots] = useState<PlotOpt[]>([]);
  const [farmId, setFarmId] = useState(presetFarmId ?? "");
  const [kind, setKind] = useState<"FARM" | "PLOT_NEW" | "PLOT_EXISTING">(presetPlotId ? "PLOT_EXISTING" : "FARM");
  const [plotId, setPlotId] = useState(presetPlotId ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/farms?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setFarms(Array.isArray(list) ? list : []))
      .catch(() => setFarms([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!farmId) {
      setPlots([]);
      return;
    }
    fetch(`/api/plots?farmId=${encodeURIComponent(farmId)}&limit=200`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setPlots(Array.isArray(list) ? list.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })) : []))
      .catch(() => setPlots([]));
  }, [farmId]);

  const farm = farms.find((f) => f.id === farmId) ?? null;
  const center: [number, number] | null =
    farm && Number.isFinite(Number(farm.latitude)) && Number.isFinite(Number(farm.longitude))
      ? [Number(farm.latitude), Number(farm.longitude)]
      : null;

  const target: WalkTargetInput | null = !farmId
    ? null
    : kind === "FARM"
      ? { kind: "FARM", farmId, farmName: farm?.name }
      : kind === "PLOT_NEW"
        ? { kind: "PLOT_NEW", farmId, farmName: farm?.name }
        : plotId
          ? { kind: "PLOT_EXISTING", farmId, farmName: farm?.name, plotId, plotName: plots.find((p) => p.id === plotId)?.name }
          : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
          Farm
          <select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(""); }} disabled={loading}>
            <option value="">{loading ? "Loading farms…" : "Select farm…"}</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label="Walk target">
          {(["FARM", "PLOT_NEW", "PLOT_EXISTING"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`btn btn-sm ${kind === k ? "btn-green" : ""}`}
              onClick={() => setKind(k)}
            >
              {k === "FARM" ? "Farm fence" : k === "PLOT_NEW" ? "New plot" : "Re-walk plot"}
            </button>
          ))}
        </div>
        {kind === "PLOT_EXISTING" && (
          <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
            Plot
            <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">Select plot…</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {target ? (
        <BoundaryWalk
          key={`${target.kind}-${target.farmId}-${("plotId" in target && target.plotId) || ""}`}
          target={target}
          center={center}
          farmBoundary={farm?.boundaryGeoJson ?? null}
        />
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>Select a farm above to start a boundary walk. GPS + queue work offline once this page is open.</p>
      )}
    </div>
  );
}
