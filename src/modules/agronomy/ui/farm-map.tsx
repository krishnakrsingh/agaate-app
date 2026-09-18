"use client";

import { useMemo } from "react";

export type MapPlot = {
  id: string;
  name: string;
  boundaryGeoJson: string | null;
  stressed: boolean;
};

type Props = {
  farmGeoJson: string | null;
  plots: MapPlot[];
  focusPlotId?: string | null;
  flashPlotId?: string | null;
  onPlotClick?: (plotId: string) => void;
  height?: number;
};

type Ring = [number, number][];

function ringsOf(geoJson: string | null): Ring[] {
  if (!geoJson) return [];
  try {
    const g = JSON.parse(geoJson);
    const polys: number[][][][] =
      g.type === "Polygon" ? [g.coordinates]
      : g.type === "MultiPolygon" ? g.coordinates
      : [];
    const out: Ring[] = [];
    for (const poly of polys) {
      const ring = poly[0] ?? [];
      const clean = ring.filter((pt): pt is [number, number] => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === "number" && typeof pt[1] === "number");
      if (clean.length >= 3) out.push(clean);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * FarmMap — static SVG demarcation sketch. Farm outline dashed, plot
 * polygons filled (rose when a stressed crop grows there), click jumps to
 * the plot card. Deliberately not Leaflet: zero CSS/SSR weight in a panel.
 */
export function FarmMap({ farmGeoJson, plots, focusPlotId, flashPlotId, onPlotClick, height = 190 }: Props) {
  const view = useMemo(() => {
    const all: Ring[] = [...ringsOf(farmGeoJson)];
    const plotRings = new Map<string, Ring[]>();
    for (const p of plots) {
      const rings = ringsOf(p.boundaryGeoJson);
      plotRings.set(p.id, rings);
      all.push(...rings);
    }
    if (!all.length) return null;
    const lats = all.flatMap((r) => r.map((pt) => pt[1]));
    const lngs = all.flatMap((r) => r.map((pt) => pt[0]));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const cosLat = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180) || 1;
    const W = 400;
    const H = 240;
    const pad = 14;
    const spanX = Math.max((maxLng - minLng) * cosLat, 1e-9);
    const spanY = Math.max(maxLat - minLat, 1e-9);
    const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const project = (lng: number, lat: number): [number, number] => [
      pad + (lng - minLng) * cosLat * scale,
      // Extra vertical breathing room for the caption row underneath.
      pad + (maxLat - lat) * scale * 0.86,
    ];
    const pts = (ring: Ring) => ring.map(([lng, lat]) => project(lng, lat).join(",")).join(" ");
    return { W, H, project, pts, farm: ringsOf(farmGeoJson), plotRings };
  }, [farmGeoJson, plots]);

  if (!view) {
    return (
      <div
        className="flex items-center justify-center text-center"
        style={{ height, borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px dashed var(--hairline)" }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Boundary not mapped yet — demarcate plots to draw this farm.</span>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${view.W} ${view.H}`}
      style={{ width: "100%", height, display: "block", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}
      role="img"
      aria-label="Farm demarcation map"
    >
      {view.farm.map((ring, i) => (
        <polygon
          key={`farm-${i}`}
          points={view.pts(ring)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.6}
          strokeDasharray="6 4"
          opacity={0.55}
        />
      ))}
      {plots.map((p) => {
        const rings = view.plotRings.get(p.id) ?? [];
        const isFocus = focusPlotId === p.id;
        const isFlash = flashPlotId === p.id;
        const fill = isFlash ? "var(--green-ink)" : p.stressed ? "var(--red)" : "var(--green-ink)";
        return (
          <g key={p.id} onClick={() => onPlotClick?.(p.id)} style={{ cursor: onPlotClick ? "pointer" : "default" }}>
            <title>{p.name}</title>
            {rings.map((ring, i) => (
              <polygon
                key={i}
                points={view.pts(ring)}
                fill={fill}
                opacity={isFlash ? 0.55 : isFocus ? 0.4 : p.stressed ? 0.35 : 0.22}
                stroke={isFocus || isFlash ? "var(--green-ink)" : p.stressed ? "var(--red)" : "var(--green-ink)"}
                strokeWidth={isFocus || isFlash ? 2.4 : 1.2}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
